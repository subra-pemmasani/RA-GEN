import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';

const defaultPermissions = {
  canEditActivities: true,
  canEditHazards: true,
  canEditMappings: true,
  canEditUsers: false,
  canEditRiskRegister: true,
  canCustomizeRA: true,
  canUseAIGenerator: true
};

export default function UserManagementPage({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    departmentId: '',
    departmentName: '',
    role: 'user',
    permissions: defaultPermissions
  });

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

  const togglePermission = async (user, permissionKey) => {
    const nextPermissions = {
      ...user.permissions,
      [permissionKey]: !user.permissions?.[permissionKey]
    };

    try {
      const updated = await api.updateUser(user.id, { permissions: nextPermissions });
      setUsers((prev) => prev.map((item) => (item.id === user.id ? updated : item)));
    } catch (requestError) {
      setError(requestError.message);
    }
  };

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

  const permissionKeys = Object.keys(defaultPermissions);

  return (
    <section className="card">
      <h2>User Management</h2>
      {error ? <p className="error-text">{error}</p> : null}

      <article className="tile">
        <h3>Create User</h3>
        <div className="inline-fields">
          <label>Name<input value={newUser.name} onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))} /></label>
          <label>Email<input value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} /></label>
          <label>Password<input type="password" value={newUser.password} onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))} /></label>
          <label>Department Id<input value={newUser.departmentId} onChange={(e) => setNewUser((p) => ({ ...p, departmentId: e.target.value }))} /></label>
          <label>Department Name<input value={newUser.departmentName} onChange={(e) => setNewUser((p) => ({ ...p, departmentName: e.target.value }))} /></label>
          <label>Role
            <select value={newUser.role} onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}>
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </label>
        </div>
        <button
          type="button"
          className="btn"
          onClick={async () => {
            try {
              const created = await api.createUser(newUser);
              setUsers((prev) => [...prev, created]);
              setNewUser({
                name: '', email: '', password: '', departmentId: '', departmentName: '', role: 'user', permissions: defaultPermissions
              });
            } catch (requestError) {
              setError(requestError.message);
            }
          }}
        >
          Add User
        </button>
      </article>

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
            <p><strong>Permissions:</strong></p>
            <div className="chip-wrap">
              {permissionKeys.map((permissionKey) => {
                const enabled = user.permissions?.[permissionKey];
                return (
                  <button
                    key={permissionKey}
                    type="button"
                    className={`hazard-chip ${enabled ? '' : 'inactive-chip'}`}
                    onClick={() => togglePermission(user, permissionKey)}
                  >
                    {permissionKey}
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
