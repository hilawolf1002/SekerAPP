#!/usr/bin/env node

/**
 * Health Check Script for SurveyPro
 * This script checks if the application is running properly
 */

const http = require('http');

const options = {
    hostname: 'localhost',
    port: 7766,
    path: '/health',
    method: 'GET',
    timeout: 5000
};

const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        if (res.statusCode === 200 && data.trim() === 'healthy') {
            console.log('✅ Application is healthy');
            process.exit(0);
        } else {
            console.log('❌ Application is unhealthy');
            process.exit(1);
        }
    });
});

req.on('error', (err) => {
    console.log('❌ Health check failed:', err.message);
    process.exit(1);
});

req.on('timeout', () => {
    console.log('❌ Health check timeout');
    req.destroy();
    process.exit(1);
});

req.end();
