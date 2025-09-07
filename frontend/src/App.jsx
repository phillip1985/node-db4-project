import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
const Recipes = React.lazy(() => import('./recipes/Recipes'));
const RecipeDetail = React.lazy(() => import('./recipes/RecipeDetail'));
const RecipeForm = lazy(() => import('./recipes/RecipeForm'));
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
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/recipes" element={<Recipes />} />
              <Route path="/recipes/new" element={<RecipeForm />} />
              <Route path="/recipes/:id" element={<RecipeDetail />} />
              <Route path="/recipes/:id/edit" element={<RecipeForm />} />
              <Route path="*" element={<h2>404: Page Not Found</h2>} />
          </Routes>
        </Suspense>
        </div>
    </Router>
);

export default App;