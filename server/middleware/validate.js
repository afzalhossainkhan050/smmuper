const { body, param, query } = require('express-validator');
const { validationResult } = require('express-validator');

/**
 * Middleware that checks validation results and returns errors if any.
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
}

// --- Validation Rule Sets ---

const registerRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .isMobilePhone('any').withMessage('Please provide a valid phone number'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const loginRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
];

const bookingRules = [
  body('service_id')
    .notEmpty().withMessage('Service is required')
    .isInt({ min: 1 }).withMessage('Invalid service ID'),
  body('customer_name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('customer_email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('customer_phone')
    .trim()
    .notEmpty().withMessage('Phone number is required'),
  body('address')
    .trim()
    .notEmpty().withMessage('Address is required')
    .isLength({ min: 5 }).withMessage('Please provide a full address'),
  body('city')
    .optional({ values: 'falsy' })
    .trim(),
  body('preferred_date')
    .notEmpty().withMessage('Preferred date is required'),
  body('preferred_time')
    .notEmpty().withMessage('Preferred time is required'),
  body('ac_brand')
    .optional({ values: 'falsy' })
    .trim(),
  body('ac_type')
    .optional({ values: 'falsy' })
    .trim(),
  body('problem_description')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 1000 }).withMessage('Description must not exceed 1000 characters'),
];

const contactRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('phone')
    .optional({ values: 'falsy' })
    .trim(),
  body('subject')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 200 }).withMessage('Subject must not exceed 200 characters'),
  body('message')
    .trim()
    .notEmpty().withMessage('Message is required')
    .isLength({ min: 10, max: 2000 }).withMessage('Message must be between 10 and 2000 characters'),
];

const reviewRules = [
  body('booking_id')
    .notEmpty().withMessage('Booking ID is required')
    .isInt({ min: 1 }).withMessage('Invalid booking ID'),
  body('rating')
    .notEmpty().withMessage('Rating is required')
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 1000 }).withMessage('Comment must not exceed 1000 characters'),
];

const serviceRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Service name is required')
    .isLength({ min: 2, max: 200 }).withMessage('Service name must be between 2 and 200 characters'),
  body('short_description')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 300 }).withMessage('Short description must not exceed 300 characters'),
  body('description')
    .optional({ values: 'falsy' })
    .trim(),
  body('icon')
    .optional({ values: 'falsy' })
    .trim(),
  body('price_starting')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('price_label')
    .optional({ values: 'falsy' })
    .trim(),
  body('duration')
    .optional({ values: 'falsy' })
    .trim(),
  body('category')
    .optional({ values: 'falsy' })
    .isIn(['residential', 'commercial', 'both']).withMessage('Category must be residential, commercial, or both'),
];

const updateProfileRules = [
  body('name')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('phone')
    .optional({ values: 'falsy' })
    .trim(),
  body('password')
    .optional({ values: 'falsy' })
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

module.exports = {
  handleValidationErrors,
  registerRules,
  loginRules,
  bookingRules,
  contactRules,
  reviewRules,
  serviceRules,
  updateProfileRules,
};
