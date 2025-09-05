import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { Center } from '../types';
import './LoginFormEnhanced.css';

const LoginFormEnhanced: React.FC = () => {
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
  const [showLoginInfo, setShowLoginInfo] = useState(false);

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

  const quickFillData = (centerData: { centerId: string, email: string, password: string }) => {
    setFormData(centerData);
    showNotification('تم ملء البيانات تلقائياً', 'success');
  };

  return (
    <div className="login-container-enhanced">
      <div className="login-form-enhanced">
        <div className="login-header">
          <div className="logo">
            <i className="fas fa-warehouse"></i>
          </div>
          <h1>نظام إدارة المخزون متعدد المراكز</h1>
          <p className="subtitle">نظام متكامل لإدارة المخازن والصيانة والمبيعات</p>
        </div>

        {/* معلومات تسجيل الدخول السريعة */}
        <div className="quick-login-info">
          <div 
            className="info-toggle" 
            onClick={() => setShowLoginInfo(!showLoginInfo)}
          >
            <i className={`fas ${showLoginInfo ? 'fa-eye-slash' : 'fa-info-circle'}`}></i>
            {showLoginInfo ? 'إخفاء معلومات الدخول' : 'عرض معلومات الدخول السريع'}
          </div>
          
          {showLoginInfo && (
            <div className="login-hints">
              <div className="hint-section admin-hint">
                <h4>
                  <i className="fas fa-crown"></i>
                  دخول المسؤول
                </h4>
                <p>اختر "لوحة المسؤول" وكلمة المرور: <code>admin123</code></p>
                <button 
                  className="quick-fill-btn admin-btn"
                  onClick={() => quickFillData({ centerId: 'admin', email: '', password: 'admin123' })}
                >
                  <i className="fas fa-bolt"></i>
                  ملء سريع للمسؤول
                </button>
              </div>
              
              <div className="hint-section centers-hint">
                <h4>
                  <i className="fas fa-building"></i>
                  المراكز التجريبية
                </h4>
                <div className="sample-accounts">
                  <div className="account">
                    <div className="account-info">
                      <strong>مركز الرياض الرئيسي</strong>
                      <span>riyadh@sokany.com / riyadh123</span>
                    </div>
                    <button 
                      className="quick-fill-btn"
                      onClick={() => quickFillData({ 
                        centerId: 'center-riyadh-001', 
                        email: 'riyadh@sokany.com', 
                        password: 'riyadh123' 
                      })}
                    >
                      <i className="fas fa-bolt"></i>
                      ملء سريع
                    </button>
                  </div>
                  
                  <div className="account">
                    <div className="account-info">
                      <strong>مركز جدة التجاري</strong>
                      <span>jeddah@sokany.com / jeddah123</span>
                    </div>
                    <button 
                      className="quick-fill-btn"
                      onClick={() => quickFillData({ 
                        centerId: 'center-jeddah-002', 
                        email: 'jeddah@sokany.com', 
                        password: 'jeddah123' 
                      })}
                    >
                      <i className="fas fa-bolt"></i>
                      ملء سريع
                    </button>
                  </div>
                  
                  <div className="account">
                    <div className="account-info">
                      <strong>مركز الدمام الشرقي</strong>
                      <span>dammam@sokany.com / dammam123</span>
                    </div>
                    <button 
                      className="quick-fill-btn"
                      onClick={() => quickFillData({ 
                        centerId: 'center-dammam-003', 
                        email: 'dammam@sokany.com', 
                        password: 'dammam123' 
                      })}
                    >
                      <i className="fas fa-bolt"></i>
                      ملء سريع
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="enhanced-form">
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
              className="enhanced-select"
            >
              <option value="">-- اختر المركز --</option>
              <option value="admin">🔑 لوحة المسؤول</option>
              {centers.map(center => (
                <option key={center.id} value={center.id}>
                  🏢 {center.name}
                </option>
              ))}
            </select>
          </div>

          {formData.centerId !== 'admin' && (
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
                className="enhanced-input"
                required
              />
            </div>
          )}

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
              placeholder={formData.centerId === 'admin' ? 'كلمة مرور المسؤول' : 'كلمة مرور المركز'}
              className="enhanced-input"
              required
            />
          </div>

          <button 
            type="submit" 
            className="enhanced-login-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                جاري تسجيل الدخول...
              </>
            ) : (
              <>
                <i className="fas fa-sign-in-alt"></i>
                {formData.centerId === 'admin' ? 'دخول كمسؤول' : 'تسجيل دخول'}
              </>
            )}
          </button>
        </form>

        {notification && (
          <div className={`enhanced-notification ${notification.type}`}>
            <i className={`fas ${notification.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
            {notification.message}
          </div>
        )}

        {error && (
          <div className="enhanced-notification error">
            <i className="fas fa-exclamation-circle"></i>
            {error}
          </div>
        )}

        <div className="login-footer">
          <p>
            <i className="fas fa-shield-alt"></i>
            نظام آمن ومشفر لحماية بياناتك
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginFormEnhanced;
