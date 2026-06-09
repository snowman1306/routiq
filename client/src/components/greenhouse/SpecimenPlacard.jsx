import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import PlantPreview from '../PlantPreview';
import './SpecimenPlacard.css';

export default function SpecimenPlacard({ specimen, anchorRect, onClose }) {
  const placardRef = useRef(null);
  const [position, setPosition] = useState({});

  useEffect(() => {
    if (!anchorRect || !placardRef.current) return;
    
    // Positioning logic to hover gracefully near the plant
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const placardRect = placardRef.current.getBoundingClientRect();
    
    let top = anchorRect.top - placardRect.height - 16; // Hover above the plant
    let left = anchorRect.left + (anchorRect.width / 2) - (placardRect.width / 2); // Center horizontally
    
    // If it overflows top, put it below
    if (top < 20) {
      top = anchorRect.bottom + 16;
    }
    // Adjust if overflowing right
    if (left + placardRect.width > viewportWidth - 20) {
      left = viewportWidth - placardRect.width - 20;
    }
    // Adjust if overflowing left
    if (left < 20) {
      left = 20;
    }

    setPosition({ top, left });
  }, [anchorRect]);

  const date = new Date(specimen.grown_at);
  const formattedDate = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // Capitalize first letter of plant type
  const speciesName = specimen.plant_type.charAt(0).toUpperCase() + specimen.plant_type.slice(1);

  const content = (
    <div 
      className="gh-placard glass-panel tooltip-mode" 
      ref={placardRef}
      style={position} 
      role="tooltip"
    >
      <div className="gh-placard-header">
        <h2 className="gh-placard-species">{speciesName}</h2>
        <p className="gh-placard-provenance">
          from <span className="gh-provenance-habit">{specimen.habit_name}</span>
        </p>
      </div>

      <div className="gh-placard-details">
        <p>Preserved {formattedDate}</p>
        {specimen.isFirstBloom && <p className="gh-placard-first-bloom">First Bloom</p>}
        <p>Milestone {specimen.milestone_number} • Growth Cycle {specimen.growth_cycle_number || 1}</p>
      </div>

      {specimen.reward_given && (
        <div className="gh-placard-reward">
          <p><span className="gh-reward-label">Reward:</span> {specimen.reward_given}</p>
        </div>
      )}
    </div>
  );

  return createPortal(content, document.body);
}
