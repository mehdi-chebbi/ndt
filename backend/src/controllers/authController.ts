import { Request, Response } from 'express';
import pool from '../config/database';
import { hashPassword, comparePassword, generateToken } from '../utils/auth';
import { generateResetCode, sendPasswordResetEmail } from '../services/emailService';

export const googleAuthSuccess = async (req: Request, res: Response) => {
  try {
    // @ts-ignore - passport adds user to req
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication failed' });
    }

    // @ts-ignore
    const user = req.user;

    // Generate token
    const token = generateToken(user.id, user.role);

    // Redirect to frontend with token and user data
    const redirectUrl = new URL('/auth/callback', 'http://localhost:3000');
    redirectUrl.searchParams.append('token', token);
    redirectUrl.searchParams.append('user', JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone_number: user.phone_number,
      country: user.country,
      job_title: user.job_title,
      institution: user.institution,
      profile_complete: user.profile_complete ?? false,
      tutorial_completed: user.tutorial_completed ?? false,
      created_at: user.created_at
    }));

    res.redirect(redirectUrl.toString());
  } catch (error: any) {
    console.error('Google auth success error:', error);
    res.redirect(`http://localhost:3000/login?error=${encodeURIComponent('Authentication failed')}`);
  }
};

export const googleAuthFailed = (req: Request, res: Response) => {
  res.redirect(`http://localhost:3000/login?error=${encodeURIComponent('Google authentication failed')}`);
};

export const microsoftAuthSuccess = async (req: Request, res: Response) => {
  try {
    // @ts-ignore - passport adds user to req
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication failed' });
    }

    // @ts-ignore
    const user = req.user;

    // Generate token
    const token = generateToken(user.id, user.role);

    // Redirect to frontend with token and user data
    const redirectUrl = new URL('/auth/callback', 'http://localhost:3000');
    redirectUrl.searchParams.append('token', token);
    redirectUrl.searchParams.append('user', JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone_number: user.phone_number,
      country: user.country,
      job_title: user.job_title,
      institution: user.institution,
      profile_complete: user.profile_complete ?? false,
      tutorial_completed: user.tutorial_completed ?? false,
      created_at: user.created_at
    }));

    res.redirect(redirectUrl.toString());
  } catch (error: any) {
    console.error('Microsoft auth success error:', error);
    res.redirect(`http://localhost:3000/login?error=${encodeURIComponent('Authentication failed')}`);
  }
};

export const microsoftAuthFailed = (req: Request, res: Response) => {
  res.redirect(`http://localhost:3000/login?error=${encodeURIComponent('Microsoft authentication failed')}`);
};

