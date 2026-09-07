const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// الاتصال بقاعدة بيانات Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// إنشاء الجداول تلقائياً في قاعدة البيانات
const initDB = async () => {
  if (!process.env.DATABASE_URL) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price NUMERIC NOT NULL,
        image_url TEXT,
        category VARCHAR(100) DEFAULT 'عام'
      );
    `);

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
    console.log('✅ تم تجهيز جداول قاعدة البيانات بنجاح');
  } catch (err) {
    console.error('❌ خطأ في تهيئة الجداول:', err);
  }
};

initDB();

// API: جلب جميع المنتجات
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: إضافة منتج جديد مع القسم
app.post('/api/products', async (req, res) => {
  const { name, price, image_url, category } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO products (name, price, image_url, category) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, price, image_url || 'https://via.placeholder.com/200', category || 'هواتف']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: حذف منتج
app.delete('/api/products/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.json({ message: 'تم الحذف بنجاح' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: جلب كل الطلبات
app.get('/api/orders', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: إنشاء طلب جديد من الزبون
app.post('/api/orders', async (req, res) => {
  const { customer_name, customer_phone, customer_address, notes, items } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO orders (customer_name, customer_phone, customer_address, notes, items) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [customer_name, customer_phone, customer_address, notes, JSON.stringify(items)]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// توجيه جميع الصفحات لـ index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));