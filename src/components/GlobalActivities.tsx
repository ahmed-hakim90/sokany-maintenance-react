import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import './GlobalActivities.css';

interface Activity {
  id: string;
  type: string;
  activityType?: string;
  description: string;
  performedBy: string;
  performedById?: string;
  timestamp: any;
  centerName?: string;
  centerId?: string;
  targetId?: string;
  targetName?: string;
}

const GlobalActivities: React.FC = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    loadActivities();
  }, [user, filter]);

  const loadActivities = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const allActivities: Activity[] = [];

      if (user.isAdmin) {
        // للمدير: جمع الأنشطة من جميع المراكز
        const centersSnapshot = await getDocs(collection(db, 'centers'));
        
        for (const centerDoc of centersSnapshot.docs) {
          const centerData = centerDoc.data();
          
          // جمع أنشطة المركز
          const activitiesSnapshot = await getDocs(
            query(
              collection(db, 'centers', centerDoc.id, 'activities'),
              orderBy('timestamp', 'desc'),
              limit(50)
            )
          );

          activitiesSnapshot.forEach((doc) => {
            const data = doc.data();
            allActivities.push({
              id: doc.id,
              type: data.activityType || data.type || 'نشاط عام',
              activityType: data.activityType || data.type,
              description: data.description || 'بدون وصف',
              performedBy: data.performedBy || 'مستخدم غير معروف',
              performedById: data.performedById || data.userId,
              timestamp: data.timestamp,
              centerName: centerData.name,
              centerId: centerDoc.id,
              targetId: data.targetId,
              targetName: data.targetName
            });
          });
        }
      } else {
        // للمستخدم العادي: أنشطة مركزه فقط
        if (user.centerId) {
          const activitiesSnapshot = await getDocs(
            query(
              collection(db, 'centers', user.centerId, 'activities'),
              orderBy('timestamp', 'desc'),
              limit(100)
            )
          );

          activitiesSnapshot.forEach((doc) => {
            const data = doc.data();
            allActivities.push({
              id: doc.id,
              type: data.activityType || data.type || 'نشاط عام',
              activityType: data.activityType || data.type,
              description: data.description || 'بدون وصف',
              performedBy: data.performedBy || 'مستخدم غير معروف',
              performedById: data.performedById || data.userId,
              timestamp: data.timestamp,
              centerId: user.centerId,
              targetId: data.targetId,
              targetName: data.targetName
            });
          });
        }
      }

      // ترتيب الأنشطة حسب الوقت
      allActivities.sort((a, b) => {
        if (!a.timestamp) return 1;
        if (!b.timestamp) return -1;
        return b.timestamp.seconds - a.timestamp.seconds;
      });

      setActivities(allActivities);
    } catch (error) {
      console.error('خطأ في تحميل الأنشطة:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'وقت غير محدد';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return new Intl.DateTimeFormat('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      return 'وقت غير صحيح';
    }
  };

  const getActivityIcon = (type: string) => {
    const iconMap: { [key: string]: string } = {
      'إضافة فني': 'fas fa-user-plus',
      'تحديث فني': 'fas fa-user-edit',
      'حذف فني': 'fas fa-user-times',
      'إضافة عميل': 'fas fa-user-plus',
      'تحديث عميل': 'fas fa-user-edit',
      'حذف عميل': 'fas fa-user-times',
      'إضافة قطعة غيار': 'fas fa-plus-square',
      'تحديث قطعة غيار': 'fas fa-edit',
      'حذف قطعة غيار': 'fas fa-trash',
      'بيع قطعة غيار': 'fas fa-shopping-cart',
      'إضافة طلب صيانة': 'fas fa-tools',
      'تحديث طلب صيانة': 'fas fa-wrench',
      'بدء جلسة': 'fas fa-play-circle',
      'انتهاء جلسة': 'fas fa-stop-circle',
    };
    return iconMap[type] || 'fas fa-circle-notch';
  };

  const getActivityColor = (type: string) => {
    if (type.includes('إضافة')) return '#28a745';
    if (type.includes('تحديث')) return '#ffc107';
    if (type.includes('حذف')) return '#dc3545';
    if (type.includes('بيع')) return '#007bff';
    if (type.includes('صيانة')) return '#6f42c1';
    if (type.includes('جلسة')) return '#17a2b8';
    return '#6c757d';
  };

  const filteredActivities = activities.filter(activity => {
    if (filter !== 'all' && activity.type !== filter) return false;
    if (searchTerm && !activity.description.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !activity.performedBy.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !activity.type.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  const activityTypes = [...new Set(activities.map(a => a.type))];

  if (loading) {
    return (
      <div className="global-activities-container">
        <div className="loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
          <p>جاري تحميل الأنشطة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="global-activities-container">
      <div className="activities-header">
        <h2>
          <i className="fas fa-list-alt"></i>
          الأنشطة العمومية
        </h2>
        <p>عرض جميع الأنشطة والعمليات في النظام</p>
      </div>

      <div className="activities-controls">
        <div className="search-section">
          <input
            type="text"
            placeholder="البحث في الأنشطة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-section">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">جميع الأنشطة</option>
            {activityTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <button onClick={loadActivities} className="refresh-btn">
          <i className="fas fa-sync-alt"></i>
          تحديث
        </button>
      </div>

      <div className="activities-stats">
        <div className="stat-card">
          <i className="fas fa-list-alt"></i>
          <span>إجمالي الأنشطة</span>
          <strong>{activities.length}</strong>
        </div>
        <div className="stat-card">
          <i className="fas fa-filter"></i>
          <span>النتائج المعروضة</span>
          <strong>{filteredActivities.length}</strong>
        </div>
        <div className="stat-card">
          <i className="fas fa-tags"></i>
          <span>أنواع الأنشطة</span>
          <strong>{activityTypes.length}</strong>
        </div>
      </div>

      <div className="activities-grid">
        {filteredActivities.length === 0 ? (
          <div className="no-activities">
            <i className="fas fa-inbox"></i>
            <h3>لا توجد أنشطة</h3>
            <p>{searchTerm ? `لم يتم العثور على نتائج للبحث "${searchTerm}"` : 'لم يتم تسجيل أي أنشطة بعد'}</p>
          </div>
        ) : (
          filteredActivities.map((activity) => (
            <div key={activity.id} className="activity-card">
              <div className="activity-header">
                <div className="activity-icon" style={{ backgroundColor: getActivityColor(activity.type) }}>
                  <i className={getActivityIcon(activity.type)}></i>
                </div>
                <div className="activity-info">
                  <h4>{activity.type}</h4>
                  <span className="activity-time">{formatTimestamp(activity.timestamp)}</span>
                </div>
              </div>

              <div className="activity-body">
                <p className="activity-description">{activity.description}</p>
                
                <div className="activity-details">
                  <div className="detail-item">
                    <i className="fas fa-user"></i>
                    <span>بواسطة: {activity.performedBy}</span>
                  </div>
                  
                  {activity.centerName && user?.isAdmin && (
                    <div className="detail-item">
                      <i className="fas fa-building"></i>
                      <span>المركز: {activity.centerName}</span>
                    </div>
                  )}
                  
                  {activity.targetName && (
                    <div className="detail-item">
                      <i className="fas fa-bullseye"></i>
                      <span>الهدف: {activity.targetName}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default GlobalActivities;
