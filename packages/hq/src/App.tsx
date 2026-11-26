import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { ThemeProvider } from '@/context/ThemeContext';
import HQLayout from '@/components/layout/HQLayout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import DataLake from '@/pages/DataLake';
import OnboardClient from '@/pages/OnboardClient';
import FleetManagement from '@/pages/FleetManagement';
import Compliance from '@/pages/Compliance';
import Configuration from '@/pages/Configuration';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HQLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="data-lake" element={<DataLake />} />
            <Route path="onboard" element={<OnboardClient />} />
            <Route path="fleet" element={<FleetManagement />} />
            <Route path="compliance" element={<Compliance />} />
            <Route path="configuration" element={<Configuration />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
