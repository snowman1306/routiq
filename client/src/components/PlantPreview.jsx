import React, { useId } from 'react';
import { getPlantById } from '../constants/plants';
import './PlantPreview.css';

const THEMES = {
  fern: {
    stem: '#184c3b',
    leafA: '#4a7a55',
    leafB: '#97b67d',
    blossomA: '#eff6dd',
    blossomB: '#cadfbc',
    aura: 'rgba(151, 182, 125, 0.28)'
  },
  lotus: {
    stem: '#255966',
    leafA: '#49756f',
    leafB: '#8fb9a8',
    blossomA: '#fff3ee',
    blossomB: '#efb9aa',
    aura: 'rgba(239, 185, 170, 0.26)'
  },
  orchid: {
    stem: '#5b4d74',
    leafA: '#5d8664',
    leafB: '#9fbe9f',
    blossomA: '#f6efff',
    blossomB: '#cda2d9',
    aura: 'rgba(205, 162, 217, 0.26)'
  },
  bonsai: {
    stem: '#6b4b39',
    leafA: '#5f7745',
    leafB: '#9ab277',
    blossomA: '#f3ead9',
    blossomB: '#d4ba92',
    aura: 'rgba(212, 186, 146, 0.24)'
  },
  moonvine: {
    stem: '#2a5960',
    leafA: '#5d98a0',
    leafB: '#b8dbd8',
    blossomA: '#ffffff',
    blossomB: '#d9d5ff',
    aura: 'rgba(217, 213, 255, 0.3)'
  }
};

function frondPath(x, y, side = 1, size = 1) {
  const sweep = side === 1 ? 1 : 0;
  return `M ${x} ${y} C ${x + 12 * side * size} ${y - 6 * size}, ${x + 28 * side * size} ${y - 22 * size}, ${x + 34 * side * size} ${y - 42 * size} C ${x + 18 * side * size} ${y - 38 * size}, ${x + 10 * side * size} ${y - 26 * size}, ${x} ${y}`;
}

function blossomOpacity(stage, threshold, visible = 0.95, hidden = 0.08) {
  return stage >= threshold ? visible : hidden;
}

function revealStrokeProps(progress) {
  const clamped = Math.min(Math.max(progress, 0), 1);
  return {
    pathLength: 100,
    strokeDasharray: 100,
    strokeDashoffset: 100 - clamped * 100
  };
}

function renderFern(stage, theme, ids) {
  const fronds = [
    { x: 78, y: 128, side: -1, size: 0.88, threshold: 2 },
    { x: 82, y: 124, side: 1, size: 0.92, threshold: 3 },
    { x: 78, y: 108, side: -1, size: 1.02, threshold: 5 },
    { x: 82, y: 104, side: 1, size: 1.08, threshold: 6 },
    { x: 80, y: 90, side: -1, size: 1.1, threshold: 8 },
    { x: 82, y: 86, side: 1, size: 1.15, threshold: 9 }
  ];

  return (
    <>
      <path
        d="M80 142 C80 126 81 112 80 98 C79 78 84 58 92 36"
        fill="none"
        stroke={`url(#${ids.stem})`}
        strokeWidth="6"
        strokeLinecap="round"
        {...revealStrokeProps(stage / 4)}
      />
      {fronds.map((frond) => (
        <path
          key={`${frond.x}-${frond.y}-${frond.side}`}
          d={frondPath(frond.x, frond.y, frond.side, frond.size)}
          fill={`url(#${ids.leaf})`}
          opacity={blossomOpacity(stage, frond.threshold, 0.98, 0)}
        />
      ))}
      <path
        d="M92 36 C102 24 111 24 114 34 C113 46 102 48 94 42"
        fill="none"
        stroke={theme.leafB}
        strokeWidth="4"
        strokeLinecap="round"
        opacity={blossomOpacity(stage, 10, 1, 0)}
        {...revealStrokeProps(Math.max(0, (stage - 9) / 3))}
      />
      <circle cx="104" cy="31" r="8" fill={`url(#${ids.blossom})`} opacity={blossomOpacity(stage, 11)} filter={`url(#${ids.glow})`} />
      <circle cx="104" cy="31" r="2.4" fill={theme.stem} opacity={blossomOpacity(stage, 11)} />
    </>
  );
}

