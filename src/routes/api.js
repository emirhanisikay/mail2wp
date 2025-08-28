const express = require('express');
const router = express.Router();
const fs = require('fs');
const { google } = require('googleapis');
const whatsapp = require('../services/whatsapp');
const { authorize, getNewAuthUrl, completeAuth, getUserEmail } = require('../services/gmail');
const { config, processedEmails, CONFIG_PATH, PROCESSED_EMAILS_PATH } = require('../config');
const path = require('path');
const sharedState = require('../sharedState');

// API Endpoints
router.get('/status', (req, res) => {
    res.json({ isServiceActive: sharedState.isServiceActive, startTime: sharedState.startTime });
});

router.get('/queue', (req, res) => {
    res.json({ emailQueue: sharedState.emailQueue });
});

router.post('/start', (req, res) => {
    sharedState.isServiceActive = true;
    res.status(200).send();
});

router.post('/stop', (req, res) => {
    sharedState.isServiceActive = false;
    res.status(200).send();
});

router.post('/start-time', (req, res) => {
    const { startTime } = req.body;
    if (startTime) {
        sharedState.startTime = startTime;
    }
    res.status(200).send();
});

router.get('/config', async (req, res) => {
  try {
    const auth = await authorize();
    const userEmail = await getUserEmail(auth);
    res.json({ ...config, userEmail });
  } catch (err) {
    res.status(500).json({ error: 'E-posta adresi alınamadı' });
  }
});

router.post('/group-id', (req, res) => {
  const { groupId } = req.body;
  if (groupId) {
    config.groupId = groupId;
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  }
  res.status(200).send();
});

router.post('/rules', (req, res) => {
  const { rule } = req.body;
  if (rule && rule.sender) {
    config.rules.push(rule);
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  }
  res.status(200).send();
});

router.delete('/rules/:index', (req, res) => {
  const index = parseInt(req.params.index);
  if (index >= 0 && index < config.rules.length) {
    config.rules.splice(index, 1);
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    res.status(200).send();
  } else {
    res.status(400).send('Invalid rule index');
  }
});

router.get('/reauthorize', async (req, res) => {
  try {
    if (fs.existsSync(path.join(__dirname, '../../config/token.json'))) {
      fs.unlinkSync(path.join(__dirname, '../../config/token.json'));
    }
    const { authUrl } = await getNewAuthUrl();
    res.json({ authUrl });
  } catch (err) {
    res.status(500).json({ error: 'Yetkilendirme URL’si alınamadı' });
  }
});

router.post('/complete-auth', async (req, res) => {
  const { code } = req.body;
  try {
    const credentials = JSON.parse(fs.readFileSync(path.join(__dirname, '../../config/credentials.json')));
    const { client_secret, client_id } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, 'urn:ietf:wg:oauth:2.0:oob');
    const auth = await completeAuth(oAuth2Client, code);
    const userEmail = await getUserEmail(auth);
    res.json({ userEmail });
  } catch (err) {
    res.status(500).json({ error: 'Yetkilendirme başarısız' });
  }
});

router.get('/whatsapp-qr', async (req, res) => {
  try {
    if (whatsapp.isWhatsAppReady) {
      return res.json({ qrCode: null, message: 'WhatsApp zaten bağlı.' });
    }
    const qrCode = whatsapp.getCurrentQrCode();
    if (qrCode) {
      return res.json({ qrCode, message: 'QR kodu oluşturuldu.' });
    }
    return res.json({ qrCode: null, message: 'QR kodu oluşturuluyor, lütfen birkaç saniye bekleyin.' });
  } catch (err) {
    res.status(500).json({ qrCode: null, message: 'QR kodu alınamadı: ' + err.message });
  }
});

router.post('/whatsapp-logout', async (req, res) => {
  try {
    await whatsapp.logout();
    if (fs.existsSync(path.join(__dirname, '../../.wwebjs_auth'))) {
      fs.rmdirSync(path.join(__dirname, '../../.wwebjs_auth'), { recursive: true });
    }
    res.status(200).json({ message: 'Çıkış yapıldı, yeni QR kodu bekleniyor.' });
  } catch (err) {
    res.status(500).json({ error: 'Çıkış başarısız: ' + err.message });
  }
});

router.get('/whatsapp-groups', async (req, res) => {
  if (!whatsapp.isWhatsAppReady) {
    return res.json({ groups: [], message: 'WhatsApp bağlı değil.' });
  }
  try {
    const chats = await whatsapp.client.getChats();
    const groups = chats
      .filter(chat => chat.isGroup)
      .map(chat => ({
        id: chat.id._serialized,
        name: chat.name || 'İsimsiz Grup'
      }));
    res.json({ groups });
  } catch (err) {
    res.status(500).json({ error: 'Gruplar alınamadı: ' + err.message });
  }
});

module.exports = { router };