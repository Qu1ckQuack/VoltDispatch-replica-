export const PRIVATE_IP_PATTERNS = [
  /^localhost$/i,
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/,
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
  /^0\.0\.0\.0$/,
];

export function isOriginAllowed(
  origin: string,
  explicitAllowlist: string[],
): boolean {
  if (explicitAllowlist.includes(origin)) return true;
  try {
    const { hostname, port } = new URL(origin);
    if (port === '3000' || port === '') {
      return PRIVATE_IP_PATTERNS.some((p) => p.test(hostname));
    }
  } catch (urlParseError) {
    console.error(`Invalid origin URL: "${origin}" — denied`, urlParseError);
  }
  return false;
}
