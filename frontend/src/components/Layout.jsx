import { NavLink } from 'react-router-dom';

const pages = [
  { to: '/', label: 'Dashboard' },
  { to: '/activities', label: 'Activity Library' },
  { to: '/hazards', label: 'Hazard Library' },
  { to: '/mapping', label: 'Activity-Hazard Mapping' },
  { to: '/generate', label: 'RA Generator' },
  { to: '/print', label: 'Printable RA Output' }
];

export default function Layout({ children }) {
  return (
    <div className="app-shell">
      <header>
        <h1>Risk Assessment Generator</h1>
      </header>
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
    </div>
  );
}
