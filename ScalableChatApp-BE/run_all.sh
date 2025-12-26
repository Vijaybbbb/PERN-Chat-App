#!/bin/bash
echo "🚀 Starting all microservices in separate GNOME Terminal tabs..."

# Start Database Microservice first
gnome-terminal --tab --title="Database Service" \
  -- bash -c "cd 'Database Microservice' && npm run dev; exec bash"

# Wait a moment for database service to start
sleep 2

# Setup database tables
echo "Setting up database tables..."
cd "Database Microservice" && node dbcli.js create
cd ..

# Start Chat Microservice
gnome-terminal --tab --title="Chat Service" \
  -- bash -c "cd 'Chat Microservice' && npm run dev; exec bash"

# Start Message Microservice
gnome-terminal --tab --title="Message Service" \
  -- bash -c "cd 'Message Microservice' && npm run dev; exec bash"

# Start User Microservice
gnome-terminal --tab --title="User Service" \
  -- bash -c "cd 'User Microservice' && npm run dev; exec bash"

# Start Socket Microservice
gnome-terminal --tab --title="Socket Service" \
  -- bash -c "cd 'Socket Microservice' && npm run dev; exec bash"

echo "All microservices started!"
echo "Database: http://localhost:4005"
echo "User: http://localhost:4002"
echo "Chat: http://localhost:4001"
echo "Message: http://localhost:4003"
echo "Socket: http://localhost:4004"


