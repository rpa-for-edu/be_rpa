-- =============================================================================
-- PERMISSIONS SEED DATA
-- =============================================================================

-- Clear existing permissions
DELETE FROM `permission`;

-- Insert permissions with fixed UUIDs
INSERT INTO `permission` (`id`, `name`, `description`, `resource`, `action`) VALUES
-- Process permissions (35xx-01 to 35xx-04)
('b00fe2df-d105-4bf0-9e76-0a42aacd3501', 'View Process', 'View process details and content', 'process', 'view'),
('b00fe2df-d105-4bf0-9e76-0a42aacd3502', 'Create Process', 'Create new processes', 'process', 'create'),
('b00fe2df-d105-4bf0-9e76-0a42aacd3503', 'Edit Process', 'Edit existing processes', 'process', 'edit'),
('b00fe2df-d105-4bf0-9e76-0a42aacd3504', 'Delete Process', 'Delete processes', 'process', 'delete'),

-- Robot permissions (35xx-11, 35xx-12, 35xx-14, 35xx-15)
('b00fe2df-d105-4bf0-9e76-0a42aacd3511', 'View Robot', 'View robot details and status', 'robot', 'view'),
('b00fe2df-d105-4bf0-9e76-0a42aacd3512', 'Create Robot', 'Create new robots', 'robot', 'create'),
('b00fe2df-d105-4bf0-9e76-0a42aacd3514', 'Delete Robot', 'Delete robots', 'robot', 'delete'),
('b00fe2df-d105-4bf0-9e76-0a42aacd3515', 'Execute Robot', 'Execute/trigger robots', 'robot', 'execute');


-- =============================================================================
-- ACTIVITY PACKAGES & TEMPLATES SEED DATA
-- =============================================================================

-- Clear existing data
DELETE FROM `argument`;
DELETE FROM `return_value`;
DELETE FROM `activity_template`;
DELETE FROM `activity_package`;

-- Insert Activity Packages with fixed IDs
INSERT INTO `activity_package` (`id`, `displayName`, `description`, `imageKey`, `library`, `version`, `isActive`) VALUES
('google_workspace', 'Google Workspace', 'Activities for Google Drive, Docs, Sheets, Forms', 'activity-packages/google.png', 'RPA.Cloud.Google', '1.0.0', true),
('browser_automation', 'Browser Automation', 'Web browser automation activities', 'activity-packages/browser.png', 'RPA.Browser', '1.0.0', true),
('file_system', 'File System', 'File and folder operations', 'activity-packages/folder.png', 'os', '1.0.0', true),
('excel', 'Excel', 'Excel file operations', 'activity-packages/file-excel.png', 'openpyxl', '1.0.0', true),
('database', 'Database', 'Database operations', 'activity-packages/database.png', 'sqlalchemy', '1.0.0', true),
('http_api', 'HTTP/API', 'HTTP requests and API calls', 'activity-packages/api.png', 'requests', '1.0.0', true),
('pdf', 'PDF', 'PDF file operations', 'activity-packages/file-pdf.png', 'PyPDF2', '1.0.0', true),
('erpnext', 'ERPNext', 'ERPNext ERP system integration', 'activity-packages/erp.png', 'frappe-client', '1.0.0', true);

-- =============================================================================
-- GOOGLE WORKSPACE TEMPLATES (UUID: 40xx-xxxx)
-- =============================================================================

-- Create folder (4001)
INSERT INTO `activity_template` (`id`, `name`, `description`, `keyword`, `activityPackageId`) VALUES
('b00fe2df-d105-4bf0-9e76-0a42aacd4001', 'Create folder', 'Create a Google Drive folder in a given directory', 'drive.create_folder', 'google_workspace');

INSERT INTO `argument` (`id`, `name`, `description`, `type`, `keywordArgument`, `isRequired`, `defaultValue`, `activityTemplateId`) VALUES
('b00fe2df-d105-4bf0-9e76-0a42aacd4101', 'folderName', 'Folder name', 'string', 'folder_name', true, NULL, 'b00fe2df-d105-4bf0-9e76-0a42aacd4001'),
('b00fe2df-d105-4bf0-9e76-0a42aacd4102', 'parentFolderPath', 'Parent Folder Path', 'string', 'parent_folder_path', false, NULL, 'b00fe2df-d105-4bf0-9e76-0a42aacd4001');

INSERT INTO `return_value` (`id`, `type`, `description`, `displayName`, `activityTemplateId`) VALUES
('b00fe2df-d105-4bf0-9e76-0a42aacd4201', 'object', 'Created folder with id and url', 'folder', 'b00fe2df-d105-4bf0-9e76-0a42aacd4001');

