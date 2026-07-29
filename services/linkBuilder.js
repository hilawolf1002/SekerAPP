const https = require('https');

class LinkBuilderService {
    constructor() {
        this.baseUrl = process.env.PUBLIC_BASE_URL || 'https://sekerapp.online';
        this.shortlBaseUrl = 'http://localhost:4544'; // Shortl service URL
    }

    /**
     * Build survey link for a specific phone number
     * @param {number} surveyId - Survey ID
     * @param {string} phoneE164 - Phone number in E.164 format
     * @returns {string} Complete survey URL
     */
    buildSurveyLink(surveyId, phoneE164) {
        if (!surveyId || !phoneE164) {
            throw new Error('Survey ID and phone number are required');
        }

        // Ensure base URL doesn't end with slash
        const cleanBaseUrl = this.baseUrl.replace(/\/$/, '');
        
        return `${cleanBaseUrl}/survey/${surveyId}?mp_phone=${phoneE164}`;
    }

    /**
     * Shorten URL using Shortl service
     * @param {string} url - URL to shorten
     * @returns {Promise<string>} Shortened URL or original URL if shortening fails
     */
    async shortenUrl(url) {
        try {
            const shortCode = await this.createShortLink(url);
            if (shortCode) {
                return `${this.shortlBaseUrl}/${shortCode}`;
            }
        } catch (error) {
            console.error('URL shortening failed:', error.message);
        }
        
        // Return original URL if shortening fails
        return url;
    }

    /**
     * Create short link using Shortl API
     * @param {string} url - URL to shorten
     * @returns {Promise<string|null>} Short code or null if failed
     */
    async createShortLink(url) {
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify({ url: url });
            
            const requestOptions = {
                hostname: 'localhost',
                port: 5000,
                path: '/api/shorten',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
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
                        const response = JSON.parse(data);
                        if (response.success && response.shortCode) {
                            resolve(response.shortCode);
                        } else {
                            resolve(null);
                        }
                    } catch (error) {
                        resolve(null);
                    }
                });
            });

            req.on('error', (error) => {
                resolve(null);
            });

            req.write(postData);
            req.end();
        });
    }

    /**
     * Build and optionally shorten survey link
     * @param {number} surveyId - Survey ID
     * @param {string} phoneE164 - Phone number in E.164 format
     * @param {boolean} shorten - Whether to shorten the URL
     * @returns {Promise<string>} Final survey URL
     */
    async buildSurveyLinkWithShortening(surveyId, phoneE164, shorten = false) {
        const fullUrl = this.buildSurveyLink(surveyId, phoneE164);
        
        if (shorten) {
            return await this.shortenUrl(fullUrl);
        }
        
        return fullUrl;
    }

    /**
     * Process multiple survey links with optional shortening
     * @param {number} surveyId - Survey ID
     * @param {Array<string>} phones - Array of phone numbers
     * @param {boolean} shorten - Whether to shorten URLs
     * @returns {Promise<Object>} Map of phone:url
     */
    async buildMultipleSurveyLinks(surveyId, phones, shorten = false) {
        const linkMap = {};
        
        if (shorten) {
            // Process with shortening (slower but shorter URLs)
            for (const phone of phones) {
                const url = await this.buildSurveyLinkWithShortening(surveyId, phone, true);
                linkMap[phone] = url;
            }
        } else {
            // Process without shortening (faster)
            for (const phone of phones) {
                const url = this.buildSurveyLink(surveyId, phone);
                linkMap[phone] = url;
            }
        }
        
        return linkMap;
    }

    /**
     * Validate URL format
     * @param {string} url - URL to validate
     * @returns {boolean} Whether URL is valid
     */
    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get base URL for the application
     * @returns {string} Base URL
     */
    getBaseUrl() {
        return this.baseUrl;
    }

    /**
     * Check if Shortl service is available
     * @returns {Promise<boolean>} Whether service is available
     */
    async isShortlAvailable() {
        try {
            return new Promise((resolve) => {
                const req = https.request({
                    hostname: 'localhost',
                    port: 4544,
                    path: '/health',
                    method: 'GET',
                    timeout: 5000
                }, (res) => {
                    resolve(res.statusCode === 200);
                });

                req.on('error', () => {
                    resolve(false);
                });

                req.on('timeout', () => {
                    req.destroy();
                    resolve(false);
                });

                req.end();
            });
        } catch (error) {
            return false;
        }
    }
}

module.exports = LinkBuilderService;
