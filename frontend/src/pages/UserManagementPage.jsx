import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';

export default function UserManagementPage({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentUser?.role !== 'admin') return;
    api.getUsers().then(setUsers).catch((requestError) => setError(requestError.message));
  }, [currentUser]);

  const departmentChoices = useMemo(() => {
    const seen = new Map();
    users.forEach((user) => {
      seen.set(user.departmentId, user.departmentName);
    });
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [users]);

  const toggleDepartment = async (userId, departmentId) => {
    const user = users.find((item) => item.id === userId);
    if (!user) return;

    const hasAccess = user.allowedDepartmentIds.includes(departmentId);
    const nextAccess = hasAccess
      ? user.allowedDepartmentIds.filter((id) => id !== departmentId)
      : [...user.allowedDepartmentIds, departmentId];

    try {
      const updated = await api.updateUserDepartmentAccess(userId, nextAccess);
      setUsers((prev) => prev.map((item) => (item.id === userId ? updated : item)));
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  if (currentUser?.role !== 'admin') {
    return (
      <section className="card">
        <h2>User Management</h2>
        <p>Only admin users can manage department access.</p>
      </section>
    );
  }

  return (
    <section className="card">
      <h2>User Management</h2>
      {error ? <p className="error-text">{error}</p> : null}
      <div className="grid">
        {users.map((user) => (
          <article key={user.id} className="tile">
            <h3>{user.name}</h3>
            <p>{user.email}</p>
            <p><strong>Role:</strong> {user.role}</p>
            <p><strong>Department:</strong> {user.departmentName}</p>
            <p><strong>Cross-department visibility:</strong></p>
            <div className="chip-wrap">
              {departmentChoices.map((department) => {
                const active = user.allowedDepartmentIds.includes(department.id);
                return (
                  <button
                    key={department.id}
                    type="button"
                    className={`hazard-chip ${active ? '' : 'inactive-chip'}`}
                    onClick={() => toggleDepartment(user.id, department.id)}
                  >
                    {department.name}
                  </button>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
