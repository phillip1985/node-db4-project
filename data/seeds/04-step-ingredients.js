/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */

exports.seed = function (knex, Promise) {
    return knex('step_ingredients').insert([
        { step_id: 2, ing_id: 1, quantity: 500 },
        { step_id: 3, ing_id: 2, quantity: 4 },
        { step_id: 3, ing_id: 3, quantity: 100 },
        { step_id: 4, ing_id: 4, quantity: 200 },
        { step_id: 5, ing_id: 1, quantity: 500 },
        { step_id: 6, ing_id: 2, quantity: 4 },
        { step_id: 6, ing_id: 3, quantity: 100 },
        { step_id: 7, ing_id: 5, quantity: 10 }
    ]);
};