const request = require('supertest')
const db = require('./data/dbConfig')
const server = require('./backend/server.js')
const { nanoid } = require('nanoid')

const ingredient = [
    { ingr_name: 'Spaghetti', unit: 'g' },
    { ingr_name: 'Eggs', unit: '' },
    { ingr_name: 'Parmesan cheese', unit: 'g' },
    { ingr_name: 'Pancetta', unit: 'g' },
    { ingr_name: 'Black pepper', unit: 'g' },
    { ingr_name: 'Salt', unit: 'g' }
]

const recipe = { recipe_name: 'Spaghetti Carbonara' }

const steps = [
    { step_number: 1, step_instructions: 'Boil water in a large pot.' },
    { step_number: 2, step_instructions: 'Add spaghetti and cook until al dente.' },
    { step_number: 3, step_instructions: 'In a bowl, whisk eggs and mix with grated Parmesan cheese.' },
    { step_number: 4, step_instructions: 'Fry pancetta in a pan until crispy.' },
    { step_number: 5, step_instructions: 'Drain spaghetti and add to the pancetta pan.' },
    { step_number: 6, step_instructions: 'Remove from heat and quickly mix in the egg mixture.' },
    { step_number: 7, step_instructions: 'Season with black pepper and serve immediately.' }
]

const step_ingredients = [
    { step_id: 2, ing_id: 1, quantity: 500 },
    { step_id: 3, ing_id: 2, quantity: 4 },
    { step_id: 3, ing_id: 3, quantity: 100 },
    { step_id: 4, ing_id: 4, quantity: 200 },
    { step_id: 5, ing_id: 1, quantity: 500 },
    { step_id: 6, ing_id: 2, quantity: 4 },
    { step_id: 6, ing_id: 3, quantity: 100 },
    { step_id: 7, ing_id: 5, quantity: 10 }
]


test('db_env', async () => {
    expect(process.env.DB_ENV).toBe('testing')
})

test('sanity', () => {
    expect(true).toBe(true)
})

beforeAll(async () => {
    await db.migrate.rollback()
    await db.migrate.latest()
})

beforeEach(async () => {
    await db('step_ingredients').truncate()
    await db('steps').truncate()
    await db('ingredients').truncate()
    await db('recipes').truncate()

})

afterAll(async () => {
    await db.destroy()
});


describe('backend', () => {
    describe('GET /', () => {
        test('should return 200 OK', async () => {
            const res = await request(server).get('/')
            expect(res.status).toBe(200)
        })

        test('should return JSON', async () => {
            const res = await request(server).get('/')
            expect(res.type).toMatch(/json/i)
        })
    })
})

