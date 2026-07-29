/**
 * CSV processing utilities
 */

/**
 * Parse CSV content and extract data
 * @param {string} csvContent - Raw CSV content
 * @param {Object} options - Parsing options
 * @returns {Array<Object>} Parsed data
 */
function parseCSV(csvContent, options = {}) {
    if (!csvContent || typeof csvContent !== 'string') {
        return [];
    }

    const {
        delimiter = ',',
        hasHeader = true,
        extractFirstNumber = false
    } = options;

    const lines = csvContent.split('\n').filter(line => line.trim());
    const data = [];

    if (lines.length === 0) {
        return data;
    }

    let startIndex = 0;
    let headers = [];

    if (hasHeader && lines.length > 0) {
        headers = lines[0].split(delimiter).map(h => h.trim().replace(/"/g, ''));
        startIndex = 1;
    }

    for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(delimiter).map(v => v.trim().replace(/"/g, ''));
        
        if (extractFirstNumber) {
            // Extract first number from the line
            const firstNumber = extractFirstNumberFromLine(line);
            if (firstNumber) {
                data.push({ phone: firstNumber, raw: line });
            }
        } else if (headers.length > 0) {
            // Create object with headers
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            data.push(row);
        } else {
            // Return as array of values
            data.push(values);
        }
    }

    return data;
}

/**
 * Extract first phone number from a line of text
 * @param {string} line - Text line
 * @returns {string|null} First phone number found or null
 */
function extractFirstNumberFromLine(line) {
    if (!line || typeof line !== 'string') {
        return null;
    }

    // Look for phone number patterns
    const patterns = [
        // Israeli mobile: 05XXXXXXXX
        /05\d{8}/,
        // Israeli landline: 0[2-9]XXXXXXX
        /0[2-9]\d{7,8}/,
        // International: 972XXXXXXXXX
        /972\d{8,9}/,
        // General: any sequence of 9-12 digits
        /\d{9,12}/
    ];

    for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
            return match[0];
        }
    }

    return null;
}

/**
 * Extract phone numbers from CSV content
 * @param {string} csvContent - CSV content
 * @param {Object} options - Extraction options
 * @returns {Array<string>} Array of phone numbers
 */
function extractPhonesFromCSV(csvContent, options = {}) {
    const {
        columnIndex = 0,
        columnName = null,
        validatePhones = true
    } = options;

    const parsed = parseCSV(csvContent, { hasHeader: true });
    
    if (parsed.length === 0) {
        return [];
    }

    const phones = [];
    const phoneUtils = require('./phone');

    for (const row of parsed) {
        let phoneValue = null;

        if (columnName && row[columnName]) {
            phoneValue = row[columnName];
        } else if (columnIndex >= 0 && Array.isArray(row)) {
            phoneValue = row[columnIndex];
        } else if (columnIndex >= 0 && typeof row === 'object') {
            const values = Object.values(row);
            phoneValue = values[columnIndex];
        }

        if (phoneValue && typeof phoneValue === 'string') {
            if (validatePhones) {
                const normalized = phoneUtils.normalizeIL(phoneValue);
                if (normalized) {
                    phones.push(normalized);
                }
            } else {
                phones.push(phoneValue);
            }
        }
    }

    return phones;
}

/**
 * Convert data to CSV format
 * @param {Array<Object>} data - Data to convert
 * @param {Array<string>} columns - Column names
 * @returns {string} CSV content
 */
function toCSV(data, columns = []) {
    if (!Array.isArray(data) || data.length === 0) {
        return '';
    }

    if (columns.length === 0) {
        columns = Object.keys(data[0]);
    }

    const csvLines = [];

    // Add header
    csvLines.push(columns.map(col => `"${col}"`).join(','));

    // Add data rows
    for (const row of data) {
        const values = columns.map(col => {
            const value = row[col] || '';
            // Escape quotes and wrap in quotes if contains comma or quote
            const escaped = String(value).replace(/"/g, '""');
            return escaped.includes(',') || escaped.includes('"') ? `"${escaped}"` : escaped;
        });
        csvLines.push(values.join(','));
    }

    return csvLines.join('\n');
}

/**
 * Validate CSV structure
 * @param {string} csvContent - CSV content to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
function validateCSV(csvContent, options = {}) {
    const {
        minRows = 1,
        maxRows = 100000,
        requiredColumns = [],
        phoneColumns = []
    } = options;

    if (!csvContent || typeof csvContent !== 'string') {
        return {
            valid: false,
            errors: ['CSV content is empty or invalid']
        };
    }

    const lines = csvContent.split('\n').filter(line => line.trim());
    const errors = [];

    // Check row count
    if (lines.length < minRows) {
        errors.push(`CSV must have at least ${minRows} rows`);
    }
    if (lines.length > maxRows) {
        errors.push(`CSV cannot have more than ${maxRows} rows`);
    }

    // Check headers if required
    if (requiredColumns.length > 0 && lines.length > 0) {
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));
        
        if (missingColumns.length > 0) {
            errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
        }
    }

    // Validate phone columns if specified
    if (phoneColumns.length > 0 && lines.length > 1) {
        const phoneUtils = require('./phone');
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
            
            for (const colIndex of phoneColumns) {
                if (colIndex < values.length) {
                    const phoneValue = values[colIndex];
                    if (phoneValue && !phoneUtils.validateIL(phoneValue)) {
                        errors.push(`Invalid phone number at row ${i + 1}, column ${colIndex + 1}: ${phoneValue}`);
                    }
                }
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        rowCount: lines.length
    };
}

/**
 * Clean CSV content
 * @param {string} csvContent - Raw CSV content
 * @param {Object} options - Cleaning options
 * @returns {string} Cleaned CSV content
 */
function cleanCSV(csvContent, options = {}) {
    if (!csvContent || typeof csvContent !== 'string') {
        return '';
    }

    const {
        removeEmptyRows = true,
        trimWhitespace = true,
        removeDuplicates = false
    } = options;

    let lines = csvContent.split('\n');

    if (trimWhitespace) {
        lines = lines.map(line => line.trim());
    }

    if (removeEmptyRows) {
        lines = lines.filter(line => line.length > 0);
    }

    if (removeDuplicates) {
        const seen = new Set();
        lines = lines.filter(line => {
            if (seen.has(line)) {
                return false;
            }
            seen.add(line);
            return true;
        });
    }

    return lines.join('\n');
}

module.exports = {
    parseCSV,
    extractFirstNumberFromLine,
    extractPhonesFromCSV,
    toCSV,
    validateCSV,
    cleanCSV
};
