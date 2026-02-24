-- =============================================
-- Initial Database Setup Script
-- =============================================
-- This script runs automatically when MySQL container starts for the first time
-- It creates the required databases and grants permissions

-- Create main database (if not created by environment variable)
CREATE DATABASE IF NOT EXISTS `core` 
    CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;

-- Create report database
CREATE DATABASE IF NOT EXISTS `report` 
    CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;

-- Grant privileges to the application user
GRANT ALL PRIVILEGES ON `core`.* TO 'admin'@'%';
GRANT ALL PRIVILEGES ON `report`.* TO 'admin'@'%';

FLUSH PRIVILEGES;
