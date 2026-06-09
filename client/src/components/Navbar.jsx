import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut } from 'lucide-react';
import LiveClock from './LiveClock';
import UserProfile from './UserProfile';
import './Navbar.css';

function Navbar() {
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path;
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar-premium">
      <div className="navbar-container">
        <div className="navbar-brand-lockup">
          <span className="navbar-brand-mark" aria-hidden="true" />
          <div className="navbar-brand-serif">RoutiQ</div>
        </div>
        <div className="navbar-links-premium">
          <div className="navbar-clock-wrap">
            <LiveClock compact />
          </div>
          <Link to="/dashboard" className={isActive('/dashboard') ? 'active' : ''}>
            <span>Atmosphere</span>
          </Link>
          <Link to="/habits" className={isActive('/habits') ? 'active' : ''}>
            <span>Registry</span>
          </Link>
          <Link to="/garden" className={isActive('/garden') ? 'active' : ''}>
            <span>Garden</span>
          </Link>

          <Link to="/reports" className={isActive('/reports') ? 'active' : ''}>
            <span>Archives</span>
          </Link>
          <Link to="/oracle" className={isActive('/oracle') ? 'active' : ''}>
            <span>Oracle</span>
          </Link>
          <Link to="/settings" className={isActive('/settings') ? 'active' : ''}>
            <span>Refinement</span>
          </Link>
          <div className="navbar-actions-group">
            <UserProfile />
            <button onClick={handleLogout} className="logout-btn-premium" title="Exit Archive">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
