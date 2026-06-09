import React from 'react';
import { 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, format, isSameMonth, parseISO
} from 'date-fns';
import './HabitCalendar.css';

const BOTANICAL_COLORS = {
  moss: '#1f7960',
  sage: '#8ea66f',
  sun: '#ffe5b8'
};

function HabitCalendar({ habit, logs, currentMonth }) {
  // Generate calendar grid dates
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dateFormat = "yyyy-MM-dd";
  const days = eachDayOfInterval({
    start: startDate,
    end: endDate
  });

  // Create a lookup dictionary for logs by date for O(1) access
  const logMap = {};
  logs.forEach(log => {
    // API returns log_date typically as "YYYY-MM-DDT..." or "YYYY-MM-DD"
    const dateKey = log.log_date.split('T')[0];
    logMap[dateKey] = log.completion_percentage;
  });

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="habit-calendar-card">
      <div className="habit-calendar-header">
        <h3 className="habit-calendar-title">{habit.name}</h3>
      </div>
      
      <div className="calendar-grid">
        {weekDays.map((day, idx) => (
          <div key={`header-${idx}`} className="calendar-day-header">{day}</div>
        ))}
        
        {days.map(day => {
          const dateKey = format(day, dateFormat);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const completion = logMap[dateKey] || 0;
          
          // Calculate visual intensity based on completion (0 to 3)
          // 0 = transparent/empty circle
          // 3 = solid moss green
          const hasLog = completion > 0;
          const opacity = hasLog ? 0.4 + (completion / 3) * 0.6 : 0;
          
          return (
            <div 
              key={dateKey} 
              className={`calendar-cell ${!isCurrentMonth ? 'outside-month' : ''}`}
            >
              <div 
                className={`calendar-circle ${hasLog ? 'filled' : 'empty'}`}
                style={{ 
                  backgroundColor: hasLog ? 'var(--color-accent)' : 'transparent',
                  opacity: hasLog ? opacity : 1,
                }}
              >
                <span className="calendar-date-num">{format(day, 'd')}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default HabitCalendar;
