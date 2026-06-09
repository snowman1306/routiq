import React from 'react';
import { Link } from 'react-router-dom';
import './GreenhouseComponents.css'; // I will create a shared CSS file for greenhouse components

export default function EmptyConservatory() {
  return (
    <div className="gh-empty-conservatory glass-panel">
      <div className="gh-overview-content">
        <h2>THE COLLECTION</h2>
        <p>
          This conservatory is waiting for its first bloom.
        </p>
        <p>
          Complete a full growth cycle from the Garden to preserve your first specimen here.
        </p>
        <Link to="/garden" className="gh-empty-cta">
          Visit the Garden
        </Link>
      </div>
    </div>
  );
}
