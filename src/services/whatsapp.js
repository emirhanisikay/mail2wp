const WhatsApp = require('whatsapp-web.js');
const qrcode = require('qrcode');
const qrcodeTerminal = require('qrcode-terminal');
const { config } = require('../config');

// Modülün yüklendiğini doğrulamak için benzersiz bir ID
const moduleId = Math.random().toString(36).substring(7);
console.log('[DEBUG] WhatsApp modülü yüklendi. Modül ID:', moduleId);

const { Client, LocalAuth } = WhatsApp;

// Durum nesnesi ile global durumu yönet
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
  console.log('[DEBUG] QR kodu oluşturuldu:', qr, 'Modül ID:', moduleId);
  qrcodeTerminal.generate(qr, { small: true });
  try {
    state.currentQrCode = await qrcode.toDataURL(qr);
    state.isWhatsAppReady = false;
    console.log('[DEBUG] QR kodu arayüz için oluşturuldu. isWhatsAppReady:', state.isWhatsAppReady, 'currentQrCode:', state.currentQrCode ? 'var' : 'yok', 'Modül ID:', moduleId);
  } catch (err) {
    console.error('[ERROR] QR kodu oluşturulurken hata:', err.message, 'Modül ID:', moduleId);
    state.currentQrCode = null;
  }
});

client.on('ready', async () => {
  state.isWhatsAppReady = true;
  state.currentQrCode = null;
  console.log('[DEBUG] WhatsApp istemcisi hazır! isWhatsAppReady:', state.isWhatsAppReady, 'currentQrCode:', state.currentQrCode, 'Modül ID:', moduleId);
});

client.on('disconnected', (reason) => {
  console.log('[DEBUG] WhatsApp bağlantısı koptu, sebep:', reason, 'Modül ID:', moduleId);
  state.isWhatsAppReady = false;
  state.currentQrCode = null;
  client.initialize().catch(err => {
    console.error('[ERROR] WhatsApp yeniden başlatma hatası:', err.message, 'Modül ID:', moduleId);
    state.isWhatsAppReady = false;
    state.currentQrCode = null;
  });
});

client.on('auth_failure', (msg) => {
  console.error('[ERROR] WhatsApp kimlik doğrulama hatası:', msg, 'Modül ID:', moduleId);
  state.isWhatsAppReady = false;
  state.currentQrCode = null;
  client.initialize().catch(err => {
    console.error('[ERROR] WhatsApp yeniden başlatma hatası:', err.message, 'Modül ID:', moduleId);
    state.isWhatsAppReady = false;
    state.currentQrCode = null;
  });
});

client.on('loading_screen', (percent, message) => {
  console.log('[DEBUG] WhatsApp yükleniyor:', percent, message, 'Modül ID:', moduleId);
});

client.initialize().catch(err => {
  console.error('[ERROR] WhatsApp başlatma hatası:', err.message, 'Modül ID:', moduleId);
  state.isWhatsAppReady = false;
  state.currentQrCode = null;
});

// Çıkış işlemini yönetmek için yeni bir fonksiyon
async function logout() {
  try {
    await client.logout();
    state.isWhatsAppReady = false;
    state.currentQrCode = null;
    console.log('[DEBUG] WhatsApp istemcisi çıkış yaptı. isWhatsAppReady:', state.isWhatsAppReady, 'currentQrCode:', state.currentQrCode, 'Modül ID:', moduleId);
    await client.initialize();
    console.log('[DEBUG] WhatsApp istemcisi yeniden başlatıldı. Modül ID:', moduleId);
    return { success: true, message: 'Çıkış yapıldı, yeni QR kodu bekleniyor.' };
  } catch (err) {
    console.error('[ERROR] WhatsApp çıkış hatası:', err.message, 'Modül ID:', moduleId);
    state.isWhatsAppReady = false;
    state.currentQrCode = null;
    throw err;
  }
}

// Singleton nesnesi
const singleton = {
  client,
  get isWhatsAppReady() {
    console.log('[DEBUG] isWhatsAppReady alındı:', state.isWhatsAppReady, 'Modül ID:', moduleId);
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
      console.log('[DEBUG] Mesaj WhatsApp grubuna gönderildi:', message, 'Modül ID:', moduleId);
    } catch (err) {
      console.error(`[ERROR] WhatsApp mesaj gönderme hatası (E-posta ID: ${messageId}):`, err.message, 'Modül ID:', moduleId);
    }
  },
  getCurrentQrCode: function () {
    return state.currentQrCode;
  },
  logout
};

// Modülün yalnızca bir kez yüklenmesini sağla
module.exports = singleton;