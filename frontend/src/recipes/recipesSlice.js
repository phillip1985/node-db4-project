import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    recipes: [],
    status: 'idle',
    error: null,
    ingredients: [],
    ingredientsStatus: 'idle',
};

const recipesSlice = createSlice({
    name: 'recipes',
    initialState,
    reducers: {
        setRecipes(state, action) {
            state.recipes = action.payload;
            state.status = 'succeeded';
        },
        addRecipe(state, action) {
            state.recipes.push(action.payload);
            state.status = 'succeeded';
        },
        updateRecipeInState(state, action) {
            const idx = state.recipes.findIndex(r => String(r.recipe_id) === String(action.payload.recipe_id));
            if (idx !== -1) {
                state.recipes[idx] = action.payload;
            } else {
                state.recipes.push(action.payload);
            }
        },
        setStatus(state, action) {
            state.status = action.payload;
        },
        setError(state, action) {
            state.status = 'failed';
            state.error = action.payload;
        },
        setIngredients(state, action) {
            state.ingredients = action.payload;
            state.ingredientsStatus = 'succeeded';
        },
        clearError(state) {
            state.error = null;
        },
    },
});

export const {
    setRecipes,
    addRecipe,
    updateRecipeInState,
    setStatus,
    setError,
    setIngredients,
    clearError,
} = recipesSlice.actions;

export default recipesSlice.reducer;