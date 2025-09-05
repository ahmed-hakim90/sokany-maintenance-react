import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { CenterSession, CenterActivityLog } from '../types';
import './CenterSessionManagement.css';

const CenterSessionManagement: React.FC = () => {
  const { user } = useAuth();
  const [currentSession, setCurrentSession] = useState<CenterSession | null>(null);
  const [activities, setActivities] = useState<CenterActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [showActivities, setShowActivities] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user && user.centerId) {
      loadCurrentSession();
      loadRecentActivities();
    }
  }, [user]);

  const loadCurrentSession = async () => {
    if (!user?.centerId) return;

    try {
      setLoading(true);
      const sessionsSnapshot = await getDocs(
        query(
          collection(db, 'centers', user.centerId, 'sessions'),
          where('isActive', '==', true),
          orderBy('sessionStart', 'desc'),
          limit(1)
        )
      );

      if (!sessionsSnapshot.empty) {
        const sessionDoc = sessionsSnapshot.docs[0];
        const sessionData = sessionDoc.data();
        setCurrentSession({
          id: sessionDoc.id,
          centerId: user.centerId,
          centerName: user.centerName || '',
          sessionStart: sessionData.sessionStart?.toDate() || new Date(),
          sessionEnd: sessionData.sessionEnd?.toDate(),
          isActive: sessionData.isActive || true,
          activities: sessionData.activities || []
        });
      } else {
        // إنشاء جلسة جديدة
        await createNewSession();
      }
    } catch (error) {
      console.error('Error loading current session:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewSession = async () => {
    if (!user?.centerId) return;

    try {
      const centerDoc = await getDocs(query(collection(db, 'centers'), where('id', '==', user.centerId)));
      let centerName = 'غير محدد';
      
      if (!centerDoc.empty) {
        centerName = centerDoc.docs[0].data().name || 'غير محدد';
      }

      const newSession = {
        centerId: user.centerId,
        centerName: centerName,
        sessionStart: new Date(),
        isActive: true,
        activities: []
      };

      const sessionRef = await addDoc(
        collection(db, 'centers', user.centerId, 'sessions'),
        newSession
      );

      setCurrentSession({
        id: sessionRef.id,
        ...newSession
      });

      // تسجيل نشاط تسجيل الدخول
      await logActivity('login', 'تسجيل دخول جديد للمركز', '', '');

    } catch (error) {
      console.error('Error creating new session:', error);
    }
  };

  const endCurrentSession = async () => {
    if (!currentSession || !user?.centerId) return;

    try {
      await updateDoc(
        doc(db, 'centers', user.centerId, 'sessions', currentSession.id),
        {
          sessionEnd: new Date(),
          isActive: false
        }
      );

      // تسجيل نشاط تسجيل الخروج
      await logActivity('logout', 'انتهاء الجلسة', '', '');

      setCurrentSession(null);
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  const logActivity = async (
    activityType: CenterActivityLog['activityType'],
    action: string,
    targetId?: string,
    targetName?: string,
    details?: any,
    customTimestamp?: Date
  ) => {
    if (!user?.centerId || !currentSession) return;

    try {
      const activityData = {
        timestamp: customTimestamp || new Date(),
        activityType,
        action,
        targetId: targetId || '',
        targetName: targetName || '',
        performedBy: user.email || '',
        details: details || null
      };

      // تسجيل في أنشطة المركز
      await addDoc(
        collection(db, 'centers', user.centerId, 'activities'),
        activityData
      );

      // تسجيل في الأنشطة العمومية للمسؤول الرئيسي
      await addDoc(
        collection(db, 'globalActivities'),
        {
          ...activityData,
          centerId: user.centerId,
          centerName: user.centerName || 'غير محدد'
        }
      );

      // إضافة النشاط للجلسة الحالية - إنشاء كائن جديد بالمعلومات الأساسية
      const displayActivity: CenterActivityLog = {
        id: Date.now().toString(),
        centerId: user.centerId,
        userId: user.uid || user.email || '',
        userName: user.email?.split('@')[0] || 'مستخدم غير معروف',
        timestamp: activityData.timestamp,
        action: activityData.action,
        description: activityData.action,
        type: (activityData.activityType || 'other') as any,
        details: activityData.details,
        
        // الخصائص الإضافية للتوافق
        activityType: activityData.activityType,
        targetId: activityData.targetId,
        targetName: activityData.targetName,
        performedBy: activityData.performedBy
      };
      
      const updatedActivities = [...activities];
      updatedActivities.unshift(displayActivity);
      setActivities(updatedActivities.slice(0, 50)); // الاحتفاظ بآخر 50 نشاط فقط

    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  const loadRecentActivities = async () => {
    if (!user?.centerId) return;

    try {
      const activitiesSnapshot = await getDocs(
        query(
          collection(db, 'centers', user.centerId, 'activities'),
          orderBy('timestamp', 'desc'),
          limit(50)
        )
      );

      const activitiesData: CenterActivityLog[] = [];
      activitiesSnapshot.forEach(doc => {
        const data = doc.data();
        activitiesData.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date()
        } as CenterActivityLog);
      });

      setActivities(activitiesData);
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'inventory': return 'fas fa-boxes';
      case 'sales': return 'fas fa-shopping-cart';
      case 'maintenance': return 'fas fa-tools';
      case 'customer': return 'fas fa-users';
      case 'technician': return 'fas fa-user-cog';
      case 'login': return 'fas fa-sign-in-alt';
      case 'logout': return 'fas fa-sign-out-alt';
      case 'session': return 'fas fa-clock';
      default: return 'fas fa-info-circle';
    }
  };

  const getActivityTypeLabel = (type: string) => {
    switch (type) {
      case 'inventory': return 'المخزون';
      case 'sales': return 'المبيعات';
      case 'maintenance': return 'الصيانة';
      case 'customer': return 'العملاء';
      case 'technician': return 'الفنيين';
      case 'login': return 'دخول';
      case 'logout': return 'خروج';
      case 'session': return 'الجلسة';
      default: return 'عام';
    }
  };

  const filteredActivities = activities.filter(activity => {
    const activityType = activity.activityType || activity.type || 'other';
    const matchesType = filterType === 'all' || activityType === filterType;
    const matchesSearch = searchTerm === '' || 
      activity.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.targetName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (activity.performedBy || activity.userName || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesType && matchesSearch;
  });

  if (loading) {
    return (
      <div className="loading-screen">
        <i className="fas fa-spinner fa-spin"></i>
        <p>جاري تحميل معلومات الجلسة...</p>
      </div>
    );
  }

  return (
    <div className="center-session-management">
      <div className="session-header">
        <div className="session-info">
          <h2>
            <i className="fas fa-clock"></i>
            جلسة المركز الحالية
          </h2>
          {currentSession && (
            <div className="session-details">
              <div className="session-time">
                <i className="fas fa-calendar-alt"></i>
                <span>بدأت في: {currentSession.sessionStart.toLocaleString('ar-EG')}</span>
              </div>
              <div className="session-duration">
                <i className="fas fa-hourglass-half"></i>
                <span>المدة: {Math.floor((new Date().getTime() - currentSession.sessionStart.getTime()) / (1000 * 60))} دقيقة</span>
              </div>
            </div>
          )}
        </div>
        <div className="session-actions">
          <button 
            className="btn btn-primary"
            onClick={() => setShowActivities(!showActivities)}
          >
            <i className="fas fa-list"></i>
            {showActivities ? 'إخفاء الأنشطة' : 'عرض الأنشطة'}
          </button>
          <button 
            className="btn btn-danger"
            onClick={endCurrentSession}
          >
            <i className="fas fa-stop"></i>
            إنهاء الجلسة
          </button>
        </div>
      </div>

      {showActivities && (
        <div className="activities-section">
          <div className="activities-header">
            <h3>سجل الأنشطة</h3>
            <div className="activities-controls">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="filter-select"
              >
                <option value="all">جميع الأنشطة</option>
                <option value="inventory">المخزون</option>
                <option value="sales">المبيعات</option>
                <option value="maintenance">الصيانة</option>
                <option value="customer">العملاء</option>
                <option value="technician">الفنيين</option>
                <option value="login">دخول</option>
                <option value="logout">خروج</option>
              </select>
              <input
                type="text"
                placeholder="البحث في الأنشطة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          <div className="activities-list">
            {filteredActivities.length === 0 ? (
              <div className="no-activities">
                <i className="fas fa-clipboard"></i>
                <p>لا توجد أنشطة للعرض</p>
              </div>
            ) : (
              filteredActivities.map(activity => {
                const activityType = activity.activityType || activity.type || 'other';
                const performedBy = activity.performedBy || activity.userName || 'مستخدم غير معروف';
                return (
                <div key={activity.id} className="activity-item">
                  <div className="activity-icon">
                    <i className={getActivityIcon(activityType)}></i>
                  </div>
                  <div className="activity-content">
                    <div className="activity-main">
                      <span className="activity-action">{activity.action}</span>
                      {activity.targetName && (
                        <span className="activity-target">- {activity.targetName}</span>
                      )}
                    </div>
                    <div className="activity-meta">
                      <span className="activity-type">{getActivityTypeLabel(activityType)}</span>
                      <span className="activity-user">{performedBy}</span>
                      <span className="activity-time">{activity.timestamp.toLocaleString('ar-EG')}</span>
                    </div>
                  </div>
                </div>
              );})
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Hook للاستخدام في المكونات الأخرى
export const useActivityLogger = () => {
  const { user } = useAuth();

  const logActivity = async (
    type: string, // تغيير من activityType إلى type
    action: string,
    targetId?: string,
    targetName?: string,
    details?: any,
    customTimestamp?: Date
  ) => {
    if (!user?.centerId) return;

    try {
      const activityData = {
        centerId: user.centerId,
        userId: user.uid || user.email, 
        userName: user.email?.split('@')[0] || 'مستخدم غير معروف',
        timestamp: customTimestamp || new Date(),
        type,
        action,
        description: `${action} - ${targetName || targetId || ''}`,
        details: details || null,
        
        // للتوافق مع النسخة القديمة
        activityType: type as any,
        targetId: targetId || '',
        targetName: targetName || '',
        performedBy: user.email || ''
      };

      // تسجيل في أنشطة المركز
      await addDoc(
        collection(db, 'centers', user.centerId, 'activities'),
        activityData
      );

      // تسجيل في الأنشطة العمومية للمسؤول الرئيسي
      await addDoc(
        collection(db, 'globalActivities'),
        {
          ...activityData,
          centerName: user.centerName || 'غير محدد'
        }
      );
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  return { logActivity };
};

export default CenterSessionManagement;
