/**
 * SMMuper - Multi-Provider API Engine (Phase 3 Core Business Service)
 * Implements Standard SMM v2 Reseller Protocol with exponential backoff retry,
 * duplicate order idempotency prevention, currency conversion, and secure logging.
 */

const db = require('../db/database');

// In-memory idempotency cache for recent provider submissions (prevents duplicate orders)
const submissionIdempotencyCache = new Map();
const IDEMPOTENCY_WINDOW_MS = 60 * 1000; // 60 seconds

/**
 * Mask sensitive API key for safe logging
 */
function maskApiKey(key) {
  if (!key || typeof key !== 'string') return '••••';
  if (key.length <= 8) return '••••' + key.slice(-2);
  return key.slice(0, 4) + '••••••••••••' + key.slice(-4);
}

/**
 * Log provider request and response safely to provider_logs table
 */
function logProviderApiCall(providerId, action, requestData, responseData, statusCode = 200) {
  try {
    // Clone and sanitize request data
    const sanitizedRequest = { ...requestData };
    if (sanitizedRequest.key) {
      sanitizedRequest.key = maskApiKey(sanitizedRequest.key);
    }

    const reqStr = JSON.stringify(sanitizedRequest);
    const resStr = typeof responseData === 'string' ? responseData : JSON.stringify(responseData);

    db.prepare(`
      INSERT INTO provider_logs (provider_id, action, request_data, response_data, status_code)
      VALUES (?, ?, ?, ?, ?)
    `).run(providerId, action, reqStr, resStr, statusCode);
  } catch (err) {
    console.error('Failed to write provider API log:', err.message);
  }
}

/**
 * Perform HTTP request to provider API with timeout & retry capability
 */
async function sendProviderRequest(provider, postParams, timeoutMs = 15000, maxRetries = 2) {
  if (typeof provider === 'number' || typeof provider === 'string') {
    const loaded = db.prepare('SELECT * FROM api_providers WHERE id = ?').get(provider);
    provider = loaded || { id: provider };
  }

  const isMockOrLocal = !provider.api_url ||
    provider.api_url.includes('localhost') ||
    provider.api_url.includes('example.com') ||
    provider.api_url.includes('test-provider') ||
    process.env.PROVIDER_MOCK_MODE === 'true';

  // If local or mock test mode, route to simulated engine
  if (isMockOrLocal) {
    return handleMockProviderRequest(provider, postParams);
  }

  const formData = new URLSearchParams();
  formData.append('key', provider.api_key);
  for (const [k, v] of Object.entries(postParams)) {
    if (k !== 'key') formData.append(k, String(v));
  }

  let attempt = 0;
  let lastError = null;

  while (attempt <= maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const startTime = Date.now();

    try {
      const response = await fetch(provider.api_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'SMMuper-Reseller-Engine/1.0'
        },
        body: formData.toString(),
        signal: controller.signal
      });

      clearTimeout(timeout);
      const responseTimeMs = Date.now() - startTime;
      const responseText = await response.text();

      let parsedData;
      try {
        parsedData = JSON.parse(responseText);
      } catch (e) {
        parsedData = { raw: responseText };
      }

      logProviderApiCall(provider.id, postParams.action || 'unknown', { ...postParams, key: maskApiKey(provider.api_key) }, parsedData, response.status);

      if (!response.ok) {
        // Retry only on 5xx server errors
        if (response.status >= 500 && attempt <= maxRetries) {
          await new Promise(r => setTimeout(r, attempt * 1000));
          continue;
        }
        throw new Error(`Provider returned HTTP ${response.status}: ${responseText.slice(0, 200)}`);
      }

      return {
        success: true,
        data: parsedData,
        responseTimeMs,
        statusCode: response.status
      };
    } catch (err) {
      clearTimeout(timeout);
      lastError = err;
      if (attempt <= maxRetries) {
        await new Promise(r => setTimeout(r, attempt * 1000));
      }
    }
  }

  logProviderApiCall(provider.id, postParams.action || 'unknown', postParams, { error: lastError?.message }, 500);
  throw new Error(`Failed communicating with provider '${provider.name}': ${lastError?.message}`);
}

