const express = require('express');
const router = express.Router();
const MicropayService = require('../services/micropay');
const LinkBuilderService = require('../services/linkBuilder');
const CampaignStore = require('../services/campaignStore');
const BigQueryService = require('../services/bigqueryService');
const phoneUtils = require('../utils/phone');
const csvUtils = require('../utils/csv');
const smsLists = require('../config/smsLists');
const jwt = require('jsonwebtoken');

// JWT Authentication Middleware
function requireJWTSuperAdmin(req, res, next) {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'נדרש token הרשאה'
            });
        }
        
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        
        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production');
        
        // Check if user is super admin
        if (decoded.role !== 'super_admin' && decoded.role !== 'superadmin') {
            return res.status(403).json({
                success: false,
                error: 'נדרשות הרשאות סופר אדמין'
            });
        }
        
        // Add user info to request
        req.user = decoded;
        console.log('JWT auth successful for user:', decoded.username);
        next();
    } catch (error) {
        console.error('JWT auth failed:', error);
        return res.status(401).json({
            success: false,
            error: 'Token לא תקין או פג תוקף'
        });
    }
}

// Session-based Super Admin Authentication Middleware
function requireSessionSuperAdmin(req, res, next) {
    // Debug logging
    console.log('SMS route auth check:', {
        path: req.path,
        sessionId: req.session?.id,
        userId: req.session?.userId,
        username: req.session?.username,
        role: req.session?.role,
        hasSession: !!req.session,
        cookies: req.headers.cookie ? req.headers.cookie.substring(0, 100) + '...' : 'none'
    });
    
    // Check if user is authenticated
    if (!req.session || !req.session.userId) {
        console.log('Auth failed: No session or userId');
        return res.status(401).json({
            success: false,
            error: 'נדרשת התחברות'
        });
    }
    
    // Check if user is super admin (support both formats)
    if (req.session.role !== 'super_admin' && req.session.role !== 'superadmin') {
        console.log('Auth failed: Not super admin, role:', req.session.role);
        return res.status(403).json({
            success: false,
            error: 'נדרשות הרשאות סופר אדמין'
        });
    }
    
    console.log('Auth successful for user:', req.session.username);
    next();
}

// Apply session-based super admin authentication to other SMS routes
router.use(requireSessionSuperAdmin);

// Initialize services
let micropayService, linkBuilderService, campaignStore, bigqueryService;

function initializeServices() {
    try {
        micropayService = new MicropayService();
        linkBuilderService = new LinkBuilderService();
        campaignStore = new CampaignStore();
        bigqueryService = new BigQueryService();
        console.log('SMS services initialized successfully');
    } catch (error) {
        console.error('Failed to initialize SMS services:', error);
    }
}

// Initialize services lazily when first request comes
async function ensureServices() {
    if (!micropayService || !linkBuilderService || !campaignStore || !bigqueryService) {
        initializeServices();
        
        // Wait for BigQuery service to be ready
        if (bigqueryService) {
            try {
                await bigqueryService.ensureInitialized();
                console.log('BigQuery service is ready');
            } catch (error) {
                console.error('BigQuery service failed to initialize:', error);
            }
        }
    }
}

/**
 * GET /api/sms/blacklist
 * Get all blacklisted phone numbers
 */
router.get('/blacklist', async (req, res) => {
    try {
        ensureServices();
        if (!campaignStore) {
            return res.status(500).json({
                success: false,
                error: 'SMS service not available'
            });
        }

        const phones = await campaignStore.getBlacklist();
        
        res.json({
            success: true,
            phones: phones,
            total: phones.length
        });
    } catch (error) {
        console.error('Error fetching blacklist:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה בקבלת רשימה שחורה'
        });
    }
});

/**
 * POST /api/sms/blacklist/merge
 * Merge new phone numbers into blacklist
 */