function renderLotus(stage, theme, ids) {
  const petals = [
    'M80 58 C73 46 74 30 80 20 C86 30 87 46 80 58Z',
    'M80 60 C64 55 54 41 50 27 C65 31 77 41 80 60Z',
    'M80 60 C96 55 106 41 110 27 C95 31 83 41 80 60Z',
    'M80 60 C60 60 46 50 40 38 C58 40 72 48 80 60Z',
    'M80 60 C100 60 114 50 120 38 C102 40 88 48 80 60Z'
  ];

  return (
    <>
      <ellipse cx="54" cy="132" rx="26" ry="10" fill={theme.leafA} opacity={blossomOpacity(stage, 2, 0.92, 0)} />
      <ellipse cx="106" cy="130" rx="28" ry="11" fill={theme.leafB} opacity={blossomOpacity(stage, 3, 0.9, 0)} />
      <ellipse cx="80" cy="136" rx="30" ry="12" fill={theme.leafA} opacity={blossomOpacity(stage, 4, 0.84, 0)} />
      <path
        d="M80 138 C79 114 79 90 80 60"
        fill="none"
        stroke={`url(#${ids.stem})`}
        strokeWidth="5.6"
        strokeLinecap="round"
        {...revealStrokeProps(stage / 4)}
      />
      <path
        d="M80 120 C68 106 58 96 44 90"
        fill="none"
        stroke={theme.leafA}
        strokeWidth="3.6"
        strokeLinecap="round"
        opacity={blossomOpacity(stage, 5, 0.82, 0)}
        {...revealStrokeProps(Math.max(0, (stage - 4) / 3))}
      />
      <path
        d="M80 112 C92 100 102 91 116 87"
        fill="none"
        stroke={theme.leafA}
        strokeWidth="3.4"
        strokeLinecap="round"
        opacity={blossomOpacity(stage, 6, 0.82, 0)}
        {...revealStrokeProps(Math.max(0, (stage - 5) / 3))}
      />
      {petals.map((petal, index) => (
        <path
          key={petal}
          d={petal}
          fill={`url(#${ids.blossom})`}
          opacity={blossomOpacity(stage, index < 3 ? 7 : 9, 0.96, 0)}
          filter={`url(#${ids.glow})`}
        />
      ))}
      <circle cx="80" cy="48" r="5" fill="#fff8ef" opacity={blossomOpacity(stage, 10)} />
      <circle cx="80" cy="48" r="2" fill={theme.stem} opacity={blossomOpacity(stage, 10)} />
    </>
  );
}

function renderOrchid(stage, theme, ids) {
  const blooms = [
    { x: 98, y: 38, scale: 1, threshold: 5 },
    { x: 112, y: 60, scale: 0.9, threshold: 7 },
    { x: 62, y: 54, scale: 0.95, threshold: 8 },
    { x: 50, y: 76, scale: 0.86, threshold: 10 }
  ];

  return (
    <>
      <path
        d="M78 142 C76 118 79 100 86 76 C92 58 101 47 112 34"
        fill="none"
        stroke={`url(#${ids.stem})`}
        strokeWidth="4.8"
        strokeLinecap="round"
        {...revealStrokeProps(stage / 4)}
      />
      <path
        d="M82 140 C82 124 80 108 74 90 C69 74 61 61 48 50"
        fill="none"
        stroke={`url(#${ids.stem})`}
        strokeWidth="4.2"
        strokeLinecap="round"
        {...revealStrokeProps(Math.max(0, (stage - 1) / 4))}
      />
      <path
        d="M80 134 C63 122 54 113 48 98"
        fill="none"
        stroke={theme.leafA}
        strokeWidth="4.2"
        strokeLinecap="round"
        opacity={blossomOpacity(stage, 2, 0.86, 0)}
        {...revealStrokeProps(Math.max(0, (stage - 2) / 3))}
      />
      <path
        d="M84 132 C100 118 109 109 114 95"
        fill="none"
        stroke={theme.leafB}
        strokeWidth="4.2"
        strokeLinecap="round"
        opacity={blossomOpacity(stage, 3, 0.86, 0)}
        {...revealStrokeProps(Math.max(0, (stage - 3) / 3))}
      />
      {blooms.map((bloom, index) => (
        <g
          key={`${bloom.x}-${bloom.y}`}
          transform={`translate(${bloom.x} ${bloom.y}) scale(${bloom.scale})`}
          opacity={blossomOpacity(stage, bloom.threshold, 1, 0)}
          filter={`url(#${ids.glow})`}
        >
          <path d="M0 -12 C5 -18 10 -18 14 -12 C9 -7 5 -5 0 -12Z" fill={`url(#${ids.blossom})`} />
          <path d="M0 12 C5 4 10 4 14 12 C9 17 5 19 0 12Z" fill={`url(#${ids.blossom})`} />
          <path d="M-10 0 C-18 -5 -18 -10 -10 -14 C-4 -9 -2 -5 -10 0Z" fill={`url(#${ids.blossom})`} />
          <path d="M24 0 C32 -5 32 -10 24 -14 C18 -9 16 -5 24 0Z" fill={`url(#${ids.blossom})`} />
          <circle cx="7" cy="1" r="4" fill="#fffaf4" />
          <circle cx="7" cy="1" r="1.7" fill={theme.stem} />
        </g>
      ))}
      <circle cx="117" cy="31" r="4" fill={theme.blossomB} opacity={blossomOpacity(stage, 4, 0.8, 0)} />
      <circle cx="44" cy="48" r="4" fill={theme.blossomB} opacity={blossomOpacity(stage, 6, 0.8, 0)} />
    </>
  );
}

