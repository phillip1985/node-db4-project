/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema
        .createTable('ingredients', (tbl) => {
            tbl.increments('ing_id').primary();
            tbl.string('ingr_name').notNullable();
            tbl.string('unit').notNullable();
        })
        .createTable('recipes', (tbl) => {
            tbl.string('recipe_id', 21).primary(); // Changed from 36 to 21 for NanoID
            tbl.string('recipe_name', 128).notNullable();
            tbl.timestamp('created_at').defaultTo(knex.fn.now());
        })
        .createTable('steps', (tbl) => {
            tbl.increments('step_id').primary();
            tbl.integer('step_number').notNullable();
            tbl.string('step_instructions').notNullable();
            tbl.string('recipe_id', 21) // Changed from 36 to 21 for NanoID
                .notNullable()
                .references('recipe_id')
                .inTable('recipes')
                .onDelete('CASCADE');
        })
        .createTable('step_ingredients', (tbl) => {
            tbl.integer('step_id')
                .unsigned()
                .notNullable()
                .references('step_id')
                .inTable('steps')
                .onDelete('CASCADE');
            tbl.integer('ing_id')
                .unsigned()
                .notNullable()
                .references('ing_id')
                .inTable('ingredients')
                .onDelete('CASCADE');            
            tbl.integer('quantity').notNullable();
            tbl.primary(['step_id', 'ing_id']);
        });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema
        .dropTableIfExists('step_ingredients')
        .dropTableIfExists('steps')
        .dropTableIfExists('recipes')
        .dropTableIfExists('ingredients');
};
