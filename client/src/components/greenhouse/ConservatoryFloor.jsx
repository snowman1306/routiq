import React, { useRef, useState, useCallback } from 'react';
import CollectionWing from './CollectionWing';
import SpecimenPlacard from './SpecimenPlacard';
import './GreenhouseComponents.css';

export default function ConservatoryFloor({ wings }) {
  const [activeSpecimen, setActiveSpecimen] = useState(null);
  const [placardAnchor, setPlacardAnchor] = useState(null);
  const floorRef = useRef(null);

  // We build a flat lookup table of specimens by ID for fast event delegation
  const specimenLookup = React.useMemo(() => {
    const map = new Map();
    wings.forEach(wing => {
      wing.specimens.forEach(spec => {
        map.set(spec.id.toString(), { ...spec, habit_name: wing.habit_name });
      });
    });
    return map;
  }, [wings]);

  const handleMouseOver = useCallback((e) => {
    const bloomEl = e.target.closest('[data-specimen-id]');
    if (bloomEl) {
      const id = bloomEl.getAttribute('data-specimen-id');
      const specimen = specimenLookup.get(id);
      if (specimen) {
        setActiveSpecimen(specimen);
        setPlacardAnchor(bloomEl.getBoundingClientRect());
      }
    } else if (activeSpecimen && !e.target.closest('.gh-placard')) {
      // Clear if hovering over soil/path, unless we are hovering the placard itself
      setActiveSpecimen(null);
      setPlacardAnchor(null);
    }
  }, [specimenLookup, activeSpecimen]);

  return (
    <div 
      className="gh-conservatory-floor" 
      ref={floorRef}
      onMouseOver={handleMouseOver}
      onTouchStart={handleMouseOver} // For mobile tap-to-view
    >
      <div className="gh-cultivation-rows">
        {wings.map(wing => (
          <CollectionWing key={wing.habit_name} wing={wing} />
        ))}
      </div>

      {activeSpecimen && (
        <SpecimenPlacard
          specimen={activeSpecimen}
          anchorRect={placardAnchor}
          onClose={() => {
            setActiveSpecimen(null);
            setPlacardAnchor(null);
          }}
        />
      )}
    </div>
  );
}
