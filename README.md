# Platform

A full-stack platform with user authentication and admin panel.

## Project Structure

```
platform/
├── frontend/          # Next.js frontend
└── backend/           # Express.js backend with PostgreSQL
```

## Prerequisites

- PostgreSQL installed and running
- Bun runtime

## Database Setup

### 1. Create the database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE platform_db;

# Exit
\q
```

### 2. Run the schema

```bash
# From the backend directory
cd backend
psql -U postgres -d platform_db -f schema.sql
```

Or manually run the SQL commands in `schema.sql`

## Backend Setup

### 1. Install dependencies (already done)

```bash
cd backend
bun install
```

### 2. Update database connection (if needed)

Edit `src/config/database.ts` if your PostgreSQL credentials differ:
- host: localhost
- port: 5432
- database: platform_db
- user: postgres
- password: postgres

### 3. Start the backend server

```bash
cd backend
bun run dev
```

The backend will run on http://localhost:3001

## Frontend Setup

### 1. Install dependencies (already done)

```bash
cd frontend
bun install
```

### 2. Start the development server

```bash
cd frontend
bun run dev
```

The frontend will run on http://localhost:3000

## API Endpoints

### Authentication

- `POST /api/auth/signup` - Create a new account
  - Body: `{ name, email, password, role (optional, default: 'user') }`

- `POST /api/auth/login` - Login
  - Body: `{ email, password }`

### Users (Admin Only)

- `GET /api/admin/users` - Get all users (requires admin token)
- `DELETE /api/admin/users/:id` - Delete a user (requires admin token)

- `GET /api/admin/me` - Get current authenticated user

## How to Use

1. **Home Page**: Visit http://localhost:3000
2. **Sign Up**: Click "Sign Up" and create an account (choose "admin" role for admin access)
3. **Login**: Use your credentials to login
4. **Admin Dashboard**: If you signed up as admin, you'll be redirected to `/admin` where you can manage all users
5. **User Dashboard**: Regular users are redirected to `/dashboard`

## Notes

- JWT tokens are stored in localStorage for simplicity
- In production, use environment variables for sensitive data
- The JWT secret should be changed in production
- Passwords are hashed using bcrypt