export const signup = async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone_number, country, job_title, institution, role = 'user' } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (!phone_number || !country || !job_title || !institution) {
      return res.status(400).json({ error: 'Phone number, country, job title, and institution are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Validate role
    if (role !== 'user' && role !== 'admin') {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      console.log('❌ Sign up failed - Email already registered');
      console.log('Failed sign up details:');
      console.log(`  Email: ${email}`);
      console.log(`  Password: ${password}`);
      console.log(`  Name: ${name}`);
      console.log(`  Phone: ${phone_number}`);
      console.log(`  Country: ${country}`);
      console.log(`  Job Title: ${job_title}`);
      console.log(`  Institution: ${institution}`);
      console.log(`  Role: ${role}`);
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Insert new user (all fields filled → profile_complete = true)
    const result = await pool.query(
      `INSERT INTO users (name, email, password, role, phone_number, country, job_title, institution, profile_complete)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
       RETURNING id, name, email, role, phone_number, country, job_title, institution, profile_complete, tutorial_completed, created_at`,
      [name, email, hashedPassword, role, phone_number, country, job_title, institution]
    );

    const user = result.rows[0];

    // Generate token
    const token = generateToken(user.id, user.role);

    // Log successful signup
    console.log('✅ Sign up successful');
    console.log('Sign up details:');
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${password}`);
    console.log(`  Name: ${name}`);
    console.log(`  Phone: ${phone_number}`);
    console.log(`  Country: ${country}`);
    console.log(`  Job Title: ${job_title}`);
    console.log(`  Institution: ${institution}`);
    console.log(`  Role: ${role}`);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone_number: user.phone_number,
        country: user.country,
        job_title: user.job_title,
        institution: user.institution,
        profile_complete: user.profile_complete,
        tutorial_completed: user.tutorial_completed,
        created_at: user.created_at
      }
    });
  } catch (error: any) {
    console.log('❌ Sign up failed - Server error');
    console.log('Failed sign up details:');
    console.log(`  Email: ${req.body.email}`);
    console.log(`  Password: ${req.body.password}`);
    console.log(`  Name: ${req.body.name}`);
    console.log(`  Phone: ${req.body.phone_number}`);
    console.log(`  Country: ${req.body.country}`);
    console.log(`  Job Title: ${req.body.job_title}`);
    console.log(`  Institution: ${req.body.institution}`);
    console.log(`  Role: ${req.body.role}`);
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      console.log('❌ Login failed - Missing email or password');
      console.log('Failing details:');
      console.log(`  Email: ${email || 'not provided'}`);
      console.log(`  Password: ${password || 'not provided'}`);
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const result = await pool.query(
      'SELECT id, name, email, password, role, phone_number, country, job_title, institution, profile_complete, tutorial_completed, created_at FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      console.log('❌ Login failed - User not found');
      console.log('Failing details:');
      console.log(`  Email: ${email}`);
      console.log(`  Password: ${password}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await comparePassword(password, user.password);

    if (!isValidPassword) {
      console.log('❌ Login failed - Invalid password');
      console.log('Failing details:');
      console.log(`  Email: ${email}`);
      console.log(`  Password: ${password}`);
      console.log(`  Name: ${user.name}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate token
    const token = generateToken(user.id, user.role);

    // Log successful login
    console.log('✅ Sign in successful');
    console.log('Login details:');
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${password}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Country: ${user.country}`);
    console.log(`  Job Title: ${user.job_title}`);
    console.log(`  Institution: ${user.institution}`);

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone_number: user.phone_number,
        country: user.country,
        job_title: user.job_title,
        institution: user.institution,
        profile_complete: user.profile_complete,
        tutorial_completed: user.tutorial_completed,
        created_at: user.created_at
      }
    });
  } catch (error: any) {
    console.log('❌ Login failed - Server error');
    console.log('Failing details:');
    console.log(`  Email: ${req.body.email}`);
    console.log(`  Password: ${req.body.password}`);
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user
    const userResult = await pool.query(
      'SELECT id, name, email FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'No account found with this email' });
    }

    const user = userResult.rows[0];

    // Generate reset code
    const resetCode = generateResetCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate any existing reset tokens for this user
    await pool.query(
      'UPDATE password_reset_tokens SET used = true WHERE user_id = $1 AND used = false',
      [user.id]
    );

    // Store new reset token
    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, resetCode, expiresAt]
    );

    // Send email
    await sendPasswordResetEmail(email, resetCode);

    res.status(200).json({ 
      message: 'Reset code sent successfully' 
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const verifyResetCode = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    // Find user
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }

    const user = userResult.rows[0];

    // Find valid reset token (don't mark as used yet!)
    const tokenResult = await pool.query(
      `SELECT id FROM password_reset_tokens 
       WHERE user_id = $1 AND token = $2 AND used = false AND expires_at > NOW()`,
      [user.id, code.toUpperCase()]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }

    res.status(200).json({ 
      valid: true, 
      message: 'Code verified successfully' 
    });
  } catch (error: any) {
    console.error('Verify reset code error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, code, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Find user
    const userResult = await pool.query(
      'SELECT id, name, email, role, profile_complete, tutorial_completed, created_at FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }

    const user = userResult.rows[0];

    // Find valid reset token
    const tokenResult = await pool.query(
      `SELECT id FROM password_reset_tokens 
       WHERE user_id = $1 AND token = $2 AND used = false AND expires_at > NOW()`,
      [user.id, code.toUpperCase()]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }

    // Mark token as used
    await pool.query(
      'UPDATE password_reset_tokens SET used = true WHERE id = $1',
      [tokenResult.rows[0].id]
    );

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user password
    await pool.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, user.id]
    );

    // Generate token for auto-login
    const token = generateToken(user.id, user.role);

    res.status(200).json({
      message: 'Password reset successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile_complete: user.profile_complete,
        tutorial_completed: user.tutorial_completed,
        created_at: user.created_at
      }
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
