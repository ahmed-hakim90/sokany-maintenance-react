import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { User, Center } from '../types';
import './UserManagement.css';

const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    centerId: '',
    isAdmin: false
  });

  useEffect(() => {
    if (currentUser?.isAdmin) {
      loadData();
    }
  }, [currentUser]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadUsers(), loadCenters()]);
    } catch (error) {
      showNotification('حدث خطأ في تحميل البيانات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const usersData: User[] = [];
      snapshot.forEach(doc => {
        usersData.push({ uid: doc.id, ...doc.data() } as User);
      });
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
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
      if (!formData.email || (!editingUser && !formData.password)) {
        showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
      }

      const selectedCenter = centers.find(c => c.id === formData.centerId);
      
      const userData = {
        email: formData.email,
        centerId: formData.centerId || null,
        centerName: selectedCenter?.name || null,
        isAdmin: formData.isAdmin,
        lastLogin: null
      };

      if (editingUser) {
        await updateDoc(doc(db, 'users', editingUser.uid), userData);
        showNotification('تم تحديث المستخدم بنجاح', 'success');
      } else {
        // Create new user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        // Use uid as document id (easier updates later)
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          ...userData,
          uid: userCredential.user.uid
        });
        showNotification('تم إضافة المستخدم بنجاح', 'success');
      }

      resetForm();
      loadUsers();
    } catch (error: any) {
      let errorMessage = 'حدث خطأ في حفظ البيانات';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'البريد الإلكتروني مستخدم من قبل';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'كلمة المرور ضعيفة';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'البريد الإلكتروني غير صالح';
      }
      showNotification(errorMessage, 'error');
      console.error('Error saving user:', error);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: '',
      centerId: user.centerId || '',
      isAdmin: user.isAdmin
    });
    setShowAddForm(true);
  };

  const handleDelete = async (userId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
      try {
        await deleteDoc(doc(db, 'users', userId));
        showNotification('تم حذف المستخدم بنجاح', 'success');
        loadUsers();
      } catch (error) {
        showNotification('حدث خطأ في حذف المستخدم', 'error');
        console.error('Error deleting user:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      centerId: '',
      isAdmin: false
    });
    setEditingUser(null);
    setShowAddForm(false);
  };

  const getCenterName = (centerId: string | undefined | null) => {
    if (!centerId) return 'غير محدد';
    const center = centers.find(c => c.id === centerId);
    return center?.name || 'غير محدد';
  };

  // Only admin can access this component
  if (!currentUser?.isAdmin) {
    return (
      <div className="access-denied">
        <i className="fas fa-lock"></i>
        <h2>غير مصرح لك بالوصول لهذه الصفحة</h2>
        <p>يمكن للمديرين فقط إدارة المستخدمين</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <i className="fas fa-spinner fa-spin"></i>
        <p>جاري تحميل المستخدمين...</p>
      </div>
    );
  }

  return (
    <div className="user-management">
      <div className="page-header">
        <h1>
          <i className="fas fa-users"></i>
          إدارة المستخدمين
        </h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddForm(true)}
        >
          <i className="fas fa-user-plus"></i>
          إضافة مستخدم جديد
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
              <h3>{editingUser ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}</h3>
              <button className="close-btn" onClick={resetForm}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="user-form">
              <div className="form-group">
                <label>البريد الإلكتروني:</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  disabled={!!editingUser}
                />
              </div>

              {!editingUser && (
                <div className="form-group">
                  <label>كلمة المرور:</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required
                    minLength={6}
                  />
                </div>
              )}

              <div className="form-group">
                <label>المركز:</label>
                <select
                  value={formData.centerId}
                  onChange={(e) => setFormData({...formData, centerId: e.target.value})}
                >
                  <option value="">بدون مركز (مدير)</option>
                  {centers.map(center => (
                    <option key={center.id} value={center.id}>
                      {center.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.isAdmin}
                    onChange={(e) => setFormData({...formData, isAdmin: e.target.checked})}
                  />
                  <span className="checkmark"></span>
                  مدير النظام
                </label>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-save"></i>
                  {editingUser ? 'تحديث' : 'إضافة'}
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

      <div className="users-table">
        {users.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-users"></i>
            <p>لا يوجد مستخدمين</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>البريد الإلكتروني</th>
                <th>المركز</th>
                <th>النوع</th>
                <th>آخر دخول</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.uid}>
                  <td>{user.email}</td>
                  <td>{getCenterName(user.centerId)}</td>
                  <td>
                    <span className={`user-type ${user.isAdmin ? 'admin' : 'user'}`}>
                      {user.isAdmin ? 'مدير' : 'مستخدم'}
                    </span>
                  </td>
                  <td>
                    {user.lastLogin 
                      ? new Date(user.lastLogin).toLocaleDateString('ar-EG')
                      : 'لم يسجل دخول'
                    }
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn-icon edit"
                        onClick={() => handleEdit(user)}
                        title="تعديل"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      {user.uid !== currentUser.uid && (
                        <button 
                          className="btn-icon delete"
                          onClick={() => handleDelete(user.uid)}
                          title="حذف"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
