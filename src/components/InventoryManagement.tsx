import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { migrateInventoryData } from '../utils/migrateData';
import type { InventoryItem, Center } from '../types';
import './InventoryManagement.css';

const InventoryManagement: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    quantity: 0,
    price: 0,
    note: '',
    centerId: user?.centerId || ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadItems(), loadCenters()]);
    } catch (error) {
      showNotification('حدث خطأ في تحميل البيانات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async () => {
    try {
      let itemsData: InventoryItem[] = [];
      
      if (user?.isAdmin) {
        // الأدمن يرى جميع المنتجات من جميع المراكز
        const centersSnapshot = await getDocs(collection(db, 'centers'));
        for (const centerDoc of centersSnapshot.docs) {
          const inventorySnapshot = await getDocs(
            collection(db, 'centers', centerDoc.id, 'inventory')
          );
          inventorySnapshot.forEach(doc => {
            const data = doc.data();
            itemsData.push({
              id: doc.id,
              ...data,
              centerId: centerDoc.id,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date()
            } as InventoryItem);
          });
        }
      } else if (user?.centerId) {
        // مدير المركز يرى منتجات مركزه فقط
        const inventorySnapshot = await getDocs(
          collection(db, 'centers', user.centerId, 'inventory')
        );
        inventorySnapshot.forEach(doc => {
          const data = doc.data();
          itemsData.push({
            id: doc.id,
            ...data,
            centerId: user.centerId,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          } as InventoryItem);
        });
      }
      
      setItems(itemsData);
    } catch (error) {
      console.error('Error loading items:', error);
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

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!formData.name || formData.quantity < 0 || formData.price < 0) {
        showNotification('يرجى ملء جميع الحقول بشكل صحيح', 'error');
        return;
      }

      if (!formData.centerId) {
        showNotification('يرجى اختيار المركز', 'error');
        return;
      }

      const itemData = {
        name: formData.name,
        quantity: formData.quantity,
        price: formData.price,
        note: formData.note,
        centerId: formData.centerId,
        updatedAt: new Date()
      };

      if (editingItem) {
        // تحديث في البنية الجديدة: centers/{centerId}/inventory
        await updateDoc(doc(db, 'centers', formData.centerId, 'inventory', editingItem.id), itemData);
        showNotification('تم تحديث الصنف بنجاح', 'success');
      } else {
        // إضافة في البنية الجديدة: centers/{centerId}/inventory
        await addDoc(collection(db, 'centers', formData.centerId, 'inventory'), {
          ...itemData,
          createdAt: new Date()
        });
        showNotification('تم إضافة الصنف بنجاح', 'success');
      }

      resetForm();
      loadItems();
    } catch (error) {
      showNotification('حدث خطأ في حفظ البيانات', 'error');
      console.error('Error saving item:', error);
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      note: item.note || '',
      centerId: item.centerId
    });
    setShowAddForm(true);
  };

  const handleDelete = async (item: InventoryItem) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الصنف؟')) {
      try {
        // حذف من البنية الجديدة: centers/{centerId}/inventory
        await deleteDoc(doc(db, 'centers', item.centerId, 'inventory', item.id));
        showNotification('تم حذف الصنف بنجاح', 'success');
        loadItems();
      } catch (error) {
        showNotification('حدث خطأ في حذف الصنف', 'error');
        console.error('Error deleting item:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      quantity: 0,
      price: 0,
      note: '',
      centerId: user?.centerId || ''
    });
    setEditingItem(null);
    setShowAddForm(false);
  };

  const getCenterName = (centerId: string) => {
    const center = centers.find(c => c.id === centerId);
    return center?.name || 'غير محدد';
  };

  const handleMigrateData = async () => {
    if (!user?.isAdmin) return;
    
    if (window.confirm('هل تريد نقل البيانات من النظام القديم؟ هذا العمل لا يمكن التراجع عنه.')) {
      setLoading(true);
      try {
        const result = await migrateInventoryData();
        if (result && result.success) {
          showNotification(`تم نقل ${result.migratedCount} عنصر بنجاح`, 'success');
          loadItems();
        } else {
          showNotification('حدث خطأ في عملية النقل', 'error');
        }
      } catch (error) {
        showNotification('حدث خطأ في عملية النقل', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <i className="fas fa-spinner fa-spin"></i>
        <p>جاري تحميل المخزون...</p>
      </div>
    );
  }

  return (
    <div className="inventory-management">
      <div className="page-header">
        <h1>
          <i className="fas fa-boxes"></i>
          إدارة المخزون
        </h1>
        <div className="header-actions">
          <button 
            className="btn btn-primary"
            onClick={() => setShowAddForm(true)}
          >
            <i className="fas fa-plus"></i>
            إضافة صنف جديد
          </button>
          {user?.isAdmin && (
            <button 
              className="btn btn-secondary"
              onClick={handleMigrateData}
              style={{ marginLeft: '10px' }}
            >
              <i className="fas fa-sync-alt"></i>
              نقل البيانات القديمة
            </button>
          )}
        </div>
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
              <h3>{editingItem ? 'تعديل الصنف' : 'إضافة صنف جديد'}</h3>
              <button className="close-btn" onClick={resetForm}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="item-form">
              <div className="form-group">
                <label>اسم الصنف:</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>الكمية:</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value)})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>السعر:</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
                    required
                  />
                </div>
              </div>

              {user?.isAdmin && (
                <div className="form-group">
                  <label>المركز:</label>
                  <select
                    value={formData.centerId}
                    onChange={(e) => setFormData({...formData, centerId: e.target.value})}
                    required
                  >
                    <option value="">اختر المركز</option>
                    {centers.map(center => (
                      <option key={center.id} value={center.id}>
                        {center.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label>ملاحظات:</label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({...formData, note: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-save"></i>
                  {editingItem ? 'تحديث' : 'إضافة'}
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

      <div className="items-grid">
        {items.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-box-open"></i>
            <p>لا توجد أصناف في المخزون</p>
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} className="item-card">
              <div className="item-header">
                <h3>{item.name}</h3>
                <div className="item-actions">
                  <button 
                    className="btn-icon edit"
                    onClick={() => handleEdit(item)}
                    title="تعديل"
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button 
                    className="btn-icon delete"
                    onClick={() => handleDelete(item)}
                    title="حذف"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>

              <div className="item-info">
                <div className="info-item">
                  <span className="label">الكمية:</span>
                  <span className={`value ${item.quantity < 10 ? 'low-stock' : ''}`}>
                    {item.quantity}
                    {item.quantity < 10 && <i className="fas fa-exclamation-triangle"></i>}
                  </span>
                </div>

                <div className="info-item">
                  <span className="label">السعر:</span>
                  <span className="value">{item.price} جنيه</span>
                </div>

                {user?.isAdmin && (
                  <div className="info-item">
                    <span className="label">المركز:</span>
                    <span className="value">{getCenterName(item.centerId)}</span>
                  </div>
                )}

                {item.note && (
                  <div className="info-item">
                    <span className="label">ملاحظات:</span>
                    <span className="value">{item.note}</span>
                  </div>
                )}
              </div>

              <div className="item-footer">
                <small>
                  آخر تحديث: {item.updatedAt?.toLocaleDateString('ar-EG')}
                </small>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default InventoryManagement;
