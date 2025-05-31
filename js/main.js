let map = L.map('map', { attributionControl: false }).setView([48.708, 44.513], 14);


L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let segmentData = {};
let currentSegment = null;

function loadDataAndRenderSegments() {
  fetch('/data.json')
    .then(res => res.json())
    .then(data => {
      segmentData = data;
      document.getElementById('report-count').innerText = data.meta.total_reports;
      renderMapSegments(data.segments);
      if (currentSegment) {
        showSegmentInfo(currentSegment);
      }
    });
}

function renderMapSegments(segments) {
  map.eachLayer((layer) => {
    if (layer instanceof L.Polygon) {
      map.removeLayer(layer);
    }
  });

  Object.entries(segments).forEach(([id, segment]) => {
    if (segment.coords) {
      const polygon = L.polygon(segment.coords, { color: 'green' }).addTo(map);
      polygon.on('click', () => {
        currentSegment = id;
        showSegmentInfo(id);
      });
    }
  });
}

function showSegmentInfo(segmentId) {
  const segment = segmentData.segments[segmentId];
  if (!segment) return;

  const info = `
    <strong>${segment.name}</strong><br/>
    <b>Макулатура:</b> ${segment.recycling.paper.join(', ') || 'нет данных'}<br/>
    <b>Пластик:</b> ${segment.recycling.plastic.join(', ') || 'нет данных'}<br/>
    <b>Обращения:</b>
    <ul>
      ${segment.reports.map(r => `<li>${r.text} (${r.date})</li>`).join('')}
    </ul>
  `;

  document.getElementById('segment-info').innerHTML = info;
  document.getElementById('report-count').innerText = segmentData.meta.total_reports;
}


function showNotification(msg, isError = false) {
  const notif = document.createElement('div');
  notif.textContent = msg;
  notif.style.position = 'fixed';
  notif.style.top = '20px';
  notif.style.right = '20px';
  notif.style.padding = '10px 15px';
  notif.style.backgroundColor = isError ? '#f44336' : '#4caf50';
  notif.style.color = 'white';
  notif.style.borderRadius = '5px';
  notif.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
  notif.style.zIndex = 1000;
  notif.style.opacity = '1';
  notif.style.transition = 'opacity 0.5s ease';

  document.body.appendChild(notif);

  setTimeout(() => {
    notif.style.opacity = '0';
    setTimeout(() => {
      notif.remove();
    }, 500);
  }, 3000);
}

loadDataAndRenderSegments();

const form = document.getElementById('upload-form');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(form);
  const segmentId = formData.get('segment');

  try {
    const response = await fetch('/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error('Ошибка при отправке');

    const result = await response.json();

   
    showNotification(result.message || 'Обращение успешно добавлено!');

   
    const updated = await fetch('/data.json').then(res => res.json());
    segmentData = updated;

    document.getElementById('report-count').innerText = updated.meta.total_reports;

    if (segmentId === currentSegment) {
      showSegmentInfo(segmentId);
    }

    form.reset();
  } catch (error) {
    console.error(error);
    showNotification('Не удалось отправить обращение. Попробуйте позже.', true);
  }
});
