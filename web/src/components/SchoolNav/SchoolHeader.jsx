import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { School, Lock } from 'lucide-react';

export default function SchoolHeader({ isAuthenticated, onOpenInquiry }) {
  const navigate = useNavigate();

  return (
    <header className="ug-navbar">
      <Link to="/" className="ug-brand">
        <div className="ug-crest">
          <School size={22} color="#c59b27" />
        </div>
        <div className="ug-brand-text">
          <h1>NDUGU ACADEMY</h1>
          <p className="ug-brand-sub">Diligence &bull; Character &bull; Excellence</p>
        </div>
      </Link>

      <nav className="ug-nav-links">
        <NavLink 
          to="/" 
          end
          className={({ isActive }) => `ug-nav-link ${isActive ? 'active' : ''}`}
        >
          Welcome
        </NavLink>
        <NavLink 
          to="/academics" 
          className={({ isActive }) => `ug-nav-link ${isActive ? 'active' : ''}`}
        >
          Academics &amp; CBC
        </NavLink>
        <NavLink 
          to="/student-life" 
          className={({ isActive }) => `ug-nav-link ${isActive ? 'active' : ''}`}
        >
          Houses &amp; Life
        </NavLink>
        <NavLink 
          to="/admissions" 
          className={({ isActive }) => `ug-nav-link ${isActive ? 'active' : ''}`}
        >
          Admissions
        </NavLink>
      </nav>

      <div className="ug-nav-actions">
        <button 
          onClick={() => navigate('/admissions')} 
          className="btn-ug-inquire"
          id="btn-nav-admissions-desk"
        >
          Admissions Desk
        </button>
        <button 
          onClick={() => navigate(isAuthenticated ? '/admin' : '/login')} 
          className="btn-ug-portal"
          id="btn-nav-portal-login"
          title="School Portal for Staff, Administrators &amp; Teachers"
        >
          <Lock size={14} />
          <span>{isAuthenticated ? 'Admin Dashboard' : 'Portal Login'}</span>
        </button>
      </div>
    </header>
  );
}
