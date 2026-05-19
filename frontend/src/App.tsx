import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AnalysisPage } from './pages/AnalysisPage';
import { AnalyzePage } from './pages/AnalyzePage';
import { ApplicationPage } from './pages/ApplicationPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { VerifyMagicLinkPage } from './pages/VerifyMagicLinkPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/verify" element={<VerifyMagicLinkPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="applications/:id/analyze" element={<AnalyzePage />} />
            <Route path="applications/:id/analysis" element={<AnalysisPage />} />
            <Route path="applications/:id" element={<ApplicationPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
