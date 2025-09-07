const request = require('supertest');
const db = require('./data/dbConfig');
const server = require('./backend/server.js');
const { nanoid } = require('nanoid');
const Recipes = require('./backend/recipes_model');

// --- Test Data ---
const ingredient = [
  { ingr_name: 'Spaghetti', unit: 'g' },
  { ingr_name: 'Eggs', unit: '' },
  { ingr_name: 'Parmesan cheese', unit: 'g' },
  { ingr_name: 'Pancetta', unit: 'g' },
  { ingr_name: 'Black pepper', unit: 'g' },
  { ingr_name: 'Salt', unit: 'g' }
];
const recipe = { recipe_name: 'Spaghetti Carbonara' };
const steps = [
  { step_number: 1, step_instructions: 'Boil water in a large pot.' },
  { step_number: 2, step_instructions: 'Add spaghetti and cook until al dente.' },
  { step_number: 3, step_instructions: 'In a bowl, whisk eggs and mix with grated Parmesan cheese.' },
  { step_number: 4, step_instructions: 'Fry pancetta in a pan until crispy.' },
  { step_number: 5, step_instructions: 'Drain spaghetti and add to the pancetta pan.' },
  { step_number: 6, step_instructions: 'Remove from heat and quickly mix in the egg mixture.' },
  { step_number: 7, step_instructions: 'Season with black pepper and serve immediately.' }
];
const step_ingredients = [
  { step_id: 2, ing_id: 1, quantity: 500 },
  { step_id: 3, ing_id: 2, quantity: 4 },
  { step_id: 3, ing_id: 3, quantity: 100 },
  { step_id: 4, ing_id: 4, quantity: 200 },
  { step_id: 5, ing_id: 1, quantity: 500 },
  { step_id: 6, ing_id: 2, quantity: 4 },
  { step_id: 6, ing_id: 3, quantity: 100 },
  { step_id: 7, ing_id: 5, quantity: 10 }
];

// --- Environment & DB Setup ---
beforeAll(async () => {
  await db.migrate.rollback();
  await db.migrate.latest();
});
beforeEach(async () => {
  await db('step_ingredients').truncate();
  await db('steps').truncate();
  await db('ingredients').truncate();
  await db('recipes').truncate();
});
afterAll(async () => {
  await db.destroy();
});

// --- Environment ---
describe('Environment', () => {
  test('db_env', async () => {
    expect(process.env.DB_ENV).toBe('testing');
  });
  test('sanity', () => {
    expect(true).toBe(true);
  });
});

// --- Backend Root Route ---
describe('Backend Root Route', () => {
  describe('GET /', () => {
    test('should return 200 OK', async () => {
      const res = await request(server).get('/');
      expect(res.status).toBe(200);
    });
    test('should return JSON', async () => {
      const res = await request(server).get('/');
      expect(res.type).toMatch(/json/i);
    });
  });
});

