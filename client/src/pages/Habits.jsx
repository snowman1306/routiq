import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Plus, Trash2, Check, Pencil } from 'lucide-react';
import PlantPreview from '../components/PlantPreview';
import { getPlantById } from '../constants/plants';
import './Habits.css';

function Habits() {
  const [habits, setHabits] = useState([]);
  const [gardenSummary, setGardenSummary] = useState(null);
  const [plantCatalog, setPlantCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [milestoneHabit, setMilestoneHabit] = useState(null);
  const [replantHabit, setReplantHabit] = useState(null);
  const [editHabit, setEditHabit] = useState(null);
  const [milestoneForm, setMilestoneForm] = useState({
    next_goal: '',
    next_reward: '',
    goal_window_days: 1,
    habit_time: '08:00',
    selected_plant_type: 'fern'
  });
  const [replantForm, setReplantForm] = useState({
    selected_plant_type: 'fern'
  });
  const [editForm, setEditForm] = useState({
    current_goal: '',
    current_reward: '',
    goal_window_days: 1,
    habit_time: '08:00',
    what_motivating: '',
    whom_tell: '',
    who_inspires: '',
    selected_plant_type: 'fern'
  });
  const [submittingMilestone, setSubmittingMilestone] = useState(false);
  const [submittingReplant, setSubmittingReplant] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [completionCelebration, setCompletionCelebration] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();

    const onCreated = (e) => {
      const newHabit = e.detail;
      setHabits((prev) => [newHabit, ...prev]);
    };

    const onUpdated = (e) => {
      const updated = e.detail;
      setHabits((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
    };

    window.addEventListener('habit:created', onCreated);
    window.addEventListener('habit:updated', onUpdated);

    return () => {
      window.removeEventListener('habit:created', onCreated);
      window.removeEventListener('habit:updated', onUpdated);
    };
  }, []);

  const fetchData = async () => {
    try {
      const [habitsResponse, gardenResponse, plantCatalogResponse] = await Promise.all([
        api.get('/habits'),
        api.get('/garden'),
        api.get('/habits/plant-catalog')
      ]);
      setHabits(habitsResponse.data);
      setGardenSummary(gardenResponse.data);
      setPlantCatalog(plantCatalogResponse.data.catalog || []);
    } catch (error) {
      console.error('Error fetching habits:', error);
    } finally {
      setLoading(false);
    }
  };

  const milestoneStats = useMemo(() => {
    const totalMilestones = habits.reduce((sum, habit) => sum + (habit.milestones_achieved || 0), 0);
    const activeGoals = habits.filter((habit) => habit.current_goal).length;

    return {
      totalMilestones,
      activeGoals
    };
  }, [habits]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you wish to remove this sequence from your registry?')) return;

    try {
      await api.delete(`/habits/${id}`);
      fetchData();
    } catch (error) {
      console.error('Error deleting habit:', error);
      alert('Error removing sequence');
    }
  };

  const openMilestoneModal = (habit) => {
    setMilestoneHabit(habit);
    setMilestoneForm({
      next_goal: habit.current_goal || '',
      next_reward: habit.current_reward || '',
      goal_window_days: habit.goal_window_days || 1,
      habit_time: habit.habit_time ? habit.habit_time.slice(0, 5) : '08:00',
      selected_plant_type: habit.selected_plant_type || 'fern'
    });
  };

  const openReplantModal = (habit) => {
    setReplantHabit(habit);
    setReplantForm({
      selected_plant_type: habit.selected_plant_type || 'fern'
    });
  };

  const openEditModal = (habit) => {
    setEditHabit(habit);
    setEditForm({
      current_goal: habit.current_goal || '',
      current_reward: habit.current_reward || '',
      goal_window_days: habit.goal_window_days || 1,
      habit_time: habit.habit_time ? habit.habit_time.slice(0, 5) : '08:00',
      what_motivating: habit.what_motivating || '',
      whom_tell: habit.whom_tell || '',
      who_inspires: habit.who_inspires || '',
      selected_plant_type: habit.selected_plant_type || 'fern'
    });
  };

  const handleMilestoneComplete = async (e) => {
    e.preventDefault();
    if (!milestoneHabit) return;

    setSubmittingMilestone(true);
    try {
      const response = await api.post(`/habits/${milestoneHabit.id}/complete-milestone`, milestoneForm);
      if (response.data?.plant_catalog) {
        setPlantCatalog(response.data.plant_catalog);
      }
      if (response.data?.fully_grown) {
        setCompletionCelebration({
          habitName: response.data.habit_name,
          completedPlantType: response.data.completed_plant_type,
          nextPlantType: response.data.next_plant_type,
          rewardClaimed: response.data.reward_claimed,
          newlyUnlockedPlants: response.data.newly_unlocked_plants || []
        });
      }
      setMilestoneHabit(null);
      await fetchData();
    } catch (error) {
      console.error('Error completing milestone:', error);
      alert(error.response?.data?.error || 'Error updating milestone');
    } finally {
      setSubmittingMilestone(false);
    }
  };

  const handleReplantSubmit = async (e) => {
    e.preventDefault();
    if (!replantHabit) return;

    setSubmittingReplant(true);
    try {
      const response = await api.post(`/habits/${replantHabit.id}/replant`, replantForm);
      if (response.data?.plant_catalog) {
        setPlantCatalog(response.data.plant_catalog);
      }
      if (response.data?.fully_grown) {
        setCompletionCelebration({
          habitName: response.data.habit_name,
          completedPlantType: response.data.completed_plant_type,
          nextPlantType: response.data.next_plant_type,
          rewardClaimed: null,
          newlyUnlockedPlants: response.data.newly_unlocked_plants || []
        });
      }
      setReplantHabit(null);
      await fetchData();
    } catch (error) {
      console.error('Error replanting:', error);
      alert(error.response?.data?.error || 'Error replanting');
    } finally {
      setSubmittingReplant(false);
    }
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editHabit) return;

    setSavingEdit(true);
    try {
      await api.put(`/habits/${editHabit.id}`, {
        ...editForm,
        reset_goal_window: true
      });
      setEditHabit(null);
      await fetchData();
    } catch (error) {
      console.error('Error updating habit:', error);
      alert(error.response?.data?.error || 'Error updating habit');
    } finally {
      setSavingEdit(false);
    }
  };

  const getProjectedPlantCount = (habit) => {
    const currentCount = gardenSummary?.plants_fully_grown || 0;
    if (!habit) {
      return currentCount;
    }

    const now = new Date();
    const achievedInWindow = !habit.current_goal_due_at || new Date(habit.current_goal_due_at) >= now;
    const growthIncrease = achievedInWindow ? 3 : 1;
    const growthTarget = getPlantById(habit.selected_plant_type || 'fern').growthTarget || 12;
    const completesPlant = (habit.growth_stage || 0) + growthIncrease >= growthTarget;

    return currentCount + (completesPlant ? 1 : 0);
  };

  const projectedPlantCount = milestoneHabit ? getProjectedPlantCount(milestoneHabit) : (gardenSummary?.plants_fully_grown || 0);

  const getVisualGrowthStage = (habit) => {
    const growthTarget = getPlantById(habit.selected_plant_type || 'fern').growthTarget || 12;
    return Math.min(growthTarget, Math.max(0, habit.growth_stage || 0));
  };

  const isLoggedToday = (habit) => {
    if (!habit.last_completed_at) return false;
    const lastDate = new Date(habit.last_completed_at);
    const today = new Date();
    lastDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return lastDate.getTime() === today.getTime();
  };

  const isMilestoneAvailable = (habit) => {
    if (!habit.current_goal_due_at) return false;
    const dueDate = new Date(habit.current_goal_due_at);
    const today = new Date();
    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return dueDate.getTime() === today.getTime();
  };

  if (loading) {
    return (
      <div className="habits-loading">
        <p>Retrieving your Sequence Registry...</p>
      </div>
    );
  }

  return (
    <div className="habits-page">
      <div className="habits-header">
        <div className="header-left">
          <span className="eyebrow">Habit registry</span>
          <h1>Sequence Registry</h1>
          <p className="habits-subtitle">
            Every habit now carries its own plant, milestone window, accountability person, reward, and current growth state.
          </p>
        </div>
        <button onClick={() => navigate('/habits/new')} className="add-habit-btn">
          <Plus size={20} />
          <span>New Sequence</span>
        </button>
      </div>

      <div className="registry-summary-grid">
        <div className="registry-summary-card">
          <span>Milestones achieved</span>
          <strong>{milestoneStats.totalMilestones}</strong>
        </div>
        <div className="registry-summary-card">
          <span>Active goal windows</span>
          <strong>{milestoneStats.activeGoals}</strong>
        </div>
        <div className="registry-summary-card">
          <span>Plants fully grown</span>
          <strong>{gardenSummary?.plants_fully_grown || 0}</strong>
        </div>
      </div>

      <div className="habits-grid">
        {habits.length === 0 ? (
          <div className="empty-state">
            <p>Your registry remains unwritten.</p>
            <button onClick={() => navigate('/habits/new')} className="add-habit-btn">
              <Plus size={16} />
              <span>Begin Your Catalog</span>
            </button>
          </div>
        ) : (
          habits.map((habit) => (
            <div key={habit.id} className={`habit-card ${!habit.is_active ? 'inactive' : ''}`}>
              <div className="habit-card-top">
                <PlantPreview plantType={habit.selected_plant_type} growthStage={habit.growth_stage} showLabel />
                <div className="habit-header">
                  <h3>{habit.name}</h3>
                  {habit.description && <p className="habit-description">{habit.description}</p>}
                </div>
              </div>

              <div className="habit-stats">
                <span className="habit-stat-chip">{habit.consecutive_days || 0} Day Sequence</span>
                <span className="habit-stat-chip">{habit.total_completions || 0} Successful Archivals</span>
                <span className="habit-stat-chip">{habit.milestones_achieved || 0} Milestones Achieved</span>
                <span className="habit-stat-chip">{habit.fully_grown_count || 0} Plants Fully Grown</span>
                <span className="habit-stat-chip">Growth {getVisualGrowthStage(habit)}/{getPlantById(habit.selected_plant_type || 'fern').growthTarget || 12}</span>
              </div>

              <div className="habit-detail-grid">
                <div className="habit-detail-card">
                  <span>Current goal</span>
                  <strong>{habit.current_goal || 'No active goal set'}</strong>
                </div>
                <div className="habit-detail-card">
                  <span>Reward</span>
                  <strong>{habit.current_reward || 'No reward set'}</strong>
                </div>
                <div className="habit-detail-card">
                  <span>Accountability</span>
                  <strong>{habit.whom_tell || 'No monitor assigned'}</strong>
                </div>
                <div className="habit-detail-card">
                  <span>Motivation</span>
                  <strong>{habit.what_motivating || 'No motivation note yet'}</strong>
                </div>
              </div>

              <div className="habit-meta-strip">
                <span>Reminder at {habit.habit_time ? habit.habit_time.slice(0, 5) : 'not set'}</span>
                <span>{habit.goal_window_days || 1}-day goal window</span>
                <span>
                  Due {habit.current_goal_due_at ? new Date(habit.current_goal_due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'soon'}
                </span>
              </div>

              <div className="habit-actions">
                {isLoggedToday(habit) ? (
                  <span className="action-btn log logged">
                    Archived Today
                  </span>
                ) : (
                  <Link to={`/habits/${habit.id}/log`} className="action-btn log">
                    Archive Progress
                  </Link>
                )}
                {getVisualGrowthStage(habit) >= (getPlantById(habit.selected_plant_type || 'fern').growthTarget || 12) && (
                  <button onClick={() => openReplantModal(habit)} className="action-btn replant">
                    <Check size={16} />
                    Plant New Seed
                  </button>
                )}
                <button
                  onClick={() => openMilestoneModal(habit)}
                  className="action-btn milestone"
                  disabled={!isMilestoneAvailable(habit)}
                  title={!isMilestoneAvailable(habit) ? 'Milestone can only be claimed on its due date' : ''}
                >
                  Milestone Achieved
                </button>
                <button onClick={() => openEditModal(habit)} className="action-btn edit">
                  <Pencil size={16} />
                  Edit Ritual
                </button>
                <button
                  onClick={() => handleDelete(habit.id)}
                  className="action-btn delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {milestoneHabit && (
        <div className="milestone-modal-backdrop" onClick={() => !submittingMilestone && setMilestoneHabit(null)}>
          <div className="milestone-modal" onClick={(e) => e.stopPropagation()}>
            <div className="reward-burst" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
            <span className="eyebrow">Reward unlocked</span>
            <h2>{milestoneHabit.current_reward || 'Celebrate this milestone'}</h2>
            <p className="milestone-modal-copy">
              Marking this milestone grants the reward now. Set the next goal and reward immediately so the next growth window starts without friction.
            </p>

            <form onSubmit={handleMilestoneComplete} className="milestone-form">
              <div className="form-group">
                <label>Next milestone goal</label>
                <textarea
                  value={milestoneForm.next_goal}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, next_goal: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Next reward</label>
                <input
                  type="text"
                  value={milestoneForm.next_reward}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, next_reward: e.target.value })}
                  required
                />
              </div>

              <div className="milestone-form-grid">
                <div className="form-group">
                  <label>Goal window</label>
                  <select
                    value={milestoneForm.goal_window_days}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, goal_window_days: parseInt(e.target.value, 10) })}
                  >
                    {[1, 2, 3, 5, 7, 10, 14].map((value) => (
                      <option key={value} value={value}>
                        {value} {value === 1 ? 'day' : 'days'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Reminder time</label>
                  <input
                    type="time"
                    value={milestoneForm.habit_time}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, habit_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Plant for the next cycle</label>
                <div className="edit-plant-grid">
                  {plantCatalog.map((plant) => {
                    const projectedUnlocked = projectedPlantCount >= plant.unlockCount;

                    return (
                      <button
                        key={plant.id}
                        type="button"
                      className={`edit-plant-option ${milestoneForm.selected_plant_type === plant.id ? 'selected' : ''} ${!projectedUnlocked ? 'locked' : ''}`}
                      onClick={() => projectedUnlocked && setMilestoneForm({ ...milestoneForm, selected_plant_type: plant.id })}
                      disabled={!projectedUnlocked}
                    >
                      <PlantPreview plantType={plant.id} growthStage={plant.growthTarget} fullBloom />
                      <span>{plant.name}</span>
                    </button>
                  );
                  })}
                </div>
              </div>

              <div className="milestone-modal-actions">
                <button type="button" className="back-btn" onClick={() => setMilestoneHabit(null)} disabled={submittingMilestone}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn" disabled={submittingMilestone}>
                  {submittingMilestone ? 'Updating...' : 'Claim Reward and Start Next Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editHabit && (
        <div className="milestone-modal-backdrop" onClick={() => !savingEdit && setEditHabit(null)}>
          <div className="milestone-modal edit-modal" onClick={(e) => e.stopPropagation()}>
            <span className="eyebrow">Modify active ritual</span>
            <h2>Edit {editHabit.name}</h2>
            <p className="milestone-modal-copy">
              Change the current goal, reward, reminder time, goal window, or support details without recreating the habit.
            </p>

            <form onSubmit={handleEditSave} className="milestone-form">
              <div className="form-group">
                <label>Current goal</label>
                <textarea
                  value={editForm.current_goal}
                  onChange={(e) => setEditForm({ ...editForm, current_goal: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Reward</label>
                <input
                  type="text"
                  value={editForm.current_reward}
                  onChange={(e) => setEditForm({ ...editForm, current_reward: e.target.value })}
                  required
                />
              </div>

              <div className="milestone-form-grid">
                <div className="form-group">
                  <label>Goal window</label>
                  <select
                    value={editForm.goal_window_days}
                    onChange={(e) => setEditForm({ ...editForm, goal_window_days: parseInt(e.target.value, 10) })}
                  >
                    {[1, 2, 3, 5, 7, 10, 14].map((value) => (
                      <option key={value} value={value}>
                        {value} {value === 1 ? 'day' : 'days'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Reminder time</label>
                  <input
                    type="time"
                    value={editForm.habit_time}
                    onChange={(e) => setEditForm({ ...editForm, habit_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="milestone-form-grid">
                <div className="form-group">
                  <label>Accountability</label>
                  <input
                    type="text"
                    value={editForm.whom_tell}
                    onChange={(e) => setEditForm({ ...editForm, whom_tell: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Inspiration</label>
                  <input
                    type="text"
                    value={editForm.who_inspires}
                    onChange={(e) => setEditForm({ ...editForm, who_inspires: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Motivation</label>
                <textarea
                  value={editForm.what_motivating}
                  onChange={(e) => setEditForm({ ...editForm, what_motivating: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Plant type</label>
                <div className="edit-plant-grid">
                  {plantCatalog.map((plant) => (
                    <button
                      key={plant.id}
                      type="button"
                      className={`edit-plant-option ${editForm.selected_plant_type === plant.id ? 'selected' : ''} ${!plant.unlocked ? 'locked' : ''}`}
                      onClick={() => plant.unlocked && setEditForm({ ...editForm, selected_plant_type: plant.id })}
                      disabled={!plant.unlocked}
                    >
                      <PlantPreview plantType={plant.id} growthStage={plant.growthTarget} fullBloom />
                      <span>{plant.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="milestone-modal-actions">
                <button type="button" className="back-btn" onClick={() => setEditHabit(null)} disabled={savingEdit}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn" disabled={savingEdit}>
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {completionCelebration && (
        <div className="milestone-modal-backdrop" onClick={() => setCompletionCelebration(null)}>
          <div className="milestone-modal celebration-modal" onClick={(e) => e.stopPropagation()}>
            <div className="reward-burst celebration-burst" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
            <span className="eyebrow">Plant completed</span>
            <h2>{completionCelebration.habitName} is fully in bloom</h2>
            <p className="milestone-modal-copy">
              Your {getPlantById(completionCelebration.completedPlantType || 'fern').name.toLowerCase()} has been archived in the garden.
              {completionCelebration.rewardClaimed ? ` Reward claimed: ${completionCelebration.rewardClaimed}.` : ''}
            </p>

            <div className="celebration-plant-row">
              <div className="celebration-plant-card">
                <PlantPreview
                  plantType={completionCelebration.completedPlantType}
                  growthStage={getPlantById(completionCelebration.completedPlantType || 'fern').growthTarget}
                  fullBloom
                  showLabel
                />
              </div>
              <div className="celebration-next-card">
                <span>Next cycle planted as</span>
                <strong>{getPlantById(completionCelebration.nextPlantType || 'fern').name}</strong>
                <PlantPreview plantType={completionCelebration.nextPlantType} growthStage={0} />
              </div>
            </div>

            {completionCelebration.newlyUnlockedPlants.length > 0 && (
              <div className="celebration-unlocks">
                <span>Newly unlocked</span>
                <p>{completionCelebration.newlyUnlockedPlants.map((plant) => plant.name).join(', ')}</p>
              </div>
            )}

            <div className="milestone-modal-actions">
              <button type="button" className="submit-btn" onClick={() => setCompletionCelebration(null)}>
                Continue Growing
              </button>
            </div>
          </div>
        </div>
      )}

      {replantHabit && (
        <div className="milestone-modal-backdrop" onClick={() => !submittingReplant && setReplantHabit(null)}>
          <div className="milestone-modal" onClick={(e) => e.stopPropagation()}>
            <span className="eyebrow">Start New Growth Cycle</span>
            <h2>Your plant has fully grown</h2>
            <p className="milestone-modal-copy">
              Your {getPlantById(replantHabit.selected_plant_type || 'fern').name.toLowerCase()} has reached maturity. Archive your specimen and select a new seed to continue this ritual.
            </p>

            <form onSubmit={handleReplantSubmit} className="milestone-form">
              <div className="form-group">
                <label>Plant for the next cycle</label>
                <div className="edit-plant-grid">
                  {plantCatalog.map((plant) => {
                    const projectedUnlocked = projectedPlantCount >= plant.unlockCount;

                    return (
                      <button
                        key={plant.id}
                        type="button"
                        className={`edit-plant-option ${replantForm.selected_plant_type === plant.id ? 'selected' : ''} ${!projectedUnlocked ? 'locked' : ''}`}
                        onClick={() => projectedUnlocked && setReplantForm({ ...replantForm, selected_plant_type: plant.id })}
                        disabled={!projectedUnlocked}
                      >
                        <PlantPreview plantType={plant.id} growthStage={plant.growthTarget} fullBloom />
                        <span>{plant.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="milestone-modal-actions">
                <button type="button" className="back-btn" onClick={() => setReplantHabit(null)} disabled={submittingReplant}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn" disabled={submittingReplant}>
                  {submittingReplant ? 'Planting...' : 'Archive and Plant New Seed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Habits;
