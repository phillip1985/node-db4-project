import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setRecipes, setStatus, setError } from './recipesSlice';
import { fetchRecipes, deleteRecipe } from './recipesApi';
import './Recipes.css';
import ConfirmModal from '../components/ConfirmModal';

const DEFAULT_PAGE_SIZE = 10;

function getPageFromQuery(search, totalPages) {
  const params = new URLSearchParams(search);
  const page = parseInt(params.get('page'), 10);
  if (isNaN(page) || page < 1) return 1;
  if (totalPages && page > totalPages) return totalPages;
  return page;
}

const Recipes = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const recipes = useSelector((state) => state.recipes.recipes);
  const status = useSelector((state) => state.recipes.status);
  const error = useSelector((state) => state.recipes.error);

  // Pagination state
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);

  // Calculate totalPages after recipes are loaded
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Sync page state with URL query, validate page
  const [page, setPage] = useState(getPageFromQuery(location.search, totalPages));

  useEffect(() => {
    setPage(getPageFromQuery(location.search, totalPages));
    // eslint-disable-next-line
  }, [location.search, totalPages]);

  const [localSuccessMessage, setLocalSuccessMessage] = useState(location.state?.successMessage);

  useEffect(() => {
    const loadRecipes = async () => {
      dispatch(setStatus('loading'));
      try {
        const response = await fetchRecipes(page, pageSize);
        dispatch(setRecipes(response.recipes));
        setTotal(response.total);
      } catch (err) {
        dispatch(setError(err.message));
      }
    };

    loadRecipes();
  }, [dispatch, page, pageSize]);

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
      navigate(location.pathname + location.search, { replace: true, state: {} });
    }
    // eslint-disable-next-line
  }, []);

  // ConfirmModal state
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingDeleteRecipe, setPendingDeleteRecipe] = useState(null);

  const handleDeleteClick = (recipe) => {
    setPendingDeleteRecipe(recipe);
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    setShowConfirm(false);
    if (!pendingDeleteRecipe) return;
    dispatch(setStatus('loading'));
    try {
      await deleteRecipe(pendingDeleteRecipe.recipe_id);
      const response = await fetchRecipes(page, pageSize);
      dispatch(setRecipes(response.recipes));
      setTotal(response.total);
      setLocalSuccessMessage('Recipe deleted successfully!');
    } catch (err) {
      dispatch(setError(err.message));
    }
    setPendingDeleteRecipe(null);
  };

  const cancelDelete = () => {
    setShowConfirm(false);
    setPendingDeleteRecipe(null);
  };

  // Handlers for pagination buttons
  const goToPage = (newPage) => {
    // Only allow navigation to valid pages
    const safePage = Math.max(1, Math.min(totalPages, Number(newPage)));
    navigate(`/recipes?page=${safePage}`);
  };

  if (status === 'loading') {
    return <div>Loading recipes...</div>;
  }

  if (status === 'failed') {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="recipes-page-container">
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
        <>
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
                        onClick={() => handleDeleteClick(recipe)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          {/* Pagination Controls */}
          <div className="pagination-controls">
            <button
              onClick={() => goToPage(Math.max(1, page - 1))}
              disabled={page === 1}
              style={{ marginRight: 10 }}
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => goToPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages || totalPages === 0}
              style={{ marginLeft: 10 }}
            >
              Next
            </button>
          </div>
        </>
      )}
      <ConfirmModal
        show={showConfirm}
        message={
          pendingDeleteRecipe
            ? `Are you sure you want to delete "${pendingDeleteRecipe.recipe_name}"?`
            : "Are you sure you want to delete this recipe?"
        }
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
};

export default Recipes;