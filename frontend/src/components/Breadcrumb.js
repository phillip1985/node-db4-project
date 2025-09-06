import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Breadcrumb.css';

const SEGMENT_LABELS = {
  recipes: 'Recipes',
  new: 'New Recipe',
  edit: 'Edit',
};

const Breadcrumb = ({ recipeName, recipeId }) => {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);

  const items = [{ label: 'Home', to: '/' }];

  segments.forEach((seg, idx) => {
    // Recipes segment
    if (seg === 'recipes') {
      items.push({ label: SEGMENT_LABELS[seg] || seg, to: '/recipes' });
    }
    // Known segments (edit, new)
    else if (SEGMENT_LABELS[seg]) {
      items.push({ label: SEGMENT_LABELS[seg], to: null });
    }
    // If this segment is the recipe ID and recipeName is provided, use the name as a link
    else if (recipeName && recipeId && idx > 0 && segments[idx - 1] === 'recipes') {
      items.push({ label: recipeName, to: `/recipes/${recipeId}` });
    }
    // Otherwise, show as plain text (for other segments)
    else {
      items.push({ label: seg, to: null });
    }
  });

  return (
    <div className="recipe-details-breadcrumb">
      {items.map((item, idx) => (
        <span key={idx}>
          {idx > 0 && ' / '}
          {item.to ? (
            <Link to={item.to} className="breadcrumb-link">{item.label}</Link>
          ) : (
            <span className="breadcrumb-active">{item.label}</span>
          )}
        </span>
      ))}
    </div>
  );
};

export default Breadcrumb;