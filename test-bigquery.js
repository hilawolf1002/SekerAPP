const BigQueryService = require('./services/bigqueryService');

async function testBigQuery() {
    try {
        const bigqueryService = new BigQueryService();
        
        // Wait a bit for initialization
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Test connection
        const isConnected = await bigqueryService.testConnection();
        console.log('BigQuery connection test:', isConnected);
        
        if (isConnected) {
            // List available tables
            const tables = await bigqueryService.listTables();
            console.log('Available tables in profiles dataset:', tables);
            
            // Get table info
            const tableInfo = await bigqueryService.getTableInfo();
            console.log('Table info for all_profiles:', tableInfo);
            
            // Check what GID values exist
            const gidCheck = await bigqueryService.checkGidValues();
            console.log('GID values check:', gidCheck);
            
            // Test getting recipients with a real GID
            const result = await bigqueryService.getRecipientsByGid('gid147042615414985');
            console.log('Recipients result:', result);
            
            // Test with another GID to see if we get different results
            if (result.success && result.count === 0) {
                console.log('Trying with a different GID...');
                const result2 = await bigqueryService.getRecipientsByGid('gid512027949183328');
                console.log('Second test result:', result2);
            }
        }
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testBigQuery();
