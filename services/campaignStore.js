const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class CampaignStore {
    constructor() {
        this.dbPath = path.join(__dirname, '..', 'data', 'app.db');
        this.ensureDataDirectory();
        this.initDatabase();
    }

    ensureDataDirectory() {
        const dataDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
    }

    initDatabase() {
        try {
            this.db = new Database(this.dbPath);
            this.createTables();
        } catch (error) {
            console.error('Failed to initialize database:', error);
            throw error;
        }
    }

    createTables() {
        // SMS Blacklist table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS sms_blacklist (
                phone TEXT PRIMARY KEY,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // SMS Campaigns table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS sms_campaigns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                survey_id INTEGER NOT NULL,
                from_sender TEXT NOT NULL,
                total INTEGER NOT NULL,
                sent INTEGER DEFAULT 0,
                skipped_blacklist INTEGER DEFAULT 0,
                invalid INTEGER DEFAULT 0,
                micropay_tid TEXT,
                status TEXT DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // SMS Logs table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS sms_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                campaign_id INTEGER NOT NULL,
                type TEXT NOT NULL,
                info TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (campaign_id) REFERENCES sms_campaigns(id)
            )
        `);

        // SMS Recipients table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS sms_recipients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                campaign_id INTEGER NOT NULL,
                phone TEXT NOT NULL,
                message TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (campaign_id) REFERENCES sms_campaigns(id)
            )
        `);

        // Create indexes for better performance
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_campaigns_survey_id ON sms_campaigns(survey_id);
            CREATE INDEX IF NOT EXISTS idx_campaigns_status ON sms_campaigns(status);
            CREATE INDEX IF NOT EXISTS idx_logs_campaign_id ON sms_logs(campaign_id);
            CREATE INDEX IF NOT EXISTS idx_recipients_campaign_id ON sms_recipients(campaign_id);
            CREATE INDEX IF NOT EXISTS idx_recipients_phone ON sms_recipients(phone);
        `);
    }

    /**
     * Create a new SMS campaign
     * @param {Object} campaignData
     * @returns {Object} Created campaign
     */
    createCampaign(campaignData) {
        const { surveyId, fromSender, total, phones, messageTemplate } = campaignData;
        
        const stmt = this.db.prepare(`
            INSERT INTO sms_campaigns (survey_id, from_sender, total, created_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        `);
        
        const result = stmt.run(surveyId, fromSender, total);
        const campaignId = result.lastInsertRowid;
        
        // Insert recipients
        if (phones && phones.length > 0) {
            const recipientStmt = this.db.prepare(`
                INSERT INTO sms_recipients (campaign_id, phone, message)
                VALUES (?, ?, ?)
            `);
            
            const insertRecipients = this.db.transaction((phones, messageTemplate) => {
                for (const phone of phones) {
                    recipientStmt.run(campaignId, phone, messageTemplate);
                }
            });
            
            insertRecipients(phones, messageTemplate);
        }
        
        return this.getCampaignById(campaignId);
    }

    /**
     * Get campaign by ID
     * @param {number} campaignId
     * @returns {Object|null} Campaign data
     */
    getCampaignById(campaignId) {
        const stmt = this.db.prepare(`
            SELECT * FROM sms_campaigns WHERE id = ?
        `);
        
        return stmt.get(campaignId);
    }

    /**
     * Update campaign status
     * @param {number} campaignId
     * @param {Object} updateData
     * @returns {boolean} Success status
     */
    updateCampaign(campaignId, updateData) {
        const { sent, skipped_blacklist, invalid, micropay_tid, status } = updateData;
        
        const stmt = this.db.prepare(`
            UPDATE sms_campaigns 
            SET sent = COALESCE(?, sent),
                skipped_blacklist = COALESCE(?, skipped_blacklist),
                invalid = COALESCE(?, invalid),
                micropay_tid = COALESCE(?, micropay_tid),
                status = COALESCE(?, status),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        
        const result = stmt.run(sent, skipped_blacklist, invalid, micropay_tid, status, campaignId);
        return result.changes > 0;
    }

    /**
     * Add log entry for campaign
     * @param {number} campaignId
     * @param {string} type
     * @param {string} info
     * @returns {number} Log ID
     */
    addLog(campaignId, type, info) {
        const stmt = this.db.prepare(`
            INSERT INTO sms_logs (campaign_id, type, info, created_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        `);
        
        const result = stmt.run(campaignId, type, info);
        return result.lastInsertRowid;
    }

    /**
     * Get campaign logs
     * @param {number} campaignId
     * @param {number} limit
     * @returns {Array} Log entries
     */
    getCampaignLogs(campaignId, limit = 50) {
        const stmt = this.db.prepare(`
            SELECT * FROM sms_logs 
            WHERE campaign_id = ? 
            ORDER BY created_at DESC 
            LIMIT ?
        `);
        
        return stmt.all(campaignId, limit);
    }

    /**
     * Get campaigns by survey ID
     * @param {number} surveyId
     * @returns {Array} Campaigns
     */
    getCampaignsBySurvey(surveyId) {
        const stmt = this.db.prepare(`
            SELECT * FROM sms_campaigns 
            WHERE survey_id = ? 
            ORDER BY created_at DESC
        `);
        
        return stmt.all(surveyId);
    }

    /**
     * Get all campaigns
     * @param {number} limit
     * @param {number} offset
     * @returns {Array} Campaigns
     */
    getAllCampaigns(limit = 100, offset = 0) {
        const stmt = this.db.prepare(`
            SELECT * FROM sms_campaigns 
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
        `);
        
        return stmt.all(limit, offset);
    }

    /**
     * Get campaign statistics
     * @param {number} campaignId
     * @returns {Object} Statistics
     */
    getCampaignStats(campaignId) {
        const stmt = this.db.prepare(`
            SELECT 
                c.*,
                COUNT(r.id) as total_recipients,
                COUNT(CASE WHEN r.status = 'sent' THEN 1 END) as sent_count,
                COUNT(CASE WHEN r.status = 'failed' THEN 1 END) as failed_count,
                COUNT(CASE WHEN r.status = 'pending' THEN 1 END) as pending_count
            FROM sms_campaigns c
            LEFT JOIN sms_recipients r ON c.id = r.campaign_id
            WHERE c.id = ?
            GROUP BY c.id
        `);
        
        return stmt.get(campaignId);
    }

    /**
     * Update recipient status
     * @param {number} campaignId
     * @param {string} phone
     * @param {string} status
     * @returns {boolean} Success status
     */
    updateRecipientStatus(campaignId, phone, status) {
        const stmt = this.db.prepare(`
            UPDATE sms_recipients 
            SET status = ? 
            WHERE campaign_id = ? AND phone = ?
        `);
        
        const result = stmt.run(status, campaignId, phone);
        return result.changes > 0;
    }

    /**
     * Get campaign recipients
     * @param {number} campaignId
     * @returns {Array} Recipients
     */
    getCampaignRecipients(campaignId) {
        const stmt = this.db.prepare(`
            SELECT * FROM sms_recipients 
            WHERE campaign_id = ? 
            ORDER BY created_at ASC
        `);
        
        return stmt.all(campaignId);
    }

    /**
     * Delete campaign and all related data
     * @param {number} campaignId
     * @returns {boolean} Success status
     */
    deleteCampaign(campaignId) {
        const deleteRecipients = this.db.prepare(`
            DELETE FROM sms_recipients WHERE campaign_id = ?
        `);
        
        const deleteLogs = this.db.prepare(`
            DELETE FROM sms_logs WHERE campaign_id = ?
        `);
        
        const deleteCampaign = this.db.prepare(`
            DELETE FROM sms_campaigns WHERE id = ?
        `);
        
        const deleteAll = this.db.transaction((id) => {
            deleteRecipients.run(id);
            deleteLogs.run(id);
            deleteCampaign.run(id);
        });
        
        try {
            deleteAll(campaignId);
            return true;
        } catch (error) {
            console.error('Error deleting campaign:', error);
            return false;
        }
    }

    /**
     * Get blacklist phones
     * @returns {Array<string>} Array of blacklisted phone numbers
     */
    async getBlacklist() {
        const stmt = this.db.prepare(`
            SELECT phone FROM sms_blacklist ORDER BY created_at DESC
        `);
        
        const result = stmt.all();
        return result.map(row => row.phone);
    }

    /**
     * Merge new phones into blacklist
     * @param {Array<string>} phones - Array of phone numbers to add
     * @returns {Object} Merge result
     */
    async mergeBlacklist(phones) {
        if (!Array.isArray(phones) || phones.length === 0) {
            return { total: 0, added: 0, skipped: 0, allPhones: [] };
        }

        const insertStmt = this.db.prepare(`
            INSERT OR IGNORE INTO sms_blacklist (phone, created_at)
            VALUES (?, CURRENT_TIMESTAMP)
        `);

        const insertPhones = this.db.transaction((phoneList) => {
            let added = 0;
            for (const phone of phoneList) {
                const result = insertStmt.run(phone);
                if (result.changes > 0) {
                    added++;
                }
            }
            return added;
        });

        const added = insertPhones(phones);
        const skipped = phones.length - added;

        // Get all blacklist phones
        const allPhones = await this.getBlacklist();

        return {
            total: allPhones.length,
            added: added,
            skipped: skipped,
            allPhones: allPhones
        };
    }

    /**
     * Get campaign by Micropay TID
     * @param {string} tid - Micropay TID
     * @returns {Object|null} Campaign data
     */
    async getCampaignByTID(tid) {
        const stmt = this.db.prepare(`
            SELECT * FROM sms_campaigns WHERE micropay_tid = ?
        `);
        
        return stmt.get(tid);
    }

    /**
     * Close database connection
     */
    close() {
        if (this.db) {
            this.db.close();
        }
    }
}

module.exports = CampaignStore;
