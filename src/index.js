const express = require('express');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const path = require('path');
const { router: apiRoutes } = require('./routes/api.js');
const { getEmails } = require('./services/gmail.js');

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

// Sunucuyu başlat
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Her 1 dakikada bir e-postaları kontrol et
cron.schedule('* * * * *', main);
