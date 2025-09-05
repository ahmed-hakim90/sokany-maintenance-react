import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { CenterActivityLog } from '../types';
import './RecentActivitiesWidget.css';

interface GlobalActivityWithCenter extends CenterActivityLog {
  centerName: string;
  centerId: string;
}

const RecentActivitiesWidget: React.FC = () => {
  const { user } = useAuth();
  const [recentActivities, setRecentActivities] = useState<GlobalActivityWithCenter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.isAdmin) {
      loadRecentActivities();
      // تحديث كل 30 ثانية
      const interval = setInterval(loadRecentActivities, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadRecentActivities = async () => {
    try {
      const activitiesQuery = query(
        collection(db, 'globalActivities'),
        orderBy('timestamp', 'desc'),
        limit(10)
      );

      const snapshot = await getDocs(activitiesQuery);
      const activities: GlobalActivityWithCenter[] = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        activities.push({
          id: doc.id,
          centerId: data.centerId,
          centerName: data.centerName || 'غير محدد',
          userId: data.userId || '',
          userName: data.userName || data.performedBy || '',
          timestamp: data.timestamp.toDate(),
          action: data.action || '',
          description: data.description || data.action || '',
          type: data.type || 'other',
          details: data.details || null,
          // للتوافق مع النسخة القديمة
          activityType: data.activityType,
          targetId: data.targetId || '',
          targetName: data.targetName || '',
          performedBy: data.performedBy || ''
        });
      });

      setRecentActivities(activities);
    } catch (error) {
      console.error('Error loading recent activities:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'منذ أقل من دقيقة';
    if (diffInSeconds < 3600) return `منذ ${Math.floor(diffInSeconds / 60)} دقيقة`;
    if (diffInSeconds < 86400) return `منذ ${Math.floor(diffInSeconds / 3600)} ساعة`;
    return `منذ ${Math.floor(diffInSeconds / 86400)} يوم`;
  };

  if (!user?.isAdmin) return null;

  return (
    <div className="recent-activities-widget">
      <div className="widget-header">
        <h3>
          <i className="fas fa-clock"></i>
          آخر الأنشطة
        </h3>
        <button 
          className="refresh-btn-small"
          onClick={loadRecentActivities}
          disabled={loading}
        >
          <i className={`fas fa-sync-alt ${loading ? 'spinning' : ''}`}></i>
        </button>
      </div>

      <div className="widget-content">
        {loading ? (
          <div className="widget-loading">
            <div className="loading-spinner-small"></div>
            <span>جاري التحميل...</span>
          </div>
        ) : recentActivities.length === 0 ? (
          <div className="no-activities-widget">
            <i className="fas fa-info-circle"></i>
            <span>لا توجد أنشطة حديثة</span>
          </div>
        ) : (
          <div className="activities-list-widget">
            {recentActivities.map(activity => (
              <div key={`${activity.centerId}-${activity.id}`} className="activity-item-widget">
                <div 
                  className="activity-icon-widget"
                  style={{ backgroundColor: getActivityTypeColor(activity.activityType || 'other') }}
                >
                  <i className={getActivityIcon(activity.activityType || 'other')}></i>
                </div>
                <div className="activity-content-widget">
                  <div className="activity-text">
                    <span className="activity-action-widget">{activity.action}</span>
                    <div className="activity-meta-widget">
                      <span className="activity-center-widget">{activity.centerName}</span>
                      <span className="activity-time-widget">{formatTimeAgo(activity.timestamp)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentActivitiesWidget;
