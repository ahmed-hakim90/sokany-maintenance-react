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
