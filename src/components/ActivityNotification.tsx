import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import useRealTimeActivities from '../hooks/useRealTimeActivities';
import './ActivityNotification.css';

const ActivityNotification: React.FC = () => {
  const { user } = useAuth();
  const { latestActivity } = useRealTimeActivities(user?.isAdmin || false);
  const [showNotification, setShowNotification] = useState(false);
  const [lastActivityId, setLastActivityId] = useState<string | null>(null);

  useEffect(() => {
    if (latestActivity && latestActivity.id !== lastActivityId && lastActivityId !== null) {
      setShowNotification(true);
      setLastActivityId(latestActivity.id);
      
      // إخفاء الإشعار تلقائياً بعد 5 ثوانٍ
      const timer = setTimeout(() => {
        setShowNotification(false);
      }, 5000);

      return () => clearTimeout(timer);
    } else if (latestActivity && lastActivityId === null) {
      // إعداد أول نشاط بدون إظهار إشعار
      setLastActivityId(latestActivity.id);
    }
  }, [latestActivity, lastActivityId]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'inventory': return 'fas fa-boxes';
      case 'sales': return 'fas fa-shopping-cart';
      case 'maintenance': return 'fas fa-tools';
      case 'customer': return 'fas fa-users';
      case 'technician': return 'fas fa-user-tie';
      case 'login': return 'fas fa-sign-in-alt';
      case 'logout': return 'fas fa-sign-out-alt';
      default: return 'fas fa-info-circle';
    }
  };

  const getActivityTypeColor = (type: string) => {
    switch (type) {
      case 'inventory': return '#3498db';
      case 'sales': return '#27ae60';
      case 'maintenance': return '#e74c3c';
      case 'customer': return '#9b59b6';
      case 'technician': return '#f39c12';
      case 'login': return '#1abc9c';
      case 'logout': return '#95a5a6';
      default: return '#34495e';
    }
  };

  if (!user?.isAdmin || !showNotification || !latestActivity) {
    return null;
  }

  return (
    <div className="activity-notification">
      <div className="notification-content">
        <div 
          className="notification-icon"
          style={{ backgroundColor: getActivityTypeColor(latestActivity.type) }}
        >
          <i className={getActivityIcon(latestActivity.type)}></i>
        </div>
        <div className="notification-text">
          <div className="notification-title">نشاط جديد</div>
          <div className="notification-message">{latestActivity.description}</div>
          <div className="notification-meta">
            <span>{latestActivity.centerName}</span>
            <span>•</span>
            <span>{latestActivity.userName}</span>
          </div>
        </div>
        <button 
          className="notification-close"
          onClick={() => setShowNotification(false)}
        >
          <i className="fas fa-times"></i>
        </button>
      </div>
    </div>
  );
};

export default ActivityNotification;
