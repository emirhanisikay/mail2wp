function getEmailBody(payload) {
  let body = '';
  try {
    if (payload.parts) {
      for (const part of payload.parts) {
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
    body = '[E-posta içeriği alınamadı]';
  }
  return body;
}

module.exports = { getEmailBody };