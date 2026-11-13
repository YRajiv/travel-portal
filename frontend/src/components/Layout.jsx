import { Link, NavLink } from 'react-router-dom';
import { Plane, Compass, BriefcaseBusiness, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/destinations', label: 'Destinations' },
  { to: '/packages', label: 'Packages' },
  { to: '/services', label: 'Services' },
  { to: '/customer-reports', label: 'Reports', roles: ['CUSTOMER'] },
  { to: '/reports', label: 'Reports', roles: ['ADMIN', 'TRAVEL_AGENT'] },
];

const roleDashboardMap = {
  ADMIN: '/admin-dashboard',
  TRAVEL_AGENT: '/travel-agent-dashboard',
  CUSTOMER: '/customer-dashboard',
  SERVICE_PROVIDER: '/service-provider-dashboard',
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="page-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <div className="brand-icon"><Plane size={22}/></div>
          <Link to="/" className="brand-name">VoyageVista</Link>
        </div>
        <nav className="nav-links">
          {navItems.filter((item) => !item.roles || item.roles.includes(user?.role)).map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? 'active-link' : ''}>{item.label}</NavLink>
          ))}
        </nav>
        <div className="nav-actions">
          {user ? (
            <>
              <Link to={roleDashboardMap[user.role] || '/customer-dashboard'} className="btn btn-light">Dashboard</Link>
              <button className="btn btn-ghost" onClick={logout}><LogOut size={16}/> Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-light">Login</Link>
              <Link to="/register" className="btn btn-primary">Register</Link>
            </>
          )}
        </div>
      </header>
      <main className="page-content">{children}</main>
      <footer className="footer">
        <div>
          <h4>VoyageVista</h4>
          <p>Travel smarter, book better.</p>
        </div>
        <div>
          <Compass size={18} /> <span>Explore global adventures</span>
        </div>
        <div>
          <BriefcaseBusiness size={18} /> <span>Trusted itinerary management</span>
        </div>
      </footer>
    </div>
  );
}
