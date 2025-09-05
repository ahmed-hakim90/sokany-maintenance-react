import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { Center } from '../types';
import './LoginForm.css';

const LoginForm: React.FC = () => {
  const { login, loginAsAdmin, loading, error } = useAuth();
  const [formData, setFormData] = useState({
    centerId: '',
    email: '',
    password: ''
  });
  const [centers, setCenters] = useState<Center[]>([]);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);
//   const [showLoginInfo, setShowLoginInfo] = useState(false);

  useEffect(() => {
    loadCenters();
  }, []);

  const loadCenters = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'centers'));
      const centersData: Center[] = [];
      snapshot.forEach(doc => {
        centersData.push({ id: doc.id, ...doc.data() } as Center);
      });
      setCenters(centersData);
    } catch (error) {
      showNotification('حدث خطأ في تحميل المراكز', 'error');
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (formData.centerId === 'admin') {
        await loginAsAdmin(formData.password);
        showNotification('تم الدخول كمسؤول بنجاح', 'success');
      } else {
        if (!formData.centerId || !formData.email || !formData.password) {
          showNotification('يرجى ملء جميع الحقول', 'error');
          return;
        }
        await login(formData.email, formData.password, formData.centerId);
        showNotification('تم تسجيل الدخول بنجاح', 'success');
      }
    } catch (error: any) {
      showNotification(error.message || 'حدث خطأ في تسجيل الدخول', 'error');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const showAdminLogin = () => {
    setFormData({
      ...formData,
      centerId: 'admin'
    });
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <h1>
          <i className="fas fa-warehouse"></i>
          نظام إدارة المخزون متعدد المراكز
        </h1>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="center-select">
              <i className="fas fa-building"></i>
              اختر المركز:
            </label>
            <select
              id="center-select"
              name="centerId"
              value={formData.centerId}
              onChange={handleInputChange}
              required
            >
              <option value="">-- اختر المركز --</option>
              <option value="admin">لوحة المسؤول</option>
              {centers.map(center => (
                <option key={center.id} value={center.id}>
                  {center.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="email">
              <i className="fas fa-envelope"></i>
              البريد الإلكتروني:
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="أدخل البريد الإلكتروني"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              <i className="fas fa-lock"></i>
              كلمة المرور:
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="أدخل كلمة المرور"
              required
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? (
              <span className="loading">
                <i className="fas fa-spinner fa-spin"></i>
                جاري تسجيل الدخول...
              </span>
            ) : (
              <>
                <i className="fas fa-sign-in-alt"></i>
                تسجيل الدخول
              </>
            )}
          </button>
        </form>

        <div className="admin-section">
          <p>للدخول كمسؤول، اختر "لوحة المسؤول" من القائمة وأدخل كلمة مرور المسؤول</p>
          <button 
            type="button" 
            className="admin-btn"
            onClick={showAdminLogin}
          >
            <i className="fas fa-user-cog"></i>
            دخول المسؤول
          </button>
        </div>
      </div>

      {notification && (
        <div className={`notification ${notification.type} show`}>
          {notification.message}
        </div>
      )}

      {error && (
        <div className="notification error show">
          {error}
        </div>
      )}
    </div>
  );
};

export default LoginForm;
