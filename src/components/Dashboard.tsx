import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import adapter from '../config/firebase';
const { db } = adapter;
import { useAuth } from '../contexts/AuthContext';
import InventoryManagement from './InventoryManagement';
import CenterManagement from './CenterManagement';
import SalesManagement from './SalesManagement';
import MaintenanceManagementNew from './MaintenanceManagementNew';
import TechnicianManagement from './TechnicianManagement';
import CustomerManagement from './CustomerManagement';
import GlobalActivities from './GlobalActivities';
import RecentActivitiesWidget from './RecentActivitiesWidget';
import ActivityNotification from './ActivityNotification';
import Reports from './Reports';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const { user, logout, updateLastActivity } = useAuth();
  const [activeSection, setActiveSection] = useState<string>('dashboard');
  const [employeeName, setEmployeeName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchType, setSearchType] = useState<string>('all');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  useEffect(() => {
    const loadManagerName = async () => {
      if (!user || user.isAdmin) {
        setEmployeeName('');
        return;
      }
      try {
        const stored = localStorage.getItem('currentCenter');
        if (stored) {
          const center = JSON.parse(stored);
          if (center.managerName) {
            setEmployeeName(center.managerName);
            return;
          }
        }
        if (user.centerId) {
          const rows = await db.getDocs('centers', { eq: { field: 'id', value: user.centerId }, limit: 1 });
          const data: any = rows && rows.length ? rows[0] : null;
          if (data?.managerName) setEmployeeName(data.managerName);
        }
      } catch (e) {
        console.warn('تعذر جلب اسم الموظف:', e);
      }
    };
    loadManagerName();
  }, [user]);

  // Router integration: navigate when sections change and restore section from URL
  const navigate = useNavigate();
  const location = useLocation();

  const sectionToPath = (section: string) => {
    switch (section) {
      case 'inventory': return '/products';
      case 'sales': return '/sales';
      case 'maintenance': return '/maintenance';
      case 'technicians': return '/technicians';
      case 'customers': return '/users';
      case 'centers': return '/service-centers';
      case 'reports': return '/reports';
      case 'activities': return '/reports';
      default: return '/';
    }
  };

  const pathToSection = (path: string) => {
    if (path.startsWith('/products') || path.startsWith('/inventory')) return 'inventory';
    if (path.startsWith('/sales')) return 'sales';
    if (path.startsWith('/maintenance')) return 'maintenance';
    if (path.startsWith('/technicians')) return 'technicians';
    if (path.startsWith('/users') || path.startsWith('/customers')) return 'customers';
    if (path.startsWith('/service-centers') || path.startsWith('/centers')) return 'centers';
    if (path.startsWith('/reports')) return 'reports';
    return 'dashboard';
  };

  useEffect(() => {
    // keep internal activeSection in sync with the current URL on load / navigation
    const s = pathToSection(location.pathname);
    setActiveSection(s);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleNavigation = (section: string) => {
    setActiveSection(section);
    updateLastActivity();
    try {
      const path = sectionToPath(section);
      navigate(path);
    } catch (e) {
      // ignore navigation errors
    }
  };

  const handleSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results: any[] = [];

      // البحث في الفنيين
      if (searchType === 'all' || searchType === 'technicians') {
        if (user?.isAdmin) {
          // للمدير: البحث في جميع المراكز
          const centersSnapshot = await getDocs(collection(db, 'centers'));
          for (const centerDoc of centersSnapshot.docs) {
            const technicianSnapshot = await getDocs(
              collection(db, 'centers', centerDoc.id, 'technicians')
            );
            technicianSnapshot.forEach((doc) => {
              const data = doc.data() as any;
              if (data.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                data.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                data.phone?.includes(searchTerm)) {
                results.push({
                  id: doc.id,
                  type: 'فني',
                  name: data.name,
                  email: data.email,
                  phone: data.phone,
                  centerName: centerDoc.data().name,
                  action: () => handleNavigation('technicians')
                });
              }
            });
          }
        } else {
          // للمستخدم العادي: البحث في مركزه فقط
          if (user?.centerId) {
            const technicianSnapshot = await getDocs(
              collection(db, 'centers', user.centerId, 'technicians')
            );
            technicianSnapshot.forEach((doc) => {
              const data = doc.data() as any;
              if (data.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                data.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                data.phone?.includes(searchTerm)) {
                results.push({
                  id: doc.id,
                  type: 'فني',
                  name: data.name,
                  email: data.email,
                  phone: data.phone,
                  action: () => handleNavigation('technicians')
                });
              }
            });
          }
        }
      }

      // البحث في العملاء
      if (searchType === 'all' || searchType === 'customers') {
        if (user?.isAdmin) {
          // للمدير: البحث في جميع المراكز
          const centersSnapshot = await getDocs(collection(db, 'centers'));
          for (const centerDoc of centersSnapshot.docs) {
            const customerSnapshot = await getDocs(
              collection(db, 'centers', centerDoc.id, 'customers')
            );
            customerSnapshot.forEach((doc) => {
              const data = doc.data() as any;
              if (data.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                data.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                data.phone?.includes(searchTerm)) {
                results.push({
                  id: doc.id,
                  type: 'عميل',
                  name: data.name,
                  email: data.email,
                  phone: data.phone,
                  centerName: centerDoc.data().name,
                  action: () => handleNavigation('customers')
                });
              }
            });
          }
        } else {
          // للمستخدم العادي: البحث في مركزه فقط
          if (user?.centerId) {
            const customerSnapshot = await getDocs(
              collection(db, 'centers', user.centerId, 'customers')
            );
            customerSnapshot.forEach((doc) => {
              const data = doc.data() as any;
              if (data.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                data.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                data.phone?.includes(searchTerm)) {
                results.push({
                  id: doc.id,
                  type: 'عميل',
                  name: data.name,
                  email: data.email,
                  phone: data.phone,
                  action: () => handleNavigation('customers')
                });
              }
            });
          }
        }
      }

      // البحث في قطع الغيار
      if (searchType === 'all' || searchType === 'inventory') {
        if (user?.isAdmin) {
          // للمدير: البحث في جميع المراكز
          const centersSnapshot = await getDocs(collection(db, 'centers'));
          for (const centerDoc of centersSnapshot.docs) {
            const inventorySnapshot = await getDocs(
              collection(db, 'centers', centerDoc.id, 'inventory')
            );
            inventorySnapshot.forEach((doc) => {
              const data = doc.data() as any;
              if (data.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                data.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                data.code?.toLowerCase().includes(searchTerm.toLowerCase())) {
                results.push({
                  id: doc.id,
                  type: 'قطعة غيار',
                  name: data.name,
                  category: data.category,
                  code: data.code,
                  quantity: data.quantity,
                  centerName: centerDoc.data().name,
                  action: () => handleNavigation('inventory')
                });
              }
            });
          }
        } else {
          // للمستخدم العادي: البحث في مركزه فقط
          if (user?.centerId) {
            const inventorySnapshot = await getDocs(
              collection(db, 'centers', user.centerId, 'inventory')
            );
            inventorySnapshot.forEach((doc) => {
              const data = doc.data() as any;
              if (data.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                data.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                data.code?.toLowerCase().includes(searchTerm.toLowerCase())) {
                results.push({
                  id: doc.id,
                  type: 'قطعة غيار',
                  name: data.name,
                  category: data.category,
                  code: data.code,
                  quantity: data.quantity,
                  action: () => handleNavigation('inventory')
                });
              }
            });
          }
        }
      }

      setSearchResults(results);
    } catch (error) {
      console.error('خطأ في البحث:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
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
      case 'centers':
        return <CenterManagement />;
      case 'activities':
        return user?.isAdmin ? <GlobalActivities /> : renderDashboardHome();
      case 'reports':
        return <Reports />;
      default:
        return renderDashboardHome();
    }
  };

  const renderDashboardHome = () => (
    <>
      <main className="dashboard-main">
        {/* شريط البحث */}
        <div className="search-section">
          <div className="search-controls">
            <div className="search-input-group">
              <input
                type="text"
                placeholder="البحث عن فني، عميل أو قطعة غيار..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
                className="search-input"
              />
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                className="search-type-select"
              >
                <option value="all">الكل</option>
                <option value="technicians">الفنيين</option>
                <option value="customers">العملاء</option>
                <option value="inventory">قطع الغيار</option>
              </select>
              <button
                onClick={() => handleSearch(searchQuery)}
                disabled={isSearching}
                className="search-btn"
              >
                {isSearching ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  <i className="fas fa-search"></i>
                )}
              </button>
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="clear-search-btn"
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>
          </div>

          {/* نتائج البحث */}
          {searchResults.length > 0 && (
            <div className="search-results">
              <h4>نتائج البحث ({searchResults.length})</h4>
              <div className="search-results-grid">
                {searchResults.map((result) => (
                  <div key={result.id} className="search-result-card" onClick={result.action}>
                    <div className="result-type">{result.type}</div>
                    <h5>{result.name}</h5>
                    {result.centerName && user?.isAdmin && <p><i className="fas fa-building"></i> {result.centerName}</p>}
                    {result.email && <p><i className="fas fa-envelope"></i> {result.email}</p>}
                    {result.phone && <p><i className="fas fa-phone"></i> {result.phone}</p>}
                    {result.category && <p><i className="fas fa-tag"></i> {result.category}</p>}
                    {result.code && <p><i className="fas fa-barcode"></i> {result.code}</p>}
                    {result.quantity !== undefined && <p><i className="fas fa-cubes"></i> الكمية: {result.quantity}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {searchQuery && !isSearching && searchResults.length === 0 && (
            <div className="no-search-results">
              <i className="fas fa-search"></i>
              <p>لم يتم العثور على نتائج للبحث "{searchQuery}"</p>
            </div>
          )}
        </div>

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

          {user?.isAdmin && (
            <div className="card" onClick={() => handleNavigation('activities')}>
              <div className="card-icon">
                <i className="fas fa-list-alt"></i>
              </div>
              <div className="card-content">
                <h3>الأنشطة العمومية</h3>
                <p>عرض جميع الأنشطة والعمليات في النظام</p>
              </div>
            </div>
          )}

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

              <div className="card" onClick={() => handleNavigation('reports')}>
                <div className="card-icon">
                  <i className="fas fa-chart-bar"></i>
                </div>
                <div className="card-content">
                  <h3>التقارير</h3>
                  <p>عرض تقارير مفصلة</p>
                </div>
              </div>
            </>
          )}
        </div>

        {user?.isAdmin && <RecentActivitiesWidget />}
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

      <div className="main-layout">
        {/* Sidebar Navigation */}
        <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          {/* Toggle Button */}
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'توسيع الشريط الجانبي' : 'طي الشريط الجانبي'}
          >
            <i className={`fas ${sidebarCollapsed ? 'fa-chevron-left' : 'fa-chevron-right'}`}></i>
          </button>

          <nav className="sidebar-nav">
            <button
              className={`nav-btn ${activeSection === 'dashboard' ? 'active' : ''}`}
              onClick={() => handleNavigation('dashboard')}
              title="الرئيسية"
            >
              <i className="fas fa-home"></i>
              <span className="nav-text">الرئيسية</span>
            </button>

            <button
              className={`nav-btn ${activeSection === 'inventory' ? 'active' : ''}`}
              onClick={() => handleNavigation('inventory')}
              title="المخزون"
            >
              <i className="fas fa-boxes"></i>
              <span className="nav-text">المخزون</span>
            </button>

            <button
              className={`nav-btn ${activeSection === 'sales' ? 'active' : ''}`}
              onClick={() => handleNavigation('sales')}
              title="المبيعات"
            >
              <i className="fas fa-shopping-cart"></i>
              <span className="nav-text">المبيعات</span>
            </button>

            <button
              className={`nav-btn ${activeSection === 'maintenance' ? 'active' : ''}`}
              onClick={() => handleNavigation('maintenance')}
              title="الصيانة"
            >
              <i className="fas fa-tools"></i>
              <span className="nav-text">الصيانة</span>
            </button>

            <button
              className={`nav-btn ${activeSection === 'technicians' ? 'active' : ''}`}
              onClick={() => handleNavigation('technicians')}
              title="الفنيين"
            >
              <i className="fas fa-user-cog"></i>
              <span className="nav-text">الفنيين</span>
            </button>

            <button
              className={`nav-btn ${activeSection === 'customers' ? 'active' : ''}`}
              onClick={() => handleNavigation('customers')}
              title="العملاء"
            >
              <i className="fas fa-address-book"></i>
              <span className="nav-text">العملاء</span>
            </button>

            {user?.isAdmin && (
              <>
                <button
                  className={`nav-btn ${activeSection === 'activities' ? 'active' : ''}`}
                  onClick={() => handleNavigation('activities')}
                  title="الأنشطة العمومية"
                >
                  <i className="fas fa-list-alt"></i>
                  <span className="nav-text">الأنشطة العمومية</span>
                </button>

                <button
                  className={`nav-btn ${activeSection === 'centers' ? 'active' : ''}`}
                  onClick={() => handleNavigation('centers')}
                  title="المراكز"
                >
                  <i className="fas fa-building"></i>
                  <span className="nav-text">المراكز</span>
                </button>

                <button
                  className={`nav-btn ${activeSection === 'reports' ? 'active' : ''}`}
                  onClick={() => handleNavigation('reports')}
                  title="التقارير"
                >
                  <i className="fas fa-chart-bar"></i>
                  <span className="nav-text">التقارير</span>
                </button>
              </>
            )}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          {renderActiveSection()}
        </main>
      </div>
      {/* <SessionInfo /> */}
      <ActivityNotification />
    </div>
  );
};

export default Dashboard;