function renderBonsai(stage, theme, ids) {
  const canopy = [
    { cx: 74, cy: 58, rx: 22, ry: 16, threshold: 4 },
    { cx: 98, cy: 50, rx: 20, ry: 14, threshold: 5 },
    { cx: 112, cy: 68, rx: 18, ry: 13, threshold: 7 },
    { cx: 58, cy: 78, rx: 18, ry: 13, threshold: 8 }
  ];

  return (
    <>
      <path
        d="M82 126 C82 110 81 94 85 82 C89 70 97 58 111 44"
        fill="none"
        stroke={`url(#${ids.stem})`}
        strokeWidth="7"
        strokeLinecap="round"
        {...revealStrokeProps(stage / 5)}
      />
      <path
        d="M85 92 C68 84 56 74 46 58"
        fill="none"
        stroke={`url(#${ids.stem})`}
        strokeWidth="4.8"
        strokeLinecap="round"
        opacity={blossomOpacity(stage, 3, 0.96, 0)}
        {...revealStrokeProps(Math.max(0, (stage - 2) / 4))}
      />
      <path
        d="M94 74 C108 72 119 66 128 54"
        fill="none"
        stroke={`url(#${ids.stem})`}
        strokeWidth="4.2"
        strokeLinecap="round"
        opacity={blossomOpacity(stage, 5, 0.96, 0)}
        {...revealStrokeProps(Math.max(0, (stage - 4) / 4))}
      />
      {canopy.map((cloud) => (
        <ellipse
          key={`${cloud.cx}-${cloud.cy}`}
          cx={cloud.cx}
          cy={cloud.cy}
          rx={cloud.rx}
          ry={cloud.ry}
          fill={`url(#${ids.leaf})`}
          opacity={blossomOpacity(stage, cloud.threshold, 0.96, 0)}
        />
      ))}
      <circle cx="56" cy="62" r="3.4" fill={theme.blossomA} opacity={blossomOpacity(stage, 9, 0.9, 0)} />
      <circle cx="98" cy="48" r="3.1" fill={theme.blossomA} opacity={blossomOpacity(stage, 10, 0.9, 0)} />
      <circle cx="114" cy="72" r="3.2" fill={theme.blossomA} opacity={blossomOpacity(stage, 11, 0.9, 0)} />
      <path d="M40 128 H120 L112 150 H48 Z" fill="#7d604b" />
      <path d="M48 129 H112" stroke="rgba(255,255,255,0.28)" strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

function renderMoonvine(stage, theme, ids) {
  const stars = [
    { x: 111, y: 44, scale: 1, threshold: 5 },
    { x: 50, y: 55, scale: 0.82, threshold: 7 },
    { x: 97, y: 85, scale: 0.75, threshold: 9 }
  ];

  return (
    <>
      <path
        d="M108 26 C93 18 76 22 65 34 C51 49 50 71 63 86 C75 101 95 106 112 98"
        fill="none"
        stroke="rgba(217, 213, 255, 0.45)"
        strokeWidth="6"
        strokeLinecap="round"
        opacity={blossomOpacity(stage, 5, 1, 0)}
        {...revealStrokeProps(Math.max(0, (stage - 4) / 4))}
      />
      <path
        d="M70 140 C70 122 72 105 80 90 C90 70 103 55 112 42"
        fill="none"
        stroke={`url(#${ids.stem})`}
        strokeWidth="5.6"
        strokeLinecap="round"
        {...revealStrokeProps(stage / 4)}
      />
      <path
        d="M78 120 C64 108 54 100 44 86"
        fill="none"
        stroke={`url(#${ids.stem})`}
        strokeWidth="4"
        strokeLinecap="round"
        opacity={blossomOpacity(stage, 3, 0.88, 0)}
        {...revealStrokeProps(Math.max(0, (stage - 2) / 3))}
      />
      <path
        d="M85 104 C99 96 109 86 117 74"
        fill="none"
        stroke={`url(#${ids.stem})`}
        strokeWidth="4"
        strokeLinecap="round"
        opacity={blossomOpacity(stage, 4, 0.88, 0)}
        {...revealStrokeProps(Math.max(0, (stage - 3) / 3))}
      />
      <ellipse cx="52" cy="84" rx="11" ry="6" fill={theme.leafA} opacity={blossomOpacity(stage, 2, 0.88, 0)} />
      <ellipse cx="115" cy="73" rx="12" ry="7" fill={theme.leafB} opacity={blossomOpacity(stage, 4, 0.88, 0)} />
      <ellipse cx="92" cy="96" rx="11" ry="6" fill={theme.leafB} opacity={blossomOpacity(stage, 6, 0.88, 0)} />
      {stars.map((star) => (
        <g
          key={`${star.x}-${star.y}`}
          transform={`translate(${star.x} ${star.y}) scale(${star.scale})`}
          opacity={blossomOpacity(stage, star.threshold, 1, 0)}
          filter={`url(#${ids.glow})`}
        >
          <path d="M0 -10 L3 -3 L10 0 L3 3 L0 10 L-3 3 L-10 0 L-3 -3 Z" fill={`url(#${ids.blossom})`} />
          <circle r="2" fill="#ffffff" />
        </g>
      ))}
    </>
  );
}

function PlantPreview({ plantType = 'fern', growthStage = 0, size = 'medium', showLabel = false, fullBloom = false }) {
  const theme = THEMES[plantType] || THEMES.fern;
  const plant = getPlantById(plantType);
  const maxGrowthStage = plant.growthTarget || 12;
  const actualStage = fullBloom ? maxGrowthStage : Math.min(Math.max(growthStage || 0, 0), maxGrowthStage);
  const stage = fullBloom ? 12 : Math.min(12, Math.max(0, Math.floor((actualStage / maxGrowthStage) * 12)));
  const scale = size === 'large' ? 1.14 : size === 'small' ? 0.8 : 1;
  const id = useId().replace(/:/g, '');
  const ids = {
    stem: `${id}-stem`,
    leaf: `${id}-leaf`,
    blossom: `${id}-blossom`,
    glow: `${id}-glow`
  };

  const renderPlant = () => {
    switch (plantType) {
      case 'lotus':
        return renderLotus(stage, theme, ids);
      case 'orchid':
        return renderOrchid(stage, theme, ids);
      case 'bonsai':
        return renderBonsai(stage, theme, ids);
      case 'moonvine':
        return renderMoonvine(stage, theme, ids);
      case 'fern':
      default:
        return renderFern(stage, theme, ids);
    }
  };

  return (
    <div className={`plant-preview ${size}`}>
      <svg viewBox="0 0 160 160" className="plant-preview-svg" style={{ transform: `scale(${scale})` }} aria-hidden="true">
        <defs>
          <linearGradient id={ids.stem} x1="56" y1="150" x2="112" y2="18">
            <stop offset="0%" stopColor={theme.stem} />
            <stop offset="100%" stopColor={theme.leafA} />
          </linearGradient>
          <linearGradient id={ids.leaf} x1="22" y1="132" x2="132" y2="32">
            <stop offset="0%" stopColor={theme.leafA} />
            <stop offset="100%" stopColor={theme.leafB} />
          </linearGradient>
          <radialGradient id={ids.blossom} cx="50%" cy="45%" r="58%">
            <stop offset="0%" stopColor={theme.blossomA} />
            <stop offset="100%" stopColor={theme.blossomB} />
          </radialGradient>
          <filter id={ids.glow} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="3.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <ellipse cx="80" cy="144" rx="38" ry="8" fill="rgba(10,51,35,0.08)" />
        <ellipse cx="80" cy="98" rx="46" ry="52" fill={theme.aura} opacity={0.2 + stage * 0.03} />
        {renderPlant()}
      </svg>
      {showLabel && (
        <div className="plant-preview-labels">
          <span>{plant.name}</span>
          <small>Growth {stage}/12</small>
        </div>
      )}
    </div>
  );
}

export default PlantPreview;
