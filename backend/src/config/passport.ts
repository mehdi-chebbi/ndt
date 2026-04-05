import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as MicrosoftStrategy } from 'passport-microsoft';
import pool from './database';

// Extend Express User type
declare global {
  namespace Express {
    interface User {
      id: number;
      name: string;
      email: string;
      role: string;
      profile_complete: boolean;
    }
  }
}

// Serialize user into session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: number, done) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, phone_number, country, job_title, institution, profile_complete, tutorial_completed, created_at FROM users WHERE id = $1',
      [id]
    );
    if (result.rows.length > 0) {
      done(null, result.rows[0]);
    } else {
      done(null, false);
    }
  } catch (error) {
    done(error, false);
  }
});

// Google OAuth Strategy (only register if credentials are configured)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user already exists by email
          const existingUser = await pool.query(
            'SELECT id, name, email, role, phone_number, country, job_title, institution, profile_complete, tutorial_completed, created_at FROM users WHERE email = $1',
            [profile.emails?.[0].value]
          );

          if (existingUser.rows.length > 0) {
            return done(null, existingUser.rows[0]);
          }

          // Create new user (profile_complete = false, missing profile fields)
          const newUser = await pool.query(
            `INSERT INTO users (name, email, password, role, profile_complete)
             VALUES ($1, $2, $3, $4, false)
             RETURNING id, name, email, role, phone_number, country, job_title, institution, profile_complete, tutorial_completed, created_at`,
            [
              profile.displayName || (profile.name?.givenName + ' ' + profile.name?.familyName) || 'Google User',
              profile.emails?.[0].value,
              'oauth_user_no_password',
              'user'
            ]
          );

          return done(null, newUser.rows[0]);
        } catch (error) {
          return done(error, undefined);
        }
      }
    )
  );
} else {
  console.warn('[Passport] Google OAuth disabled: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set');
}

// Microsoft Azure AD / Outlook OAuth Strategy (only register if credentials are configured)
if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
  passport.use(
    new MicrosoftStrategy(
      {
        clientID: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        callbackURL: process.env.MICROSOFT_CALLBACK_URL || 'http://localhost:3001/api/auth/microsoft/callback',
        scope: ['user.read'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;

          if (!email) {
            return done(new Error('No email found in Microsoft profile'), undefined);
          }

          const name = profile.displayName || (profile.name?.givenName + ' ' + profile.name?.familyName) || 'Microsoft User';

          // Check if user already exists by email
          const existingUser = await pool.query(
            'SELECT id, name, email, role, phone_number, country, job_title, institution, profile_complete, tutorial_completed, created_at FROM users WHERE email = $1',
            [email]
          );

          if (existingUser.rows.length > 0) {
            return done(null, existingUser.rows[0]);
          }

          // Create new user (profile_complete = false, missing profile fields)
          const newUser = await pool.query(
            `INSERT INTO users (name, email, password, role, profile_complete)
             VALUES ($1, $2, $3, $4, false)
             RETURNING id, name, email, role, phone_number, country, job_title, institution, profile_complete, tutorial_completed, created_at`,
            [
              name,
              email,
              'oauth_user_no_password',
              'user'
            ]
          );

          return done(null, newUser.rows[0]);
        } catch (error) {
          return done(error, undefined);
        }
      }
    )
  );
} else {
  console.warn('[Passport] Microsoft OAuth disabled: MICROSOFT_CLIENT_ID or MICROSOFT_CLIENT_SECRET not set');
}

export default passport;
