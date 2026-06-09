import React, { useMemo } from 'react';
import PlantPreview from '../PlantPreview';
import './GreenhouseComponents.css';

export default function PreservedBloom({ specimen, index = 0 }) {
  // Each bloom gets unique breathing parameters for natural variation
  const breatheStyle = useMemo(() => {
    // Seed from specimen id for deterministic but varied results
    const seed = specimen.id || index;
    const duration = 8 + (seed % 7); // 8-15 seconds
    const delay = (seed * 1.3) % 10;  // 0-10s stagger
    
    return {
      '--breathe-duration': `${duration}s`,
      '--breathe-delay': `${delay}s`,
      // Slight scale variation for canopy depth at high density
      '--bloom-scale': `${0.95 + (seed % 10) * 0.01}`
    };
  }, [specimen.id, index]);

  return (
    <div
      className="gh-preserved-bloom"
      data-specimen-id={specimen.id}
      aria-label={`${specimen.plant_type} bloom from ${specimen.habit_name}`}
      style={breatheStyle}
    >
      <div className="gh-bloom-svg-wrapper">
        <PlantPreview
          plantType={specimen.plant_type}
          growthStage={specimen.growth_stage_reached || 12}
          fullBloom={true}
          size="medium"
        />
        <div className="gh-bloom-pedestal" />
        <div className="gh-bloom-shadow" />
      </div>
    </div>
  );
}