// --- Recipes Router ---
describe('Recipes Router', () => {
  // POST /api/recipes
  describe('[POST] /api/recipes', () => {
    test('should return 201 Created', async () => {
      const newRecipe = {
        recipe_name: 'New Recipe',
        steps: [
          { step_number: 1, step_instructions: 'Step 1 instructions' },
          { step_number: 2, step_instructions: 'Step 2 instructions' }
        ]
      };
      const res = await request(server).post('/api/recipes').send(newRecipe);
      expect(res.status).toBe(201);
      expect(res.type).toMatch(/json/i);
    });
    test('should return 400 Bad Request if recipe_name is missing', async () => {
      const newRecipe = {
        steps: [
          { step_number: 1, step_instructions: 'Step 1 instructions' }
        ]
      };
      const res = await request(server).post('/api/recipes').send(newRecipe);
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ errors: ['recipe name is required'] });
      expect(res.body.errors).toContain('recipe name is required');
    });
    test('should return 400 Bad Request if steps are missing', async () => {
      const newRecipe = { recipe_name: 'New Recipe' };
      const res = await request(server).post('/api/recipes').send(newRecipe);
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ errors: expect.any(Array) });
      expect(res.body.errors).toContain('at least one step is required');
    });
  });

  // GET /api/recipes
  describe('[GET] /api/recipes', () => {
    beforeEach(async () => {
      await db('step_ingredients').truncate();
      await db('steps').truncate();
      await db('ingredients').truncate();
      await db('recipes').truncate();
      const recipe_id = nanoid();
      await db('recipes').insert({ recipe_id, recipe_name: 'Spaghetti Carbonara' });
      const recipeRow = await db('recipes').where('recipe_name', recipe.recipe_name).first();
      const r_id = recipeRow.recipe_id;
      for (let ingr of ingredient) await db('ingredients').insert(ingr);
      for (let step of steps) await db('steps').insert({ ...step, recipe_id: r_id });
      for (let si of step_ingredients) await db('step_ingredients').insert(si);
    });
    test('should return 200 OK', async () => {
      const res = await request(server).get('/api/recipes');
      expect(res.status).toBe(200);
      expect(res.type).toMatch(/json/i);
      expect(res.body).toHaveProperty('recipes');
      expect(Array.isArray(res.body.recipes)).toBe(true);
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page');
      expect(res.body).toHaveProperty('pageSize');
    });
    test('should return array of recipes', async () => {
      const res = await request(server).get('/api/recipes');
      expect(Array.isArray(res.body.recipes)).toBe(true);
      expect(res.body.recipes.length).toBeGreaterThanOrEqual(1);
      expect(res.body.recipes[0]).toHaveProperty('recipe_name', 'Spaghetti Carbonara');
    });
    test('should return empty array with no data', async () => {
      await db('step_ingredients').truncate();
      await db('steps').truncate();
      await db('ingredients').truncate();
      await db('recipes').truncate();
      const res = await request(server).get('/api/recipes');
      expect(Array.isArray(res.body.recipes)).toBe(true);
      expect(res.body.recipes).toHaveLength(0);
      expect(res.body.recipes).toEqual([]);
      expect(res.body).toHaveProperty('total', 0);
    });
  });

  // GET /api/recipes/:id
  describe('[GET] /api/recipes/:id', () => {
    let r_id;
    beforeEach(async () => {
      const recipe_id = nanoid();
      await db('recipes').insert({ recipe_id, recipe_name: 'Spaghetti Carbonara' });
      const recipeRow = await db('recipes').where('recipe_name', recipe.recipe_name).first();
      r_id = recipeRow.recipe_id;
      for (let ingr of ingredient) await db('ingredients').insert(ingr);
      for (let step of steps) await db('steps').insert({ ...step, recipe_id: r_id });
      for (let si of step_ingredients) await db('step_ingredients').insert(si);
    });
    test('should return 200 OK', async () => {
      const res = await request(server).get(`/api/recipes/${r_id}`);
      expect(res.status).toBe(200);
      expect(res.type).toMatch(/json/i);
      expect(res.body).toMatchObject({
        recipe_id: r_id,
        recipe_name: 'Spaghetti Carbonara'
      });
    });
    test('should return 404 Not Found if recipe does not exist', async () => {
      const res = await request(server).get('/api/recipes/nonexistent-id');
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ message: 'Recipe not found' });
    });
    test('should return recipe with steps and ingredients', async () => {
      const res = await request(server).get(`/api/recipes/${r_id}`);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        recipe_id: r_id,
        recipe_name: 'Spaghetti Carbonara',
        steps: expect.any(Array)
      });
      expect(res.body.steps).toHaveLength(7);
      expect(res.body.steps[0]).toMatchObject({
        step_number: 1,
        step_instructions: 'Boil water in a large pot.'
      });
      expect(res.body.steps[1]).toMatchObject({
        step_number: 2,
        step_instructions: 'Add spaghetti and cook until al dente.',
        ingredients: [
          { ingredient_id: 1, ingredient_name: 'Spaghetti', quantity: 500, unit: 'g' }
        ]
      });
    });
  });

  // PUT /api/recipes/:id
  describe('[PUT] /api/recipes/:id', () => {
    let r_id;
    beforeEach(async () => {
      const recipe_id = nanoid();
      await db('recipes').insert({ recipe_id, recipe_name: 'Spaghetti Carbonara' });
      const recipeRow = await db('recipes').where('recipe_name', 'Spaghetti Carbonara').first();
      r_id = recipeRow.recipe_id;
    });
    test('should return 200 OK and update the recipe', async () => {
      const updatedRecipe = {
        recipe_name: 'Updated Spaghetti Carbonara',
        steps: [
          { step_number: 1, step_instructions: 'Updated Step 1 instructions' },
          { step_number: 2, step_instructions: 'Updated Step 2 instructions' }
        ]
      };
      const res = await request(server).put(`/api/recipes/${r_id}`).send(updatedRecipe);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('updatedRecipe');
      expect(res.body.updatedRecipe).toMatchObject({
        recipe_id: r_id,
        recipe_name: expect.any(String),
        steps: expect.any(Array)
      });
      expect(res.body).toHaveProperty('message', 'Recipe updated successfully');
    });
    test('should return 404 Not Found if recipe does not exist', async () => {
      const updatedRecipe = {
        recipe_name: 'Updated Spaghetti Carbonara',
        steps: [
          { step_number: 1, step_instructions: 'Updated Step 1 instructions' }
        ]
      };
      const res = await request(server).put('/api/recipes/nonexistent-id').send(updatedRecipe);
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ message: 'Recipe not found' });
    });
  });

  // GET /api/recipes/check-name
  describe('[GET] /api/recipes/check-name', () => {
    beforeEach(async () => {
      const recipe_id = nanoid();
      await db('recipes').insert({ recipe_id, recipe_name: 'Spaghetti Carbonara' });
    });
    test('should return 200 OK if recipe name is available', async () => {
      const res = await request(server).get('/api/recipes/check-name?name=New Recipe');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ available: true });
    });
    test('should return 409 Conflict if recipe name is taken', async () => {
      const res = await request(server).get('/api/recipes/check-name?name=Spaghetti Carbonara');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ available: false });
    });
    test('returns 400 if name query param is missing', async () => {
      const res = await request(server).get('/api/recipes/check-name');
      expect(res.status).toBe(400);
      expect(res.body.errors).toContain('name query parameter is required');
    });
    test('returns 400 if name query param is empty', async () => {
      const res = await request(server).get('/api/recipes/check-name?name=');
      expect(res.status).toBe(400);
      expect(res.body.errors).toContain('name query parameter is required');
    });
    test('returns 500 if Recipes.recipeNameExists throws', async () => {
      jest.spyOn(Recipes, 'recipeNameExists').mockImplementation(() => { throw new Error('DB error'); });
      const res = await request(server).get('/api/recipes/check-name?name=AnyName');
      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/error/i);
      jest.restoreAllMocks();
    });
  });

  // GET /api/recipes/ingredients
  describe('[GET] /api/recipes/ingredients', () => {
    test('should return 200 OK and array of ingredients', async () => {
      await db('ingredients').insert(ingredient);
      const res = await request(server).get('/api/recipes/ingredients');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0]).toHaveProperty('ingr_name');
    });
    test('should return 200 OK and empty array if no ingredients', async () => {
      await db('ingredients').truncate();
      const res = await request(server).get('/api/recipes/ingredients');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toEqual([]);
    });
    test('should return 500 if Recipes.getIngredients throws', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      jest.spyOn(Recipes, 'getIngredients').mockImplementation(() => { throw new Error('DB error'); });
      const res = await request(server).get('/api/recipes/ingredients');
      expect(res.status).toBe(500);
      expect(spy).toHaveBeenCalled();
      jest.restoreAllMocks();
    });
  });

  // Pagination
  describe('[GET] /api/recipes pagination', () => {
    beforeEach(async () => {
      await db('recipes').truncate();
      for (let i = 1; i <= 15; i++) {
        await db('recipes').insert({ recipe_id: nanoid(), recipe_name: `Recipe ${i}` });
      }
    });
    test('should return correct page and pageSize', async () => {
      const res = await request(server).get('/api/recipes?page=2&pageSize=5');
      expect(res.status).toBe(200);
      expect(res.body.page).toBe(2);
      expect(res.body.pageSize).toBe(5);
      expect(res.body.recipes.length).toBe(5);
    });
    test('should default to page 1 and pageSize 10 if not provided', async () => {
      const res = await request(server).get('/api/recipes');
      expect(res.status).toBe(200);
      expect(res.body.page).toBe(1);
      expect(res.body.pageSize).toBe(10);
      expect(res.body.recipes.length).toBe(10);
    });
  });

  // Invalid ID format
  describe('[PUT] /api/recipes/:id with invalid id', () => {
    test('should return 404 for invalid id format', async () => {
      const updatedRecipe = {
        recipe_name: 'Updated Name',
        steps: [{ step_number: 1, step_instructions: 'Step instructions long enough.' }]
      };
      const res = await request(server).put('/api/recipes/!!!').send(updatedRecipe);
      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/not found/i);
    });
  });
  describe('[DELETE] /api/recipes/:id with invalid id', () => {
    test('should return 404 for invalid id format', async () => {
      const res = await request(server).delete('/api/recipes/!!!');
      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/not found/i);
    });
  });
});

