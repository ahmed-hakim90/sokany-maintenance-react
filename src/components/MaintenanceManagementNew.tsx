import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { MaintenanceRequest, InventoryItem, Technician, Customer, Center } from '../types';
import './MaintenanceManagementNew.css';

const MaintenanceManagementNew: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRequest, setEditingRequest] = useState<MaintenanceRequest | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  const [formData, setFormData] = useState({
    customerName: '',
    phoneNumber: '',
    deviceType: '',
    description: '',
    status: 'pending' as 'pending' | 'in-progress' | 'completed' | 'cancelled',
    centerId: user?.centerId || '',
    technicianId: '',
    customerId: '',
    isWarranty: false,
    notes: '',
    parts: [] as Array<{itemId: string, itemName: string, quantity: number, unitPrice: number}>
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadMaintenanceRequests(),
        loadInventoryItems(),
        loadTechnicians(),
        loadCustomers(),
        loadCenters()
      ]);
    } catch (error) {
      showNotification('حدث خطأ في تحميل البيانات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadMaintenanceRequests = async () => {
    try {
      let requestsData: MaintenanceRequest[] = [];
      
      if (user?.isAdmin) {
        // الأدمن يرى جميع الطلبات من جميع المراكز
        const centersSnapshot = await getDocs(collection(db, 'centers'));
        for (const centerDoc of centersSnapshot.docs) {
          const maintenanceSnapshot = await getDocs(
            collection(db, 'centers', centerDoc.id, 'maintenance')
          );
          maintenanceSnapshot.forEach(doc => {
            const data = doc.data();
            requestsData.push({
              id: doc.id,
              ...data,
              centerId: centerDoc.id,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
              completedAt: data.completedAt?.toDate()
            } as MaintenanceRequest);
          });
        }
      } else if (user?.centerId) {
        // مدير المركز يرى طلبات مركزه فقط
        const maintenanceSnapshot = await getDocs(
          collection(db, 'centers', user.centerId, 'maintenance')
        );
        maintenanceSnapshot.forEach(doc => {
          const data = doc.data();
          requestsData.push({
            id: doc.id,
            ...data,
            centerId: user.centerId,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            completedAt: data.completedAt?.toDate()
          } as MaintenanceRequest);
        });
      }
      
      setRequests(requestsData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    } catch (error) {
      console.error('Error loading maintenance requests:', error);
      showNotification('حدث خطأ في تحميل طلبات الصيانة', 'error');
    }
  };

  const loadInventoryItems = async () => {
    try {
      let items: InventoryItem[] = [];

      if (!user) {
        console.log('لا يوجد مستخدم مسجل دخول');
        return;
      }

      // احصل على خريطة أسماء المراكز
      const centersMap: Record<string, string> = {};
      const centersSnapshot = await getDocs(collection(db, 'centers'));
      centersSnapshot.forEach(c => {
        const data: any = c.data();
        centersMap[c.id] = data.name || 'مركز غير معروف';
      });

      console.log('=== تحميل المخزون للصيانة الجديدة ===');
      console.log('المستخدم:', user?.email, 'نوع:', user?.isAdmin ? 'أدمن' : 'مركز');
      console.log('تم العثور على', centersSnapshot.size, 'مراكز');

      if (user?.isAdmin) {
        console.log('تحميل المخزون للأدمن من جميع المراكز');
        for (const centerDoc of centersSnapshot.docs) {
          console.log(`\n--- فحص المركز: ${centerDoc.id} (${centersMap[centerDoc.id]}) ---`);
          
          const inventorySnapshot = await getDocs(
            collection(db, 'centers', centerDoc.id, 'inventory')
          );
          console.log(`عدد العناصر في هذا المركز: ${inventorySnapshot.size}`);
          
          inventorySnapshot.forEach(doc => {
            const data: any = doc.data();
            console.log(`العنصر: ${data.name}, الكمية: ${data.quantity}, centerId في البيانات: ${data.centerId}`);
            items.push({ 
              id: doc.id, 
              ...data, 
              centerId: centerDoc.id,
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
        inventorySnapshot.forEach(doc => {
          const data: any = doc.data();
          console.log(`العنصر: ${data.name}, الكمية: ${data.quantity}, centerId في البيانات: ${data.centerId}`);
          items.push({ 
            id: doc.id, 
            ...data, 
            centerId: user.centerId!, 
            centerName: centersMap[user.centerId!] 
          } as InventoryItem);
        });
      }

      console.log('\n=== ملخص النتائج (الصيانة الجديدة) ===');
      console.log('إجمالي العناصر المحملة:', items.length);
      
      const filteredItems = items.filter(item => item.quantity > 0);
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

  const loadTechnicians = async () => {
    try {
      let techniciansData: Technician[] = [];
      
      if (user?.isAdmin) {
        const centersSnapshot = await getDocs(collection(db, 'centers'));
        for (const centerDoc of centersSnapshot.docs) {
          const techniciansSnapshot = await getDocs(
            collection(db, 'centers', centerDoc.id, 'technicians')
          );
          techniciansSnapshot.forEach(doc => {
            const data = doc.data();
            techniciansData.push({
              id: doc.id,
              ...data,
              centerId: centerDoc.id,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date()
            } as Technician);
          });
        }
      } else if (user?.centerId) {
        const techniciansSnapshot = await getDocs(
          collection(db, 'centers', user.centerId, 'technicians')
        );
        techniciansSnapshot.forEach(doc => {
          const data = doc.data();
          techniciansData.push({
            id: doc.id,
            ...data,
            centerId: user.centerId,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          } as Technician);
        });
      }
      
      setTechnicians(techniciansData);
    } catch (error) {
      console.error('Error loading technicians:', error);
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

  const loadCenters = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'centers'));
      const centersData: Center[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        centersData.push({ 
          id: doc.id, 
          ...data,
          createdAt: data.createdAt?.toDate() || new Date()
        } as Center);
      });
      setCenters(centersData);
    } catch (error) {
      console.error('Error loading centers:', error);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!formData.customerName || !formData.deviceType || !formData.description || !formData.centerId) {
        showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
      }

      const requestData = {
        customerName: formData.customerName,
        phoneNumber: formData.phoneNumber,
        deviceType: formData.deviceType,
        description: formData.description,
        status: formData.status,
        centerId: formData.centerId,
        technicianId: formData.technicianId || null,
        technicianName: formData.technicianId ? 
          technicians.find(t => t.id === formData.technicianId)?.name : null,
        customerId: formData.customerId || null,
        isWarranty: formData.isWarranty,
        parts: formData.parts,
        notes: formData.notes,
        totalCost: formData.parts.reduce((sum, part) => sum + (part.quantity * part.unitPrice), 0),
        updatedAt: new Date()
      };

      if (editingRequest) {
        // تحديث طلب موجود
        await updateDoc(
          doc(db, 'centers', formData.centerId, 'maintenance', editingRequest.id), 
          {
            ...requestData,
            completedAt: formData.status === 'completed' ? new Date() : null
          }
        );
        showNotification('تم تحديث طلب الصيانة بنجاح', 'success');
      } else {
        // إضافة طلب جديد
        await addDoc(collection(db, 'centers', formData.centerId, 'maintenance'), {
          ...requestData,
          createdAt: new Date()
        });
        showNotification('تم إضافة طلب الصيانة بنجاح', 'success');
      }

      // خصم قطع الغيار إذا تم الإكمال
      if (formData.status === 'completed' && formData.parts.length > 0) {
        await deductInventoryParts(formData.parts, formData.centerId);
      }

      resetForm();
      loadMaintenanceRequests();
    } catch (error) {
      showNotification('حدث خطأ في حفظ البيانات', 'error');
      console.error('Error saving maintenance request:', error);
    }
  };

  const deductInventoryParts = async (parts: Array<{itemId: string, quantity: number}>, centerId: string) => {
    try {
      for (const part of parts) {
        const itemRef = doc(db, 'centers', centerId, 'inventory', part.itemId);
        const currentItem = inventoryItems.find(item => item.id === part.itemId);
        if (currentItem && currentItem.quantity >= part.quantity) {
          await updateDoc(itemRef, {
            quantity: currentItem.quantity - part.quantity,
            updatedAt: new Date()
          });
        }
      }
      loadInventoryItems(); // إعادة تحميل المخزون
    } catch (error) {
      console.error('Error deducting inventory parts:', error);
    }
  };

  const handleStatusChange = async (requestId: string, centerId: string, newStatus: string) => {
    try {
      const request = requests.find(r => r.id === requestId);
      if (!request) return;

      const updateData: any = {
        status: newStatus,
        updatedAt: new Date()
      };

      if (newStatus === 'completed') {
        updateData.completedAt = new Date();
        // خصم قطع الغيار عند الإكمال
        if (request.parts && request.parts.length > 0) {
          await deductInventoryParts(request.parts, centerId);
        }
      }

      await updateDoc(doc(db, 'centers', centerId, 'maintenance', requestId), updateData);
      showNotification('تم تحديث حالة الطلب بنجاح', 'success');
      loadMaintenanceRequests();
    } catch (error) {
      console.error('Error updating status:', error);
      showNotification('حدث خطأ في تحديث الحالة', 'error');
    }
  };

  const handleEdit = (request: MaintenanceRequest) => {
    setEditingRequest(request);
    setFormData({
      customerName: request.customerName,
      phoneNumber: request.phoneNumber || '',
      deviceType: request.deviceType,
      description: request.description,
      status: request.status,
      centerId: request.centerId,
      technicianId: request.technicianId || '',
      customerId: request.customerId || '',
      isWarranty: request.isWarranty || false,
      notes: request.notes || '',
      parts: request.parts || []
    });
    setShowAddForm(true);
  };

  const handleDelete = async (request: MaintenanceRequest) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الطلب؟')) {
      try {
        await deleteDoc(doc(db, 'centers', request.centerId, 'maintenance', request.id));
        showNotification('تم حذف طلب الصيانة بنجاح', 'success');
        loadMaintenanceRequests();
      } catch (error) {
        showNotification('حدث خطأ في حذف الطلب', 'error');
        console.error('Error deleting request:', error);
      }
    }
  };

  const addPart = () => {
    setFormData({
      ...formData,
      parts: [...formData.parts, { itemId: '', itemName: '', quantity: 1, unitPrice: 0 }]
    });
  };

  const removePart = (index: number) => {
    const newParts = formData.parts.filter((_, i) => i !== index);
    setFormData({ ...formData, parts: newParts });
  };

  const updatePart = (index: number, field: string, value: any) => {
    const newParts = [...formData.parts];
    (newParts[index] as any)[field] = value;
    
    if (field === 'itemId') {
      const selectedItem = inventoryItems.find(item => item.id === value);
      if (selectedItem) {
        newParts[index].itemName = selectedItem.name;
        newParts[index].unitPrice = selectedItem.price;
      }
    }
    
    setFormData({ ...formData, parts: newParts });
  };

  const resetForm = () => {
    setFormData({
      customerName: '',
      phoneNumber: '',
      deviceType: '',
      description: '',
      status: 'pending',
      centerId: user?.centerId || '',
      technicianId: '',
      customerId: '',
      isWarranty: false,
      notes: '',
      parts: []
    });
    setEditingRequest(null);
    setShowAddForm(false);
  };

  const getCenterName = (centerId: string) => {
    const center = centers.find(c => c.id === centerId);
    return center?.name || 'غير محدد';
  };

  const getTechnicianName = (technicianId: string) => {
    const technician = technicians.find(t => t.id === technicianId);
    return technician?.name || 'غير محدد';
  };

  const getCustomerName = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || 'غير محدد';
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'معلق';
      case 'in-progress': return 'قيد التنفيذ';
      case 'completed': return 'مكتمل';
      case 'cancelled': return 'ملغي';
      default: return status;
    }
  };

  const selectCustomer = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setFormData({
        ...formData,
        customerId: customerId,
        customerName: customer.name,
        phoneNumber: customer.phoneNumber
      });
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <i className="fas fa-spinner fa-spin"></i>
        <p>جاري تحميل طلبات الصيانة...</p>
      </div>
    );
  }

  return (
    <div className="maintenance-management-new">
      <div className="page-header">
        <h1>
          <i className="fas fa-tools"></i>
          إدارة طلبات الصيانة
        </h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddForm(true)}
        >
          <i className="fas fa-plus"></i>
          طلب صيانة جديد
        </button>
      </div>

      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      {showAddForm && (
        <div className="modal-overlay">
          <div className="modal maintenance-modal">
            <div className="modal-header">
              <h3>
                <i className="fas fa-wrench"></i>
                {editingRequest ? 'تعديل طلب الصيانة' : 'طلب صيانة جديد'}
              </h3>
              <button className="btn-close" onClick={resetForm}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-body">
              {/* معلومات العميل */}
              <div className="section">
                <h4>معلومات العميل</h4>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>اختيار عميل موجود</label>
                    <select 
                      value={formData.customerId}
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
                      value={formData.customerName}
                      onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                      placeholder="أدخل اسم العميل"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>رقم الهاتف</label>
                    <input
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                      placeholder="أدخل رقم الهاتف"
                    />
                  </div>
                </div>
              </div>

              {/* معلومات الجهاز */}
              <div className="section">
                <h4>معلومات الجهاز والصيانة</h4>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>نوع الجهاز *</label>
                    <input
                      type="text"
                      value={formData.deviceType}
                      onChange={(e) => setFormData({...formData, deviceType: e.target.value})}
                      placeholder="مثل: كمبيوتر، طابعة، هاتف"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>الحالة</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                    >
                      <option value="pending">معلق</option>
                      <option value="in-progress">قيد التنفيذ</option>
                      <option value="completed">مكتمل</option>
                      <option value="cancelled">ملغي</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>وصف المشكلة *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="اوصف المشكلة بالتفصيل"
                    rows={3}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>الفني المسؤول</label>
                    <select
                      value={formData.technicianId}
                      onChange={(e) => setFormData({...formData, technicianId: e.target.value})}
                    >
                      <option value="">اختر الفني</option>
                      {technicians.map(technician => (
                        <option key={technician.id} value={technician.id}>
                          {technician.name} - {getCenterName(technician.centerId)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>المركز</label>
                    <select
                      value={formData.centerId}
                      onChange={(e) => setFormData({...formData, centerId: e.target.value})}
                      required
                      disabled={!user?.isAdmin}
                    >
                      {!user?.isAdmin && user?.centerId && (
                        <option value={user.centerId}>
                          {getCenterName(user.centerId)}
                        </option>
                      )}
                      {user?.isAdmin && (
                        <>
                          <option value="">اختر المركز</option>
                          {centers.map(center => (
                            <option key={center.id} value={center.id}>
                              {center.name}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.isWarranty}
                        onChange={(e) => setFormData({...formData, isWarranty: e.target.checked})}
                      />
                      <span className="checkmark"></span>
                      الجهاز في فترة الضمان
                    </label>
                  </div>
                </div>
              </div>

              {/* قطع الغيار */}
              <div className="section">
                <h4>
                  قطع الغيار
                  <button type="button" className="btn btn-small" onClick={addPart}>
                    <i className="fas fa-plus"></i>
                    إضافة قطعة
                  </button>
                </h4>
                
                {formData.parts.map((part, index) => (
                  <div key={index} className="part-row">
                    <div className="form-row">
                      <div className="form-group">
                        <select
                          value={part.itemId}
                          onChange={(e) => updatePart(index, 'itemId', e.target.value)}
                        >
                          <option value="">اختر القطعة</option>
                          {inventoryItems.map(item => (
                            <option key={item.id} value={item.id}>
                              {item.name} - {item.centerName} (متوفر: {item.quantity})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <input
                          type="number"
                          placeholder="الكمية"
                          min="1"
                          value={part.quantity}
                          onChange={(e) => updatePart(index, 'quantity', parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div className="form-group">
                        <input
                          type="number"
                          placeholder="السعر"
                          min="0"
                          step="0.01"
                          value={part.unitPrice}
                          onChange={(e) => updatePart(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <button 
                        type="button" 
                        className="btn btn-danger btn-small"
                        onClick={() => removePart(index)}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* ملاحظات */}
              <div className="section">
                <div className="form-group">
                  <label>ملاحظات</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="أي ملاحظات إضافية"
                    rows={2}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-save"></i>
                  {editingRequest ? 'تحديث الطلب' : 'حفظ الطلب'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  <i className="fas fa-times"></i>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="requests-grid">
        {requests.length === 0 ? (
          <div className="no-data">
            <i className="fas fa-tools"></i>
            <p>لا توجد طلبات صيانة بعد</p>
          </div>
        ) : (
          requests.map(request => (
            <div key={request.id} className="request-card">
              <div className="card-header">
                <div className="request-info">
                  <h3>{request.customerName}</h3>
                  <span className="device-type">{request.deviceType}</span>
                  {request.isWarranty && (
                    <span className="warranty-badge">ضمان</span>
                  )}
                </div>
                <div className="card-actions">
                  <button 
                    className="btn-icon edit"
                    onClick={() => handleEdit(request)}
                    title="تعديل"
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button 
                    className="btn-icon delete"
                    onClick={() => handleDelete(request)}
                    title="حذف"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>

              <div className="card-body">
                <div className="info-grid">
                  <div className="info-item">
                    <span className="label">الوصف:</span>
                    <span className="value">{request.description}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">الحالة:</span>
                    <select
                      className={`status-select ${request.status}`}
                      value={request.status}
                      onChange={(e) => handleStatusChange(request.id, request.centerId, e.target.value)}
                    >
                      <option value="pending">معلق</option>
                      <option value="in-progress">قيد التنفيذ</option>
                      <option value="completed">مكتمل</option>
                      <option value="cancelled">ملغي</option>
                    </select>
                  </div>
                  <div className="info-item">
                    <span className="label">الفني:</span>
                    <span className="value">
                      {request.technicianName || 'غير محدد'}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="label">المركز:</span>
                    <span className="value">{getCenterName(request.centerId)}</span>
                  </div>
                  {request.phoneNumber && (
                    <div className="info-item">
                      <span className="label">الهاتف:</span>
                      <span className="value">{request.phoneNumber}</span>
                    </div>
                  )}
                  {request.totalCost && request.totalCost > 0 && (
                    <div className="info-item">
                      <span className="label">التكلفة:</span>
                      <span className="value">{request.totalCost} جنيه</span>
                    </div>
                  )}
                </div>

                {request.parts && request.parts.length > 0 && (
                  <div className="parts-section">
                    <h4>قطع الغيار المستخدمة:</h4>
                    <ul className="parts-list">
                      {request.parts.map((part, index) => (
                        <li key={index}>
                          {part.itemName} - الكمية: {part.quantity} - السعر: {part.unitPrice} جنيه
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="timestamps">
                  <small>تاريخ الطلب: {request.createdAt.toLocaleDateString('ar-EG')}</small>
                  {request.completedAt && (
                    <small>تاريخ الإكمال: {request.completedAt.toLocaleDateString('ar-EG')}</small>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MaintenanceManagementNew;
