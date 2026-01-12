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

app.use('/api/auth', authRoutes);
app.use('/api/admin', userRoutes);
app.use('/api/clip', clipRoutes);
app.use('/api/reports', reportRoutes);


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

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)
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
