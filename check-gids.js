const BigQueryService = require('./services/bigqueryService');
const fs = require('fs');
const path = require('path');

async function checkAndUpdateGlist() {
    try {
        const bigqueryService = new BigQueryService();
        await bigqueryService.ensureInitialized();
        
        console.log('Reading glist.csv...');
        const csvPath = path.join(__dirname, 'data/glist.csv');
        const csvContent = fs.readFileSync(csvPath, 'utf8');
        const lines = csvContent.split('\n').filter(line => line.trim());
        
        console.log(`Processing ${lines.length} lines...`);
        
        const validLines = [];
        let checkedCount = 0;
        let validCount = 0;
        let invalidCount = 0;
        
        for (const line of lines) {
            const parts = line.split('\t');
            if (parts.length >= 2) {
                const gid = parts[1].trim();
                
                if (gid.startsWith('gid')) {
                    checkedCount++;
                    console.log(`Checking ${gid}...`);
                    
                    try {
                        // Check if this GID field exists and has data
                        const query = `
                            SELECT COUNT(*) as count
                            FROM \`${bigqueryService.projectId}.${bigqueryService.datasetId}.${bigqueryService.tableName}\`
                            WHERE \`${gid}\` = '1'
                        `;
                        
                        const options = {
                            query: query,
                            location: 'me-west1'
                        };
                        
                        const [job] = await bigqueryService.bigquery.createQueryJob(options);
                        const [rows] = await job.getQueryResults();
                        
                        if (rows.length > 0 && parseInt(rows[0].count) > 0) {
                            validLines.push(line);
                            validCount++;
                            console.log(`✅ ${gid}: ${rows[0].count} recipients`);
                        } else {
                            invalidCount++;
                            console.log(`❌ ${gid}: no data found`);
                        }
                    } catch (error) {
                        invalidCount++;
                        console.log(`❌ ${gid}: error - ${error.message}`);
                    }
                } else {
                    // Keep non-GID lines (like headers)
                    validLines.push(line);
                }
            }
        }
        
        console.log(`\nResults:`);
        console.log(`Checked: ${checkedCount}`);
        console.log(`Valid: ${validCount}`);
        console.log(`Invalid: ${invalidCount}`);
        
        // Write updated file
        const updatedContent = validLines.join('\n');
        fs.writeFileSync(csvPath, updatedContent, 'utf8');
        
        console.log(`\nUpdated glist.csv with only valid GIDs`);
        
    } catch (error) {
        console.error('Check failed:', error);
    }
}

checkAndUpdateGlist();
