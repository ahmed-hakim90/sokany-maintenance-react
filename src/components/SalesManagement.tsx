import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  updateDoc, 
  doc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { Sale, InventoryItem, Customer } from '../types';
import './SalesManagement.css';

interface NewSale {
  itemId: string;
  itemName: string;
  quantity: number;
  customerName: string;
  customerPhone: string;
  customerId?: string;
  unitPrice: number;
  totalPrice: number;
  note?: string;
}

const SalesManagement: React.FC = () => {
  const { user, updateLastActivity } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const [newSale, setNewSale] = useState<NewSale>({
    itemId: '',
    itemName: '',
    quantity: 1,
    customerName: '',
    customerPhone: '',
    customerId: '',
    unitPrice: 0,
    totalPrice: 0,
    note: ''
  });

  useEffect(() => {
    if (!user) return; // انتظر حتى تتوفر بيانات المستخدم
    loadSales();
    loadInventoryItems();
    loadCustomers();
    updateLastActivity();
  }, [user]);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const loadSales = async () => {
    try {
      setLoading(true);
      let salesQuery;

      if (user?.isAdmin) {
        salesQuery = query(
          collection(db, 'sales'),
          orderBy('date', 'desc')
        );
      } else if (user?.centerId) {
        // استعلام بدون orderBy لتجنب الحاجة إلى فهرس مركب ثم فرز محلي
        salesQuery = query(
          collection(db, 'sales'),
          where('centerId', '==', user.centerId)
        );
      } else {
        setSales([]);
        return;
      }

      const snapshot = await getDocs(salesQuery);
      let salesData: Sale[] = [];
      snapshot.forEach(d => {
        salesData.push({ id: d.id, ...d.data() } as Sale);
      });
      // فرز محلي إذا لم نستخدم orderBy في الاستعلام
      salesData.sort((a, b) => {
        const da = (a.date as any)?.toDate ? (a.date as any).toDate() : new Date(a.date);
        const dbb = (b.date as any)?.toDate ? (b.date as any).toDate() : new Date(b.date);
        return dbb.getTime() - da.getTime();
      });
      setSales(salesData);
    } catch (error: any) {
      console.error('Error loading sales:', error);
      const needsIndex = error?.message?.includes('index') || error?.code === 'failed-precondition';
      showNotification(needsIndex ? 'مطلوب فهرس في Firestore، سيتم استخدام فرز محلي لاحقاً' : 'خطأ في تحميل المبيعات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadInventoryItems = async () => {
    try {
      let items: InventoryItem[] = [];

      if (!user) {
        console.log('لا يوجد مستخدم مسجل دخول');
        return;
      }

      // احصل على جميع المراكز (للأدمن أو لتسمية مركز المستخدم فقط)
      const centersMap: Record<string, string> = {};
      const centersSnapshot = await getDocs(collection(db, 'centers'));
      centersSnapshot.forEach(c => {
        const data: any = c.data();
        centersMap[c.id] = data.name || 'مركز غير معروف';
      });

      console.log('=== تشخيص تحميل المخزون ===');
      console.log('المستخدم:', user?.email, 'نوع:', user?.isAdmin ? 'أدمن' : 'مركز');
      console.log('تم العثور على', centersSnapshot.size, 'مراكز');
      console.log('أسماء المراكز:', Object.values(centersMap));

      if (user?.isAdmin) {
        console.log('تحميل المخزون للأدمن من جميع المراكز');
        for (const centerDoc of centersSnapshot.docs) {
          console.log(`\n--- فحص المركز: ${centerDoc.id} (${centersMap[centerDoc.id]}) ---`);
          
          const inventorySnapshot = await getDocs(
            collection(db, 'centers', centerDoc.id, 'inventory')
          );
          console.log(`عدد العناصر في هذا المركز: ${inventorySnapshot.size}`);
          
          inventorySnapshot.forEach(inv => {
            const data: any = inv.data();
            console.log(`العنصر: ${data.name}, الكمية: ${data.quantity}, centerId في البيانات: ${data.centerId}`);
            items.push({ 
              id: inv.id, 
              ...data, 
              centerId: centerDoc.id, // تأكد من إضافة centerId الصحيح
              centerName: centersMap[centerDoc.id] 
            } as InventoryItem);
          });
        }
      } else if (user?.centerId) {
        console.log('تحميل المخزون لمركز:', user.centerId);
        const inventorySnapshot = await getDocs(
          collection(db, 'centers', user.centerId, 'inventory')
        );
        console.log(`المركز ${user.centerId}: ${inventorySnapshot.size} عناصر`);
        inventorySnapshot.forEach(inv => {
          const data: any = inv.data();
          console.log(`العنصر: ${data.name}, الكمية: ${data.quantity}, centerId في البيانات: ${data.centerId}`);
          items.push({ 
            id: inv.id, 
            ...data, 
            centerId: user.centerId!, // تأكد من إضافة centerId الصحيح
            centerName: centersMap[user.centerId!] 
          } as InventoryItem);
        });
      }

      console.log('\n=== ملخص النتائج ===');
      console.log('إجمالي العناصر المحملة:', items.length);
      
      // عرض تفاصيل كل عنصر
      items.forEach((item, index) => {
        console.log(`${index + 1}. العنصر: ${item.name}, الكمية: ${item.quantity}, المركز: ${item.centerName}, centerId: ${item.centerId}`);
      });

      // صف وترتيب حسب اسم المركز ثم اسم المنتج لتسهيل الاختيار
      const filteredItems = items.filter(i => i.quantity > 0);
      console.log('العناصر بعد فلترة الكمية (> 0):', filteredItems.length);
      
      const sortedItems = filteredItems.sort((a, b) => 
        `${a.centerName}-${a.name}`.localeCompare(`${b.centerName}-${b.name}`, 'ar')
      );

      setInventoryItems(sortedItems);
    } catch (error) {
      console.error('Error loading inventory:', error);
      showNotification('خطأ في تحميل المخزون: ' + (error as any).message, 'error');
    }
  };

  const loadCustomers = async () => {
    try {
      let customersData: Customer[] = [];
      
      if (user?.isAdmin) {
        const centersSnapshot = await getDocs(collection(db, 'centers'));
        for (const centerDoc of centersSnapshot.docs) {
          const customersSnapshot = await getDocs(
            collection(db, 'centers', centerDoc.id, 'customers')
          );
          customersSnapshot.forEach(doc => {
            const data = doc.data();
            customersData.push({
              id: doc.id,
              ...data,
              centerId: centerDoc.id,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date()
            } as Customer);
          });
        }
      } else if (user?.centerId) {
        const customersSnapshot = await getDocs(
          collection(db, 'centers', user.centerId, 'customers')
        );
        customersSnapshot.forEach(doc => {
          const data = doc.data();
          customersData.push({
            id: doc.id,
            ...data,
            centerId: user.centerId,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          } as Customer);
        });
      }
      
      setCustomers(customersData);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const handleItemSelect = (itemId: string) => {
    const selectedItem = inventoryItems.find(item => item.id === itemId);
    if (selectedItem) {
      setNewSale(prev => ({
        ...prev,
        itemId,
        itemName: selectedItem.name,
        unitPrice: selectedItem.price,
        totalPrice: prev.quantity * selectedItem.price
      }));
    }
  };

  const handleQuantityChange = (quantity: number) => {
    setNewSale(prev => ({
      ...prev,
      quantity,
      totalPrice: quantity * prev.unitPrice
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newSale.itemId || !newSale.customerName || !newSale.customerPhone) {
      showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
      return;
    }

    const selectedItem = inventoryItems.find(item => item.id === newSale.itemId);
    if (!selectedItem) {
      showNotification('المنتج غير موجود', 'error');
      return;
    }

    if (newSale.quantity > selectedItem.quantity) {
      showNotification('الكمية المطلوبة أكبر من المتوفرة في المخزون', 'error');
      return;
    }

    try {
      setLoading(true);

      // إضافة المبيعة
      const saleData = {
        ...newSale,
        centerId: user?.centerId || selectedItem.centerId,
        centerName: user?.centerName || '',
        date: new Date(),
        createdBy: user?.email || '',
        createdAt: new Date()
      };

      await addDoc(collection(db, 'sales'), saleData);

      // تحديث كمية المنتج في المخزون
      const newQuantity = selectedItem.quantity - newSale.quantity;
      await updateDoc(
        doc(db, 'centers', selectedItem.centerId, 'inventory', selectedItem.id),
        {
          quantity: newQuantity,
          updatedAt: new Date()
        }
      );

      showNotification('تم إضافة المبيعة بنجاح', 'success');
      setShowAddForm(false);
      resetForm();
      loadSales();
      loadInventoryItems();
    } catch (error) {
      console.error('Error adding sale:', error);
      showNotification('خطأ في إضافة عملية البيع', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNewSale({
      itemId: '',
      itemName: '',
      quantity: 1,
      customerName: '',
      customerPhone: '',
      customerId: '',
      unitPrice: 0,
      totalPrice: 0,
      note: ''
    });
  };

  const selectCustomer = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setNewSale(prev => ({
        ...prev,
        customerId: customerId,
        customerName: customer.name,
        customerPhone: customer.phoneNumber
      }));
    }
  };

  const formatDate = (date: any) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('ar-EG');
  };

  const formatCurrency = (amount: number) => {
    // استخدام كود عملة صالح (يمكن تغييره لاحقاً) مع fallback لمنع تعطل الواجهة
    const validCurrency = 'E.P'; // TODO: عدل إلى العملة المطلوبة رسمياً (مثال: 'SDG', 'SAR', 'EGP')
    try {
      return new Intl.NumberFormat('ar-EG', {
        style: 'currency',
        currency: validCurrency
      }).format(amount);
    } catch {
      // في حال أي خطأ (كود عملة غير مدعوم) نرجع رقم بسيط منسق
      return amount.toFixed(2) + ' ' + validCurrency;
    }
  };

  const getTotalSales = () => {
    return sales.reduce((sum, sale) => sum + sale.totalPrice, 0);
  };

  return (
    <div className="sales-management">
      <div className="sales-header">
        <div className="header-content">
          <h2>
            <i className="fas fa-shopping-cart"></i>
            إدارة المبيعات
          </h2>
          <div className="header-actions">
            <button 
              className="btn-primary"
              onClick={() => {
                setShowAddForm(true);
                loadInventoryItems(); // تحديث المخزون عند فتح النموذج
              }}
            >
              <i className="fas fa-plus"></i>
              إضافة بيع جديد
            </button>
            <button 
              className="btn-secondary"
              onClick={loadSales}
              disabled={loading}
            >
              <i className="fas fa-sync-alt"></i>
              تحديث المبيعات
            </button>
            <button 
              className="btn-secondary"
              onClick={loadInventoryItems}
              disabled={loading}
            >
              <i className="fas fa-boxes"></i>
              تحديث المخزون
            </button>
          </div>
        </div>
      </div>

      {/* إحصائيات سريعة */}
      <div className="sales-stats">
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-shopping-bag"></i>
          </div>
          <div className="stat-info">
            <h3>{sales.length}</h3>
            <p>إجمالي المبيعات</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-money-bill-wave"></i>
          </div>
          <div className="stat-info">
            <h3>{formatCurrency(getTotalSales())}</h3>
            <p>إجمالي الإيرادات</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-boxes"></i>
          </div>
          <div className="stat-info">
            <h3>{inventoryItems.length}</h3>
            <p>المنتجات المتوفرة</p>
          </div>
        </div>
      </div>

      {/* نموذج إضافة مبيعة */}
      {showAddForm && (
        <div className="modal-overlay">
          <div className="add-sale-modal">
            <div className="modal-header">
              <h3>
                <i className="fas fa-plus-circle"></i>
                إضافة مبيعة جديدة
              </h3>
              <button 
                className="close-btn"
                onClick={() => setShowAddForm(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="sale-form">
              <div className="form-row">
                <div className="form-group">
                  <label>المنتج *</label>
                  <select
                    value={newSale.itemId}
                    onChange={(e) => handleItemSelect(e.target.value)}
                    required
                  >
                    <option value="">
                      {inventoryItems.length === 0 ? 'لا توجد منتجات متوفرة' : 'اختر المنتج'}
                    </option>
                    {inventoryItems.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} | {item.centerName || 'مركز'} | متوفر: {item.quantity} | {formatCurrency(item.price)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>الكمية *</label>
                  <input
                    type="number"
                    min="1"
                    max={inventoryItems.find(item => item.id === newSale.itemId)?.quantity || 1}
                    value={newSale.quantity}
                    onChange={(e) => handleQuantityChange(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>اختيار عميل موجود</label>
                  <select 
                    value={newSale.customerId || ''}
                    onChange={(e) => selectCustomer(e.target.value)}
                  >
                    <option value="">عميل جديد</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} - {customer.phoneNumber}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>اسم العميل *</label>
                  <input
                    type="text"
                    value={newSale.customerName}
                    onChange={(e) => setNewSale(prev => ({ ...prev, customerName: e.target.value }))}
                    placeholder="أدخل اسم العميل"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>رقم الهاتف *</label>
                  <input
                    type="tel"
                    value={newSale.customerPhone}
                    onChange={(e) => setNewSale(prev => ({ ...prev, customerPhone: e.target.value }))}
                    placeholder="05xxxxxxxx"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>سعر الوحدة</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newSale.unitPrice}
                    readOnly
                    className="readonly-input"
                  />
                </div>

                <div className="form-group">
                  <label>الإجمالي</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newSale.totalPrice}
                    readOnly
                    className="readonly-input total-price"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>ملاحظات</label>
                <textarea
                  value={newSale.note}
                  onChange={(e) => setNewSale(prev => ({ ...prev, note: e.target.value }))}
                  placeholder="ملاحظات إضافية (اختياري)"
                  rows={3}
                />
              </div>

              <div className="form-actions">
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save"></i>
                      حفظ المبيعة
                    </>
                  )}
                </button>
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => setShowAddForm(false)}
                >
                  <i className="fas fa-times"></i>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* قائمة المبيعات */}
      <div className="sales-list">
        <div className="list-header">
          <h3>
            <i className="fas fa-list"></i>
            قائمة المبيعات
          </h3>
        </div>

        {loading ? (
          <div className="loading-state">
            <i className="fas fa-spinner fa-spin"></i>
            جاري التحميل...
          </div>
        ) : sales.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-shopping-cart"></i>
            <h3>لا توجد مبيعات</h3>
            <p>ابدأ بإضافة أول مبيعة</p>
          </div>
        ) : (
          <div className="sales-table">
            <table>
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>المنتج</th>
                  <th>الكمية</th>
                  <th>العميل</th>
                  <th>رقم الهاتف</th>
                  <th>الإجمالي</th>
                  {user?.isAdmin && <th>المركز</th>}
                  <th>ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {sales.map(sale => (
                  <tr key={sale.id}>
                    <td>{formatDate(sale.date)}</td>
                    <td>
                      <div className="item-info">
                        <strong>{sale.itemName}</strong>
                        <small>
                          {sale.centerName && (
                            <span style={{ display: 'inline-block', marginLeft: 4 }}>
                              ({sale.centerName})
                            </span>
                          )}
                          {' '}{formatCurrency(sale.totalPrice / sale.quantity)} للوحدة
                        </small>
                      </div>
                    </td>
                    <td>
                      <span className="quantity-badge">{sale.quantity}</span>
                    </td>
                    <td>{sale.customerName}</td>
                    <td>{sale.customerPhone}</td>
                    <td>
                      <span className="price-value">{formatCurrency(sale.totalPrice)}</span>
                    </td>
                    {user?.isAdmin && (
                      <td>{sale.centerName || 'غير محدد'}</td>
                    )}
                    <td>{sale.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {notification && (
        <div className={`notification ${notification.type}`}>
          <i className={`fas ${notification.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
          {notification.message}
        </div>
      )}
    </div>
  );
};

export default SalesManagement;
