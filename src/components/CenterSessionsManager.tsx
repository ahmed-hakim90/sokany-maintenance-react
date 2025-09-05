import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { CenterSession, CenterActivityLog, Center } from '../types';
import './CenterSessionsManager.css';

interface CenterSessionWithName extends CenterSession {
  centerName: string;
  totalActivities: number;
  sessionDuration?: number;
}

interface GlobalActivityWithCenter extends CenterActivityLog {
  centerName: string;
  centerId: string;
}

const CenterSessionsManager: React.FC = () => {
  const { user } = useAuth();
  
  // States for sessions
  const [sessions, setSessions] = useState<CenterSessionWithName[]>([]);
  const [currentSession, setCurrentSession] = useState<CenterSession | null>(null);
  const [selectedSession, setSelectedSession] = useState<CenterSessionWithName | null>(null);
  
  // States for activities
  const [activities, setActivities] = useState<GlobalActivityWithCenter[]>([]);
  const [sessionActivities, setSessionActivities] = useState<CenterActivityLog[]>([]);
  
  // States for centers
  const [centers, setCenters] = useState<Center[]>([]);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'sessions' | 'activities' | 'current'>('sessions');
  const [showActivitiesModal, setShowActivitiesModal] = useState(false);
  
  // Filter states
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'ended'>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCenter, setFilterCenter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('all');

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user, timeRange]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      
      // تحميل المراكز أولاً
      await loadCenters();
      
      if (user?.isAdmin) {
        // للمسؤولين: تحميل جميع الجلسات والأنشطة
        await loadAllSessions();
        await loadGlobalActivities();
      } else if (user?.centerId) {
        // للموظفين: تحميل الجلسة الحالية والأنشطة
        await loadCurrentSession();
        await loadRecentActivities();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCenters = async () => {
    const centersSnapshot = await getDocs(collection(db, 'centers'));
    const centersData: Center[] = [];
    centersSnapshot.forEach(doc => {
      centersData.push({
        id: doc.id,
        ...doc.data()
      } as Center);
    });
    setCenters(centersData);
  };

  const loadAllSessions = async () => {
    const allSessions: CenterSessionWithName[] = [];
    
    for (const center of centers) {
      const sessionsSnapshot = await getDocs(
        query(
          collection(db, 'centers', center.id, 'sessions'),
          orderBy('sessionStart', 'desc'),
          limit(50)
        )
      );

      for (const sessionDoc of sessionsSnapshot.docs) {
        const sessionData = sessionDoc.data();
        
        // حساب عدد الأنشطة
        const activitiesSnapshot = await getDocs(
          collection(db, 'centers', center.id, 'sessions', sessionDoc.id, 'activities')
        );

        // حساب مدة الجلسة
        let sessionDuration;
        if (sessionData.sessionStart && sessionData.sessionEnd) {
          const start = sessionData.sessionStart.toDate();
          const end = sessionData.sessionEnd.toDate();
          sessionDuration = Math.floor((end.getTime() - start.getTime()) / (1000 * 60)); // بالدقائق
        }

        allSessions.push({
          id: sessionDoc.id,
          centerId: center.id,
          centerName: center.name,
          sessionStart: sessionData.sessionStart?.toDate() || new Date(),
          sessionEnd: sessionData.sessionEnd?.toDate(),
          isActive: sessionData.isActive || false,
          activities: sessionData.activities || [],
          totalActivities: activitiesSnapshot.size,
          sessionDuration
        });
      }
    }

    setSessions(allSessions.sort((a, b) => 
      new Date(b.sessionStart).getTime() - new Date(a.sessionStart).getTime()
    ));
  };

  const loadCurrentSession = async () => {
    if (!user?.centerId) return;

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
    }
  };

  const loadGlobalActivities = async () => {
    // تحميل الأنشطة العمومية مباشرة
    let globalActivitiesQuery;
    const now = new Date();
    
    switch (timeRange) {
      case 'today':
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        globalActivitiesQuery = query(
          collection(db, 'globalActivities'),
          where('timestamp', '>=', Timestamp.fromDate(todayStart)),
          orderBy('timestamp', 'desc'),
          limit(1000)
        );
        break;
      case 'week':
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        globalActivitiesQuery = query(
          collection(db, 'globalActivities'),
          where('timestamp', '>=', Timestamp.fromDate(weekStart)),
          orderBy('timestamp', 'desc'),
          limit(2000)
        );
        break;
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        globalActivitiesQuery = query(
          collection(db, 'globalActivities'),
          where('timestamp', '>=', Timestamp.fromDate(monthStart)),
          orderBy('timestamp', 'desc'),
          limit(5000)
        );
        break;
      default:
        globalActivitiesQuery = query(
          collection(db, 'globalActivities'),
          orderBy('timestamp', 'desc'),
          limit(1000)
        );
    }

    const activitiesSnapshot = await getDocs(globalActivitiesQuery);
    const activitiesData: GlobalActivityWithCenter[] = [];

    activitiesSnapshot.forEach(doc => {
      const activityData = doc.data();
      const center = centers.find(c => c.id === activityData.centerId);
      
      activitiesData.push({
        id: doc.id,
        centerId: activityData.centerId,
        centerName: center?.name || 'مركز غير معروف',
        userId: activityData.userId,
        userName: activityData.userName,
        action: activityData.action,
        description: activityData.description,
        timestamp: activityData.timestamp?.toDate() || new Date(),
        type: activityData.type || 'other',
        details: activityData.details
      });
    });

    setActivities(activitiesData);
  };

  const loadRecentActivities = async () => {
    if (!user?.centerId) return;

    const activitiesSnapshot = await getDocs(
      query(
        collection(db, 'centers', user.centerId, 'activities'),
        orderBy('timestamp', 'desc'),
        limit(100)
      )
    );

    const activitiesData: CenterActivityLog[] = [];
    activitiesSnapshot.forEach(doc => {
      const activityData = doc.data();
      activitiesData.push({
        id: doc.id,
        centerId: user.centerId!,
        userId: activityData.userId,
        userName: activityData.userName,
        action: activityData.action,
        description: activityData.description,
        timestamp: activityData.timestamp?.toDate() || new Date(),
        type: activityData.type || 'other',
        details: activityData.details
      });
    });

    setSessionActivities(activitiesData);
  };

  const startNewSession = async () => {
    if (!user?.centerId) return;

    try {
      const sessionData = {
        centerId: user.centerId,
        centerName: user.centerName || '',
        sessionStart: new Date(),
        isActive: true,
        activities: []
      };

      const docRef = await addDoc(
        collection(db, 'centers', user.centerId, 'sessions'),
        sessionData
      );

      setCurrentSession({
        id: docRef.id,
        ...sessionData
      });

      // تسجيل النشاط
      await logActivity('session_start', 'بدء جلسة جديدة', {
        sessionId: docRef.id,
        centerName: user.centerName
      });

      await loadAllData();
    } catch (error) {
      console.error('Error starting session:', error);
    }
  };

  const endSession = async () => {
    if (!currentSession || !user?.centerId) return;

    try {
      await updateDoc(
        doc(db, 'centers', user.centerId, 'sessions', currentSession.id),
        {
          sessionEnd: new Date(),
          isActive: false
        }
      );

      // تسجيل النشاط
      await logActivity('session_end', 'إنهاء الجلسة', {
        sessionId: currentSession.id,
        centerName: user.centerName
      });

      setCurrentSession(null);
      await loadAllData();
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  const logActivity = async (action: string, description: string, details: any) => {
    if (!user?.centerId) return;

    const activityData = {
      centerId: user.centerId,
      userId: user.uid || user.email, // استخدم uid أو email كمعرف
      userName: user.email?.split('@')[0] || 'مستخدم غير معروف', // استخرج اسم من البريد الإلكتروني
      action,
      description,
      timestamp: new Date(),
      type: 'session',
      details
    };

    try {
      // إضافة للمجموعة المحلية والعمومية
      await Promise.all([
        addDoc(collection(db, 'centers', user.centerId, 'activities'), activityData),
        addDoc(collection(db, 'globalActivities'), activityData)
      ]);
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  const viewSessionActivities = async (session: CenterSessionWithName) => {
    try {
      const activitiesSnapshot = await getDocs(
        collection(db, 'centers', session.centerId, 'sessions', session.id, 'activities')
      );

      const activitiesData: CenterActivityLog[] = [];
      activitiesSnapshot.forEach(doc => {
        const activityData = doc.data();
        activitiesData.push({
          id: doc.id,
          centerId: session.centerId,
          userId: activityData.userId,
          userName: activityData.userName,
          action: activityData.action,
          description: activityData.description,
          timestamp: activityData.timestamp?.toDate() || new Date(),
          type: activityData.type || 'other',
          details: activityData.details
        });
      });

      setSessionActivities(activitiesData);
      setSelectedSession(session);
      setShowActivitiesModal(true);
    } catch (error) {
      console.error('Error loading session activities:', error);
    }
  };

  // فلترة البيانات
  const filteredSessions = sessions.filter(session => {
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && session.isActive) ||
      (filterStatus === 'ended' && !session.isActive);
    
    const matchesCenter = filterCenter === 'all' || session.centerId === filterCenter;
    
    const matchesSearch = searchTerm === '' || 
      session.centerName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = dateFilter === '' || 
      new Date(session.sessionStart).toDateString() === new Date(dateFilter).toDateString();

    return matchesStatus && matchesCenter && matchesSearch && matchesDate;
  });

  const filteredActivities = activities.filter(activity => {
    const matchesType = filterType === 'all' || activity.type === filterType;
    const matchesCenter = filterCenter === 'all' || activity.centerId === filterCenter;
    const matchesSearch = searchTerm === '' || 
      activity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.userName.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesType && matchesCenter && matchesSearch;
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'session': return '⚡';
      case 'maintenance': return '🔧';
      case 'inventory': return '📦';
      case 'sales': return '💰';
      case 'customer': return '👥';
      case 'technician': return '👨‍🔧';
      default: return '📋';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'session': return '#e74c3c';
      case 'maintenance': return '#f39c12';
      case 'inventory': return '#3498db';
      case 'sales': return '#27ae60';
      case 'customer': return '#9b59b6';
      case 'technician': return '#34495e';
      default: return '#7f8c8d';
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}س ${mins}د` : `${mins}د`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ar-EG', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const getSessionDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'اليوم';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'أمس';
    } else {
      return date.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
    }
  };

  const endSessionForCenter = async (session: CenterSessionWithName) => {
    if (!user?.isAdmin) return;
    
    try {
      await updateDoc(
        doc(db, 'centers', session.centerId, 'sessions', session.id),
        {
          sessionEnd: new Date(),
          isActive: false
        }
      );

      // تسجيل النشاط
      await logActivity('session_end', `إنهاء جلسة مركز ${session.centerName}`, {
        sessionId: session.id,
        centerName: session.centerName,
        endedBy: 'admin'
      });

      await loadAllData();
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  const getSessionProgress = (session: CenterSessionWithName) => {
    if (!session.isActive) return 100;
    
    const now = new Date();
    const sessionStart = new Date(session.sessionStart);
    const elapsed = (now.getTime() - sessionStart.getTime()) / (1000 * 60 * 60); // ساعات
    
    // تقدير أن الجلسة العادية 8 ساعات
    return Math.min((elapsed / 8) * 100, 100);
  };

  const getSessionStatusText = (session: CenterSessionWithName) => {
    if (!session.isActive) return 'جلسة منتهية';
    
    const progress = getSessionProgress(session);
    if (progress < 25) return 'بداية الجلسة';
    if (progress < 50) return 'منتصف الجلسة';
    if (progress < 75) return 'الجلسة متقدمة';
    return 'نهاية الجلسة';
  };

  const showSessionDetails = (session: CenterSessionWithName) => {
    const progress = getSessionProgress(session);
    const statusText = getSessionStatusText(session);
    
    alert(`تفاصيل الجلسة:\n` +
      `المركز: ${session.centerName}\n` +
      `الحالة: ${statusText}\n` +
      `التقدم: ${Math.round(progress)}%\n` +
      `المدة: ${session.sessionDuration ? formatDuration(session.sessionDuration) : 'جارية'}\n` +
      `الأنشطة: ${session.totalActivities}\n` +
      `معرف الجلسة: ${session.id}`);
  };

  if (loading) {
    return (
      <div className="sessions-manager-loading">
        <div className="loading-spinner"></div>
        <p>جاري تحميل البيانات...</p>
      </div>
    );
  }

  return (
    <div className="sessions-manager-container">
      <div className="sessions-manager-header">
        <h1>جلسات المراكز</h1>
        <p>إدارة شاملة لجلسات المراكز والأنشطة العمومية</p>
      </div>

      {/* التبويبات */}
      <div className="tabs-container">
        <button 
          className={`tab-button ${activeTab === 'sessions' ? 'active' : ''}`}
          onClick={() => setActiveTab('sessions')}
        >
          📊 جميع الجلسات
        </button>
        <button 
          className={`tab-button ${activeTab === 'activities' ? 'active' : ''}`}
          onClick={() => setActiveTab('activities')}
        >
          🌐 الأنشطة العمومية
        </button>
        {!user?.isAdmin && (
          <button 
            className={`tab-button ${activeTab === 'current' ? 'active' : ''}`}
            onClick={() => setActiveTab('current')}
          >
            ⚡ الجلسة الحالية
          </button>
        )}
      </div>

      {/* فلاتر البحث */}
      <div className="filters-section">
        <div className="filters-row">
          <div className="filter-group">
            <label>البحث:</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث..."
            />
          </div>
          
          {user?.isAdmin && (
            <div className="filter-group">
              <label>المركز:</label>
              <select value={filterCenter} onChange={(e) => setFilterCenter(e.target.value)}>
                <option value="all">جميع المراكز</option>
                {centers.map(center => (
                  <option key={center.id} value={center.id}>{center.name}</option>
                ))}
              </select>
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="filter-group">
              <label>الحالة:</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
                <option value="all">جميع الحالات</option>
                <option value="active">نشطة</option>
                <option value="ended">منتهية</option>
              </select>
            </div>
          )}

          {activeTab === 'activities' && (
            <>
              <div className="filter-group">
                <label>نوع النشاط:</label>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                  <option value="all">جميع الأنواع</option>
                  <option value="session">الجلسات</option>
                  <option value="maintenance">الصيانة</option>
                  <option value="inventory">المخزون</option>
                  <option value="sales">المبيعات</option>
                  <option value="customer">العملاء</option>
                  <option value="technician">الفنيين</option>
                </select>
              </div>
              <div className="filter-group">
                <label>الفترة الزمنية:</label>
                <select value={timeRange} onChange={(e) => setTimeRange(e.target.value as any)}>
                  <option value="all">جميع الفترات</option>
                  <option value="today">اليوم</option>
                  <option value="week">هذا الأسبوع</option>
                  <option value="month">هذا الشهر</option>
                </select>
              </div>
            </>
          )}

          <div className="filter-group">
            <label>التاريخ:</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* محتوى التبويبات */}
      <div className="tab-content">
        {activeTab === 'sessions' && (
          <div className="sessions-tab">
            <div className="sessions-stats">
              <div className="stat-card">
                <div className="stat-icon">📊</div>
                <div className="stat-info">
                  <h3>{filteredSessions.length}</h3>
                  <p>إجمالي الجلسات</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🟢</div>
                <div className="stat-info">
                  <h3>{filteredSessions.filter(s => s.isActive).length}</h3>
                  <p>الجلسات النشطة</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🔴</div>
                <div className="stat-info">
                  <h3>{filteredSessions.filter(s => !s.isActive).length}</h3>
                  <p>الجلسات المنتهية</p>
                </div>
              </div>
            </div>

            <div className="sessions-grid">
              {filteredSessions.map(session => (
                <div key={session.id} className={`session-card-pro ${session.isActive ? 'active-session' : 'ended-session'}`}>
                  <div className="session-header-pro">
                    <div className="session-center-info">
                      <div className="center-avatar">
                        <i className="fas fa-building"></i>
                      </div>
                      <div className="center-details">
                        <h3 className="center-name">{session.centerName}</h3>
                        <div className="session-id">جلسة: {session.id.slice(-8)}</div>
                      </div>
                    </div>
                    <div className="session-status-pro">
                      <span className={`status-badge ${session.isActive ? 'active' : 'ended'}`}>
                        <div className={`status-indicator ${session.isActive ? 'pulse' : ''}`}></div>
                        {session.isActive ? getSessionStatusText(session) : 'جلسة منتهية'}
                      </span>
                      {session.isActive && (
                        <div className="session-progress">
                          <div className="progress-bar">
                            <div 
                              className="progress-fill"
                              style={{ width: `${getSessionProgress(session)}%` }}
                            ></div>
                          </div>
                          <span className="progress-text">
                            {Math.round(getSessionProgress(session))}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="session-stats-row">
                    <div className="stat-item">
                      <div className="stat-icon activities">
                        <i className="fas fa-chart-line"></i>
                      </div>
                      <div className="stat-content">
                        <div className="stat-number">{session.totalActivities}</div>
                        <div className="stat-label">نشاط</div>
                      </div>
                    </div>
                    
                    {session.sessionDuration && (
                      <div className="stat-item">
                        <div className="stat-icon duration">
                          <i className="fas fa-clock"></i>
                        </div>
                        <div className="stat-content">
                          <div className="stat-number">{formatDuration(session.sessionDuration)}</div>
                          <div className="stat-label">مدة الجلسة</div>
                        </div>
                      </div>
                    )}

                    <div className="stat-item">
                      <div className="stat-icon time">
                        <i className="fas fa-calendar-alt"></i>
                      </div>
                      <div className="stat-content">
                        <div className="stat-number">{getSessionDate(session.sessionStart)}</div>
                        <div className="stat-label">التاريخ</div>
                      </div>
                    </div>
                  </div>

                  <div className="session-timeline">
                    <div className="timeline-item start">
                      <div className="timeline-icon start-icon">
                        <i className="fas fa-play"></i>
                      </div>
                      <div className="timeline-content">
                        <div className="timeline-time">{formatTime(session.sessionStart)}</div>
                        <div className="timeline-label">بداية الجلسة</div>
                      </div>
                    </div>
                    
                    {session.sessionEnd ? (
                      <div className="timeline-item end">
                        <div className="timeline-icon end-icon">
                          <i className="fas fa-stop"></i>
                        </div>
                        <div className="timeline-content">
                          <div className="timeline-time">{formatTime(session.sessionEnd)}</div>
                          <div className="timeline-label">نهاية الجلسة</div>
                        </div>
                      </div>
                    ) : (
                      <div className="timeline-item ongoing">
                        <div className="timeline-icon ongoing-icon">
                          <i className="fas fa-spinner fa-spin"></i>
                        </div>
                        <div className="timeline-content">
                          <div className="timeline-time">جارية الآن</div>
                          <div className="timeline-label">الجلسة مستمرة</div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="session-actions-pro">
                    <button 
                      className="action-btn primary"
                      onClick={() => viewSessionActivities(session)}
                    >
                      <i className="fas fa-eye"></i>
                      عرض الأنشطة
                    </button>
                    
                    {session.isActive && user?.isAdmin && (
                      <button 
                        className="action-btn secondary"
                        onClick={() => endSessionForCenter(session)}
                      >
                        <i className="fas fa-stop"></i>
                        إنهاء الجلسة
                      </button>
                    )}
                    
                    <button 
                      className="action-btn info"
                      onClick={() => showSessionDetails(session)}
                    >
                      <i className="fas fa-info-circle"></i>
                      التفاصيل
                    </button>
                  </div>
                </div>
              ))}
              
              {filteredSessions.length === 0 && (
                <div className="empty-state">
                  <p>لا توجد جلسات لعرضها</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'activities' && (
          <div className="activities-tab">
            <div className="activities-stats">
              <div className="stat-card">
                <div className="stat-icon">🌐</div>
                <div className="stat-info">
                  <h3>{filteredActivities.length}</h3>
                  <p>إجمالي الأنشطة</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📊</div>
                <div className="stat-info">
                  <h3>{new Set(filteredActivities.map(a => a.centerId)).size}</h3>
                  <p>المراكز النشطة</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-info">
                  <h3>{new Set(filteredActivities.map(a => a.userId)).size}</h3>
                  <p>المستخدمين النشطين</p>
                </div>
              </div>
            </div>

            <div className="activities-list">
              {filteredActivities.map(activity => (
                <div key={activity.id} className="activity-card">
                  <div 
                    className="activity-icon"
                    style={{ backgroundColor: getActivityColor(activity.type) }}
                  >
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="activity-content">
                    <div className="activity-header">
                      <h4>{activity.description}</h4>
                      <span className="activity-time">
                        {activity.timestamp.toLocaleString('ar-EG')}
                      </span>
                    </div>
                    <div className="activity-meta">
                      <span className="activity-user">👤 {activity.userName}</span>
                      <span className="activity-center">🏢 {activity.centerName}</span>
                      <span className="activity-type">{activity.type}</span>
                    </div>
                    {activity.details && (
                      <div className="activity-details">
                        <pre>{JSON.stringify(activity.details, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {filteredActivities.length === 0 && (
                <div className="empty-state">
                  <p>لا توجد أنشطة لعرضها</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'current' && !user?.isAdmin && (
          <div className="current-session-tab">
            {currentSession ? (
              <div className="current-session-info">
                <div className="session-header">
                  <h2>الجلسة الحالية - {currentSession.centerName}</h2>
                  <button className="end-session-button" onClick={endSession}>
                    إنهاء الجلسة
                  </button>
                </div>
                <div className="session-details">
                  <p><strong>بدأت في:</strong> {currentSession.sessionStart.toLocaleString('ar-EG')}</p>
                  <p><strong>عدد الأنشطة:</strong> {sessionActivities.length}</p>
                </div>
                
                <div className="session-activities">
                  <h3>أنشطة الجلسة الحالية</h3>
                  <div className="activities-list">
                    {sessionActivities.map(activity => (
                      <div key={activity.id} className="activity-card">
                        <div 
                          className="activity-icon"
                          style={{ backgroundColor: getActivityColor(activity.type) }}
                        >
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="activity-content">
                          <div className="activity-header">
                            <h4>{activity.description}</h4>
                            <span className="activity-time">
                              {activity.timestamp.toLocaleString('ar-EG')}
                            </span>
                          </div>
                          <div className="activity-meta">
                            <span className="activity-user">👤 {activity.userName}</span>
                            <span className="activity-type">{activity.type}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="no-session">
                <h2>لا توجد جلسة نشطة</h2>
                <p>يمكنك بدء جلسة جديدة الآن</p>
                <button className="start-session-button" onClick={startNewSession}>
                  بدء جلسة جديدة
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* مودال عرض أنشطة الجلسة */}
      {showActivitiesModal && selectedSession && (
        <div className="modal-overlay" onClick={() => setShowActivitiesModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>أنشطة جلسة - {selectedSession.centerName}</h3>
              <button 
                className="modal-close"
                onClick={() => setShowActivitiesModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="session-info">
                <p><strong>بدأت:</strong> {selectedSession.sessionStart.toLocaleString('ar-EG')}</p>
                {selectedSession.sessionEnd && (
                  <p><strong>انتهت:</strong> {selectedSession.sessionEnd.toLocaleString('ar-EG')}</p>
                )}
                <p><strong>عدد الأنشطة:</strong> {sessionActivities.length}</p>
              </div>
              <div className="activities-list">
                {sessionActivities.map(activity => (
                  <div key={activity.id} className="activity-card">
                    <div 
                      className="activity-icon"
                      style={{ backgroundColor: getActivityColor(activity.type) }}
                    >
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="activity-content">
                      <div className="activity-header">
                        <h4>{activity.description}</h4>
                        <span className="activity-time">
                          {activity.timestamp.toLocaleString('ar-EG')}
                        </span>
                      </div>
                      <div className="activity-meta">
                        <span className="activity-user">👤 {activity.userName}</span>
                        <span className="activity-type">{activity.type}</span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {sessionActivities.length === 0 && (
                  <div className="empty-state">
                    <p>لا توجد أنشطة في هذه الجلسة</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CenterSessionsManager;
