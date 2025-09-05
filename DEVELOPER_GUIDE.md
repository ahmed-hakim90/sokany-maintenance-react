# دليل المطور - نظام سوكاني للصيانة

## 🚀 البدء السريع للمطورين

### متطلبات النظام
```bash
Node.js >= 18.0.0
npm >= 8.0.0
Git >= 2.20.0
```

### إعداد بيئة التطوير
```bash
# استنساخ المشروع
git clone https://github.com/your-repo/sokany-maintenance-react.git
cd sokany-maintenance-react

# تثبيت التبعيات
npm install

# نسخ ملف البيئة
cp .env.example .env.local

# تشغيل خادم التطوير
npm run dev
```

## 🏗️ هيكل المشروع المفصل

```
src/
├── components/                    # مكونات الواجهة
│   ├── Dashboard.tsx             # لوحة التحكم الرئيسية
│   ├── LoginForm.tsx             # نموذج تسجيل الدخول
│   ├── InventoryManagement.tsx   # إدارة المخزون
│   ├── SalesManagement.tsx       # إدارة المبيعات
│   ├── MaintenanceManagement.tsx # إدارة الصيانة
│   ├── TechnicianManagement.tsx  # إدارة الفنيين
│   ├── CustomerManagement.tsx    # إدارة العملاء
│   ├── CenterManagement.tsx      # إدارة المراكز
│   ├── Reports.tsx               # التقارير والتحليلات
│   └── SessionInfo.tsx           # معلومات الجلسة
│
├── contexts/                     # React Contexts
│   └── AuthContext.tsx           # سياق المصادقة
│
├── config/                       # الإعدادات
│   └── firebase.ts               # إعدادات Firebase
│
├── types/                        # تعريفات TypeScript
│   └── index.ts                  # جميع الواجهات والأنواع
│
├── utils/                        # الأدوات المساعدة
│   ├── migrateData.ts            # نقل البيانات القديمة
│   └── sampleData.ts             # بيانات تجريبية
│
├── styles/                       # ملفات التصميم
│   ├── global.css                # الأنماط العامة
│   └── components/               # أنماط المكونات الفردية
│
├── assets/                       # الملفات الثابتة
│   └── images/                   # الصور والأيقونات
│
├── public/                       # الملفات العامة
│   ├── vite.svg                  # أيقونة Vite
│   └── manifest.json             # إعدادات PWA
│
├── App.tsx                       # المكون الجذر
├── main.tsx                      # نقطة دخول التطبيق
└── vite-env.d.ts                 # تعريفات Vite
```

## 🧩 معمارية النظام

### نمط المكونات
```typescript
// نمط المكون النموذجي
interface ComponentProps {
  // خصائص المكون
}

const Component: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  // 1. Hooks والحالة المحلية
  const [state, setState] = useState<Type>(initialValue);
  const { user } = useAuth();
  
  // 2. useEffect للتأثيرات الجانبية
  useEffect(() => {
    loadData();
  }, []);
  
  // 3. دوال مساعدة
  const handleAction = async () => {
    // منطق المعالجة
  };
  
  // 4. شروط العرض المبكرة
  if (loading) return <LoadingComponent />;
  if (error) return <ErrorComponent />;
  
  // 5. JSX الرئيسي
  return (
    <div className="component-container">
      {/* محتوى المكون */}
    </div>
  );
};

export default Component;
```

### إدارة الحالة
- **React Hooks**: useState, useEffect, useContext
- **AuthContext**: حالة المصادقة المشتركة
- **Local State**: حالة محلية لكل مكون
- **Firebase**: مزامنة البيانات في الوقت الفعلي

### تدفق البيانات
```
Firebase Firestore ↔ React Components ↔ UI
        ↕
  AuthContext (Global State)
```

## 🎨 دليل التصميم

### نظام الألوان
```css
:root {
  /* الألوان الأساسية */
  --primary-color: #667eea;
  --secondary-color: #764ba2;
  --success-color: #28a745;
  --danger-color: #dc3545;
  --warning-color: #ffc107;
  --info-color: #17a2b8;
  
  /* ألوان الخلفية */
  --bg-primary: #f8f9fa;
  --bg-secondary: #ffffff;
  --bg-dark: #343a40;
  
  /* ألوان النص */
  --text-primary: #333333;
  --text-secondary: #666666;
  --text-muted: #999999;
  
  /* الحدود والظلال */
  --border-color: #e9ecef;
  --shadow: 0 2px 10px rgba(0,0,0,0.1);
}
```

### Typography
```css
/* خطوط النص */
body {
  font-family: 'Cairo', 'Tajawal', sans-serif;
  direction: rtl;
  text-align: right;
}

/* أحجام النص */
.text-xl { font-size: 1.25rem; }
.text-lg { font-size: 1.125rem; }
.text-base { font-size: 1rem; }
.text-sm { font-size: 0.875rem; }
.text-xs { font-size: 0.75rem; }
```

