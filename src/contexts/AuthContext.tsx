import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signOut
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { AuthState, User } from '../types';

interface AuthContextType extends AuthState {
  login: (email: string, password: string, centerId: string) => Promise<void>;
  loginAsAdmin: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateLastActivity: () => void;
  checkSessionExpiry: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    const savedUserData = localStorage.getItem('userData');
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (savedUserData && isLoggedIn === 'true') {
      try {
        const userData = JSON.parse(savedUserData);
        setState({ user: userData, loading: false, error: null });
        return;
      } catch {
        localStorage.clear();
      }
    }
    setState(prev => ({ ...prev, loading: false }));
  }, []);

  // Check session expiry every 10 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (state.user) {
        checkSessionExpiry();
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(interval);
  }, [state.user]);

  const login = async (email: string, password: string, centerId: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // جلب بيانات المركز
      const centerRef = doc(db, 'centers', centerId);
      const centerSnap = await getDoc(centerRef);
      if (!centerSnap.exists()) {
        throw new Error('المركز غير موجود');
      }
      const centerData: any = centerSnap.data();

      // التحقق من البريد وكلمة المرور المخزنة في وثيقة المركز (نظام مراكز بسيط)
      if (centerData.email !== email) {
        throw new Error('البريد الإلكتروني غير مطابق للمركز');
      }
      if (centerData.password !== password) {
        throw new Error('كلمة المرور غير صحيحة');
      }

      // حساب uid افتراضي للمركز (يمكن لاحقاً ربطه بمستخدم Firebase حقيقي)
      const syntheticUid = `center-${centerId}`;

      const userData: User = {
        uid: syntheticUid,
        email,
        centerId,
        centerName: centerData.name,
        isAdmin: false,
        lastLogin: new Date().toISOString()
      };

      localStorage.setItem('userData', JSON.stringify(userData));
      localStorage.setItem('currentCenter', JSON.stringify({ id: centerId, ...centerData }));
      localStorage.setItem('isLoggedIn', 'true');

      setState({ user: userData, loading: false, error: null });
    } catch (error: any) {
      setState(prev => ({ ...prev, loading: false, error: error.message || 'فشل تسجيل الدخول' }));
      throw error;
    }
  };

  const loginAsAdmin = async (password: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const adminPassword = 'admin123';
      if (password !== adminPassword) {
        throw new Error('كلمة مرور المسؤول غير صحيحة');
      }

      const userData: User = {
        uid: 'admin',
        email: 'admin@system.com',
        isAdmin: true,
        lastLogin: new Date().toISOString()
      };

      // Store in localStorage
      localStorage.setItem('userData', JSON.stringify(userData));
      localStorage.setItem('isLoggedIn', 'true');

      setState({
        user: userData,
        loading: false,
        error: null
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'حدث خطأ في تسجيل الدخول كمسؤول'
      }));
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      localStorage.clear();
      setState({
        user: null,
        loading: false,
        error: null
      });
    } catch (error: any) {
      console.error('Logout error:', error);
      setState(prev => ({
        ...prev,
        error: 'حدث خطأ في تسجيل الخروج'
      }));
    }
  };

  const updateLastActivity = () => {
    const userData = localStorage.getItem('userData');
    if (userData && state.user) {
      try {
        const parsedUserData = JSON.parse(userData);
        const updatedUserData = {
          ...parsedUserData,
          lastActivity: new Date().toISOString()
        };
        localStorage.setItem('userData', JSON.stringify(updatedUserData));
      } catch (error) {
        console.error('Error updating last activity:', error);
      }
    }
  };

  const checkSessionExpiry = () => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const parsedUserData = JSON.parse(userData);
        const lastLogin = new Date(parsedUserData.lastLogin || parsedUserData.lastActivity);
        const now = new Date();
        const hoursSinceLogin = (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60);
        
        // إذا مر أكثر من 24 ساعة، قم بتسجيل الخروج التلقائي
        if (hoursSinceLogin > 24) {
          logout();
        }
      } catch (error) {
        console.error('Error checking session expiry:', error);
      }
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    loginAsAdmin,
    logout,
    updateLastActivity,
    checkSessionExpiry
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
