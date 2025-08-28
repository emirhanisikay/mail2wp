function refreshRules() {
    fetch('/api/config')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(config => {
            document.getElementById('group-id').value = config.groupId || '';
            document.getElementById('user-email').textContent = config.userEmail || 'E-posta adresi alınamadı';
            const rulesDiv = document.getElementById('rules');
            rulesDiv.innerHTML = '';
            config.rules.forEach((rule, index) => {
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
            console.error('Error fetching config:', err);
            document.getElementById('user-email').textContent = 'E-posta adresi alınamadı';
        });
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
function reauthorize() {
    fetch('/api/reauthorize')
        .then(response => response.json())
        .then(data => {
            if (data.authUrl) {
                const authSection = document.getElementById('auth-section');
                const authUrlLink = document.getElementById('auth-url');
                authUrlLink.href = data.authUrl;
                authUrlLink.textContent = data.authUrl;
                authSection.style.display = 'block';
                document.getElementById('auth-code').value = '';
            } else {
                document.getElementById('user-email').textContent = 'Yetkilendirme URL’si alınamadı';
            }
        })
        .catch(err => {
            console.error('Yetkilendirme hatası:', err);
            document.getElementById('user-email').textContent = 'Yetkilendirme başarısız';
        });
}
function completeAuth() {
    const code = document.getElementById('auth-code').value;
    if (!code) {
        alert('Lütfen kodu girin.');
        return;
    }
    fetch('/api/complete-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
    })
        .then(response => response.json())
        .then(data => {
            if (data.userEmail) {
                document.getElementById('user-email').textContent = data.userEmail;
                document.getElementById('auth-section').style.display = 'none';
                refreshRules();
            } else {
                document.getElementById('user-email').textContent = 'E-posta adresi alınamadı';
            }
        })
        .catch(err => {
            console.error('Yetkilendirme tamamlanırken hata:', err);
            document.getElementById('user-email').textContent = 'Yetkilendirme başarısız';
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
                whatsappStatus.textContent = 'WhatsApp bağlı.';
                whatsappError.style.display = 'none';
                loadGroups();
            } else {
                whatsappSection.style.display = 'block';
                whatsappQr.src = '';
                whatsappLogout.style.display = 'none';
                groupSelectSection.style.display = 'none';
                whatsappStatus.textContent = data.message || 'WhatsApp bağlantı durumu kontrol ediliyor...';
                whatsappError.style.display = 'block';
                whatsappError.textContent = data.message || 'QR kodu oluşturuluyor, lütfen birkaç saniye bekleyin.';
            }
        })
        .catch(err => {
            console.error('WhatsApp durumu alınırken hata:', err);
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
    refreshRules();
    checkWhatsAppStatus();
    setInterval(checkWhatsAppStatus, 3000);
};
