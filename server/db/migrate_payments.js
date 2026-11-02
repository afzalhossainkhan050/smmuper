const db = require('./database');

try {
  console.log('Running payments table check constraint migration...');
  db.exec(`
    PRAGMA foreign_keys=off;
    BEGIN TRANSACTION;
    CREATE TABLE payments_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      payment_method_id INTEGER DEFAULT NULL,
      amount REAL NOT NULL,
      local_amount REAL DEFAULT 0.00,
      currency TEXT DEFAULT 'USD',
      charge REAL DEFAULT 0.00,
      rate REAL DEFAULT 1.00,
      method TEXT NOT NULL,
      transaction_id TEXT,
      payment_proof TEXT DEFAULT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'failed', 'rejected', 'refunded')),
      notes TEXT DEFAULT '',
      admin_feedback TEXT DEFAULT '',
      reviewed_by INTEGER DEFAULT NULL,
      reviewed_at DATETIME DEFAULT NULL,
      payer_details TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT NULL
    );
    INSERT INTO payments_new (id, user_id, payment_method_id, amount, local_amount, currency, charge, rate, method, transaction_id, payment_proof, status, notes, admin_feedback, reviewed_by, reviewed_at, payer_details, created_at, updated_at)
    SELECT id, user_id, payment_method_id, amount, local_amount, currency, charge, rate, method, transaction_id, payment_proof, status, notes, admin_feedback, reviewed_by, reviewed_at, payer_details, created_at, updated_at FROM payments;
    DROP TABLE payments;
    ALTER TABLE payments_new RENAME TO payments;
    CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
    CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
    COMMIT;
    PRAGMA foreign_keys=on;
  `);
  console.log('Migration completed successfully!');
} catch (e) {
  console.error('Migration failed:', e.message);
}
