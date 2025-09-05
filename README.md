# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

# نظام إدارة المخزون متعدد المراكز - React PWA

نظام شامل لإدارة المخزون والصيانة للمراكز المتعددة مبني بتقنية React وFirebase مع دعم PWA.

## المميزات

- 🏢 إدارة مراكز متعددة
- 📦 إدارة المخزون والأصناف
- 💰 تتبع عمليات البيع
- 🔧 إدارة طلبات الصيانة
- 🌐 يعمل بدون إنترنت (PWA)
- 🇸🇦 دعم كامل للغة العربية (RTL)
- 📱 تصميم متجاوب لجميع الأجهزة
- ☁️ مزامنة البيانات في الوقت الفعلي

## التقنيات المستخدمة

- **React 18** مع TypeScript
- **Vite** كأداة البناء
- **Firebase** للمصادقة وقاعدة البيانات
- **PWA** للعمل بدون إنترنت
- **CSS3** مع Flexbox وGrid
- **Font Awesome** للأيقونات

## البدء السريع

### المتطلبات

- Node.js (النسخة 18 أو أحدث)
- npm أو yarn
- حساب Firebase

### التثبيت

1. استنساخ المشروع:
```bash
git clone <repository-url>
cd sokany-maintenance-react
```

2. تثبيت التبعيات:
```bash
npm install
```

3. إعداد Firebase:
   - أنشئ مشروع جديد في [Firebase Console](https://console.firebase.google.com)
   - فعّل Authentication (Email/Password)
   - فعّل Firestore Database
   - انسخ إعدادات Firebase إلى `src/config/firebase.ts`

4. تشغيل المشروع:
```bash
npm run dev
```

## الاستخدام

### تسجيل الدخول

1. **دخول المسؤول:**
   - اختر "لوحة المسؤول" من القائمة
   - كلمة المرور الافتراضية: `admin123`

2. **دخول المركز:**
   - اختر المركز من القائمة
   - أدخل البريد الإلكتروني وكلمة المرور

### إدارة المراكز (المسؤول)

- إضافة مراكز جديدة
- عرض بيانات جميع المراكز
- إدارة المستخدمين

### إدارة المخزون

- إضافة أصناف جديدة
- تحديث كميات المخزون
- تتبع القيم والأسعار

### إدارة المبيعات

- تسجيل عمليات البيع
- تتبع بيانات العملاء
- تقارير المبيعات

### إدارة الصيانة

- تسجيل طلبات الصيانة
- تتبع حالة الطلبات
- إدارة الفنيين والقطع

## البنية

```
src/
├── components/          # مكونات React
│   ├── LoginForm.tsx   # نموذج تسجيل الدخول
│   └── ...
├── contexts/           # React Contexts
│   └── AuthContext.tsx # سياق المصادقة
├── config/            # ملفات الإعدادات
│   └── firebase.ts    # إعدادات Firebase
├── types/             # أنواع TypeScript
│   └── index.ts       # تعريف الأنواع
├── styles/            # ملفات الأنماط
│   └── global.css     # الأنماط العامة
├── App.tsx            # المكون الرئيسي
└── main.tsx           # نقطة دخول التطبيق
```

## PWA Features

- العمل بدون إنترنت
- إمكانية التثبيت على الجهاز
- تحديثات تلقائية
- تخزين مؤقت ذكي

## الأمان

- مصادقة باستخدام Firebase Auth
- قواعد أمان Firestore
- تشفير البيانات
- حماية من CSRF

## المساهمة

1. Fork المشروع
2. إنشاء فرع جديد (`git checkout -b feature/new-feature`)
3. تنفيذ التغييرات (`git commit -am 'Add new feature'`)
4. Push للفرع (`git push origin feature/new-feature`)
5. إنشاء Pull Request

## الترخيص

هذا المشروع مرخص تحت رخصة MIT.

## الدعم

للحصول على الدعم أو الإبلاغ عن المشاكل، يرجى إنشاء Issue في GitHub.

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