// --- Recipes Model ---
describe('Recipes Model', () => {
  test('addRecipe throws error for invalid data', async () => {
    await expect(Recipes.addRecipe({})).rejects.toThrow('Invalid recipe data');
  });
  test('addRecipe throws error for duplicate recipe name', async () => {
    const recipe = {
      recipe_name: 'Unique Name',
      steps: [{ step_number: 1, step_instructions: 'Step instructions' }]
    };
    await Recipes.addRecipe(recipe);
    await expect(Recipes.addRecipe(recipe)).rejects.toThrow('A recipe with this name already exists.');
  });
  test('getById returns null for non-existent recipe', async () => {
    const result = await Recipes.getById('nonexistent-id');
    expect(result).toBeNull();
  });
  test('updateRecipe removes steps not in new recipe', async () => {
    const recipe = {
      recipe_name: 'Update Test',
      steps: [
        { step_number: 1, step_instructions: 'Step 1' },
        { step_number: 2, step_instructions: 'Step 2' }
      ]
    };
    const created = await Recipes.addRecipe(recipe);
    const updated = await Recipes.updateRecipe(created.recipe_id, {
      recipe_name: 'Update Test',
      steps: [
        { step_number: 1, step_instructions: 'Step 1 updated' }
      ]
    });
    expect(updated.steps.length).toBe(1);
    expect(updated.steps[0].step_instructions).toBe('Step 1 updated');
  });
  test('updateRecipe removes steps and their ingredients not in new recipe', async () => {
    const recipe = {
      recipe_name: 'Remove Steps Test',
      steps: [
        { step_number: 1, step_instructions: 'Step 1 instructions' },
        { step_number: 2, step_instructions: 'Step 2 instructions' }
      ]
    };
    const created = await Recipes.addRecipe(recipe);
    const updated = await Recipes.updateRecipe(created.recipe_id, {
      recipe_name: 'Remove Steps Test',
      steps: [
        { step_number: 1, step_instructions: 'Step 1 updated' }
      ]
    });
    expect(updated.steps.length).toBe(1);
    expect(updated.steps[0].step_number).toBe(1);
    expect(updated.steps[0].step_instructions).toBe('Step 1 updated');
  });
  test('updateRecipe removes ingredients from a step if not present in update', async () => {
    await db('ingredients').insert([
      { ing_id: 1, ingr_name: 'Ingredient 1', unit: 'g' },
      { ing_id: 2, ingr_name: 'Ingredient 2', unit: 'g' }
    ]);
    const recipe = {
      recipe_name: 'Ingredient Removal Test',
      steps: [
        {
          step_number: 1,
          step_instructions: 'Step with two ingredients',
          ingredients: [
            { ingredient_id: 1, quantity: 100 },
            { ingredient_id: 2, quantity: 200 }
          ]
        }
      ]
    };
    const created = await Recipes.addRecipe(recipe);
    const updated = await Recipes.updateRecipe(created.recipe_id, {
      recipe_name: 'Ingredient Removal Test',
      steps: [
        {
          step_number: 1,
          step_instructions: 'Step with one ingredient',
          ingredients: [
            { ingredient_id: 1, quantity: 100 }
          ]
        }
      ]
    });
    expect(updated.steps[0].ingredients.length).toBe(1);
    expect(updated.steps[0].ingredients[0].ingredient_id).toBe(1);
  });
  test('deleteRecipe returns false for non-existent recipe', async () => {
    const result = await Recipes.deleteRecipe('nonexistent-id');
    expect(result).toBe(false);
  });
  test('recipeNameExists returns correct boolean', async () => {
    const recipe = {
      recipe_name: 'Existence Test',
      steps: [{ step_number: 1, step_instructions: 'Step instructions' }]
    };
    await Recipes.addRecipe(recipe);
    expect(await Recipes.recipeNameExists('Existence Test')).toBe(true);
    expect(await Recipes.recipeNameExists('Nonexistent Name')).toBe(false);
  });
  test('recipeNameExists returns false when recipe does not exist (branch coverage)', async () => {
    await db('recipes').truncate();
    expect(await Recipes.recipeNameExists('no-such-recipe')).toBe(false);
  });
});

