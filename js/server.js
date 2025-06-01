const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('html')); // Чтобы раздавался index.html
app.use('/js', express.static('js')); // Для main.js
app.use('/uploads', express.static('uploads'));

// Настройка PostgreSQL
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'geoplatform_db',
  password: 'aazzaa0099',
  port: 5432,
});

// Настройка хранилища для фотографий
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Получение всех данных в старом формате
app.get('/data.json', async (req, res) => {
  try {
    const segmentsRes = await pool.query('SELECT * FROM segments');
    const coordsRes = await pool.query('SELECT * FROM coords ORDER BY segment_id, seq');
    const recyclingRes = await pool.query('SELECT * FROM recycling_points');
    const reportsRes = await pool.query('SELECT * FROM reports ORDER BY date DESC');

    const segments = {};
    for (const seg of segmentsRes.rows) {
      segments[seg.segment_id] = {
        name: seg.name,
        coords: [],
        recycling: { paper: [], plastic: [] },
        reports: []
      };
    }

    for (const coord of coordsRes.rows) {
      if (segments[coord.segment_id]) {
        segments[coord.segment_id].coords.push([coord.latitude, coord.longitude]);
      }
    }

    for (const rec of recyclingRes.rows) {
      if (segments[rec.segment_id]) {
        if (!segments[rec.segment_id].recycling[rec.material_type]) {
          segments[rec.segment_id].recycling[rec.material_type] = [];
        }
        segments[rec.segment_id].recycling[rec.material_type].push(rec.address);
      }
    }

    for (const rep of reportsRes.rows) {
      if (segments[rep.segment_id]) {
        segments[rep.segment_id].reports.push({
          type: rep.report_type,
          text: rep.text,
          photo: rep.photo ? `/uploads/${path.basename(rep.photo)}` : null,
          date: rep.date.toISOString().split('T')[0]
        });
      }
    }

    const total_reports = reportsRes.rowCount;
    res.json({ meta: { total_reports }, segments });

  } catch (err) {
    console.error('Ошибка при загрузке из БД:', err);
    res.status(500).json({ error: 'Ошибка при загрузке из базы данных' });
  }
});

// Загрузка фото и добавление обращения
app.post('/upload', upload.single('photo'), async (req, res) => {
  const { segment, text } = req.body;
  const file = req.file;
  const today = new Date().toISOString().split('T')[0];

  try {
    const segCheck = await pool.query('SELECT 1 FROM segments WHERE segment_id = $1', [segment]);
    if (segCheck.rowCount === 0) {
      return res.status(400).json({ message: 'Неверный сегмент' });
    }

    await pool.query(
      `INSERT INTO reports (segment_id, report_type, text, photo, date)
       VALUES ($1, $2, $3, $4, $5)`,
      [segment, 'замечание', text, file ? file.path : null, today]
    );

    res.json({ message: 'Обращение добавлено!' });
  } catch (err) {
    console.error('Ошибка при добавлении в БД:', err);
    res.status(500).json({ message: 'Ошибка при добавлении обращения' });
  }
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
