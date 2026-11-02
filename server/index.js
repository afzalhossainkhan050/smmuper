const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// ---- Startup safety checks ----
const isProd = process.env.NODE_ENV === 'production';
if (isProd) {
  const secret = process.env.JWT_SECRET || '';
  if (secret.length < 32 || /change-in-production|your-secret|smm_uper_jwt_secret_key_2024/.test(secret)) {
    console.error('FATAL: JWT_SECRET must be a strong random value (32+ characters) in production.');
    process.exit(1);
  }
} else if (!process.env.JWT_SECRET) {
  // Development / test only: random per-process secret
  process.env.JWT_SECRET = 'dev-only-' + require('crypto').randomBytes(24).toString('hex');
}
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');

// Initialize database
require('./db/database');

const { xssSanitizer } = require('./middleware/sanitizer');
const { maintenanceCheck } = require('./middleware/maintenance');
const { authLimiter, generalLimiter, resellerApiLimiter } = require('./middleware/rateLimiter');

const app = express();

// Behind Traefik/Nginx: trust the first proxy so rate limiting sees real client IPs
app.set('trust proxy', parseInt(process.env.TRUST_PROXY || '1', 10));
const PORT = process.env.PORT || 5000;

// Security and utility middlewares
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map(o => o.trim()).filter(Boolean);
app.use(cors({
  // Production: only the configured origins (same-origin requests need no CORS).
  origin: allowedOrigins.length ? allowedOrigins : (isProd ? false : true),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Input sanitization & XSS filter
app.use(xssSanitizer);

// Platform maintenance mode enforcer
app.use(maintenanceCheck);

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(isProd ? 'combined' : 'dev'));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'SMM UPER Panel Backend API',
    uptime: process.uptime(),
  });
});

// Apply Rate Limiters
app.use('/api', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/v2', resellerApiLimiter);
app.use('/api/user-api', resellerApiLimiter);

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/system', require('./routes/system'));
app.use('/api/services', require('./routes/services'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/referrals', require('./routes/referrals'));
app.use('/api/child-panels', require('./routes/child_panels'));
app.use('/api/kyc', require('./routes/kyc'));
app.use('/api/cms', require('./routes/cms'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/user-api', require('./routes/api'));
app.use('/api/v2', require('./routes/api'));

// Dynamic SEO Sitemap
app.get('/sitemap.xml', (req, res) => {
  try {
    const db = require('./db/database');
    const pages = db.prepare("SELECT slug, updated_at FROM pages WHERE status = 'active'").all();
    const blogs = db.prepare("SELECT slug, updated_at FROM blogs WHERE status = 'active'").all();

    const baseUrl = 'https://smmuper.com';
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Static priority pages
    const staticUrls = [
      { loc: '/', priority: '1.0', changefreq: 'daily' },
      { loc: '/services', priority: '0.9', changefreq: 'hourly' },
      { loc: '/blogs', priority: '0.8', changefreq: 'daily' },
      { loc: '/login', priority: '0.5', changefreq: 'monthly' },
      { loc: '/register', priority: '0.6', changefreq: 'monthly' }
    ];

    staticUrls.forEach(u => {
      xml += `  <url>\n    <loc>${baseUrl}${u.loc}</loc>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>\n`;
    });

    pages.forEach(p => {
      xml += `  <url>\n    <loc>${baseUrl}/page/${p.slug}</loc>\n    <lastmod>${(p.updated_at || new Date().toISOString()).split('T')[0]}</lastmod>\n    <priority>0.7</priority>\n  </url>\n`;
    });

    blogs.forEach(b => {
      xml += `  <url>\n    <loc>${baseUrl}/blog/${b.slug}</loc>\n    <lastmod>${(b.updated_at || new Date().toISOString()).split('T')[0]}</lastmod>\n    <priority>0.8</priority>\n  </url>\n`;
    });

    xml += '</urlset>';
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    res.status(500).send('Error generating sitemap');
  }
});

// Dynamic robots.txt
app.get('/robots.txt', (req, res) => {
  const robots = `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /dashboard/\nDisallow: /api/\n\nSitemap: https://smmuper.com/sitemap.xml\n`;
  res.header('Content-Type', 'text/plain');
  res.send(robots);
});

// Serve client in production build if present
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// 404 Handler for API
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.originalUrl} not found.`,
  });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
});

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🚀 SMM UPER Server running on port ${PORT}`);
    console.log(`📡 API Base: http://localhost:${PORT}/api`);
    console.log(`🛠️  Health:   http://localhost:${PORT}/api/health`);
    console.log(`===============================================`);
  });
}

module.exports = app;
