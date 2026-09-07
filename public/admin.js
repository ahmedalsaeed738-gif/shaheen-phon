document.addEventListener('DOMContentLoaded', () => {
  loadAdminProducts();
  loadOrders();
});

async function loadAdminProducts() {
  try {
    const res = await fetch('/api/products');
    const products = await res.json();
    const grid = document.getElementById('adminProductsGrid');
    grid.innerHTML = '';

    if (!products || products.length === 0) {
      grid.innerHTML = '<p>لا توجد منتجات حتى الآن.</p>';
      return;
    }

    products.forEach(p => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.innerHTML = `
        <img src="${p.image_url || 'https://via.placeholder.com/200'}" alt="${p.name}">
        <h3>${p.name}</h3>
        <div class="price">${p.price} جنيه</div>
        <button class="btn-primary" style="background:#d9534f; border-color:#d43f3a;" onclick="deleteProduct(${p.id})">حذف المنتج</button>
      `;
      grid.appendChild(card);
    });
  } catch (err) {
    console.error('خطأ في تحميل المنتجات:', err);
  }
}

async function handleAddProduct(e) {
  e.preventDefault();
  const name = document.getElementById('prodName').value;
  const price = document.getElementById('prodPrice').value;
  const image_url = document.getElementById('prodImage').value;

  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, price, image_url })
    });

    if (res.ok) {
      alert('تم إضافة المنتج بنجاح');
      document.getElementById('addProductForm').reset();
      loadAdminProducts();
    }
  } catch (err) {
    console.error('خطأ في الإضافة:', err);
  }
}

async function deleteProduct(id) {
  if (!confirm('هل أنت تأكد من حذف هذا المنتج؟')) return;
  try {
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (res.ok) {
      loadAdminProducts();
    }
  } catch (err) {
    console.error('خطأ في الحذف:', err);
  }
}

async function loadOrders() {
  try {
    const res = await fetch('/api/orders');
    const orders = await res.json();
    const list = document.getElementById('ordersList');
    list.innerHTML = '';

    if (!orders || orders.length === 0) {
      list.innerHTML = '<p>لا توجد طلبات جديدة.</p>';
      return;
    }

    orders.forEach(o => {
      const card = document.createElement('div');
      card.className = 'order-card';
      card.innerHTML = `
        <h4>طلب رقم #${o.id} - العميل: ${o.customer_name}</h4>
        <p>📱 الهاتف: ${o.customer_phone}</p>
        <p>📍 العنوان: ${o.customer_address}</p>
        <p>📝 ملاحظات: ${o.notes || 'لا يوجد'}</p>
      `;
      list.appendChild(card);
    });
  } catch (err) {
    console.error('خطأ في تحميل الطلبات:', err);
  }
}