import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from './config/passport';
import pool from './config/database';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const app: Application = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Session middleware for Passport
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-session-secret-change-this-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Static serving for GeoJSON files
app.use('/geojson', express.static(path.join(__dirname, '../geojson')));

// Static serving for AI chat images
app.use('/api/ai-images', express.static(path.join(process.cwd(), 'ai-imgs')));

// Countries API - auto-generate from filesystem
app.get('/api/countries', (req: Request, res: Response) => {
  try {
    const geojsonDir = path.join(__dirname, '../geojson');
    const files = fs.readdirSync(geojsonDir);
    
    const countries = files
      .filter(file => file.endsWith('.geojson'))
      .map(file => {
        // Convert filename to country name
        // e.g., "Cote_d_Ivoire.geojson" -> "Cote d Ivoire"
        const name = file
          .replace('.geojson', '')
          .replace(/_/g, ' ');
        return {
          name,
          file
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    
    res.json(countries);
  } catch (error) {
    console.error('Error reading countries:', error);
    res.status(500).json({ error: 'Failed to load countries' });
  }
});

// Routes
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import clipRoutes from './routes/clipRoutes';
import reportRoutes from './routes/reportRoutes';
import layerRoutes from './routes/layerRoutes';
import groupRoutes from './routes/groupRoutes';
import notificationRoutes from './routes/notificationRoutes';
import aiRoutes from './routes/aiRoutes';
import sessionRoutes from './routes/sessionRoutes';
import tutorialRoutes from './routes/tutorialRoutes';
import imageRoutes from './routes/imageRoutes';
import statsBatchRoutes from './routes/statsBatchRoutes';

app.use('/api/auth', authRoutes);
app.use('/api/admin', userRoutes);
app.use('/api/clip', clipRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/layers', layerRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/users', tutorialRoutes);
app.use('/api/ai', imageRoutes);
app.use('/api/stats', statsBatchRoutes);


// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: Function) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Initialize database tables
async function initializeDatabase() {
  try {
    console.log('Initializing database tables...');

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        phone_number VARCHAR(50),
        country VARCHAR(255),
        job_title VARCHAR(255),
        institution VARCHAR(255),
        profile_complete BOOLEAN NOT NULL DEFAULT true,
        tutorial_completed BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for users
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)
    `);

    // Create layer_groups table (supports nested groups via parent_id)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS layer_groups (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        parent_id INTEGER REFERENCES layer_groups(id) ON DELETE CASCADE,
        description TEXT,
        legend JSONB,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for layer_groups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_layer_groups_name ON layer_groups(name)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_layer_groups_parent_id ON layer_groups(parent_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_layer_groups_sort_order ON layer_groups(sort_order)
    `);

    // Create layers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS layers (
        id SERIAL PRIMARY KEY,
        geoserver_name VARCHAR(255) NOT NULL UNIQUE,
        display_name VARCHAR(255),
        group_id INTEGER REFERENCES layer_groups(id) ON DELETE SET NULL,
        file_path VARCHAR(500),
        class_labels JSONB,
        legend JSONB,
        style_name VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for layers
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_layers_geoserver_name ON layers(geoserver_name)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_layers_group_id ON layers(group_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_layers_is_active ON layers(is_active)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_layers_sort_order ON layers(sort_order)
    `);

    // Create invalid_data_reports table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invalid_data_reports (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        original_polygon JSONB NOT NULL,
        original_layer VARCHAR(255) NOT NULL,
        original_colormap VARCHAR(255) NOT NULL,
        invalid_area_polygon JSONB NOT NULL,
        comment TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'invalid' CHECK (status IN ('invalid', 'fixed')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for reports
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reports_user_id ON invalid_data_reports(user_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reports_status ON invalid_data_reports(status)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reports_created_at ON invalid_data_reports(created_at DESC)
    `);

    // Create notification_recipients table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_recipients (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for notification_recipients
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notification_recipients_email ON notification_recipients(email)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notification_recipients_is_active ON notification_recipients(is_active)
    `);

    // Create password_reset_tokens table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for password_reset_tokens
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at)
    `);

    // Create chat_sessions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id, updated_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_chat_sessions_active ON chat_sessions(user_id, is_active)
    `);

    // Create chat_messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, created_at)
    `);

    // Create clipped_layers_cache table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clipped_layers_cache (
        id SERIAL PRIMARY KEY,
        country_file VARCHAR(255) NOT NULL,
        layer_id INTEGER NOT NULL REFERENCES layers(id) ON DELETE CASCADE,
        clipped_layer_name VARCHAR(255) NOT NULL,
        file_size_bytes BIGINT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(country_file, layer_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_clipped_layers_cache_country ON clipped_layers_cache(country_file)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_clipped_layers_cache_layer ON clipped_layers_cache(layer_id)
    `);

    // Create country_stats table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS country_stats (
        id SERIAL PRIMARY KEY,
        layer_id INTEGER NOT NULL REFERENCES layers(id) ON DELETE CASCADE,
        country_file VARCHAR(255) NOT NULL,
        total_area_km2 DOUBLE PRECISION NOT NULL,
        pixel_size_m DOUBLE PRECISION NOT NULL,
        class_stats JSONB NOT NULL,
        computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(layer_id, country_file)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_country_stats_country ON country_stats(country_file)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_country_stats_layer ON country_stats(layer_id)
    `);

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Create default admin user if not exists
async function createDefaultAdmin() {
  try {
    // Check if admin user already exists
    const existingAdmin = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      ['admin@ndt.com']
    );

    if (existingAdmin.rows.length > 0) {
      console.log('Default admin user already exists');
      return;
    }

    // Hash the default password
    const defaultPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Create default admin user
    await pool.query(
      `INSERT INTO users (name, email, password, role, phone_number, country, job_title, institution, profile_complete)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
      ['Admin', 'admin@ndt.com', hashedPassword, 'admin', '0000000000', 'N/A', 'Admin', 'AfriGeoData']
    );

    console.log('========================================');
    console.log('Default admin user created successfully!');
    console.log('Email: admin@ndt.com');
    console.log('Password: admin123');
    console.log('========================================');
  } catch (error) {
    console.error('Error creating default admin user:', error);
    throw error;
  }
}

// Start server
async function startServer() {
  try {
    await initializeDatabase();
    await createDefaultAdmin();

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      console.log(`API health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
