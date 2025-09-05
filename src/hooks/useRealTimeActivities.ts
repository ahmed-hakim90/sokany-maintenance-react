import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { CenterActivityLog } from '../types';

interface GlobalActivityWithCenter extends CenterActivityLog {
  centerName: string;
  centerId: string;
}

export const useRealTimeActivities = (isAdmin: boolean) => {
  const [latestActivity, setLatestActivity] = useState<GlobalActivityWithCenter | null>(null);
  const [activityCount, setActivityCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;

    const activitiesQuery = query(
      collection(db, 'globalActivities'),
      orderBy('timestamp', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(activitiesQuery, (snapshot) => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const data = doc.data();
        
        const activity: GlobalActivityWithCenter = {
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
        };

        setLatestActivity(activity);
        setActivityCount(prev => prev + 1);
      }
    });

    return () => unsubscribe();
  }, [isAdmin]);

  return { latestActivity, activityCount };
};

export default useRealTimeActivities;
