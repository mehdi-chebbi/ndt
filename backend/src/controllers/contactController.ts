import { Request, Response } from 'express';
import { sendContactNotification } from '../services/emailService';

// Handle contact form submission (public — no auth required)
export const submitContact = async (req: Request, res: Response) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validate input
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Trim and sanitize inputs
    const cleanName = name.trim().slice(0, 255);
    const cleanEmail = email.trim().slice(0, 255);
    const cleanSubject = subject.trim().slice(0, 500);
    const cleanMessage = message.trim().slice(0, 5000);

    // Send notification email to all active recipients (async)
    sendContactNotification({
      name: cleanName,
      email: cleanEmail,
      subject: cleanSubject,
      message: cleanMessage,
    }).catch(err => console.error('Failed to send contact notification email:', err));

    res.status(200).json({
      message: 'Your message has been sent successfully. We will get back to you soon.',
    });
  } catch (error: any) {
    console.error('Contact form submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
