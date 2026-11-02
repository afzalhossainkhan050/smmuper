const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../db/database');
const { successResponse, errorResponse } = require('../utils/helpers');

// ──────────────── GET /api/cms/sections/:section ────────────────
// Public endpoint to retrieve landing page content sections (hero, about, features, faq, testimonials, payment_partners)
router.get('/sections/:section', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM cms_content WHERE section_name = ?').get(req.params.section);
    if (!row) {
      return errorResponse(res, `CMS section '${req.params.section}' not found.`, 404);
    }

    let parsedContent = {};
    try {
      parsedContent = JSON.parse(row.content_json);
    } catch (e) {
      parsedContent = {};
    }

    return successResponse(res, {
      section: row.section_name,
      content: parsedContent,
      updated_at: row.updated_at
    }, 'CMS section retrieved');
  } catch (error) {
    console.error('Get CMS section error:', error);
    return errorResponse(res, 'Failed to retrieve CMS section.', 500);
  }
});

// ──────────────── GET /api/cms/pages ────────────────
// Public list of active pages (terms, privacy, refund, etc.)
router.get('/pages', (req, res) => {
  try {
    const pages = db.prepare(`
      SELECT id, name, slug, title, meta_title, meta_description, created_at, updated_at
      FROM pages
      WHERE status = 'active'
      ORDER BY id ASC
    `).all();

    return successResponse(res, { pages }, 'Active pages retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve pages.', 500);
  }
});

// ──────────────── GET /api/cms/pages/:slug ────────────────
// Public single page by slug
router.get('/pages/:slug', (req, res) => {
  try {
    const page = db.prepare(`
      SELECT * FROM pages
      WHERE slug = ? AND status = 'active'
    `).get(req.params.slug);

    if (!page) {
      return errorResponse(res, 'Page not found.', 404);
    }

    return successResponse(res, { page }, 'Page retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch page content.', 500);
  }
});

// ──────────────── GET /api/cms/menus ────────────────
// Public header and footer menus
router.get('/menus', (req, res) => {
  try {
    const items = db.prepare(`
      SELECT id, location, title, url, sort_order, target
      FROM menus
      WHERE status = 'active'
      ORDER BY location ASC, sort_order ASC
    `).all();

    const header = items.filter(m => m.location === 'header');
    const footer = items.filter(m => m.location === 'footer');

    return successResponse(res, {
      menus: { header, footer }
    }, 'Navigation menus retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch menus.', 500);
  }
});

