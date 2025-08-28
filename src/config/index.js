const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../../config/config.json');
const PROCESSED_EMAILS_PATH = path.join(__dirname, '../../config/processed_emails.json');

let config = { rules: [], groupId: '' };
let processedEmails = new Set();

if (fs.existsSync(CONFIG_PATH)) {
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH));
  } catch (err) {
  }
}

if (fs.existsSync(PROCESSED_EMAILS_PATH)) {
  try {
    processedEmails = new Set(JSON.parse(fs.readFileSync(PROCESSED_EMAILS_PATH)));
  } catch (err) {
  }
}

module.exports = {
  config,
  processedEmails,
  CONFIG_PATH,
  PROCESSED_EMAILS_PATH
};