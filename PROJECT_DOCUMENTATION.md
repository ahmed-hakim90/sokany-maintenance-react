# وثائق مشروع سوكاني للصيانة - React PWA

## وصف المشروع العام

نظام إدارة المخزون والصيانة باللغة العربية مطور بـ React مع دعم PWA (Progressive Web App). يتيح النظام إدارة متعددة المراكز مع تتبع المبيعات وطلبات الصيانة والمخزون في الوقت الفعلي.

### التقنيات المستخدمة:
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Firebase (Firestore Database + Authentication)
- **PWA**: Service Worker للعمل دون اتصال
- **UI**: CSS مخصص مع دعم RTL للعربية
- **Icons**: FontAwesome

### المميزات الرئيسية:
- نظام مصادقة متطور (أدمن + مراكز)
- إدارة متعددة المراكز
- تتبع المخزون في الوقت الفعلي  
- إدارة المبيعات مع خصم تلقائي من المخزون
- نظام طلبات الصيانة
- تقارير تحليلية شاملة
- دعم كامل للغة العربية RTL

---

## هيكل المشروع

```
src/
├── components/          # مكونات الواجهة الرئيسية
├── config/             # إعدادات Firebase
├── contexts/           # React Contexts (AuthContext)
├── styles/             # ملفات التصميم العامة
├── types/              # تعريفات TypeScript
└── utils/              # أدوات مساعدة
```

---

## الملفات الأساسية

### 1. `src/main.tsx`
نقطة دخول التطبيق الرئيسية
```typescript
// تهيئة React مع AuthContext Provider
// تسجيل Service Worker للـ PWA
```

### 2. `src/App.tsx`
المكون الجذر للتطبيق
```typescript
// التحكم في التوجيه بين الصفحات
// إدارة حالة المستخدم المسجل
// عرض Dashboard أو LoginForm
```

---

## إعدادات Firebase

### `src/config/firebase.ts`
```typescript
// إعداد Firebase Configuration
// تهيئة Firestore Database
// تهيئة Firebase Authentication
// تصدير instances للاستخدام في المكونات
```

**المتغيرات المطلوبة:**
- `apiKey`: مفتاح API
- `authDomain`: نطاق المصادقة  
- `projectId`: معرف المشروع
- `storageBucket`: حاوية التخزين
- `messagingSenderId`: معرف الرسائل
- `appId`: معرف التطبيق

---

## السياق والمصادقة

### `src/contexts/AuthContext.tsx`

#### الواجهات والأنواع:
```typescript
interface User {
  email: string;
  isAdmin: boolean;
  centerId?: string;
  centerName?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  loginAsCenter: (centerId: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}
```

#### الدوال الرئيسية:

**1. `login(email, password)`**
- مصادقة الأدمن عبر Firebase Auth
- حفظ بيانات الجلسة في localStorage
- مدة الجلسة: 24 ساعة

**2. `loginAsCenter(centerId, password)`** 
- مصادقة مراكز عبر وثائق Firestore
- التحقق من صحة كلمة المرور
- تحميل بيانات المركز (الاسم، مدير، إلخ)

**3. `logout()`**
- مسح بيانات الجلسة
- إعادة توجيه لصفحة تسجيل الدخول

**4. `checkSession()`**
- فحص صحة الجلسة عند تحميل التطبيق
- التحقق من انتهاء صلاحية الجلسة (24 ساعة)

---

## مكونات الواجهة

### 1. `src/components/LoginForm.tsx`

#### الوصف:
صفحة تسجيل الدخول الرئيسية مع دعم نمطين من المصادقة

#### الحالة المحلية:
```typescript
const [email, setEmail] = useState('')
const [password, setPassword] = useState('')
const [centerId, setCenterId] = useState('')
const [isAdminLogin, setIsAdminLogin] = useState(true)
const [loading, setLoading] = useState(false)
```

#### الدوال:
**`handleSubmit()`**
- التبديل بين مصادقة الأدمن والمراكز
- عرض رسائل الخطأ المناسبة
- تحديث حالة التحميل

#### المميزات:
- تصميم responsive
- تبديل سلس بين نمطي تسجيل الدخول
- رسائل خطأ باللغة العربية
- أيقونات تفاعلية

---

### 2. `src/components/Dashboard.tsx`

#### الوصف:
الصفحة الرئيسية بعد تسجيل الدخول مع إحصائيات ولوحة تحكم

#### الحالة المحلية:
```typescript
const [activeTab, setActiveTab] = useState('inventory')
const [stats, setStats] = useState({
  totalProducts: 0,
  totalCenters: 0,
  pendingMaintenance: 0,
  todaySales: 0
})
```

