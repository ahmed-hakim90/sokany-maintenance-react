import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

export const migrateInventoryData = async () => {
  try {
    console.log('بدء نقل بيانات المخزون من البنية القديمة إلى الجديدة...');

    // قراءة البيانات من البنية القديمة
    const oldInventorySnapshot = await getDocs(collection(db, 'inventory'));
    
    if (oldInventorySnapshot.empty) {
      console.log('لا توجد بيانات للنقل في البنية القديمة');
      return;
    }

    let migratedCount = 0;
    const itemsToDelete: string[] = [];

    for (const itemDoc of oldInventorySnapshot.docs) {
      const itemData = itemDoc.data();
      
      if (itemData.centerId) {
        try {
          // نقل البيانات إلى البنية الجديدة
          await addDoc(collection(db, 'centers', itemData.centerId, 'inventory'), {
            name: itemData.name,
            quantity: itemData.quantity,
            price: itemData.price,
            note: itemData.note || '',
            centerId: itemData.centerId,
            createdAt: itemData.createdAt || new Date(),
            updatedAt: itemData.updatedAt || new Date()
          });

          // إضافة المعرف للحذف لاحقاً
          itemsToDelete.push(itemDoc.id);
          migratedCount++;
          
          console.log(`تم نقل العنصر: ${itemData.name} إلى المركز: ${itemData.centerId}`);
        } catch (error) {
          console.error(`خطأ في نقل العنصر ${itemData.name}:`, error);
        }
      } else {
        console.warn(`العنصر ${itemData.name} لا يحتوي على معرف مركز`);
      }
    }

    // حذف البيانات القديمة بعد النقل الناجح
    for (const itemId of itemsToDelete) {
      try {
        await deleteDoc(doc(db, 'inventory', itemId));
      } catch (error) {
        console.error(`خطأ في حذف العنصر القديم ${itemId}:`, error);
      }
    }

    console.log(`تم نقل ${migratedCount} عنصر بنجاح`);
    return { success: true, migratedCount };
  } catch (error) {
    console.error('خطأ في عملية النقل:', error);
    return { success: false, error };
  }
};
