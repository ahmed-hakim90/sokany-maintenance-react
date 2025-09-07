import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginFormEnhanced from './components/LoginFormEnhanced';
import Dashboard from './components/Dashboard';
import UsersPage from './pages/UsersPage';
import ServiceCentersPage from './pages/ServiceCentersPage';
import TechniciansPage from './pages/TechniciansPage';
import ProductsPage from './pages/ProductsPage';
import SalesOrdersPage from './pages/SalesOrdersPage';
import MaintenanceRequestsPage from './pages/MaintenanceRequestsPage';
import WarehouseTransfersPage from './pages/WarehouseTransfersPage';
import ReportsPage from './pages/ReportsPage';
import RouteListener from './components/RouteListener';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './App.css';

const RoleHome = (user: any) => {
  if (!user) return '/login';
  if (user.isAdmin) return '/users';
  if (user.centerId) return '/service-centers';
  if (user.role === 'Technician') return '/maintenance';
  if (user.role === 'Store Manager') return '/warehouse';
  return '/';
};

const AppRoutes: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!user) return;
    const lastPath = localStorage.getItem('lastPath');
    const shouldRestore = lastPath && lastPath !== '/login';
    if ((location.pathname === '/' || location.pathname === '/login') && shouldRestore) {
      navigate(lastPath as string, { replace: true });
      return;
    }

    if (location.pathname === '/' || location.pathname === '/login') {
      const home = RoleHome(user);
      if (home !== location.pathname) navigate(home, { replace: true });
    }
  }, [user]);

  return (
    <>
      <RouteListener />
      <Routes>
        <Route path="/login" element={<LoginFormEnhanced />} />
        <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" replace />} />

        <Route path="/users/*" element={user ? <UsersPage /> : <Navigate to="/login" replace />} />
        <Route path="/service-centers/*" element={user ? <ServiceCentersPage /> : <Navigate to="/login" replace />} />
        <Route path="/technicians/*" element={user ? <TechniciansPage /> : <Navigate to="/login" replace />} />
        <Route path="/products/*" element={user ? <ProductsPage /> : <Navigate to="/login" replace />} />
        <Route path="/sales/*" element={user ? <SalesOrdersPage /> : <Navigate to="/login" replace />} />
        <Route path="/maintenance/*" element={user ? <MaintenanceRequestsPage /> : <Navigate to="/login" replace />} />
        <Route path="/warehouse/*" element={user ? <WarehouseTransfersPage /> : <Navigate to="/login" replace />} />
        <Route path="/transfers/:id" element={user ? <WarehouseTransfersPage /> : <Navigate to="/login" replace />} />
        <Route path="/reports/*" element={user ? <ReportsPage /> : <Navigate to="/login" replace />} />

        <Route path="*" element={user ? <Dashboard /> : <Navigate to="/login" replace />} />
      </Routes>
    </>
  );
};

const AppContent: React.FC = () => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
        </div>
        <p>جاري التحميل...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

