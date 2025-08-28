const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../../config/config.json');
const PROCESSED_EMAILS_PATH = path.join(__dirname, '../../config/processed_emails.json');

let config = { rules: [], groupId: '' };
let processedEmails = new Set();

if (fs.existsSync(CONFIG_PATH)) {
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH));
    console.log('config.json başarıyla yüklendi:', config);
  } catch (err) {
    console.error('config.json yüklenirken hata:', err.message);
  }
}

if (fs.existsSync(PROCESSED_EMAILS_PATH)) {
  try {
    processedEmails = new Set(JSON.parse(fs.readFileSync(PROCESSED_EMAILS_PATH)));
    console.log('processed_emails.json başarıyla yüklendi.');
  } catch (err) {
    console.error('processed_emails.json yüklenirken hata:', err.message);
  }
}

module.exports = {
  config,
  processedEmails,
  CONFIG_PATH,
  PROCESSED_EMAILS_PATH
};