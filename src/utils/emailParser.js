function getEmailBody(payload) {
  let body = '';
  console.log('[DEBUG] E-posta payload alınıyor:', JSON.stringify(payload, null, 2));
  try {
    if (payload.parts) {
      for (const part of payload.parts) {
        console.log(`[DEBUG] Mime type kontrol ediliyor: ${part.mimeType}`);
        if (part.mimeType === 'text/plain' && part.body && part.body.data) {
          body = Buffer.from(part.body.data, 'base64').toString('utf-8');
          break;
        } else if (part.mimeType === 'text/html' && part.body && part.body.data) {
          body = Buffer.from(part.body.data, 'base64').toString('utf-8').replace(/<[^>]+>/g, '');
        }
      }
    } else if (payload.body && payload.body.data) {
      body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    } else {
      body = '[E-posta içeriği alınamadı]';
    }
  } catch (err) {
    console.error('E-posta gövdesi alınırken hata:', err.message);
    body = '[E-posta içeriği alınamadı]';
  }
  console.log('[DEBUG] Dönen e-posta içeriği:', body);
  return body;
}

module.exports = { getEmailBody };