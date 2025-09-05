import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginFormEnhanced from './components/LoginFormEnhanced';
import Dashboard from './components/Dashboard';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './App.css';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

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

  if (!user) {
    return <LoginFormEnhanced />;
  }

  return <Dashboard />;
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
