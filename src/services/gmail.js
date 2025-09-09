const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const whatsapp = require('./whatsapp');
const { getEmailBody } = require('../utils/emailParser');
const { config, processedEmails, PROCESSED_EMAILS_PATH } = require('../config');
const sharedState = require('../sharedState');

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
        console.error('authorize error:', err.message, err.stack);
        throw err;
    }
}

async function getNewAuthUrl() {
    try {
        const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
        const { client_secret, client_id } = credentials.installed;
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, 'urn:ietf:wg:oauth:2.0:oob');
        const authUrl = oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
        return authUrl;
    } catch (err) {
        console.error('getNewAuthUrl error:', err.message, err.stack);
        throw err;
    }
}

async function completeAuth(code) {
    try {
        const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
        const { client_secret, client_id } = credentials.installed;
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, 'urn:ietf:wg:oauth:2.0:oob');
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
        return oAuth2Client;
    } catch (err) {
        console.error('completeAuth error:', err.message, err.stack);
        throw err;
    }
}

async function getUserEmail(auth) {
    if (!auth) {
        console.error('getUserEmail error: auth is undefined');
        return null;
    }
    const gmail = google.gmail({ version: 'v1', auth });
    try {
        const res = await gmail.users.getProfile({ userId: 'me' });
        return res.data.emailAddress;
    } catch (err) {
        console.error('getUserEmail error:', err.message, err.stack);
        return null;
    }
}

async function getEmails() {
    const auth = await authorize();
    const gmail = google.gmail({ version: 'v1', auth });

    if (!config || !config.rules || config.rules.length === 0) {
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

    const query = `${rulesQuery} after:${sharedState.startTime}`;

    try {
        const res = await gmail.users.messages.list({ userId: 'me', q: query });
        const messages = res.data.messages || [];

        if (messages.length === 0) {
            return;
        }

        messages.reverse();

        for (const message of messages) {
            try {
                if (processedEmails.has(message.id) || sharedState.emailQueue.some(item => item.messageId === message.id)) {
                    continue;
                }

                const msg = await gmail.users.messages.get({ userId: 'me', id: message.id });
                const headers = msg.data.payload.headers;
                const subject = headers.find(header => header.name === 'Subject')?.value || '[Konu yok]';
                const from = headers.find(header => header.name === 'From')?.value || '[Gönderici yok]';
                const receivedAt = new Date(parseInt(msg.data.internalDate)).toLocaleString();
                const body = getEmailBody(msg.data.payload);
                const emailData = { from, subject, body, messageId: message.id, receivedAt };

                if (sharedState.isServiceActive && whatsapp.isWhatsAppReady) {
                    try {
                        await whatsapp.sendToWhatsApp(emailData);
                        processedEmails.add(message.id);
                        fs.writeFileSync(PROCESSED_EMAILS_PATH, JSON.stringify([...processedEmails]));
                    } catch (err) {
                        console.error('WhatsApp’a gönderim hatası:', err.message, err.stack);
                        sharedState.emailQueue.push(emailData);
                    }
                } else {
                    sharedState.emailQueue.push(emailData);
                }
            } catch (err) {
                console.error('getEmails error for message:', message.id, err.message, err.stack);
            }
        }
    } catch (err) {
        console.error('getEmails error:', err.message, err.stack);
    }
}

async function processEmailQueue() {
    if (!sharedState.isServiceActive) {
        return;
    }
    if (!whatsapp.isWhatsAppReady || !whatsapp.client) {
        return;
    }
    const queue = [...sharedState.emailQueue];
    sharedState.emailQueue = [];
    for (const emailData of queue) {
        try {
            if (processedEmails.has(emailData.messageId)) {
                continue;
            }
            await whatsapp.sendToWhatsApp(emailData);
            processedEmails.add(emailData.messageId);
            fs.writeFileSync(PROCESSED_EMAILS_PATH, JSON.stringify([...processedEmails]));
        } catch (err) {
            console.error('processEmailQueue hata:', emailData.messageId, err.message, err.stack);
            sharedState.emailQueue.push(emailData); // Hata durumunda kuyruğa geri ekle
        }
    }
}

module.exports = {
    authorize,
    getNewAuthUrl,
    completeAuth,
    getUserEmail,
    getEmails,
    processEmailQueue
};