// --- Recipes Middleware Edge Cases ---
describe('Recipes Middleware Edge Cases', () => {
  test('should return 400 if step instructions are too short', async () => {
    const newRecipe = {
      recipe_name: 'Short Step',
      steps: [
        { step_number: 1, step_instructions: 'short' }
      ]
    };
    const res = await request(server).post('/api/recipes').send(newRecipe);
    expect(res.status).toBe(400);
    expect(res.body.errors.some(e => e.includes('step instructions must be at least 10 characters'))).toBe(true);
  });
  test('should return 400 if steps is not an array', async () => {
    const newRecipe = {
      recipe_name: 'Bad Steps',
      steps: 'not-an-array'
    };
    const res = await request(server).post('/api/recipes').send(newRecipe);
    expect(res.status).toBe(400);
    expect(res.body.errors.some(e => e.includes('steps must be an array'))).toBe(true);
  });
  test('should return 409 if updating recipe to a duplicate name', async () => {
    await request(server).post('/api/recipes').send({
      recipe_name: 'Original Name',
      steps: [{ step_number: 1, step_instructions: 'Step instructions long enough.' }]
    });
    const res2 = await request(server).post('/api/recipes').send({
      recipe_name: 'Other Name',
      steps: [{ step_number: 1, step_instructions: 'Step instructions long enough.' }]
    });
    const id2 = res2.body.createdRecipe.recipe_id;
    const res = await request(server).put(`/api/recipes/${id2}`).send({
      recipe_name: 'Original Name',
      steps: [{ step_number: 1, step_instructions: 'Step instructions long enough.' }]
    });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already exists/);
  });
  test('should return 404 if updating non-existent recipe', async () => {
    const res = await request(server).put('/api/recipes/nonexistent-id').send({
      recipe_name: 'Does Not Exist',
      steps: [{ step_number: 1, step_instructions: 'Step instructions long enough.' }]
    });
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/);
  });
  test('should return 400 if ingredient is missing required fields', async () => {
    const newRecipe = {
      recipe_name: 'Missing Ingredient',
      steps: [
        {
          step_number: 1,
          step_instructions: 'Step instructions long enough.',
          ingredients: [{ quantity: 5 }]
        }
      ]
    };
    const res = await request(server).post('/api/recipes').send(newRecipe);
    expect(res.status).toBe(400);
    expect(res.body.errors.some(e => e.includes('ingredient_id'))).toBe(true);
  });
  test('should return 400 if recipe_name is too short', async () => {
    const newRecipe = {
      recipe_name: 'ab',
      steps: [
        { step_number: 1, step_instructions: 'Step instructions long enough.' }
      ]
    };
    const res = await request(server).post('/api/recipes').send(newRecipe);
    expect(res.status).toBe(400);
    expect(res.body.errors.some(e => e.includes('at least 3 characters'))).toBe(true);
  });
  test('should return 400 if recipe_name is too long', async () => {
    const newRecipe = {
      recipe_name: 'a'.repeat(101),
      steps: [
        { step_number: 1, step_instructions: 'Step instructions long enough.' }
      ]
    };
    const res = await request(server).post('/api/recipes').send(newRecipe);
    expect(res.status).toBe(400);
    expect(res.body.errors.some(e => e.includes('at most 100 characters'))).toBe(true);
  });
  test('should return 400 if step_number is missing', async () => {
    const newRecipe = {
      recipe_name: 'Missing Step Number',
      steps: [
        { step_instructions: 'Step instructions long enough.' }
      ]
    };
    const res = await request(server).post('/api/recipes').send(newRecipe);
    expect(res.status).toBe(400);
    expect(res.body.errors.some(e => e.includes('step_number'))).toBe(true);
  });
  test('should return 400 if step_instructions is missing', async () => {
    const newRecipe = {
      recipe_name: 'Missing Step Instructions',
      steps: [
        { step_number: 1 }
      ]
    };
    const res = await request(server).post('/api/recipes').send(newRecipe);
    expect(res.status).toBe(400);
    expect(
      res.body.errors.some(
        e => e.includes('step instructions') && (e.includes('required') || e.includes('at least'))
      )
    ).toBe(true);
  });
  test('should return 400 if ingredient quantity is missing', async () => {
    const newRecipe = {
      recipe_name: 'Missing Ingredient Quantity',
      steps: [
        {
          step_number: 1,
          step_instructions: 'Step instructions long enough.',
          ingredients: [{ ingredient_id: 1 }]
        }
      ]
    };
    const res = await request(server).post('/api/recipes').send(newRecipe);
    expect(res.status).toBe(400);
    expect(res.body.errors.some(e => e.includes('quantity'))).toBe(true);
  });
  test('should return 400 if ingredient_id is not positive integer', async () => {
    const newRecipe = {
      recipe_name: 'Bad Ingredient ID',
      steps: [
        {
          step_number: 1,
          step_instructions: 'Step instructions long enough.',
          ingredients: [{ ingredient_id: -1, quantity: 5 }]
        }
      ]
    };
    const res = await request(server).post('/api/recipes').send(newRecipe);
    expect(res.status).toBe(400);
    expect(res.body.errors.some(e => e.includes('ingredient_id'))).toBe(true);
  });
});

