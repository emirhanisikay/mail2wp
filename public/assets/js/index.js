function refreshRules() {
    fetch('/api/config')
        .then(response => {
            if (!response.ok) throw new Error('Config endpoint yanıt vermedi');
            return response.json();
        })
        .then(config => {
            document.getElementById('group-id').value = config.groupId || '';
            document.getElementById('user-email').textContent = config.userEmail || 'Yetkilendirme gerekli';
            const rulesDiv = document.getElementById('rules');
            rulesDiv.innerHTML = '';
            (config.rules || []).forEach((rule, index) => {
                const ruleDiv = document.createElement('div');
                ruleDiv.className = 'rule';
                ruleDiv.innerHTML = `
                    <div class="rule-details">
                        <strong>Gönderen:</strong> ${rule.sender}<br>
                        <strong>Konular:</strong> ${rule.subjects ? rule.subjects.join(', ') : 'Filtre Yok'}
                    </div>
                    <div class="rule-actions">
                        <button onclick="deleteRule(${index})">Sil</button>
                    </div>
                `;
                rulesDiv.appendChild(ruleDiv);
            });
        })
        .catch(err => {
            console.error('Config alınırken hata:', err);
            document.getElementById('user-email').textContent = 'Gmail yetkilendirmesi alınamadı, lütfen yeniden yetkilendirin.';
            document.getElementById('auth-section').style.display = 'block';
        });
}

function updateServiceStatus() {
    fetch('/api/status')
        .then(response => response.json())
        .then(data => {
            const statusDiv = document.getElementById('service-status');
            if (data.isServiceActive) {
                statusDiv.textContent = 'Aktif';
                statusDiv.className = 'active';
            } else {
                statusDiv.textContent = 'Pasif';
                statusDiv.className = 'inactive';
            }

            const startTimeSpan = document.getElementById('current-start-time');
            const date = new Date(data.startTime * 1000);
            startTimeSpan.textContent = date.toLocaleString();
        });
}

function updateEmailQueue() {
    fetch('/api/queue')
        .then(response => response.json())
        .then(data => {
            const queueDiv = document.getElementById('email-queue');
            queueDiv.innerHTML = '';
            if (data.emailQueue.length === 0) {
                queueDiv.innerHTML = '<p>Kuyrukta e-posta bulunmuyor.</p>';
            } else {
                data.emailQueue.forEach(email => {
                    const queueItemDiv = document.createElement('div');
                    queueItemDiv.className = 'queue-item';
                    queueItemDiv.innerHTML = `
                        <div class="queue-item-details">
                            <strong>Gönderen:</strong> ${email.from}<br>
                            <strong>Konu:</strong> ${email.subject}<br>
                            <strong>Alınma Zamanı:</strong> ${email.receivedAt}
                        </div>
                        <div class="queue-item-actions">
                            <button onclick="removeFromQueue('${email.id}')">Kuyruktan Çıkar</button>
                        </div>
                    `;
                    queueDiv.appendChild(queueItemDiv);
                });
            }
        });
}

function removeFromQueue(emailId) {
    fetch(`/api/queue/${emailId}`, { method: 'DELETE' })
        .then(response => {
            if (!response.ok) {
                throw new Error('E-posta kuyruktan silinemedi.');
            }
            return response.json();
        })
        .then(data => {
            console.log('E-posta kuyruktan başarıyla silindi.');
            updateEmailQueue();
        })
        .catch(err => {
            console.error('E-posta silinirken hata:', err);
            alert('E-posta kuyruktan silinirken bir hata oluştu.');
        });
}

function startService() {
    fetch('/api/start', { method: 'POST' }).then(() => {
        updateServiceStatus();
        updateEmailQueue();
    });
}

function stopService() {
    fetch('/api/stop', { method: 'POST' }).then(() => {
        updateServiceStatus();
        updateEmailQueue();
    });
}

function clearQueue() {
    fetch('/api/queue', { method: 'DELETE' })
        .then(response => {
            if (!response.ok) {
                throw new Error('Kuyruk temizlenemedi.');
            }
            return response.json();
        })
        .then(data => {
            console.log('Kuyruk başarıyla temizlendi.');
            updateEmailQueue();
        })
        .catch(err => {
            console.error('Kuyruk temizlenirken hata:', err);
            alert('Kuyruk temizlenirken bir hata oluştu.');
        });
}

function updateStartTime() {
    const startTime = document.getElementById('start-time-picker').value;
    if (!startTime) {
        alert('Lütfen bir tarih ve saat seçin.');
        return;
    }
    const timestamp = Math.floor(new Date(startTime).getTime() / 1000);
    fetch('/api/start-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startTime: timestamp })
    }).then(updateServiceStatus);
}

