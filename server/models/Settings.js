const db = require('../config/database');

class Settings {
  /**
   * Get a setting value by key
   * @param {string} key
   * @returns {string|null}
   */
  static get(key) {
    const stmt = db.prepare('SELECT setting_value FROM site_settings WHERE setting_key = ?');
    const row = stmt.get(key);
    return row ? row.setting_value : null;
  }

  /**
   * Set a setting value (insert or update)
   * @param {string} key
   * @param {string} value
   * @returns {object} Updated setting
   */
  static set(key, value) {
    const existing = db.prepare('SELECT id FROM site_settings WHERE setting_key = ?').get(key);

    if (existing) {
      const stmt = db.prepare(`
        UPDATE site_settings
        SET setting_value = ?, updated_at = datetime('now')
        WHERE setting_key = ?
      `);
      stmt.run(value, key);
    } else {
      const stmt = db.prepare(`
        INSERT INTO site_settings (setting_key, setting_value)
        VALUES (?, ?)
      `);
      stmt.run(key, value);
    }

    return { key, value };
  }

  /**
   * Get all settings as key-value pairs
   * @returns {object}
   */
  static getAll() {
    const stmt = db.prepare('SELECT setting_key, setting_value, updated_at FROM site_settings ORDER BY setting_key');
    const rows = stmt.all();
    const settings = {};
    for (const row of rows) {
      settings[row.setting_key] = row.setting_value;
    }
    return settings;
  }

  /**
   * Get multiple settings by keys
   * @param {string[]} keys
   * @returns {object}
   */
  static getBulk(keys) {
    const placeholders = keys.map(() => '?').join(', ');
    const stmt = db.prepare(`
      SELECT setting_key, setting_value
      FROM site_settings
      WHERE setting_key IN (${placeholders})
    `);
    const rows = stmt.all(...keys);
    const settings = {};
    for (const row of rows) {
      settings[row.setting_key] = row.setting_value;
    }
    return settings;
  }

  /**
   * Set multiple settings at once
   * @param {object} settingsObj - Key-value pairs to set
   */
  static setBulk(settingsObj) {
    const setOne = db.transaction((key, value) => {
      Settings.set(key, value);
    });

    const setAll = db.transaction((obj) => {
      for (const [key, value] of Object.entries(obj)) {
        setOne(key, String(value));
      }
    });

    setAll(settingsObj);
    return Settings.getAll();
  }
}

module.exports = Settings;