### Grid System
```css
.container { max-width: 1200px; margin: 0 auto; }
.row { display: flex; gap: 1rem; }
.col { flex: 1; }
.col-2 { flex: 0 0 16.666667%; }
.col-3 { flex: 0 0 25%; }
.col-4 { flex: 0 0 33.333333%; }
.col-6 { flex: 0 0 50%; }
```

## 🔥 Firebase Integration

### إعداد Firebase
```typescript
// src/config/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
```

### قواعد الأمان (Firestore Rules)
```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // قواعد المراكز
    match /centers/{centerId} {
      allow read, write: if request.auth != null;
      
      // قواعد المخزون
      match /inventory/{itemId} {
        allow read, write: if request.auth != null;
      }
      
      // قواعد المبيعات
      match /sales/{saleId} {
        allow read, write: if request.auth != null;
      }
      
      // قواعد الصيانة
      match /maintenance/{requestId} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```

### نماذج عمليات Firebase
```typescript
// قراءة البيانات
const loadData = async () => {
  const snapshot = await getDocs(collection(db, 'centers'));
  const data = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

// إضافة بيانات
const addData = async (data: any) => {
  await addDoc(collection(db, 'centers'), {
    ...data,
    createdAt: new Date(),
    updatedAt: new Date()
  });
};

// تحديث البيانات
const updateData = async (id: string, data: any) => {
  await updateDoc(doc(db, 'centers', id), {
    ...data,
    updatedAt: new Date()
  });
};

// حذف البيانات
const deleteData = async (id: string) => {
  await deleteDoc(doc(db, 'centers', id));
};
```

## 🔐 نظام المصادقة

### AuthContext Implementation
```typescript
interface User {
  email: string;
  isAdmin: boolean;
  centerId?: string;
  centerName?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // تحقق من الجلسة المحفوظة
  useEffect(() => {
    checkSession();
  }, []);

  // دوال المصادقة
  const login = async (email: string, password: string): Promise<boolean> => {
    // منطق مصادقة Firebase Auth
  };

  const loginAsCenter = async (centerId: string, password: string): Promise<boolean> => {
    // منطق مصادقة الوثائق
  };

  return (
    <AuthContext.Provider value={{ user, login, loginAsCenter, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### حماية المسارات
```typescript
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <LoginForm />;

  return <>{children}</>;
};
```

## 📝 معايير الكود

### ESLint Configuration
```javascript
// eslint.config.js
export default [
  {
    rules: {
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      'prefer-const': 'error'
    }
  }
];
```

### Naming Conventions
```typescript
// أسماء المكونات: PascalCase
const TechnicianManagement: React.FC = () => { };

// أسماء الدوال: camelCase
const handleSubmit = () => { };

// أسماء المتغيرات: camelCase
const userName = 'حكيم';

// أسماء الثوابت: SCREAMING_SNAKE_CASE
const API_ENDPOINT = 'https://api.example.com';

// أسماء الواجهات: PascalCase مع Interface
interface UserInterface { }

// أسماء الأنواع: PascalCase مع Type
type UserType = { };
```

### Code Comments (Arabic)
```typescript
/**
 * دالة لتحميل بيانات المخزون من Firebase
 * @param centerId معرف المركز
 * @returns Promise<InventoryItem[]>
 */
const loadInventoryItems = async (centerId: string): Promise<InventoryItem[]> => {
  try {
    // تحميل البيانات من Firestore
    const snapshot = await getDocs(collection(db, 'centers', centerId, 'inventory'));
    
    // تحويل البيانات للتنسيق المطلوب
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as InventoryItem));
  } catch (error) {
    console.error('خطأ في تحميل المخزون:', error);
    throw error;
  }
};
```

## 🧪 الاختبارات

### Unit Testing Setup
```bash
# تثبيت أدوات الاختبار
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

```typescript
// src/components/__tests__/LoginForm.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import LoginForm from '../LoginForm';

describe('LoginForm', () => {
  it('should render login form correctly', () => {
    render(<LoginForm />);
    expect(screen.getByText('تسجيل الدخول')).toBeInTheDocument();
  });

  it('should handle form submission', async () => {
    const mockLogin = vi.fn();
    render(<LoginForm onLogin={mockLogin} />);
    
    fireEvent.change(screen.getByLabelText('البريد الإلكتروني'), {
      target: { value: 'test@example.com' }
    });
    
    fireEvent.click(screen.getByText('دخول'));
    
    expect(mockLogin).toHaveBeenCalledWith('test@example.com', expect.any(String));
  });
});
```