function updateGroupId() {
    const groupId = document.getElementById('group-id').value;
    if (!groupId) {
        alert('Lütfen bir grup seçin veya grup ID’sini girin.');
        return;
    }
    fetch('/api/group-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId })
    }).then(refreshRules);
}

function addRule() {
    const sender = document.getElementById('new-sender').value;
    const subjects = document.getElementById('new-subjects').value.split(',').map(s => s.trim()).filter(s => s);
    fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rule: { sender, subjects: subjects.length > 0 ? subjects : undefined } })
    }).then(() => {
        document.getElementById('new-sender').value = '';
        document.getElementById('new-subjects').value = '';
        refreshRules();
    });
}

function deleteRule(index) {
    fetch(`/api/rules/${index}`, { method: 'DELETE' }).then(refreshRules);
}

function fetchConfig() {
    fetch('/api/config')
        .then(response => response.json())
        .then(data => {
            if (data.userEmail) {
                document.getElementById('user-email').textContent = data.userEmail;
                document.getElementById('auth-section').style.display = 'none';
            } else {
                document.getElementById('user-email').textContent = 'Yetkilendirme gerekli';
                document.getElementById('auth-section').style.display = 'block';
                // Only call reauthorize if not in the process of completing auth
                if (data.needsAuth && !window.location.search.includes('userEmail') && !document.getElementById('auth-code').value) {
                    reauthorize();
                }
            }
            if (data.groupId) {
                document.getElementById('group-id').value = data.groupId;
            }
            refreshRules();
        })
        .catch(err => {
            console.error('Config yüklenirken hata:', err);
            document.getElementById('user-email').textContent = 'Config yüklenemedi';
            document.getElementById('auth-section').style.display = 'block';
        });
}

function reauthorize() {
    fetch('/api/reauthorize')
        .then(response => {
            if (!response.ok) throw new Error('Reauthorize endpoint yanıt vermedi');
            return response.json();
        })
        .then(data => {
            if (data.authUrl && typeof data.authUrl === 'string' && data.authUrl.startsWith('https://accounts.google.com')) {
                window.open(data.authUrl, '_blank');
                document.getElementById('user-email').textContent = 'Lütfen Google ile oturum açın ve kodu aşağıya girin.';
                document.getElementById('auth-section').style.display = 'block';
            } else {
                throw new Error('Geçersiz yetkilendirme URL’si alındı');
            }
        })
        .catch(err => {
            console.error('Yetkilendirme hatası:', err);
            document.getElementById('user-email').textContent = 'Yetkilendirme başarısız: ' + err.message;
            document.getElementById('auth-section').style.display = 'block';
        });
}

function completeAuth() {
    const code = document.getElementById('auth-code').value.trim();
    if (!code) {
        alert('Lütfen kodu girin.');
        return;
    }
    console.log('Sending authorization code:', code);
    fetch('/api/complete-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Sunucu hatası: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            console.log('completeAuth response:', data);
            if (data.userEmail) {
                document.getElementById('user-email').textContent = data.userEmail;
                document.getElementById('auth-section').style.display = 'none';
                // Delay refreshRules to avoid immediate reauthorize
                setTimeout(refreshRules, 1000);
            } else {
                throw new Error(data.details || 'E-posta adresi alınamadı');
            }
        })
        .catch(err => {
            console.error('Yetkilendirme tamamlanırken hata:', err);
            document.getElementById('user-email').textContent = 'Yetkilendirme başarısız: ' + err.message;
            document.getElementById('auth-section').style.display = 'block';
        });
}

