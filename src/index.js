const express = require('express');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const path = require('path');
const apiRoutes = require('./routes/api.js');
const { getEmails, processEmailQueue } = require('./services/gmail.js');
const sharedState = require('./sharedState');

// Express app
const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// API rotalarını bağla
app.use('/api', apiRoutes);

// Ana fonksiyon
async function main() {
  try {
    await getEmails();
  } catch (err) {
    console.error('Hata:', err.message);
  }
}

// E-posta kuyruğunu işle
async function processQueue() {
  if (sharedState.isServiceActive) {
    try {
      await processEmailQueue();
    } catch (err) {
      console.error('Kuyruk işlenirken hata:', err.message, err.stack);
    }
  }
}

// Sunucuyu başlat
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Her 1 dakikada bir e-postaları kontrol et
cron.schedule('*/30 * * * * *', main);

// Her 10 saniyede bir e-posta kuyruğunu kontrol et ve işle
cron.schedule('*/35 * * * * *', processQueue);