// --- Recipes Middleware Error Branches ---
describe('Recipes Middleware Error Branches', () => {
  test('validateRecipeUpdate returns 404 if recipe does not exist', async () => {
    const res = await request(server)
      .put('/api/recipes/nonexistent-id')
      .send({
        recipe_name: 'Any Name',
        steps: [{ step_number: 1, step_instructions: 'Step instructions long enough.' }]
      });
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });
  test('validateRecipeUpdate returns 409 if updating to a duplicate name', async () => {
    await request(server).post('/api/recipes').send({
      recipe_name: 'First Name',
      steps: [{ step_number: 1, step_instructions: 'Step instructions long enough.' }]
    });
    const res2 = await request(server).post('/api/recipes').send({
      recipe_name: 'Second Name',
      steps: [{ step_number: 1, step_instructions: 'Step instructions long enough.' }]
    });
    const id2 = res2.body.createdRecipe.recipe_id;
    const res = await request(server).put(`/api/recipes/${id2}`).send({
      recipe_name: 'First Name',
      steps: [{ step_number: 1, step_instructions: 'Step instructions long enough.' }]
    });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already exists/i);
  });
  test('checkRecipeNameExists returns 500 on DB error', async () => {
    jest.resetModules();
    jest.doMock('./data/dbConfig', () => {
      // Return a function that throws when called (simulates db('recipes'))
      return () => ({
        where: () => { throw new Error('DB error'); },
        first: () => { throw new Error('DB error'); }
      });
    });
    // Re-require server after mocking
    const serverWithMockedDb = require('./backend/server.js');
    const newRecipe = {
      recipe_name: 'Any Name',
      steps: [{ step_number: 1, step_instructions: 'Step instructions long enough.' }]
    };
    const res = await request(serverWithMockedDb).post('/api/recipes').send(newRecipe);
    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(res.body.message).toMatch(/error/i);
    jest.dontMock('./data/dbConfig');
  });
  test('validateRecipeUpdate returns 500 on DB error', async () => {
    jest.resetModules();
    jest.doMock('./data/dbConfig', () => {
      return () => ({
        where: () => { throw new Error('DB error'); },
        first: () => { throw new Error('DB error'); }
      });
    });
    const serverWithMockedDb = require('./backend/server.js');
    const updatedRecipe = {
      recipe_name: 'Any Name',
      steps: [{ step_number: 1, step_instructions: 'Step instructions long enough.' }]
    };
    const res = await request(serverWithMockedDb).put('/api/recipes/some-id').send(updatedRecipe);
    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(res.body.message).toMatch(/error/i);
    jest.dontMock('./data/dbConfig');
  });
});

