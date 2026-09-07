let cart = [];

document.addEventListener('DOMContentLoaded', () => {
  fetchProducts();
});

async function fetchProducts() {
  try {
    const res = await fetch('/api/products');
    const products = await res.json();
    displayProducts(products);
  } catch (err) {
    console.error('خطأ في جلب المنتجات:', err);
  }
}

function displayProducts(products) {
  const grid = document.getElementById('productsGrid');
  grid.innerHTML = '';

  if (!products || products.length === 0) {
    grid.innerHTML = '<p>لا توجد منتجات متاحة حالياً.</p>';
    return;
  }

  products.forEach(p => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <img src="${p.image_url || 'https://via.placeholder.com/200'}" alt="${p.name}">
      <h3>${p.name}</h3>
      <div class="price">${p.price} جنيه</div>
      <button class="btn-primary" onclick="addToCart(${p.id}, '${p.name}', ${p.price})">إضافة للسلة 🛒</button>
    `;
    grid.appendChild(card);
  });
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
    console.error('خطأ في إرسال الطلب:', err);
  }
}