#### الدوال:
**`loadStats()`**
- تحميل الإحصائيات من Firestore
- حساب إجمالي المنتجات والمراكز
- حساب المبيعات اليومية
- عد طلبات الصيانة المعلقة

**`renderActiveComponent()`**
- عرض المكون النشط حسب التبويب المحدد
- التنقل بين الصفحات المختلفة

#### التبويبات المتاحة:
- إدارة المخزون (`inventory`)
- إدارة المبيعات (`sales`)  
- إدارة الصيانة (`maintenance`)
- إدارة المراكز (`centers`) - للأدمن فقط
- إدارة المستخدمين (`users`) - للأدمن فقط
- التقارير (`reports`)

---

### 3. `src/components/InventoryManagement.tsx`

#### الوصف:
إدارة شاملة للمخزون مع إضافة/تعديل/حذف الأصناف

#### الحالة المحلية:
```typescript
const [items, setItems] = useState<InventoryItem[]>([])
const [centers, setCenters] = useState<Center[]>([])
const [showAddForm, setShowAddForm] = useState(false)
const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
const [formData, setFormData] = useState({
  name: '', quantity: 0, price: 0, note: '', centerId: ''
})
```

#### الدوال الرئيسية:

**`loadItems()`**
- تحميل المخزون من `centers/{centerId}/inventory`
- فلترة البيانات حسب دور المستخدم (أدمن/مركز)
- تطبيق البنية الجديدة للبيانات

**`loadCenters()`**
- تحميل قائمة المراكز لاختيار المركز

**`handleSubmit()`** 
- إضافة/تعديل صنف في المخزون
- التحقق من صحة البيانات
- حفظ في `centers/{centerId}/inventory`

**`handleEdit(item)`**
- تحميل بيانات الصنف للتعديل
- ملء النموذج بالبيانات الحالية

**`handleDelete(item)`**
- حذف صنف من المخزون مع تأكيد
- الحذف من البنية الجديدة

**`handleMigrateData()`** ⭐ جديد
- نقل البيانات من البنية القديمة للجديدة
- متاح للأدمن فقط
- حذف البيانات القديمة بعد النقل الناجح

#### المميزات:
- نموذج إضافة/تعديل ديناميكي
- جدول عرض الأصناف مع البحث والفلترة
- عرض اسم المركز لكل صنف
- أداة نقل البيانات للتوافق مع النظام الجديد

---

### 4. `src/components/SalesManagement.tsx`

#### الوصف:
إدارة المبيعات مع خصم تلقائي من المخزون

#### الحالة المحلية:
```typescript
const [sales, setSales] = useState<Sale[]>([])
const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
const [showAddForm, setShowAddForm] = useState(false)
const [formData, setFormData] = useState({
  customerName: '', phoneNumber: '', itemId: '', quantity: 1, notes: ''
})
```

#### الدوال الرئيسية:

**`loadInventoryItems()`** ⭐ محدثة مع التشخيص
- تحميل المخزون من جميع المراكز (للأدمن) أو المركز الحالي
- تسجيل تفصيلي في الكونسول للتشخيص
- فلترة العناصر ذات الكمية > 0
- ترتيب العناصر حسب المركز والاسم

**`loadSales()`**
- تحميل المبيعات من `centers/{centerId}/sales`
- فلترة حسب دور المستخدم

**`handleSubmit()`**
- إضافة عملية بيع جديدة
- التحقق من توفر الكمية
- خصم تلقائي من المخزون
- حفظ تفاصيل البيع

**`getSelectedItemDetails()`**
- استخراج تفاصيل الصنف المحدد
- عرض السعر والمركز

#### المميزات:
- قائمة منسدلة ذكية للأصناف مع تفاصيل المركز
- تحديث فوري للمخزون بعد البيع
- حفظ تفاصيل العميل مع كل عملية بيع
- رسائل تأكيد وخطأ باللغة العربية

---

### 5. `src/components/MaintenanceManagement.tsx`

#### الوصف:
إدارة طلبات الصيانة مع دورة حياة كاملة

#### الحالة المحلية:
```typescript
const [requests, setRequests] = useState<MaintenanceRequest[]>([])
const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
const [showAddForm, setShowAddForm] = useState(false)
const [editingRequest, setEditingRequest] = useState<MaintenanceRequest | null>(null)
```

#### حالات الصيانة:
- `pending`: معلق
- `in-progress`: قيد التنفيذ  
- `completed`: مكتمل
- `cancelled`: ملغي

#### الدوال الرئيسية:

**`loadInventoryItems()`** ⭐ محدثة مع التشخيص
- تحميل قطع الغيار من جميع المراكز
- نفس آلية `SalesManagement` مع التشخيص

