const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

// Пути
const uploadDir = path.join(__dirname, '..', 'uploads');
const dataPath = path.join(__dirname, '..', 'json', 'data.json');

// Убедимся, что папка для загрузок существует
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Настройка multer
const upload = multer({ dest: uploadDir });

// Статические файлы
app.use('/uploads', express.static(uploadDir)); // для доступа к загруженным изображениям
app.use('/js', express.static(path.join(__dirname))); // обслуживаем main.js
app.use('/', express.static(path.join(__dirname, '..', 'html'))); // index.html

// Middleware для body
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// GET: данные из data.json
app.get('/data.json', (req, res) => {
  try {
    const data = fs.readFileSync(dataPath, 'utf-8');
    res.json(JSON.parse(data));
  } catch (err) {
    console.error('Ошибка чтения data.json:', err);
    res.status(500).json({ error: 'Не удалось загрузить данные' });
  }
});

// POST: загрузка изображения и сохранение замечания
app.post('/upload', upload.single('photo'), (req, res) => {
  try {
    const raw = fs.readFileSync(dataPath);
    const data = JSON.parse(raw);
    const { segment, text } = req.body;
    const file = req.file;

    if (!data.segments[segment]) {
      return res.status(400).json({ message: 'Неверный сегмент' });
    }

    data.segments[segment].reports.push({
      type: 'замечание',
      text,
      photo: file ? `/uploads/${file.filename}` : null,
      date: new Date().toISOString().split('T')[0]
    });

    data.meta.total_reports++;
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

    res.json({ message: 'Обращение добавлено!' });
  } catch (err) {
    console.error('Ошибка при сохранении обращения:', err);
    res.status(500).json({ message: 'Ошибка при сохранении обращения' });
  }
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});
