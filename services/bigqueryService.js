const { BigQuery } = require('@google-cloud/bigquery');

class BigQueryService {
    constructor() {
        this.projectId = process.env.BIGQUERY_PROJECT_ID || 'nadlanet';
        this.datasetId = process.env.BIGQUERY_DATASET_ID || 'profiles';
        this.tableName = process.env.BIGQUERY_TABLE_NAME || 'all_profiles';
        this.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS || './nadlanet-d74611f076ac.json';
        this.bigquery = null;
        this.initialized = false;
    }

    async ensureInitialized() {
        if (!this.initialized) {
            await this.init();
        }
        return this.initialized;
    }

    async init() {
        try {
            // Use Service Account authentication
            this.bigquery = new BigQuery({
                projectId: this.projectId,
                keyFilename: this.keyFilename
            });
            
            this.initialized = true;
            console.log('BigQuery service initialized successfully with Service Account');
        } catch (error) {
            console.error('Failed to initialize BigQuery service:', error);
            this.bigquery = null;
            this.initialized = false;
        }
    }

    async getRecipientsByGid(gid) {
        await this.ensureInitialized();
        
        if (!this.bigquery) {
            throw new Error('BigQuery service not initialized');
        }

        try {
            // The GID field name is dynamic, so we need to use the GID value as the field name
            // Look for 'כן' value to find members of this group
            const query = `
                SELECT phone
                FROM \`${this.projectId}.${this.datasetId}.${this.tableName}\`
                WHERE ${gid} = 'כן'
            `;

            const options = {
                query: query,
                location: 'me-west1' // Dataset is located in Israel (me-west1)
            };

            const [job] = await this.bigquery.createQueryJob(options);
            const [rows] = await job.getQueryResults();

            console.log(`BigQuery returned ${rows.length} rows for ${gid}`);
            if (rows.length > 0) {
                console.log('First 3 phone values:', rows.slice(0, 3).map(r => r.phone));
            }

            // Extract phone numbers from the results
            const phones = [];
            rows.forEach((row, index) => {
                if (row.phone && row.phone.trim()) {
                    const normalizedPhone = this.normalizePhone(row.phone);
                    if (normalizedPhone) {
                        phones.push(normalizedPhone);
                    } else {
                        console.log(`Failed to normalize phone: ${row.phone}`);
                    }
                } else {
                    if (index < 5) { // Log first 5 empty phones
                        console.log(`Row ${index}: phone field is empty or null`);
                    }
                }
            });

            console.log(`Extracted ${phones.length} valid phone numbers from ${rows.length} rows`);

            return {
                success: true,
                count: phones.length,
                phones: phones
            };

        } catch (error) {
            console.error('BigQuery query error:', error);
            return {
                success: false,
                error: error.message,
                count: 0,
                phones: []
            };
        }
    }

    normalizePhone(phone) {
        if (!phone) return null;
        
        // Remove all non-digit characters
        const cleanPhone = phone.toString().replace(/\D/g, '');
        
        // Handle Israeli numbers
        if (cleanPhone.startsWith('972')) {
            return cleanPhone;
        } else if (cleanPhone.startsWith('0')) {
            return '972' + cleanPhone.substring(1);
        } else if (cleanPhone.length === 9) {
            return '972' + cleanPhone;
        } else if (cleanPhone.length === 10 && cleanPhone.startsWith('05')) {
            return '972' + cleanPhone.substring(1);
        }
        
        return cleanPhone;
    }

    async listDatasets() {
        try {
            await this.ensureInitialized();
            
            if (!this.bigquery) {
                throw new Error('BigQuery service not initialized');
            }

            const [datasets] = await this.bigquery.getDatasets();
            return datasets.map(dataset => ({
                id: dataset.id,
                location: dataset.metadata.location,
                labels: dataset.metadata.labels
            }));
        } catch (error) {
            console.error('Failed to list datasets:', error);
            return [];
        }
    }

    async listTables() {
        try {
            await this.ensureInitialized();
            
            if (!this.bigquery) {
                throw new Error('BigQuery service not initialized');
            }

            const dataset = this.bigquery.dataset(this.datasetId);
            const [tables] = await dataset.getTables();
            return tables.map(table => ({
                id: table.id,
                name: table.metadata.name,
                type: table.metadata.type
            }));
        } catch (error) {
            console.error('Failed to list tables:', error);
            return [];
        }
    }

    async testConnection() {
        try {
            await this.ensureInitialized();
            
            if (!this.bigquery) {
                return false;
            }
            
            // First, let's see what datasets are available
            const datasets = await this.listDatasets();
            console.log('Available datasets:', datasets);
            
            // Use createQueryJob which might have different permissions
            const query = `SELECT 1 as test LIMIT 1`;
            const [job] = await this.bigquery.createQueryJob(query);
            const [rows] = await job.getQueryResults();
            return rows.length > 0;
        } catch (error) {
            console.error('BigQuery connection test failed:', error);
            return false;
        }
    }

    async getTableInfo() {
        try {
            await this.ensureInitialized();
            
            if (!this.bigquery) {
                throw new Error('BigQuery service not initialized');
            }

            const dataset = this.bigquery.dataset(this.datasetId);
            const table = dataset.table(this.tableName);
            const [metadata] = await table.getMetadata();
            
            return {
                schema: metadata.schema.fields.map(field => ({
                    name: field.name,
                    type: field.type,
                    mode: field.mode
                })),
                rowCount: metadata.numRows,
                created: metadata.creationTime,
                modified: metadata.lastModifiedTime
            };
        } catch (error) {
            console.error('Failed to get table info:', error);
            return null;
        }
    }

    async checkGidValues() {
        try {
            await this.ensureInitialized();
            
            if (!this.bigquery) {
                throw new Error('BigQuery service not initialized');
            }

            // Get table schema to find GID fields
            const dataset = this.bigquery.dataset(this.datasetId);
            const table = dataset.table(this.tableName);
            const [metadata] = await table.getMetadata();
            
            // Find all GID fields from schema
            const gidFields = metadata.schema.fields
                .filter(field => field.name.startsWith('gid'))
                .map(field => field.name);

            if (gidFields.length === 0) {
                return {
                    success: false,
                    error: 'No GID fields found in table schema'
                };
            }

            // Check which GID fields have data (value = 'כן')
            const gidChecks = [];
            for (const gidField of gidFields.slice(0, 10)) { // Limit to first 10 for performance
                try {
                    const query = `
                        SELECT COUNT(*) as count
                        FROM \`${this.projectId}.${this.datasetId}.${this.tableName}\`
                        WHERE ${gidField} = 'כן'
                    `;

                    const options = {
                        query: query,
                        location: 'me-west1'
                    };

                    const [job] = await this.bigquery.createQueryJob(options);
                    const [rows] = await job.getQueryResults();
                    
                    if (rows.length > 0 && rows[0].count > 0) {
                        gidChecks.push({
                            gid: gidField,
                            count: parseInt(rows[0].count)
                        });
                    }
                } catch (error) {
                    console.error(`Error checking ${gidField}:`, error);
                }
            }

            return {
                success: true,
                sampleGids: gidChecks.sort((a, b) => b.count - a.count)
            };

        } catch (error) {
            console.error('Failed to check GID values:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = BigQueryService;
