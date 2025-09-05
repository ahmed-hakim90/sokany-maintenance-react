import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import InventoryManagement from './InventoryManagement';
import CenterManagement from './CenterManagement';
import SalesManagement from './SalesManagement';
import MaintenanceManagementNew from './MaintenanceManagementNew';
import TechnicianManagement from './TechnicianManagement';
import CustomerManagement from './CustomerManagement';
import CenterSessionManagement from './CenterSessionManagement';
import AllCentersSessions from './AllCentersSessions';
import Reports from './Reports';
// DataManager تمت إزالتها (البيانات التجريبية حذفت)
import SessionInfo from './SessionInfo';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const { user, logout, updateLastActivity } = useAuth();
  const [activeSection, setActiveSection] = useState<string>('dashboard');
  const [employeeName, setEmployeeName] = useState<string>('');

  // جلب اسم الموظف (managerName) عند توفر المستخدم
  useEffect(() => {
    const loadManagerName = async () => {
      if (!user || user.isAdmin) {
        setEmployeeName('');
        return;
      }
      // حاول أولاً من localStorage
      try {
        const stored = localStorage.getItem('currentCenter');
        if (stored) {
          const center = JSON.parse(stored);
          if (center.managerName) {
            setEmployeeName(center.managerName);
            return;
          }
        }
        // fallback Firestore
        if (user.centerId) {
          const snap = await getDoc(doc(db, 'centers', user.centerId));
            if (snap.exists()) {
              const data: any = snap.data();
              if (data.managerName) {
                setEmployeeName(data.managerName);
              }
            }
        }
      } catch (e) {
        console.warn('تعذر جلب اسم الموظف:', e);
      }
    };
    loadManagerName();
  }, [user]);

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
        return <MaintenanceManagementNew />;
      case 'technicians':
        return <TechnicianManagement />;
      case 'customers':
        return <CustomerManagement />;
      case 'session':
        return <CenterSessionManagement />;
      case 'centers':
        return <CenterManagement />;
      case 'all-sessions':
        return <AllCentersSessions />;
      case 'reports':
        return <Reports />;
  // تم حذف صفحة إدارة البيانات التجريبية
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

          <div className="card" onClick={() => handleNavigation('technicians')}>
            <div className="card-icon">
              <i className="fas fa-user-cog"></i>
            </div>
            <div className="card-content">
              <h3>إدارة الفنيين</h3>
              <p>إضافة وإدارة الفنيين</p>
            </div>
          </div>

          <div className="card" onClick={() => handleNavigation('customers')}>
            <div className="card-icon">
              <i className="fas fa-users"></i>
            </div>
            <div className="card-content">
              <h3>إدارة العملاء</h3>
              <p>إضافة وإدارة العملاء</p>
            </div>
          </div>

          <div className="card" onClick={() => handleNavigation('session')}>
            <div className="card-icon">
              <i className="fas fa-clock"></i>
            </div>
            <div className="card-content">
              <h3>جلسة المركز</h3>
              <p>تتبع الأنشطة والجلسة الحالية</p>
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

              <div className="card" onClick={() => handleNavigation('all-sessions')}>
                <div className="card-icon">
                  <i className="fas fa-chart-line"></i>
                </div>
                <div className="card-content">
                  <h3>جلسات جميع المراكز</h3>
                  <p>عرض تفصيلي لجميع الجلسات</p>
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

              {/* بطاقة إدارة البيانات التجريبية محذوفة */}
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
              {user?.isAdmin
                ? 'مرحباً، المسؤول'
                : employeeName
                  ? `مرحباً، ${employeeName}`
                  : `مرحباً، ${user?.email || 'المستخدم'}`}
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
          <button 
            className={`nav-btn ${activeSection === 'technicians' ? 'active' : ''}`}
            onClick={() => handleNavigation('technicians')}
          >
            <i className="fas fa-user-cog"></i>
            الفنيين
          </button>
          <button 
            className={`nav-btn ${activeSection === 'customers' ? 'active' : ''}`}
            onClick={() => handleNavigation('customers')}
          >
            <i className="fas fa-address-book"></i>
            العملاء
          </button>
          <button 
            className={`nav-btn ${activeSection === 'session' ? 'active' : ''}`}
            onClick={() => handleNavigation('session')}
          >
            <i className="fas fa-clock"></i>
            جلسة المركز
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
                className={`nav-btn ${activeSection === 'all-sessions' ? 'active' : ''}`}
                onClick={() => handleNavigation('all-sessions')}
              >
                <i className="fas fa-chart-line"></i>
                جلسات المراكز
              </button>
              <button 
                className={`nav-btn ${activeSection === 'reports' ? 'active' : ''}`}
                onClick={() => handleNavigation('reports')}
              >
                <i className="fas fa-chart-bar"></i>
                التقارير
              </button>
              {/* زر البيانات التجريبية محذوف داخل لوحة المدير */}
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
