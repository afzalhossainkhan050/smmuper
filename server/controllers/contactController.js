const Contact = require('../models/Contact');

/**
 * Submit a customer contact inquiry
 */
async function submitContact(req, res) {
  try {
    const { name, email, phone, subject, message } = req.body;

    const contact = Contact.create({
      name,
      email,
      phone: phone || null,
      subject: subject || 'General Inquiry',
      message,
    });

    return res.status(201).json({
      success: true,
      message: 'Thank you for contacting CoolAir Pro! Our customer support team will reply within 24 hours.',
      data: contact,
    });
  } catch (error) {
    console.error('submitContact error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send your message. Please try again or call us directly.',
      error: error.message,
    });
  }
}

/**
 * (Admin) Get all contact messages
 */
async function getAllMessages(req, res) {
  try {
    const { is_read, page = 1, limit = 20 } = req.query;
    const result = Contact.getAll({
      is_read: is_read !== undefined ? is_read === 'true' || is_read === '1' : undefined,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch contact inquiries.',
      error: error.message,
    });
  }
}

/**
 * (Admin) Mark contact message as read
 */
async function markMessageRead(req, res) {
  try {
    const { id } = req.params;
    const existing = Contact.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Message not found.',
      });
    }

    const updated = Contact.markRead(id);
    return res.json({
      success: true,
      message: 'Message marked as read.',
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update message.',
      error: error.message,
    });
  }
}

/**
 * (Admin) Delete contact message
 */
async function deleteMessage(req, res) {
  try {
    const { id } = req.params;
    const existing = Contact.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Message not found.',
      });
    }

    Contact.delete(id);
    return res.json({
      success: true,
      message: 'Message deleted successfully.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete message.',
      error: error.message,
    });
  }
}

module.exports = {
  submitContact,
  getAllMessages,
  markMessageRead,
  deleteMessage,
};
