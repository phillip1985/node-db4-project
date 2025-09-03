const { nanoid } = require('nanoid');
const db = require('../data/dbConfig');

// Generate a unique NanoID for recipes, using trx if provided
async function generateUniqueRecipeId(trx = db) {
    let recipe_id;
    let exists = true;
    while (exists) {
        recipe_id = nanoid();
        exists = await trx('recipes').where({ recipe_id }).first();
    }
    return recipe_id;
}

// Get a recipe by ID, including steps and ingredients
async function getById(id, trx = db) {
    const recipe = await trx('recipes').where({ recipe_id: id }).first();
    if (!recipe) return null;

    const steps = await trx('steps')
        .where({ recipe_id: id })
        .orderBy('step_number')
        .select('step_id', 'step_number', 'step_instructions');

    const stepIngredients = await trx('steps as s')
        .leftJoin('step_ingredients as si', 's.step_id', 'si.step_id')
        .leftJoin('ingredients as i', 'si.ing_id', 'i.ing_id')
        .where('s.recipe_id', id)
        .select(
            's.step_id',
            'i.ing_id as ingredient_id',
            'i.ingr_name as ingredient_name',
            'si.quantity',
            'i.unit',
        );

    return {
        ...recipe,
        steps: steps.map(step => {
            const ingredients = stepIngredients
                .filter(ing => ing.step_id === step.step_id && ing.ingredient_id)
                .map(({ step_id, ...rest }) => rest);
            return ingredients.length
                ? { ...step, ingredients }
                : { ...step };
        }),
    };
}

/**
 * Get all recipes with pagination.
 * @param {number} [page=1] - The page number (1-based).
 * @param {number} [pageSize=10] - The number of items per page.
 * @returns {Promise<{recipes: object[], total: number, page: number, pageSize: number}>}
 */
async function getAll(page = 1, pageSize = 10) {
    // Ensure positive integers
    page = Math.max(1, parseInt(page, 10) || 1);
    pageSize = Math.max(1, parseInt(pageSize, 10) || 10);

    const offset = (page - 1) * pageSize;

    // Get total count
    const [{ count }] = await db('recipes').count('recipe_id as count');
    const total = parseInt(count, 10);

    // Get paginated recipes
    const recipes = await db('recipes')
        .limit(pageSize)
        .offset(offset);

    return {
        recipes,
        total,
        page,
        pageSize,
    };
}

async function getIngredients() {
    return db('ingredients');
}

async function addRecipe(recipe) {
    // Validate recipe data
    if (!recipe || typeof recipe.recipe_name !== 'string' || !Array.isArray(recipe.steps)) {
        throw new Error('Invalid recipe data');
    }

    // Check for duplicate recipe name (case-insensitive)
    const existing = await db('recipes')
        .whereRaw('LOWER(recipe_name) = ?', recipe.recipe_name.toLowerCase())
        .first();

    if (existing) {
        const error = new Error('A recipe with this name already exists.');
        error.status = 400;
        error.code = 'RECIPE_NAME_EXISTS';
        throw error;
    }

    // Use a transaction for all inserts
    return db.transaction(async trx => {
        const recipe_id = await generateUniqueRecipeId(trx);

        await trx('recipes').insert({
            recipe_id,
            recipe_name: recipe.recipe_name,
        });

        for (const step of recipe.steps) {
            const [step_id] = await trx('steps').insert({
                recipe_id,
                step_number: step.step_number,
                step_instructions: step.step_instructions,
            });

            if (step.ingredients && step.ingredients.length) {
                const stepIngredients = step.ingredients.map(ing => ({
                    step_id,
                    ing_id: ing.ingredient_id,
                    quantity: ing.quantity,
                }));
                await trx('step_ingredients').insert(stepIngredients);
            }
        }

        return getById(recipe_id, trx);
    });
}

async function updateRecipe(id, recipe) {
    return db.transaction(async trx => {
        // Update recipe name
        await trx('recipes')
            .where({ recipe_id: id })
            .update({ recipe_name: recipe.recipe_name });

        // Get current steps for the recipe
        const currentSteps = await trx('steps')
            .where({ recipe_id: id })
            .select('step_id', 'step_number');

        // Map step_number to step_id for quick lookup
        const currentStepMap = {};
        for (const s of currentSteps) {
            currentStepMap[s.step_number] = s.step_id;
        }

        // Upsert steps and their ingredients
        for (const step of recipe.steps || []) {
            let step_id = step.step_id || currentStepMap[step.step_number];
            if (step_id) {
                await trx('steps')
                    .where({ step_id })
                    .update({
                        step_number: step.step_number,
                        step_instructions: step.step_instructions,
                    });
            } else {
                const [newStepId] = await trx('steps').insert({
                    recipe_id: id,
                    step_number: step.step_number,
                    step_instructions: step.step_instructions,
                });
                step_id = newStepId;
            }

            // Remove existing ingredients for this step
            await trx('step_ingredients').where({ step_id }).del();

            // Insert new ingredients if any
            if (step.ingredients && step.ingredients.length) {
                const stepIngredients = step.ingredients.map(ing => ({
                    step_id,
                    ing_id: ing.ingredient_id,
                    quantity: ing.quantity,
                }));
                await trx('step_ingredients').insert(stepIngredients);
            }
        }

        // Remove steps (and their ingredients) not in the new recipe
        const stepIdsToRemove = currentSteps
            .filter(s => !(recipe.steps || []).some(st => st.step_number === s.step_number))
            .map(s => s.step_id);

        if (stepIdsToRemove.length) {
            await trx('step_ingredients').whereIn('step_id', stepIdsToRemove).del();
            await trx('steps').whereIn('step_id', stepIdsToRemove).del();
        }

        return getById(id, trx);
    });
}

async function deleteRecipe(id) {
    return db.transaction(async trx => {
        const stepIds = await trx('steps').where({ recipe_id: id }).pluck('step_id');

        if (stepIds.length) {
            await trx('step_ingredients').whereIn('step_id', stepIds).del();
        }

        await trx('steps').where({ recipe_id: id }).del();
        const deletedCount = await trx('recipes').where({ recipe_id: id }).del();
        return deletedCount > 0;
    });
}

async function recipeNameExists(name) {
    return !!(await db('recipes')
        .whereRaw('LOWER(recipe_name) = ?', name.toLowerCase())
        .first());
}

module.exports = {
    getAll,
    getById,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    getIngredients,
    recipeNameExists,
};