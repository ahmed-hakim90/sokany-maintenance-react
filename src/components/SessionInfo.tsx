import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const SessionInfo: React.FC = () => {
  const { user } = useAuth();
  const [sessionData, setSessionData] = useState<any>(null);

  useEffect(() => {
    const loadSessionData = () => {
      const userData = localStorage.getItem('userData');
      const currentCenter = localStorage.getItem('currentCenter');
      const isLoggedIn = localStorage.getItem('isLoggedIn');
      
      if (userData) {
        setSessionData({
          user: JSON.parse(userData),
          center: currentCenter ? JSON.parse(currentCenter) : null,
          isLoggedIn,
          storageKeys: Object.keys(localStorage)
        });
      }
    };

    loadSessionData();
    
    // Update every second to show real-time data
    const interval = setInterval(loadSessionData, 1000);
    
    return () => clearInterval(interval);
  }, [user]);

  const clearSession = () => {
    localStorage.clear();
    window.location.reload();
  };

  if (!sessionData) return null;

  const formatDate = (dateString: string) => {
    if (!dateString) return 'غير محدد';
    try {
      return new Date(dateString).toLocaleString('ar-EG');
    } catch {
      return dateString;
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '15px',
      borderRadius: '10px',
      fontSize: '12px',
      zIndex: 1000,
      minWidth: '300px',
      fontFamily: 'monospace'
    }}>
      <h4 style={{ margin: '0 0 10px 0', color: '#4CAF50' }}>معلومات الجلسة 🔐</h4>
      
      <div><strong>الحالة:</strong> {sessionData.isLoggedIn === 'true' ? '✅ مسجل دخول' : '❌ غير مسجل'}</div>
      
      <div><strong>المستخدم:</strong> {sessionData.user.email || 'غير محدد'}</div>
      
      {sessionData.user.isAdmin ? (
        <div><strong>النوع:</strong> 👑 مسؤول</div>
      ) : (
        <>
          <div><strong>المركز:</strong> {sessionData.user.centerName || 'غير محدد'}</div>
          <div><strong>ID المركز:</strong> {sessionData.user.centerId || 'غير محدد'}</div>
        </>
      )}
      
      <div><strong>آخر دخول:</strong> {formatDate(sessionData.user.lastLogin)}</div>
      
      {sessionData.user.lastActivity && (
        <div><strong>آخر نشاط:</strong> {formatDate(sessionData.user.lastActivity)}</div>
      )}
      
      <div><strong>عدد مفاتيح التخزين:</strong> {sessionData.storageKeys.length}</div>
      
      <button 
        onClick={clearSession}
        style={{
          marginTop: '10px',
          background: '#f44336',
          color: 'white',
          border: 'none',
          padding: '5px 10px',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        مسح الجلسة
      </button>
    </div>
  );
};

export default SessionInfo;
