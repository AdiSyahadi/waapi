/**
 * Data Retention Cleanup Service
 * 
 * Membersihkan data lama berdasarkan retention policy:
 * - Messages: 90 hari
 * - Audit Logs: 365 hari
 * - Webhook Logs: 30 hari
 * - Analytics: 90 hari
 * 
 * Jalankan dengan: node scripts/cleanup-old-data.js
 * Atau setup sebagai cron job: 0 3 * * * node /var/www/whatsapp-api/scripts/cleanup-old-data.js
 */

require('dotenv').config();
const { Sequelize, Op } = require('sequelize');

// Database configuration
const sequelize = new Sequelize(
  process.env.DB_NAME || 'whatsapp_api',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: process.env.DB_DIALECT || 'mysql',
    logging: false
  }
);

// Retention policies (in days)
const RETENTION_POLICIES = {
  messages: parseInt(process.env.RETENTION_MESSAGES_DAYS) || 90,
  audit_logs: parseInt(process.env.RETENTION_AUDIT_LOGS_DAYS) || 365,
  webhook_logs: parseInt(process.env.RETENTION_WEBHOOK_LOGS_DAYS) || 30,
  api_analytics: parseInt(process.env.RETENTION_ANALYTICS_DAYS) || 90,
  message_analytics: parseInt(process.env.RETENTION_ANALYTICS_DAYS) || 90,
  session_analytics: parseInt(process.env.RETENTION_ANALYTICS_DAYS) || 90
};

/**
 * Calculate cutoff date
 */
const getCutoffDate = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

/**
 * Delete old records from a table
 */
const cleanupTable = async (tableName, retentionDays, dateColumn = 'created_at') => {
  const cutoffDate = getCutoffDate(retentionDays);
  
  console.log(`\n📋 Cleaning ${tableName}...`);
  console.log(`   Retention: ${retentionDays} days`);
  console.log(`   Cutoff date: ${cutoffDate.toISOString()}`);
  
  try {
    // Count records to delete
    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as count FROM ${tableName} WHERE ${dateColumn} < :cutoffDate`,
      {
        replacements: { cutoffDate },
        type: Sequelize.QueryTypes.SELECT
      }
    );
    
    const recordCount = countResult?.count || 0;
    
    if (recordCount === 0) {
      console.log(`   ✅ No records to delete`);
      return { table: tableName, deleted: 0 };
    }
    
    console.log(`   Found ${recordCount} records to delete`);
    
    // Delete in batches to avoid locking
    const BATCH_SIZE = 1000;
    let totalDeleted = 0;
    
    while (true) {
      const [result] = await sequelize.query(
        `DELETE FROM ${tableName} WHERE ${dateColumn} < :cutoffDate LIMIT :batchSize`,
        {
          replacements: { cutoffDate, batchSize: BATCH_SIZE },
          type: Sequelize.QueryTypes.DELETE
        }
      );
      
      // result is affected rows count
      const deletedCount = result || 0;
      totalDeleted += deletedCount;
      
      if (deletedCount < BATCH_SIZE) {
        break;
      }
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`   ✅ Deleted ${totalDeleted} records`);
    return { table: tableName, deleted: totalDeleted };
    
  } catch (error) {
    console.error(`   ❌ Error cleaning ${tableName}:`, error.message);
    return { table: tableName, deleted: 0, error: error.message };
  }
};

/**
 * Run cleanup for all tables
 */
const runCleanup = async () => {
  console.log('═══════════════════════════════════════════════════');
  console.log('           DATA RETENTION CLEANUP');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Started at: ${new Date().toISOString()}`);
  
  const results = [];
  
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Cleanup each table
    for (const [table, days] of Object.entries(RETENTION_POLICIES)) {
      const result = await cleanupTable(table, days);
      results.push(result);
    }
    
    // Also cleanup orphaned scheduled messages (failed/cancelled older than 7 days)
    const scheduledCleanup = await cleanupTable(
      'scheduled_messages', 
      7, 
      'updated_at'
    );
    results.push({ ...scheduledCleanup, note: 'Failed/cancelled only' });
    
    // Summary
    console.log('\n═══════════════════════════════════════════════════');
    console.log('                  CLEANUP SUMMARY');
    console.log('═══════════════════════════════════════════════════');
    
    let totalDeleted = 0;
    for (const result of results) {
      console.log(`${result.table}: ${result.deleted} deleted${result.error ? ` (ERROR: ${result.error})` : ''}`);
      totalDeleted += result.deleted;
    }
    
    console.log('───────────────────────────────────────────────────');
    console.log(`TOTAL: ${totalDeleted} records deleted`);
    console.log(`Completed at: ${new Date().toISOString()}`);
    console.log('═══════════════════════════════════════════════════');
    
    return { success: true, results, totalDeleted };
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    return { success: false, error: error.message };
  } finally {
    await sequelize.close();
  }
};

/**
 * Dry run - show what would be deleted without actually deleting
 */
const dryRun = async () => {
  console.log('═══════════════════════════════════════════════════');
  console.log('        DATA RETENTION CLEANUP (DRY RUN)');
  console.log('═══════════════════════════════════════════════════');
  console.log('This is a preview - no data will be deleted\n');
  
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');
    
    for (const [table, days] of Object.entries(RETENTION_POLICIES)) {
      const cutoffDate = getCutoffDate(days);
      
      try {
        const [countResult] = await sequelize.query(
          `SELECT COUNT(*) as count FROM ${table} WHERE created_at < :cutoffDate`,
          {
            replacements: { cutoffDate },
            type: Sequelize.QueryTypes.SELECT
          }
        );
        
        console.log(`${table}:`);
        console.log(`  Retention: ${days} days`);
        console.log(`  Records to delete: ${countResult?.count || 0}`);
        console.log('');
      } catch (error) {
        console.log(`${table}: Error - ${error.message}\n`);
      }
    }
    
  } catch (error) {
    console.error('❌ Dry run failed:', error.message);
  } finally {
    await sequelize.close();
  }
};

// CLI handling
const args = process.argv.slice(2);

if (args.includes('--dry-run') || args.includes('-d')) {
  dryRun();
} else if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Data Retention Cleanup Script

Usage:
  node scripts/cleanup-old-data.js [options]

Options:
  --dry-run, -d    Preview what would be deleted without deleting
  --help, -h       Show this help message

Environment Variables:
  RETENTION_MESSAGES_DAYS      Default: 90
  RETENTION_AUDIT_LOGS_DAYS    Default: 365
  RETENTION_WEBHOOK_LOGS_DAYS  Default: 30
  RETENTION_ANALYTICS_DAYS     Default: 90

Cron Setup (run daily at 3 AM):
  0 3 * * * cd /var/www/whatsapp-api && node scripts/cleanup-old-data.js >> logs/cleanup.log 2>&1
  `);
} else {
  runCleanup();
}

module.exports = { runCleanup, dryRun };
