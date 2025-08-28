const WhatsApp = require('whatsapp-web.js');
const qrcode = require('qrcode');
const qrcodeTerminal = require('qrcode-terminal');
const { config } = require('../config');

const { Client, LocalAuth } = WhatsApp;

const state = {
  isWhatsAppReady: false,
  currentQrCode: null
};

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]
  }
});

client.on('qr', async (qr) => {
  qrcodeTerminal.generate(qr, { small: true });
  try {
    state.currentQrCode = await qrcode.toDataURL(qr);
    state.isWhatsAppReady = false;
  } catch (err) {
    state.currentQrCode = null;
  }
});

client.on('ready', async () => {
  state.isWhatsAppReady = true;
  state.currentQrCode = null;
});

client.on('disconnected', (reason) => {
  state.isWhatsAppReady = false;
  state.currentQrCode = null;
  client.initialize().catch(err => {
    state.isWhatsAppReady = false;
    state.currentQrCode = null;
  });
});

client.on('auth_failure', (msg) => {
  state.isWhatsAppReady = false;
  state.currentQrCode = null;
  client.initialize().catch(err => {
    state.isWhatsAppReady = false;
    state.currentQrCode = null;
  });
});

client.on('loading_screen', (percent, message) => {
});

client.initialize().catch(err => {
  state.isWhatsAppReady = false;
  state.currentQrCode = null;
});

async function logout() {
  try {
    await client.logout();
    state.isWhatsAppReady = false;
    state.currentQrCode = null;
    await client.initialize();
    return { success: true, message: 'Çıkış yapıldı, yeni QR kodu bekleniyor.' };
  } catch (err) {
    state.isWhatsAppReady = false;
    state.currentQrCode = null;
    throw err;
  }
}

const singleton = {
  client,
  get isWhatsAppReady() {
    return state.isWhatsAppReady;
  },
  sendToWhatsApp: async function ({ from, subject, body, messageId }) {
    const groupId = config.groupId;
    const message = `*${subject}* \n\n ${body}`;
    try {
      if (!state.isWhatsAppReady) {
        throw new Error('WhatsApp istemcisi hazır değil. Lütfen QR kodunu tarayın.');
      }
      if (!groupId) {
        throw new Error('WhatsApp grup ID’si ayarlanmamış.');
      }
      await client.sendMessage(groupId, message);
    } catch (err) {
    }
  },
  getCurrentQrCode: function () {
    return state.currentQrCode;
  },
  logout
};

module.exports = singleton;