router.post('/blacklist/merge', async (req, res) => {
    try {
        ensureServices();
        if (!campaignStore) {
            return res.status(500).json({
                success: false,
                error: 'SMS service not available'
            });
        }

        const { text } = req.body;
        
        if (!text || typeof text !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'טקסט נדרש'
            });
        }

        // Parse phone numbers from text
        const phoneLines = text.split('\n').filter(line => line.trim());
        const phones = [];
        const skipped = [];

        for (const line of phoneLines) {
            const normalized = phoneUtils.normalizeIL(line.trim());
            if (normalized) {
                phones.push(normalized);
            } else {
                skipped.push(line.trim());
            }
        }

        if (phones.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'לא נמצאו מספרי טלפון תקינים'
            });
        }

        // Merge with existing blacklist
        const result = await campaignStore.mergeBlacklist(phones);
        
        res.json({
            success: true,
            total_after: result.total,
            added_new: result.added,
            skipped_existing: result.skipped,
            phones: result.allPhones
        });
    } catch (error) {
        console.error('Error merging blacklist:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה בשמירת רשימה שחורה'
        });
    }
});

/**
 * POST /api/sms/send
 * Send SMS messages
 */
router.post('/send', async (req, res) => {
    try {
        ensureServices();
        if (!micropayService || !linkBuilderService || !campaignStore) {
            return res.status(500).json({
                success: false,
                error: 'SMS service not available'
            });
        }

        const {
            surveyId,
            from,
            messageTemplate,
            phones,
            schedule,
            alerts,
            shorten,
            validate
        } = req.body;

        // Validate required fields
        if (!surveyId || !from || !messageTemplate || !phones || !Array.isArray(phones)) {
            return res.status(400).json({
                success: false,
                error: 'כל השדות נדרשים: surveyId, from, messageTemplate, phones'
            });
        }

        if (phones.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'אין מספרי טלפון לשליחה'
            });
        }

        // Process phone numbers
        const processed = phoneUtils.processPhoneList(phones);
        
        if (processed.final.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'אין מספרי טלפון תקינים לשליחה'
            });
        }

        // Create campaign in database
        const campaign = await campaignStore.createCampaign({
            surveyId: parseInt(surveyId),
            fromSender: from,
            total: processed.final.length,
            phones: processed.final,
            messageTemplate: messageTemplate
        });

        // Build personalized messages with survey links
        const linkMap = await linkBuilderService.buildMultipleSurveyLinks(
            surveyId, 
            processed.final, 
            shorten || false
        );

        // Replace template variables
        const personalizedMessages = {};
        for (const phone of processed.final) {
            const surveyLink = linkMap[phone];
            const message = messageTemplate.replace(/\{\{survey_link\}\}/g, surveyLink);
            personalizedMessages[phone] = message;
        }

        // Send via Micropay
        const micropayResult = await micropayService.sendPersonalizedSMS({
            from: from,
            listMap: personalizedMessages,
            schedule: schedule,
            alerts: alerts,
            validate: validate
        });

        if (micropayResult.success) {
            // Update campaign with Micropay TID
            await campaignStore.updateCampaign(campaign.id, {
                micropay_tid: micropayResult.tid,
                status: 'sent'
            });

            // Add success log
            await campaignStore.addLog(campaign.id, 'START', `Campaign started with TID: ${micropayResult.tid}`);

            res.json({
                success: true,
                status: 'OK',
                campaign_id: campaign.id,
                accepted: processed.final.length,
                skipped_blacklist: processed.blacklisted,
                invalid: processed.invalid,
                micropay_response: micropayResult.message
            });
        } else {
            // Update campaign status
            await campaignStore.updateCampaign(campaign.id, {
                status: 'failed'
            });

            // Add error log
            await campaignStore.addLog(campaign.id, 'ERROR', `Micropay error: ${micropayResult.error}`);

            res.status(400).json({
                success: false,
                error: `Micropay error: ${micropayResult.error}`,
                campaign_id: campaign.id
            });
        }
    } catch (error) {
        console.error('Error sending SMS:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה בשליחת SMS'
        });
    }
});

