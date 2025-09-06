import { configureStore } from '@reduxjs/toolkit'
import recipesReducer from '../reducers/recipes/recipesSlice'

export default configureStore({
    reducer: {
        recipes: recipesReducer,
    },
})