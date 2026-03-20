import express, { Application, Request, Response } from 'express';
import cors from 'cors';
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

// Static serving for GeoJSON files
app.use('/geojson', express.static(path.join(__dirname, '../geojson')));

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

app.use('/api/auth', authRoutes);
app.use('/api/admin', userRoutes);
app.use('/api/clip', clipRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/layers', layerRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/notifications', notificationRoutes);


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
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)',
      ['Admin', 'admin@ndt.com', hashedPassword, 'admin']
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