**`loadMaintenanceRequests()`**
- تحميل طلبات الصيانة
- فلترة حسب دور المستخدم

**`handleSubmit()`**
- إضافة/تعديل طلب صيانة
- التحقق من البيانات المطلوبة

**`handleStatusChange()`**
- تغيير حالة طلب الصيانة
- خصم قطع الغيار عند الإكمال
- تسجيل التكلفة والوقت

#### المميزات:
- نظام حالات متطور
- خصم تلقائي لقطع الغيار
- تتبع التكلفة والوقت
- تصنيف العملاء والأجهزة

---

### 6. `src/components/CenterManagement.tsx`

#### الوصف:
إدارة المراكز مع إنشاء حسابات مصادقة تلقائياً (للأدمن فقط)

#### الحالة المحلية:
```typescript
const [centers, setCenters] = useState<Center[]>([])
const [showAddForm, setShowAddForm] = useState(false)
const [editingCenter, setEditingCenter] = useState<Center | null>(null)
const [formData, setFormData] = useState({
  name: '', password: '', managerName: '', address: '', phone: ''
})
```

#### الدوال الرئيسية:

**`loadCenters()`**
- تحميل قائمة المراكز من Firestore

**`handleSubmit()`** ⭐ محدثة
- إضافة/تعديل مركز في Firestore
- **إنشاء حساب Firebase تلقائياً** للمراكز الجديدة
- حفظ الحقول الإضافية (مدير، عنوان، هاتف)

**`handleEdit(center)`**
- تحميل بيانات المركز للتعديل

**`handleDelete(centerId)`**
- حذف مركز (يتطلب تأكيداً)

#### المميزات الجديدة:
- إنشاء تلقائي لحسابات Firebase
- حقول إضافية: اسم المدير، العنوان، الهاتف
- عرض تفصيلي لبيانات المراكز
- ربط مع نظام المصادقة

---

### 7. `src/components/Reports.tsx`

#### الوصف:
صفحة تقارير شاملة مع مخططات بيانية وتحليلات

#### الحالة المحلية:
```typescript
const [monthlyTrends, setMonthlyTrends] = useState<any[]>([])
const [topSellingItems, setTopSellingItems] = useState<any[]>([])
const [topMaintenanceItems, setTopMaintenanceItems] = useState<any[]>([])
const [maintenanceDetails, setMaintenanceDetails] = useState<any[]>([])
```

#### الدوال التحليلية:

**`loadMonthlyTrends()`**
- تجميع المبيعات حسب الشهر
- حساب الاتجاهات الشهرية
- عرض في مخطط بياني

**`loadTopSellingItems()`**
- ترتيب الأصناف الأكثر مبيعاً
- حساب إجمالي الكميات والمبالغ

**`loadTopMaintenanceItems()`**
- تحليل قطع الغيار الأكثر استخداماً
- حساب التكرار والتكلفة

**`loadMaintenanceDetails()`**
- تفاصيل الصيانة حسب العميل والجهاز
- تحليل التكاليف والأوقات

#### أنواع التقارير:
1. **الاتجاهات الشهرية**: مخطط خطي للمبيعات
2. **الأصناف الأكثر مبيعاً**: قائمة مرتبة
3. **قطع الغيار الأكثر استخداماً**: تحليل الصيانة
4. **تفاصيل الصيانة**: جدول شامل بالعمليات

---

### 8. `src/components/TechnicianManagement.tsx`

#### الوصف:
إدارة الفنيين وتعيينهم للمراكز

#### الوظائف:
- عرض قائمة الفنيين
- إضافة فني جديد
- تعديل بيانات الفني
- عرض إحصائيات الفني
- ربط الفنيين بطلبات الصيانة

---

### 9. `src/components/CustomerManagement.tsx`

#### الوصف:
إدارة العملاء وتتبع تاريخهم

#### الوظائف:
- عرض قائمة العملاء
- إضافة عميل جديد
- تصنيف العملاء (موزع/مستهلك)
- عرض تاريخ العميل
- ربط العملاء بالمبيعات والصيانة

---

## الأنواع والواجهات

### `src/types/index.ts`

```typescript
// واجهة المستخدم
interface User {
  email: string;
  isAdmin: boolean;
  centerId?: string;
  centerName?: string;
}

// واجهة المركز  
interface Center {
  id: string;
  name: string;
  password: string;
  managerName?: string;    // جديد
  address?: string;        // جديد
  phone?: string;          // جديد
  createdAt: Date;
  updatedAt: Date;
}

// واجهة عنصر المخزون
interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  note?: string;
  centerId: string;
  centerName?: string;     // جديد للعرض
  createdAt: Date;
  updatedAt: Date;
}

// واجهة المبيعات
interface Sale {
  id: string;
  customerName: string;
  phoneNumber?: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  centerId: string;
  centerName?: string;
  notes?: string;
  createdAt: Date;
}

// واجهة طلب الصيانة
interface MaintenanceRequest {
  id: string;
  customerName: string;
  phoneNumber?: string;
  deviceType: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  parts?: {
    itemId: string;
    itemName: string;
    quantity: number;
    unitPrice: number;
  }[];
  totalCost?: number;
  centerId: string;
  centerName?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}
```