/**
 * POST /api/sms/send-from-db
 * Send SMS to recipients from database list
 */
router.post('/send-from-db', async (req, res) => {
    try {
        ensureServices();
        if (!micropayService || !linkBuilderService || !campaignStore) {
            return res.status(500).json({
                success: false,
                error: 'SMS service not available'
            });
        }

        const {
            surveyId,
            from,
            messageTemplate,
            dbListName,
            schedule,
            alerts,
            shorten,
            validate
        } = req.body;

        // Validate required fields
        if (!surveyId || !from || !messageTemplate || !dbListName) {
            return res.status(400).json({
                success: false,
                error: 'כל השדות נדרשים: surveyId, from, messageTemplate, dbListName'
            });
        }

        // Validate dbListName against whitelist
        if (!smsLists[dbListName]) {
            return res.status(400).json({
                success: false,
                error: 'שם רשימה לא תקין'
            });
        }

        // Get phones from database (this would need to be implemented based on your DB structure)
        const phones = await getPhonesFromDatabase(dbListName);
        
        if (!phones || phones.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'לא נמצאו מספרי טלפון ברשימה'
            });
        }

        // Process phone numbers
        const processed = phoneUtils.processPhoneList(phones);
        
        if (processed.final.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'אין מספרי טלפון תקינים לשליחה'
            });
        }

        // Create campaign in database
        const campaign = await campaignStore.createCampaign({
            surveyId: parseInt(surveyId),
            fromSender: from,
            total: processed.final.length,
            phones: processed.final,
            messageTemplate: messageTemplate
        });

        // Build personalized messages with survey links
        const linkMap = await linkBuilderService.buildMultipleSurveyLinks(
            surveyId, 
            processed.final, 
            shorten || false
        );

        // Replace template variables
        const personalizedMessages = {};
        for (const phone of processed.final) {
            const surveyLink = linkMap[phone];
            const message = messageTemplate.replace(/\{\{survey_link\}\}/g, surveyLink);
            personalizedMessages[phone] = message;
        }

        // Send via Micropay
        const micropayResult = await micropayService.sendPersonalizedSMS({
            from: from,
            listMap: personalizedMessages,
            schedule: schedule,
            alerts: alerts,
            validate: validate
        });

        if (micropayResult.success) {
            // Update campaign with Micropay TID
            await campaignStore.updateCampaign(campaign.id, {
                micropay_tid: micropayResult.tid,
                status: 'sent'
            });

            // Add success log
            await campaignStore.addLog(campaign.id, 'START', `Campaign started with TID: ${micropayResult.tid}`);

            res.json({
                success: true,
                status: 'OK',
                campaign_id: campaign.id,
                accepted: processed.final.length,
                skipped_blacklist: processed.blacklisted,
                invalid: processed.invalid,
                micropay_response: micropayResult.message
            });
        } else {
            // Update campaign status
            await campaignStore.updateCampaign(campaign.id, {
                status: 'failed'
            });

            // Add error log
            await campaignStore.addLog(campaign.id, 'ERROR', `Micropay error: ${micropayResult.error}`);

            res.status(400).json({
                success: false,
                error: `Micropay error: ${micropayResult.error}`,
                campaign_id: campaign.id
            });
        }
    } catch (error) {
        console.error('Error sending SMS from DB:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה בשליחת SMS'
        });
    }
});

/**
 * GET /api/sms/campaigns/:id/logs
 * Get campaign logs
 */
router.get('/campaigns/:id/logs', async (req, res) => {
    try {
        ensureServices();
        if (!campaignStore) {
            return res.status(500).json({
                success: false,
                error: 'SMS service not available'
            });
        }

        const campaignId = parseInt(req.params.id);
        if (!campaignId) {
            return res.status(400).json({
                success: false,
                error: 'מזהה קמפיין לא תקין'
            });
        }

        const campaign = await campaignStore.getCampaignById(campaignId);
        if (!campaign) {
            return res.status(404).json({
                success: false,
                error: 'קמפיין לא נמצא'
            });
        }

        const logs = await campaignStore.getCampaignLogs(campaignId, 100);
        
        res.json({
            success: true,
            campaign: campaign,
            logs: logs
        });
    } catch (error) {
        console.error('Error fetching campaign logs:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה בקבלת לוגי קמפיין'
        });
    }
});

