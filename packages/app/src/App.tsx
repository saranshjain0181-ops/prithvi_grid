import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/auth.store';

import { Login } from './pages/Login';
import { SafaiMitraDashboard } from './pages/safai-mitra/Dashboard';
import { SafaiMitraDiary } from './pages/safai-mitra/Diary';
import { SafaiMitraHistory } from './pages/safai-mitra/History';
import { ManagerDashboard } from './pages/manager/Dashboard';
import { ManagerRoster } from './pages/manager/Roster';
import { ManagerTelemetry } from './pages/manager/Telemetry';
import { ManagerLedger } from './pages/manager/Ledger';
import { ManagerAssets } from './pages/manager/Assets';
import { ManagerAlerts } from './pages/manager/Alerts';
import { VerifyCertificatePage } from './pages/compliance/VerifyCertificatePage';
import { AuditorInspectionPage } from './pages/auditor/AuditorInspectionPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
});

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactElement;
  allowedRoles?: string[];
}) {
  const { isAuthenticated, role } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return role === 'SAFAI_MITRA' ? (
      <Navigate to="/safai-mitra/dashboard" replace />
    ) : (
      <Navigate to="/manager/dashboard" replace />
    );
  }

  return children;
}

function RootRedirect() {
  const { isAuthenticated, role } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role === 'SAFAI_MITRA') {
    return <Navigate to="/safai-mitra/dashboard" replace />;
  }

  return <Navigate to="/manager/dashboard" replace />;
}

import { ThemeProvider } from './context/ThemeContext';

export function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<Login />} />

            {/* Public Compliance QR Code Verification (Workstream F6) */}
            <Route path="/verify-audit/:hash" element={<VerifyCertificatePage />} />

            {/* Time-Limited Auditor Inspection Mode (Workstream N2) */}
            <Route path="/auditor-inspect" element={<AuditorInspectionPage />} />

            {/* Safai Mitra Routes */}
            <Route
              path="/safai-mitra/dashboard"
              element={
                <ProtectedRoute allowedRoles={['SAFAI_MITRA', 'BWG_MANAGER', 'SUPREME_HEAD']}>
                  <SafaiMitraDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/safai-mitra/diary"
              element={
                <ProtectedRoute allowedRoles={['SAFAI_MITRA', 'BWG_MANAGER', 'SUPREME_HEAD']}>
                  <SafaiMitraDiary />
                </ProtectedRoute>
              }
            />
            <Route
              path="/safai-mitra/history"
              element={
                <ProtectedRoute allowedRoles={['SAFAI_MITRA', 'BWG_MANAGER', 'SUPREME_HEAD']}>
                  <SafaiMitraHistory />
                </ProtectedRoute>
              }
            />

            {/* BWG Manager Routes */}
            <Route
              path="/manager/dashboard"
              element={
                <ProtectedRoute allowedRoles={['BWG_MANAGER', 'SUPREME_HEAD']}>
                  <ManagerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/roster"
              element={
                <ProtectedRoute allowedRoles={['BWG_MANAGER', 'SUPREME_HEAD']}>
                  <ManagerRoster />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/telemetry"
              element={
                <ProtectedRoute allowedRoles={['BWG_MANAGER', 'SUPREME_HEAD']}>
                  <ManagerTelemetry />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/ledger"
              element={
                <ProtectedRoute allowedRoles={['BWG_MANAGER', 'SUPREME_HEAD']}>
                  <ManagerLedger />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/assets"
              element={
                <ProtectedRoute allowedRoles={['BWG_MANAGER', 'SUPREME_HEAD']}>
                  <ManagerAssets />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/alerts"
              element={
                <ProtectedRoute allowedRoles={['BWG_MANAGER', 'SUPREME_HEAD']}>
                  <ManagerAlerts />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
export default App;
