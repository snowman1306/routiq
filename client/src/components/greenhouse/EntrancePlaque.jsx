import React from 'react';
import './GreenhouseComponents.css';

export default function EntrancePlaque({ collection, densityScore, title }) {
  if (!collection || collection.total_blooms === 0) return null;
  if (densityScore < 10) return null; // Plant-First Entrance rule

  return (
    <div className="gh-entrance-plaque glass-panel">
      <div className="gh-plaque-screws">
        <div className="gh-screw top-left" />
        <div className="gh-screw top-right" />
      </div>
      
      <div className="gh-plaque-content">
        <h2>{title}</h2>
        <p className="gh-plaque-subtitle">Preserved Growth</p>
        <div className="gh-plaque-stats">
          <span>{collection.total_blooms} Blooms</span>
          <span className="gh-plaque-dot">•</span>
          <span>{collection.species_cultivated} Species</span>
        </div>
      </div>

      <div className="gh-plaque-screws">
        <div className="gh-screw bottom-left" />
        <div className="gh-screw bottom-right" />
      </div>
    </div>
  );
}
