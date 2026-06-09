import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Check, X, Trash2 } from 'lucide-react';
import './SubTasks.css';

function SubTasks({ habitId, onUpdate }) {
  const [subTasks, setSubTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');

  useEffect(() => {
    fetchSubTasks();
  }, [habitId]);

  const fetchSubTasks = async () => {
    try {
      const response = await api.get(`/subtasks/habit/${habitId}`);
      setSubTasks(response.data);
    } catch (error) {
      console.error('Error fetching sub-tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskName.trim()) return;

    try {
      await api.post('/subtasks', {
        habit_id: habitId,
        name: newTaskName,
        order_index: subTasks.length
      });
      setNewTaskName('');
      setShowAddForm(false);
      fetchSubTasks();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error adding sub-task:', error);
      alert('Error adding sequence marker');
    }
  };

  const handleToggleComplete = async (taskId, isCompleted) => {
    try {
      await api.put(`/subtasks/${taskId}`, {
        is_completed: !isCompleted
      });
      fetchSubTasks();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating sub-task:', error);
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('Remove this sequence marker?')) return;

    try {
      await api.delete(`/subtasks/${taskId}`);
      fetchSubTasks();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error deleting sub-task:', error);
      alert('Error removing marker');
    }
  };

  if (loading) {
    return <div className="subtasks-loading">Retrieving markers...</div>;
  }

  return (
    <div className="subtasks-container">
      <div className="subtasks-header">
        <h3>Sequence Markers</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="add-subtask-btn"
        >
          <Plus size={14} />
          Append Marker
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddTask} className="add-subtask-form">
          <input
            type="text"
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
            placeholder="Define marker name..."
            className="subtask-input"
            autoFocus
          />
          <div className="form-actions">
            <button type="submit" className="save-btn">
              Append
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewTaskName('');
              }}
              className="cancel-btn"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="subtasks-list">
        {subTasks.length === 0 ? (
          <p className="no-subtasks">No markers defined for this sequence.</p>
        ) : (
          subTasks.map(task => (
            <div
              key={task.id}
              className={`subtask-item ${task.is_completed ? 'completed' : ''}`}
            >
              <button
                onClick={() => handleToggleComplete(task.id, task.is_completed)}
                className="subtask-checkbox"
              >
                {task.is_completed && <Check size={14} className="checked" />}
              </button>
              <span className="subtask-name">{task.name}</span>
              <button
                onClick={() => handleDelete(task.id)}
                className="delete-subtask-btn"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default SubTasks;