-- Get file list in folder (4002)
INSERT INTO `activity_template` (`id`, `name`, `description`, `keyword`, `activityPackageId`) VALUES
('b00fe2df-d105-4bf0-9e76-0a42aacd4002', 'Get file list in folder', 'Get a list of files in a given folder in Google Drive', 'drive.get_file_list_in_folder', 'google_workspace');

INSERT INTO `argument` (`id`, `name`, `description`, `type`, `keywordArgument`, `isRequired`, `defaultValue`, `activityTemplateId`) VALUES
('b00fe2df-d105-4bf0-9e76-0a42aacd4103', 'folderPath', 'Folder Path', 'string', 'folder_path', true, NULL, 'b00fe2df-d105-4bf0-9e76-0a42aacd4002'),
('b00fe2df-d105-4bf0-9e76-0a42aacd4104', 'query', 'Query', 'string', 'query', false, NULL, 'b00fe2df-d105-4bf0-9e76-0a42aacd4002');

INSERT INTO `return_value` (`id`, `type`, `description`, `displayName`, `activityTemplateId`) VALUES
('b00fe2df-d105-4bf0-9e76-0a42aacd4202', 'array', 'List of files with id, url, name, etc', 'fileList', 'b00fe2df-d105-4bf0-9e76-0a42aacd4002');

-- Download files (4003)
INSERT INTO `activity_template` (`id`, `name`, `description`, `keyword`, `activityPackageId`) VALUES
('b00fe2df-d105-4bf0-9e76-0a42aacd4003', 'Download files', 'Download a list of files from Google Drive', 'drive.download_files', 'google_workspace');

INSERT INTO `argument` (`id`, `name`, `description`, `type`, `keywordArgument`, `isRequired`, `defaultValue`, `activityTemplateId`) VALUES
('b00fe2df-d105-4bf0-9e76-0a42aacd4105', 'folderPath', 'Folder Path', 'string', 'folder_path', true, NULL, 'b00fe2df-d105-4bf0-9e76-0a42aacd4003'),
('b00fe2df-d105-4bf0-9e76-0a42aacd4106', 'query', 'Query', 'string', 'query', false, NULL, 'b00fe2df-d105-4bf0-9e76-0a42aacd4003');

INSERT INTO `return_value` (`id`, `type`, `description`, `displayName`, `activityTemplateId`) VALUES
('b00fe2df-d105-4bf0-9e76-0a42aacd4203', 'array', 'List of downloaded file names', 'fileNameList', 'b00fe2df-d105-4bf0-9e76-0a42aacd4003');

-- Upload file (4004)
INSERT INTO `activity_template` (`id`, `name`, `description`, `keyword`, `activityPackageId`) VALUES
('b00fe2df-d105-4bf0-9e76-0a42aacd4004', 'Upload file', 'Upload a file to Google Drive', 'drive.upload_file', 'google_workspace');

INSERT INTO `argument` (`id`, `name`, `description`, `type`, `keywordArgument`, `isRequired`, `defaultValue`, `activityTemplateId`) VALUES
('b00fe2df-d105-4bf0-9e76-0a42aacd4107', 'fileName', 'File name', 'string', 'file_name', true, NULL, 'b00fe2df-d105-4bf0-9e76-0a42aacd4004'),
('b00fe2df-d105-4bf0-9e76-0a42aacd4108', 'folderPath', 'Folder Path', 'string', 'folder_path', false, NULL, 'b00fe2df-d105-4bf0-9e76-0a42aacd4004'),
('b00fe2df-d105-4bf0-9e76-0a42aacd4109', 'overwrite', 'Overwrite existing file', 'boolean', 'overwrite', false, 'false', 'b00fe2df-d105-4bf0-9e76-0a42aacd4004');

INSERT INTO `return_value` (`id`, `type`, `description`, `displayName`, `activityTemplateId`) VALUES
('b00fe2df-d105-4bf0-9e76-0a42aacd4204', 'string', 'Uploaded file id', 'fileId', 'b00fe2df-d105-4bf0-9e76-0a42aacd4004');

-- Delete file/folder (4005)
INSERT INTO `activity_template` (`id`, `name`, `description`, `keyword`, `activityPackageId`) VALUES
('b00fe2df-d105-4bf0-9e76-0a42aacd4005', 'Delete file/folder', 'Delete a file/folder in Google Drive', 'drive.delete_file_folder', 'google_workspace');

