// SSL Configuration for SekerApp
// This file contains SSL/TLS configuration options

const fs = require('fs');
const path = require('path');

// SSL Configuration
const sslConfig = {
    // Let's Encrypt paths (production)
    letsencrypt: {
        key: '/etc/letsencrypt/live/sekerapp.online/privkey.pem',
        cert: '/etc/letsencrypt/live/sekerapp.online/fullchain.pem'
    },
    
    // Local SSL paths (development)
    local: {
        key: './ssl/private.key',
        cert: './ssl/certificate.crt'
    },
    
    // SSL Options
    options: {
        // Modern SSL/TLS configuration
        minVersion: 'TLSv1.2',
        maxVersion: 'TLSv1.3',
        ciphers: [
            'ECDHE-ECDSA-AES128-GCM-SHA256',
            'ECDHE-RSA-AES128-GCM-SHA256',
            'ECDHE-ECDSA-AES256-GCM-SHA384',
            'ECDHE-RSA-AES256-GCM-SHA384',
            'ECDHE-ECDSA-CHACHA20-POLY1305',
            'ECDHE-RSA-CHACHA20-POLY1305',
            'DHE-RSA-AES128-GCM-SHA256',
            'DHE-RSA-AES256-GCM-SHA384'
        ].join(':'),
        honorCipherOrder: true,
        requestCert: false,
        rejectUnauthorized: false
    }
};

// Function to check SSL certificate availability
function checkSSLCertificates() {
    const available = {
        letsencrypt: false,
        local: false,
        sslOptions: null
    };
    
    try {
        // Check Let's Encrypt certificates
        if (fs.existsSync(sslConfig.letsencrypt.key) && 
            fs.existsSync(sslConfig.letsencrypt.cert)) {
            available.letsencrypt = true;
            available.sslOptions = {
                key: fs.readFileSync(sslConfig.letsencrypt.key),
                cert: fs.readFileSync(sslConfig.letsencrypt.cert),
                ...sslConfig.options
            };
            console.log('✅ Let\'s Encrypt SSL certificates found');
        }
    } catch (error) {
        console.log('⚠️ Let\'s Encrypt certificates not accessible:', error.message);
    }
    
    try {
        // Check local SSL certificates
        if (fs.existsSync(sslConfig.local.key) && 
            fs.existsSync(sslConfig.local.cert)) {
            available.local = true;
            if (!available.sslOptions) {
                available.sslOptions = {
                    key: fs.readFileSync(sslConfig.local.key),
                    cert: fs.readFileSync(sslConfig.local.cert),
                    ...sslConfig.options
                };
            }
            console.log('✅ Local SSL certificates found');
        }
    } catch (error) {
        console.log('⚠️ Local SSL certificates not accessible:', error.message);
    }
    
    return available;
}

// Function to create self-signed certificate for development
function createSelfSignedCertificate() {
    const { execSync } = require('child_process');
    const sslDir = './ssl';
    
    try {
        // Create SSL directory if it doesn't exist
        if (!fs.existsSync(sslDir)) {
            fs.mkdirSync(sslDir, { recursive: true });
        }
        
        // Generate self-signed certificate
        const command = `openssl req -x509 -newkey rsa:4096 -keyout ${sslDir}/private.key -out ${sslDir}/certificate.crt -days 365 -nodes -subj "/C=IL/ST=Israel/L=Tel Aviv/O=SekerApp/CN=localhost"`;
        
        execSync(command, { stdio: 'inherit' });
        console.log('✅ Self-signed SSL certificate created successfully');
        
        return true;
    } catch (error) {
        console.error('❌ Failed to create self-signed certificate:', error.message);
        console.log('💡 Make sure OpenSSL is installed on your system');
        return false;
    }
}

module.exports = {
    sslConfig,
    checkSSLCertificates,
    createSelfSignedCertificate
};
