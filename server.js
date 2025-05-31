const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

const upload = multer({ dest: 'uploads/' });

app.use(express.static('.'));
app.use('/uploads', express.static('uploads'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


app.get('/data.json', (req, res) => {
  try {
    const data = fs.readFileSync('data.json', 'utf-8');
    res.json(JSON.parse(data));
  } catch (err) {
    res.status(500).json({ error: 'Не удалось загрузить данные' });
  }
});


app.post('/upload', upload.single('photo'), (req, res) => {
  try {
    const raw = fs.readFileSync('data.json');
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
    fs.writeFileSync('data.json', JSON.stringify(data, null, 2));

    res.json({ message: 'Обращение добавлено!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка при сохранении обращения' });
  }
});


app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});