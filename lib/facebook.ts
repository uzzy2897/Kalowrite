// lib/facebook.ts

/**
 * Extracts the _fbc (Facebook Click ID) and _fbp (Browser ID) cookies.
 * These are essential for CAPI deduplication and matching.
 */
export const getFbCookies = () => {
  if (typeof document === 'undefined') return { fbc: '', fbp: '' };
  
  const cookies = document.cookie.split('; ').reduce((acc, cookie) => {
    const [name, value] = cookie.split('=');
    if (name.includes('_fbc')) acc.fbc = value;
    if (name.includes('_fbp')) acc.fbp = value;
    return acc;
  }, { fbc: '', fbp: '' });
  
  return cookies;
};

// You can remove the old trackSubscription function here.