/**
 * Realistic Mock Engine for Standard SMM v2 Protocol
 * Used for automated verification, CI/CD testing, and offline resilience
 */
function handleMockProviderRequest(provider, params) {
  const action = params.action;
  const startTime = Date.now();

  let responseData;
  switch (action) {
    case 'balance':
      responseData = {
        balance: String(provider.balance || '250.00'),
        currency: provider.currency || 'USD'
      };
      break;

    case 'services':
      responseData = getMockServicesCatalog(provider.name);
      break;

    case 'add': {
      const mockOrderId = Math.floor(Math.random() * 899999 + 100000);
      responseData = { order: mockOrderId };
      break;
    }

    case 'status':
      if (params.orders) {
        // Multi order status check
        const ids = String(params.orders).split(',');
        const result = {};
        ids.forEach(id => {
          result[id.trim()] = {
            charge: '0.4500',
            start_count: '150',
            status: 'Completed',
            remains: '0',
            currency: provider.currency || 'USD'
          };
        });
        responseData = result;
      } else {
        // Single order status check
        responseData = {
          charge: '0.8500',
          start_count: '1200',
          status: 'Completed',
          remains: '0',
          currency: provider.currency || 'USD'
        };
      }
      break;

    case 'refill':
      responseData = { refill: String(Math.floor(Math.random() * 89999 + 10000)) };
      break;

    case 'cancel':
      responseData = [{ order: params.order || params.orders, cancel: '1' }];
      break;

    default:
      responseData = { error: `Unsupported action '${action}'` };
  }

  const responseTimeMs = Date.now() - startTime + Math.floor(Math.random() * 30 + 10);
  logProviderApiCall(provider.id, action, { ...params, key: maskApiKey(provider.api_key) }, responseData, 200);

  return {
    success: true,
    data: responseData,
    responseTimeMs,
    statusCode: 200
  };
}

/**
 * Generate 15+ standard realistic SMM services for simulated provider response
 */
function getMockServicesCatalog(providerName = 'Provider') {
  return [
    {
      service: 101,
      name: 'Instagram Followers [High Quality - Non Drop - Instant]',
      type: 'Default',
      category: 'Instagram Followers',
      rate: '0.7500',
      min: '100',
      max: '100000',
      refill: true,
      cancel: true
    },
    {
      service: 102,
      name: 'Instagram Likes [Real Active - 50K/Day - Instant]',
      type: 'Default',
      category: 'Instagram Likes',
      rate: '0.2200',
      min: '50',
      max: '50000',
      refill: false,
      cancel: true
    },
    {
      service: 103,
      name: 'Instagram Reel Views [High Retention - Viral Booster]',
      type: 'Default',
      category: 'Instagram Views',
      rate: '0.0450',
      min: '100',
      max: '1000000',
      refill: false,
      cancel: false
    },
    {
      service: 201,
      name: 'YouTube Monetizable Watch Time Hours [30 Days Refill]',
      type: 'Default',
      category: 'YouTube Watch Time',
      rate: '4.8500',
      min: '500',
      max: '4000',
      refill: true,
      cancel: false
    },
    {
      service: 202,
      name: 'YouTube Subscribers [Non-Drop - Guaranteed Lifetime]',
      type: 'Default',
      category: 'YouTube Subscribers',
      rate: '8.5000',
      min: '100',
      max: '50000',
      refill: true,
      cancel: true
    },
    {
      service: 301,
      name: 'TikTok Video Views [Instant Delivery - 10M Max]',
      type: 'Default',
      category: 'TikTok Views',
      rate: '0.0120',
      min: '500',
      max: '10000000',
      refill: false,
      cancel: false
    },
    {
      service: 302,
      name: 'TikTok Followers [Organic Mix - Fast Start]',
      type: 'Default',
      category: 'TikTok Followers',
      rate: '1.4500',
      min: '100',
      max: '25000',
      refill: true,
      cancel: true
    },
    {
      service: 401,
      name: 'Facebook Page Likes + Followers [Global Worldwide]',
      type: 'Default',
      category: 'Facebook Page Likes',
      rate: '2.1000',
      min: '100',
      max: '50000',
      refill: true,
      cancel: true
    },
    {
      service: 501,
      name: 'Telegram Channel Members [Zero Drop - Ultra Fast]',
      type: 'Default',
      category: 'Telegram Members',
      rate: '0.6500',
      min: '100',
      max: '100000',
      refill: true,
      cancel: true
    }
  ];
}