INSERT INTO `argument` (`id`, `name`, `description`, `type`, `keywordArgument`, `isRequired`, `defaultValue`, `activityTemplateId`) VALUES
('b00fe2df-d105-4bf0-9e76-0a42aacd410a', 'fileId', 'File/Folder ID', 'string', 'file_id', true, NULL, 'b00fe2df-d105-4bf0-9e76-0a42aacd4005');

INSERT INTO `return_value` (`id`, `type`, `description`, `displayName`, `activityTemplateId`) VALUES
('b00fe2df-d105-4bf0-9e76-0a42aacd4205', 'number', 'Number of deleted items', 'deletedCount', 'b00fe2df-d105-4bf0-9e76-0a42aacd4005');

-- Send email (4006)
INSERT INTO `activity_template` (`id`, `name`, `description`, `keyword`, `activityPackageId`) VALUES
('b00fe2df-d105-4bf0-9e76-0a42aacd4006', 'Send email', 'Send an email using Gmail', 'gmail.send_email', 'google_workspace');

INSERT INTO `argument` (`id`, `name`, `description`, `type`, `keywordArgument`, `isRequired`, `defaultValue`, `activityTemplateId`) VALUES
('b00fe2df-d105-4bf0-9e76-0a42aacd410b', 'to', 'To email address', 'string', 'to', true, NULL, 'b00fe2df-d105-4bf0-9e76-0a42aacd4006'),
('b00fe2df-d105-4bf0-9e76-0a42aacd410c', 'subject', 'Email subject', 'string', 'subject', true, NULL, 'b00fe2df-d105-4bf0-9e76-0a42aacd4006'),
('b00fe2df-d105-4bf0-9e76-0a42aacd410d', 'body', 'Email body', 'string', 'body', true, NULL, 'b00fe2df-d105-4bf0-9e76-0a42aacd4006');

INSERT INTO `return_value` (`id`, `type`, `description`, `displayName`, `activityTemplateId`) VALUES
('b00fe2df-d105-4bf0-9e76-0a42aacd4206', 'object', 'Sent message with id and threadId', 'message', 'b00fe2df-d105-4bf0-9e76-0a42aacd4006');

-- =============================================================================
-- BROWSER AUTOMATION TEMPLATES (UUID: 41xx-xxxx)
-- =============================================================================

-- Open Browser (4101)
INSERT INTO `activity_template` (`id`, `name`, `description`, `keyword`, `activityPackageId`) VALUES
('b00fe2df-d105-4bf0-9e76-0a42aacd4101', 'Open Browser', 'Open a web browser', 'browser.open', 'browser_automation');

INSERT INTO `argument` (`id`, `name`, `description`, `type`, `keywordArgument`, `isRequired`, `defaultValue`, `activityTemplateId`) VALUES
('b00fe2df-d105-4bf0-9e76-0a42aacd4201', 'url', 'URL to open', 'string', 'url', true, NULL, 'b00fe2df-d105-4bf0-9e76-0a42aacd4101'),
('b00fe2df-d105-4bf0-9e76-0a42aacd4202', 'browser', 'Browser type', 'string', 'browser', false, 'chrome', 'b00fe2df-d105-4bf0-9e76-0a42aacd4101');

INSERT INTO `return_value` (`id`, `type`, `description`, `displayName`, `activityTemplateId`) VALUES
('b00fe2df-d105-4bf0-9e76-0a42aacd4301', 'object', 'Browser instance', 'browserInstance', 'b00fe2df-d105-4bf0-9e76-0a42aacd4101');

-- Click Element (4102)
INSERT INTO `activity_template` (`id`, `name`, `description`, `keyword`, `activityPackageId`) VALUES
('b00fe2df-d105-4bf0-9e76-0a42aacd4102', 'Click Element', 'Click on a web element', 'browser.click', 'browser_automation');

INSERT INTO `argument` (`id`, `name`, `description`, `type`, `keywordArgument`, `isRequired`, `defaultValue`, `activityTemplateId`) VALUES
('b00fe2df-d105-4bf0-9e76-0a42aacd4203', 'selector', 'CSS selector', 'string', 'selector', true, NULL, 'b00fe2df-d105-4bf0-9e76-0a42aacd4102');

-- Type Text (4103)
INSERT INTO `activity_template` (`id`, `name`, `description`, `keyword`, `activityPackageId`) VALUES
('b00fe2df-d105-4bf0-9e76-0a42aacd4103', 'Type Text', 'Type text into an input field', 'browser.type', 'browser_automation');

