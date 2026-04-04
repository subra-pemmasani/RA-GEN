import { useState } from 'react';
import { api } from '../api';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('admin@alpha.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      const payload = await api.login(email, password);
      localStorage.setItem('ra_token', payload.token);
      onLogin(payload.user);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <section className="card login-card">
      <h2>Login</h2>
      <p>Demo credentials: admin@alpha.com / admin123</p>
      <form onSubmit={handleSubmit} className="stack-form">
        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <button type="submit" className="btn">Sign In</button>
      </form>
      {error ? <p className="error-text">{error}</p> : null}
    </section>
  );
}
