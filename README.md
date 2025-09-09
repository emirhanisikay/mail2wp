# Mail2Wp - Gelişmiş E-posta'dan WhatsApp'a Yönlendirici

Mail2Wp, belirlediğiniz kurallara göre Gmail hesabınıza gelen e-postaları okur ve bu e-postaların içeriğini bir web paneli üzerinden seçtiğiniz WhatsApp grubuna anında bildirim olarak gönderir.

[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/) [![Express.js](https://img.shields.io/badge/Express.js-4.x-blue.svg)](https://expressjs.com/) [![PM2](https://img.shields.io/badge/PM2-stable-brightgreen.svg)](https://pm2.keymetrics.io/) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Genel Bakış

Bu uygulama, Gmail API ve Baileys (WhatsApp Web API) kütüphanelerini kullanarak güçlü bir otomasyon sağlar. Tüm yönetim işlemleri, kullanıcı dostu bir web arayüzü üzerinden kolayca yapılabilir. Servisi başlatıp durdurabilir, kurallar ekleyip silebilir ve WhatsApp bağlantınızı yönetebilirsiniz.

![Uygulama Arayüzü](appui.jpg)

## Özellikler

- **Web Tabanlı Kontrol Paneli:** Tüm ayarları ve servis durumunu yönetmek için modern ve kullanıcı dostu bir arayüz.
- **Detaylı Kural Yönetimi:** E-postaları sadece göndericiye göre değil, aynı zamanda e-posta konusundaki belirli anahtar kelimelere göre de filtreleme.
- **Dinamik Grup Seçimi:** Bağlı WhatsApp hesabındaki tüm gruplar listelenir ve hedef grup arayüzden seçilebilir.
- **Güvenli Yetkilendirme:** Google için OAuth 2.0 ve WhatsApp için QR kod ile güvenli bağlantı.
- **Durum İzleme:** Servisin (Aktif/Pasif), Gmail ve WhatsApp bağlantı durumlarının anlık olarak panelden takibi.
- **Akıllı Kuyruk Mekanizması:** WhatsApp bağlantısı koptuğunda veya mesaj gönderimi başarısız olduğunda e-postalar bir kuyruğa alınır ve bağlantı kurulduğunda otomatik olarak gönderilir. Kuyruk panelden izlenebilir.
- **Süreç Yönetimi:** `pm2` desteği ile uygulamanın sunucuda sürekli ve kararlı bir şekilde çalışması sağlanır.
- **Zamanlanmış Başlatma:** E-posta yönlendirmesinin gelecekte belirli bir tarih ve saatte başlaması için zamanlama özelliği.

## Kullanılan Teknolojiler

- [Node.js](https://nodejs.org/)
- [Express.js](https://expressjs.com/)
- [googleapis (Gmail API)](https://github.com/googleapis/google-api-nodejs-client)
- [@whiskeysockets/baileys (WhatsApp API)](https://github.com/WhiskeySockets/Baileys)
- [node-cron](https://github.com/node-cron/node-cron)
- [PM2](https://pm2.keymetrics.io/)

## Kurulum

1.  **Projeyi Klonlayın:**
    ```bash
    git clone <proje-linkiniz>
    cd <proje-klasoru>
    ```

2.  **Bağımlılıkları Yükleyin:**
    ```bash
    npm install
    ```

3.  **Google Cloud Projesi ve Gmail API'si:**
    - Google Cloud Platform'da bir proje oluşturun ve **Gmail API**'sini etkinleştirin.
    - **OAuth 2.0 istemci kimliği** oluşturun ve yetkilendirme bilgilerini içeren `credentials.json` dosyasını indirin.
    - İndirdiğiniz `credentials.json` dosyasını projenin içindeki `/config` klasörüne taşıyın.
    - `config/token.json` ve `config/config.json` dosyaları ilk çalıştırmadan sonra otomatik olarak oluşturulacaktır.

## Uygulamayı Başlatma

- **Geliştirme Ortamı İçin:**
  Uygulamayı doğrudan çalıştırmak için (package.json dosyanıza bir "start" script'i eklemeniz önerilir):
  ```bash
  npm start
  # veya
  node src/index.js