INSERT INTO `argument` (`id`, `name`, `description`, `type`, `keywordArgument`, `isRequired`, `defaultValue`, `activityTemplateId`) VALUES
('b00fe2df-d105-4bf0-9e76-0a42aacd4204', 'selector', 'CSS selector', 'string', 'selector', true, NULL, 'b00fe2df-d105-4bf0-9e76-0a42aacd4103'),
('b00fe2df-d105-4bf0-9e76-0a42aacd4205', 'text', 'Text to type', 'string', 'text', true, NULL, 'b00fe2df-d105-4bf0-9e76-0a42aacd4103');

-- =============================================================================
-- FILE SYSTEM TEMPLATES (UUID: 42xx-xxxx)
-- =============================================================================

-- Read File (4201)
INSERT INTO `activity_template` (`id`, `name`, `description`, `keyword`, `activityPackageId`) VALUES
('b00fe2df-d105-4bf0-9e76-0a42aacd4201', 'Read File', 'Read content from a file', 'file.read', 'file_system');

INSERT INTO `argument` (`id`, `name`, `description`, `type`, `keywordArgument`, `isRequired`, `defaultValue`, `activityTemplateId`) VALUES
('b00fe2df-d105-4bf0-9e76-0a42aacd4301', 'filePath', 'Path to file', 'string', 'file_path', true, NULL, 'b00fe2df-d105-4bf0-9e76-0a42aacd4201'),
('b00fe2df-d105-4bf0-9e76-0a42aacd4302', 'encoding', 'File encoding', 'string', 'encoding', false, 'utf-8', 'b00fe2df-d105-4bf0-9e76-0a42aacd4201');

INSERT INTO `return_value` (`id`, `type`, `description`, `displayName`, `activityTemplateId`) VALUES
('b00fe2df-d105-4bf0-9e76-0a42aacd4401', 'string', 'File content', 'content', 'b00fe2df-d105-4bf0-9e76-0a42aacd4201');

-- Write File (4202)
INSERT INTO `activity_template` (`id`, `name`, `description`, `keyword`, `activityPackageId`) VALUES
('b00fe2df-d105-4bf0-9e76-0a42aacd4202', 'Write File', 'Write content to a file', 'file.write', 'file_system');

INSERT INTO `argument` (`id`, `name`, `description`, `type`, `keywordArgument`, `isRequired`, `defaultValue`, `activityTemplateId`) VALUES
('b00fe2df-d105-4bf0-9e76-0a42aacd4303', 'filePath', 'Path to file', 'string', 'file_path', true, NULL, 'b00fe2df-d105-4bf0-9e76-0a42aacd4202'),
('b00fe2df-d105-4bf0-9e76-0a42aacd4304', 'content', 'Content to write', 'string', 'content', true, NULL, 'b00fe2df-d105-4bf0-9e76-0a42aacd4202');

-- Copy File (4203)
INSERT INTO `activity_template` (`id`, `name`, `description`, `keyword`, `activityPackageId`) VALUES
('b00fe2df-d105-4bf0-9e76-0a42aacd4203', 'Copy File', 'Copy a file to another location', 'file.copy', 'file_system');

INSERT INTO `argument` (`id`, `name`, `description`, `type`, `keywordArgument`, `isRequired`, `defaultValue`, `activityTemplateId`) VALUES
('b00fe2df-d105-4bf0-9e76-0a42aacd4305', 'sourcePath', 'Source file path', 'string', 'source_path', true, NULL, 'b00fe2df-d105-4bf0-9e76-0a42aacd4203'),
('b00fe2df-d105-4bf0-9e76-0a42aacd4306', 'destinationPath', 'Destination file path', 'string', 'destination_path', true, NULL, 'b00fe2df-d105-4bf0-9e76-0a42aacd4203');


-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

SELECT 'Total permissions created:' as Info, COUNT(*) as count FROM `permission`;
SELECT 'Total activity packages:' as Info, COUNT(*) as count FROM `activity_package`;
SELECT 'Total activity templates:' as Info, COUNT(*) as count FROM `activity_template`;
SELECT 'Total arguments:' as Info, COUNT(*) as count FROM `argument`;
SELECT 'Total return values:' as Info, COUNT(*) as count FROM `return_value`;

SELECT '--- Permissions by resource ---' as Info;
SELECT `resource`, COUNT(*) as count 
FROM `permission` 
GROUP BY `resource`
ORDER BY `resource`;

SELECT '--- Templates by package ---' as Info;
SELECT ap.displayName as package, COUNT(at.id) as template_count
FROM `activity_package` ap
LEFT JOIN `activity_template` at ON ap.id = at.activityPackageId
GROUP BY ap.id, ap.displayName
ORDER BY ap.displayName;
