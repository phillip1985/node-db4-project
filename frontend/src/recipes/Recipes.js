import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setRecipes, setStatus, setError } from './recipesSlice';
import { fetchRecipes, deleteRecipe } from './recipesApi';
import './Recipes.css';

const Recipes = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const recipes = useSelector((state) => state.recipes.recipes);
  const status = useSelector((state) => state.recipes.status);
  const error = useSelector((state) => state.recipes.error);
  const [localSuccessMessage, setLocalSuccessMessage] = useState(location.state?.successMessage);

  useEffect(() => {
    const loadRecipes = async () => {
      dispatch(setStatus('loading'));
      try {
        const response = await fetchRecipes();
        dispatch(setRecipes(response.data));
      } catch (err) {
        dispatch(setError(err.message));
      }
    };

    loadRecipes();
  }, [dispatch]);

  // Hide the message after 3 seconds
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

  const handleDelete = async (recipeId) => {
    if (!window.confirm('Are you sure you want to delete this recipe?')) return;
    dispatch(setStatus('loading'));
    try {
      await deleteRecipe(recipeId);
      // Remove from local state
      dispatch(setRecipes(recipes.filter(r => r.recipe_id !== recipeId)));
      setLocalSuccessMessage('Recipe deleted successfully!');
    } catch (err) {
      dispatch(setError(err.message));
    }
  };

  if (status === 'loading') {
    return <div>Loading recipes...</div>;
  }

  if (status === 'failed') {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h2>Recipes</h2>
      {localSuccessMessage && (
        <div className="success-message-float">{localSuccessMessage}</div>
      )}
      {recipes.length === 0 ? (
        <div className="no-recipes-section">
          <p>No recipes found.</p>
          <Link className="add-recipe-link" to="/recipes/new">Add a new recipe</Link>
        </div>
      ) : (
        <div className="recipes-list-container">
          <ul className="recipes-list">
            {recipes.map((recipe) => (
              <li key={recipe.recipe_id} className="recipe-list-item">
                <div className="recipe-list-content">
                  <div>
                    <Link to={`/recipes/${recipe.recipe_id}`}>
                      <strong>{recipe.recipe_name}</strong>
                    </Link>
                    {recipe.created_at && (
                      <span className="recipe-list-date" style={{ display: 'block', color: '#888', fontSize: '0.95em', marginLeft: 8 }}>
                        (Created: {new Date(recipe.created_at).toLocaleString()})
                      </span>
                    )}
                  </div>
                  <div className="recipe-list-actions">
                    <Link to={`/recipes/${recipe.recipe_id}/edit`} className="edit-btn">Edit</Link>
                    <button
                      className="delete-btn"
                      style={{ marginLeft: 8 }}
                      onClick={() => handleDelete(recipe.recipe_id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Recipes;