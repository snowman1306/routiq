import React, { useState } from 'react';
import PreservedBloom from './PreservedBloom';
import './GreenhouseComponents.css';

export default function SpecimenShelf({ specimens, onSpecimenClick }) {
  const [expandedEras, setExpandedEras] = useState(new Set());

  // Group specimens by era (Year/Season or just Year depending on age)
  const groupIntoEras = (specs) => {
    if (specs.length <= 12) {
      return [{ id: 'all', title: null, specimens: specs, isRecent: true }];
    }

    const erasMap = new Map();
    specs.forEach((s) => {
      const date = new Date(s.grown_at);
      const year = date.getFullYear();
      // Optional: add season logic here if desired, keeping it simple as Year for now
      const eraKey = `${year}`;
      
      if (!erasMap.has(eraKey)) {
        erasMap.set(eraKey, { id: eraKey, title: eraKey, specimens: [] });
      }
      erasMap.get(eraKey).specimens.push(s);
    });

    const eras = Array.from(erasMap.values()).sort((a, b) => parseInt(b.id) - parseInt(a.id));
    if (eras.length > 0) {
      eras[0].isRecent = true; // Most recent era is always expanded
    }
    return eras;
  };

  const eras = groupIntoEras(specimens);

  const toggleEra = (eraId) => {
    setExpandedEras(prev => {
      const next = new Set(prev);
      if (next.has(eraId)) {
        next.delete(eraId);
      } else {
        next.add(eraId);
      }
      return next;
    });
  };

  return (
    <div className="gh-shelf-container">
      {eras.map(era => {
        const isExpanded = era.isRecent || expandedEras.has(era.id);

        if (!isExpanded) {
          return (
            <button 
              key={era.id}
              className="gh-collection-drawer glass-panel"
              onClick={() => toggleEra(era.id)}
            >
              <span className="gh-drawer-title">{era.title}</span>
              <span className="gh-drawer-count">({era.specimens.length})</span>
            </button>
          );
        }

        return (
          <div key={era.id} className="gh-era-group">
            {era.title && <h4 className="gh-era-header">{era.title}</h4>}
            <div className="gh-specimen-shelf glass-panel">
              <div className="gh-shelf-scroll">
                {era.specimens.map(specimen => (
                  <PreservedBloom 
                    key={specimen.id}
                    specimen={specimen}
                    onClick={onSpecimenClick}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
