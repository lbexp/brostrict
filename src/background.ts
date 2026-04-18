/*
 * INTERFACES - START
 */

interface Data {
  blacklist: string[];
  whitelist: string[];
  active: boolean;
}

/*
 * INTERFACES - END
 */

/*
 * VARIAGBLES - START
 */

const STORAGE_KEY = 'brostrict_data';
const BLOCKED_PAGE = chrome.runtime.getURL('blocked.html');

let cachedData: Data = {
  blacklist: [],
  whitelist: [],
  active: true,
};

/*
 * VARIABLES - END
 */

/*
 * BUILDING BLOCKS - START
 */

const isUrlWhitelisted = (url: string, whitelist: string[]): boolean => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const pathname = urlObj.pathname;

    for (const entry of whitelist) {
      if (entry.includes('/')) {
        const [whitelistHost, whitelistPath] = entry.split('/', 2);
        if (
          hostname === whitelistHost &&
          pathname.startsWith('/' + whitelistPath)
        ) {
          return true;
        }
      } else if (hostname === entry) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
};

const toUrlFilter = (pattern: string): string => {
  if (pattern.includes('/')) {
    return `||${pattern}^`;
  }
  return `||${pattern}`;
};

const updateRules = (): void => {
  if (!cachedData.active) {
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: Array.from({ length: 100 }, (_, i) => i + 1),
      addRules: [],
    });
    return;
  }

  const rules: chrome.declarativeNetRequest.Rule[] = [];

  cachedData.whitelist.forEach((item) => {
    rules.push({
      id: rules.length + 1,
      priority: 2,
      action: {
        type: 'allow',
      },
      condition: {
        resourceTypes: ['main_frame'],
        urlFilter: toUrlFilter(item),
      },
    });
  });

  cachedData.blacklist.forEach((item) => {
    rules.push({
      id: rules.length + 1,
      priority: 1,
      action: {
        type: 'redirect',
        redirect: {
          url: BLOCKED_PAGE,
        },
      },
      condition: {
        resourceTypes: ['main_frame'],
        urlFilter: toUrlFilter(item),
      },
    });
  });

  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: Array.from({ length: 100 }, (_, i) => i + 1),
    addRules: rules,
  });
};

/*
 * BUILDING BLOCKS - END
 */

/*
 * MAIN FLOW - START
 */

const init = (): void => {
  chrome.storage.local.get(STORAGE_KEY, (result) => {
    cachedData = result[STORAGE_KEY] || cachedData;
    updateRules();
  });
};

chrome.runtime.onInstalled.addListener(init);
chrome.runtime.onStartup.addListener(init);
init();

chrome.storage.onChanged.addListener((changes) => {
  if (changes[STORAGE_KEY]) {
    cachedData = changes[STORAGE_KEY].newValue;
    updateRules();
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'getWhitelist') {
    sendResponse({ whitelist: cachedData.whitelist });
  }
  if (message.type === 'isWhitelisted') {
    sendResponse({
      result: isUrlWhitelisted(message.url, cachedData.whitelist),
    });
  }
  return true;
});

/*
 * MAIN FLOW - END
 */