---

## الأدوات المساعدة

### `src/utils/migrateData.ts` ⭐ جديد

#### الوصف:
أداة نقل البيانات من البنية القديمة إلى الجديدة

#### الدالة الرئيسية:
**`migrateInventoryData()`**
- قراءة البيانات من `inventory` collection
- نقلها إلى `centers/{centerId}/inventory`
- حذف البيانات القديمة بعد النقل
- تسجيل تفصيلي للعملية

#### الاستخدام:
```typescript
const result = await migrateInventoryData();
if (result.success) {
  console.log(`تم نقل ${result.migratedCount} عنصر`);
}
```

---

## بنية قاعدة البيانات (Firestore)

### المجموعات الرئيسية:

```
centers/                    # المراكز
  {centerId}/
    - name: string
    - password: string  
    - managerName: string
    - address: string
    - phone: string
    
    inventory/              # مخزون المركز
      {itemId}/
        - name: string
        - quantity: number
        - price: number
        - centerId: string
        
    sales/                  # مبيعات المركز
      {saleId}/
        - customerName: string
        - itemName: string
        - quantity: number
        - totalPrice: number
        
    maintenance/            # صيانة المركز
      {requestId}/
        - customerName: string
        - deviceType: string
        - status: string
        - parts: array
```

---

## التحديثات الأخيرة

### ✅ إصلاح مشكلة عرض المخزون:
- **المشكلة**: الأصناف لا تظهر في قوائم المبيعات والصيانة
- **السبب**: استخدام بنيتين مختلفتين للبيانات
- **الحل**: توحيد البنية + أداة نقل البيانات

### ✅ تحسينات التشخيص:
- إضافة تسجيل تفصيلي في الكونسول
- تتبع تحميل البيانات خطوة بخطوة
- رسائل واضحة لتحديد المشاكل

### ✅ مميزات جديدة:
- حقول إضافية للمراكز (مدير، عنوان، هاتف)
- إنشاء تلقائي لحسابات Firebase للمراكز
- عرض أسماء المراكز في قوائم المخزون
- تقارير تحليلية شاملة

---

## الاستخدام والنشر

### متطلبات التشغيل:
```bash
npm install          # تثبيت المكتبات
npm run dev         # تشغيل خادم التطوير
npm run build       # بناء للإنتاج
npm run preview     # معاينة البناء
```

### متطلبات Firebase:
1. إنشاء مشروع Firebase جديد
2. تفعيل Firestore Database
3. تفعيل Authentication (Email/Password)
4. تحديث ملف إعدادات Firebase

### نشر التطبيق:
```bash
npm run build              # بناء الملفات
firebase deploy --only hosting  # نشر على Firebase Hosting
```

---

## الأمان والصلاحيات

### مستويات الوصول:
- **أدمن عام**: وصول كامل لجميع المراكز والبيانات
- **مدير مركز**: وصول محدود لبيانات مركزه فقط

### حماية البيانات:
- جلسات محدودة بـ 24 ساعة
- تشفير كلمات المرور
- قواعد أمان Firestore
- تحقق من الصلاحيات في كل عملية

---

## المساهمة والتطوير

### إضافة مميزات جديدة:
1. إنشاء component جديد في `src/components/`
2. إضافة الأنواع المطلوبة في `src/types/`
3. تحديث التنقل في `Dashboard.tsx`
4. إضافة CSS مخصص
5. تحديث الوثائق

### أفضل الممارسات:
- استخدام TypeScript للأنواع
- إضافة رسائل خطأ بالعربية
- اتباع نمط RTL للتصميم
- تحديث الوثائق مع كل تغيير

---

## الدعم والمساعدة

### حل المشاكل الشائعة:
1. **البيانات لا تظهر**: تحقق من الكونسول ورسائل التشخيص
2. **خطأ في المصادقة**: تحقق من إعدادات Firebase
3. **خطأ في البناء**: تحقق من أخطاء TypeScript

### الموارد المفيدة:
- [React Documentation](https://reactjs.org/)
- [Firebase Documentation](https://firebase.google.com/docs)  
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)

---

*تم إنشاء هذه الوثائق في سبتمبر 2025 - الإصدار 1.0*
