let adminProducts = [];

document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('shaheen_admin_logged') === 'true') {
    showAdminDashboard();
  }
});

function handleLogin(e) {
  e.preventDefault();
  const u = document.getElementById('adminUser').value;
  const p = document.getElementById('adminPass').value;

  if (u === 'shaheen-phon' && p === 'shaheen-1983') {
    localStorage.setItem('shaheen_admin_logged', 'true');
    showAdminDashboard();
  } else {
    alert('اسم المستخدم أو كلمة السر غير صحيحة!');
  }
}

function showAdminDashboard() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminMainContent').style.display = 'block';
  loadSettings();
  loadAdminProducts();
  loadOrders();
}

function logoutAdmin() {
  localStorage.removeItem('shaheen_admin_logged');
  location.reload();
}

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
    if (settings.store_name) document.getElementById('settingStoreName').value = settings.store_name;
  } catch (err) { console.error(err); }
}

async function handleSaveSettings(e) {
  e.preventDefault();
  const store_name = document.getElementById('settingStoreName').value;
  const bannerFile = document.getElementById('settingBannerFile').files[0];

  let banner_url = null;
  if (bannerFile) banner_url = await fileToBase64(bannerFile);

  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ store_name, banner_url })
    });
    if (res.ok) alert('تم حفظ إعدادات المتجر بنجاح!');
  } catch (err) { console.error(err); }
}

async function loadAdminProducts() {
  try {
    const res = await fetch('/api/products');
    adminProducts = await res.json();
    const grid = document.getElementById('adminProductsGrid');
    grid.innerHTML = '';

    adminProducts.forEach(p => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.innerHTML = `
        <img src="${p.image_url || 'https://via.placeholder.com/200'}" alt="${p.name}">
        <span class="category-badge">${p.category || 'عام'}</span>
        <h3>${p.name}</h3>
        <div class="price">${p.price} جنيه</div>
        <div class="stock-tag">المخزون: ${p.stock ?? 1} قطعة</div>
        <button class="btn-primary" style="background:#0275d8; margin-bottom:5px;" onclick="editProduct(${p.id})">تعديل ✏️</button>
        <button class="btn-primary" style="background:#d9534f;" onclick="deleteProduct(${p.id})">حذف 🗑️</button>
      `;
      grid.appendChild(card);
    });
  } catch (err) { console.error(err); }
}

async function handleSaveProduct(e) {
  e.preventDefault();
  const id = document.getElementById('editProductId').value;
  const name = document.getElementById('prodName').value;
  const price = document.getElementById('prodPrice').value;
  const stock = document.getElementById('prodStock').value;
  const category = document.getElementById('prodCategory').value;
  const description = document.getElementById('prodDesc').value;
  const imageFile = document.getElementById('prodImageFile').files[0];

  let image_url = null;
  if (imageFile) image_url = await fileToBase64(imageFile);

  const payload = { name, price, stock, category, description, image_url };

  try {
    let res = id 
      ? await fetch(`/api/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      : await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

    if (res.ok) {
      alert(id ? 'تم تعديل المنتج!' : 'تم إضافة المنتج!');
      resetProductForm();
      loadAdminProducts();
    }
  } catch (err) { console.error(err); }
}

function editProduct(id) {
  const p = adminProducts.find(item => item.id === id);
  if (!p) return;

  document.getElementById('editProductId').value = p.id;
  document.getElementById('prodName').value = p.name;
  document.getElementById('prodPrice').value = p.price;
  document.getElementById('prodStock').value = p.stock ?? 1;
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
  if (!confirm('هل تأكدت من حذف هذا المنتج؟')) return;
  try {
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (res.ok) loadAdminProducts();
  } catch (err) { console.error(err); }
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
        <label>تحديث حالة الطلب: </label>
        <select onchange="updateOrderStatus(${o.id}, this.value)">
          <option value="قيد الانتظار" ${o.status === 'قيد الانتظار' ? 'selected' : ''}>قيد الانتظار</option>
          <option value="تم الشحن" ${o.status === 'تم الشحن' ? 'selected' : ''}>تم الشحن</option>
          <option value="تم التسليم" ${o.status === 'تم التسليم' ? 'selected' : ''}>تم التسليم</option>
        </select>
      `;
      list.appendChild(card);
    });
  } catch (err) { console.error(err); }
}

async function updateOrderStatus(id, status) {
  try {
    await fetch(`/api/orders/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    alert('تم تحديث حالة الطلب بنجاح');
  } catch (err) { console.error(err); }
}