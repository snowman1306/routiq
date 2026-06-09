import React from 'react';
import './GrowthPlant.css';

function GrowthPlant({ completionRate = 0 }) {
  const percentage = Math.min(Math.max(completionRate, 0), 100);

  const getStageName = () => {
    if (percentage < 20) return 'Seedling';
    if (percentage < 40) return 'Sprouting';
    if (percentage < 60) return 'Growing';
    if (percentage < 80) return 'Thriving';
    if (percentage < 95) return 'Flourishing';
    return 'In Bloom';
  };

  return (
    <div className="growth-plant-container">
      <div className="plant-display">
        <svg viewBox="0 0 140 160" className="plant-mark" aria-hidden="true">
          <defs>
            <linearGradient id="plantStem" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#6f8b63" />
              <stop offset="100%" stopColor="#124d39" />
            </linearGradient>
          </defs>
          <path d="M70 136 C70 112 74 88 84 60" stroke="url(#plantStem)" strokeWidth="7" strokeLinecap="round" fill="none" />
          <path d="M83 84 C98 73 108 70 120 72 C112 85 101 93 83 84Z" fill="rgba(18,77,57,0.86)" style={{ opacity: 0.35 + percentage / 160 }} />
          <path d="M82 62 C66 51 52 46 38 48 C46 61 59 70 82 62Z" fill="rgba(111,139,99,0.86)" style={{ opacity: 0.28 + percentage / 170 }} />
          <circle cx="85" cy="58" r={6 + percentage / 18} fill="rgba(214,135,108,0.2)" />
          <circle cx="85" cy="58" r={3 + percentage / 30} fill="#d6876c" />
        </svg>

        <div className="plant-info">
          <h3>{getStageName()}</h3>
          <p>{Math.round(percentage)}% completion rate</p>
        </div>
      </div>

      <div className="progress-bar-container">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${percentage}%` }} />
        </div>
        <div className="progress-labels">
          <span>Early</span>
          <span>In bloom</span>
        </div>
      </div>
    </div>
  );
}

export default GrowthPlant;
