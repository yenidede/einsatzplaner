import { z } from 'zod';

/**
 * Utility functions for generating and handling einsatz links
 */

const einsatzIdSchema = z.string().uuid('Invalid einsatzId: must be a valid UUID');

/**
 * Generate a shareable link for an einsatz
 * @param einsatzId - The UUID of the einsatz
 * @param baseUrl - The base URL (optional, defaults to current origin)
 * @returns Full URL to the einsatz
 * @throws {z.ZodError} If einsatzId is not a valid UUID
 */
export function generateEinsatzLink(einsatzId: string, baseUrl?: string): string {
    // Validate einsatzId is a valid UUID
    einsatzIdSchema.parse(einsatzId);
    
    const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    return `${base}/einsatzverwaltung?einsatz=${einsatzId}`;
}

/**
 * Generate a link for creating a new einsatz
 * @param baseUrl - The base URL (optional, defaults to current origin)
 * @returns Full URL for new einsatz creation
 */
export function generateNewEinsatzLink(baseUrl?: string): string {
    const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    return `${base}/einsatzverwaltung?new=true`;
}

/**
 * Copy einsatz link to clipboard
 * @param einsatzId - The UUID of the einsatz
 * @returns Promise that resolves when link is copied
 * @throws {z.ZodError} If einsatzId is not a valid UUID
 */
export async function copyEinsatzLinkToClipboard(einsatzId: string): Promise<void> {
    // Validation happens in generateEinsatzLink
    const link = generateEinsatzLink(einsatzId);
    await navigator.clipboard.writeText(link);
}
