import React from 'react';
import PreservedBloom from './PreservedBloom';
import BotanicalMarker from './BotanicalMarker';
import './GreenhouseComponents.css';

export default function CollectionWing({ wing }) {
  const count = wing.bloom_count;
  let containerClass = "gh-bench";
  
  if (count <= 3) {
    containerClass = "gh-pedestal";
  } else if (count <= 12) {
    containerClass = "gh-potting-table";
  }

  return (
    <section className={`gh-cultivation-region ${containerClass}`} aria-label={`${wing.habit_name} cultivation region, ${wing.bloom_count} specimens`}>
      <BotanicalMarker habitName={wing.habit_name} bloomCount={wing.bloom_count} />

      <div className="gh-cultivation-surface glass-panel">
        <div className="gh-planter-grid">
          {wing.specimens.map((specimen, index) => (
            <PreservedBloom 
              key={specimen.id}
              specimen={specimen}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
