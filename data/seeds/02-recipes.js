const { nanoid } = require('nanoid');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */

async function generateUniqueRecipeId(knex) {
    let recipe_id;
    let exists = true;
    while (exists) {
        recipe_id = nanoid();
        exists = await knex('recipes').where({ recipe_id }).first();
    }
    return recipe_id;
}

exports.seed = async function (knex) {
    const recipe_id = await generateUniqueRecipeId(knex);
    await knex('recipes').insert([
        { recipe_id, recipe_name: 'Spaghetti Carbonara' },
    ]);
};
