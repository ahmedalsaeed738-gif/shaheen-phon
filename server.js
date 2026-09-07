const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

let pool;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
}

// دالة مبسطة جداً لتهيئة الجداول وإضافة العمود إن لم يكن موجوداً
const initDB = async () => {
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price NUMERIC NOT NULL,
        image_url TEXT,
        category VARCHAR(100) DEFAULT 'عام',
        description TEXT
      );
    `);

    // إدراج العمود بأبسط طريقة وبدون شروط معقدة لتفادي الخطأ
    try {
      await pool.query(`ALTER TABLE products ADD COLUMN stock INT DEFAULT 1;`);
    } catch (e) {
      // إذا كان العمود موجوداً بالفعل، سيتم إكمال الكود طبيعي بدون توقف
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(50) NOT NULL,
        customer_address TEXT NOT NULL,
        notes TEXT,
        items JSONB NOT NULL,
        status VARCHAR(50) DEFAULT 'قيد الانتظار',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS store_settings (
        id INT PRIMARY KEY DEFAULT 1,
        store_name VARCHAR(255) DEFAULT 'شاهين فون',
        banner_url TEXT
      );
    `);

    await pool.query(`
      INSERT INTO store_settings (id, store_name, banner_url)
      VALUES (1, 'شاهين فون', 'https://via.placeholder.com/1200x300?text=Shaheen+Phone+Store')
      ON CONFLICT (id) DO NOTHING;
    `);
  } catch (err) {
    console.error('DB Init Error:', err.message);
  }
};

// --- API الإعدادات ---
app.get('/api/settings', async (req, res) => {
  if (!pool) return res.json({ store_name: 'شاهين فون', banner_url: '' });
  try {
    await initDB();
    const result = await pool.query('SELECT * FROM store_settings WHERE id = 1');
    res.json(result.rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', async (req, res) => {
  if (!pool) return res.status(400).json({ error: 'DB not connected' });
  const { store_name, banner_url } = req.body;
  try {
    await initDB();
    const result = await pool.query(
      `UPDATE store_settings SET store_name = COALESCE($1, store_name), banner_url = COALESCE($2, banner_url) WHERE id = 1 RETURNING *`,
      [store_name, banner_url]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- API المنتجات ---
app.get('/api/products', async (req, res) => {
  if (!pool) return res.json([]);
  try {
    await initDB();
    const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  if (!pool) return res.status(400).json({ error: 'DB not connected' });
  const { name, price, stock, image_url, category, description } = req.body;
  try {
    await initDB();
    const result = await pool.query(
      'INSERT INTO products (name, price, stock, image_url, category, description) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, parseFloat(price), parseInt(stock) || 1, image_url || 'https://via.placeholder.com/200', category || 'عام', description || '']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  if (!pool) return res.status(400).json({ error: 'DB not connected' });
  const { name, price, stock, image_url, category, description } = req.body;
  try {
    await initDB();
    const result = await pool.query(
      `UPDATE products SET name=$1, price=$2, stock=$3, image_url=COALESCE($4, image_url), category=$5, description=$6 WHERE id=$7 RETURNING *`,
      [name, parseFloat(price), parseInt(stock) || 1, image_url, category || 'عام', description || '', req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  if (!pool) return res.status(400).json({ error: 'DB not connected' });
  try {
    await initDB();
    await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.json({ message: 'تم الحذف بنجاح' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- API الطلبات ---
app.get('/api/orders', async (req, res) => {
  if (!pool) return res.json([]);
  try {
    await initDB();
    const result = await pool.query('SELECT * FROM orders ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders/track/:phone', async (req, res) => {
  if (!pool) return res.json([]);
  try {
    await initDB();
    const result = await pool.query('SELECT * FROM orders WHERE customer_phone = $1 ORDER BY id DESC', [req.params.phone]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  if (!pool) return res.status(400).json({ error: 'DB not connected' });
  const { customer_name, customer_phone, customer_address, notes, items } = req.body;
  try {
    await initDB();
    const result = await pool.query(
      'INSERT INTO orders (customer_name, customer_phone, customer_address, notes, items) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [customer_name, customer_phone, customer_address, notes, JSON.stringify(items)]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/orders/:id/status', async (req, res) => {
  if (!pool) return res.status(400).json({ error: 'DB not connected' });
  const { status } = req.body;
  try {
    await initDB();
    const result = await pool.query('UPDATE orders SET status = $1 WHERE id = $2 RETURNING *', [status, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/orders/:id', async (req, res) => {
  if (!pool) return res.status(400).json({ error: 'DB not connected' });
  try {
    await initDB();
    await pool.query('DELETE FROM orders WHERE id = $1', [req.params.id]);
    res.json({ message: 'تم حذف الطلب بنجاح' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;