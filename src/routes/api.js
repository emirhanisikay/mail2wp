const express = require('express');
const router = express.Router();
const whatsapp = require('../services/whatsapp');
const { authorize, getNewAuthUrl, completeAuth, getUserEmail } = require('../services/gmail');
const { config, saveConfig } = require('../config');
const sharedState = require('../sharedState');
const { getEmails, processEmailQueue } = require('../services/gmail');

router.get('/status', (req, res) => {
    res.json({
        isServiceActive: sharedState.isServiceActive,
        startTime: sharedState.startTime
    });
});

router.get('/queue', (req, res) => {
    res.json({ emailQueue: sharedState.emailQueue });
});

router.post('/start', (req, res) => {
    sharedState.isServiceActive = true;
    res.json({ success: true });
});

router.post('/stop', (req, res) => {
    sharedState.isServiceActive = false;
    res.json({ success: true });
});

router.post('/start-time', (req, res) => {
    const { startTime } = req.body;
    if (startTime) {
        sharedState.startTime = startTime;
    }
    res.json({ success: true });
});

router.get('/config', async (req, res) => {
    try {
        const auth = await authorize(); // Get oAuth2Client from authorize
        const userEmail = await getUserEmail(auth); // Pass auth to getUserEmail
        res.json({
            groupId: config.groupId,
            rules: config.rules,
            userEmail: userEmail || null,
            needsAuth: !userEmail
        });
    } catch (err) {
        console.error('Config endpoint hatası:', err.message, err.stack);
        res.status(200).json({
            groupId: config.groupId,
            rules: config.rules,
            userEmail: null,
            needsAuth: true,
            error: 'Gmail yetkilendirmesi alınamadı'
        });
    }
});

router.post('/group-id', (req, res) => {
    const { groupId } = req.body;
    config.groupId = groupId;
    saveConfig();
    res.json({ success: true });
});

router.post('/rules', (req, res) => {
    const { rule } = req.body;
    config.rules.push(rule);
    saveConfig();
    res.json({ success: true });
});

router.delete('/rules/:index', (req, res) => {
    const index = parseInt(req.params.index);
    if (index >= 0 && index < config.rules.length) {
        config.rules.splice(index, 1);
        saveConfig();
    }
    res.json({ success: true });
});

router.get('/reauthorize', async (req, res) => {
    try {
        const authUrl = await getNewAuthUrl();
        if (typeof authUrl !== 'string') {
            throw new Error('Invalid authUrl format');
        }
        res.json({ authUrl });
    } catch (err) {
        console.error('Yetkilendirme URL hatası:', err);
        res.status(500).json({ error: 'Yetkilendirme URL’si alınamadı' });
    }
});

router.post('/complete-auth', async (req, res) => {
    const { code } = req.body;
    const sanitizedCode = code ? code.trim() : null;
    console.log('Received authorization code:', sanitizedCode);
    console.log('Raw code length:', code ? code.length : 0, 'Sanitized code length:', sanitizedCode ? sanitizedCode.length : 0);
    try {
        if (!sanitizedCode) {
            throw new Error('Yetkilendirme kodu sağlanmadı.');
        }
        const oAuth2Client = await completeAuth(sanitizedCode);
        const userEmail = await getUserEmail(oAuth2Client);
        if (!userEmail) {
            throw new Error('Kullanıcı e-posta adresi alınamadı.');
        }
        res.json({ userEmail });
    } catch (err) {
        console.error('Yetkilendirme tamamlanma hatası:', err);
        res.status(500).json({ error: 'Yetkilendirme başarısız', details: err.message });
    }
});

router.get('/oauth2callback', async (req, res) => {
    const { code } = req.query;
    console.log('OAuth callback received code:', code);
    try {
        if (!code) {
            throw new Error('Yetkilendirme kodu sağlanmadı.');
        }
        const oAuth2Client = await completeAuth(code);
        const userEmail = await getUserEmail(oAuth2Client);
        if (!userEmail) {
            throw new Error('Kullanıcı e-posta adresi alınamadı.');
        }
        res.redirect(`/?userEmail=${encodeURIComponent(userEmail)}`);
    } catch (err) {
        console.error('OAuth callback hatası:', err);
        res.status(500).send(`Yetkilendirme başarısız: ${err.message}`);
    }
});

router.get('/whatsapp-qr', (req, res) => {
    const qrData = whatsapp.getCurrentQrCode();
    res.json(qrData);
});

router.post('/whatsapp-logout', async (req, res) => {
    try {
        const result = await whatsapp.logout();
        res.json(result);
    } catch (err) {
        console.error('WhatsApp çıkış hatası:', err.message);
        res.status(500).json({ error: 'Çıkış yapılamadı' });
    }
});

router.get('/whatsapp-groups', async (req, res) => {
    try {
        if (!whatsapp.isWhatsAppReady) {
            return res.json({ groups: [] });
        }
        const chats = await whatsapp.client.getChats();
        const groups = chats
            .filter(chat => chat.isGroup)
            .map(chat => ({
                id: chat.id._serialized,
                name: chat.name
            }));
        res.json({ groups });
    } catch (err) {
        console.error('Gruplar alınırken hata:', err.message);
        res.status(500).json({ error: 'Gruplar alınamadı' });
    }
});

router.delete('/queue/:id', (req, res) => {
    const { id } = req.params;
    const index = sharedState.emailQueue.findIndex(email => email.id === id);
    if (index > -1) {
        sharedState.emailQueue.splice(index, 1);
    }
    res.json({ success: true });
});

router.delete('/queue', (req, res) => {
    sharedState.emailQueue = [];
    res.json({ success: true });
});

module.exports = router;
