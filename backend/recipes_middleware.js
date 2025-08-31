const db = require('../data/dbConfig'); // Adjust the path as necessary
const yup = require('yup');

const recipeSchema = yup.object({
    recipe_name: yup
        .string().trim()
        .min(3, 'recipe name must be at least 3 characters long')
        .max(100, 'recipe name must be at most 100 characters long')
        .required('recipe name is required'),
    steps: yup.array().of(
        yup.object({
            step_number: yup
                .number()
                .integer()
                .min(1)
                .required(),
            step_instructions: yup.string().trim()
                .min(10, 'step instructions must be at least 10 characters long')
                .max(200, 'step instructions must be at most 200 characters long')
                .required(),
            ingredients: yup.array().of(
                yup.object({
                    ingredient_id: yup.number().integer().positive().required(),
                    quantity: yup.number().positive().required(),
                })
            ).optional(),
        })
    )
        .typeError('steps must be an array of step objects')
        .required('at least one step is required'),
});


async function validateRecipe(req, res, next) {
    try {
        await recipeSchema.validate(req.body, { abortEarly: false });
        next();
    } catch (error) {
        res.status(400).json({ errors: error.errors });
    }
}

async function checkRecipeNameExists(req, res, next) {

    const { recipe_name } = req.body;

    try {
        const existingRecipe = await db('recipes').where({ recipe_name }).first();
        if (existingRecipe) {
            return res.status(400).json({
                message: 'Recipe name already exists',
                code: 'RECIPE_NAME_EXISTS'
            });
        }
        next();


    } catch (error) {
        res.status(500).json({ message: 'Error checking recipe name', error });
    }
} 

async function validateRecipeUpdate(req, res, next) {
    const { id } = req.params;
    const { recipe_name } = req.body;
    try {
        const recipe = await db('recipes').where({ recipe_id: id }).first();
        if (!recipe) {
            return res.status(404).json({ message: 'Recipe not found' });
        }

        if (recipe.recipe_name !== recipe_name) {
            const existingRecipe = await db('recipes').where({ recipe_name }).first();
            if (existingRecipe) {
                return res.status(409).json({
                    message: 'Recipe name already exists',
                    code: 'RECIPE_NAME_EXISTS'
                });
            }
        }

        next();
    } catch (error) {
        res.status(500).json({ message: 'Error validating recipe update', error });
    }
}

module.exports = {
    validateRecipe,
    validateRecipeUpdate,
    checkRecipeNameExists
};