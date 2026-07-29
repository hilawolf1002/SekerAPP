const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// File to store short link mappings
const SHORT_LINKS_FILE = path.join(__dirname, '../data/short-links.json');

// Ensure data directory exists
async function ensureDataDir() {
    try {
        await fs.access(path.dirname(SHORT_LINKS_FILE));
    } catch {
        await fs.mkdir(path.dirname(SHORT_LINKS_FILE), { recursive: true });
    }
}

// Load short links from file
async function loadShortLinks() {
    try {
        await ensureDataDir();
        const data = await fs.readFile(SHORT_LINKS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // Return empty object if file doesn't exist or is invalid
        return {};
    }
}

// Save short links to file
async function saveShortLinks(shortLinks) {
    try {
        await ensureDataDir();
        await fs.writeFile(SHORT_LINKS_FILE, JSON.stringify(shortLinks, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving short links:', error);
        return false;
    }
}

// Clean expired links
async function cleanExpiredLinks() {
    try {
        const shortLinks = await loadShortLinks();
        const now = new Date();
        let cleaned = false;
        
        Object.keys(shortLinks).forEach(shortCode => {
            if (shortLinks[shortCode].expires_at && new Date(shortLinks[shortCode].expires_at) < now) {
                delete shortLinks[shortCode];
                cleaned = true;
            }
        });
        
        if (cleaned) {
            await saveShortLinks(shortLinks);
        }
        
        return cleaned;
    } catch (error) {
        console.error('Error cleaning expired links:', error);
        return false;
    }
}

// Store a new short link mapping
router.post('/store', async (req, res) => {
    try {
        const { short_code, original_url, expires_at } = req.body;
        
        if (!short_code || !original_url) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: short_code and original_url'
            });
        }
        
        // Clean expired links first
        await cleanExpiredLinks();
        
        // Load existing short links
        const shortLinks = await loadShortLinks();
        
        // Store the new mapping
        shortLinks[short_code] = {
            original_url: original_url,
            created_at: new Date().toISOString(),
            expires_at: expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            hits: 0
        };
        
        // Save to file
        const saved = await saveShortLinks(shortLinks);
        
        if (saved) {
            res.json({
                success: true,
                short_code: short_code,
                message: 'Short link stored successfully'
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to save short link'
            });
        }
        
    } catch (error) {
        console.error('Error storing short link:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get original URL for a short code
router.get('/:shortCode', async (req, res) => {
    try {
        const { shortCode } = req.params;
        
        // Clean expired links first
        await cleanExpiredLinks();
        
        // Load short links
        const shortLinks = await loadShortLinks();
        
        if (!shortLinks[shortCode]) {
            return res.status(404).json({
                success: false,
                message: 'Short link not found or expired'
            });
        }
        
        // Increment hit counter
        shortLinks[shortCode].hits = (shortLinks[shortCode].hits || 0) + 1;
        shortLinks[shortCode].last_accessed = new Date().toISOString();
        
        // Save updated data
        await saveShortLinks(shortLinks);
        
        // Redirect to original URL
        res.redirect(shortLinks[shortCode].original_url);
        
    } catch (error) {
        console.error('Error retrieving short link:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get statistics for short links
router.get('/stats/:shortCode', async (req, res) => {
    try {
        const { shortCode } = req.params;
        
        // Clean expired links first
        await cleanExpiredLinks();
        
        // Load short links
        const shortLinks = await loadShortLinks();
        
        if (!shortLinks[shortCode]) {
            return res.status(404).json({
                success: false,
                message: 'Short link not found or expired'
            });
        }
        
        res.json({
            success: true,
            short_code: shortCode,
            original_url: shortLinks[shortCode].original_url,
            created_at: shortLinks[shortCode].created_at,
            expires_at: shortLinks[shortCode].expires_at,
            hits: shortLinks[shortCode].hits || 0,
            last_accessed: shortLinks[shortCode].last_accessed
        });
        
    } catch (error) {
        console.error('Error getting short link stats:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// List all short links (admin only)
router.get('/list/all', async (req, res) => {
    try {
        // Clean expired links first
        await cleanExpiredLinks();
        
        // Load short links
        const shortLinks = await loadShortLinks();
        
        // Convert to array format for easier handling
        const linksArray = Object.entries(shortLinks).map(([shortCode, data]) => ({
            short_code: shortCode,
            ...data
        }));
        
        res.json({
            success: true,
            total: linksArray.length,
            links: linksArray
        });
        
    } catch (error) {
        console.error('Error listing short links:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Delete a short link
router.delete('/:shortCode', async (req, res) => {
    try {
        const { shortCode } = req.params;
        
        // Load short links
        const shortLinks = await loadShortLinks();
        
        if (!shortLinks[shortCode]) {
            return res.status(404).json({
                success: false,
                message: 'Short link not found'
            });
        }
        
        // Delete the mapping
        delete shortLinks[shortCode];
        
        // Save updated data
        const saved = await saveShortLinks(shortLinks);
        
        if (saved) {
            res.json({
                success: true,
                message: 'Short link deleted successfully'
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to delete short link'
            });
        }
        
    } catch (error) {
        console.error('Error deleting short link:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;
