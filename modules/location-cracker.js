const axios = require('axios');
const db = require('../database');

async function trackLive(ip) {
    const response = await axios.get(`http://ip-api.com/json/${ip}`);
    const data = response.data;
    
    if (data.status === 'fail') {
        throw new Error('IP tidak valid');
    }
    
    // Save to database
    db.run(
        'INSERT OR REPLACE INTO live_location (ip, lat, lon, city, country, last_update) VALUES (?, ?, ?, ?, ?, ?)',
        [ip, data.lat, data.lon, data.city, data.country, new Date().toISOString()]
    );
    
    return {
        ip: data.query,
        city: data.city,
        country: data.country,
        lat: data.lat,
        lon: data.lon,
        lastUpdate: new Date().toISOString()
    };
}

module.exports = { trackLive };