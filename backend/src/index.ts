import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import pool from './config/database';

const app: Application = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import clipRoutes from './routes/clipRoutes';
import reportRoutes from './routes/reportRoutes';
import layerRoutes from './routes/layerRoutes';
import groupRoutes from './routes/groupRoutes';

app.use('/api/auth', authRoutes);
app.use('/api/admin', userRoutes);
app.use('/api/clip', clipRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/layers', layerRoutes);
app.use('/api/groups', groupRoutes);


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

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Start server
async function startServer() {
  try {
    await initializeDatabase();

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
