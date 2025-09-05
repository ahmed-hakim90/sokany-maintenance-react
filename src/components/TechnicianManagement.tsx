import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useActivityLogger } from './CenterSessionManagement';
import type { Technician, Center } from '../types';
import './TechnicianManagement.css';

const TechnicianManagement: React.FC = () => {
  const { user } = useAuth();
  const { logActivity } = useActivityLogger();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null);
  const [selectedTechnicianStats, setSelectedTechnicianStats] = useState<any>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    centerId: user?.centerId || ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadTechnicians(), loadCenters()]);
    } catch (error) {
      showNotification('حدث خطأ في تحميل البيانات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadTechnicians = async () => {
    try {
      let techniciansData: Technician[] = [];
      
      if (user?.isAdmin) {
        // الأدمن يرى جميع الفنيين من جميع المراكز
        const centersSnapshot = await getDocs(collection(db, 'centers'));
        for (const centerDoc of centersSnapshot.docs) {
          const techniciansSnapshot = await getDocs(
            collection(db, 'centers', centerDoc.id, 'technicians')
          );
          techniciansSnapshot.forEach(doc => {
            const data = doc.data();
            techniciansData.push({
              id: doc.id,
              ...data,
              centerId: centerDoc.id,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date()
            } as Technician);
          });
        }
      } else if (user?.centerId) {
        // مدير المركز يرى فنيي مركزه فقط
        const techniciansSnapshot = await getDocs(
          collection(db, 'centers', user.centerId, 'technicians')
        );
        techniciansSnapshot.forEach(doc => {
          const data = doc.data();
          techniciansData.push({
            id: doc.id,
            ...data,
            centerId: user.centerId,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          } as Technician);
        });
      }
      
      setTechnicians(techniciansData);
    } catch (error) {
      console.error('Error loading technicians:', error);
      showNotification('حدث خطأ في تحميل الفنيين', 'error');
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

      // إضافة اسم المركز للفنيين
      const updatedTechnicians = technicians.map(tech => ({
        ...tech,
        centerName: centersData.find(c => c.id === tech.centerId)?.name || 'غير محدد'
      }));
      
      setCenters(centersData);
      setTechnicians(updatedTechnicians);
    } catch (error) {
      console.error('Error loading centers:', error);
    }
  };

  const loadTechnicianStats = async (technicianId: string) => {
    try {
      let totalRequests = 0;
      let completedRequests = 0;
      let pendingRequests = 0;
      let inProgressRequests = 0;

      if (user?.isAdmin) {
        // البحث في جميع المراكز
        const centersSnapshot = await getDocs(collection(db, 'centers'));
        for (const centerDoc of centersSnapshot.docs) {
          const maintenanceSnapshot = await getDocs(
            query(
              collection(db, 'centers', centerDoc.id, 'maintenance'),
              where('technicianId', '==', technicianId)
            )
          );
          
          maintenanceSnapshot.forEach(doc => {
            const data = doc.data();
            totalRequests++;
            if (data.status === 'completed') completedRequests++;
            else if (data.status === 'pending') pendingRequests++;
            else if (data.status === 'in-progress') inProgressRequests++;
          });
        }
      } else if (user?.centerId) {
        // البحث في مركز واحد فقط
        const maintenanceSnapshot = await getDocs(
          query(
            collection(db, 'centers', user.centerId, 'maintenance'),
            where('technicianId', '==', technicianId)
          )
        );
        
        maintenanceSnapshot.forEach(doc => {
          const data = doc.data();
          totalRequests++;
          if (data.status === 'completed') completedRequests++;
          else if (data.status === 'pending') pendingRequests++;
          else if (data.status === 'in-progress') inProgressRequests++;
        });
      }

      setSelectedTechnicianStats({
        totalRequests,
        completedRequests,
        pendingRequests,
        inProgressRequests,
        completionRate: totalRequests > 0 ? ((completedRequests / totalRequests) * 100).toFixed(1) : '0'
      });
    } catch (error) {
      console.error('Error loading technician stats:', error);
      showNotification('خطأ في تحميل إحصائيات الفني', 'error');
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

      const technicianData = {
        name: formData.name,
        phoneNumber: formData.phoneNumber,
        centerId: formData.centerId,
        updatedAt: new Date()
      };

      if (editingTechnician) {
        // تحديث فني موجود
        await updateDoc(
          doc(db, 'centers', formData.centerId, 'technicians', editingTechnician.id), 
          technicianData
        );
        
        // تسجيل النشاط
        await logActivity(
          'technician',
          `تم تحديث بيانات الفني: ${formData.name}`,
          editingTechnician.id,
          formData.name,
          { oldData: editingTechnician, newData: technicianData }
        );
        
        showNotification('تم تحديث بيانات الفني بنجاح', 'success');
      } else {
        // إضافة فني جديد
        const docRef = await addDoc(collection(db, 'centers', formData.centerId, 'technicians'), {
          ...technicianData,
          createdAt: new Date()
        });
        
        // تسجيل النشاط
        await logActivity(
          'technician',
          `تم إضافة فني جديد: ${formData.name}`,
          docRef.id,
          formData.name,
          technicianData
        );
        
        showNotification('تم إضافة الفني بنجاح', 'success');
      }

      resetForm();
      loadTechnicians();
    } catch (error) {
      showNotification('حدث خطأ في حفظ البيانات', 'error');
      console.error('Error saving technician:', error);
    }
  };

  const handleEdit = (technician: Technician) => {
    setEditingTechnician(technician);
    setFormData({
      name: technician.name,
      phoneNumber: technician.phoneNumber,
      centerId: technician.centerId
    });
    setShowAddForm(true);
  };

  const handleDelete = async (technician: Technician) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الفني؟')) {
      try {
        await deleteDoc(doc(db, 'centers', technician.centerId, 'technicians', technician.id));
        
        // تسجيل النشاط
        await logActivity(
          'technician',
          `تم حذف الفني: ${technician.name}`,
          technician.id,
          technician.name,
          { deletedTechnician: technician }
        );
        
        showNotification('تم حذف الفني بنجاح', 'success');
        loadTechnicians();
      } catch (error) {
        showNotification('حدث خطأ في حذف الفني', 'error');
        console.error('Error deleting technician:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phoneNumber: '',
      centerId: user?.centerId || ''
    });
    setEditingTechnician(null);
    setShowAddForm(false);
  };

  const getCenterName = (centerId: string) => {
    const center = centers.find(c => c.id === centerId);
    return center?.name || 'غير محدد';
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <i className="fas fa-spinner fa-spin"></i>
        <p>جاري تحميل الفنيين...</p>
      </div>
    );
  }

  return (
    <div className="technician-management">
      <div className="page-header">
        <h1>
          <i className="fas fa-users-cog"></i>
          إدارة الفنيين
        </h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddForm(true)}
        >
          <i className="fas fa-plus"></i>
          إضافة فني جديد
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
                {editingTechnician ? 'تعديل الفني' : 'إضافة فني جديد'}
              </h3>
              <button className="btn-close" onClick={resetForm}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group">
                <label>اسم الفني</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="أدخل اسم الفني"
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
                  {editingTechnician ? 'تحديث' : 'إضافة'}
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

      <div className="technicians-grid">
        {technicians.length === 0 ? (
          <div className="no-data">
            <i className="fas fa-user-cog"></i>
            <p>لا توجد فنيين مضافين بعد</p>
          </div>
        ) : (
          technicians.map(technician => (
            <div key={technician.id} className="technician-card">
              <div className="card-header">
                <h3>{technician.name}</h3>
                <div className="card-actions">
                  <button 
                    className="btn-icon stats"
                    onClick={() => loadTechnicianStats(technician.id)}
                    title="عرض الإحصائيات"
                  >
                    <i className="fas fa-chart-bar"></i>
                  </button>
                  <button 
                    className="btn-icon edit"
                    onClick={() => handleEdit(technician)}
                    title="تعديل"
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button 
                    className="btn-icon delete"
                    onClick={() => handleDelete(technician)}
                    title="حذف"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>

              <div className="card-info">
                <div className="info-item">
                  <span className="label">الهاتف:</span>
                  <span className="value">{technician.phoneNumber}</span>
                </div>
                <div className="info-item">
                  <span className="label">المركز:</span>
                  <span className="value">{getCenterName(technician.centerId)}</span>
                </div>
                <div className="info-item">
                  <span className="label">تاريخ الإضافة:</span>
                  <span className="value">
                    {technician.createdAt.toLocaleDateString('ar-EG')}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedTechnicianStats && (
        <div className="modal-overlay">
          <div className="modal stats-modal">
            <div className="modal-header">
              <h3>
                <i className="fas fa-chart-bar"></i>
                إحصائيات الفني
              </h3>
              <button 
                className="btn-close" 
                onClick={() => setSelectedTechnicianStats(null)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="stats-grid">
                <div className="stat-card total">
                  <i className="fas fa-clipboard-list"></i>
                  <div className="stat-info">
                    <span className="stat-label">إجمالي الطلبات</span>
                    <span className="stat-value">{selectedTechnicianStats.totalRequests}</span>
                  </div>
                </div>

                <div className="stat-card completed">
                  <i className="fas fa-check-circle"></i>
                  <div className="stat-info">
                    <span className="stat-label">طلبات مكتملة</span>
                    <span className="stat-value">{selectedTechnicianStats.completedRequests}</span>
                  </div>
                </div>

                <div className="stat-card in-progress">
                  <i className="fas fa-cog"></i>
                  <div className="stat-info">
                    <span className="stat-label">قيد التنفيذ</span>
                    <span className="stat-value">{selectedTechnicianStats.inProgressRequests}</span>
                  </div>
                </div>

                <div className="stat-card pending">
                  <i className="fas fa-clock"></i>
                  <div className="stat-info">
                    <span className="stat-label">في الانتظار</span>
                    <span className="stat-value">{selectedTechnicianStats.pendingRequests}</span>
                  </div>
                </div>

                <div className="stat-card completion-rate">
                  <i className="fas fa-percentage"></i>
                  <div className="stat-info">
                    <span className="stat-label">معدل الإنجاز</span>
                    <span className="stat-value">{selectedTechnicianStats.completionRate}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicianManagement;
