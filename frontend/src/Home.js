import React from 'react';
import { Link } from 'react-router-dom';
import './App.css'; // Use the shared button styles
import './Home.css'; // Specific styles for Home component

const Home = () => (
  <div className="home-container">
    <h1>Welcome to the Recipe App</h1>
    <p>Discover, create, and manage your favorite recipes!</p>
    <div className="home-links">
      <Link to="/recipes" className="app-button">View Recipes</Link>
      <Link to="/recipes/new" className="app-button">Create a Recipe</Link>
    </div>
  </div>
);

export default Home;