const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// تقديم ملفات الواجهة
app.use(express.static(path.join(__dirname, 'public')));

// الاتصال بقاعدة البيانات
let pool;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
}

// إنشاء الجداول
const initDB = async () => {
  if (!pool) return;
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
  } catch (err) {
    console.error('DB Error:', err.message);
  }
};

// API
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
  const { name, price, image_url, category } = req.body;
  try {
    await initDB();
    const result = await pool.query(
      'INSERT INTO products (name, price, image_url, category) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, price, image_url || 'https://via.placeholder.com/200', category || 'عام']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;