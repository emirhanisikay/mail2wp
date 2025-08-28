const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const whatsapp = require('./whatsapp'); // Singleton modül
const { getEmailBody } = require('../utils/emailParser');
const { config, processedEmails, PROCESSED_EMAILS_PATH } = require('../config');

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const CREDENTIALS_PATH = path.join(__dirname, '../../config/credentials.json');
const TOKEN_PATH = path.join(__dirname, '../../config/token.json');

async function authorize() {
  try {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
      throw new Error('credentials.json dosyası bulunamadı. Google Cloud Console’dan indirin ve config klasörüne ekleyin.');
    }
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
    const { client_secret, client_id } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, 'urn:ietf:wg:oauth:2.0:oob');

    if (fs.existsSync(TOKEN_PATH)) {
      const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
      oAuth2Client.setCredentials(token);
      return oAuth2Client;
    } else {
      throw new Error('Yeni token gerekli');
    }
  } catch (err) {
    console.error('Kimlik doğrulama hatası:', err.message);
    throw err;
  }
}

async function getNewAuthUrl() {
  try {
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
    const { client_secret, client_id } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, 'urn:ietf:wg:oauth:2.0:oob');
    const authUrl = oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
    return { authUrl, oAuth2Client };
  } catch (err) {
    console.error('Yetkilendirme URL’si oluşturulurken hata:', err.message);
    throw err;
  }
}

async function completeAuth(oAuth2Client, code) {
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    console.log('Token kaydedildi:', TOKEN_PATH);
    return oAuth2Client;
  } catch (err) {
    console.error('Token alınırken hata:', err.message);
    throw err;
  }
}

async function getUserEmail(auth) {
  const gmail = google.gmail({ version: 'v1', auth });
  try {
    const res = await gmail.users.getProfile({ userId: 'me' });
    return res.data.emailAddress;
  } catch (err) {
    console.error('Kullanıcı e-posta adresi alınırken hata:', err.message);
    return null;
  }
}

async function getEmails() {
  const auth = await authorize();
  const gmail = google.gmail({ version: 'v1', auth });

  if (!config || !config.rules) {
    console.error('Yapılandırma dosyası (config.json) yüklenemedi veya rules bulunamadı.');
    return;
  }

  const rulesQuery = config.rules.map(rule => {
    const senderQuery = `from:${rule.sender}`;
    if (rule.subjects && rule.subjects.length > 0) {
      const subjectsQuery = rule.subjects.map(subject => `subject:"${subject}"`).join(' OR ');
      return `(${senderQuery} AND (${subjectsQuery}))`;
    } else {
      return `(${senderQuery})`;
    }
  }).join(' OR ');

  const START_TIME = Math.floor(Date.now() / 1000);
  const query = `${rulesQuery} after:${START_TIME}`;

  console.log(`[DEBUG] Gmail arama sorgusu: ${query}`);

  try {
    const res = await gmail.users.messages.list({ userId: 'me', q: query });
    const messages = res.data.messages || [];

    console.log(`[DEBUG] Bulunan e-posta sayısı: ${messages.length}`);

    if (messages.length === 0) {
      console.log('Filtrelere uyan yeni e-posta bulunamadı.');
      return;
    }

    for (const message of messages) {
      try {
        if (processedEmails.has(message.id)) {
          console.log(`[DEBUG] E-posta (ID: ${message.id}) zaten işlendi, atlanıyor.`);
          continue;
        }

        const msg = await gmail.users.messages.get({ userId: 'me', id: message.id });
        const headers = msg.data.payload.headers;
        const subject = headers.find(header => header.name === 'Subject')?.value || '[Konu yok]';
        const from = headers.find(header => header.name === 'From')?.value || '[Gönderici yok]';

        const body = getEmailBody(msg.data.payload);

        await whatsapp.sendToWhatsApp({ from, subject, body, messageId: message.id });

        processedEmails.add(message.id);
        fs.writeFileSync(PROCESSED_EMAILS_PATH, JSON.stringify([...processedEmails]));
      } catch (err) {
        console.error(`E-posta (ID: ${message.id}) okuma hatası:`, err.message);
      }
    }
  } catch (err) {
    console.error('E-posta listeleme hatası:', err.message);
  }
}

module.exports = {
  authorize,
  getNewAuthUrl,
  completeAuth,
  getUserEmail,
  getEmails
};