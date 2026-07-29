const https = require('https');
const querystring = require('querystring');

class MicropayService {
    constructor() {
        this.baseUrl = 'https://www.micropay.co.il'; // Updated to HTTPS
        this.endpoint = '/extApi/scheduleSms.php';
        this.token = process.env.MICROPAY_TOKEN;
        this.defaultFrom = process.env.MICROPAY_FROM;
        
        if (!this.token) {
            throw new Error('MICROPAY_TOKEN is required in environment variables');
        }
    }

    /**
     * Send personalized SMS messages
     * @param {Object} options
     * @param {string} options.from - Sender name/number
     * @param {Object} options.listMap - Map of phone:message
     * @param {Object} options.schedule - Schedule parameters (dy, dm, dd, dh, di)
     * @param {Object} options.alerts - Alert parameters (np, ne)
     * @param {boolean} options.validate - Whether to validate recipients
     * @returns {Promise<Object>} Response with tid or error
     */
    async sendPersonalizedSMS(options) {
        const { from, listMap, schedule, alerts, validate } = options;
        
        if (!from) {
            throw new Error('From field is required');
        }
        
        if (!listMap || Object.keys(listMap).length === 0) {
            throw new Error('List map is required and cannot be empty');
        }

        // Check if we should use GET or POST method
        const useGet = Object.keys(listMap).length <= 10;
        
        if (useGet) {
            // Use GET method for up to 10 numbers
            return this.sendWithGET(from, listMap, schedule, alerts, validate);
        } else {
            // Use POST method for more than 10 numbers
            return this.sendWithPOST(from, listMap, schedule, alerts, validate);
        }
    }

    /**
     * Send SMS using GET method (for up to 10 numbers)
     */
    async sendWithGET(from, listMap, schedule, alerts, validate) {
        // Build list parameter (comma-separated phone numbers)
        const phones = Object.keys(listMap);
        const list = phones.join(',');
        
        // Build message (use first message as template)
        const firstMessage = Object.values(listMap)[0];
        
        // Build URL parameters
        const params = new URLSearchParams({
            get: '1',
            token: this.token,
            from: from,
            msg: firstMessage,
            list: list
        });

        // Add schedule if provided
        if (schedule) {
            if (schedule.dy) params.append('dy', schedule.dy);
            if (schedule.dm) params.append('dm', schedule.dm);
            if (schedule.dd) params.append('dd', schedule.dd);
            if (schedule.dh) params.append('dh', schedule.dh);
            if (schedule.di) params.append('di', schedule.di);
        }

        // Add alerts if provided
        if (alerts) {
            if (alerts.np) params.append('np', alerts.np);
            if (alerts.ne) params.append('ne', alerts.ne);
        }

        // Add validate parameter if true
        if (validate) {
            params.append('validate', '');
        }

        // Build full URL
        const url = `${this.baseUrl}${this.endpoint}?${params.toString()}`;

        return new Promise((resolve, reject) => {
            const req = https.get(url, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const response = this.parseResponse(data);
                        resolve(response);
                    } catch (error) {
                        reject(new Error(`Failed to parse response: ${error.message}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(new Error(`Request failed: ${error.message}`));
            });
        });
    }

    /**
     * Send SMS using POST method (for more than 10 numbers)
     */
    async sendWithPOST(from, listMap, schedule, alerts, validate) {
        // Build listjson (JSON string then URL encoded)
        const listjson = encodeURIComponent(JSON.stringify(listMap));
        
        // Build request parameters
        const params = {
            post: '2', // POST method
            token: this.token,
            from: from,
            listjson: listjson
        };

        // Add schedule if provided
        if (schedule) {
            if (schedule.dy) params.dy = schedule.dy;
            if (schedule.dm) params.dm = schedule.dm;
            if (schedule.dd) params.dd = schedule.dd;
            if (schedule.dh) params.dh = schedule.dh;
            if (schedule.di) params.di = schedule.di;
        }

        // Add alerts if provided
        if (alerts) {
            if (alerts.np) params.np = alerts.np;
            if (alerts.ne) params.ne = alerts.ne;
        }

        // Add validate parameter if true
        if (validate) {
            params.validate = '';
        }

        // Convert to form data
        const postData = querystring.stringify(params);

        return new Promise((resolve, reject) => {
            const requestOptions = {
                hostname: 'www.micropay.co.il',
                                  port: 80,
                path: this.endpoint,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            const req = https.request(requestOptions, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const response = this.parseResponse(data);
                        resolve(response);
                    } catch (error) {
                        reject(new Error(`Failed to parse response: ${error.message}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(new Error(`Request failed: ${error.message}`));
            });

            req.write(postData);
            req.end();
        });
    }

    /**
     * Parse Micropay response
     * @param {string} response - Raw response from Micropay
     * @returns {Object} Parsed response
     */
    parseResponse(response) {
        const cleanResponse = response.trim();
        
        if (cleanResponse.startsWith('OK')) {
            // Extract TID from "OK XXX" response
            const tid = cleanResponse.substring(3).trim();
            return {
                success: true,
                status: 'OK',
                tid: tid,
                message: cleanResponse
            };
        } else if (cleanResponse.startsWith('ERROR')) {
            return {
                success: false,
                status: 'ERROR',
                error: cleanResponse.substring(6).trim(),
                message: cleanResponse
            };
        } else {
            return {
                success: false,
                status: 'UNKNOWN',
                error: 'Unknown response format',
                message: cleanResponse
            };
        }
    }

    /**
     * Validate phone number format
     * @param {string} phone - Phone number to validate
     * @returns {boolean} Whether phone is valid
     */
    validatePhone(phone) {
        if (!phone || typeof phone !== 'string') return false;
        
        const digits = phone.replace(/\D/g, '');
        
        // Israeli phone number validation
        if (digits.startsWith('972') && digits.length >= 11 && digits.length <= 12) {
            return true;
        } else if (digits.startsWith('0') && digits.length >= 9 && digits.length <= 10) {
            // Mobile: 05XXXXXXXX, Landline: 0[2-9]XXXXXXX
            return digits.startsWith('05') || /^0[2-9]/.test(digits);
        }
        
        return false;
    }

    /**
     * Normalize phone number to E.164 format
     * @param {string} phone - Phone number to normalize
     * @returns {string|null} Normalized phone number or null if invalid
     */
    normalizePhone(phone) {
        if (!this.validatePhone(phone)) return null;
        
        const digits = phone.replace(/\D/g, '');
        
        if (digits.startsWith('972')) {
            return digits;
        } else if (digits.startsWith('0')) {
            return '972' + digits.substring(1);
        }
        
        return null;
    }

    /**
     * Get default sender from environment
     * @returns {string} Default sender
     */
    getDefaultFrom() {
        return this.defaultFrom || 'SekerApp';
    }

    /**
     * Check if service is properly configured
     * @returns {boolean} Whether service is configured
     */
    isConfigured() {
        return !!(this.token && this.defaultFrom);
    }
}

module.exports = MicropayService;
