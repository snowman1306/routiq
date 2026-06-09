import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import PlantPreview from '../components/PlantPreview';
import './AddHabit.css';

function AddHabit() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [plantCatalog, setPlantCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    when_specifically: '',
    what_motivating: '',
    what_hindering: '',
    whom_tell: '',
    who_inspires: '',
    milestones: '',
    treat_myself: '',
    current_goal: '',
    current_reward: '',
    habit_time: '08:00',
    goal_window_days: 1,
    selected_plant_type: ''
  });
  const [loading, setLoading] = useState(false);
  const unlockedPlants = plantCatalog.filter((plant) => plant.unlocked);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const response = await api.get('/habits/plant-catalog');
        setPlantCatalog(response.data.catalog);
      } catch (error) {
        console.error('Error fetching plant catalog:', error);
      } finally {
        setLoadingCatalog(false);
      }
    };

    fetchCatalog();
  }, []);

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/habits', formData);
      navigate('/habits');
    } catch (error) {
      console.error('Error creating habit:', error);
      alert(error.response?.data?.error || 'Error recording sequence');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-habit-page">
      <div className="add-habit-container">
        <div className="add-habit-header">
          <span className="eyebrow">Create a new ritual</span>
          <h1>Registry Entry</h1>
          <p className="add-habit-subtitle">
            Configure the habit, the reminder moment, the milestone window, and the plant that will grow with it.
          </p>
        </div>

        <div className="progress-indicator">
          <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>Identity</div>
          <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>Support</div>
          <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>Milestone</div>
          <div className={`progress-step ${step >= 4 ? 'active' : ''}`}>Plant</div>
        </div>

        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <div className="form-step">
              <h2>The rhythm</h2>
              <p className="step-description">Name the ritual and define when it should happen.</p>

              <div className="form-group">
                <label>Sequence name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Morning Stillness"
                />
              </div>

              <div className="form-group">
                <label>Root purpose</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Why does this habit matter to the life you're building?"
                />
              </div>

              <div className="form-group">
                <label>Reminder time</label>
                <input
                  type="time"
                  value={formData.habit_time}
                  onChange={(e) => setFormData({ ...formData, habit_time: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Specific cue</label>
                <textarea
                  value={formData.when_specifically}
                  onChange={(e) => setFormData({ ...formData, when_specifically: e.target.value })}
                  placeholder="For example: right after tea, before opening messages, or once I get back from class."
                />
              </div>

              <button type="button" onClick={handleNext} className="next-btn">
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="form-step">
              <h2>The support system</h2>
              <p className="step-description">Document the motivation, the friction, and the person watching your progress.</p>

              <div className="form-group">
                <label>Motivation</label>
                <textarea
                  value={formData.what_motivating}
                  onChange={(e) => setFormData({ ...formData, what_motivating: e.target.value })}
                  placeholder="What makes this ritual worth keeping?"
                />
              </div>

              <div className="form-group">
                <label>Potential friction</label>
                <textarea
                  value={formData.what_hindering}
                  onChange={(e) => setFormData({ ...formData, what_hindering: e.target.value })}
                  placeholder="What usually gets in the way?"
                />
              </div>

              <div className="form-group">
                <label>Accountability person</label>
                <input
                  type="text"
                  value={formData.whom_tell}
                  onChange={(e) => setFormData({ ...formData, whom_tell: e.target.value })}
                  placeholder="Who is monitoring this habit with you?"
                />
              </div>

              <div className="form-group">
                <label>Who inspires this goal?</label>
                <input
                  type="text"
                  value={formData.who_inspires}
                  onChange={(e) => setFormData({ ...formData, who_inspires: e.target.value })}
                  placeholder="A person, mentor, or version of yourself"
                />
              </div>

              <div className="button-group">
                <button type="button" onClick={handleBack} className="back-btn">Back</button>
                <button type="button" onClick={handleNext} className="next-btn">Continue</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="form-step">
              <h2>The current milestone</h2>
              <p className="step-description">Set the immediate goal, the reward, and the completion window for this milestone.</p>

              <div className="form-group">
                <label>Current goal</label>
                <textarea
                  value={formData.current_goal}
                  onChange={(e) => setFormData({ ...formData, current_goal: e.target.value })}
                  required
                  placeholder="What should be completed before the next reward is given?"
                />
              </div>

              <div className="form-group">
                <label>Reward when achieved</label>
                <input
                  type="text"
                  value={formData.current_reward}
                  onChange={(e) => setFormData({ ...formData, current_reward: e.target.value })}
                  required
                  placeholder="Coffee out, a movie night, a quiet walk..."
                />
              </div>

              <div className="form-group">
                <label>Goal window in days</label>
                <select
                  value={formData.goal_window_days}
                  onChange={(e) => setFormData({ ...formData, goal_window_days: parseInt(e.target.value, 10) })}
                >
                  {[1, 2, 3, 5, 7, 10, 14].map((value) => (
                    <option key={value} value={value}>
                      {value} {value === 1 ? 'day' : 'days'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Longer milestone vision</label>
                <textarea
                  value={formData.milestones}
                  onChange={(e) => setFormData({ ...formData, milestones: e.target.value })}
                  placeholder="What larger milestone path are you building toward?"
                />
              </div>

              <div className="form-group">
                <label>Celebration style</label>
                <input
                  type="text"
                  value={formData.treat_myself}
                  onChange={(e) => setFormData({ ...formData, treat_myself: e.target.value })}
                  placeholder="How do you like to celebrate progress overall?"
                />
              </div>

              <div className="button-group">
                <button type="button" onClick={handleBack} className="back-btn">Back</button>
                <button type="button" onClick={handleNext} className="next-btn">Continue</button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="form-step">
              <h2>Which flower do you want for the habit?</h2>
              <p className="step-description">Choose from the flowers you've unlocked. Select one from the dropdown below to represent this habit.</p>

              <div className="form-group">
                <label>Flower selection</label>
                {loadingCatalog ? (
                  <div className="plant-selector-loading">Loading plant catalog...</div>
                ) : unlockedPlants.length === 0 ? (
                  <div className="plant-selector-empty">
                    No unlocked flowers available yet. Earn a new plant by growing your first habit.
                  </div>
                ) : (
                  <>
                    <select
                      value={formData.selected_plant_type}
                      onChange={(e) => setFormData({ ...formData, selected_plant_type: e.target.value })}
                      className="plant-select"
                    >
                      <option value="" disabled>Select your unlocked flower</option>
                      {unlockedPlants.map((plant) => (
                        <option key={plant.id} value={plant.id}>
                          {plant.name} — {plant.description}
                        </option>
                      ))}
                    </select>
                    {!formData.selected_plant_type && (
                      <p className="field-note">Select one unlocked flower to represent this habit before you continue.</p>
                    )}
                  </>
                )}
              </div>

              <div className="button-group">
                <button type="button" onClick={handleBack} className="back-btn">Back</button>
                <button
                  type="submit"
                  disabled={loading || (unlockedPlants.length > 0 && !formData.selected_plant_type)}
                  className="submit-btn"
                >
                  {loading ? 'Creating ritual...' : 'Finalize Registry'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default AddHabit;