/**
 * GET /api/sms/callback
 * Micropay callback endpoint
 */
router.get('/callback', async (req, res) => {
    try {
        ensureServices();
        if (!campaignStore) {
            return res.status(500).json({
                success: false,
                error: 'SMS service not available'
            });
        }

        const { msg, tid, info } = req.query;
        
        if (!msg || !tid) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters'
            });
        }

        // Find campaign by TID
        const campaign = await campaignStore.getCampaignByTID(tid);
        if (!campaign) {
            console.warn(`Campaign not found for TID: ${tid}`);
            return res.status(200).json({ success: true, message: 'Campaign not found' });
        }

        // Add log entry
        await campaignStore.addLog(campaign.id, msg.toUpperCase(), info || '');

        // Update campaign status based on message type
        let status = campaign.status;
        switch (msg.toUpperCase()) {
            case 'END':
                status = 'completed';
                break;
            case 'ERROR':
                status = 'failed';
                break;
            case 'STOP':
                status = 'stopped';
                break;
        }

        if (status !== campaign.status) {
            await campaignStore.updateCampaign(campaign.id, { status });
        }

        res.status(200).json({ success: true, message: 'Callback processed' });
    } catch (error) {
        console.error('Error processing callback:', error);
        res.status(200).json({ success: false, message: 'Callback error' });
    }
});

/**
 * GET /api/sms/recipients/:gid
 * Get recipients from BigQuery by GID
 */
router.get('/recipients/:gid', async (req, res) => {
    try {
        await ensureServices();
        if (!bigqueryService) {
            return res.status(500).json({
                success: false,
                error: 'BigQuery service not available'
            });
        }

        const { gid } = req.params;
        
        if (!gid) {
            return res.status(400).json({
                success: false,
                error: 'GID parameter is required'
            });
        }

        const result = await bigqueryService.getRecipientsByGid(gid);
        
        if (result.success) {
            res.json({
                success: true,
                gid: gid,
                count: result.count,
                phones: result.phones
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error || 'Failed to fetch recipients from BigQuery'
            });
        }
    } catch (error) {
        console.error('Error fetching recipients from BigQuery:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה בקבלת רשימת נמענים מ-BigQuery'
        });
    }
});

/**
 * GET /api/sms/lists
 * Get available recipient lists from glist.csv
 */
router.get('/lists', async (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const csvPath = path.join(__dirname, '../data/glist.csv');
        
        if (!fs.existsSync(csvPath)) {
            return res.status(404).json({
                success: false,
                error: 'glist.csv file not found'
            });
        }

        const csvContent = fs.readFileSync(csvPath, 'utf8');
        const lines = csvContent.split('\n').filter(line => line.trim());
        
        const lists = [];
        lines.forEach((line, index) => {
            if (index === 0) return; // Skip header if exists
            
            const parts = line.split('\t'); // Use tab as separator since the file uses tabs
            if (parts.length >= 3) {
                const name = parts[0].trim();
                const gid = parts[1].trim();
                const count = parseInt(parts[2].trim()) || 0;
                if (name && gid) {
                    lists.push({ name, gid, count });
                }
            }
        });

        res.json({
            success: true,
            lists: lists
        });
    } catch (error) {
        console.error('Error reading glist.csv:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה בקריאת קובץ glist.csv'
        });
    }
});

/**
 * Helper function to get phones from database
 * This would need to be implemented based on your database structure
 */
async function getPhonesFromDatabase(listName) {
    // This is a placeholder - implement based on your DB structure
    // For now, return empty array
    return [];
}

module.exports = router;
