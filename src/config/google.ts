/**
 * Google OAuth 2.0 & Identity Services Configuration
 * ==============================================================================
 * PASTE YOUR GOOGLE CLIENT ID BELOW:
 * 1. Visit Google Cloud Console -> APIs & Services -> Credentials
 * 2. Create an "OAuth 2.0 Client ID" with application type "Web application"
 * 3. Add your app's origin to "Authorized JavaScript origins"
 * 4. Paste your Client ID string into the GOOGLE_CLIENT_ID constant below:
 * ==============================================================================
 */

export const GOOGLE_CLIENT_ID = '9833fb2538e6-pocketpilot.apps.googleusercontent.com';

/**
 * Scopes requested by Pocket Pilot:
 * - openid, email, profile: For authenticating user and showing name/avatar
 * - https://www.googleapis.com/auth/drive.appdata: Dedicated hidden application data
 *   folder in the user's personal Google Drive. The app cannot see, touch or delete
 *   any regular files or folders in the user's Drive.
 */
export const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/drive.appdata'
].join(' ');

export const DRIVE_DATA_FILENAME = 'pocketpilot-data.json';
export const DRIVE_BACKUP_PREFIX = 'pocketpilot-backup-';
export const MAX_DRIVE_BACKUPS = 5;
export const AUTO_SYNC_DEBOUNCE_MS = 5000;
export const DRIVE_POLL_INTERVAL_MS = 60000;
