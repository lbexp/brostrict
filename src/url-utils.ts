const matchHostname = (urlHostname: string, patternHostname: string): boolean => {
  return urlHostname === patternHostname;
};

const matchPath = (urlPath: string, patternPath: string): boolean => {
  const normalizedUrlPath = urlPath === '/' ? '' : urlPath.replace(/^\//, '').replace(/\/$/, '');
  const normalizedPatternPath = patternPath.replace(/\/$/, '');

  if (normalizedUrlPath === normalizedPatternPath) {
    return true;
  }

  if (normalizedUrlPath.startsWith(normalizedPatternPath + '/')) {
    return true;
  }

  return false;
};

export const isUrlWhitelisted = (url: string, whitelist: string[]): boolean => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const pathname = urlObj.pathname;

    for (const entry of whitelist) {
      if (entry.includes('/')) {
        const [whitelistHost, ...pathParts] = entry.split('/');
        const whitelistPath = pathParts.join('/');
        if (matchHostname(hostname, whitelistHost) && matchPath(pathname, whitelistPath)) {
          return true;
        }
      } else if (matchHostname(hostname, entry)) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
};

export const isUrlBlacklisted = (url: string, blacklist: string[]): boolean => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const pathname = urlObj.pathname;

    for (const entry of blacklist) {
      if (entry.includes('/')) {
        const [blacklistHost, ...pathParts] = entry.split('/');
        const blacklistPath = pathParts.join('/');
        if (matchHostname(hostname, blacklistHost) && matchPath(pathname, blacklistPath)) {
          return true;
        }
      } else if (matchHostname(hostname, entry)) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
};

const SPECIAL_CHARS = [
  '*', '+', '?', '^', '$', '{', '}', '(', ')', '|',
  '[', ']', '\\', '.',
];

const escapeRegex = (str: string): string => {
  const escaped = SPECIAL_CHARS.map((c) => {
    if (c === '\\') return '\\\\';
    if (c === '$' || c === '{' || c === '}') return '\\' + c;
    if (c === '[' || c === ']' || c === '.') return '\\' + c;
    return c;
  }).join('');

  const pattern = '[' + escaped + ']';
  return str.replace(new RegExp(pattern, 'g'), '\\$&');
};

export const toUrlFilter = (pattern: string): string => {
  const escaped = escapeRegex(pattern);
  return `||${escaped}`;
};
