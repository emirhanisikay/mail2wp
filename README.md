# Mail2WP

Mail2WP, Gmail hesabınızdan gelen e-posta mesajlarını belirli kurallara göre filtreleyerek WhatsApp gruplarına yönlendiren bir Node.js uygulamasıdır. Gmail API ile e-postaları okur ve `whatsapp-web.js` ile mesajları belirtilen WhatsApp gruplarına gönderir. Kullanıcı dostu bir web arayüzü üzerinden yapılandırma yapılabilir.

## Özellikler

- **E-posta İzleme**: Gmail hesabınızdan gelen e-postaları gerçek zamanlı olarak izler.
- **Filtreleme Kuralları**: Gönderen e-posta adresi ve konu bazlı filtreleme ile hangi mesajların yönlendirileceğini belirtebilirsiniz.
- **WhatsApp Entegrasyonu**: WhatsApp gruplarına otomatik mesaj gönderimi.
- **Web Arayüzü**: Modern ve kurumsal tasarıma sahip bir arayüz ile kolay yapılandırma.
- **Responsive Tasarım**: Mobil cihazlarla uyumlu kullanıcı arayüzü.

## Gereksinimler

- **Node.js**: v16 veya üstü
- **Google Cloud Console**: Gmail API için OAuth 2.0 kimlik bilgileri (`credentials.json`)
- **WhatsApp Hesabı**: Mesaj göndermek için bir WhatsApp hesabı
- **Bağımlılıklar**:
  - `express`
  - `whatsapp-web.js`
  - `qrcode`
  - `qrcode-terminal`
  - `googleapis`
  - `node-cron`

## Kurulum

### 1. Depoyu Klonlayın

```bash
git clone https://github.com/emirhanisikay/mail2wp.git
cd mail2wp
```

### 2. Bağımlılıkları Yükleyin

```bash
npm install
```

### 3. Google API Kimlik Bilgilerini Yapılandırın

- Google Cloud Console'da bir proje oluşturun ve Gmail API'yi etkinleştirin.
- OAuth 2.0 kimlik bilgileri (`credentials.json`) dosyasını indirin ve `config/` dizini oluşturun ve buraya yerleştirin.
- Gerekli kapsam: `https://www.googleapis.com/auth/gmail.readonly`

### 4. Yapılandırma Dosyası Oluşturun

`config/config.json` dosyasını oluşturun:

```json
{
  "groupId": "",
  "rules": []
}
```

### 5. Uygulamayı Başlatın

```bash
npm start
```

### 6. Web Arayüzünü Kullanın

- Tarayıcıda `http://localhost:3000` adresine gidin.
- Google hesabınızla oturum açın.
- WhatsApp QR kodunu tarayarak bağlanın (WhatsApp &gt; Ayarlar &gt; Bağlı Cihazlar &gt; Cihaz Bağla).
- Yönlendirme kuralları ve WhatsApp grup ID'sini yapılandırın.

## Kullanım

1. **E-posta Oturumu**:
   - Web arayüzünde "Yeniden Oturum Aç" butonuna tıklayın.
   - Google hesabınızla oturum açın ve yetkilendirme kodunu girin.
2. **WhatsApp Bağlantısı**:
   - QR kodunu tarayarak WhatsApp hesabınızı bağlayın.
   - Bağlantı başarılı olduğunda grup seçim menüsü görünür.
3. **Yönlendirme Kuralları**:
   - Gönderen e-posta adresi ve isteğe bağlı konu filtreleri ekleyin.
   - Kuralları kaydedin; e-postalar otomatik olarak belirtilen WhatsApp grubuna yönlendirilir.

## Proje Yapısı

```
mail2wp/
├── public/
│   └── index.html        # Web arayüzü
├── src/
│   ├── index.js          # Ana sunucu dosyası
│   ├── routes/
│   │   └── api.js        # API rotaları
│   ├── services/
│   │   ├── gmail.js      # Gmail API işlemleri
│   │   └── whatsapp.js   # WhatsApp entegrasyonu
├── config/               # Yapılandırma dosyaları (gitignore'da hariç tutulur)
├── .gitignore            # Hariç tutulacak dosyalar
├── README.md             # Proje dokümantasyonu
├── LICENSE               # MIT Lisansı
└── package.json          # Bağımlılıklar ve komutlar
```

## Lisans

Bu proje MIT Lisansı altında lisanslanmıştır.

## Katkıda Bulunma

Katkılarınızı bekliyorum, Lütfen bir Pull Request açmadan önce GitHub Issues üzerinden mevcut sorunları kontrol edin.

## İletişim

Sorularınız veya geri bildirimleriniz için GitHub Issues üzerinden iletişime geçebilirsiniz.

## Teşekkür

- whatsapp-web.js için Pedro Lopez'e.

Google APIs için Google ekibine.