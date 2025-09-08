const WhatsApp = require('whatsapp-web.js');
const qrcode = require('qrcode');
const { config } = require('../config');

const { Client, LocalAuth } = WhatsApp;

const state = {
  isWhatsAppReady: false,
  currentQrCode: null
};

let isInitializing = false;

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
      '--disable-gpu',
      '--disable-extensions',
      '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    ]
  }
});

client.on('qr', async (qr) => {
  console.log('Yeni QR kodu üretildi:', new Date().toISOString());
  try {
    state.currentQrCode = await qrcode.toDataURL(qr);
    state.isWhatsAppReady = false;
    console.log('QR kodu web için kaydedildi.');
    setTimeout(() => {
      if (!state.isWhatsAppReady) {
        console.log('QR kodu süresi doldu, yeniden başlatılıyor...');
        if (!isInitializing) {
          isInitializing = true;
          client.initialize().catch(err => {
            console.error('Yeniden başlatma hatası:', err);
            isInitializing = false;
            state.isWhatsAppReady = false;
            state.currentQrCode = null;
          });
        }
      }
    }, 60000); // 60 saniye
  } catch (err) {
    state.currentQrCode = null;
    console.error('QR kodu oluşturulamadı:', err);
  }
});

client.on('ready', async () => {
  state.isWhatsAppReady = true;
  state.currentQrCode = null;
  console.log('WhatsApp istemcisi hazır:', new Date().toISOString());
  console.log('İstemci durumu:', client.info || 'Durum bilgisi alınamadı');
});

client.on('disconnected', (reason) => {
  state.isWhatsAppReady = false;
  state.currentQrCode = null;
  console.log('WhatsApp bağlantısı kesildi:', reason, new Date().toISOString());
  if (!isInitializing) {
    isInitializing = true;
    client.initialize().catch(err => {
      console.error('WhatsApp yeniden başlatılamadı:', err);
      isInitializing = false;
      state.isWhatsAppReady = false;
      state.currentQrCode = null;
    });
  }
});

client.on('auth_failure', (msg) => {
  state.isWhatsAppReady = false;
  state.currentQrCode = null;
  console.log('WhatsApp kimlik doğrulama hatası:', msg, new Date().toISOString());
  if (!isInitializing) {
    isInitializing = true;
    client.initialize().catch(err => {
      console.error('WhatsApp yeniden başlatılamadı:', err);
      isInitializing = false;
      state.isWhatsAppReady = false;
      state.currentQrCode = null;
    });
  }
});

client.on('loading_screen', (percent, message) => {
  console.log('WhatsApp yükleniyor:', percent, message, new Date().toISOString());
});

if (!isInitializing) {
  isInitializing = true;
  client.initialize().catch(err => {
    console.error('WhatsApp başlatılamadı:', err);
    isInitializing = false;
    state.isWhatsAppReady = false;
    state.currentQrCode = null;
  });
}

async function logout() {
  try {
    await client.logout();
    state.isWhatsAppReady = false;
    state.currentQrCode = null;
    console.log('WhatsApp oturumu sıfırlandı:', new Date().toISOString());
    if (!isInitializing) {
      isInitializing = true;
      await client.initialize();
      isInitializing = false;
    }
    return { success: true, message: 'Çıkış yapıldı, yeni QR kodu bekleniyor.' };
  } catch (err) {
    state.isWhatsAppReady = false;
    state.currentQrCode = null;
    console.error('Çıkış hatası:', err);
    throw err;
  }
}

const singleton = {
  client,
  get isWhatsAppReady() {
    return state.isWhatsAppReady;
  },
  get phoneNumber() {
    return state.isWhatsAppReady && client.info && client.info.wid ? client.info.wid._serialized : null;
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
      console.log('Mesaj gönderildi:', { from, subject, messageId });
    } catch (err) {
      console.error('Mesaj gönderilemedi:', err);
      throw err;
    }
  },
  getCurrentQrCode: function () {
    return {
      qrCode: state.currentQrCode,
      message: state.isWhatsAppReady ? 'WhatsApp zaten bağlı.' : (state.currentQrCode ? null : 'QR kodu oluşturuluyor, lütfen birkaç saniye bekleyin.'),
      phoneNumber: state.isWhatsAppReady && client.info && client.info.wid ? client.info.wid._serialized : null
    };
  },
  logout
};

module.exports = singleton;