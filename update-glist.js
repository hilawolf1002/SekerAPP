const BigQueryService = require('./services/bigqueryService');
const fs = require('fs');
const path = require('path');

async function updateGlist() {
    try {
        const bigqueryService = new BigQueryService();
        await bigqueryService.ensureInitialized();
        
        console.log('Getting table schema to find available GID fields...');
        
        // Get table schema to find all GID fields
        const dataset = bigqueryService.bigquery.dataset(bigqueryService.datasetId);
        const table = dataset.table(bigqueryService.tableName);
        const [metadata] = await table.getMetadata();
        
        // Find all GID fields from schema
        const availableGids = metadata.schema.fields
            .filter(field => field.name.startsWith('gid'))
            .map(field => field.name);
        
        console.log(`Found ${availableGids.length} GID fields in BigQuery table`);
        
        // Read current glist.csv
        const csvPath = path.join(__dirname, 'data/glist.csv');
        const csvContent = fs.readFileSync(csvPath, 'utf8');
        const lines = csvContent.split('\n').filter(line => line.trim());
        
        console.log(`Processing ${lines.length} lines from glist.csv`);
        
        // Filter lines to only include existing GIDs
        const validLines = [];
        let skippedCount = 0;
        
        lines.forEach((line, index) => {
            if (index === 0) {
                validLines.push(line); // Keep header if exists
                return;
            }
            
            const parts = line.split('\t');
            if (parts.length >= 2) {
                const gid = parts[1].trim();
                if (availableGids.includes(gid)) {
                    validLines.push(line);
                } else {
                    console.log(`Skipping line with non-existent GID: ${gid}`);
                    skippedCount++;
                }
            }
        });
        
        console.log(`Valid lines: ${validLines.length - 1}, Skipped: ${skippedCount}`);
        
        // Write updated file
        const updatedContent = validLines.join('\n');
        fs.writeFileSync(csvPath, updatedContent, 'utf8');
        
        console.log(`Updated glist.csv with only existing GIDs`);
        console.log(`Available GIDs in BigQuery: ${availableGids.slice(0, 10).join(', ')}${availableGids.length > 10 ? '...' : ''}`);
        
    } catch (error) {
        console.error('Update failed:', error);
    }
}

updateGlist();
