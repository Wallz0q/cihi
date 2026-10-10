const axios = require('axios');
const dns = require('dns');
const net = require('net');

async function track(ip) {
    // Get location data from ip-api
    const locationRes = await axios.get(`http://ip-api.com/json/${ip}`);
    const data = locationRes.data;
    
    if (data.status === 'fail') {
        throw new Error('IP tidak valid atau tidak ditemukan');
    }
    
    // Scan ports
    const ports = [
        { port: 80, name: 'HTTP' },
        { port: 443, name: 'HTTPS' },
        { port: 22, name: 'SSH' },
        { port: 21, name: 'FTP' },
        { port: 8080, name: 'HTTP-Alt' },
        { port: 3306, name: 'MySQL' },
        { port: 5432, name: 'PostgreSQL' },
        { port: 3389, name: 'RDP' },
        { port: 5900, name: 'VNC' },
        { port: 4444, name: 'Blaster' },
        { port: 6667, name: 'IRC' },
        { port: 25565, name: 'Minecraft' }
    ];
    
    const portResults = await Promise.all(ports.map(p => checkPort(ip, p.port)));
    
    // Reverse DNS
    const reverseDns = await new Promise((resolve) => {
        dns.reverse(ip, (err, hostnames) => {
            resolve(err ? null : hostnames[0]);
        });
    });
    
    // Check abuse database (simplified)
    const abuse = false; // Would need actual abuse API
    
    // Check proxy/VPN/TOR
    const proxyCheck = await checkProxy(ip);
    
    return {
        ip: data.query,
        city: data.city,
        region: data.regionName,
        country: data.country,
        lat: data.lat,
        lon: data.lon,
        isp: data.isp,
        timezone: data.timezone,
        asn: data.as,
        org: data.org,
        ports: portResults,
        reverseDns: reverseDns,
        abuse: abuse,
        proxy: proxyCheck,
        mapsLink: `https://www.google.com/maps?q=${data.lat},${data.lon}`
    };
}

function checkPort(ip, port) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const timeout = 2000;
        
        socket.setTimeout(timeout);
        socket.once('connect', () => {
            socket.destroy();
            resolve({ port, status: 'OPEN' });
        });
        socket.once('timeout', () => {
            socket.destroy();
            resolve({ port, status: 'CLOSED' });
        });
        socket.once('error', () => {
            socket.destroy();
            resolve({ port, status: 'CLOSED' });
        });
        socket.connect(port, ip);
    });
}

async function checkProxy(ip) {
    try {
        const response = await axios.get(`http://ip-api.com/json/${ip}`);
        const data = response.data;
        return data.proxy || data.hosting || false;
    } catch {
        return false;
    }
}

module.exports = { track };