const striptags = require('striptags');

function getEmailBody(payload) {
    let body = '';

    if (payload.parts) {
        // Çok parçalı e-posta (ör. hem HTML hem düz metin içeriyorsa)
        const textPart = payload.parts.find(part => part.mimeType === 'text/plain');
        const htmlPart = payload.parts.find(part => part.mimeType === 'text/html');

        if (textPart && textPart.body && textPart.body.data) {
            // Düz metin varsa, onu kullan
            body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
        } else if (htmlPart && htmlPart.body && htmlPart.body.data) {
            // HTML varsa, etiketleri temizle
            const htmlBody = Buffer.from(htmlPart.body.data, 'base64').toString('utf-8');
            body = striptags(htmlBody).replace(/\n\s*\n/g, '\n'); // Fazla boş satırları temizle
        }
    } else if (payload.body && payload.body.data) {
        // Tek parçalı e-posta (genelde düz metin)
        body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
        if (payload.mimeType === 'text/html') {
            body = striptags(body).replace(/\n\s*\n/g, '\n'); // HTML etiketlerini temizle
        }
    }

    // Fazladan boşlukları ve satır sonlarını temizle
    body = body.trim().replace(/\r\n/g, '\n');

    return body;
}

module.exports = { getEmailBody };