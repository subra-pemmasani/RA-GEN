import { NavLink } from 'react-router-dom';

export default function Layout({ children, user, onLogout }) {
  const pages = [
    { to: '/', label: 'Dashboard' },
    { to: '/activities', label: 'Activity Library' },
    { to: '/hazards', label: 'Hazard Library' },
    { to: '/mapping', label: 'Activity-Hazard Mapping' },
    { to: '/generate', label: 'RA Generator' },
    { to: '/register', label: 'Risk Register' },
    { to: '/print', label: 'Printable RA Output' }
  ];

  if (user?.role === 'admin') {
    pages.splice(6, 0, { to: '/users', label: 'User Management' });
  }

  return (
    <div className="app-shell">
      <header className="top-header">
        <div>
          <h1>Risk Assessment Generator</h1>
          {user ? (
            <p className="muted-text">
              {user.companyName} • {user.departmentName} • {user.name} ({user.role})
            </p>
          ) : null}
        </div>
        {user ? (
          <button type="button" className="btn small-btn" onClick={onLogout}>
            Logout
          </button>
        ) : null}
      </header>
      {user ? (
        <>
          <nav>
            {pages.map((page) => (
              <NavLink
                key={page.to}
                to={page.to}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                {page.label}
              </NavLink>
            ))}
          </nav>
          <main>{children}</main>
        </>
      ) : (
        <main>{children}</main>
      )}
    </div>
  );
}
