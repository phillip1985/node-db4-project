import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { setRecipes, setStatus, setError } from './recipesSlice';
import { fetchRecipeById, deleteRecipe } from './recipesApi';
import './recipeDetails.css';

const RecipeDetail = () => {
    const { id } = useParams();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const status = useSelector((state) => state.recipes.status);
    const error = useSelector((state) => state.recipes.error);

    const recipe = useSelector((state) =>
        state.recipes.recipes.find((r) => String(r.recipe_id) === String(id))
    );

    // Local state for the success message
    const [localSuccessMessage, setLocalSuccessMessage] = useState(location.state?.successMessage);

    // Hide the success message after 3 seconds
    useEffect(() => {
        if (localSuccessMessage) {
            const timer = setTimeout(() => setLocalSuccessMessage(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [localSuccessMessage]);

    // Clear the router state after showing the message
    useEffect(() => {
        if (location.state?.successMessage) {
            navigate(location.pathname, { replace: true, state: {} });
        }
        // eslint-disable-next-line
    }, []);

    const loadRecipe = async (id) => {
        dispatch(setStatus('loading'));
        try {
            const response = await fetchRecipeById(id);
            dispatch(setRecipes([response.data])); // or update the array as needed
        } catch (err) {
            dispatch(setError(err.message));
        }
    };

    useEffect(() => {
        loadRecipe(id);
    }, [dispatch, id]);

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this recipe?')) return;
        dispatch(setStatus('loading'));
        try {
            await deleteRecipe(id);
            dispatch(setStatus('succeeded'));
            navigate('/recipes', { state: { successMessage: 'Recipe deleted successfully!' } });
        } catch (err) {
            dispatch(setStatus('failed'));
            dispatch(setError(err.message));
        }
    };

    if (status === 'loading') {
        return <div>Loading recipe...</div>;
    }

    if (status === 'failed') {
        return <div>Error: {error}</div>;
    }

    if (!recipe) {
        return <div>Recipe not found.</div>;
    }

    return (
        <div className="recipe-details-card">
            {localSuccessMessage && (
                <div className="success-message-float">{localSuccessMessage}</div>
            )}
            <div className="recipe-detail-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                    <h2 className="recipe-details-title">{recipe.recipe_name}</h2>
                    {recipe.created_at && (
                        <div className="recipe-details-meta">
                            Created: {new Date(recipe.created_at).toLocaleString()}
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Link
                        className="recipe-details-btn recipe-details-btn--edit"
                        to={`/recipes/${recipe.recipe_id}/edit`}
                    >
                        Edit Recipe
                    </Link>
                    <button
                        className="recipe-details-btn recipe-details-btn--delete"
                        onClick={handleDelete}
                    >
                        Delete Recipe
                    </button>
                </div>
            </div>
            {recipe.description && <p className="recipe-detail-description">{recipe.description}</p>}
            <div className="recipe-details-section-title">Steps</div>
            <ol className="recipe-details-steps-list">
                {(recipe.steps || recipe.recipe_steps) && (recipe.steps || recipe.recipe_steps).map((step, idx) => (
                    <li key={idx} className="recipe-details-step">
                        <div className="recipe-details-step-number">Step {step.step_number}</div>
                        <div className="recipe-details-step-instructions">{step.step_instructions}</div>
                        {step.ingredients && step.ingredients.length > 0 && (
                            <>
                                <div className="recipe-details-section-title" style={{ margin: '10px 0 6px 0', fontSize: '1em' }}>Ingredients:</div>
                                <ul className="recipe-details-ingredients-list">
                                    {step.ingredients.map((ingredient, i) => (
                                        <li key={i} className="recipe-details-ingredient">
                                            {ingredient.ingredient_name}
                                            {ingredient.quantity ? `: ${ingredient.quantity}` : ''}
                                            {ingredient.unit ? ` ${ingredient.unit}` : ''}
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </li>
                ))}
            </ol>
        </div>
    );
};

export default RecipeDetail;