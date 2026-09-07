let allProducts = [];
let cart = [];
let productQuantities = {}; // لتخزين الكمية المحددة لكل منتج في الكارت الخارجي

document.addEventListener('DOMContentLoaded', () => {
  loadStoreSettings();
  fetchProducts();
});

async function loadStoreSettings() {
  try {
    const res = await fetch('/api/settings');
    const settings = await res.json();
    if (settings.store_name) document.getElementById('storeName').innerText = settings.store_name;
    if (settings.banner_url) document.getElementById('storeBanner').src = settings.banner_url;
  } catch (err) { console.error(err); }
}

async function fetchProducts() {
  try {
    const res = await fetch('/api/products');
    allProducts = await res.json();
    allProducts.forEach(p => { productQuantities[p.id] = 1; });
    displayProducts(allProducts);
  } catch (err) { console.error(err); }
}

function displayProducts(products) {
  const grid = document.getElementById('productsGrid');
  grid.innerHTML = '';

  if (!products || products.length === 0) {
    grid.innerHTML = '<p>لا توجد منتجات مطابقة.</p>';
    return;
  }

  products.forEach(p => {
    const card = document.createElement('div');
    card.className = 'product-card';
    const currentQty = productQuantities[p.id] || 1;

    card.innerHTML = `
      <img src="${p.image_url || 'https://via.placeholder.com/200'}" alt="${p.name}" onclick="openProductModal(${p.id})">
      <span class="category-badge">${p.category || 'عام'}</span>
      <h3 onclick="openProductModal(${p.id})" style="cursor:pointer">${p.name}</h3>
      <div class="price">${p.price} جنيه</div>
      <div class="stock-tag">المخزون المتوفر: ${p.stock ?? 1}</div>
      
      <!-- أزرار زيادة ونقصان الكمية مباشرة من الخارج -->
      <div style="margin: 10px 0; display:flex; justify-content:center; align-items:center; gap:10px;">
        <button class="qty-btn" onclick="updateOuterQty(${p.id}, -1)">-</button>
        <span id="outerQty_${p.id}" style="font-weight:bold; font-size:16px;">${currentQty}</span>
        <button class="qty-btn" onclick="updateOuterQty(${p.id}, 1, ${p.stock ?? 1})">+</button>
      </div>

      <button class="btn-primary" onclick="addToCartFromOuter(${p.id})">إضافة للسلة 🛒</button>
    `;
    grid.appendChild(card);
  });
}

function updateOuterQty(id, delta, maxStock) {
  if (!productQuantities[id]) productQuantities[id] = 1;
  productQuantities[id] += delta;
  
  if (productQuantities[id] < 1) productQuantities[id] = 1;
  if (maxStock && productQuantities[id] > maxStock) {
    alert('عذراً، التحديد يتجاوز الكمية المتاحة بالمخزن!');
    productQuantities[id] = maxStock;
  }
  
  const span = document.getElementById(`outerQty_${id}`);
  if (span) span.innerText = productQuantities[id];
}

function addToCartFromOuter(id) {
  const p = allProducts.find(item => item.id === id);
  if (!p) return;
  const qty = productQuantities[id] || 1;
  addToCart(p.id, p.name, p.price, p.stock ?? 1, qty);
  alert(`تم إضافة ${qty} قطعة من (${p.name}) للسلة!`);
}

function filterProducts() {
  const searchVal = document.getElementById('searchInput').value.toLowerCase();
  const catVal = document.getElementById('categoryFilter').value;

  const filtered = allProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchVal);
    const matchesCat = (catVal === 'الكل') || (p.category === catVal);
    return matchesSearch && matchesCat;
  });

  displayProducts(filtered);
}

