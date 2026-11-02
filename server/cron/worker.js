/**
 * SMMuper - Production Background Worker & Scheduled Tasks Engine
 * Manages automated multi-provider order status synchronization,
 * child panel expiry lifecycle, provider balance health checks, and database backups.
 */

const path = require('path');
const fs = require('fs');
const db = require('../db/database');
const providerEngine = require('../services/providerEngine');
const { logAdminActivity } = require('../utils/activityLogger');

class BackgroundWorker {
  constructor() {
    this.isRunning = false;
    this.intervals = [];
  }

  // 1. Synchronize Pending & In-Progress Orders with Provider APIs
  async syncActiveOrders() {
    try {
      const activeOrders = db.prepare(`
        SELECT o.*, p.name as provider_name
        FROM orders o
        JOIN api_providers p ON o.provider_id = p.id
        WHERE o.status IN ('pending', 'processing', 'in_progress')
          AND o.provider_order_id IS NOT NULL
        ORDER BY o.id ASC
        LIMIT 50
      `).all();

      if (activeOrders.length === 0) return { checked: 0, updated: 0 };

      let updatedCount = 0;

      for (const order of activeOrders) {
        try {
          const remoteStatus = await providerEngine.checkOrderStatus(order.provider_id, order.provider_order_id);
          if (!remoteStatus || !remoteStatus.status) continue;

          const normalized = remoteStatus.status.toLowerCase();
          let newStatus = order.status;
          const remains = remoteStatus.remains !== undefined ? parseInt(remoteStatus.remains) : order.remains;
          const startCount = remoteStatus.start_count !== undefined ? parseInt(remoteStatus.start_count) : order.start_count;

          if (['completed', 'complete'].includes(normalized)) {
            newStatus = 'completed';
          } else if (['processing', 'in progress', 'inprogress'].includes(normalized)) {
            newStatus = 'processing';
          } else if (['canceled', 'cancelled'].includes(normalized)) {
            newStatus = 'cancelled';
          } else if (['partial', 'partially completed'].includes(normalized)) {
            newStatus = 'partial';
          }

          if (newStatus !== order.status || remains !== order.remains || startCount !== order.start_count) {
            const syncTx = db.transaction(() => {
              // Update order record
              db.prepare(`
                UPDATE orders
                SET status = ?, remains = ?, start_count = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
              `).run(newStatus, remains, startCount, order.id);

              // Handle automatic refund on Canceled order
              if (newStatus === 'cancelled') {
                const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(order.user_id);
                if (user) {
                  const newBalance = Math.round((user.balance + order.charge) * 10000) / 10000;
                  db.prepare('UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
                    .run(newBalance, order.user_id);

                  db.prepare(`
                    INSERT INTO financial_ledger (
                      user_id, transaction_type, amount, balance_before, balance_after,
                      currency, reference_id, reference_type, description, created_at
                    ) VALUES (
                      ?, 'order_refund', ?, ?, ?,
                      'USD', ?, 'order', ?, CURRENT_TIMESTAMP
                    )
                  `).run(
                    order.user_id,
                    order.charge,
                    user.balance,
                    newBalance,
                    String(order.id),
                    `Automated full refund for canceled order #${order.id} from provider`
                  );
                }
              }

              // Handle automatic partial refund
              if (newStatus === 'partial' && remains > 0 && order.quantity > 0) {
                const refundAmount = Math.round(((order.charge / order.quantity) * remains) * 10000) / 10000;
                if (refundAmount > 0) {
                  const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(order.user_id);
                  if (user) {
                    const newBalance = Math.round((user.balance + refundAmount) * 10000) / 10000;
                    db.prepare('UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
                      .run(newBalance, order.user_id);

                    db.prepare(`
                      INSERT INTO financial_ledger (
                        user_id, transaction_type, amount, balance_before, balance_after,
                        currency, reference_id, reference_type, description, created_at
                      ) VALUES (
                        ?, 'order_partial_refund', ?, ?, ?,
                        'USD', ?, 'order', ?, CURRENT_TIMESTAMP
                      )
                    `).run(
                      order.user_id,
                      refundAmount,
                      user.balance,
                      newBalance,
                      String(order.id),
                      `Automated partial refund for undelivered ${remains} units on order #${order.id}`
                    );
                  }
                }
              }
            });

            syncTx();
            updatedCount++;
          }
        } catch (orderErr) {
          // Log transient provider communication error and continue
          console.warn(`Worker sync order #${order.id} error:`, orderErr.message);
        }
      }

      return { checked: activeOrders.length, updated: updatedCount };
    } catch (err) {
      console.error('Worker syncActiveOrders error:', err.message);
      return { error: err.message };
    }
  }

  // 2. Child Panel Expiration Watcher
  async checkChildPanelExpirations() {
    try {
      const expired = db.prepare(`
        SELECT id, domain FROM child_panels
        WHERE status = 'active'
          AND expires_at IS NOT NULL
          AND expires_at < CURRENT_TIMESTAMP
      `).all();

      if (expired.length > 0) {
        const updateStmt = db.prepare("UPDATE child_panels SET status = 'expired', updated_at = CURRENT_TIMESTAMP WHERE id = ?");
        for (const panel of expired) {
          updateStmt.run(panel.id);
        }
        console.log(`[Worker] Expired ${expired.length} overdue child panel(s).`);
      }

      return { expired_count: expired.length };
    } catch (err) {
      console.error('Worker checkChildPanelExpirations error:', err.message);
      return { error: err.message };
    }
  }

  // 3. Provider Wallet Balance Health Checks
  async checkProviderBalances() {
    try {
      const providers = db.prepare("SELECT id, name FROM api_providers WHERE status = 'active'").all();
      const results = [];

      for (const p of providers) {
        try {
          const balance = await providerEngine.checkBalance(p.id);
          db.prepare('UPDATE api_providers SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(balance, p.id);
          results.push({ id: p.id, name: p.name, balance });

          if (balance < 10.00) {
            console.warn(`⚠️ [Low Balance Alert] Provider '${p.name}' balance is low: $${balance.toFixed(2)}`);
          }
        } catch (bErr) {
          console.warn(`[Worker] Failed checking balance for provider '${p.name}':`, bErr.message);
        }
      }

      return { providers: results };
    } catch (err) {
      console.error('Worker checkProviderBalances error:', err.message);
      return { error: err.message };
    }
  }

  // 4. Automated Point-in-Time SQLite Database Backup
  async performDatabaseBackup() {
    try {
      const dbPath = path.join(__dirname, '..', 'db', 'smm_uper.db');
      const backupDir = path.join(__dirname, '..', 'backups');

      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Checkpoint WAL
      try {
        db.pragma('wal_checkpoint(TRUNCATE)');
      } catch (e) {}

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const targetPath = path.join(backupDir, `smmuper_auto_backup_${timestamp}.db`);

      fs.copyFileSync(dbPath, targetPath);

      // Clean up backups older than 7 days
      const files = fs.readdirSync(backupDir);
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      for (const file of files) {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        if (stats.mtimeMs < sevenDaysAgo) {
          fs.unlinkSync(filePath);
        }
      }

      return { success: true, file: path.basename(targetPath) };
    } catch (err) {
      console.error('Worker performDatabaseBackup error:', err.message);
      return { error: err.message };
    }
  }

  // Start All Scheduled Intervals
  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('⚡ SMMuper Background Worker Daemon Started.');

    // Order status sync: every 2 minutes
    this.intervals.push(setInterval(() => this.syncActiveOrders(), 2 * 60 * 1000));

    // Child panel expiration check: every 15 minutes
    this.intervals.push(setInterval(() => this.checkChildPanelExpirations(), 15 * 60 * 1000));

    // Provider balance check: every 30 minutes
    this.intervals.push(setInterval(() => this.checkProviderBalances(), 30 * 60 * 1000));

    // Automated daily database backup: every 24 hours
    this.intervals.push(setInterval(() => this.performDatabaseBackup(), 24 * 60 * 60 * 1000));
  }

  stop() {
    this.intervals.forEach(clearInterval);
    this.intervals = [];
    this.isRunning = false;
    console.log('🛑 SMMuper Background Worker Stopped.');
  }
}

const worker = new BackgroundWorker();

// Standalone execution entrypoint
if (require.main === module) {
  worker.start();
  // Run initial round immediately
  Promise.all([
    worker.syncActiveOrders(),
    worker.checkChildPanelExpirations(),
    worker.checkProviderBalances(),
    worker.performDatabaseBackup()
  ]).then(() => {
    console.log('✓ Initial worker tasks complete.');
  });
}

module.exports = worker;
