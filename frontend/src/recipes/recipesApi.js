import axios from 'axios';

const BASE_URL = 'http://localhost:9009/api/recipes';

const fetchRecipes = () => axios.get(BASE_URL);

const fetchRecipeById = async (id) => {
    try {
        const response = await axios.get(`${BASE_URL}/${id}`);
        return response;
    } catch (error) {
        throw error;
    }
};

const createNewRecipe = async (recipeData) => {
    try {
        const response = await axios.post(BASE_URL, recipeData);
        return response;
    } catch (error) {
        throw error;
    }
};

const updateRecipe = async (id, updatedData) => {
    try {
        const response = await axios.put(`${BASE_URL}/${id}`, updatedData);
        return response;
    } catch (error) {
        throw error;
    }
};

const fetchIngredients = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/ingredients`);
        return response;
    } catch (error) {
        throw error;
    }
};

const deleteRecipe = async (id) => {
    try {
        const response = await axios.delete(`${BASE_URL}/${id}`);
        return response;
    } catch (error) {
        throw error;
    }
};

export async function checkRecipeNameExists(name) {
    try {
        const res = await axios.get(`${BASE_URL}/check-name?name=${encodeURIComponent(name)}`);
        return !res.data.available; // true if taken, false if available
    } catch (err) {
        // Optionally handle error
        return false;
    }
}

export {
    fetchRecipes,
    fetchRecipeById,
    createNewRecipe,
    updateRecipe,
    fetchIngredients,
    deleteRecipe,
};



