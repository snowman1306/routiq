import React from 'react';
import './GreenhouseComponents.css';

export default function BotanicalMarker({ habitName, bloomCount }) {
  return (
    <div className="gh-botanical-marker">
      <div className="gh-marker-stake" />
      <div className="gh-marker-sign glass-panel">
        <h3 className="gh-marker-title">{habitName}</h3>
      </div>
    </div>
  );
}
