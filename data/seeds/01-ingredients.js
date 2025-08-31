/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
    exports.seed = function (knex, Promise) {
        return knex('ingredients').insert([
            { ingr_name: 'Spaghetti', unit: 'g' },
            { ingr_name: 'Eggs', unit: '' },
            { ingr_name: 'Parmesan cheese', unit: 'g' },
            { ingr_name: 'Pancetta', unit: 'g' },
            { ingr_name: 'Black pepper', unit: 'g' },
            { ingr_name: 'Salt', unit: 'g' }
        ]);
    };