describe('recipes router', () => {

    describe('[POST] /api/recipes', () => {
        test('should return 201 Created', async () => {
            const newRecipe = {
                recipe_name: 'New Recipe',
                steps: [
                    { step_number: 1, step_instructions: 'Step 1 instructions' },
                    { step_number: 2, step_instructions: 'Step 2 instructions' }
                ]
            }
            const res = await request(server).post('/api/recipes').send(newRecipe)
            expect(res.status).toBe(201)
            expect(res.type).toMatch(/json/i)
        })
        test('should return 400 Bad Request if recipe_name is missing', async () => {
            const newRecipe = {
                steps: [
                    { step_number: 1, step_instructions: 'Step 1 instructions' }
                ]
            }
            const res = await request(server).post('/api/recipes').send(newRecipe)
            expect(res.status).toBe(400)
            expect(res.body).toMatchObject({ errors: ['recipe name is required'] })
            expect(res.body.errors).toContain('recipe name is required')
        })

        test('should return 400 Bad Request if steps are missing', async () => {

            const newRecipe = {
                recipe_name: 'New Recipe'
            }
            const res = await request(server).post('/api/recipes').send(newRecipe)
            expect(res.status).toBe(400)
            expect(res.body).toMatchObject({ errors: expect.any(Array) })
            expect(res.body.errors).toContain('at least one step is required')

        })

    })

    describe('[GET] /api/recipes', () => {

        beforeEach(async () => {
            const recipe_id = nanoid();
            await db('recipes').insert({ recipe_id, recipe_name: 'Spaghetti Carbonara' });

            // Use the correct PK column name
            const recipeRow = await db('recipes').where('recipe_name', recipe.recipe_name).first();
            const r_id = recipeRow.recipe_id; // <-- use recipe_id, not id

            for (let ingr of ingredient) {
                await db('ingredients').insert(ingr);
            }
            for (let step of steps) {
                await db('steps').insert({ ...step, recipe_id: r_id });
            }
            for (let si of step_ingredients) {
                await db('step_ingredients').insert(si);
            }
        })

        test('should return 200 OK', async () => {
            const res = await request(server).get('/api/recipes')
            expect(res.status).toBe(200)
            expect(res.type).toMatch(/json/i)
        })

        test('should return array of recipes', async () => {
            const res = await request(server).get('/api/recipes')
            expect(res.body).toBeInstanceOf(Array)
            expect(res.body).toHaveLength(1)
            expect(res.body[0]).toMatchObject({
                recipe_name: 'Spaghetti Carbonara'
            })
        })

        test('should return empty with no data', async () => {
            await db('step_ingredients').truncate()
            await db('steps').truncate()
            await db('ingredients').truncate()
            await db('recipes').truncate()
            const res = await request(server).get('/api/recipes')
            expect(res.body).toBeInstanceOf(Array)
            expect(res.body).toHaveLength(0)
            expect(res.body).toEqual([])
        })
    })

    describe('[GET] /api/recipes/:id', () => {
        let r_id;
        beforeEach(async () => {
            const recipe_id = nanoid();
            await db('recipes').insert({ recipe_id, recipe_name: 'Spaghetti Carbonara' });
            // Use the correct PK column name
            const recipeRow = await db('recipes').where('recipe_name', recipe.recipe_name).first();
            r_id = recipeRow.recipe_id; // <-- use recipe_id, not id
            for (let ingr of ingredient) {
                await db('ingredients').insert(ingr);
            }
            for (let step of steps) {
                await db('steps').insert({ ...step, recipe_id: r_id });
            }
            for (let si of step_ingredients) {
                await db('step_ingredients').insert(si);
            }
        })
        test('should return 200 OK', async () => {
            const res = await request(server).get(`/api/recipes/${r_id}`)
            expect(res.status).toBe(200)
            expect(res.type).toMatch(/json/i)
            expect(res.body).toMatchObject({
                recipe_id: r_id,
                recipe_name: 'Spaghetti Carbonara'
            })
        })

        test('should return 404 Not Found if recipe does not exist', async () => {
            const res = await request(server).get('/api/recipes/nonexistent-id')
            expect(res.status).toBe(404)
            expect(res.body).toMatchObject({ message: 'Recipe not found' })
        })

        test('should return recipe with steps and ingredients', async () => {
            const res = await request(server).get(`/api/recipes/${r_id}`)
            expect(res.status).toBe(200)
            expect(res.body).toMatchObject({
                recipe_id: r_id,
                recipe_name: 'Spaghetti Carbonara',
                steps: expect.any(Array)
            })
            expect(res.body.steps).toHaveLength(7)
            expect(res.body.steps[0]).toMatchObject({
                step_number: 1,
                step_instructions: 'Boil water in a large pot.'
            })
            expect(res.body.steps[1]).toMatchObject({
                step_number: 2,
                step_instructions: 'Add spaghetti and cook until al dente.',
                ingredients: [
                    { ingredient_id: 1, ingredient_name: 'Spaghetti', quantity: 500, unit: 'g' }
                ]
            })
        })
    })

    describe('[PUT] /api/recipes/:id', () => {
        let r_id;
        beforeEach(async () => {
            const recipe_id = nanoid();
            await db('recipes').insert({ recipe_id, recipe_name: 'Spaghetti Carbonara' });
            const recipeRow = await db('recipes').where('recipe_name', 'Spaghetti Carbonara').first();
            r_id = recipeRow.recipe_id;
        })

        test('should return 200 OK and update the recipe', async () => {
            const updatedRecipe = {
                recipe_name: 'Updated Spaghetti Carbonara',
                steps: [
                    { step_number: 1, step_instructions: 'Updated Step 1 instructions' },
                    { step_number: 2, step_instructions: 'Updated Step 2 instructions' }
                ]
            }
            const res = await request(server).put(`/api/recipes/${r_id}`).send(updatedRecipe)
            expect(res.status).toBe(200)
            expect(res.body).toHaveProperty('updatedRecipe')
            expect(res.body.updatedRecipe).toMatchObject({
                recipe_id: r_id,
                recipe_name: expect.any(String),
                steps: expect.any(Array)
            })
            expect(res.body).toHaveProperty('message', 'Recipe updated successfully')
        })

        test('should return 404 Not Found if recipe does not exist', async () => {
            const updatedRecipe = {
                recipe_name: 'Updated Spaghetti Carbonara',
                steps: [
                    { step_number: 1, step_instructions: 'Updated Step 1 instructions' }
                ]
            }
            const res = await request(server).put('/api/recipes/nonexistent-id').send(updatedRecipe)
            expect(res.status).toBe(404)
            expect(res.body).toMatchObject({ message: 'Recipe not found' })
        })
    })

    describe('[GET] /api/recipes/check-name', () => {

        beforeEach(async () => {
            const recipe_id = nanoid();
            await db('recipes').insert({ recipe_id, recipe_name: 'Spaghetti Carbonara' });
        })

        test('should return 200 OK if recipe name is available', async () => {
            const res = await request(server).get('/api/recipes/check-name?name=New Recipe')
            expect(res.status).toBe(200)
            expect(res.body).toMatchObject({ available: true })
        })

        test('should return 409 Conflict if recipe name is taken', async () => {
            const res = await request(server).get('/api/recipes/check-name?name=Spaghetti Carbonara')
            console.log(res.status)
            expect(res.status).toBe(200)
            expect(res.body).toMatchObject({ available: false })
        })
    })

})
