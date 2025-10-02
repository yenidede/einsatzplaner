import crypto from 'crypto'

export const generatedToken = (bytes = 24) => crypto.randomBytes(bytes).toString('base64url');