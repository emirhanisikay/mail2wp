const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode');
const { config } = require('../config');
const pino = require('pino');

const state = {
  isWhatsAppReady: false,
  currentQrCode: null
};

let sock = null;

async function connectToWhatsApp() {
  try {
    const { state: authState, saveCreds } = await useMultiFileAuthState('.baileys_auth');
    
    sock = makeWASocket({
      auth: authState,
      logger: pino({ level: 'silent' })
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          state.currentQrCode = await qrcode.toDataURL(qr);
          state.isWhatsAppReady = false;
        } catch (err) {
          state.currentQrCode = null;
          console.error('QR kodu oluşturulamadı:', err.message, err.stack);
        }
      }

      if (connection === 'open') {
        state.isWhatsAppReady = true;
        state.currentQrCode = null;
      }

      if (connection === 'close') {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        state.isWhatsAppReady = false;
        state.currentQrCode = null;
        sock = null;
        if (shouldReconnect) {
          setTimeout(() => connectToWhatsApp(), 5000);
        } else {
          setTimeout(() => connectToWhatsApp(), 5000);
        }
      }
    });

    sock.ev.on('creds.update', saveCreds);
  } catch (err) {
    console.error('WhatsApp başlatılamadı:', err.message, err.stack);
    state.isWhatsAppReady = false;
    state.currentQrCode = null;
    sock = null;
    setTimeout(() => connectToWhatsApp(), 5000);
  }
}

connectToWhatsApp();

async function logout() {
  try {
    if (sock) {
      await sock.logout();
    }
    state.isWhatsAppReady = false;
    state.currentQrCode = null;
    sock = null;
    await connectToWhatsApp();
    return { success: true, message: 'Çıkış yapıldı, yeni QR kodu bekleniyor.' };
  } catch (err) {
    state.isWhatsAppReady = false;
    state.currentQrCode = null;
    sock = null;
    console.error('Çıkış hatası:', err.message, err.stack);
    throw err;
  }
}

const singleton = {
  get client() {
    return sock;
  },
  get isWhatsAppReady() {
    return state.isWhatsAppReady;
  },
  get phoneNumber() {
    if (!state.isWhatsAppReady || !sock?.user?.id) {
      return null;
    }
    const phoneNumber = sock.user.id.split(':')[0];
    return phoneNumber;
  },
  sendToWhatsApp: async function ({ from, subject, body, messageId }) {
    const groupId = config.groupId;
    const message = `*${subject}* \n\n ${body}`;
    try {
      if (!state.isWhatsAppReady || !sock) {
        throw new Error('WhatsApp istemcisi hazır değil. Lütfen QR kodunu tarayın.');
      }
      if (!groupId || !groupId.includes('@g.us')) {
        throw new Error('Geçersiz WhatsApp grup ID’si: ' + groupId);
      }
      await sock.sendMessage(groupId, { text: message });
    } catch (err) {
      console.error('Mesaj gönderilemedi:', { groupId, from, subject, messageId, error: err.message, stack: err.stack });
      throw err;
    }
  },
  getCurrentQrCode: function () {
    return {
      qrCode: state.currentQrCode,
      message: state.isWhatsAppReady ? 'WhatsApp zaten bağlı.' : (state.currentQrCode ? null : 'QR kodu oluşturuluyor, lütfen birkaç saniye bekleyin.'),
      phoneNumber: this.phoneNumber
    };
  },
  logout
};

module.exports = singleton;