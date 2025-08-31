const { nanoid } = require('nanoid');
const db = require('../data/dbConfig');

// Helper to generate a unique NanoID for recipes
async function generateUniqueRecipeId() {
    let recipe_id;
    let exists = true;
    while (exists) {
        recipe_id = nanoid();
        exists = await db('recipes').where({ recipe_id }).first();
    }
    return recipe_id;
}

async function getAll() {

    return await db('recipes')
}

async function getIngredients() {
    return await db('ingredients');
}

async function getById(id) {
    const recipe = await db('recipes').where({ recipe_id: id }).first();

    const steps = await db('steps')
        .where({ recipe_id: id })
        .orderBy('step_number')
        .select('step_id', 'step_number', 'step_instructions');

    const stepIngredients = await db('steps as s')
        .leftJoin('step_ingredients as si', 's.step_id', 'si.step_id')
        .leftJoin('ingredients as i', 'si.ing_id', 'i.ing_id')
        .where('s.recipe_id', id)
        .select(
            's.step_id',
            'i.ing_id as ingredient_id',
            'i.ingr_name as ingredient_name',
            'si.quantity',
            'i.unit'
    );

    if (!recipe) return null;

    return {
        ...recipe,
        steps: steps.map(step => {
            const ingredients = stepIngredients
                .filter(ing => ing.step_id === step.step_id && ing.ingredient_id)
                .map(({ step_id, ...rest }) => rest);
            return ingredients.length ? { ...step, ingredients } : { ...step };
        })
    };
}

async function addRecipe(recipe) {
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

    // Generate a unique UUID for the new recipe
    const recipe_id = await generateUniqueRecipeId();

    // Insert the recipe with the generated UUID
    await db('recipes').insert({
        recipe_id,
        recipe_name: recipe.recipe_name
    });

    // Insert steps and collect their ids
    for (const step of recipe.steps) {
        const [step_id] = await db('steps').insert({
            recipe_id,
            step_number: step.step_number,
            step_instructions: step.step_instructions
        });

        // If the step has ingredients, insert them into step_ingredients
        if (step.ingredients && step.ingredients.length) {
            const stepIngredients = step.ingredients.map(ing => ({
                step_id,
                ing_id: ing.ingredient_id,
                quantity: ing.quantity
            }));
            await db('step_ingredients').insert(stepIngredients);
        }
    }

    // Optionally, return the new recipe with steps
    return getById(recipe_id);
}


async function updateRecipe(id, recipe) {
    // 1. Update the recipe name
    await db('recipes')
        .where({ recipe_id: id })
        .update({ recipe_name: recipe.recipe_name });

    // 2. Get current steps for the recipe
    const currentSteps = await db('steps')
        .where({ recipe_id: id })
        .select('step_id', 'step_number');

    // Map step_number to step_id for quick lookup
    const currentStepMap = {};
    currentSteps.forEach(s => {
        currentStepMap[s.step_number] = s.step_id;
    });

    // Track step_ids to keep
    const stepIdsToKeep = [];

    // 3. Upsert steps and their instructions
    for (const step of recipe.steps) {
        let step_id = step.step_id || currentStepMap[step.step_number];
        if (step_id) {
            // Update existing step
            await db('steps')
                .where({ step_id })
                .update({
                    step_number: step.step_number,
                    step_instructions: step.step_instructions
                });
        } else {
            // Insert new step
            const [newStepId] = await db('steps')
                .insert({
                    recipe_id: id,
                    step_number: step.step_number,
                    step_instructions: step.step_instructions
                });
            step_id = newStepId;
        }
        stepIdsToKeep.push(step_id);

        // Remove existing ingredients for this step
        await db('step_ingredients').where({ step_id }).del();

        // Insert new ingredients if any
        if (step.ingredients && step.ingredients.length) {
            const stepIngredients = step.ingredients.map(ing => ({
                step_id,
                ing_id: ing.ingredient_id,
                quantity: ing.quantity
            }));
            await db('step_ingredients').insert(stepIngredients);
        }
    }

    // 4. Remove steps (and their ingredients) not in the new recipe
    const stepIdsToRemove = currentSteps
        .filter(s => !recipe.steps.some(st => st.step_number === s.step_number))
        .map(s => s.step_id);

    if (stepIdsToRemove.length) {
        await db('step_ingredients').whereIn('step_id', stepIdsToRemove).del();
        await db('steps').whereIn('step_id', stepIdsToRemove).del();
    }

    // 5. Return the updated recipe
    return getById(id);
}

const deleteRecipe = async (id) => {
    // Get all step_ids for the recipe
    const stepIds = await db('steps').where({ recipe_id: id }).pluck('step_id');

    // Delete step_ingredients for those steps
    if (stepIds.length) {
        await db('step_ingredients').whereIn('step_id', stepIds).del();
    }

    // Delete steps for the recipe
    await db('steps').where({ recipe_id: id }).del();

    // Delete the recipe itself
    const deletedCount = await db('recipes').where({ recipe_id: id }).del();
    return deletedCount > 0; // Return true if a recipe was deleted
}

async function recipeNameExists(name) {
    return !!(await db('recipes').whereRaw('LOWER(recipe_name) = ?', name.toLowerCase()).first());
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