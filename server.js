const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
// الإعداد للاتصال بقاعدة البيانات السحابية (PostgreSQL)
// لما نرفع على السيرفر هيربط تلقائياً بالـ DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// إنشاء جدول المنتجات تلقائياً إذا لم يكن موجوداً
const initDB = async () => {
  if (!process.env.DATABASE_URL) {
    console.log('⚠️ السيرفر يعمل حالياً بدون داتابيز أونلاين (جاهز للربط عند الرفع)');
    return;
  }
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price NUMERIC NOT NULL,
        description TEXT,
        category VARCHAR(100),
        image TEXT
      );
    `);
    console.log('✅ تم الاتصال بقاعدة البيانات أونلاين بنجاح (Shaheen Phone DB)');
  } catch (err) {
    console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err.message);
  }
};

// ---------------- REST APIs ----------------

// 1. اختبار السيرفر
app.get('/', (req, res) => {
  res.send('📱 سيرفر شاهين فون (Shaheen Phone) يعمل بنجاح!');
});

// 2. جلب جميع المنتجات أو البحث
app.get('/api/products', async (req, res) => {
  try {
    const { search } = req.query;
    if (!process.env.DATABASE_URL) {
      // تجربة عينة مؤقتة لو الداتابيز لسه ماترطتش
      return res.json({
        success: true,
        data: [
          { id: 1, name: 'آيفون 15 بروماكس', price: 60000, description: 'أحدث هاتف من أبل', category: 'آبل' }
        ]
      });
    }

    let query = 'SELECT * FROM products';
    let params = [];

    if (search) {
      query += ' WHERE name ILIKE $1 OR description ILIKE $1';
      params.push(`%${search}%`);
    }

    const result = await pool.query(query, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. إضافة منتج جديد
app.post('/api/products', async (req, res) => {
  try {
    const { name, price, description, category, image } = req.body;
    if (!name || !price) {
      return res.status(400).json({ success: false, message: 'اسم المنتج والسعر مطلوبان' });
    }

    if (!process.env.DATABASE_URL) {
      return res.status(400).json({ success: false, message: 'يرجى ربط السيرفر بقاعدة البيانات أونلاين أولاً' });
    }

    const result = await pool.query(
      'INSERT INTO products (name, price, description, category, image) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, price, description || '', category || 'الهواتف', image || '']
    );

    res.status(201).json({ success: true, message: 'تم إضافة المنتج بنجاح', product: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// تشغيل السيرفر
app.listen(PORT, async () => {
  console.log(`🚀 سيرفر شاهين فون شغال دلوقتي على: http://localhost:${PORT}`);
  await initDB();
});