/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */

exports.seed = async function (knex) {
    // Get the recipe_id for the recipe you want to add steps to
    const recipe = await knex('recipes').where('recipe_name', 'Spaghetti Carbonara').first();

    if (!recipe) throw new Error('Recipe not found');

    return knex('steps').insert([
        { step_number: 1, step_instructions: 'Boil water in a large pot.', recipe_id: recipe.recipe_id },
        { step_number: 2, step_instructions: 'Add spaghetti and cook until al dente.', recipe_id: recipe.recipe_id },
        { step_number: 3, step_instructions: 'In a bowl, whisk eggs and mix with grated Parmesan cheese.', recipe_id: recipe.recipe_id },
        { step_number: 4, step_instructions: 'Fry pancetta in a pan until crispy.', recipe_id: recipe.recipe_id },
        { step_number: 5, step_instructions: 'Drain spaghetti and add to the pancetta pan.', recipe_id: recipe.recipe_id },
        { step_number: 6, step_instructions: 'Remove from heat and quickly mix in the egg mixture.', recipe_id: recipe.recipe_id },
        { step_number: 7, step_instructions: 'Season with black pepper and serve immediately.', recipe_id: recipe.recipe_id }
    ]);
};