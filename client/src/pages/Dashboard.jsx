import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import TreeModel from '../components/TreeModel';
import PlantPreview from '../components/PlantPreview';
import { getPlantById } from '../constants/plants';
import { Plus } from 'lucide-react';
import './Dashboard.css';

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function Dashboard() {
  const { user } = useAuth();
  const [habits, setHabits] = useState([]);
  const [stats, setStats] = useState({
    totalHabits: 0,
    activeHabits: 0,
    todayLogged: 0,
    todayLoggedHabits: new Set(),
    todayCompletions: 0,
    streak: 0,
    completionRate: 0,
    daysCompleted: 0,
    totalCompletions: 0,
    allHabitsCompletedToday: false
  });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [gardenSummary, setGardenSummary] = useState(null);
  const [defaultFeaturedHabit, setDefaultFeaturedHabit] = useState(null);
  const [selectedFeaturedHabitId, setSelectedFeaturedHabitId] = useState(null);

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    try {
      const [habitsRes, logsRes, gardenRes] = await Promise.all([
        api.get('/habits'),
        api.get('/logs'),
        api.get('/garden')
      ]);

      const allHabits = habitsRes.data;
      const activeHabits = allHabits.filter(h => h.is_active);
      const spotlightHabit = [...activeHabits].sort((a, b) => {
        const aTarget = getPlantById(a.selected_plant_type || 'fern').growthTarget || 12;
        const bTarget = getPlantById(b.selected_plant_type || 'fern').growthTarget || 12;
        const aProgress = (a.growth_stage || 0) / aTarget;
        const bProgress = (b.growth_stage || 0) / bTarget;

        return bProgress - aProgress || (b.growth_stage || 0) - (a.growth_stage || 0);
      })[0] || null;
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      
      const todayLogs = logsRes.data.filter(log => {
        if (!log.log_date) return false;
        const d = new Date(log.log_date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === todayDate.getTime();
      });
      const todayLoggedHabits = new Set(todayLogs.map(log => String(log.habit_id)));
      
      const todayCompletedHabits = todayLogs.filter(log => log.completion_percentage === 3);
      const allHabitsCompletedToday = activeHabits.length > 0 && 
        todayCompletedHabits.length === activeHabits.length;

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentLogs = logsRes.data.filter(log => {
        const logDate = new Date(log.log_date);
        return logDate >= sevenDaysAgo && log.completion_percentage > 0;
      });
      
      const recentCompletionsCount = recentLogs.length;
      const totalPossible = activeHabits.length * 7;
      const completionRate = totalPossible > 0 ? (recentCompletionsCount / totalPossible) * 100 : 0;
      
      const uniqueDays = new Set(recentLogs.map(log => {
        if (!log.log_date) return '';
        const d = new Date(log.log_date);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      }));
      const daysCompleted = uniqueDays.size;
      const totalCompletions = logsRes.data.filter(log => log.completion_percentage === 3).length;

      setHabits(activeHabits);
      setDefaultFeaturedHabit(spotlightHabit);
      setGardenSummary(gardenRes.data);
      setStats({
        totalHabits: allHabits.length,
        activeHabits: activeHabits.length,
        todayLogged: todayLoggedHabits.size,
        todayLoggedHabits: todayLoggedHabits,
        todayCompletions: todayCompletedHabits.length,
        streak: Math.max(...allHabits.map(h => h.consecutive_days || 0), 0),
        completionRate: Math.min(completionRate, 100),
        daysCompleted,
        totalCompletions,
        allHabitsCompletedToday
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'A New Dawn';
    if (hour < 18) return 'A Quiet Afternoon';
    return 'A Serene Evening';
  };

  const getBotanicalQuote = () => {
    const quotes = [
      "The forest grows in quiet whispers.",
      "Each small drop nourishes the root.",
      "Patience is the gardener's greatest gift.",
      "Bloom at your own natural pace.",
      "Deep roots withstand the turning season."
    ];
    return quotes[Math.floor(stats.completionRate / 20) % quotes.length];
  };

  const featuredHabit = selectedFeaturedHabitId
    ? habits.find(h => h.id === selectedFeaturedHabitId) || defaultFeaturedHabit
    : defaultFeaturedHabit;

  const featuredGrowthTarget = featuredHabit
    ? (getPlantById(featuredHabit.selected_plant_type || 'fern').growthTarget || 12)
    : 12;
  const featuredPlantProgress = featuredHabit
    ? Math.min(100, ((featuredHabit.growth_stage || 0) / featuredGrowthTarget) * 100)
    : stats.completionRate;

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loader"></div>
        <p>Consulting the Botanical Logs...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-premium">
      <div className="dashboard-width">
        <div className="dashboard-header-premium">
          <div className="header-left">
            <span className="dashboard-kicker">Daily atmosphere</span>
            <h1 className="greeting-serif">{getGreeting()}, {user?.username}</h1>
            <p className="motivational-italic">"{getBotanicalQuote()}"</p>
            <div className="date-display">
              <span>{currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
            </div>
            <div className="header-note">
              <strong>{stats.todayLogged}/{stats.activeHabits}</strong>
              <span>Sequences logged today</span>
            </div>
          </div>
          <div className="header-right">
            <div className="dashboard-signal-card">
              <span className="signal-label">Today&apos;s signal</span>
              <strong>{stats.allHabitsCompletedToday ? 'Fully in bloom' : 'Still unfolding'}</strong>
              <p>
                {stats.allHabitsCompletedToday
                  ? 'Every active ritual has been completed today.'
                  : 'There is still room to turn today into a clean, intentional close.'}
              </p>
            </div>
            <Link to="/habits/new" className="btn-add-premium">
              <Plus size={18} />
              <span>Plant Sequence</span>
            </Link>
          </div>
        </div>

        <div className="stats-row-premium">
          <div className="stat-card-premium">
            <span className="stat-label">Total Blooms</span>
            <span className="stat-value-serif">{stats.totalCompletions}</span>
          </div>
          <div className="stat-card-premium">
            <span className="stat-label">Longest Vine</span>
            <span className="stat-value-serif">{stats.streak}</span>
          </div>
          <div className="stat-card-premium">
            <span className="stat-label">Active Seeds</span>
            <span className="stat-value-serif">{stats.activeHabits}</span>
          </div>
          <div className="stat-card-premium">
            <span className="stat-label">7-Day Rate</span>
            <span className="stat-value-serif">{Math.round(stats.completionRate)}%</span>
          </div>
        </div>

        <div className="content-grid-premium">
          <div className="tree-section-premium">
            <div className="section-title-premium">
              <div>
                <span className="section-kicker">Living model</span>
                <h2 className="title-serif">The Arboretum</h2>
              </div>
              <span className="completion-percentage">{Math.round(featuredPlantProgress)}%</span>
            </div>
            
            {habits.length > 1 && (
              <div className="arboretum-tabs">
                {habits.map(habit => (
                  <button
                    key={habit.id}
                    className={`arboretum-tab ${featuredHabit?.id === habit.id ? 'active' : ''}`}
                    onClick={() => setSelectedFeaturedHabitId(habit.id)}
                  >
                    {habit.name}
                  </button>
                ))}
              </div>
            )}
            
            <div className="tree-container-premium">
              <TreeModel
                completionRate={featuredPlantProgress}
                plantType={featuredHabit?.selected_plant_type}
                growthStage={featuredHabit?.growth_stage}
              />
            </div>
            {featuredHabit && (
              <div className="featured-plant-strip">
                <PlantPreview
                  plantType={featuredHabit.selected_plant_type}
                  growthStage={featuredHabit.growth_stage}
                  showLabel
                />
                <div className="featured-plant-copy">
                  <span className="section-kicker">Spotlight plant</span>
                  <h3>{featuredHabit.name}</h3>
                  <p>{featuredHabit.current_goal || 'No active milestone goal set yet.'}</p>
                </div>
              </div>
            )}
          </div>

          <div className="habits-section-premium">
            <div className="section-title-premium">
              <div>
                <span className="section-kicker">Current registry</span>
                <h2 className="title-serif">Sequence Registry</h2>
              </div>
              <Link to="/habits" className="view-all-link">Review All</Link>
            </div>

            <div className="habits-list-premium">
              {habits.length > 0 ? (
                habits.slice(0, 5).map(habit => (
                  <div key={habit.id} className="habit-item-premium">
                    <div className="habit-content">
                      <h3 className="habit-title-serif">{habit.name}</h3>
                      <div className="habit-meta">
                        <span>{habit.consecutive_days || 0} day sequence</span>
                        {stats.todayLoggedHabits && stats.todayLoggedHabits.has(String(habit.id)) ? (
                          <span className="log-link logged">Archived Today</span>
                        ) : (
                          <Link to={`/habits/${habit.id}/log`} className="log-link">Archive Progress</Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state-premium">
                  <p>No sequences have been planted yet.</p>
                  <Link to="/habits/new" className="btn-add-premium">Begin your registry</Link>
                </div>
              )}
            </div>
            <div className="dashboard-garden-preview">
              <div className="section-title-premium compact">
                <div>
                  <span className="section-kicker">Garden archive</span>
                  <h2 className="title-serif">Grown thus far</h2>
                </div>
                <Link to="/garden" className="view-all-link">Open Garden</Link>
              </div>
              <div className="garden-preview-row">
                {(gardenSummary?.garden_plants || []).slice(0, 3).map((plant) => (
                  <div key={plant.id} className="garden-preview-card">
                    <PlantPreview plantType={plant.plant_type} growthStage={12} fullBloom />
                    <span>{plant.habit_name}</span>
                  </div>
                ))}
                {(!gardenSummary?.garden_plants || gardenSummary.garden_plants.length === 0) && (
                  <div className="garden-preview-empty">
                    Complete milestone cycles and your finished plants will collect here.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
