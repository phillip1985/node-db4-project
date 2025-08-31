import { configureStore } from '@reduxjs/toolkit'
import recipesReducer from './recipes/recipesSlice'

export default configureStore({
    reducer: {
        recipes: recipesReducer,
    },
})