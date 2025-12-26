# Database Microservice

A dedicated microservice for managing PostgreSQL database schema, migrations, and maintenance operations for the MERN Chat App.

## Features

- **Schema Management**: Create, drop, and reset database tables
- **Migration Support**: Handle database schema updates
- **Health Monitoring**: Check database connection and table status
- **CLI Tools**: Command-line interface for database operations
- **REST API**: HTTP endpoints for database management

## Quick Start

### 1. Install Dependencies
```bash
cd "Database Microservice"
npm install
```

### 2. Setup Database
```bash
# Using CLI (recommended)
node dbcli.js create

# Or using API
npm run dev
curl -X POST http://localhost:4005/api/database/tables/create
```

### 3. Start Service
```bash
npm run dev
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/database/health` | Check database connection |
| GET | `/api/database/tables/check` | List existing tables |
| GET | `/api/database/tables/:name/info` | Get table schema info |
| POST | `/api/database/tables/create` | Create all tables |
| DELETE | `/api/database/tables/drop` | Drop all tables |
| POST | `/api/database/reset` | Reset database |

## CLI Commands

```bash
# Create all tables
node dbcli.js create

# Check existing tables
node dbcli.js check

# Drop all tables
node dbcli.js drop

# Reset database (drop + create)
node dbcli.js reset
```

## Database Schema

### Tables Created:
- **users**: User accounts and profiles
- **chats**: Chat rooms and conversations
- **messages**: Chat messages and attachments
- **chat_users**: Many-to-many relationship between users and chats

### Features:
- UUID primary keys
- Foreign key constraints
- Automatic timestamps
- Performance indexes
- Update triggers

## Usage Examples

### Create Database Schema
```bash
# Method 1: CLI
node dbcli.js create

# Method 2: API
curl -X POST http://localhost:4005/api/database/tables/create
```

### Check Database Status
```bash
# CLI
node dbcli.js check

# API
curl http://localhost:4005/api/database/tables/check
```

### Reset Database
```bash
# CLI (recommended for development)
node dbcli.js reset

# API
curl -X POST http://localhost:4005/api/database/reset
```

## Environment Variables

Required in `.env` file:
```
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=mernchatapp
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
DATABASE_PORT=4005
```

## Integration with Other Services

Other microservices should call the Database Microservice during startup to ensure tables exist:

```javascript
// Example integration
const checkDatabase = async () => {
    try {
        const response = await fetch('http://localhost:4005/api/database/tables/check');
        const data = await response.json();
        
        if (!data.allTablesExist) {
            console.log('Creating missing tables...');
            await fetch('http://localhost:4005/api/database/tables/create', {
                method: 'POST'
            });
        }
    } catch (error) {
        console.error('Database check failed:', error);
    }
};
```