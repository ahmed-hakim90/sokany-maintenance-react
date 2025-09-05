import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  updateDoc, 
  doc 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { MaintenanceRecord, InventoryItem } from '../types';
import './MaintenanceManagement.css';

interface NewMaintenance {
  itemId: string;
  itemName: string;
  quantity: number;
  customerName: string;
  customerPhone: string;
  deviceName: string;
  technicianName: string;
  status: 'في انتظار قطعة غيار' | 'في انتظار الفني' | 'تم الصيانة' | 'في انتظار العميل';
  note?: string;
  estimatedCost?: number;
}

const MaintenanceManagement: React.FC = () => {
  const { user, updateLastActivity } = useAuth();
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const [newMaintenance, setNewMaintenance] = useState<NewMaintenance>({
    itemId: '',
    itemName: '',
    quantity: 1,
    customerName: '',
    customerPhone: '',
    deviceName: '',
    technicianName: '',
    status: 'في انتظار قطعة غيار',
    note: '',
    estimatedCost: 0
  });

  const statusOptions = [
    'في انتظار قطعة غيار',
    'في انتظار الفني',
    'تم الصيانة',
    'في انتظار العميل'
  ];

  const statusColors = {
    'في انتظار قطعة غيار': '#ffc107',
    'في انتظار الفني': '#17a2b8',
    'تم الصيانة': '#28a745',
    'في انتظار العميل': '#fd7e14'
  };

  useEffect(() => {
    if (!user) return;
    loadMaintenanceRecords();
    loadInventoryItems();
    updateLastActivity();
  }, [user]);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const loadMaintenanceRecords = async () => {
    try {
      setLoading(true);
      let maintenanceQuery;

      if (user?.isAdmin) {
        maintenanceQuery = query(
          collection(db, 'maintenance'),
          orderBy('date', 'desc')
        );
      } else if (user?.centerId) {
        maintenanceQuery = query(
          collection(db, 'maintenance'),
          where('centerId', '==', user.centerId)
        );
      } else {
        setMaintenanceRecords([]);
        return;
      }

      const snapshot = await getDocs(maintenanceQuery);
      let records: MaintenanceRecord[] = [];
      snapshot.forEach(d => {
        records.push({ id: d.id, ...d.data() } as MaintenanceRecord);
      });
      records.sort((a, b) => {
        const da = (a.date as any)?.toDate ? (a.date as any).toDate() : new Date(a.date);
        const dbb = (b.date as any)?.toDate ? (b.date as any).toDate() : new Date(b.date);
        return dbb.getTime() - da.getTime();
      });
      setMaintenanceRecords(records);
    } catch (error: any) {
      console.error('Error loading maintenance records:', error);
      const needsIndex = error?.message?.includes('index') || error?.code === 'failed-precondition';
      showNotification(needsIndex ? 'مطلوب فهرس في Firestore، سيتم استخدام فرز محلي' : 'خطأ في تحميل سجلات الصيانة', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadInventoryItems = async () => {
    try {
      let items: InventoryItem[] = [];

      if (!user) {
        console.log('لا يوجد مستخدم مسجل دخول');
        return;
      }

      // احصل على خريطة أسماء المراكز
      const centersMap: Record<string, string> = {};
      const centersSnapshot = await getDocs(collection(db, 'centers'));
      centersSnapshot.forEach(c => {
        const data: any = c.data();
        centersMap[c.id] = data.name || 'مركز غير معروف';
      });

      console.log('=== تشخيص تحميل المخزون (الصيانة) ===');
      console.log('المستخدم:', user?.email, 'نوع:', user?.isAdmin ? 'أدمن' : 'مركز');
      console.log('تم العثور على', centersSnapshot.size, 'مراكز');

      if (user?.isAdmin) {
        console.log('تحميل المخزون للأدمن من جميع المراكز');
        // الأدمن يرى جميع المنتجات من جميع المراكز
        for (const centerDoc of centersSnapshot.docs) {
          console.log(`\n--- فحص المركز: ${centerDoc.id} (${centersMap[centerDoc.id]}) ---`);
          
          const inventorySnapshot = await getDocs(
            collection(db, 'centers', centerDoc.id, 'inventory')
          );
          console.log(`عدد العناصر في هذا المركز: ${inventorySnapshot.size}`);
          
          inventorySnapshot.forEach(doc => {
            const data: any = doc.data();
            console.log(`العنصر: ${data.name}, الكمية: ${data.quantity}, centerId في البيانات: ${data.centerId}`);
            items.push({ 
              id: doc.id, 
              ...data, 
              centerId: centerDoc.id, // تأكد من إضافة centerId الصحيح
              centerName: centersMap[centerDoc.id] 
            } as InventoryItem);
          });
        }
      } else if (user?.centerId) {
        console.log('تحميل المخزون لمركز:', user.centerId);
        // مدير المركز يرى منتجات مركزه فقط
        const inventorySnapshot = await getDocs(
          collection(db, 'centers', user.centerId, 'inventory')
        );
        console.log(`المركز ${user.centerId}: ${inventorySnapshot.size} عناصر`);
        inventorySnapshot.forEach(doc => {
          const data: any = doc.data();
          console.log(`العنصر: ${data.name}, الكمية: ${data.quantity}, centerId في البيانات: ${data.centerId}`);
          items.push({ 
            id: doc.id, 
            ...data, 
            centerId: user.centerId!, // تأكد من إضافة centerId الصحيح
            centerName: centersMap[user.centerId!] 
          } as InventoryItem);
        });
      }

      console.log('\n=== ملخص النتائج (الصيانة) ===');
      console.log('إجمالي العناصر المحملة:', items.length);
      
      // عرض تفاصيل كل عنصر
      items.forEach((item, index) => {
        console.log(`${index + 1}. العنصر: ${item.name}, الكمية: ${item.quantity}, المركز: ${item.centerName}, centerId: ${item.centerId}`);
      });
      
      // ترتيب حسب اسم المركز ثم اسم المنتج
      const filteredItems = items.filter(item => item.quantity > 0);
      console.log('العناصر بعد فلترة الكمية (> 0):', filteredItems.length);
      
      const sortedItems = filteredItems.sort((a, b) => 
        `${a.centerName}-${a.name}`.localeCompare(`${b.centerName}-${b.name}`, 'ar')
      );

      setInventoryItems(sortedItems);
    } catch (error) {
      console.error('Error loading inventory:', error);
      showNotification('خطأ في تحميل المخزون: ' + (error as any).message, 'error');
    }
  };

  const handleItemSelect = (itemId: string) => {
    const selectedItem = inventoryItems.find(item => item.id === itemId);
    if (selectedItem) {
      setNewMaintenance(prev => ({
        ...prev,
        itemId,
        itemName: selectedItem.name
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMaintenance.itemId || !newMaintenance.customerName || 
        !newMaintenance.customerPhone || !newMaintenance.deviceName || 
        !newMaintenance.technicianName) {
      showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
      return;
    }

    const selectedItem = inventoryItems.find(item => item.id === newMaintenance.itemId);
    if (!selectedItem) {
      showNotification('المنتج غير موجود', 'error');
      return;
    }

    if (newMaintenance.quantity > selectedItem.quantity) {
      showNotification('الكمية المطلوبة أكبر من المتوفرة في المخزون', 'error');
      return;
    }

    try {
      setLoading(true);

      // إضافة سجل الصيانة
      const maintenanceData = {
        ...newMaintenance,
        centerId: user?.centerId || selectedItem.centerId,
        centerName: user?.centerName || '',
        date: new Date(),
        createdBy: user?.email || '',
        createdAt: new Date()
      };

      await addDoc(collection(db, 'maintenance'), maintenanceData);

      // تحديث كمية المنتج في المخزون (إذا كان تم استخدام قطعة غيار)
      if (newMaintenance.status === 'تم الصيانة') {
        const newQuantity = selectedItem.quantity - newMaintenance.quantity;
        await updateDoc(
          doc(db, 'centers', selectedItem.centerId, 'inventory', selectedItem.id),
          {
            quantity: newQuantity,
            updatedAt: new Date()
          }
        );
      }

      showNotification('تم إضافة سجل الصيانة بنجاح', 'success');
      setShowAddForm(false);
      resetForm();
      loadMaintenanceRecords();
      loadInventoryItems();
    } catch (error) {
      console.error('Error adding maintenance record:', error);
      showNotification('خطأ في إضافة سجل الصيانة', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (recordId: string, newStatus: any) => {
    try {
      await updateDoc(doc(db, 'maintenance', recordId), {
        status: newStatus,
        updatedAt: new Date(),
        updatedBy: user?.email || ''
      });
      
      showNotification('تم تحديث حالة الصيانة', 'success');
      loadMaintenanceRecords();
    } catch (error) {
      console.error('Error updating status:', error);
      showNotification('خطأ في تحديث الحالة', 'error');
    }
  };

  const resetForm = () => {
    setNewMaintenance({
      itemId: '',
      itemName: '',
      quantity: 1,
      customerName: '',
      customerPhone: '',
      deviceName: '',
      technicianName: '',
      status: 'في انتظار قطعة غيار',
      note: '',
      estimatedCost: 0
    });
  };

  const formatDate = (date: any) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('ar-EG');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'SAR'
    }).format(amount);
  };

  const getStatusStats = () => {
    const stats = statusOptions.reduce((acc, status) => {
      acc[status] = maintenanceRecords.filter(record => record.status === status).length;
      return acc;
    }, {} as Record<string, number>);
    
    return stats;
  };

  const statusStats = getStatusStats();

  return (
    <div className="maintenance-management">
      <div className="maintenance-header">
        <div className="header-content">
          <h2>
            <i className="fas fa-tools"></i>
            إدارة الصيانة
          </h2>
          <div className="header-actions">
            <button 
              className="btn-primary"
              onClick={() => {
                setShowAddForm(true);
                loadInventoryItems(); // تحديث المخزون عند فتح النموذج
              }}
            >
              <i className="fas fa-plus"></i>
              إضافة طلب صيانة جديد
            </button>
            <button 
              className="btn-secondary"
              onClick={loadMaintenanceRecords}
              disabled={loading}
            >
              <i className="fas fa-sync-alt"></i>
              تحديث الصيانة
            </button>
            <button 
              className="btn-secondary"
              onClick={loadInventoryItems}
              disabled={loading}
            >
              <i className="fas fa-boxes"></i>
              تحديث المخزون
            </button>
          </div>
        </div>
      </div>

      {/* إحصائيات حالة الصيانة */}
      <div className="status-stats">
        {statusOptions.map(status => (
          <div key={status} className="status-card">
            <div 
              className="status-icon"
              style={{ background: statusColors[status as keyof typeof statusColors] }}
            >
              <i className="fas fa-wrench"></i>
            </div>
            <div className="status-info">
              <h3>{statusStats[status] || 0}</h3>
              <p>{status}</p>
            </div>
          </div>
        ))}
      </div>

      {/* نموذج إضافة طلب صيانة */}
      {showAddForm && (
        <div className="modal-overlay">
          <div className="add-maintenance-modal">
            <div className="modal-header">
              <h3>
                <i className="fas fa-plus-circle"></i>
                إضافة طلب صيانة جديد
              </h3>
              <button 
                className="close-btn"
                onClick={() => setShowAddForm(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="maintenance-form">
              <div className="form-section">
                <h4>
                  <i className="fas fa-user"></i>
                  معلومات العميل
                </h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>اسم العميل *</label>
                    <input
                      type="text"
                      value={newMaintenance.customerName}
                      onChange={(e) => setNewMaintenance(prev => ({ ...prev, customerName: e.target.value }))}
                      placeholder="أدخل اسم العميل"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>رقم الهاتف *</label>
                    <input
                      type="tel"
                      value={newMaintenance.customerPhone}
                      onChange={(e) => setNewMaintenance(prev => ({ ...prev, customerPhone: e.target.value }))}
                      placeholder="05xxxxxxxx"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>اسم الجهاز *</label>
                  <input
                    type="text"
                    value={newMaintenance.deviceName}
                    onChange={(e) => setNewMaintenance(prev => ({ ...prev, deviceName: e.target.value }))}
                    placeholder="مثال: مكيف سبليت، ثلاجة، غسالة"
                    required
                  />
                </div>
              </div>

              <div className="form-section">
                <h4>
                  <i className="fas fa-cog"></i>
                  تفاصيل الصيانة
                </h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>قطعة الغيار المطلوبة *</label>
                    <select
                      value={newMaintenance.itemId}
                      onChange={(e) => handleItemSelect(e.target.value)}
                      required
                    >
                      <option value="">
                        {inventoryItems.length === 0 ? 'لا توجد قطع غيار متوفرة' : 'اختر قطعة الغيار'}
                      </option>
                      {inventoryItems.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name} | {item.centerName || 'مركز'} | متوفر: {item.quantity} | {formatCurrency(item.price)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>الكمية *</label>
                    <input
                      type="number"
                      min="1"
                      max={inventoryItems.find(item => item.id === newMaintenance.itemId)?.quantity || 1}
                      value={newMaintenance.quantity}
                      onChange={(e) => setNewMaintenance(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>اسم الفني *</label>
                    <input
                      type="text"
                      value={newMaintenance.technicianName}
                      onChange={(e) => setNewMaintenance(prev => ({ ...prev, technicianName: e.target.value }))}
                      placeholder="أدخل اسم الفني المسؤول"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>حالة الصيانة *</label>
                    <select
                      value={newMaintenance.status}
                      onChange={(e) => setNewMaintenance(prev => ({ ...prev, status: e.target.value as any }))}
                      required
                    >
                      {statusOptions.map(status => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>التكلفة المتوقعة</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newMaintenance.estimatedCost}
                    onChange={(e) => setNewMaintenance(prev => ({ ...prev, estimatedCost: Number(e.target.value) }))}
                    placeholder="التكلفة المتوقعة (ريال سعودي)"
                  />
                </div>

                <div className="form-group">
                  <label>ملاحظات</label>
                  <textarea
                    value={newMaintenance.note}
                    onChange={(e) => setNewMaintenance(prev => ({ ...prev, note: e.target.value }))}
                    placeholder="ملاحظات إضافية حول حالة الجهاز أو الصيانة"
                    rows={4}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save"></i>
                      حفظ طلب الصيانة
                    </>
                  )}
                </button>
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => setShowAddForm(false)}
                >
                  <i className="fas fa-times"></i>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* قائمة طلبات الصيانة */}
      <div className="maintenance-list">
        <div className="list-header">
          <h3>
            <i className="fas fa-list"></i>
            قائمة طلبات الصيانة
          </h3>
        </div>

        {loading ? (
          <div className="loading-state">
            <i className="fas fa-spinner fa-spin"></i>
            جاري التحميل...
          </div>
        ) : maintenanceRecords.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-tools"></i>
            <h3>لا توجد طلبات صيانة</h3>
            <p>ابدأ بإضافة أول طلب صيانة</p>
          </div>
        ) : (
          <div className="maintenance-table">
            <table>
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>العميل</th>
                  <th>الجهاز</th>
                  <th>قطعة الغيار</th>
                  <th>الفني</th>
                  <th>الحالة</th>
                  {user?.isAdmin && <th>المركز</th>}
                  <th>التكلفة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {maintenanceRecords.map(record => (
                  <tr key={record.id}>
                    <td>{formatDate(record.date)}</td>
                    <td>
                      <div className="customer-info">
                        <strong>{record.customerName}</strong>
                        <small>{record.customerPhone}</small>
                      </div>
                    </td>
                    <td>{record.deviceName}</td>
                    <td>
                      <div className="item-info">
                        <strong>{record.itemName}</strong>
                        <small>الكمية: {record.quantity}</small>
                      </div>
                    </td>
                    <td>{record.technicianName}</td>
                    <td>
                      <select
                        value={record.status}
                        onChange={(e) => updateStatus(record.id, e.target.value)}
                        className="status-select"
                        style={{ 
                          background: statusColors[record.status as keyof typeof statusColors],
                          color: 'white'
                        }}
                      >
                        {statusOptions.map(status => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    {user?.isAdmin && (
                      <td>{(record as any).centerName || 'غير محدد'}</td>
                    )}
                    <td>
                      {(record as any).estimatedCost ? 
                        formatCurrency((record as any).estimatedCost) : 
                        'غير محدد'
                      }
                    </td>
                    <td>
                      {record.note && (
                        <button
                          className="note-btn"
                          title={record.note}
                        >
                          <i className="fas fa-sticky-note"></i>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {notification && (
        <div className={`notification ${notification.type}`}>
          <i className={`fas ${notification.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
          {notification.message}
        </div>
      )}
    </div>
  );
};

export default MaintenanceManagement;