function checkWhatsAppStatus() {
    fetch('/api/whatsapp-qr')
        .then(response => response.json())
        .then(data => {
            const whatsappSection = document.getElementById('whatsapp-section');
            const whatsappQr = document.getElementById('whatsapp-qr');
            const whatsappStatus = document.getElementById('whatsapp-status');
            const whatsappLogout = document.getElementById('whatsapp-logout');
            const groupSelectSection = document.getElementById('group-select-section');
            const whatsappError = document.getElementById('whatsapp-error');

            console.log('WhatsApp durumu:', data, new Date().toISOString());

            if (data.qrCode) {
                whatsappQr.src = data.qrCode;
                whatsappSection.style.display = 'block';
                whatsappLogout.style.display = 'none';
                groupSelectSection.style.display = 'none';
                whatsappStatus.textContent = 'Lütfen QR kodunu tarayın.';
                whatsappError.style.display = 'none';
            } else if (data.message === 'WhatsApp zaten bağlı.') {
                whatsappSection.style.display = 'none';
                whatsappLogout.style.display = 'block';
                groupSelectSection.style.display = 'block';
                const cleanPhoneNumber = data.phoneNumber ? data.phoneNumber.replace('@c.us', '') : null;
                whatsappStatus.textContent = cleanPhoneNumber 
                    ? `${cleanPhoneNumber} telefon numaralı WhatsApp hattı bağlı durumda.` 
                    : 'WhatsApp bağlı, ancak telefon numarası alınamadı.';
                whatsappError.style.display = 'none';
                loadGroups();
            } else {
                whatsappSection.style.display = 'block';
                whatsappQr.src = '';
                whatsappLogout.style.display = 'none';
                groupSelectSection.style.display = 'none';
                whatsappStatus.textContent = data.message || 'WhatsApp bağlantı durumu kontrol ediliyor...';
                whatsappError.style.display = 'block';
                whatsappError.textContent = data.message || 'Bağlantı bekleniyor, lütfen birkaç saniye bekleyin.';
            }
        })
        .catch(err => {
            console.error('WhatsApp durumu alınırken hata:', err, new Date().toISOString());
            document.getElementById('whatsapp-status').textContent = 'WhatsApp bağlantı durumu alınamadı';
            document.getElementById('whatsapp-error').style.display = 'block';
            document.getElementById('whatsapp-error').textContent = 'Bağlantı hatası: ' + err.message;
            document.getElementById('group-select-section').style.display = 'none';
        });
}

function loadGroups() {
    fetch('/api/whatsapp-groups')
        .then(response => response.json())
        .then(data => {
            const groupSelect = document.getElementById('group-select');
            groupSelect.innerHTML = '<option value="">Bir grup seçin...</option>';
            if (data.groups && data.groups.length > 0) {
                data.groups.forEach(group => {
                    const option = document.createElement('option');
                    option.value = group.id;
                    option.textContent = group.name;
                    groupSelect.appendChild(option);
                });
                const currentGroupId = document.getElementById('group-id').value;
                if (currentGroupId) {
                    groupSelect.value = currentGroupId;
                }
            } else {
                groupSelect.innerHTML = '<option value="">Grup bulunamadı</option>';
            }
        })
        .catch(err => {
            console.error('Gruplar alınırken hata:', err);
            document.getElementById('group-select').innerHTML = '<option value="">Grup yüklenemedi</option>';
            document.getElementById('whatsapp-error').style.display = 'block';
            document.getElementById('whatsapp-error').textContent = 'Gruplar yüklenemedi: ' + err.message;
        });
}

function selectGroup() {
    const groupSelect = document.getElementById('group-select');
    const groupId = groupSelect.value;
    document.getElementById('group-id').value = groupId;
    if (groupId) {
        updateGroupId();
    }
}

function whatsappLogout() {
    fetch('/api/whatsapp-logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
        .then(response => response.json())
        .then(data => {
            document.getElementById('group-id').value = '';
            document.getElementById('group-select').innerHTML = '<option value="">Bir grup seçin...</option>';
            document.getElementById('group-select-section').style.display = 'none';
            document.getElementById('whatsapp-section').style.display = 'block';
            document.getElementById('whatsapp-qr').src = '';
            document.getElementById('whatsapp-logout').style.display = 'none';
            document.getElementById('whatsapp-status').textContent = 'Yeni QR kodu bekleniyor...';
            document.getElementById('whatsapp-error').style.display = 'none';
            setTimeout(checkWhatsAppStatus, 1000);
        })
        .catch(err => {
            console.error('Çıkış hatası:', err);
            document.getElementById('whatsapp-status').textContent = 'Çıkış başarısız';
            document.getElementById('whatsapp-error').style.display = 'block';
            document.getElementById('whatsapp-error').textContent = 'Çıkış hatası: ' + err.message;
            document.getElementById('group-select-section').style.display = 'none';
        });
}

window.onload = () => {
    fetchConfig();
    checkWhatsAppStatus();
    updateServiceStatus();
    updateEmailQueue();
    setInterval(checkWhatsAppStatus, 500);
    setInterval(updateServiceStatus, 5000);
    setInterval(updateEmailQueue, 5000);

    // Handle OAuth callback query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const userEmail = urlParams.get('userEmail');
    if (userEmail) {
        document.getElementById('user-email').textContent = userEmail;
        document.getElementById('auth-section').style.display = 'none';
        refreshRules();
    }
};
