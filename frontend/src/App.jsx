import { Navigate, Route, Routes } from 'react-router-dom';
import { useMemo, useState } from 'react';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import ActivityLibraryPage from './pages/ActivityLibraryPage';
import HazardLibraryPage from './pages/HazardLibraryPage';
import MappingPage from './pages/MappingPage';
import RAGeneratorPage from './pages/RAGeneratorPage';
import PrintPage from './pages/PrintPage';

export default function App() {
  const [latestAssessment, setLatestAssessment] = useState(null);

  const context = useMemo(
    () => ({
      latestAssessment,
      setLatestAssessment
    }),
    [latestAssessment]
  );

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/activities" element={<ActivityLibraryPage />} />
        <Route path="/hazards" element={<HazardLibraryPage />} />
        <Route path="/mapping" element={<MappingPage />} />
        <Route path="/generate" element={<RAGeneratorPage {...context} />} />
        <Route path="/print" element={<PrintPage latestAssessment={latestAssessment} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
