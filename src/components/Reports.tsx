import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { InventoryItem, Sale, MaintenanceRecord, Center } from '../types';
import './Reports.css';

interface ReportStats {
  totalItems: number;
  totalSales: number;
  totalMaintenance: number;
  completedMaintenance: number;
  pendingMaintenance: number;
  lowStockItems: number;
  totalRevenue: number;
  totalTechnicians: number;
  totalCustomers: number;
  centerStats: {
    [centerId: string]: {
      centerName: string;
      items: number;
      sales: number;
      maintenance: number;
      revenue: number;
      technicians: number;
      customers: number;
    };
  };
  technicianStats: {
    [technicianName: string]: {
      completed: number;
      pending: number;
      inProgress: number;
    };
  };
  customerStats: {
    [customerName: string]: {
      totalPurchases: number;
      totalSpent: number;
      maintenanceRequests: number;
      type: string;
    };
  };
  maintenanceByStatus: {
    [status: string]: number;
  };
  warrantyStats: {
    inWarranty: number;
    outOfWarranty: number;
  };
  partsUsed: {
    [itemName: string]: number;
  };
  topSellingItems: {
    [itemName: string]: { quantity: number; revenue: number };
  };
  topMaintenanceItems: {
    [itemName: string]: number;
  };
  monthlyTrends: {
    [month: string]: { sales: number; maintenance: number; revenue: number };
  };
  maintenanceDetails: {
    byCustomer: { [customerName: string]: number };
    byDevice: { [deviceName: string]: number };
    estimatedCosts: { [status: string]: number };
  };
}

