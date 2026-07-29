/**
 * Phone number utilities for Israeli phone numbers
 */

/**
 * Normalize Israeli phone number to E.164 format
 * @param {string} phoneRaw - Raw phone number input
 * @returns {string|null} Normalized phone number or null if invalid
 */
function normalizeIL(phoneRaw) {
    if (!phoneRaw || typeof phoneRaw !== 'string') {
        return null;
    }

    // Remove all non-digit characters
    const digits = phoneRaw.replace(/\D/g, '');
    
    // If already in 972 format and valid length
    if (digits.startsWith('972') && digits.length >= 11 && digits.length <= 12) {
        return digits;
    }
    
    // If starts with 0 (Israeli format)
    if (digits.startsWith('0') && digits.length >= 9 && digits.length <= 10) {
        // Mobile: 05XXXXXXXX (9 digits)
        if (digits.startsWith('05') && digits.length === 9) {
            return '972' + digits.substring(1);
        }
        
        // Landline: 0[2-9]XXXXXXX (9-10 digits)
        if (/^0[2-9]/.test(digits) && digits.length >= 9 && digits.length <= 10) {
            return '972' + digits.substring(1);
        }
    }
    
    return null;
}

/**
 * Validate Israeli phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} Whether phone is valid
 */
function validateIL(phone) {
    const normalized = normalizeIL(phone);
    return normalized !== null;
}

/**
 * Remove duplicate phone numbers from array
 * @param {Array<string>} phoneList - Array of phone numbers
 * @returns {Array<string>} Array with duplicates removed
 */
function dedupe(phoneList) {
    if (!Array.isArray(phoneList)) {
        return [];
    }
    
    const seen = new Set();
    const unique = [];
    
    for (const phone of phoneList) {
        const normalized = normalizeIL(phone);
        if (normalized && !seen.has(normalized)) {
            seen.add(normalized);
            unique.push(normalized);
        }
    }
    
    return unique;
}

/**
 * Filter phone numbers against blacklist
 * @param {Array<string>} phones - Array of phone numbers
 * @param {Set<string>} blacklistSet - Set of blacklisted numbers
 * @returns {Object} Filtered results
 */
function filterBlacklist(phones, blacklistSet) {
    if (!Array.isArray(phones) || !blacklistSet) {
        return {
            valid: [],
            blacklisted: [],
            total: 0
        };
    }
    
    const valid = [];
    const blacklisted = [];
    
    for (const phone of phones) {
        const normalized = normalizeIL(phone);
        if (normalized) {
            if (blacklistSet.has(normalized)) {
                blacklisted.push(normalized);
            } else {
                valid.push(normalized);
            }
        }
    }
    
    return {
        valid,
        blacklisted,
        total: phones.length
    };
}

/**
 * Process CSV content and extract phone numbers
 * @param {string} csvContent - CSV file content
 * @returns {Array<string>} Array of extracted phone numbers
 */
function extractPhonesFromCSV(csvContent) {
    if (!csvContent || typeof csvContent !== 'string') {
        return [];
    }
    
    const lines = csvContent.split('\n').filter(line => line.trim());
    const phones = [];
    
    for (const line of lines) {
        // Extract first number from each line
        const match = line.match(/\d+/);
        if (match) {
            phones.push(match[0]);
        }
    }
    
    return phones;
}

/**
 * Get phone number type (mobile/landline)
 * @param {string} phone - Normalized phone number
 * @returns {string} Phone type
 */
function getPhoneType(phone) {
    if (!phone || typeof phone !== 'string') {
        return 'unknown';
    }
    
    const digits = phone.replace(/\D/g, '');
    
    if (digits.startsWith('9725') && digits.length === 12) {
        return 'mobile';
    } else if (digits.startsWith('972') && digits.length >= 11 && digits.length <= 12) {
        return 'landline';
    }
    
    return 'unknown';
}

/**
 * Format phone number for display
 * @param {string} phone - Normalized phone number
 * @returns {string} Formatted phone number
 */
function formatForDisplay(phone) {
    if (!phone || typeof phone !== 'string') {
        return '';
    }
    
    const digits = phone.replace(/\D/g, '');
    
    if (digits.startsWith('9725') && digits.length === 12) {
        // Mobile: 972-5X-XXX-XXXX
        return `${digits.substring(0, 3)}-${digits.substring(3, 5)}-${digits.substring(5, 8)}-${digits.substring(8)}`;
    } else if (digits.startsWith('972') && digits.length >= 11 && digits.length <= 12) {
        // Landline: 972-X-XXX-XXXX
        const areaCode = digits.substring(3, 4);
        const prefix = digits.substring(4, 7);
        const number = digits.substring(7);
        return `${digits.substring(0, 3)}-${areaCode}-${prefix}-${number}`;
    }
    
    return phone;
}

/**
 * Batch process phone numbers for SMS sending
 * @param {Array<string>} phones - Array of phone numbers
 * @param {number} batchSize - Size of each batch (default: 9000)
 * @returns {Array<Array<string>>} Array of batches
 */
function createBatches(phones, batchSize = 9000) {
    if (!Array.isArray(phones) || phones.length === 0) {
        return [];
    }
    
    const batches = [];
    for (let i = 0; i < phones.length; i += batchSize) {
        batches.push(phones.slice(i, i + batchSize));
    }
    
    return batches;
}

/**
 * Comprehensive phone processing pipeline
 * @param {Array<string>} rawPhones - Raw phone numbers
 * @param {Set<string>} blacklist - Blacklist set
 * @returns {Object} Processing results
 */
function processPhoneList(rawPhones, blacklist = new Set()) {
    if (!Array.isArray(rawPhones)) {
        return {
            total: 0,
            valid: 0,
            invalid: 0,
            duplicates: 0,
            blacklisted: 0,
            final: []
        };
    }
    
    // Step 1: Normalize all phones
    const normalized = rawPhones.map(phone => normalizeIL(phone)).filter(Boolean);
    
    // Step 2: Remove duplicates
    const unique = dedupe(normalized);
    
    // Step 3: Filter blacklist
    const filtered = filterBlacklist(unique, blacklist);
    
    return {
        total: rawPhones.length,
        valid: normalized.length,
        invalid: rawPhones.length - normalized.length,
        duplicates: normalized.length - unique.length,
        blacklisted: filtered.blacklisted.length,
        final: filtered.valid
    };
}

module.exports = {
    normalizeIL,
    validateIL,
    dedupe,
    filterBlacklist,
    extractPhonesFromCSV,
    getPhoneType,
    formatForDisplay,
    createBatches,
    processPhoneList
};
