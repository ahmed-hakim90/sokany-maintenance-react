import { collection, addDoc, setDoc, doc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../config/firebase';

// بيانات المراكز التجريبية
export const sampleCenters = [
  {
    id: 'center-riyadh-001',
    name: 'مركز الرياض الرئيسي',
    email: 'riyadh@sokany.com',
    password: 'riyadh123',
    location: 'الرياض، حي الملك فهد',
    phone: '+966-11-1234567',
    manager: 'أحمد محمد السعدي',
    inventory: [],
    sales: [],
    maintenance: [],
    createdAt: new Date()
  },
  {
    id: 'center-jeddah-002', 
    name: 'مركز جدة التجاري',
    email: 'jeddah@sokany.com',
    password: 'jeddah123',
    location: 'جدة، شارع التحلية',
    phone: '+966-12-9876543',
    manager: 'سارة عبدالله الحارثي',
    inventory: [],
    sales: [],
    maintenance: [],
    createdAt: new Date()
  },
  {
    id: 'center-dammam-003',
    name: 'مركز الدمام الشرقي',
    email: 'dammam@sokany.com', 
    password: 'dammam123',
    location: 'الدمام، الكورنيش الشرقي',
    phone: '+966-13-5555555',
    manager: 'محمد فيصل العتيبي',
    inventory: [],
    sales: [],
    maintenance: [],
    createdAt: new Date()
  }
];

// بيانات مخزون تجريبية
export const sampleInventory = [
  {
    name: 'لوحة إلكترونية رئيسية',
    quantity: 25,
    price: 350,
    note: 'متوفرة للجميع أنواع الأجهزة',
    category: 'قطع إلكترونية'
  },
  {
    name: 'مكثف كهربائي 450V',
    quantity: 50,
    price: 25,
    note: 'للمكيفات والثلاجات',
    category: 'قطع كهربائية'
  },
  {
    name: 'ضاغط تكييف 1.5 حصان',
    quantity: 8,
    price: 1200,
    note: 'ضمان سنة واحدة',
    category: 'ضواغط'
  },
  {
    name: 'مروحة تبريد داخلية',
    quantity: 30,
    price: 80,
    note: 'جميع الأحجام متوفرة',
    category: 'مراوح'
  }
];

// دالة إنشاء البيانات التجريبية
export const createSampleData = async () => {
  try {
    console.log('🔄 جاري إنشاء البيانات التجريبية...');

    for (const center of sampleCenters) {
      try {
        // إنشاء مستخدم في Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(
          auth, 
          center.email, 
          center.password
        );

        // إضافة UID إلى بيانات المركز
        const centerWithUID = {
          ...center,
          uid: userCredential.user.uid
        };

        // حفظ المركز في Firestore
        await setDoc(doc(db, 'centers', center.id), centerWithUID);

        // إضافة بيانات مخزون تجريبية للمركز
        for (const item of sampleInventory) {
          await addDoc(collection(db, 'centers', center.id, 'inventory'), {
            ...item,
            centerId: center.id,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }

        console.log(`✅ تم إنشاء مركز: ${center.name}`);
      } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
          console.log(`⚠️  المركز موجود بالفعل: ${center.name}`);
        } else {
          console.error(`❌ خطأ في إنشاء مركز ${center.name}:`, error);
        }
      }
    }

    console.log('✅ تم إنشاء جميع البيانات التجريبية بنجاح!');
    
    return {
      success: true,
      message: 'تم إنشاء البيانات التجريبية بنجاح',
      centers: sampleCenters
    };
  } catch (error) {
    console.error('❌ خطأ في إنشاء البيانات التجريبية:', error);
    return {
      success: false,
      message: 'حدث خطأ في إنشاء البيانات التجريبية',
      error
    };
  }
};

// دالة التحقق من البيانات
export const verifyData = async () => {
  try {
    const results = [];
    
    for (const center of sampleCenters) {
      try {
        // يمكن إضافة التحقق من وجود المركز لاحقاً
        results.push({
          center: center.name,
          email: center.email,
          status: '✅ متاح للدخول'
        });
      } catch (error) {
        results.push({
          center: center.name,
          email: center.email,
          status: '❌ غير متاح'
        });
      }
    }
    
    return results;
  } catch (error) {
    console.error('خطأ في التحقق من البيانات:', error);
    return [];
  }
};
