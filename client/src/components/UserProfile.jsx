import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Upload, Check } from 'lucide-react';
import api from '../services/api';
import './UserProfile.css';

function UserProfile() {
  const { user, setUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const fileInputRef = useRef(null);
  const popoverRef = useRef(null);

  // Initialize form values when dropdown opens
  useEffect(() => {
    if (isOpen && user) {
      setUsername(user.username || '');
      setEmail(user.email || '');
      setAvatar(user.avatar || null);
      setError('');
      setSuccess('');
    }
  }, [isOpen, user]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!user) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Image size should be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result); // Base64 string
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      const response = await api.put('/auth/profile', {
        username,
        email,
        avatar
      });

      setUser(response.data.user);
      setSuccess('Profile updated successfully!');
      setTimeout(() => {
        setIsOpen(false);
      }, 1500);
    } catch (err) {
      console.error('Error saving profile:', err);
      setError(err.response?.data?.error || 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const firstLetter = user.username?.charAt(0)?.toUpperCase() || 'U';

  return (
    <div className="user-profile-container" ref={popoverRef}>
      {/* Navbar Profile Icon */}
      <button 
        className={`navbar-profile-trigger ${isOpen ? 'active' : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
        title="My Profile"
      >
        {user.avatar ? (
          <img src={user.avatar} className="navbar-profile-img" alt="My Profile" />
        ) : (
          <div className="navbar-profile-letter">
            {firstLetter}
          </div>
        )}
      </button>

      {/* Profile Edit Popover (Small Dropdown Window) */}
      {isOpen && (
        <div className="profile-dropdown-window">
          <div className="profile-dropdown-header">
            <span className="eyebrow">My Identity</span>
            <h3>Edit Profile</h3>
          </div>

          <form onSubmit={handleSave} className="profile-dropdown-form">
            {/* Profile Avatar Upload Block */}
            <div className="profile-avatar-upload-section">
              <div className="avatar-preview-wrapper">
                {avatar ? (
                  <img src={avatar} className="avatar-preview-img" alt="Preview" />
                ) : (
                  <div className="avatar-preview-letter">{firstLetter}</div>
                )}
                <button 
                  type="button" 
                  className="avatar-upload-overlay-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={14} />
                </button>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                style={{ display: 'none' }}
              />
              <span className="upload-tip-text">Click image to upload (max 2MB)</span>
            </div>

            {/* Error and Success States */}
            {error && <div className="profile-form-error">{error}</div>}
            {success && (
              <div className="profile-form-success">
                <Check size={14} style={{ marginRight: '0.3rem' }} /> {success}
              </div>
            )}

            {/* Form Inputs */}
            <div className="profile-form-group">
              <label><User size={12} style={{ marginRight: '0.3rem' }} /> Name</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Enter your name"
              />
            </div>

            <div className="profile-form-group">
              <label><Mail size={12} style={{ marginRight: '0.3rem' }} /> Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
              />
            </div>

            <div className="profile-form-actions">
              <button 
                type="button" 
                className="profile-btn-cancel" 
                onClick={() => setIsOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="profile-btn-save"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default UserProfile;
