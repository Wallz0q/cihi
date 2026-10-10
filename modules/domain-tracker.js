const axios = require('axios');
const dns = require('dns');
const https = require('https');

async function track(domain) {
    const cleanDomain = domain.toLowerCase().trim();
    
    // Get IP
    const ip = await new Promise((resolve) => {
        dns.lookup(cleanDomain, (err, address) => {
            resolve(err ? null : address);
        });
    });
    
    // Get DNS records
    const dnsRecords = await getDNSRecords(cleanDomain);
    
    // Get WHOIS (simplified)
    const whois = await getWhois(cleanDomain);
    
    // Get SSL certificate
    const ssl = await getSSL(cleanDomain);
    
    // Get server headers
    const server = await getServerHeaders(cleanDomain);
    
    // Check blacklist (simplified)
    const blacklist = false;
    
    return {
        domain: cleanDomain,
        ip: ip,
        dns: dnsRecords,
        whois: whois,
        ssl: ssl,
        server: server,
        blacklist: blacklist
    };
}

function getDNSRecords(domain) {
    return new Promise((resolve) => {
        const records = [];
        
        dns.resolve(domain, 'A', (err, addresses) => {
            if (!err && addresses) {
                addresses.forEach(addr => records.push({ type: 'A', value: addr }));
            }
            
            dns.resolve(domain, 'MX', (err, mx) => {
                if (!err && mx) {
                    mx.forEach(m => records.push({ type: 'MX', value: `${m.exchange} (priority: ${m.priority})` }));
                }
                
                dns.resolve(domain, 'TXT', (err, txt) => {
                    if (!err && txt) {
                        txt.forEach(t => records.push({ type: 'TXT', value: t }));
                    }
                    
                    dns.resolve(domain, 'CNAME', (err, cname) => {
                        if (!err && cname) {
                            cname.forEach(c => records.push({ type: 'CNAME', value: c }));
                        }
                        
                        dns.resolve(domain, 'NS', (err, ns) => {
                            if (!err && ns) {
                                ns.forEach(n => records.push({ type: 'NS', value: n }));
                            }
                            
                            resolve(records);
                        });
                    });
                });
            });
        });
    });
}

function getWhois(domain) {
    // Simplified WHOIS (would need actual whois service)
    return {
        registrar: 'Unknown',
        created: 'Unknown',
        expired: 'Unknown',
        name: 'Unknown',
        email: 'Unknown'
    };
}

function getSSL(domain) {
    return new Promise((resolve) => {
        const options = {
            hostname: domain,
            port: 443,
            method: 'HEAD',
            rejectUnauthorized: false
        };
        
        const req = https.request(options, (res) => {
            const cert = res.connection.getPeerCertificate();
            if (cert && cert.issuer) {
                resolve({
                    issuer: cert.issuer.CN || 'Unknown',
                    validFrom: new Date(cert.valid_from).toISOString(),
                    validTo: new Date(cert.valid_to).toISOString(),
                    subject: cert.subject.CN || 'Unknown'
                });
            } else {
                resolve({
                    issuer: 'No SSL',
                    validFrom: 'N/A',
                    validTo: 'N/A',
                    subject: 'N/A'
                });
            }
        });
        
        req.on('error', () => {
            resolve({
                issuer: 'No SSL',
                validFrom: 'N/A',
                validTo: 'N/A',
                subject: 'N/A'
            });
        });
        
        req.end();
    });
}

async function getServerHeaders(domain) {
    try {
        const response = await axios.get(`https://${domain}`, { timeout: 5000 });
        return response.headers.server || 'Unknown';
    } catch {
        return 'Unknown';
    }
}

module.exports = { track };