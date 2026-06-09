import React from 'react';
import PlantPreview from './PlantPreview';
import './TreeModel.css';

function TreeModel({ completionRate, plantType = 'fern', growthStage = 0 }) {
  const percentage = Math.min(100, Math.max(completionRate || 0, 0));
  const stage = Math.min(Math.max(growthStage || 0, 0), 12);
  const auraScale = 0.9 + percentage / 180;
  const plantLift = Math.max(0, (12 - stage) * 0.18);

  return (
    <div className="botanical-tree-wrapper">
      <div
        className="arboretum-aura"
        style={{
          transform: `scale(${auraScale})`,
          opacity: 0.5 + percentage / 220
        }}
        aria-hidden="true"
      />
      <div className="arboretum-motes" aria-hidden="true">
        <span className="mote mote-one" />
        <span className="mote mote-two" />
        <span className="mote mote-three" />
      </div>
      <div
        className="arboretum-plant"
        style={{ transform: `translateY(${plantLift}rem)` }}
      >
        <PlantPreview plantType={plantType} growthStage={stage} size="large" />
      </div>
    </div>
  );
}

export default TreeModel;
