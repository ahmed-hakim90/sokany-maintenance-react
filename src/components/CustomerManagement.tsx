import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useActivityLogger } from './CenterSessionManagement';
import type { Customer, Center, Sale, MaintenanceRequest } from '../types';
import './CustomerManagement.css';

const CustomerManagement: React.FC = () => {
  const { user } = useAuth();
  const { logActivity } = useActivityLogger();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomerHistory, setSelectedCustomerHistory] = useState<any>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    type: 'consumer' as 'distributor' | 'consumer',
    centerId: user?.centerId || ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadCustomers(), loadCenters()]);
    } catch (error) {
      showNotification('حدث خطأ في تحميل البيانات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      let customersData: Customer[] = [];
      
      if (user?.isAdmin) {
        // الأدمن يرى جميع العملاء من جميع المراكز
        const centersSnapshot = await getDocs(collection(db, 'centers'));
        for (const centerDoc of centersSnapshot.docs) {
          const customersSnapshot = await getDocs(
            collection(db, 'centers', centerDoc.id, 'customers')
          );
          customersSnapshot.forEach(doc => {
            const data = doc.data();
            customersData.push({
              id: doc.id,
              ...data,
              centerId: centerDoc.id,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date()
            } as Customer);
          });
        }
      } else if (user?.centerId) {
        // مدير المركز يرى عملاء مركزه فقط
        const customersSnapshot = await getDocs(
          collection(db, 'centers', user.centerId, 'customers')
        );
        customersSnapshot.forEach(doc => {
          const data = doc.data();
          customersData.push({
            id: doc.id,
            ...data,
            centerId: user.centerId,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          } as Customer);
        });
      }
      
      setCustomers(customersData);
    } catch (error) {
      console.error('Error loading customers:', error);
      showNotification('حدث خطأ في تحميل العملاء', 'error');
    }
  };

  const loadCenters = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'centers'));
      const centersData: Center[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        centersData.push({ 
          id: doc.id, 
          ...data,
          createdAt: data.createdAt?.toDate() || new Date()
        } as Center);
      });

      setCenters(centersData);
    } catch (error) {
      console.error('Error loading centers:', error);
    }
  };

  const loadCustomerHistory = async (customer: Customer) => {
    try {
      let salesHistory: Sale[] = [];
      let maintenanceHistory: MaintenanceRequest[] = [];
      let totalPurchases = 0;
      let totalMaintenanceRequests = 0;
      let completedMaintenanceRequests = 0;
      let pendingMaintenanceRequests = 0;

      if (user?.isAdmin) {
        // البحث في جميع المراكز
        const centersSnapshot = await getDocs(collection(db, 'centers'));
        for (const centerDoc of centersSnapshot.docs) {
          // البحث في المبيعات
          const salesSnapshot = await getDocs(
            query(
              collection(db, 'centers', centerDoc.id, 'sales'),
              where('customerName', '==', customer.name)
            )
          );
          
          salesSnapshot.forEach(doc => {
            const data = doc.data();
            salesHistory.push({
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate() || new Date()
            } as Sale);
            totalPurchases++;
          });

          // البحث في الصيانة
          const maintenanceSnapshot = await getDocs(
            query(
              collection(db, 'centers', centerDoc.id, 'maintenance'),
              where('customerName', '==', customer.name)
            )
          );
          
          maintenanceSnapshot.forEach(doc => {
            const data = doc.data();
            maintenanceHistory.push({
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date()
            } as MaintenanceRequest);
            totalMaintenanceRequests++;
            if (data.status === 'completed') completedMaintenanceRequests++;
            else if (data.status === 'pending' || data.status === 'in-progress') pendingMaintenanceRequests++;
          });
        }
      } else if (user?.centerId) {
        // البحث في مركز واحد فقط
        const salesSnapshot = await getDocs(
          query(
            collection(db, 'centers', user.centerId, 'sales'),
            where('customerName', '==', customer.name)
          )
        );
        
        salesSnapshot.forEach(doc => {
          const data = doc.data();
          salesHistory.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date()
          } as Sale);
          totalPurchases++;
        });

        const maintenanceSnapshot = await getDocs(
          query(
            collection(db, 'centers', user.centerId, 'maintenance'),
            where('customerName', '==', customer.name)
          )
        );
        
        maintenanceSnapshot.forEach(doc => {
          const data = doc.data();
          maintenanceHistory.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          } as MaintenanceRequest);
          totalMaintenanceRequests++;
          if (data.status === 'completed') completedMaintenanceRequests++;
          else if (data.status === 'pending' || data.status === 'in-progress') pendingMaintenanceRequests++;
        });
      }

      // حساب إجمالي قيمة المشتريات
      const totalSpent = salesHistory.reduce((sum, sale) => sum + (sale.totalPrice || 0), 0);

      setSelectedCustomerHistory({
        customer,
        salesHistory: salesHistory.sort((a, b) => {
          const aTime = a.createdAt?.getTime() || 0;
          const bTime = b.createdAt?.getTime() || 0;
          return bTime - aTime;
        }),
        maintenanceHistory: maintenanceHistory.sort((a, b) => {
          const aTime = a.createdAt?.getTime() || 0;
          const bTime = b.createdAt?.getTime() || 0;
          return bTime - aTime;
        }),
        stats: {
          totalPurchases,
          totalSpent,
          totalMaintenanceRequests,
          completedMaintenanceRequests,
          pendingMaintenanceRequests
        }
      });
    } catch (error) {
      console.error('Error loading customer history:', error);
      showNotification('خطأ في تحميل تاريخ العميل', 'error');
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!formData.name || !formData.phoneNumber || !formData.centerId) {
        showNotification('يرجى ملء جميع الحقول', 'error');
        return;
      }

      const customerData = {
        name: formData.name,
        phoneNumber: formData.phoneNumber,
        type: formData.type,
        centerId: formData.centerId,
        updatedAt: new Date()
      };

      if (editingCustomer) {
        // تحديث عميل موجود
        await updateDoc(
          doc(db, 'centers', formData.centerId, 'customers', editingCustomer.id), 
          customerData
        );
        
        // تسجيل النشاط
        await logActivity(
          'customer',
          `تم تحديث بيانات العميل: ${formData.name}`,
          editingCustomer.id,
          formData.name,
          { oldData: editingCustomer, newData: customerData }
        );
        
        showNotification('تم تحديث بيانات العميل بنجاح', 'success');
      } else {
        // إضافة عميل جديد
        const docRef = await addDoc(collection(db, 'centers', formData.centerId, 'customers'), {
          ...customerData,
          createdAt: new Date()
        });
        
        // تسجيل النشاط
        await logActivity(
          'customer',
          `تم إضافة عميل جديد: ${formData.name}`,
          docRef.id,
          formData.name,
          customerData
        );
        
        showNotification('تم إضافة العميل بنجاح', 'success');
      }

      resetForm();
      loadCustomers();
    } catch (error) {
      showNotification('حدث خطأ في حفظ البيانات', 'error');
      console.error('Error saving customer:', error);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phoneNumber: customer.phoneNumber,
      type: customer.type,
      centerId: customer.centerId
    });
    setShowAddForm(true);
  };

  const handleDelete = async (customer: Customer) => {
    if (window.confirm('هل أنت متأكد من حذف هذا العميل؟')) {
      try {
        await deleteDoc(doc(db, 'centers', customer.centerId, 'customers', customer.id));
        
        // تسجيل النشاط
        await logActivity(
          'customer',
          `تم حذف العميل: ${customer.name}`,
          customer.id,
          customer.name,
          { deletedCustomer: customer }
        );
        
        showNotification('تم حذف العميل بنجاح', 'success');
        loadCustomers();
      } catch (error) {
        showNotification('حدث خطأ في حذف العميل', 'error');
        console.error('Error deleting customer:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phoneNumber: '',
      type: 'consumer',
      centerId: user?.centerId || ''
    });
    setEditingCustomer(null);
    setShowAddForm(false);
  };

  const getCenterName = (centerId: string) => {
    const center = centers.find(c => c.id === centerId);
    return center?.name || 'غير محدد';
  };

  const getCustomerTypeLabel = (type: string) => {
    return type === 'distributor' ? 'موزع' : 'مستهلك';
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'معلق';
      case 'in-progress': return 'قيد التنفيذ';
      case 'completed': return 'مكتمل';
      case 'cancelled': return 'ملغي';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <i className="fas fa-spinner fa-spin"></i>
        <p>جاري تحميل العملاء...</p>
      </div>
    );
  }

  return (
    <div className="customer-management">
      <div className="page-header">
        <h1>
          <i className="fas fa-users"></i>
          إدارة العملاء
        </h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddForm(true)}
        >
          <i className="fas fa-plus"></i>
          إضافة عميل جديد
        </button>
      </div>

      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      {showAddForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>
                <i className="fas fa-user-plus"></i>
                {editingCustomer ? 'تعديل العميل' : 'إضافة عميل جديد'}
              </h3>
              <button className="btn-close" onClick={resetForm}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group">
                <label>اسم العميل</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="أدخل اسم العميل"
                  required
                />
              </div>

              <div className="form-group">
                <label>رقم الهاتف</label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                  placeholder="أدخل رقم الهاتف"
                  required
                />
              </div>

              <div className="form-group">
                <label>نوع العميل</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value as 'distributor' | 'consumer'})}
                  required
                >
                  <option value="consumer">مستهلك</option>
                  <option value="distributor">موزع</option>
                </select>
              </div>

              <div className="form-group">
                <label>المركز</label>
                <select
                  value={formData.centerId}
                  onChange={(e) => setFormData({...formData, centerId: e.target.value})}
                  required
                  disabled={!user?.isAdmin}
                >
                  {!user?.isAdmin && user?.centerId && (
                    <option value={user.centerId}>
                      {getCenterName(user.centerId)}
                    </option>
                  )}
                  {user?.isAdmin && (
                    <>
                      <option value="">اختر المركز</option>
                      {centers.map(center => (
                        <option key={center.id} value={center.id}>
                          {center.name}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-save"></i>
                  {editingCustomer ? 'تحديث' : 'إضافة'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  <i className="fas fa-times"></i>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="customers-grid">
        {customers.length === 0 ? (
          <div className="no-data">
            <i className="fas fa-users"></i>
            <p>لا توجد عملاء مضافين بعد</p>
          </div>
        ) : (
          customers.map(customer => (
            <div key={customer.id} className="customer-card">
              <div className="card-header">
                <div className="customer-info">
                  <h3>{customer.name}</h3>
                  <span className={`customer-type ${customer.type}`}>
                    {getCustomerTypeLabel(customer.type)}
                  </span>
                </div>
                <div className="card-actions">
                  <button 
                    className="btn-icon history"
                    onClick={() => loadCustomerHistory(customer)}
                    title="عرض التاريخ"
                  >
                    <i className="fas fa-history"></i>
                  </button>
                  <button 
                    className="btn-icon edit"
                    onClick={() => handleEdit(customer)}
                    title="تعديل"
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button 
                    className="btn-icon delete"
                    onClick={() => handleDelete(customer)}
                    title="حذف"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>

              <div className="card-info">
                <div className="info-item">
                  <span className="label">الهاتف:</span>
                  <span className="value">{customer.phoneNumber}</span>
                </div>
                <div className="info-item">
                  <span className="label">المركز:</span>
                  <span className="value">{getCenterName(customer.centerId)}</span>
                </div>
                <div className="info-item">
                  <span className="label">تاريخ الإضافة:</span>
                  <span className="value">
                    {customer.createdAt.toLocaleDateString('ar-EG')}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedCustomerHistory && (
        <div className="modal-overlay">
          <div className="modal history-modal">
            <div className="modal-header">
              <h3>
                <i className="fas fa-history"></i>
                تاريخ العميل: {selectedCustomerHistory.customer.name}
              </h3>
              <button 
                className="btn-close" 
                onClick={() => setSelectedCustomerHistory(null)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="modal-body">
              {/* إحصائيات العميل */}
              <div className="stats-section">
                <h4>الإحصائيات</h4>
                <div className="stats-grid">
                  <div className="stat-card">
                    <i className="fas fa-shopping-cart"></i>
                    <div className="stat-info">
                      <span className="stat-label">المشتريات</span>
                      <span className="stat-value">{selectedCustomerHistory.stats.totalPurchases}</span>
                    </div>
                  </div>

                  <div className="stat-card">
                    <i className="fas fa-money-bill-wave"></i>
                    <div className="stat-info">
                      <span className="stat-label">إجمالي المبلغ</span>
                      <span className="stat-value">{selectedCustomerHistory.stats.totalSpent} جنيه</span>
                    </div>
                  </div>

                  <div className="stat-card">
                    <i className="fas fa-tools"></i>
                    <div className="stat-info">
                      <span className="stat-label">طلبات الصيانة</span>
                      <span className="stat-value">{selectedCustomerHistory.stats.totalMaintenanceRequests}</span>
                    </div>
                  </div>

                  <div className="stat-card">
                    <i className="fas fa-check-circle"></i>
                    <div className="stat-info">
                      <span className="stat-label">صيانة مكتملة</span>
                      <span className="stat-value">{selectedCustomerHistory.stats.completedMaintenanceRequests}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* تاريخ المبيعات */}
              <div className="history-section">
                <h4>تاريخ المبيعات</h4>
                {selectedCustomerHistory.salesHistory.length === 0 ? (
                  <p className="no-data-text">لا توجد مبيعات</p>
                ) : (
                  <div className="history-list">
                    {selectedCustomerHistory.salesHistory.map((sale: Sale) => (
                      <div key={sale.id} className="history-item">
                        <div className="item-info">
                          <strong>{sale.itemName}</strong>
                          <span>الكمية: {sale.quantity}</span>
                          <span>السعر: {sale.totalPrice} جنيه</span>
                        </div>
                        <div className="item-date">
                          {sale.createdAt?.toLocaleDateString('ar-EG') || 'غير محدد'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* تاريخ الصيانة */}
              <div className="history-section">
                <h4>تاريخ الصيانة</h4>
                {selectedCustomerHistory.maintenanceHistory.length === 0 ? (
                  <p className="no-data-text">لا توجد طلبات صيانة</p>
                ) : (
                  <div className="history-list">
                    {selectedCustomerHistory.maintenanceHistory.map((maintenance: MaintenanceRequest) => (
                      <div key={maintenance.id} className="history-item">
                        <div className="item-info">
                          <strong>{maintenance.deviceType}</strong>
                          <span>الوصف: {maintenance.description}</span>
                          <span className={`status ${maintenance.status}`}>
                            الحالة: {getStatusLabel(maintenance.status)}
                          </span>
                          {maintenance.totalCost && (
                            <span>التكلفة: {maintenance.totalCost} جنيه</span>
                          )}
                        </div>
                        <div className="item-date">
                          {maintenance.createdAt.toLocaleDateString('ar-EG')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManagement;
