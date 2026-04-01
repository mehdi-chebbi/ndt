-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create index on role for filtering
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Create layer_groups table (supports nested groups via parent_id)
CREATE TABLE IF NOT EXISTS layer_groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  parent_id INTEGER REFERENCES layer_groups(id) ON DELETE CASCADE,
  description TEXT,
  legend JSONB,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for layer_groups
CREATE INDEX IF NOT EXISTS idx_layer_groups_name ON layer_groups(name);
CREATE INDEX IF NOT EXISTS idx_layer_groups_parent_id ON layer_groups(parent_id);
CREATE INDEX IF NOT EXISTS idx_layer_groups_sort_order ON layer_groups(sort_order);

-- Create layers table (combines layer info + metadata)
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
);

-- Create indexes for layers
CREATE INDEX IF NOT EXISTS idx_layers_geoserver_name ON layers(geoserver_name);
CREATE INDEX IF NOT EXISTS idx_layers_group_id ON layers(group_id);
CREATE INDEX IF NOT EXISTS idx_layers_is_active ON layers(is_active);
CREATE INDEX IF NOT EXISTS idx_layers_sort_order ON layers(sort_order);

-- Create invalid_data_reports table
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
);

-- Create indexes for reports
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON invalid_data_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON invalid_data_reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON invalid_data_reports(created_at DESC);

-- Create notification_recipients table (emails that receive report notifications)
CREATE TABLE IF NOT EXISTS notification_recipients (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for notification_recipients
CREATE INDEX IF NOT EXISTS idx_notification_recipients_email ON notification_recipients(email);
CREATE INDEX IF NOT EXISTS idx_notification_recipients_is_active ON notification_recipients(is_active);

-- Create password_reset_tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for password_reset_tokens
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for chat_sessions
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_active ON chat_sessions(user_id, is_active);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, created_at);
