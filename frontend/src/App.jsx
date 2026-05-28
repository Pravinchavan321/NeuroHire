import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DashboardPage from './pages/DashboardPage';
import Analytics from './pages/Analytics';
import Billing from './pages/Billing';
import Integrations from './pages/Integrations';
import AuditLog from './pages/AuditLog';
import ApiKeys from './pages/ApiKeys';
import GdprAdmin from './pages/GdprAdmin';
import CandidateScorePage from './pages/CandidateScorePage';
import JobRankingPage from './pages/JobRankingPage';
import PipelinePage from './pages/PipelinePage';
import InterviewQuestionsPage from './pages/InterviewQuestionsPage';
import SettingsPage from './pages/SettingsPage';
import PrivateRoute from './components/PrivateRoute';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/admin-dashboard" element={<PrivateRoute requiredRole="admin"><DashboardPage /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute requiredRole="admin"><SettingsPage /></PrivateRoute>} />
        <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
        <Route path="/billing" element={<PrivateRoute><Billing /></PrivateRoute>} />
        <Route path="/integrations" element={<PrivateRoute><Integrations /></PrivateRoute>} />
        <Route path="/audit" element={<PrivateRoute requiredRole="admin"><AuditLog /></PrivateRoute>} />
        <Route path="/api-keys" element={<PrivateRoute><ApiKeys /></PrivateRoute>} />
        <Route path="/gdpr" element={<PrivateRoute requiredRole="admin"><GdprAdmin /></PrivateRoute>} />
        <Route path="/candidates/:candidateId/score/:jobId" element={<PrivateRoute><CandidateScorePage /></PrivateRoute>} />
        <Route path="/jobs/:jobId/ranking" element={<PrivateRoute><JobRankingPage /></PrivateRoute>} />
        <Route path="/jobs/:jobId/pipeline" element={<PrivateRoute><PipelinePage /></PrivateRoute>} />
        <Route path="/candidates/:candidateId/interview/:jobId" element={<PrivateRoute><InterviewQuestionsPage /></PrivateRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
