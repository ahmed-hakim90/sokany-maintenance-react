import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { CenterSession, CenterActivityLog, Center } from '../types';
import './AllCentersSessions.css';

interface CenterSessionWithName extends CenterSession {
  centerName: string;
  totalActivities: number;
  sessionDuration?: number;
}

const AllCentersSessions: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<CenterSessionWithName[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<CenterSessionWithName | null>(null);
  const [sessionActivities, setSessionActivities] = useState<CenterActivityLog[]>([]);
  const [showActivitiesModal, setShowActivitiesModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'ended'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    if (user?.isAdmin) {
      loadCentersAndSessions();
    }
  }, [user]);

  const loadCentersAndSessions = async () => {
    try {
      setLoading(true);
      
      // تحميل المراكز أولاً
      const centersSnapshot = await getDocs(collection(db, 'centers'));
      const centersData: Center[] = [];
      centersSnapshot.forEach(doc => {
        centersData.push({
          id: doc.id,
          ...doc.data()
        } as Center);
      });
      setCenters(centersData);

      // تحميل جلسات جميع المراكز
      const allSessions: CenterSessionWithName[] = [];
      
      for (const center of centersData) {
        try {
          const sessionsSnapshot = await getDocs(
            query(
              collection(db, 'centers', center.id, 'sessions'),
              orderBy('sessionStart', 'desc')
            )
          );

          for (const sessionDoc of sessionsSnapshot.docs) {
            const sessionData = sessionDoc.data();
            
            // عد الأنشطة لهذه الجلسة
            const activitiesSnapshot = await getDocs(
              query(
                collection(db, 'centers', center.id, 'activities'),
                where('timestamp', '>=', sessionData.sessionStart),
                ...(sessionData.sessionEnd ? [where('timestamp', '<=', sessionData.sessionEnd)] : [])
              )
            );

            // حساب مدة الجلسة
            const startTime = sessionData.sessionStart.toDate();
            const endTime = sessionData.sessionEnd?.toDate() || new Date();
            const duration = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60)); // بالدقائق

            allSessions.push({
              id: sessionDoc.id,
              centerId: center.id,
              centerName: center.name,
              sessionStart: sessionData.sessionStart.toDate(),
              sessionEnd: sessionData.sessionEnd?.toDate(),
              isActive: sessionData.isActive || false,
              activities: sessionData.activities || [],
              totalActivities: activitiesSnapshot.size,
              sessionDuration: duration
            });
          }
        } catch (error) {
          console.error(`Error loading sessions for center ${center.name}:`, error);
        }
      }

      // ترتيب الجلسات حسب تاريخ البداية (الأحدث أولاً)
      allSessions.sort((a, b) => b.sessionStart.getTime() - a.sessionStart.getTime());
      setSessions(allSessions);

    } catch (error) {
      console.error('Error loading centers and sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSessionActivities = async (session: CenterSessionWithName) => {
    try {
      const activitiesSnapshot = await getDocs(
        query(
          collection(db, 'centers', session.centerId, 'activities'),
          where('timestamp', '>=', Timestamp.fromDate(session.sessionStart)),
          ...(session.sessionEnd ? [where('timestamp', '<=', Timestamp.fromDate(session.sessionEnd))] : []),
          orderBy('timestamp', 'desc')
        )
      );

      const activities: CenterActivityLog[] = [];
      activitiesSnapshot.forEach(doc => {
        const data = doc.data();
        activities.push({
          id: doc.id,
          centerId: data.centerId || '',
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

      setSessionActivities(activities);
      setSelectedSession(session);
      setShowActivitiesModal(true);
    } catch (error) {
      console.error('Error loading session activities:', error);
    }
  };

  const getStatusLabel = (isActive: boolean, sessionEnd?: Date) => {
    if (isActive) return 'نشطة';
    if (sessionEnd) return 'منتهية';
    return 'غير محددة';
  };

  const getStatusClass = (isActive: boolean, sessionEnd?: Date) => {
    if (isActive) return 'status-active';
    if (sessionEnd) return 'status-ended';
    return 'status-unknown';
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} ساعة${remainingMinutes > 0 ? ` و ${remainingMinutes} دقيقة` : ''}`;
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
      default: return 'عام';
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

  const filteredSessions = sessions.filter(session => {
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && session.isActive) ||
      (filterStatus === 'ended' && !session.isActive);
    
    const matchesSearch = searchTerm === '' || 
      session.centerName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = dateFilter === '' || 
      session.sessionStart.toISOString().split('T')[0] === dateFilter;
    
    return matchesStatus && matchesSearch && matchesDate;
  });

  if (!user?.isAdmin) {
    return (
      <div className="all-sessions-container">
        <div className="access-denied">
          <i className="fas fa-lock"></i>
          <h3>غير مصرح لك بالوصول</h3>
          <p>هذه الصفحة مخصصة للمسؤول الرئيسي فقط</p>
        </div>
      </div>
    );
  }

  return (
    <div className="all-sessions-container">
      <div className="page-header">
        <h2>
          <i className="fas fa-chart-line"></i>
          جلسات جميع المراكز
        </h2>
        <p>عرض تفصيلي لجميع جلسات المراكز وأنشطتها</p>
      </div>

      <div className="sessions-controls">
        <div className="filters-row">
          <div className="filter-group">
            <label>حالة الجلسة:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="filter-select"
            >
              <option value="all">جميع الجلسات</option>
              <option value="active">الجلسات النشطة</option>
              <option value="ended">الجلسات المنتهية</option>
            </select>
          </div>
          <div className="filter-group">
            <label>البحث بالمركز:</label>
            <input
              type="text"
              placeholder="اسم المركز..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="filter-group">
            <label>التاريخ:</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="date-input"
            />
          </div>
        </div>
        <div className="summary-stats">
          <div className="stat-card">
            <i className="fas fa-play-circle"></i>
            <span className="stat-number">{sessions.filter(s => s.isActive).length}</span>
            <span className="stat-label">جلسات نشطة</span>
          </div>
          <div className="stat-card">
            <i className="fas fa-stop-circle"></i>
            <span className="stat-number">{sessions.filter(s => !s.isActive).length}</span>
            <span className="stat-label">جلسات منتهية</span>
          </div>
          <div className="stat-card">
            <i className="fas fa-building"></i>
            <span className="stat-number">{centers.length}</span>
            <span className="stat-label">إجمالي المراكز</span>
          </div>
          <div className="stat-card">
            <i className="fas fa-list"></i>
            <span className="stat-number">{sessions.reduce((sum, s) => sum + s.totalActivities, 0)}</span>
            <span className="stat-label">إجمالي الأنشطة</span>
          </div>
          <div className="stat-card">
            <i className="fas fa-clock"></i>
            <span className="stat-number">{Math.floor(sessions.reduce((sum, s) => sum + (s.sessionDuration || 0), 0) / 60)}</span>
            <span className="stat-label">ساعات العمل الكلي</span>
          </div>
          <div className="stat-card">
            <i className="fas fa-users"></i>
            <span className="stat-number">{new Set(sessions.filter(s => s.isActive).map(s => s.centerId)).size}</span>
            <span className="stat-label">مراكز نشطة حالياً</span>
          </div>
        </div>
      </div>

      <div className="sessions-content">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>جاري تحميل بيانات الجلسات...</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="no-sessions">
            <i className="fas fa-calendar-times"></i>
            <h3>لا توجد جلسات</h3>
            <p>لم يتم العثور على جلسات تطابق معايير البحث</p>
          </div>
        ) : (
          <div className="sessions-table">
            <div className="table-header">
              <div className="header-cell">المركز</div>
              <div className="header-cell">تاريخ البداية</div>
              <div className="header-cell">تاريخ النهاية</div>
              <div className="header-cell">المدة</div>
              <div className="header-cell">الحالة</div>
              <div className="header-cell">الأنشطة</div>
              <div className="header-cell">الإجراءات</div>
            </div>
            
            {filteredSessions.map(session => (
              <div key={`${session.centerId}-${session.id}`} className="table-row">
                <div className="table-cell center-name">
                  <i className="fas fa-building"></i>
                  {session.centerName}
                </div>
                <div className="table-cell session-start">
                  <i className="fas fa-calendar-plus"></i>
                  {session.sessionStart.toLocaleString('ar-EG')}
                </div>
                <div className="table-cell session-end">
                  {session.sessionEnd ? (
                    <>
                      <i className="fas fa-calendar-minus"></i>
                      {session.sessionEnd.toLocaleString('ar-EG')}
                    </>
                  ) : (
                    <span className="ongoing">مستمرة</span>
                  )}
                </div>
                <div className="table-cell session-duration">
                  <i className="fas fa-clock"></i>
                  {session.sessionDuration ? formatDuration(session.sessionDuration) : 'غير محدد'}
                </div>
                <div className="table-cell session-status">
                  <span className={`status-badge ${getStatusClass(session.isActive, session.sessionEnd)}`}>
                    {getStatusLabel(session.isActive, session.sessionEnd)}
                  </span>
                </div>
                <div className="table-cell activities-count">
                  <i className="fas fa-list"></i>
                  {session.totalActivities} نشاط
                </div>
                <div className="table-cell session-actions">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => loadSessionActivities(session)}
                    disabled={session.totalActivities === 0}
                  >
                    <i className="fas fa-eye"></i>
                    عرض الأنشطة
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal عرض أنشطة الجلسة */}
      {showActivitiesModal && selectedSession && (
        <div className="modal-overlay" onClick={() => setShowActivitiesModal(false)}>
          <div className="modal-content activities-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className="fas fa-list"></i>
                أنشطة جلسة {selectedSession.centerName}
              </h3>
              <div className="session-details">
                <span>من: {selectedSession.sessionStart.toLocaleString('ar-EG')}</span>
                {selectedSession.sessionEnd && (
                  <span>إلى: {selectedSession.sessionEnd.toLocaleString('ar-EG')}</span>
                )}
              </div>
              <button
                className="close-btn"
                onClick={() => setShowActivitiesModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="modal-body">
              {sessionActivities.length === 0 ? (
                <div className="no-activities">
                  <i className="fas fa-clipboard"></i>
                  <p>لا توجد أنشطة في هذه الجلسة</p>
                </div>
              ) : (
                <div className="activities-list">
                  {sessionActivities.map(activity => (
                    <div key={activity.id} className="activity-item">
                      <div className="activity-icon">
                        <i className={getActivityIcon(activity.activityType || 'other')}></i>
                      </div>
                      <div className="activity-content">
                        <div className="activity-main">
                          <span className="activity-action">{activity.action}</span>
                          {activity.targetName && (
                            <span className="activity-target">- {activity.targetName}</span>
                          )}
                        </div>
                        <div className="activity-meta">
                          <span className="activity-type">{getActivityTypeLabel(activity.activityType || 'other')}</span>
                          <span className="activity-user">{activity.performedBy}</span>
                          <span className="activity-time">{activity.timestamp.toLocaleString('ar-EG')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllCentersSessions;
