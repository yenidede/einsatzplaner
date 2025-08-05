export function sanitizeString(str: string): string {
    return str.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
}