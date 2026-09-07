let adminProducts = [];

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadAdminProducts();
  loadOrders();
});

// تحويل الملف المرفوع لترميز Base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

async function loadSettings() {
  try {
    const res = await fetch('/api/settings');
    const settings = await res.json();
    if (settings.store_name) {
      document.getElementById('settingStoreName').value = settings.store_name;
    }
  } catch (err) {
    console.error(err);
  }
}

async function handleSaveSettings(e) {
  e.preventDefault();
  const store_name = document.getElementById('settingStoreName').value;
  const bannerFile = document.getElementById('settingBannerFile').files[0];

  let banner_url = null;
  if (bannerFile) {
    banner_url = await fileToBase64(bannerFile);
  }

  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ store_name, banner_url })
    });

    if (res.ok) {
      alert('تم حفظ إعدادات المتجر بنجاح!');
    }
  } catch (err) {
    console.error(err);
  }
}

async function loadAdminProducts() {
  try {
    const res = await fetch('/api/products');
    adminProducts = await res.json();
    const grid = document.getElementById('adminProductsGrid');
    grid.innerHTML = '';

    if (!adminProducts || adminProducts.length === 0) {
      grid.innerHTML = '<p>لا توجد منتجات حتى الآن.</p>';
      return;
    }

    adminProducts.forEach(p => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.innerHTML = `
        <img src="${p.image_url || 'https://via.placeholder.com/200'}" alt="${p.name}">
        <span class="category-badge">${p.category || 'عام'}</span>
        <h3>${p.name}</h3>
        <div class="price">${p.price} جنيه</div>
        <button class="btn-primary" style="background:#0275d8; border-color:#0267bf; margin-bottom:5px;" onclick="editProduct(${p.id})">تعديل المنتج ✏️</button>
        <button class="btn-primary" style="background:#d9534f; border-color:#d43f3a;" onclick="deleteProduct(${p.id})">حذف المنتج 🗑️</button>
      `;
      grid.appendChild(card);
    });
  } catch (err) {
    console.error(err);
  }
}

async function handleSaveProduct(e) {
  e.preventDefault();
  const id = document.getElementById('editProductId').value;
  const name = document.getElementById('prodName').value;
  const price = document.getElementById('prodPrice').value;
  const category = document.getElementById('prodCategory').value;
  const description = document.getElementById('prodDesc').value;
  const imageFile = document.getElementById('prodImageFile').files[0];

  let image_url = null;
  if (imageFile) {
    image_url = await fileToBase64(imageFile);
  }

  const payload = { name, price, category, description, image_url };

  try {
    let res;
    if (id) {
      res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    if (res.ok) {
      alert(id ? 'تم تعديل المنتج بنجاح!' : 'تم إضافة المنتج بنجاح!');
      resetProductForm();
      loadAdminProducts();
    }
  } catch (err) {
    console.error(err);
  }
}

function editProduct(id) {
  const p = adminProducts.find(item => item.id === id);
  if (!p) return;

  document.getElementById('editProductId').value = p.id;
  document.getElementById('prodName').value = p.name;
  document.getElementById('prodPrice').value = p.price;
  document.getElementById('prodCategory').value = p.category || 'عام';
  document.getElementById('prodDesc').value = p.description || '';

  document.getElementById('formTitle').innerText = '✏️ تعديل المنتج';
  document.getElementById('saveProdBtn').innerText = 'تحديث المنتج';
  document.getElementById('cancelEditBtn').style.display = 'block';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetProductForm() {
  document.getElementById('productForm').reset();
  document.getElementById('editProductId').value = '';
  document.getElementById('formTitle').innerText = '➕ إضافة منتج جديد';
  document.getElementById('saveProdBtn').innerText = 'حفظ المنتج';
  document.getElementById('cancelEditBtn').style.display = 'none';
}

async function deleteProduct(id) {
  if (!confirm('هل أنت تأكد من حذف هذا المنتج؟')) return;
  try {
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (res.ok) {
      loadAdminProducts();
    }
  } catch (err) {
    console.error(err);
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
    console.error(err);
  }
}