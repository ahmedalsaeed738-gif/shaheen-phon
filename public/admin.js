document.addEventListener('DOMContentLoaded', () => {
  loadAdminProducts();
  loadAdminOrders();
});

async function loadAdminProducts() {
  try {
    const res = await fetch('/api/products');
    const products = await res.json();
    const list = document.getElementById('adminProductsList');
    list.innerHTML = '';

    products.forEach(p => {
      const item = document.createElement('div');
      item.className = 'admin-item';
      item.innerHTML = `
        <div>
          <strong>${p.name}</strong> (${p.category}) - ${p.price} جنيه
        </div>
        <button class="btn-delete" onclick="deleteProduct(${p.id})">حذف</button>
      `;
      list.appendChild(item);
    });
  } catch (err) {
    console.error('خطأ في تحميل المنتجات:', err);
  }
}

async function handleAddProduct(e) {
  e.preventDefault();
  const productData = {
    name: document.getElementById('prodName').value,
    price: document.getElementById('prodPrice').value,
    category: document.getElementById('prodCategory').value,
    image_url: document.getElementById('prodImage').value
  };

  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });

    if (res.ok) {
      alert('تمت إضافة المنتج بنجاح!');
      document.getElementById('addProductForm').reset();
      loadAdminProducts();
    } else {
      alert('حدث خطأ أثناء إضافة المنتج.');
    }
  } catch (err) {
    console.error('خطأ في إضافة المنتج:', err);
  }
}

async function deleteProduct(id) {
  if (!confirm('هل أنت تأكد من حذف هذا المنتج؟')) return;
  try {
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    loadAdminProducts();
  } catch (err) {
    console.error('خطأ في الحذف:', err);
  }
}

async function loadAdminOrders() {
  try {
    const res = await fetch('/api/orders');
    const orders = await res.json();
    const list = document.getElementById('adminOrdersList');
    list.innerHTML = '';

    if (orders.length === 0) {
      list.innerHTML = '<p>لا توجد طلبات واردة حالياً.</p>';
      return;
    }

    orders.forEach(o => {
      const card = document.createElement('div');
      card.className = 'order-card';
      const itemsHtml = o.items.map(i => `${i.name} (${i.qty})`).join(', ');

      card.innerHTML = `
        <h3>طلب رقم #${o.id} - ${o.customer_name}</h3>
        <p><strong>الهاتف:</strong> ${o.customer_phone}</p>
        <p><strong>العنوان:</strong> ${o.customer_address}</p>
        <p><strong>المنتجات:</strong> ${itemsHtml}</p>
        <p><strong>ملاحظات:</strong> ${o.notes || 'لا يوجد'}</p>
        <hr>
      `;
      list.appendChild(card);
    });
  } catch (err) {
    console.error('خطأ في تحميل الطلبات:', err);
  }
}