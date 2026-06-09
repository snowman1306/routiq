import React, { useState, useEffect, useRef } from 'react';
import { subMonths, format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../services/api';
import HabitCalendar from '../components/HabitCalendar';
import './Reports.css';

const BOTANICAL_COLORS = {
  moss: '#1f7960',
  sage: '#8ea66f',
  rosy: '#d6876c',
  blush: '#f2d3c8',
  forest: '#0a3323',
  teal: '#105666',
  sun: '#ffe5b8'
};

const MOOD_PALETTE = ['#1f7960', '#6f8b63', '#d6876c', '#105666', '#c9a869', '#8d5d4b'];

const polarPoint = (cx, cy, radius, angle) => ({
  x: cx + radius * Math.cos(angle),
  y: cy + radius * Math.sin(angle)
});

const formatWeekLabel = (dateString) =>
  new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

function Reports() {
  const [currentWeekReport, setCurrentWeekReport] = useState(null);
  const [weeklyComparison, setWeeklyComparison] = useState([]);
  const [allHabits, setAllHabits] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(0);
  const carouselRef = useRef(null);

  const scrollCarousel = (dir) => {
    if (carouselRef.current) {
      const amount = 266; // 250 width + 16 gap
      carouselRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const [currentRes, compareRes, habitsRes, logsRes] = await Promise.all([
        api.get('/reports/weekly'),
        api.get('/reports/weekly/compare?weeks=4'),
        api.get('/habits'),
        api.get('/logs')
      ]);

      setCurrentWeekReport(currentRes.data);
      setWeeklyComparison(compareRes.data);
      setAllHabits(habitsRes.data);
      setAllLogs(logsRes.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="reports-loading">Consulting the Apothecary Archives...</div>;
  }

  if (!currentWeekReport) {
    return (
      <div className="reports-page">
        <div className="reports-width">
          <h1>Weekly Archives</h1>
          <div className="no-data">Your journal remains blank. Begin your sequences to see them bloom here.</div>
        </div>
      </div>
    );
  }

  const selectedReport = weeklyComparison[selectedWeek] || currentWeekReport;
  const totalHabits = Math.max(selectedReport.total_habits || 0, 1);
  const weeklyIntensity = Math.round(((selectedReport.total_completions || 0) / (totalHabits * 7)) * 100) || 0;

  const BloomChart = ({ data }) => {
    if (!data || data.length === 0) {
      return <div className="chart-empty">No sequences recorded for this archive.</div>;
    }

    const centerX = 210;
    const centerY = 205;
    const baseRadius = 56;

    return (
      <svg width="100%" height="100%" viewBox="0 0 420 420" className="premium-chart-svg">
        <defs>
          <radialGradient id="bloomAura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.42)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <linearGradient id="petalFill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={BOTANICAL_COLORS.rosy} />
            <stop offset="55%" stopColor={BOTANICAL_COLORS.sun} />
            <stop offset="100%" stopColor={BOTANICAL_COLORS.sage} />
          </linearGradient>
        </defs>

        <circle cx={centerX} cy={centerY} r="150" fill="url(#bloomAura)" />

        {data.map((item, index) => {
          const angle = -Math.PI / 2 + (index / data.length) * Math.PI * 2;
          const consistency = item.consistency || 0;
          const outerRadius = 118 + consistency * 0.8;
          const leftBase = polarPoint(centerX, centerY, baseRadius, angle - 0.18);
          const rightBase = polarPoint(centerX, centerY, baseRadius, angle + 0.18);
          const tip = polarPoint(centerX, centerY, outerRadius, angle);
          const leftControl = polarPoint(centerX, centerY, outerRadius * 0.72, angle - 0.2);
          const rightControl = polarPoint(centerX, centerY, outerRadius * 0.72, angle + 0.2);
          const labelPoint = polarPoint(centerX, centerY, outerRadius + 28, angle);
          const petalPath = `
            M ${leftBase.x} ${leftBase.y}
            Q ${leftControl.x} ${leftControl.y} ${tip.x} ${tip.y}
            Q ${rightControl.x} ${rightControl.y} ${rightBase.x} ${rightBase.y}
            Q ${centerX} ${centerY} ${leftBase.x} ${leftBase.y}
          `;

          return (
            <g key={item.name}>
              <path
                d={petalPath}
                fill="url(#petalFill)"
                opacity={0.24 + consistency / 160}
                stroke="rgba(18,77,57,0.12)"
                strokeWidth="1.2"
              />
              <circle cx={tip.x} cy={tip.y} r={5 + consistency / 32} fill={BOTANICAL_COLORS.moss} opacity="0.85" />
              <text x={labelPoint.x} y={labelPoint.y} textAnchor="middle" className="chart-label">{item.name}</text>
              <text x={labelPoint.x} y={labelPoint.y + 16} textAnchor="middle" className="chart-value">{consistency}%</text>
            </g>
          );
        })}

        <circle cx={centerX} cy={centerY} r="46" className="bloom-core" />
        <text x={centerX} y={centerY - 4} textAnchor="middle" className="chart-center-label">Mastery</text>
        <text x={centerX} y={centerY + 24} textAnchor="middle" className="chart-center-value">{weeklyIntensity}%</text>
      </svg>
    );
  };

  const MoodRibbonChart = ({ distribution }) => {
    if (!distribution || distribution.length === 0) {
      return <div className="chart-empty">No emotional notes logged.</div>;
    }

    const maxValue = Math.max(...distribution.map((item) => item.value), 1);
    const barWidth = 52;
    const gap = 18;
    const viewWidth = Math.max(420, 32 + distribution.length * (barWidth + gap));

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${viewWidth} 320`} className="premium-chart-svg">
        {distribution.map((item, index) => {
          const x = 32 + index * (barWidth + gap);
          const height = 88 + (item.value / maxValue) * 112;
          const y = 228 - height;
          const color = MOOD_PALETTE[index % MOOD_PALETTE.length];

          return (
            <g key={item.name}>
              <rect x={x} y={y} width={barWidth} height={height} rx="26" fill={color} opacity={0.18 + item.value / (maxValue * 1.4)} />
              <circle cx={x + barWidth / 2} cy={y + 18} r="8" fill={color} opacity="0.8" />
              <text x={x + barWidth / 2} y="270" textAnchor="middle" className="chart-label">{item.name}</text>
              <text x={x + barWidth / 2} y="288" textAnchor="middle" className="chart-value">{item.value}</text>
            </g>
          );
        })}
      </svg>
    );
  };

  const DayHeatmapChart = ({ logs }) => {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const idxMap = [1, 2, 3, 4, 5, 6, 0]; // JS Day indices to order Mon-Sun
    
    const metrics = idxMap.map(idx => {
      const dayLogs = logs.filter(l => new Date(l.log_date).getDay() === idx);
      const sum = dayLogs.reduce((acc, log) => acc + (log.completion_percentage || 0), 0);
      const maxPossible = dayLogs.length > 0 ? dayLogs.length * 3 : 1;
      const avg = dayLogs.length > 0 ? sum / maxPossible : 0;
      return avg;
    });

    return (
      <div className="day-heatmap-container">
        {labels.map((label, i) => (
          <div className="heatmap-day" key={label}>
            <div 
              className="heat-block" 
              style={{ 
                height: `${Math.max(10, metrics[i] * 100)}%`, 
                opacity: 0.2 + metrics[i] * 0.8 
              }} 
            />
            <span>{label}</span>
          </div>
        ))}
      </div>
    );
  };

  const StressCorrelationChart = ({ weeks }) => {
    if (!weeks || weeks.length === 0) return null;
    
    const width = 420;
    const height = 220;
    const padding = 38;
    const base = 165;
    
    // Data normalized from oldest to newest
    const sortedWeeks = [...weeks].reverse();
    
    const maxCompletions = Math.max(...sortedWeeks.map(w => w.total_completions || 0), 1);
    const step = sortedWeeks.length > 1 ? (width - padding * 2) / (sortedWeeks.length - 1) : 0;
    
    const points = sortedWeeks.map((w, index) => {
      const x = padding + step * index;
      // Convert completion and stress to Y coordinate percentages
      // Comps are green path. Stress is orange overlay line.
      const cVal = w.total_completions || 0;
      const sVal = w.average_stress || 0;
      
      return {
        x,
        cY: base - (cVal / maxCompletions) * 100,
        sY: base - (sVal / 5) * 100,
        label: formatWeekLabel(w.week_start)
      };
    });

    const compPath = points.map((p, i) => `${i===0?'M':'L'} ${p.x} ${p.cY}`).join(' ');
    const stressPath = points.map((p, i) => `${i===0?'M':'L'} ${p.x} ${p.sY}`).join(' ');

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="premium-chart-svg">
        <defs>
          <linearGradient id="cGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(31,121,96,0.18)" />
            <stop offset="100%" stopColor="rgba(31,121,96,0)" />
          </linearGradient>
        </defs>
        {/* Area for Completions */}
        <path d={`${compPath} L ${points[points.length-1].x} ${base} L ${points[0].x} ${base} Z`} fill="url(#cGradient)" />
        
        {/* Line for Completions */}
        <path d={compPath} fill="none" stroke={BOTANICAL_COLORS.moss} strokeWidth="3" strokeLinecap="round" />
        {/* Line for Stress */}
        <path d={stressPath} fill="none" stroke={BOTANICAL_COLORS.rosy} strokeWidth="2.5" strokeDasharray="4 2" strokeLinecap="round" />
        
        {points.map(p => (
          <g key={p.label}>
            <circle cx={p.x} cy={p.cY} r="5" fill={BOTANICAL_COLORS.moss} />
            <circle cx={p.x} cy={p.sY} r="4" fill="#fff" stroke={BOTANICAL_COLORS.rosy} strokeWidth="2" />
            <text x={p.x} y={194} textAnchor="middle" className="chart-label">{p.label}</text>
          </g>
        ))}
      </svg>
    );
  };

  // Derive Reflection Logs (filter those with notes)
  const reflectionLogs = allLogs
    .filter(l => l.notes && l.notes.trim().length > 0)
    .sort((a, b) => new Date(b.log_date) - new Date(a.log_date));

  const totalMilestones = allHabits.reduce((acc, h) => acc + (h.milestones_achieved || 0), 0);

  return (
    <div className="reports-page">
      <div className="reports-width">
        <div className="reports-header">
          <div className="header-left">
            <span className="reports-kicker">Weekly archive</span>
            <h1>Registry Review</h1>
            <p className="reports-subtitle">A botanical distillation of your weekly evolution.</p>
          </div>
          <div className="week-selector">
            {weeklyComparison.map((week, index) => (
              <button
                key={week.week_start || index}
                onClick={() => setSelectedWeek(index)}
                className={`week-btn ${selectedWeek === index ? 'active' : ''}`}
              >
                {formatWeekLabel(week.week_start)}
              </button>
            ))}
          </div>
        </div>

        <div className="reports-summary">
          <div className="summary-card">
            <h3>Sequences Active</h3>
            <p className="summary-value">{selectedReport.total_habits}</p>
          </div>
          <div className="summary-card">
            <h3>Stable Routines</h3>
            <p className="summary-value">{selectedReport.consistent_habits}</p>
          </div>
          <div className="summary-card">
            <h3>Milestones Reached</h3>
            <p className="summary-value">{totalMilestones}</p>
          </div>
          <div className="summary-card">
            <h3>Avg. Stress Load</h3>
            <p className="summary-value">{selectedReport.average_stress || 'N/A'}</p>
          </div>
          <div className="summary-card">
            <h3>Dominant Tone</h3>
            <p className="summary-value mood-value">{selectedReport.average_mood || 'N/A'}</p>
          </div>
        </div>

        <div className="charts-section">
          <div className="chart-card chart-card-bloom">
            <div className="chart-heading">
              <span className="chart-kicker">Habit Consistency Matrix</span>
              <h2>Mastery Bloom</h2>
              <p className="chart-description">Visualizes per-habit activity and determines which routines are stable or fragile.</p>
            </div>
            <div className="svg-chart-container">
              <BloomChart data={selectedReport.habit_completion_data} />
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-heading">
              <span className="chart-kicker">Frequency Heatmap</span>
              <h2>Day-of-Week Weight</h2>
              <p className="chart-description">Aggregates completion intensity across Mon-Sun to identify naturally strong weekdays.</p>
            </div>
            <div className="svg-chart-container compact">
              <DayHeatmapChart logs={allLogs} />
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-heading">
              <span className="chart-kicker">Stress vs. Completion Correlation</span>
              <h2>Stress Trend Curve</h2>
              <p className="chart-description">Correlates execution frequency against internal stress loads to spot fatigue interference.</p>
            </div>
            <div className="svg-chart-container compact">
              <StressCorrelationChart weeks={weeklyComparison} />
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', marginTop: '-10px' }}>
              <span style={{ color: BOTANICAL_COLORS.moss }}>- Completions</span>
              <span style={{ color: BOTANICAL_COLORS.rosy }}>-- Stress Level</span>
            </div>
          </div>

          <div className="chart-card full-width-chart">
             <div className="chart-heading">
              <span className="chart-kicker">Emotional Spectrum</span>
              <h2>Mood Distribution Chart</h2>
              <p className="chart-description">Tracks the dynamic spread of emotional tones recorded alongside your archives.</p>
            </div>
            <div className="svg-chart-container compact" style={{ minHeight: '16rem' }}>
              <MoodRibbonChart distribution={selectedReport.mood_distribution} />
            </div>
          </div>
        </div>

        <div className="reports-bottom-section">
          <div className="habits-breakdown">
            <div className="breakdown-heading">
              <span className="reports-kicker">Plant Growth Indicators</span>
              <h2>Sequence Health</h2>
            </div>
            <div className="habits-list" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
              {Object.entries(selectedReport.habit_stats || {}).map(([id, stats]) => {
                const mastery = stats.totalDays > 0 ? Math.round((stats.completions / stats.totalDays) * 100) : 0;
                return (
                  <div key={id} className="habit-breakdown-card">
                    <h3>{stats.name}</h3>
                    <div className="breakdown-stats">
                      <span>{stats.completions} executions</span>
                      <span>{mastery}% consistency</span>
                    </div>
                    <div className="mini-meter"><i style={{ width: `${mastery}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="calendar-section">
            <div className="breakdown-heading">
              <span className="reports-kicker">Intensity Grid</span>
              <h2 style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                Logs
                <select 
                  className="month-selector"
                  value={format(calendarMonth, 'yyyy-MM')}
                  onChange={(e) => {
                    const [year, month] = e.target.value.split('-');
                    const newDate = new Date();
                    newDate.setFullYear(parseInt(year), parseInt(month) - 1, 1);
                    setCalendarMonth(newDate);
                  }}
                >
                  {[0, 1, 2, 3, 4].map(offset => {
                    const d = subMonths(new Date(), offset);
                    return <option key={offset} value={format(d, 'yyyy-MM')}>{format(d, 'MMM yy')}</option>;
                  })}
                </select>
              </h2>
            </div>
            
            <div className="carousel-container">
              {allHabits.length > 1 && (
                <>
                  <button className="carousel-nav-btn left" onClick={() => scrollCarousel('left')} aria-label="Previous habit">
                    <ChevronLeft size={16} />
                  </button>
                  <button className="carousel-nav-btn right" onClick={() => scrollCarousel('right')} aria-label="Next habit">
                    <ChevronRight size={16} />
                  </button>
                </>
              )}
              <div className="calendar-carousel" ref={carouselRef}>
                {allHabits.length > 0 ? allHabits.map(habit => (
                  <HabitCalendar 
                    key={habit.id}
                    habit={habit}
                    logs={allLogs.filter(log => log.habit_id === habit.id)}
                    currentMonth={calendarMonth}
                  />
                )) : (
                  <div className="chart-empty">No habits defined.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* NEW: Notes Reflection View */}
        <div className="reports-full-section">
          <div className="breakdown-heading">
            <span className="reports-kicker">Qualitative Archive</span>
            <h2>Notes Reflection Feed</h2>
          </div>
          {reflectionLogs.length > 0 ? (
            <div className="reflections-grid">
              {reflectionLogs.slice(0, 6).map((log, i) => {
                const habitName = allHabits.find(h => h.id === log.habit_id)?.name || 'General Log';
                return (
                  <div className="reflection-card" key={i}>
                    <div className="reflection-header">
                      <span className="reflection-date">{new Date(log.log_date).toLocaleDateString()}</span>
                      <span className="reflection-habit">{habitName}</span>
                    </div>
                    <p className="reflection-text">"{log.notes}"</p>
                    <div className="reflection-metadata">
                      {log.mood && <span>Mood: {log.mood}</span>}
                      {log.stress_level && <span>Stress: {log.stress_level}/5</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="no-data">No written reflections archived yet. Add notes while logging your habits to see them here.</div>
          )}
        </div>

      </div>
    </div>
  );
}

export default Reports;
