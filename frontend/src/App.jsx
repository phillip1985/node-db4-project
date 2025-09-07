import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Recipes from './recipes/Recipes';
import RecipeDetail from './recipes/RecipeDetail';
import RecipeForm from './recipes/RecipeForm';
import Home from './Home';

const App = () => (
    <Router>
    
        <nav>
            <ul>
                <li><Link to="/">Home</Link></li>
                <li><Link to="/recipes">Recipes</Link></li>
                <li><Link to="/recipes/new">Add Recipe</Link></li>
            </ul>
        </nav>
        <div className="main-content">
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/recipes" element={<Recipes />} />
            <Route path="/recipes/new" element={<RecipeForm />} />
            <Route path="/recipes/:id" element={<RecipeDetail />} />
            <Route path="/recipes/:id/edit" element={<RecipeForm />} />
            <Route path="*" element={<h2>404: Page Not Found</h2>} />
            </Routes>
        </div>
    </Router>
);

export default App;