import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SalesPage from './pages/SalesPage';
import ReportsPage from './pages/ReportsPage';
import NewCarSalesPage from './pages/NewCarSalesPage';
import NewCarReportsPage from './pages/NewCarReportsPage';
import UsedCarSalesPage from './pages/UsedCarSalesPage';
import UsedCarReportsPage from './pages/UsedCarReportsPage';
import UsersPage from './pages/UsersPage';
import SalespeoplePage from './pages/SalespeoplePage';
import SettingsPage from './pages/SettingsPage';
import TeamDashboard from './pages/TeamDashboard';
import TeamManagementPage from './pages/TeamManagementPage';
import TeamTracker from './pages/TeamTracker';
import LoveEncoreDashboard from './pages/LoveEncoreDashboard';
import LoveEncoreCustomers from './pages/LoveEncoreCustomers';
import LoveEncoreReports from './pages/LoveEncoreReports';
import { Loader2 } from 'lucide-react';

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return isAdmin ? children : <Navigate to="/" />;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />}
      />
      <Route
        path="/team"
        element={
          <PrivateRoute>
            <TeamDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/teamtracker"
        element={
          <PrivateRoute>
            <TeamTracker />
          </PrivateRoute>
        }
      />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="new-cars/sales" element={<NewCarSalesPage />} />
        <Route path="new-cars/reports" element={<NewCarReportsPage />} />
        <Route path="used-cars/sales" element={<UsedCarSalesPage />} />
        <Route path="used-cars/reports" element={<UsedCarReportsPage />} />
        <Route path="love-encore/dashboard" element={<LoveEncoreDashboard />} />
        <Route path="love-encore/customers" element={<LoveEncoreCustomers />} />
        <Route path="love-encore/reports" element={<LoveEncoreReports />} />
        <Route path="sales" element={<SalesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route
          path="users"
          element={
            <AdminRoute>
              <UsersPage />
            </AdminRoute>
          }
        />
        <Route
          path="salespeople"
          element={
            <AdminRoute>
              <SalespeoplePage />
            </AdminRoute>
          }
        />
        <Route
          path="teams"
          element={
            <AdminRoute>
              <TeamManagementPage />
            </AdminRoute>
          }
        />
        <Route
          path="settings"
          element={
            <AdminRoute>
              <SettingsPage />
            </AdminRoute>
          }
        />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
