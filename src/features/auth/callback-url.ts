// only used to parse an url
const CALLBACK_URL_BASE = 'http://localhost:3000';

export function resolveCallbackUrl(
  rawCallbackUrl: string | null,
  depth = 0
): string {
  if (!rawCallbackUrl || depth > 5) {
    return '/';
  }

  const decodedCallbackUrl = (() => {
    try {
      return decodeURIComponent(rawCallbackUrl);
    } catch {
      return rawCallbackUrl;
    }
  })();

  try {
    const allowedOrigin =
      typeof window === 'undefined'
        ? CALLBACK_URL_BASE
        : window.location.origin;
    const callbackUrl = new URL(decodedCallbackUrl, allowedOrigin);
    const isAbsoluteUrl = /^https?:\/\//.test(decodedCallbackUrl);

    if (isAbsoluteUrl && callbackUrl.origin !== allowedOrigin) {
      return '/';
    }

    const nestedCallbackUrl = callbackUrl.searchParams.get('callbackUrl');

    if (callbackUrl.pathname === '/signin') {
      return nestedCallbackUrl
        ? resolveCallbackUrl(nestedCallbackUrl, depth + 1)
        : '/';
    }

    const normalizedCallbackUrl = `${callbackUrl.pathname}${callbackUrl.search}${callbackUrl.hash}`;

    return normalizedCallbackUrl.startsWith('/') ? normalizedCallbackUrl : '/';
  } catch {
    return decodedCallbackUrl.startsWith('/') ? decodedCallbackUrl : '/';
  }
}

export function buildSignInCallbackUrl(rawCallbackUrl: string | null): string {
  const normalizedCallbackUrl = resolveCallbackUrl(rawCallbackUrl);
  const searchParams = new URLSearchParams({
    callbackUrl: normalizedCallbackUrl,
  });

  return `/signin?${searchParams.toString()}`;
}
