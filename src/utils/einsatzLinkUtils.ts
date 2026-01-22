/**
 * Utility functions for generating and handling einsatz links
 */

/**
 * Generate a shareable link for an einsatz
 * @param einsatzId - The UUID of the einsatz
 * @param baseUrl - The base URL (optional, defaults to current origin)
 * @returns Full URL to the einsatz
 */
export function generateEinsatzLink(einsatzId: string, baseUrl?: string): string {
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
 * Copy einsatz link to clipboard.
 *
 * Requires a browser environment with the Clipboard API (`navigator.clipboard`) available.
 * In environments without clipboard support (e.g. SSR, some older browsers),
 * the returned promise will be rejected with an error.
 *
 * @param einsatzId - The UUID of the einsatz
 * @returns Promise that resolves when the link is copied, or rejects if clipboard is unavailable
 */
export async function copyEinsatzLinkToClipboard(einsatzId: string): Promise<void> {
    if (
        typeof navigator === 'undefined' ||
        !navigator.clipboard ||
        typeof navigator.clipboard.writeText !== 'function'
    ) {
        throw new Error('Clipboard API is not available in this environment.');
    }
    const link = generateEinsatzLink(einsatzId);
    await navigator.clipboard.writeText(link);
}
