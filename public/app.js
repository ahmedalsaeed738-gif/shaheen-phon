let allProducts = [];
let cart = [];

document.addEventListener('DOMContentLoaded', () => {
  loadStoreSettings();
  fetchProducts();
});

async function loadStoreSettings() {
  try {
    const res = await fetch('/api/settings');
    const settings = await res.json();
    if (settings.store_name) {
      document.getElementById('storeName').innerText = settings.store_name;
    }
    if (settings.banner_url) {
      document.getElementById('storeBanner').src = settings.banner_url;
    }
  } catch (err) {
    console.error('Error settings:', err);
  }
}

async function fetchProducts() {
  try {
    const res = await fetch('/api/products');
    allProducts = await res.json();
    displayProducts(allProducts);
  } catch (err) {
    console.error('Error products:', err);
  }
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
    card.innerHTML = `
      <img src="${p.image_url || 'https://via.placeholder.com/200'}" alt="${p.name}" onclick="openProductModal(${p.id})">
      <span class="category-badge">${p.category || 'عام'}</span>
      <h3 onclick="openProductModal(${p.id})" style="cursor:pointer">${p.name}</h3>
      <div class="price">${p.price} جنيه</div>
      <button class="btn-primary" onclick="addToCart(${p.id}, '${p.name}', ${p.price})">إضافة للسلة 🛒</button>
    `;
    grid.appendChild(card);
  });
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
  const product = allProducts.find(p => p.id === id);
  if (!product) return;

  const body = document.getElementById('productModalBody');
  body.innerHTML = `
    <img src="${product.image_url || 'https://via.placeholder.com/200'}" style="width:100%; max-height:250px; object-fit:contain; border-radius:8px;">
    <h2>${product.name}</h2>
    <span class="category-badge">${product.category || 'عام'}</span>
    <h3 style="color:#B12704;">${product.price} جنيه</h3>
    <p style="margin-top:15px; line-height:1.6;">${product.description || 'لا يوجد وصف لهذا المنتج.'}</p>
    <button class="btn-primary" onclick="addToCart(${product.id}, '${product.name}', ${product.price}); closeProductModal();">إضافة للسلة 🛒</button>
  `;

  document.getElementById('productDetailModal').style.display = 'flex';
}

function closeProductModal() {
  document.getElementById('productDetailModal').style.display = 'none';
}

function addToCart(id, name, price) {
  const existing = cart.find(item => item.id === id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id, name, price, qty: 1 });
  }
  updateCartUI();
}

function updateCartUI() {
  const cartCount = document.getElementById('cartCount');
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  cartCount.innerText = totalItems;

  const cartItemsDiv = document.getElementById('cartItems');
  if (cart.length === 0) {
    cartItemsDiv.innerHTML = '<p>السلة فارغة.</p>';
    return;
  }

  let html = '<ul>';
  let total = 0;
  cart.forEach(item => {
    const itemTotal = item.price * item.qty;
    total += itemTotal;
    html += `<li>${item.name} x ${item.qty} - ${itemTotal} جنيه</li>`;
  });
  html += `</ul><p><strong>الإجمالي: ${total} جنيه</strong></p>`;
  cartItemsDiv.innerHTML = html;
}

function toggleCart() {
  const modal = document.getElementById('cartModal');
  modal.style.display = (modal.style.display === 'flex') ? 'none' : 'flex';
}

async function submitOrder(e) {
  e.preventDefault();
  if (cart.length === 0) {
    alert('سلة الشراء فارغة!');
    return;
  }

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
      toggleCart();
      document.getElementById('checkoutForm').reset();
    } else {
      alert('حدث خطأ أثناء إرسال الطلب.');
    }
  } catch (err) {
    console.error('Order error:', err);
  }
}