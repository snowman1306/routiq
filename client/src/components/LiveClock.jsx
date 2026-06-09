import React, { useEffect, useState } from 'react';
import './LiveClock.css';

function LiveClock({ compact = false }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={`live-clock ${compact ? 'compact' : ''}`}>
      <span className="clock-time">
        {now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: compact ? undefined : '2-digit'
        })}
      </span>
      <span className="clock-date">
        {now.toLocaleDateString('en-US', {
          weekday: compact ? undefined : 'short',
          month: 'short',
          day: 'numeric'
        })}
      </span>
    </div>
  );
}

export default LiveClock;
