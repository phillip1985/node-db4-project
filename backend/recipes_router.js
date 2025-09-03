const Router = require('express').Router();

const Recipes = require('./recipes_model.js');
const { validateRecipe, validateRecipeUpdate, checkRecipeNameExists } = require('./recipes_middleware.js');

// GET all recipes
Router.get('/', async (req, res, next) => {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 10;
    try {
        const result = await Recipes.getAll(page, pageSize);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

Router.get('/ingredients', (req, res, next) => {
    Recipes.getIngredients()
        .then(ingredients => {
            res.status(200).json(ingredients);
        })
        .catch(err => {
            next(err);
        });
});

// Place this route BEFORE any routes with /:id
Router.get('/check-name', async (req, res) => {
    const { name } = req.query;
    if (!name) return res.status(400).json({ available: false, message: 'No name provided' });
    try {
        const exists = await Recipes.recipeNameExists(name);
        if (exists) {
            // Name is taken
            return res.status(200).json({ available: false, message: 'Recipe name is already taken' });
        } else {
            // Name is available
            return res.status(200).json({ available: true });
        }
    } catch (err) {
        res.status(500).json({ available: false, message: 'Error checking recipe name' });
    }
});

// Now define routes with /:id after
Router.get('/:id', (req, res, next) => {

    Recipes.getById(req.params.id)
        .then(recipe => {
            if (!recipe) {
                return res.status(404).json({ message: 'Recipe not found' });
            }
            res.status(200).json(recipe);
        })
        .catch(err => {
            next(err);
        });

})

// POST a new recipe
Router.post('/', validateRecipe, checkRecipeNameExists, (req, res, next) => {
    Recipes.addRecipe(req.body)
        .then(recipe => {
            // Ensure recipe includes recipe_id
            res.status(201).json({ createdRecipe: recipe, message: 'Recipe created successfully' });
        })
        .catch(err => {
            next(err);
        });
});

Router.put('/:id', validateRecipe, validateRecipeUpdate, (req, res, next) => {
    const { id } = req.params;
    Recipes.updateRecipe(id, req.body)
        .then(updatedRecipe => {
            if (!updatedRecipe) {
                return res.status(404).json({ message: 'Recipe not found' });
            }
            // Changed 'recipe' to 'updatedRecipe' to match frontend expectation
            res.status(200).json({ updatedRecipe, message: 'Recipe updated successfully' });
        })
        .catch(err => {
            next(err);
        });
})

Router.delete('/:id', (req, res, next) => {
    const { id } = req.params;



    Recipes.deleteRecipe(id)
        .then(deleted => {
            if (deleted) {
                res.status(200).json({ message: 'Recipe deleted successfully' });
            } else {
                res.status(404).json({ message: 'Recipe not found' });
            }
        })
        .catch(err => {
            next(err);
        });
});

module.exports = Router;