// ──────────────── GET /api/cms/blogs ────────────────
// Public blog articles list with categories and search
router.get('/blogs', (req, res) => {
  try {
    const { category, search, page = 1, limit = 12 } = req.query;
    let where = ["b.status = 'active'"];
    let params = [];

    if (category) {
      where.push('bc.slug = ?');
      params.push(category);
    }

    if (search) {
      where.push('(b.title LIKE ? OR b.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = 'WHERE ' + where.join(' AND ');

    const countRow = db.prepare(`
      SELECT COUNT(*) as total
      FROM blogs b
      JOIN blog_categories bc ON b.category_id = bc.id
      ${whereClause}
    `).get(...params);

    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

    const blogs = db.prepare(`
      SELECT 
        b.id, b.title, b.slug, b.description, b.image, b.views_count, b.created_at,
        bc.name as category_name, bc.slug as category_slug,
        ba.name as author_name, ba.image as author_image, ba.slug as author_slug
      FROM blogs b
      JOIN blog_categories bc ON b.category_id = bc.id
      LEFT JOIN blog_authors ba ON b.author_id = ba.id
      ${whereClause}
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    const categories = db.prepare(`
      SELECT bc.*, COUNT(b.id) as blog_count
      FROM blog_categories bc
      LEFT JOIN blogs b ON bc.id = b.category_id AND b.status = 'active'
      WHERE bc.status = 'active'
      GROUP BY bc.id
      ORDER BY bc.name ASC
    `).all();

    return successResponse(res, {
      blogs,
      categories,
      pagination: {
        total: countRow.total,
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: Math.ceil(countRow.total / parseInt(limit))
      }
    }, 'Blog posts retrieved');
  } catch (error) {
    console.error('Get blogs error:', error);
    return errorResponse(res, 'Failed to retrieve blogs.', 500);
  }
});

// ──────────────── GET /api/cms/blogs/:slug ────────────────
// Public single blog article by slug
router.get('/blogs/:slug', (req, res) => {
  try {
    const blog = db.prepare(`
      SELECT 
        b.*,
        bc.name as category_name, bc.slug as category_slug,
        ba.name as author_name, ba.image as author_image, ba.about as author_about, ba.address as author_address, ba.slug as author_slug
      FROM blogs b
      JOIN blog_categories bc ON b.category_id = bc.id
      LEFT JOIN blog_authors ba ON b.author_id = ba.id
      WHERE b.slug = ? AND b.status = 'active'
    `).get(req.params.slug);

    if (!blog) {
      return errorResponse(res, 'Blog article not found.', 404);
    }

    // Atomically increment views count
    db.prepare('UPDATE blogs SET views_count = views_count + 1 WHERE id = ?').run(blog.id);
    blog.views_count += 1;

    // Get related articles
    const related = db.prepare(`
      SELECT b.id, b.title, b.slug, b.image, b.created_at, bc.name as category_name
      FROM blogs b
      JOIN blog_categories bc ON b.category_id = bc.id
      WHERE b.category_id = ? AND b.id != ? AND b.status = 'active'
      ORDER BY b.created_at DESC
      LIMIT 3
    `).all(blog.category_id, blog.id);

    return successResponse(res, {
      blog,
      related
    }, 'Blog article retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch blog post.', 500);
  }
});

// ──────────────── GET /api/cms/authors ────────────────
// Public authors list
router.get('/authors', (req, res) => {
  try {
    const authors = db.prepare(`
      SELECT id, name, slug, address, about, image, social_links, status
      FROM blog_authors
      WHERE status = 'active'
      ORDER BY name ASC
    `).all();

    const formatted = authors.map(a => {
      let links = [];
      try {
        links = JSON.parse(a.social_links);
      } catch (e) {
        links = [];
      }
      return { ...a, social_links: links };
    });

    return successResponse(res, { authors: formatted }, 'Authors retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve authors.', 500);
  }
});

// ──────────────── GET /api/cms/notices ────────────────
// Public active broadcast notices for dashboard / announcements
router.get('/notices', (req, res) => {
  try {
    const notices = db.prepare(`
      SELECT id, title, description, image, created_at
      FROM notices
      WHERE status = 'active'
      ORDER BY id DESC
      LIMIT 10
    `).all();

    return successResponse(res, { notices }, 'Active notices retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve notices.', 500);
  }
});

// ──────────────── POST /api/cms/subscribe ────────────────
// Newsletter subscription
router.post('/subscribe', [
  body('email').trim().isEmail().withMessage('Valid email address is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, errors.array()[0].msg, 400);
    }

    const { email } = req.body;
    const existing = db.prepare('SELECT id FROM subscribers WHERE email = ?').get(email.toLowerCase());

    if (existing) {
      return successResponse(res, { already_subscribed: true }, 'You are already subscribed to our newsletter.');
    }

    db.prepare('INSERT INTO subscribers (email) VALUES (?)').run(email.toLowerCase());

    return successResponse(res, { subscribed: true }, 'Successfully subscribed to SMMuper updates!', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to subscribe.', 500);
  }
});

// ──────────────── GET /api/cms/seo ────────────────
// Public SEO metadata defaults
router.get('/seo', (req, res) => {
  try {
    const titleRow = db.prepare("SELECT value FROM system_settings WHERE key = 'site_meta_title'").get();
    const descRow = db.prepare("SELECT value FROM system_settings WHERE key = 'site_meta_description'").get();
    const kwRow = db.prepare("SELECT value FROM system_settings WHERE key = 'site_meta_keywords'").get();

    return successResponse(res, {
      title: titleRow ? titleRow.value : 'SMMuper | #1 Social Media Marketing Wholesale SMM Reseller Panel',
      description: descRow ? descRow.value : 'Wholesale SMM Panel provider offering high-speed social media marketing growth, automated multi-provider API engine, instant delivery and 24/7 support.',
      keywords: kwRow ? kwRow.value : 'smm panel, wholesale smm, smm reseller, buy followers, instagram growth, smm api, smmuper',
      canonical: 'https://smmuper.com'
    }, 'SEO metadata retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch SEO settings.', 500);
  }
});

module.exports = router;

