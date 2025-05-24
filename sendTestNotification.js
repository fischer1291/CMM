const fetch = require('node-fetch'); // ✅ explizit importieren

const message = {
    to: 'ExponentPushToken[KGG9usFmKJVihBHoNTdHzH]',
    sound: 'default',
    title: '📡 Test',
    body: '✅ Push Notification Test erfolgreich!',
    data: { test: true },
};

globalThis.fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
})
    .then(res => res.json())
    .then(data => console.log('✅ Expo Antwort:', data))
    .catch(err => console.error('❌ Fehler:', err));