/**
 * Utility functions for generating and handling einsatz links
 */

import { z } from 'zod';

// UUID validation schema
const uuidSchema = z.string().uuid({
  message: 'Invalid einsatz ID format. Expected a valid UUID.',
});

/**
 * Validate if a string is a valid UUID
 * @param value - The string to validate
 * @returns true if valid UUID, false otherwise
 */
function isValidUuid(value: string): boolean {
  return uuidSchema.safeParse(value).success;
}

/**
 * Generate a shareable link for an einsatz
 * @param einsatzId - The UUID of the einsatz
 * @param baseUrl - The base URL (optional, defaults to current origin)
 * @returns Full URL to the einsatz
 * @throws Error if einsatzId is not a valid UUID
 */
export function generateEinsatzLink(
  einsatzId: string,
  baseUrl?: string
): string {
  // Validate UUID format
  const result = uuidSchema.safeParse(einsatzId);
  if (!result.success) {
    throw new Error(
      `Cannot generate einsatz link: ${result.error.message || 'Invalid UUID'}`
    );
  }

  const base =
    baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/einsatzverwaltung?einsatz=${einsatzId}`;
}

/**
 * Generate a link for creating a new einsatz
 * @param baseUrl - The base URL (optional, defaults to current origin)
 * @returns Full URL for new einsatz creation
 */
export function generateNewEinsatzLink(baseUrl?: string): string {
  const base =
    baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/einsatzverwaltung?new=true`;
}

/**
 * Copy einsatz link to clipboard.
 *
 * Requires a browser environment with the Clipboard API (`navigator.clipboard`) available.
 * In environments without clipboard support (e.g. SSR, some older browsers),
 * the returned promise will be rejected with an error.
 *
 * @param einsatzId - The UUID of the einsatz
 * @returns Promise that resolves when link is copied
 * @throws Error if einsatzId is not a valid UUID or clipboard API fails
 */
export async function copyEinsatzLinkToClipboard(
  einsatzId: string
): Promise<void> {
  // Validate UUID format
  const result = uuidSchema.safeParse(einsatzId);
  if (!result.success) {
    throw new Error(
      `Cannot copy link to clipboard: ${result.error.message || 'Invalid UUID'}`
    );
  }

  try {
    const link = generateEinsatzLink(einsatzId);
    await navigator.clipboard.writeText(link);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to copy link to clipboard: ${error.message}`);
    }
    throw new Error('Failed to copy link to clipboard: Unknown error');
  }
}

/**
 * Validate an einsatz ID from URL parameters
 * @param einsatzId - The einsatz ID to validate
 * @returns Validated UUID string or null if invalid
 */
export function validateEinsatzIdFromUrl(
  einsatzId: string | null | undefined
): string | null {
  if (!einsatzId) return null;
  return isValidUuid(einsatzId) ? einsatzId : null;
}
