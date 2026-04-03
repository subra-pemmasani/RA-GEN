import { Navigate, Route, Routes } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import ActivityLibraryPage from './pages/ActivityLibraryPage';
import HazardLibraryPage from './pages/HazardLibraryPage';
import MappingPage from './pages/MappingPage';
import RAGeneratorPage from './pages/RAGeneratorPage';
import PrintPage from './pages/PrintPage';
import LoginPage from './pages/LoginPage';
import RiskRegisterPage from './pages/RiskRegisterPage';
import UserManagementPage from './pages/UserManagementPage';
import { api } from './api';

export default function App() {
  const [latestAssessment, setLatestAssessment] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ra_token');
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .me()
      .then((me) => setUser(me))
      .catch(() => localStorage.removeItem('ra_token'))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('ra_token');
    setUser(null);
    setLatestAssessment(null);
  };

  const context = useMemo(
    () => ({
      latestAssessment,
      setLatestAssessment
    }),
    [latestAssessment]
  );

  if (loading) {
    return <Layout><section className="card"><p>Loading...</p></section></Layout>;
  }

  if (!user) {
    return (
      <Layout>
        <LoginPage onLogin={setUser} />
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={handleLogout}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/activities" element={<ActivityLibraryPage />} />
        <Route path="/hazards" element={<HazardLibraryPage />} />
        <Route path="/mapping" element={<MappingPage />} />
        <Route path="/generate" element={<RAGeneratorPage {...context} user={user} />} />
        <Route
          path="/register"
          element={<RiskRegisterPage latestAssessment={latestAssessment} setLatestAssessment={setLatestAssessment} />}
        />
        <Route path="/users" element={<UserManagementPage currentUser={user} />} />
        <Route path="/print" element={<PrintPage latestAssessment={latestAssessment} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
