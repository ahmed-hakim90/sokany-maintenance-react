import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { Center } from '../types';
import './CenterManagement.css';

const CenterManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCenter, setEditingCenter] = useState<Center | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    managerName: '',
    address: '',
    phone: ''
  });

  useEffect(() => {
    if (currentUser?.isAdmin) {
      loadCenters();
    }
  }, [currentUser]);

  const loadCenters = async () => {
    try {
      setLoading(true);
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
      showNotification('حدث خطأ في تحميل المراكز', 'error');
      console.error('Error loading centers:', error);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!formData.name || !formData.email) {
        showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
      }

      const centerData = {
        name: formData.name,
        email: formData.email,
        password: formData.password || 'center123',
        managerName: formData.managerName || '',
        address: formData.address || '',
        phone: formData.phone || '',
        uid: '',
        inventory: [],
        sales: [],
        maintenance: []
      };

      if (editingCenter) {
        await updateDoc(doc(db, 'centers', editingCenter.id), {
          name: formData.name,
            email: formData.email,
            managerName: formData.managerName || '',
            address: formData.address || '',
            phone: formData.phone || '',
            ...(formData.password && { password: formData.password })
          });
        showNotification('تم تحديث المركز بنجاح', 'success');
      } else {
        // إنشاء مستخدم Firebase Auth للمركز
        const userCredential = await createUserWithEmailAndPassword(auth, centerData.email, centerData.password);
        const uid = userCredential.user.uid;
        // إنشاء وثيقة المركز وربط uid
        await addDoc(collection(db, 'centers'), {
          ...centerData,
          uid,
          createdAt: new Date()
        });
        showNotification('تم إضافة المركز وإنشاء حساب الدخول', 'success');
      }

      resetForm();
      loadCenters();
    } catch (error) {
      showNotification('حدث خطأ في حفظ البيانات', 'error');
      console.error('Error saving center:', error);
    }
  };

  const handleEdit = (center: Center) => {
    setEditingCenter(center);
    setFormData({
      name: center.name,
      email: center.email,
      password: '',
      managerName: center.managerName || '',
      address: center.address || '',
      phone: center.phone || ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (centerId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المركز؟ سيتم حذف جميع البيانات المرتبطة به.')) {
      try {
        await deleteDoc(doc(db, 'centers', centerId));
        showNotification('تم حذف المركز بنجاح', 'success');
        loadCenters();
      } catch (error) {
        showNotification('حدث خطأ في حذف المركز', 'error');
        console.error('Error deleting center:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      managerName: '',
      address: '',
      phone: ''
    });
    setEditingCenter(null);
    setShowAddForm(false);
  };

  const getCenterStats = (center: Center) => {
    return {
      inventory: center.inventory?.length || 0,
      sales: center.sales?.length || 0,
      maintenance: center.maintenance?.length || 0
    };
  };

  // Only admin can access this component
  if (!currentUser?.isAdmin) {
    return (
      <div className="access-denied">
        <i className="fas fa-lock"></i>
        <h2>غير مصرح لك بالوصول لهذه الصفحة</h2>
        <p>يمكن للمديرين فقط إدارة المراكز</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <i className="fas fa-spinner fa-spin"></i>
        <p>جاري تحميل المراكز...</p>
      </div>
    );
  }

  return (
    <div className="center-management">
      <div className="page-header">
        <h1>
          <i className="fas fa-building"></i>
          إدارة المراكز
        </h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddForm(true)}
        >
          <i className="fas fa-plus"></i>
          إضافة مركز جديد
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
              <h3>{editingCenter ? 'تعديل المركز' : 'إضافة مركز جديد'}</h3>
              <button className="close-btn" onClick={resetForm}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="center-form">
              <div className="form-group">
                <label>اسم المركز:</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>اسم الموظف / المدير:</label>
                <input
                  type="text"
                  value={formData.managerName}
                  onChange={(e) => setFormData({...formData, managerName: e.target.value})}
                  placeholder="مثال: أحمد محمد"
                />
              </div>

              <div className="form-group">
                <label>العنوان:</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="المدينة - الحي - الشارع"
                />
              </div>

              <div className="form-group">
                <label>رقم الهاتف:</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="05xxxxxxxx"
                  pattern="^[0-9+\-() ]{6,}$"
                />
              </div>

              <div className="form-group">
                <label>البريد الإلكتروني:</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>كلمة المرور:</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder={editingCenter ? 'اتركها فارغة لعدم التغيير' : 'center123'}
                  {...(!editingCenter && { required: true })}
                />
                {!editingCenter && (
                  <small>كلمة المرور الافتراضية: center123</small>
                )}
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-save"></i>
                  {editingCenter ? 'تحديث' : 'إضافة'}
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

      <div className="centers-grid">
        {centers.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-building"></i>
            <p>لا توجد مراكز</p>
          </div>
        ) : (
          centers.map(center => {
            const stats = getCenterStats(center);
            return (
              <div key={center.id} className="center-card">
                <div className="center-header">
                  <h3>{center.name}</h3>
                  <div className="center-actions">
                    <button 
                      className="btn-icon edit"
                      onClick={() => handleEdit(center)}
                      title="تعديل"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button 
                      className="btn-icon delete"
                      onClick={() => handleDelete(center.id)}
                      title="حذف"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>

                <div className="center-info">
                  <div className="info-item">
                    <i className="fas fa-envelope"></i>
                    <span>{center.email}</span>
                  </div>
                  {center.managerName && (
                    <div className="info-item">
                      <i className="fas fa-user-tie"></i>
                      <span>المدير: {center.managerName}</span>
                    </div>
                  )}
                  {center.phone && (
                    <div className="info-item">
                      <i className="fas fa-phone"></i>
                      <span>{center.phone}</span>
                    </div>
                  )}
                  {center.address && (
                    <div className="info-item">
                      <i className="fas fa-map-marker-alt"></i>
                      <span>{center.address}</span>
                    </div>
                  )}
                  
                  <div className="info-item">
                    <i className="fas fa-calendar"></i>
                    <span>
                      تاريخ الإنشاء: {center.createdAt?.toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                </div>

                <div className="center-stats">
                  <div className="stat-item">
                    <div className="stat-icon">
                      <i className="fas fa-boxes"></i>
                    </div>
                    <div className="stat-content">
                      <div className="stat-number">{stats.inventory}</div>
                      <div className="stat-label">أصناف المخزون</div>
                    </div>
                  </div>

                  <div className="stat-item">
                    <div className="stat-icon">
                      <i className="fas fa-shopping-cart"></i>
                    </div>
                    <div className="stat-content">
                      <div className="stat-number">{stats.sales}</div>
                      <div className="stat-label">المبيعات</div>
                    </div>
                  </div>

                  <div className="stat-item">
                    <div className="stat-icon">
                      <i className="fas fa-tools"></i>
                    </div>
                    <div className="stat-content">
                      <div className="stat-number">{stats.maintenance}</div>
                      <div className="stat-label">طلبات الصيانة</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CenterManagement;