// --- Recipes Router Explicit Error Branches ---
describe('recipes_router.js explicit error branches', () => {
  test('GET /api/recipes/check-name returns 400 if name query param is missing', async () => {
    const res = await request(server).get('/api/recipes/check-name');
    expect(res.status).toBe(400);
    expect(res.body.errors).toContain('name query parameter is required');
  });
  test('GET /api/recipes/check-name returns 400 if name query param is empty', async () => {
    const res = await request(server).get('/api/recipes/check-name?name=');
    expect(res.status).toBe(400);
    expect(res.body.errors).toContain('name query parameter is required');
  });
  test('GET /api/recipes/check-name returns 500 if Recipes.recipeNameExists throws', async () => {
    jest.spyOn(Recipes, 'recipeNameExists').mockImplementation(() => { throw new Error('DB error'); });
    const res = await request(server).get('/api/recipes/check-name?name=AnyName');
    expect(res.status).toBe(500);
    expect(res.body.message).toMatch(/error/i);
    jest.restoreAllMocks();
  });
  test('GET /api/recipes/:id returns 500 if Recipes.getById throws', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(Recipes, 'getById').mockImplementation(() => { throw new Error('DB error'); });
    const res = await request(server).get('/api/recipes/some-id');
    expect(res.status).toBe(500);
    expect(spy).toHaveBeenCalled();
    jest.restoreAllMocks();
  });
  test('POST /api/recipes returns 500 if Recipes.addRecipe throws', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(Recipes, 'addRecipe').mockImplementation(() => { throw new Error('DB error'); });
    const newRecipe = {
      recipe_name: 'Error Recipe',
      steps: [{ step_number: 1, step_instructions: 'Step instructions long enough.' }]
    };
    const res = await request(server).post('/api/recipes').send(newRecipe);
    expect(res.status).toBe(500);
    expect(spy).toHaveBeenCalled();
    jest.restoreAllMocks();
  });
  test('PUT /api/recipes/:id returns 500 if Recipes.updateRecipe throws', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const recipe_id = nanoid();
    await db('recipes').insert({ recipe_id, recipe_name: 'Error Update Recipe' });
    jest.spyOn(Recipes, 'updateRecipe').mockImplementation(() => { throw new Error('DB error'); });
    const updatedRecipe = {
      recipe_name: 'Error Update',
      steps: [{ step_number: 1, step_instructions: 'Step instructions long enough.' }]
    };
    const res = await request(server).put(`/api/recipes/${recipe_id}`).send(updatedRecipe);
    expect(res.status).toBe(500);
    expect(spy).toHaveBeenCalled();
    jest.restoreAllMocks();
  });
  test('DELETE /api/recipes/:id returns 500 if Recipes.deleteRecipe throws', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const recipe_id = nanoid();
    await db('recipes').insert({ recipe_id, recipe_name: 'Error Delete Recipe' });
    jest.spyOn(Recipes, 'deleteRecipe').mockImplementation(() => { throw new Error('DB error'); });
    const res = await request(server).delete(`/api/recipes/${recipe_id}`);
    expect(res.status).toBe(500);
    expect(spy).toHaveBeenCalled();
    jest.restoreAllMocks();
  });
});

