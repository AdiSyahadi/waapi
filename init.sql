-- WhatsApp API Database Initialization Script
-- This script runs when the MySQL container starts for the first time

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS whatsapp_api CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Use the database
USE whatsapp_api;

-- Grant privileges (for production, use specific user)
-- CREATE USER IF NOT EXISTS 'whatsapp_user'@'%' IDENTIFIED BY 'secure_password';
-- GRANT ALL PRIVILEGES ON whatsapp_api.* TO 'whatsapp_user'@'%';
-- FLUSH PRIVILEGES;

-- Note: Tables will be created by Sequelize migrations
-- Run: npx sequelize-cli db:migrate
