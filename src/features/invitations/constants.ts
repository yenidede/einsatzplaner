/**
 * DigBiz Award Configuration
 *
 * TODO: Replace these placeholder role IDs with actual role IDs from your database.
 * You can find role IDs by querying your database:
 * SELECT id, name FROM role;
 */

export const DIGBIZ_CONFIG = {
  // TODO: Set this to the actual helper role ID from your database
  HELPER_ROLE_IDS: [
    '90f7c6ce-f696-419c-9a29-4c70c3ab4cef', // Helper Role
  ],

  // TODO: Set these to the actual role IDs that grant full permissions
  JURY_ROLE_IDS: [
    '90f7c6ce-f696-419c-9a29-4c70c3ab4cef', // Helper Role
    'd54836b9-a1ff-4dd8-8633-20c98378aa87', // Einsatzverwaltung
    'd8c4c6ad-10bc-4947-bf16-1652f55298cc', // Organisationsverwaltung
  ],

  // Email pattern for auto-indexed users
  EMAIL_PREFIX: 'jmh-',
  EMAIL_DOMAIN: '@digbiz.at',

  // Token expiration (7 days in milliseconds)
  TOKEN_EXPIRATION_MS: 7 * 24 * 60 * 60 * 1000,
} as const;
