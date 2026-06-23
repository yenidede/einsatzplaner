import { createSafeActionClient } from 'next-safe-action';

// Create the client with default options.
export const actionClient = createSafeActionClient({
  handleServerError(error) {
    console.error('Action error:', error.message);
    return error.message || 'Es ist ein unerwarteter Fehler aufgetreten.';
  },
});
