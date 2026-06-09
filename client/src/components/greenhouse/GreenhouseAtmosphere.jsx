import React, { useMemo } from 'react';

export default function GreenhouseAtmosphere({ densityScore }) {
  // Determine Growth State
  let stateClass = 'gh-env-genesis';
  let sporeCount = 0;
  
  if (densityScore >= 500) {
    stateClass = 'gh-env-archive';
    sporeCount = 45;
  } else if (densityScore >= 200) {
    stateClass = 'gh-env-established';
    sporeCount = 30;
  } else if (densityScore >= 50) {
    stateClass = 'gh-env-flourishing';
    sporeCount = 15;
  } else {
    // Genesis: < 50 density — quiet, focused
    sporeCount = 4;
  }

  // Generate spore properties once per density tier
  const spores = useMemo(() => {
    return Array.from({ length: sporeCount }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${20 + Math.random() * 70}%`,
      size: `${Math.random() * 3 + 1.5}px`,
      // Slow: 14-28 second cycles (was 6-14)
      duration: `${Math.random() * 14 + 14}s`,
      // Stagger entry across the full cycle
      delay: `${Math.random() * -20}s`,
      maxOpacity: Math.random() * 0.3 + 0.1,
      // Horizontal drift: randomized left/right wander
      driftX: `${(Math.random() - 0.5) * 50}px`
    }));
  }, [sporeCount]);

  return (
    <div className={`greenhouse-atmosphere ${stateClass}`} aria-hidden="true">
      {/* Ambient orbs — diffused conservatory light */}
      <div className="gh-orb gh-orb-one" />
      <div className="gh-orb gh-orb-two" />
      {densityScore > 30 && <div className="gh-orb gh-orb-three" />}

      {/* Light Shafts — ultra-slow daylight drift */}
      <div className="gh-light-shaft gh-light-main" />
      {densityScore > 20 && <div className="gh-light-shaft gh-light-secondary" />}

      {/* Floating Dust & Pollen */}
      <div className="gh-spores-container">
        {spores.map(s => (
          <div
            key={s.id}
            className="gh-spore"
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              animationDuration: s.duration,
              animationDelay: s.delay,
              '--duration': s.duration,
              '--max-opacity': s.maxOpacity,
              '--drift-x': s.driftX
            }}
          />
        ))}
      </div>
    </div>
  );
}