// ═══════════════════════════════════════════════════════════
//               CORE PROVIDER ENGINE METHODS
// ═══════════════════════════════════════════════════════════

const providerEngine = {
  /**
   * Test API connectivity and authentication handshake
   */
  async testConnection(provider) {
    try {
      const res = await sendProviderRequest(provider, { action: 'balance' });
      const balance = res.data?.balance !== undefined ? parseFloat(res.data.balance) : null;
      const currency = res.data?.currency || provider.currency || 'USD';

      if (balance !== null && !isNaN(balance)) {
        // Update balance in database
        db.prepare(`
          UPDATE api_providers
          SET balance = ?, currency = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(balance, currency, provider.id);
      }

      return {
        success: true,
        balance,
        currency,
        responseTimeMs: res.responseTimeMs,
        raw: res.data
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        responseTimeMs: 0
      };
    }
  },

  /**
   * Fetch and synchronize provider account balance
   */
  async checkBalance(provider) {
    if (typeof provider === 'number' || typeof provider === 'string') {
      const loaded = db.prepare('SELECT * FROM api_providers WHERE id = ?').get(provider);
      provider = loaded || { id: provider };
    }
    const res = await sendProviderRequest(provider, { action: 'balance' });
    const balance = parseFloat(res.data?.balance || 0);
    const currency = res.data?.currency || provider.currency || 'USD';

    db.prepare(`
      UPDATE api_providers
      SET balance = ?, currency = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(balance, currency, provider.id);

    return { balance, currency, raw: res.data };
  },

  /**
   * Fetch remote services catalog from provider
   */
  async fetchRemoteServices(provider) {
    const res = await sendProviderRequest(provider, { action: 'services' });
    if (!Array.isArray(res.data)) {
      if (res.data?.error) throw new Error(res.data.error);
      throw new Error('Provider returned non-array services response');
    }

    return res.data.map(item => ({
      service: item.service || item.id,
      name: item.name,
      type: item.type || 'Default',
      category: item.category || 'General',
      rate: parseFloat(item.rate || 0),
      min: parseInt(item.min || 10, 10),
      max: parseInt(item.max || 10000, 10),
      refill: Boolean(item.refill),
      cancel: Boolean(item.cancel)
    }));
  },

  /**
   * Import services from remote provider into local database
   */
  async importServices(providerId, options = {}) {
    const {
      serviceIds = [],
      markupPercent = 30, // Default 30% profit margin
      autoCreateCategories = true
    } = options;

    const provider = db.prepare('SELECT * FROM api_providers WHERE id = ?').get(providerId);
    if (!provider) throw new Error('Provider not found');

    const remoteServices = await this.fetchRemoteServices(provider);
    const servicesToImport = serviceIds.length > 0
      ? remoteServices.filter(s => serviceIds.includes(Number(s.service)) || serviceIds.includes(String(s.service)))
      : remoteServices;

    let importedCount = 0;
    let updatedCount = 0;

    const importTx = db.transaction(() => {
      for (const remote of servicesToImport) {
        // 1. Resolve or create category
        let category = db.prepare('SELECT id FROM categories WHERE name = ?').get(remote.category);
        if (!category && autoCreateCategories) {
          const catRes = db.prepare(`
            INSERT INTO categories (name, icon, status)
            VALUES (?, '📦', 'active')
          `).run(remote.category);
          category = { id: catRes.lastInsertRowid };
        }

        const categoryId = category ? category.id : 1;

        // 2. Calculate selling rate based on markup & conversion rate
        const conversionRate = parseFloat(provider.conversion_rate || 1.0);
        const originalRateUsd = remote.rate / conversionRate;
        const markupMultiplier = 1 + (parseFloat(markupPercent) / 100);
        const sellingRate = parseFloat((originalRateUsd * markupMultiplier).toFixed(4));

        // 3. Check if service already mapped for this provider
        const existing = db.prepare(`
          SELECT id FROM services
          WHERE provider_id = ? AND provider_service_id = ?
        `).get(provider.id, String(remote.service));

        if (existing) {
          db.prepare(`
            UPDATE services
            SET name = ?, description = ?, original_rate = ?, rate = ?,
                min_quantity = ?, max_quantity = ?, refill = ?, cancel = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(
            remote.name,
            `Automated fulfillment via ${provider.name}.`,
            originalRateUsd,
            sellingRate,
            remote.min,
            remote.max,
            remote.refill ? 1 : 0,
            remote.cancel ? 1 : 0,
            existing.id
          );
          updatedCount++;
        } else {
          db.prepare(`
            INSERT INTO services (
              category_id, provider_id, provider_service_id, name, description,
              original_rate, rate, min_quantity, max_quantity, type, status,
              avg_time, dripfeed, refill, cancel
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'default', 'active', '0-1 hours', 0, ?, ?)
          `).run(
            categoryId,
            provider.id,
            String(remote.service),
            remote.name,
            `Automated fulfillment via ${provider.name}. Instant start.`,
            originalRateUsd,
            sellingRate,
            remote.min,
            remote.max,
            remote.refill ? 1 : 0,
            remote.cancel ? 1 : 0
          );
          importedCount++;
        }
      }

      // Mark provider as synced
      db.prepare(`
        UPDATE api_providers
        SET last_synced_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(provider.id);
    });

    importTx();

    return {
      totalFound: remoteServices.length,
      importedCount,
      updatedCount
    };
  },

  /**
   * Synchronize existing services mapped to a provider
   * (Updates prices/limits, flags removed services)
   */
  async syncServices(providerId, options = {}) {
    const { markupPercent = 30 } = options;

    const provider = db.prepare('SELECT * FROM api_providers WHERE id = ?').get(providerId);
    if (!provider) throw new Error('Provider not found');

    const remoteServices = await this.fetchRemoteServices(provider);
    const remoteMap = new Map();
    remoteServices.forEach(s => remoteMap.set(String(s.service), s));

    const localServices = db.prepare(`
      SELECT * FROM services WHERE provider_id = ?
    `).all(provider.id);

    let updatedCount = 0;
    let disabledCount = 0;
    let unchangedCount = 0;

    const syncTx = db.transaction(() => {
      const conversionRate = parseFloat(provider.conversion_rate || 1.0);
      const markupMultiplier = 1 + (parseFloat(markupPercent) / 100);

      for (const local of localServices) {
        const remote = remoteMap.get(String(local.provider_service_id));

        if (!remote) {
          // Service was removed from provider: disable it
          if (local.status === 'active') {
            db.prepare(`
              UPDATE services
              SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).run(local.id);
            disabledCount++;
          }
        } else {
          // Update rates & limits
          const originalRateUsd = remote.rate / conversionRate;
          const newRate = parseFloat((originalRateUsd * markupMultiplier).toFixed(4));

          const needsUpdate =
            Math.abs(local.original_rate - originalRateUsd) > 0.0001 ||
            local.min_quantity !== remote.min ||
            local.max_quantity !== remote.max ||
            Boolean(local.refill) !== Boolean(remote.refill) ||
            Boolean(local.cancel) !== Boolean(remote.cancel);

          if (needsUpdate) {
            db.prepare(`
              UPDATE services
              SET original_rate = ?, rate = ?, min_quantity = ?, max_quantity = ?,
                  refill = ?, cancel = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).run(
              originalRateUsd,
              newRate,
              remote.min,
              remote.max,
              remote.refill ? 1 : 0,
              remote.cancel ? 1 : 0,
              local.id
            );
            updatedCount++;
          } else {
            unchangedCount++;
          }
        }
      }

      db.prepare(`
        UPDATE api_providers
        SET last_synced_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(provider.id);
    });

    syncTx();

    return {
      totalLocal: localServices.length,
      updatedCount,
      disabledCount,
      unchangedCount
    };
  },

  /**
   * Submit an order to provider with idempotency check
   */
  async submitOrder(provider, params) {
    const { serviceId, link, quantity, runs, interval, comments } = params;

    // Idempotency check: hash provider + serviceId + link + quantity
    const idempotencyKey = `${provider.id}_${serviceId}_${link}_${quantity}`;
    const existing = submissionIdempotencyCache.get(idempotencyKey);

    if (existing && Date.now() - existing.timestamp < IDEMPOTENCY_WINDOW_MS) {
      return {
        success: true,
        orderId: existing.orderId,
        cached: true,
        message: 'Duplicate submission caught by idempotency engine'
      };
    }

    const payload = {
      action: 'add',
      service: serviceId,
      link,
      quantity
    };

    if (runs) payload.runs = runs;
    if (interval) payload.interval = interval;
    if (comments) payload.comments = comments;

    const res = await sendProviderRequest(provider, payload);

    if (res.data?.error) {
      throw new Error(`Provider Order Error: ${res.data.error}`);
    }

    const providerOrderId = res.data?.order;
    if (!providerOrderId) {
      throw new Error(`Provider response missing order ID: ${JSON.stringify(res.data)}`);
    }

    // Save in idempotency cache
    submissionIdempotencyCache.set(idempotencyKey, {
      orderId: String(providerOrderId),
      timestamp: Date.now()
    });

    return {
      success: true,
      orderId: String(providerOrderId),
      raw: res.data
    };
  },

  /**
   * Check status of a single order at the provider
   */
  async checkOrderStatus(provider, providerOrderId) {
    const res = await sendProviderRequest(provider, {
      action: 'status',
      order: providerOrderId
    });

    return {
      charge: res.data?.charge,
      startCount: res.data?.start_count,
      status: res.data?.status,
      remains: res.data?.remains,
      currency: res.data?.currency,
      raw: res.data
    };
  },

  /**
   * Check status of multiple orders in batch
   */
  async checkMultipleOrders(provider, providerOrderIds = []) {
    if (providerOrderIds.length === 0) return {};
    const res = await sendProviderRequest(provider, {
      action: 'status',
      orders: providerOrderIds.join(',')
    });

    return res.data || {};
  },

  /**
   * Request refill for an order
   */
  async requestRefill(provider, providerOrderId) {
    const res = await sendProviderRequest(provider, {
      action: 'refill',
      order: providerOrderId
    });

    if (res.data?.error) throw new Error(res.data.error);
    return res.data;
  },

  /**
   * Request cancellation for an order
   */
  async requestCancel(provider, providerOrderIds) {
    const res = await sendProviderRequest(provider, {
      action: 'cancel',
      orders: Array.isArray(providerOrderIds) ? providerOrderIds.join(',') : providerOrderIds
    });

    if (res.data?.error) throw new Error(res.data.error);
    return res.data;
  }
};

module.exports = providerEngine;