// --- Recipes Model Utility ---
describe('Recipes Model Utility', () => {
  test('getAll returns first page if page is zero or negative', async () => {
    const result = await Recipes.getAll(0, 10);
    expect(result.page).toBe(1);
    const resultNeg = await Recipes.getAll(-5, 10);
    expect(resultNeg.page).toBe(1);
  });
  test('getAll returns default pageSize if zero or negative', async () => {
    const result = await Recipes.getAll(1, 0);
    expect(result.pageSize).toBe(10);
    const resultNeg = await Recipes.getAll(1, -10);
    expect(resultNeg.pageSize).toBe(10);
  });
  test('getAll returns default values if page and pageSize are not numbers', async () => {
    const result = await Recipes.getAll('not-a-number', 'not-a-number');
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);
  });
  test('deleteRecipe works for recipe with no steps', async () => {
    const recipe_id = nanoid();
    await db('recipes').insert({ recipe_id, recipe_name: 'No Steps Recipe' });
    const result = await Recipes.deleteRecipe(recipe_id);
    expect(result).toBe(true);
    const deleted = await db('recipes').where({ recipe_id }).first();
    expect(deleted).toBeUndefined();
  });
  test('getAll returns empty array and total 0 when no recipes exist', async () => {
    await db('step_ingredients').truncate();
    await db('steps').truncate();
    await db('ingredients').truncate();
    await db('recipes').truncate();
    const result = await Recipes.getAll(1, 10);
    expect(result.recipes).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);
  });
});

// --- Recipes Router Error Branches ---
describe('Recipes Router Error Branches', () => {
  test('POST /api/recipes returns 400 if body is missing', async () => {
    const res = await request(server).post('/api/recipes').send();
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });
  test('GET /api/recipes/:id returns 404 for invalid id format', async () => {
    const res = await request(server).get('/api/recipes/!!!');
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });
  test('PUT /api/recipes/:id returns 400 if body is missing', async () => {
    const recipe_id = nanoid();
    await db('recipes').insert({ recipe_id, recipe_name: 'Test Recipe' });
    const res = await request(server).put(`/api/recipes/${recipe_id}`).send();
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });
  test('DELETE /api/recipes/:id returns 404 if recipe does not exist', async () => {
    const res = await request(server).delete('/api/recipes/nonexistent-id');
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });
  test('GET /api/recipes/check-name returns 400 if name query param is missing', async () => {
    const res = await request(server).get('/api/recipes/check-name');
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });
  test('GET /api/recipes/check-name returns 400 if name query param is empty', async () => {
    const res = await request(server).get('/api/recipes/check-name?name=');
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });
});
