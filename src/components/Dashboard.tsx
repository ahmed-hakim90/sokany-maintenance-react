import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import InventoryManagement from './InventoryManagement';
import UserManagement from './UserManagement';
import CenterManagement from './CenterManagement';
import SalesManagement from './SalesManagement';
import MaintenanceManagement from './MaintenanceManagement';
import Reports from './Reports';
import DataManager from './DataManager';
import SessionInfo from './SessionInfo';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const { user, logout, updateLastActivity } = useAuth();
  const [activeSection, setActiveSection] = useState<string>('dashboard');

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleNavigation = (section: string) => {
    setActiveSection(section);
    updateLastActivity(); // تحديث آخر نشاط عند التنقل
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'inventory':
        return <InventoryManagement />;
      case 'sales':
        return <SalesManagement />;
      case 'maintenance':
        return <MaintenanceManagement />;
      case 'users':
        return <UserManagement />;
      case 'centers':
        return <CenterManagement />;
      case 'reports':
        return <Reports />;
      case 'data-manager':
        return <DataManager />;
      default:
        return renderDashboardHome();
    }
  };

  const renderDashboardHome = () => (
    <>
      <main className="dashboard-main">
        <div className="dashboard-cards">
          <div className="card" onClick={() => handleNavigation('inventory')}>
            <div className="card-icon">
              <i className="fas fa-boxes"></i>
            </div>
            <div className="card-content">
              <h3>إدارة المخزون</h3>
              <p>عرض وإدارة عناصر المخزون</p>
            </div>
          </div>

          <div className="card" onClick={() => handleNavigation('sales')}>
            <div className="card-icon">
              <i className="fas fa-shopping-cart"></i>
            </div>
            <div className="card-content">
              <h3>المبيعات</h3>
              <p>تسجيل ومراجعة المبيعات</p>
            </div>
          </div>

          <div className="card" onClick={() => handleNavigation('maintenance')}>
            <div className="card-icon">
              <i className="fas fa-tools"></i>
            </div>
            <div className="card-content">
              <h3>طلبات الصيانة</h3>
              <p>إدارة طلبات الصيانة</p>
            </div>
          </div>

          {user?.isAdmin && (
            <>
              <div className="card" onClick={() => handleNavigation('centers')}>
                <div className="card-icon">
                  <i className="fas fa-building"></i>
                </div>
                <div className="card-content">
                  <h3>إدارة المراكز</h3>
                  <p>إضافة وإدارة المراكز</p>
                </div>
              </div>

              <div className="card" onClick={() => handleNavigation('users')}>
                <div className="card-icon">
                  <i className="fas fa-users"></i>
                </div>
                <div className="card-content">
                  <h3>إدارة المستخدمين</h3>
                  <p>إضافة وإدارة المستخدمين</p>
                </div>
              </div>

              <div className="card" onClick={() => handleNavigation('reports')}>
                <div className="card-icon">
                  <i className="fas fa-chart-bar"></i>
                </div>
                <div className="card-content">
                  <h3>التقارير</h3>
                  <p>عرض التقارير والإحصائيات</p>
                </div>
              </div>

              <div className="card data-manager-card" onClick={() => handleNavigation('data-manager')}>
                <div className="card-icon">
                  <i className="fas fa-database"></i>
                </div>
                <div className="card-content">
                  <h3>إدارة البيانات التجريبية</h3>
                  <p>إنشاء وإدارة بيانات الاختبار</p>
                </div>
              </div>
            </>
            
          )}
        </div>
      </main>
    </>
  );

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1 onClick={() => handleNavigation('dashboard')} style={{ cursor: 'pointer' }}>
            <i className="fas fa-warehouse"></i>
            نظام إدارة المخزون
          </h1>
          <div className="user-info">
            <span>
              مرحباً، {user?.isAdmin ? 'المسؤول' : user?.email || 'المستخدم'}
            </span>
            <button onClick={handleLogout} className="logout-btn">
              <i className="fas fa-sign-out-alt"></i>
              تسجيل خروج
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Bar */}
      <nav className="navigation-bar">
        <div className="nav-content">
          <button 
            className={`nav-btn ${activeSection === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleNavigation('dashboard')}
          >
            <i className="fas fa-home"></i>
            الرئيسية
          </button>
          <button 
            className={`nav-btn ${activeSection === 'inventory' ? 'active' : ''}`}
            onClick={() => handleNavigation('inventory')}
          >
            <i className="fas fa-boxes"></i>
            المخزون
          </button>
          <button 
            className={`nav-btn ${activeSection === 'sales' ? 'active' : ''}`}
            onClick={() => handleNavigation('sales')}
          >
            <i className="fas fa-shopping-cart"></i>
            المبيعات
          </button>
          <button 
            className={`nav-btn ${activeSection === 'maintenance' ? 'active' : ''}`}
            onClick={() => handleNavigation('maintenance')}
          >
            <i className="fas fa-tools"></i>
            الصيانة
          </button>
          {user?.isAdmin && (
            <>
              <button 
                className={`nav-btn ${activeSection === 'centers' ? 'active' : ''}`}
                onClick={() => handleNavigation('centers')}
              >
                <i className="fas fa-building"></i>
                المراكز
              </button>
              <button 
                className={`nav-btn ${activeSection === 'users' ? 'active' : ''}`}
                onClick={() => handleNavigation('users')}
              >
                <i className="fas fa-users"></i>
                المستخدمين
              </button>
              <button 
                className={`nav-btn ${activeSection === 'reports' ? 'active' : ''}`}
                onClick={() => handleNavigation('reports')}
              >
                <i className="fas fa-chart-bar"></i>
                التقارير
              </button>
              <button 
                className={`nav-btn ${activeSection === 'data-manager' ? 'active' : ''}`}
                onClick={() => handleNavigation('data-manager')}
                style={{ background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)' }}
              >
                <i className="fas fa-database"></i>
                البيانات التجريبية
              </button>
            </>
          )}
        </div>
      </nav>

      {renderActiveSection()}

      {/* Session Info للتطوير */}
      <SessionInfo />
    </div>
  );
};

export default Dashboard;
