const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// إعداد مجلد حفظ الصور المرفوعة من الجهاز
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// الاتصال بقاعدة البيانات
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// متغير مؤقت لتخزين إعدادات اسم المتجر والبانر
let storeSettings = {
  name: 'شاهين فون',
  bannerUrl: 'https://via.placeholder.com/1200x300?text=Shaheen+Phone+Store'
};

// --- API المسارات ---

// 1. جلب إعدادات المتجر
app.get('/api/settings', (req, res) => {
  res.json(storeSettings);
});

// 2. تحديث اسم المتجر وصورة البانر من الجهاز
app.post('/api/settings', upload.single('banner'), (req, res) => {
  if (req.body.name) storeSettings.name = req.body.name;
  if (req.file) storeSettings.bannerUrl = `/uploads/${req.file.filename}`;
  res.json({ message: 'تم تحديث إعدادات المتجر بنجاح', settings: storeSettings });
});

// 3. جلب المنتجات
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب المنتجات' });
  }
});

// 4. إضافة منتج مع رفع صورته من الجهاز
app.post('/api/products', upload.single('image'), async (req, res) => {
  const { name, price, category } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : 'https://via.placeholder.com/200';

  try {
    const result = await pool.query(
      'INSERT INTO products (name, price, category, image_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, price, category, imageUrl]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في إضافة المنتج' });
  }
});

// 5. جلب الطلبات
app.get('/api/orders', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب الطلبات' });
  }
});

// 6. إضافة طلب جديد
app.post('/api/orders', async (req, res) => {
  const { customer_name, customer_phone, customer_address, notes, items } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO orders (customer_name, customer_phone, customer_address, notes, items) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [customer_name, customer_phone, customer_address, notes, JSON.stringify(items)]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في حفظ الطلب' });
  }
});

// المسار الرئيسي
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});