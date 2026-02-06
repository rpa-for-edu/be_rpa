-- =============================================
-- Initial Database Setup Script
-- =============================================
-- This script runs automatically when MySQL container starts for the first time
-- It creates the required databases and grants permissions

-- Create main database (if not created by environment variable)
CREATE DATABASE IF NOT EXISTS `edu_rpa` 
    CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;

-- Create report database
CREATE DATABASE IF NOT EXISTS `edu_rpa_report` 
    CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;

-- Grant privileges to the application user
-- Note: The user is created by MYSQL_USER environment variable
GRANT ALL PRIVILEGES ON `edu_rpa`.* TO 'rpa_user'@'%';
GRANT ALL PRIVILEGES ON `edu_rpa_report`.* TO 'rpa_user'@'%';

FLUSH PRIVILEGES;
