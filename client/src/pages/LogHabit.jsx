import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import './LogHabit.css';

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function LogHabit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [habit, setHabit] = useState(null);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    completion_percentage: 0,
    mood: '',
    stress_level: null,
    notes: ''
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchHabit();
  }, [id]);

  const fetchHabit = async () => {
    try {
      const response = await api.get(`/habits/${id}`);
      setHabit(response.data);
    } catch (error) {
      console.error('Error fetching habit:', error);
      alert('Archive not found');
      navigate('/habits');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step < 3) {
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
    setSubmitting(true);

    try {
      const today = getLocalDateString();
      await api.post('/logs', {
        habit_id: parseInt(id),
        log_date: today,
        ...formData
      });

      alert('Growth entry successfully recorded.');
      navigate('/habits');
    } catch (error) {
      console.error('Error logging habit:', error);
      alert('Error recording entry');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="log-loading">Retrieving the Botanical Logs...</div>;
  }

  if (!habit) return null;

  return (
    <div className="log-habit-page">
      <div className="log-container">
        <div className="log-header">
          <h1>Journal: {habit.name}</h1>
          <p className="log-subtitle">Document today's natural progression</p>
          <div className="log-goal-strip">
            <span>Current goal: {habit.current_goal || 'No milestone goal set'}</span>
            <span>Reward: {habit.current_reward || 'No reward set'}</span>
            <span>Window: {habit.goal_window_days || 1} day{habit.goal_window_days === 1 ? '' : 's'}</span>
          </div>
        </div>
        
        <div className="progress-indicator">
          <div className="progress-line"></div>
          <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>I</div>
          <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>II</div>
          <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>III</div>
        </div>

        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <div className="log-step">
              <h2>Degree of Bloom</h2>
              <p>To what extent did the sequence manifest today?</p>
              <div className="completion-scale">
                {[0, 1, 2, 3].map(value => (
                  <label key={value} className={`scale-option ${formData.completion_percentage === value ? 'checked' : ''}`}>
                    <input
                      type="radio"
                      name="completion"
                      value={value}
                      checked={formData.completion_percentage === value}
                      onChange={(e) => setFormData({ ...formData, completion_percentage: parseInt(e.target.value) })}
                    />
                    <div className="scale-label">
                      <span className="scale-value">{value === 0 ? '○' : value === 1 ? '¼' : value === 2 ? '½' : '●'}</span>
                      <span className="scale-desc">
                        {value === 0 ? 'Dormant' : value === 1 ? 'Sprout' : value === 2 ? 'Budding' : 'Full Bloom'}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
              <button type="button" onClick={handleNext} className="next-btn">
                Next
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="log-step">
              <h2>Internal Resonance</h2>
              <p>Document the psychological atmosphere of today's pace.</p>
              
              <div className="form-group">
                <label>Emotional Resonance</label>
                <select
                  value={formData.mood}
                  onChange={(e) => setFormData({ ...formData, mood: e.target.value })}
                  className="mood-select"
                >
                  <option value="">Indifferent</option>
                  <option value="Happy">Serene</option>
                  <option value="Calm">Still</option>
                  <option value="Energetic">Vibrant</option>
                  <option value="Neutral">Neutral</option>
                  <option value="Tired">Fatigued</option>
                  <option value="Stressed">Fractioned</option>
                  <option value="Anxious">Restless</option>
                  <option value="Sad">Melancholy</option>
                </select>
              </div>

              <div className="form-group">
                <label>Resistance Level (1-5)</label>
                <div className="stress-scale">
                  {[1, 2, 3, 4, 5].map(level => (
                    <label key={level} className={`stress-option ${formData.stress_level === level ? 'checked' : ''}`}>
                      <input
                        type="radio"
                        name="stress"
                        value={level}
                        checked={formData.stress_level === level}
                        onChange={(e) => setFormData({ ...formData, stress_level: parseInt(e.target.value) })}
                      />
                      <span>{level}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="button-group">
                <button type="button" onClick={handleBack} className="back-btn">
                  Back
                </button>
                <button type="button" onClick={handleNext} className="next-btn">
                  Next
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="log-step">
              <h2>Observations</h2>
              <p>Add context and reflections to today's entry.</p>
              
              <div className="form-group">
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Today's reflections..."
                  className="notes-textarea"
                />
              </div>

              <div className="button-group">
                <button type="button" onClick={handleBack} className="back-btn">
                  Back
                </button>
                <button type="submit" disabled={submitting} className="submit-btn">
                  {submitting ? 'Archiving...' : 'Record Bloom'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default LogHabit;