const Reports: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [stats, setStats] = useState<ReportStats>({
    totalItems: 0,
    totalSales: 0,
    totalMaintenance: 0,
    completedMaintenance: 0,
    pendingMaintenance: 0,
    lowStockItems: 0,
    totalRevenue: 0,
    totalTechnicians: 0,
    totalCustomers: 0,
    centerStats: {},
    technicianStats: {},
    customerStats: {},
    maintenanceByStatus: {},
    warrantyStats: {
      inWarranty: 0,
      outOfWarranty: 0
    },
    partsUsed: {},
    topSellingItems: {},
    topMaintenanceItems: {},
    monthlyTrends: {},
    maintenanceDetails: {
      byCustomer: {},
      byDevice: {},
      estimatedCosts: {}
    }
  });
  const [loading, setLoading] = useState(true);
  const [centers, setCenters] = useState<Center[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('all');

  useEffect(() => {
    loadReportsData();
  }, [currentUser, selectedPeriod]);

  const loadReportsData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadCenters(),
        loadInventoryStats(),
        loadSalesStats(),
        loadMaintenanceStats()
      ]);
    } catch (error) {
      console.error('Error loading reports data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCenters = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'centers'));
      const centersData: Center[] = [];
      snapshot.forEach(doc => {
        centersData.push({ id: doc.id, ...doc.data() } as Center);
      });
      setCenters(centersData);
    } catch (error) {
      console.error('Error loading centers:', error);
    }
  };

  const loadInventoryStats = async () => {
    try {
      let inventoryQuery = collection(db, 'inventory');
      
      // Filter by center if not admin
      if (!currentUser?.isAdmin && currentUser?.centerId) {
        inventoryQuery = collection(db, 'inventory');
      }

      const snapshot = await getDocs(inventoryQuery);
      const items: InventoryItem[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        items.push({ id: doc.id, ...data } as InventoryItem);
      });

      // Filter items based on user role and selected center
      const filteredItems = currentUser?.isAdmin 
        ? items 
        : items.filter(item => item.centerId === currentUser?.centerId);

      const lowStockItems = filteredItems.filter(item => item.quantity < 10).length;

      setStats(prevStats => ({
        ...prevStats,
        totalItems: filteredItems.length,
        lowStockItems
      }));

      // Calculate center-wise inventory stats
      const centerInventoryStats: { [centerId: string]: number } = {};
      filteredItems.forEach(item => {
        centerInventoryStats[item.centerId] = (centerInventoryStats[item.centerId] || 0) + 1;
      });

      setStats(prevStats => {
        const updatedCenterStats = { ...prevStats.centerStats };
        Object.keys(centerInventoryStats).forEach(centerId => {
          if (!updatedCenterStats[centerId]) {
            const center = centers.find(c => c.id === centerId);
            updatedCenterStats[centerId] = {
              centerName: center?.name || 'غير محدد',
              items: 0,
              sales: 0,
              maintenance: 0,
              revenue: 0,
              technicians: 0,
              customers: 0
            };
          }
          updatedCenterStats[centerId].items = centerInventoryStats[centerId];
        });
        return { ...prevStats, centerStats: updatedCenterStats };
      });
    } catch (error) {
      console.error('Error loading inventory stats:', error);
    }
  };

  const loadSalesStats = async () => {
    try {
      const salesQuery = !currentUser?.isAdmin && currentUser?.centerId
        ? query(collection(db, 'sales'), where('centerId', '==', currentUser.centerId))
        : collection(db, 'sales');

      const snapshot = await getDocs(salesQuery);
      const sales: Sale[] = [];
      let totalRevenue = 0;
      const topSellingItems: { [itemName: string]: { quantity: number; revenue: number } } = {};
      const monthlyTrends: { [month: string]: { sales: number; maintenance: number; revenue: number } } = {};
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const sale = { id: doc.id, ...data, date: data.date.toDate() } as Sale;
        
        // Apply date filter if needed
        if (selectedPeriod !== 'all') {
          const saleDate = sale.date;
          const now = new Date();
          const daysDiff = Math.floor((now.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (selectedPeriod === 'week' && daysDiff > 7) return;
          if (selectedPeriod === 'month' && daysDiff > 30) return;
          if (selectedPeriod === 'year' && daysDiff > 365) return;
        }
        
        sales.push(sale);
        totalRevenue += sale.totalPrice;

        // Calculate top selling items
        if (!topSellingItems[sale.itemName]) {
          topSellingItems[sale.itemName] = { quantity: 0, revenue: 0 };
        }
        topSellingItems[sale.itemName].quantity += sale.quantity;
        topSellingItems[sale.itemName].revenue += sale.totalPrice;

        // Calculate monthly trends
        const monthKey = sale.date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' });
        if (!monthlyTrends[monthKey]) {
          monthlyTrends[monthKey] = { sales: 0, maintenance: 0, revenue: 0 };
        }
        monthlyTrends[monthKey].sales++;
        monthlyTrends[monthKey].revenue += sale.totalPrice;
      });

      setStats(prevStats => ({
        ...prevStats,
        totalSales: sales.length,
        totalRevenue,
        topSellingItems,
        monthlyTrends: { ...prevStats.monthlyTrends, ...monthlyTrends }
      }));

      // Calculate center-wise sales stats
      const centerSalesStats: { [centerId: string]: { count: number; revenue: number } } = {};
      sales.forEach(sale => {
        if (!centerSalesStats[sale.centerId]) {
          centerSalesStats[sale.centerId] = { count: 0, revenue: 0 };
        }
        centerSalesStats[sale.centerId].count++;
        centerSalesStats[sale.centerId].revenue += sale.totalPrice;
      });

      setStats(prevStats => {
        const updatedCenterStats = { ...prevStats.centerStats };
        Object.keys(centerSalesStats).forEach(centerId => {
          if (!updatedCenterStats[centerId]) {
            const center = centers.find(c => c.id === centerId);
            updatedCenterStats[centerId] = {
              centerName: center?.name || 'غير محدد',
              items: 0,
              sales: 0,
              maintenance: 0,
              revenue: 0,
              technicians: 0,
              customers: 0
            };
          }
          updatedCenterStats[centerId].sales = centerSalesStats[centerId].count;
          updatedCenterStats[centerId].revenue = centerSalesStats[centerId].revenue;
        });
        return { ...prevStats, centerStats: updatedCenterStats };
      });
    } catch (error) {
      console.error('Error loading sales stats:', error);
    }
  };

  const loadMaintenanceStats = async () => {
    try {
      const maintenanceQuery = !currentUser?.isAdmin && currentUser?.centerId
        ? query(collection(db, 'maintenance'), where('centerId', '==', currentUser.centerId))
        : collection(db, 'maintenance');

      const snapshot = await getDocs(maintenanceQuery);
      const maintenanceRecords: MaintenanceRecord[] = [];
      const topMaintenanceItems: { [itemName: string]: number } = {};
      const maintenanceDetails = {
        byCustomer: {} as { [customerName: string]: number },
        byDevice: {} as { [deviceName: string]: number },
        estimatedCosts: {} as { [status: string]: number }
      };
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const maintenance = { id: doc.id, ...data, date: data.date.toDate() } as MaintenanceRecord;
        
        // Apply date filter if needed
        if (selectedPeriod !== 'all') {
          const maintenanceDate = maintenance.date;
          const now = new Date();
          const daysDiff = Math.floor((now.getTime() - maintenanceDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (selectedPeriod === 'week' && daysDiff > 7) return;
          if (selectedPeriod === 'month' && daysDiff > 30) return;
          if (selectedPeriod === 'year' && daysDiff > 365) return;
        }
        
        maintenanceRecords.push(maintenance);

        // Calculate top maintenance items
        topMaintenanceItems[maintenance.itemName] = (topMaintenanceItems[maintenance.itemName] || 0) + maintenance.quantity;

        // Calculate maintenance details
        maintenanceDetails.byCustomer[maintenance.customerName] = (maintenanceDetails.byCustomer[maintenance.customerName] || 0) + 1;
        maintenanceDetails.byDevice[maintenance.deviceName] = (maintenanceDetails.byDevice[maintenance.deviceName] || 0) + 1;
        
        if (maintenance.estimatedCost) {
          maintenanceDetails.estimatedCosts[maintenance.status] = (maintenanceDetails.estimatedCosts[maintenance.status] || 0) + maintenance.estimatedCost;
        }

        // Add to monthly trends
        const monthKey = maintenance.date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' });
        setStats(prevStats => {
          const updatedTrends = { ...prevStats.monthlyTrends };
          if (!updatedTrends[monthKey]) {
            updatedTrends[monthKey] = { sales: 0, maintenance: 0, revenue: 0 };
          }
          updatedTrends[monthKey].maintenance++;
          return { ...prevStats, monthlyTrends: updatedTrends };
        });
      });

      const completedMaintenance = maintenanceRecords.filter(m => m.status === 'تم الصيانة').length;
      const pendingMaintenance = maintenanceRecords.length - completedMaintenance;

      // Calculate maintenance by status
      const maintenanceByStatus: { [status: string]: number } = {};
      maintenanceRecords.forEach(maintenance => {
        maintenanceByStatus[maintenance.status] = (maintenanceByStatus[maintenance.status] || 0) + 1;
      });

      // Calculate technician stats
      const technicianStats: { [technicianName: string]: { completed: number; pending: number; inProgress: number } } = {};
      maintenanceRecords.forEach(maintenance => {
        if (!technicianStats[maintenance.technicianName]) {
          technicianStats[maintenance.technicianName] = { completed: 0, pending: 0, inProgress: 0 };
        }
        if (maintenance.status === 'تم الصيانة') {
          technicianStats[maintenance.technicianName].completed++;
        } else if (maintenance.status === 'في انتظار الفني') {
          technicianStats[maintenance.technicianName].inProgress++;
        } else {
          technicianStats[maintenance.technicianName].pending++;
        }
      });

      // Calculate parts used in maintenance
      const partsUsed: { [itemName: string]: number } = {};
      maintenanceRecords.forEach(maintenance => {
        partsUsed[maintenance.itemName] = (partsUsed[maintenance.itemName] || 0) + maintenance.quantity;
      });

      setStats(prevStats => ({
        ...prevStats,
        totalMaintenance: maintenanceRecords.length,
        completedMaintenance,
        pendingMaintenance,
        technicianStats,
        maintenanceByStatus,
        partsUsed,
        topMaintenanceItems,
        maintenanceDetails
      }));

      // Calculate center-wise maintenance stats
      const centerMaintenanceStats: { [centerId: string]: number } = {};
      maintenanceRecords.forEach(maintenance => {
        centerMaintenanceStats[maintenance.centerId] = (centerMaintenanceStats[maintenance.centerId] || 0) + 1;
      });

      setStats(prevStats => {
        const updatedCenterStats = { ...prevStats.centerStats };
        Object.keys(centerMaintenanceStats).forEach(centerId => {
          if (!updatedCenterStats[centerId]) {
            const center = centers.find(c => c.id === centerId);
            updatedCenterStats[centerId] = {
              centerName: center?.name || 'غير محدد',
              items: 0,
              sales: 0,
              maintenance: 0,
              revenue: 0,
              technicians: 0,
              customers: 0
            };
          }
          updatedCenterStats[centerId].maintenance = centerMaintenanceStats[centerId];
        });
        return { ...prevStats, centerStats: updatedCenterStats };
      });
    } catch (error) {
      console.error('Error loading maintenance stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <i className="fas fa-spinner fa-spin"></i>
        <p>جاري تحميل التقارير...</p>
      </div>
    );
  }

  return (
    <div className="reports">
      <div className="page-header">
        <h1>
          <i className="fas fa-chart-bar"></i>
          التقارير والإحصائيات
        </h1>
        <div className="header-actions">
          <div className="period-selector">
            <label>الفترة الزمنية:</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              <option value="all">جميع الفترات</option>
              <option value="week">الأسبوع الماضي</option>
              <option value="month">الشهر الماضي</option>
              <option value="year">السنة الماضية</option>
            </select>
          </div>
          <button 
            className="btn btn-primary"
            onClick={loadReportsData}
            disabled={loading}
          >
            <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`}></i>
            {loading ? 'جاري التحديث...' : 'تحديث التقارير'}
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-icon inventory">
            <i className="fas fa-boxes"></i>
          </div>
          <div className="stat-content">
            <h3>{stats.totalItems}</h3>
            <p>أصناف المخزون</p>
            {stats.lowStockItems > 0 && (
              <small className="warning">
                <i className="fas fa-exclamation-triangle"></i>
                {stats.lowStockItems} صنف بكمية قليلة
              </small>
            )}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon sales">
            <i className="fas fa-shopping-cart"></i>
          </div>
          <div className="stat-content">
            <h3>{stats.totalSales}</h3>
            <p>إجمالي المبيعات</p>
            <small>{stats.totalRevenue.toFixed(2)} جنيه</small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon maintenance">
            <i className="fas fa-tools"></i>
          </div>
          <div className="stat-content">
            <h3>{stats.totalMaintenance}</h3>
            <p>طلبات الصيانة</p>
            <small>
              <span className="completed">{stats.completedMaintenance} مكتمل</span>
              <span className="pending">{stats.pendingMaintenance} معلق</span>
            </small>
          </div>
        </div>
      </div>

      {/* Monthly Trends Chart */}
      {Object.keys(stats.monthlyTrends).length > 0 && (
        <div className="section">
          <h2>الاتجاهات الشهرية</h2>
          <div className="monthly-trends-chart">
            <div className="chart-header">
              <div className="chart-legend">
                <div className="legend-item">
                  <span className="legend-color sales"></span>
                  <span>المبيعات</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color maintenance"></span>
                  <span>الصيانة</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color revenue"></span>
                  <span>الإيرادات</span>
                </div>
              </div>
            </div>
            <div className="chart-container">
              {Object.entries(stats.monthlyTrends)
                .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                .slice(-6)
                .map(([month, data]) => {
                  const maxValue = Math.max(
                    ...Object.values(stats.monthlyTrends).map(d => Math.max(d.sales, d.maintenance, d.revenue / 100))
                  );
                  return (
                    <div key={month} className="chart-bar-group">
                      <div className="chart-bars">
                        <div 
                          className="chart-bar sales"
                          style={{ height: `${(data.sales / maxValue) * 100}%` }}
                          title={`مبيعات: ${data.sales}`}
                        ></div>
                        <div 
                          className="chart-bar maintenance"
                          style={{ height: `${(data.maintenance / maxValue) * 100}%` }}
                          title={`صيانة: ${data.maintenance}`}
                        ></div>
                        <div 
                          className="chart-bar revenue"
                          style={{ height: `${((data.revenue / 100) / maxValue) * 100}%` }}
                          title={`إيرادات: ${data.revenue.toFixed(0)}`}
                        ></div>
                      </div>
                      <div className="chart-month">{month.split(' ')[1]}</div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Top Selling Items */}
      {Object.keys(stats.topSellingItems).length > 0 && (
        <div className="section">
          <h2>أعلى الأصناف مبيعاً</h2>
          <div className="top-items">
            {Object.entries(stats.topSellingItems)
              .sort(([, a], [, b]) => b.quantity - a.quantity)
              .slice(0, 10)
              .map(([itemName, data], index) => (
                <div key={itemName} className="top-item">
                  <div className="item-rank">#{index + 1}</div>
                  <div className="item-info">
                    <div className="item-name">{itemName}</div>
                    <div className="item-stats">
                      <span className="quantity">الكمية: {data.quantity}</span>
                      <span className="revenue">الإيراد: {data.revenue.toFixed(2)} جنيه</span>
                    </div>
                  </div>
                  <div className="item-chart">
                    <div 
                      className="item-bar"
                      style={{ 
                        width: `${(data.quantity / Object.values(stats.topSellingItems)[0].quantity) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Top Maintenance Items */}
      {Object.keys(stats.topMaintenanceItems).length > 0 && (
        <div className="section">
          <h2>أعلى الأصناف في طلبات الصيانة</h2>
          <div className="top-items maintenance">
            {Object.entries(stats.topMaintenanceItems)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 10)
              .map(([itemName, quantity], index) => (
                <div key={itemName} className="top-item">
                  <div className="item-rank">#{index + 1}</div>
                  <div className="item-info">
                    <div className="item-name">{itemName}</div>
                    <div className="item-stats">
                      <span className="quantity">مستخدم في {quantity} طلب صيانة</span>
                    </div>
                  </div>
                  <div className="item-chart">
                    <div 
                      className="item-bar maintenance"
                      style={{ 
                        width: `${(quantity / Object.values(stats.topMaintenanceItems)[0]) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Detailed Maintenance Analysis */}
      {stats.totalMaintenance > 0 && (
        <div className="section">
          <h2>تحليل تفصيلي لطلبات الصيانة</h2>
          <div className="maintenance-analysis">
            
            {/* By Customer */}
            {Object.keys(stats.maintenanceDetails.byCustomer).length > 0 && (
              <div className="analysis-subsection">
                <h3>حسب العملاء</h3>
                <div className="customer-stats">
                  {Object.entries(stats.maintenanceDetails.byCustomer)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 8)
                    .map(([customerName, count]) => (
                      <div key={customerName} className="customer-item">
                        <span className="customer-name">{customerName}</span>
                        <span className="customer-count">{count} طلب</span>
                        <div className="customer-bar">
                          <div 
                            className="customer-fill"
                            style={{ 
                              width: `${(count / Math.max(...Object.values(stats.maintenanceDetails.byCustomer))) * 100}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* By Device */}
            {Object.keys(stats.maintenanceDetails.byDevice).length > 0 && (
              <div className="analysis-subsection">
                <h3>حسب نوع الجهاز</h3>
                <div className="device-stats">
                  {Object.entries(stats.maintenanceDetails.byDevice)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 8)
                    .map(([deviceName, count]) => (
                      <div key={deviceName} className="device-item">
                        <span className="device-name">{deviceName}</span>
                        <span className="device-count">{count} جهاز</span>
                        <div className="device-bar">
                          <div 
                            className="device-fill"
                            style={{ 
                              width: `${(count / Math.max(...Object.values(stats.maintenanceDetails.byDevice))) * 100}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Estimated Costs by Status */}
            {Object.keys(stats.maintenanceDetails.estimatedCosts).length > 0 && (
              <div className="analysis-subsection">
                <h3>التكاليف المقدرة حسب الحالة</h3>
                <div className="cost-stats">
                  {Object.entries(stats.maintenanceDetails.estimatedCosts).map(([status, cost]) => (
                    <div key={status} className="cost-item">
                      <div className="cost-status" style={{ color: getStatusColor(status) }}>
                        {status}
                      </div>
                      <div className="cost-amount">{cost.toFixed(2)} جنيه</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Center Stats */}
      {currentUser?.isAdmin && Object.keys(stats.centerStats).length > 0 && (
        <div className="section">
          <h2>إحصائيات المراكز</h2>
          <div className="centers-stats">
            {Object.entries(stats.centerStats).map(([centerId, centerData]) => (
              <div key={centerId} className="center-stat-card">
                <h3>{centerData.centerName}</h3>
                <div className="center-metrics">
                  <div className="metric">
                    <span className="metric-value">{centerData.items}</span>
                    <span className="metric-label">أصناف</span>
                  </div>
                  <div className="metric">
                    <span className="metric-value">{centerData.sales}</span>
                    <span className="metric-label">مبيعات</span>
                  </div>
                  <div className="metric">
                    <span className="metric-value">{centerData.maintenance}</span>
                    <span className="metric-label">صيانة</span>
                  </div>
                  <div className="metric">
                    <span className="metric-value">{centerData.revenue.toFixed(0)}</span>
                    <span className="metric-label">إيرادات</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Maintenance by Status */}
      {Object.keys(stats.maintenanceByStatus).length > 0 && (
        <div className="section">
          <h2>طلبات الصيانة حسب الحالة</h2>
          <div className="maintenance-status">
            {Object.entries(stats.maintenanceByStatus).map(([status, count]) => (
              <div key={status} className="status-item">
                <div className="status-bar">
                  <div 
                    className="status-fill"
                    style={{ 
                      width: `${(count / stats.totalMaintenance) * 100}%`,
                      backgroundColor: getStatusColor(status)
                    }}
                  ></div>
                </div>
                <div className="status-info">
                  <span className="status-name">{status}</span>
                  <span className="status-count">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Technician Stats */}
      {Object.keys(stats.technicianStats).length > 0 && (
        <div className="section">
          <h2>إحصائيات الفنيين</h2>
          <div className="technicians-stats">
            {Object.entries(stats.technicianStats).map(([technicianName, techStats]) => (
              <div key={technicianName} className="technician-card">
                <h4>{technicianName}</h4>
                <div className="tech-metrics">
                  <div className="tech-metric completed">
                    <span className="tech-value">{techStats.completed}</span>
                    <span className="tech-label">مكتمل</span>
                  </div>
                  <div className="tech-metric pending">
                    <span className="tech-value">{techStats.pending}</span>
                    <span className="tech-label">معلق</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Parts Used */}
      {Object.keys(stats.partsUsed).length > 0 && (
        <div className="section">
          <h2>القطع المستخدمة في الصيانة</h2>
          <div className="parts-used">
            {Object.entries(stats.partsUsed)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 10)
              .map(([itemName, quantity]) => (
                <div key={itemName} className="part-item">
                  <span className="part-name">{itemName}</span>
                  <span className="part-quantity">{quantity} قطعة</span>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to get status color
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'تم الصيانة':
      return '#28a745';
    case 'في انتظار قطعة غيار':
      return '#ffc107';
    case 'في انتظار الفني':
      return '#17a2b8';
    case 'في انتظار العميل':
      return '#6f42c1';
    default:
      return '#6c757d';
  }
};

export default Reports;
