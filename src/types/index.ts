export interface Center {
  id: string;
  name: string;
  email: string;
  password: string;
  uid: string;
  managerName?: string; // اسم موظف / مدير المركز
  address?: string;     // عنوان المركز
  phone?: string;       // رقم الهاتف
  inventory: InventoryItem[];
  sales: Sale[];
  maintenance: MaintenanceRecord[];
  createdAt?: Date;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  note?: string;
  centerId: string;
  centerName?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Sale {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  customerName: string;
  customerPhone: string;
  totalPrice: number;
  centerId: string;
  centerName?: string;
  date: Date;
  note?: string;
  createdBy?: string;
  createdAt?: Date;
}

export interface MaintenanceRecord {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  customerName: string;
  customerPhone: string;
  deviceName: string;
  technicianName: string;
  status: MaintenanceStatus;
  note?: string;
  estimatedCost?: number;
  centerId: string;
  centerName?: string;
  date: Date;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
  updatedBy?: string;
  // الحقول الجديدة
  technicianId?: string;    // معرف الفني
  isWarranty?: boolean;     // فترة الضمان
  customerId?: string;      // معرف العميل
}

export type MaintenanceStatus = 
  | 'في انتظار قطعة غيار'
  | 'في انتظار الفني'
  | 'تم الصيانة'
  | 'في انتظار العميل';

export interface User {
  uid: string;
  email: string;
  centerId?: string;
  centerName?: string;
  isAdmin: boolean;
  lastLogin?: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

// واجهة الفني
export interface Technician {
  id: string;
  name: string;
  phoneNumber: string;
  centerId: string;
  centerName?: string;
  createdAt: Date;
  updatedAt: Date;
}

// واجهة العميل
export interface Customer {
  id: string;
  name: string;
  phoneNumber: string;
  type: 'distributor' | 'consumer';  // موزع أو مستهلك
  centerId: string;
  centerName?: string;
  createdAt: Date;
  updatedAt: Date;
}

// واجهة طلب الصيانة الجديدة (محدثة)
export interface MaintenanceRequest {
  id: string;
  customerName: string;
  phoneNumber?: string;
  deviceType: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  centerId: string;
  centerName?: string;
  technicianId?: string;
  technicianName?: string;
  customerId?: string;
  isWarranty?: boolean;
  parts?: Array<{
    itemId: string;
    itemName: string;
    quantity: number;
    unitPrice: number;
  }>;
  totalCost?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  // دورة حياة الطلب
  lifecycle: MaintenanceLifecycleEntry[];
}

// تتبع دورة حياة طلب الصيانة
export interface MaintenanceLifecycleEntry {
  id: string;
  timestamp: Date;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  action: string; // وصف العملية
  performedBy: string; // من قام بالعملية
  notes?: string;
  technicianAssigned?: string; // الفني المُعين
}

// سجل جلسة المركز
export interface CenterSession {
  id: string;
  centerId: string;
  centerName: string;
  sessionStart: Date;
  sessionEnd?: Date;
  isActive: boolean;
  activities: CenterActivityLog[];
}

// سجل أنشطة المركز
export interface CenterActivityLog {
  id: string;
  centerId: string;
  userId: string;
  userName: string;
  timestamp: Date;
  action: string; // وصف العملية
  description: string;
  type: 'inventory' | 'sales' | 'maintenance' | 'customer' | 'technician' | 'session' | 'other';
  details?: any; // تفاصيل إضافية
  
  // للتوافق مع النسخة القديمة
  activityType?: 'inventory' | 'sales' | 'maintenance' | 'customer' | 'technician' | 'login' | 'logout';
  targetId?: string;
  targetName?: string;
  performedBy?: string;
}