### Integration Testing
```typescript
// src/__tests__/AuthFlow.test.tsx
import { render, screen } from '@testing-library/react';
import { AuthProvider } from '../contexts/AuthContext';
import App from '../App';

describe('Authentication Flow', () => {
  it('should redirect to dashboard after successful login', async () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );
    
    // منطق اختبار تدفق المصادقة
  });
});
```

## 🚀 الأداء والتحسين

### Code Splitting
```typescript
// تحميل المكونات بشكل lazy
const Dashboard = lazy(() => import('./components/Dashboard'));
const Reports = lazy(() => import('./components/Reports'));

// استخدام Suspense
<Suspense fallback={<LoadingSpinner />}>
  <Dashboard />
</Suspense>
```

### Memoization
```typescript
// استخدام React.memo للمكونات
const ExpensiveComponent = React.memo<Props>(({ data }) => {
  return <div>{/* محتوى المكون */}</div>;
});

// استخدام useMemo للحسابات المكلفة
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// استخدام useCallback للدوال
const handleClick = useCallback((id: string) => {
  // منطق المعالجة
}, [dependency]);
```

### Bundle Analysis
```bash
# تحليل حجم Bundle
npm run build
npx vite-bundle-analyzer dist
```

## 📦 إدارة التبعيات

### Production Dependencies
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "firebase": "^10.0.0",
  "typescript": "^5.0.0"
}
```

### Development Dependencies
```json
{
  "vite": "^5.0.0",
  "@vitejs/plugin-react": "^4.0.0",
  "@types/react": "^18.0.0",
  "eslint": "^8.0.0",
  "prettier": "^3.0.0"
}
```

## 🐛 Debugging

### Console Logging
```typescript
// استخدام نظام logging منظم
const logger = {
  info: (message: string, data?: any) => {
    console.log(`ℹ️ ${message}`, data);
  },
  warn: (message: string, data?: any) => {
    console.warn(`⚠️ ${message}`, data);
  },
  error: (message: string, error?: any) => {
    console.error(`❌ ${message}`, error);
  }
};

// استخدام في المكونات
logger.info('تم تحميل البيانات بنجاح', { count: items.length });
logger.error('خطأ في تحميل البيانات', error);
```

### React Developer Tools
```bash
# تثبيت امتداد React DevTools
# متوفر لـ Chrome و Firefox
```

### Firebase Debugging
```typescript
// تفعيل Firebase debugging في بيئة التطوير
import { connectFirestoreEmulator } from 'firebase/firestore';
import { connectAuthEmulator } from 'firebase/auth';

if (process.env.NODE_ENV === 'development') {
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099');
}
```

## 🚢 النشر والإنتاج

### Build للإنتاج
```bash
# بناء التطبيق
npm run build

# معاينة البناء محلياً
npm run preview

# تحليل البناء
npm run analyze
```

### Deployment على Firebase
```bash
# تثبيت Firebase CLI
npm install -g firebase-tools

# تسجيل الدخول
firebase login

# تهيئة المشروع
firebase init

# النشر
firebase deploy
```

### Environment Variables
```bash
# .env.production
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
```

## 🔄 Git Workflow

### Branch Strategy
```bash
# الفروع الرئيسية
main/          # الإنتاج
develop/       # التطوير
feature/*      # المميزات الجديدة
hotfix/*       # إصلاحات عاجلة
release/*      # إصدارات جديدة
```

### Commit Messages (Arabic)
```bash
git commit -m "إضافة: ميزة إدارة المخزون الجديدة"
git commit -m "إصلاح: مشكلة عدم ظهور المخزون في القوائم"
git commit -m "تحسين: أداء تحميل البيانات"
git commit -m "تحديث: واجهة صفحة التقارير"
```

### Pull Request Template
```markdown
## وصف التغيير
- تفصيل المميزة أو الإصلاح المضاف

## نوع التغيير
- [ ] ميزة جديدة
- [ ] إصلاح خطأ  
- [ ] تحسين أداء
- [ ] تحديث وثائق

## اختبار التغيير
- [ ] تم اختبار الميزة محلياً
- [ ] تم اختبار التوافق مع المتصفحات
- [ ] تم التحقق من الأداء

## Screenshots
إضافة صور للواجهة إن أمكن
```

---

## 📞 الحصول على المساعدة

### الموارد المفيدة
- **React Docs**: https://reactjs.org/docs
- **TypeScript Handbook**: https://www.typescriptlang.org/docs
- **Firebase Docs**: https://firebase.google.com/docs
- **Vite Guide**: https://vitejs.dev/guide

### المجتمع
- **GitHub Issues**: للإبلاغ عن الأخطاء
- **GitHub Discussions**: للأسئلة والاقتراحات
- **Discord**: [رابط الخادم]

---

*تم إنشاء دليل المطور في سبتمبر 2025*
