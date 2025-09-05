import React, { useState } from 'react';
import { createSampleData, verifyData, sampleCenters } from '../utils/sampleData';
import './DataManager.css';

const DataManager: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleCreateData = async () => {
    setLoading(true);
    setShowResults(false);
    
    try {
      const result = await createSampleData();
      
      if (result.success) {
        alert('✅ تم إنشاء البيانات التجريبية بنجاح!\n\nيمكنك الآن تسجيل الدخول باستخدام البيانات المعروضة أدناه.');
        const verification = await verifyData();
        setResults(verification);
        setShowResults(true);
      } else {
        alert('❌ حدث خطأ في إنشاء البيانات: ' + result.message);
      }
    } catch (error: any) {
      alert('❌ خطأ: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyData = async () => {
    setLoading(true);
    
    try {
      const verification = await verifyData();
      setResults(verification);
      setShowResults(true);
    } catch (error: any) {
      alert('❌ خطأ في التحقق: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('تم النسخ! 📋');
  };

  return (
    <div className="data-manager">
      <div className="data-manager-header">
        <h2>
          <i className="fas fa-database"></i>
          إدارة البيانات التجريبية
        </h2>
        <p>إنشاء وإدارة بيانات المراكز التجريبية للنظام</p>
      </div>

      <div className="action-buttons">
        <button 
          className="btn-primary"
          onClick={handleCreateData}
          disabled={loading}
        >
          {loading ? (
            <>
              <i className="fas fa-spinner fa-spin"></i>
              جاري الإنشاء...
            </>
          ) : (
            <>
              <i className="fas fa-plus-circle"></i>
              إنشاء البيانات التجريبية
            </>
          )}
        </button>

        <button 
          className="btn-secondary"
          onClick={handleVerifyData}
          disabled={loading}
        >
          <i className="fas fa-check-circle"></i>
          التحقق من البيانات
        </button>
      </div>

      <div className="login-info">
        <h3>
          <i className="fas fa-info-circle"></i>
          بيانات تسجيل الدخول
        </h3>
        
        <div className="admin-login">
          <h4>🔑 دخول المسؤول</h4>
          <div className="login-card">
            <div className="login-field">
              <label>المركز:</label>
              <span>لوحة المسؤول</span>
            </div>
            <div className="login-field">
              <label>كلمة المرور:</label>
              <span 
                className="copy-text"
                onClick={() => copyToClipboard('admin123')}
              >
                admin123
                <i className="fas fa-copy"></i>
              </span>
            </div>
          </div>
        </div>

        <div className="centers-login">
          <h4>🏢 دخول المراكز</h4>
          {sampleCenters.map((center) => (
            <div key={center.id} className="login-card">
              <div className="center-header">
                <h5>{center.name}</h5>
                <span className="manager">المدير: {center.manager}</span>
              </div>
              
              <div className="login-fields">
                <div className="login-field">
                  <label>البريد الإلكتروني:</label>
                  <span 
                    className="copy-text"
                    onClick={() => copyToClipboard(center.email)}
                  >
                    {center.email}
                    <i className="fas fa-copy"></i>
                  </span>
                </div>
                
                <div className="login-field">
                  <label>كلمة المرور:</label>
                  <span 
                    className="copy-text"
                    onClick={() => copyToClipboard(center.password)}
                  >
                    {center.password}
                    <i className="fas fa-copy"></i>
                  </span>
                </div>
                
                <div className="center-details">
                  <small>
                    <i className="fas fa-map-marker-alt"></i>
                    {center.location}
                  </small>
                  <small>
                    <i className="fas fa-phone"></i>
                    {center.phone}
                  </small>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showResults && (
        <div className="verification-results">
          <h3>
            <i className="fas fa-check-double"></i>
            نتائج التحقق
          </h3>
          
          <div className="results-grid">
            {results.map((result, index) => (
              <div key={index} className="result-card">
                <div className="result-header">
                  <h4>{result.center}</h4>
                  <span className="status">{result.status}</span>
                </div>
                <p>{result.email}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="instructions">
        <h3>
          <i className="fas fa-graduation-cap"></i>
          تعليمات الاستخدام
        </h3>
        
        <ol>
          <li>انقر على "إنشاء البيانات التجريبية" لإنشاء المراكز والبيانات</li>
          <li>استخدم بيانات تسجيل الدخول الموضحة أعلاه</li>
          <li>للمسؤول: اختر "لوحة المسؤول" واستخدم كلمة المرور</li>
          <li>للمراكز: اختر المركز وأدخل البريد وكلمة المرور</li>
          <li>انقر على أي بيانات لنسخها تلقائياً</li>
        </ol>
      </div>
    </div>
  );
};

export default DataManager;