function openProductModal(id) {
  const p = allProducts.find(item => item.id === id);
  if (!p) return;

  const body = document.getElementById('productModalBody');
  body.innerHTML = `
    <img src="${p.image_url || 'https://via.placeholder.com/200'}" style="width:100%; max-height:250px; object-fit:contain; border-radius:8px;">
    <h2>${p.name}</h2>
    <span class="category-badge">${p.category || 'عام'}</span>
    <h3 style="color:#B12704;">${p.price} جنيه</h3>
    <p><strong>المخزون المتاح:</strong> ${p.stock ?? 1} قطعة</p>
    <p style="margin-top:15px; line-height:1.6;">${p.description || 'لا يوجد وصف لهذا المنتج.'}</p>

    <button class="btn-primary" onclick="addToCartFromOuter(${p.id}); closeModal('productDetailModal');">إضافة للسلة 🛒</button>
    <button class="btn-primary" style="background:#6c757d; border-color:#6c757d; margin-top:8px;" onclick="closeModal('productDetailModal')">الرجوع للمتجر ↩️</button>
  `;

  document.getElementById('productDetailModal').style.display = 'flex';
}

function addToCart(id, name, price, maxStock, qtyToAdd = 1) {
  const existing = cart.find(item => item.id === id);
  if (existing) {
    if (existing.qty + qtyToAdd > maxStock) {
      alert('الكمية المطلوبة تتجاوز المخزون المتاح!');
      return;
    }
    existing.qty += qtyToAdd;
  } else {
    if (qtyToAdd > maxStock) {
      alert('الكمية المطلوبة تتجاوز المخزون المتاح!');
      return;
    }
    cart.push({ id, name, price, qty: qtyToAdd, maxStock });
  }
  updateCartUI();
}

function changeCartQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;

  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter(i => i.id !== id);
  } else if (item.qty > item.maxStock) {
    alert('وصلت للحد الأقصى للمخزون المتاح');
    item.qty = item.maxStock;
  }
  updateCartUI();
}

function updateCartUI() {
  document.getElementById('cartCount').innerText = cart.reduce((s, i) => s + i.qty, 0);
  const cartItemsDiv = document.getElementById('cartItems');

  if (cart.length === 0) {
    cartItemsDiv.innerHTML = '<p>السلة فارغة.</p>';
    return;
  }

  let html = '<div>';
  let total = 0;
  cart.forEach(item => {
    const itemTotal = item.price * item.qty;
    total += itemTotal;
    html += `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <div>
          <strong>${item.name}</strong><br>
          <small>${item.price} جنيه</small>
        </div>
        <div>
          <button class="qty-btn" onclick="changeCartQty(${item.id}, -1)">-</button>
          <span style="margin:0 8px;">${item.qty}</span>
          <button class="qty-btn" onclick="changeCartQty(${item.id}, 1)">+</button>
        </div>
      </div>
    `;
  });
  html += `</div><hr><p><strong>الإجمالي: ${total} جنيه</strong></p>`;
  cartItemsDiv.innerHTML = html;
}

function toggleModal(id) {
  const m = document.getElementById(id);
  m.style.display = (m.style.display === 'flex') ? 'none' : 'flex';
}

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

async function trackOrders() {
  const phone = document.getElementById('trackPhoneInput').value;
  if (!phone) return alert('أدخل رقم الهاتف');

  try {
    const res = await fetch(`/api/orders/track/${phone}`);
    const orders = await res.json();
    const div = document.getElementById('trackResults');
    div.innerHTML = '';

    if (orders.length === 0) {
      div.innerHTML = '<p>لا توجد طلبات مسجلة بهذا الرقم.</p>';
      return;
    }

    orders.forEach(o => {
      div.innerHTML += `
        <div class="order-card">
          <h4>طلب #${o.id} - الحالة: <span style="color:#007185;">${o.status}</span></h4>
          <p>التاريخ: ${new Date(o.created_at).toLocaleDateString('ar-EG')}</p>
        </div>
      `;
    });
  } catch (err) { console.error(err); }
}

async function submitOrder(e) {
  e.preventDefault();
  if (cart.length === 0) return alert('السلة فارغة!');

  const orderData = {
    customer_name: document.getElementById('custName').value,
    customer_phone: document.getElementById('custPhone').value,
    customer_address: document.getElementById('custAddress').value,
    notes: document.getElementById('custNotes').value,
    items: cart
  };

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });

    if (res.ok) {
      alert('تم إرسال طلبك بنجاح!');
      cart = [];
      updateCartUI();
      closeModal('cartModal');
      document.getElementById('checkoutForm').reset();
    }
  } catch (err) { console.error(err); }
}