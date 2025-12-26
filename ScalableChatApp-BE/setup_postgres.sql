-- PostgreSQL Database Setup for MERN Chat App
-- Run this script to create the database and initial setup

-- Create database (run this as postgres superuser)
CREATE DATABASE mernchatapp;

-- Connect to the database
\c mernchatapp;

-- Create UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- The tables will be created automatically by Sequelize when the application starts
-- This script is just for initial database creation

-- Grant permissions (adjust username as needed)
-- GRANT ALL PRIVILEGES ON DATABASE mernchatapp TO your_username;