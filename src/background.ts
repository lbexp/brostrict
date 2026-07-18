import { isUrlWhitelisted, isUrlBlacklisted } from './url-utils.ts';

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
 * VARIABLES - START
 */

const STORAGE_KEY = 'brostrict_data';
const getBlockedPage = (): string => chrome.runtime.getURL('blocked.html');

export let cachedData: Data = {
  blacklist: [],
  whitelist: [],
  active: true,
};

/*
 * VARIABLES - END
 */

/*
 * BUILDING BLOCK - START
 */

const isValidData = (obj: unknown): obj is Data => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'blacklist' in obj &&
    'whitelist' in obj &&
    'active' in obj &&
    Array.isArray((obj as Data).blacklist) &&
    Array.isArray((obj as Data).whitelist) &&
    typeof (obj as Data).active === 'boolean'
  );
};

/*
 * BUILDING BLOCK - END
 */

/*
 * MAIN FLOW - START
 */

export const init = (): void => {
  chrome.storage.local.get(STORAGE_KEY, (result) => {
    if (isValidData(result[STORAGE_KEY])) {
      cachedData = result[STORAGE_KEY] as Data;
    }
  });
};

chrome.runtime.onInstalled.addListener(init);
chrome.runtime.onStartup.addListener(init);

chrome.storage.local.onChanged.addListener((changes) => {
  console.log('[DEBUG] chrome onChanged invoked!');

  if (changes[STORAGE_KEY]) {
    if (isValidData(changes[STORAGE_KEY].newValue)) {
      cachedData = changes[STORAGE_KEY].newValue as Data;

      console.log('[DEBUG] chrome onChanged data:', cachedData);
    }
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('[DEBUG] chrome onMessage invoked!');

  if (message.type === 'getWhitelist') {
    sendResponse({ whitelist: cachedData.whitelist });
    console.log('[DEBUG] chrome onMessage getWhitelist:', cachedData.whitelist);
  }

  if (message.type === 'isWhitelisted') {
    if (typeof message.url === 'string') {
      const isWhitelisted = isUrlWhitelisted(message.url, cachedData.whitelist);
      sendResponse({
        result: isWhitelisted,
      });

      console.log(
        '[DEBUG] chrome onMessage isWhitelisted valid:',
        isWhitelisted,
      );
    } else {
      sendResponse({ result: false });
      console.log('[DEBUG] chrome onMessage isWhitelisted valid: non-string');
    }
  }
  return true;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.log('[DEBUG] chrome onUpdated invoked!', {
    changeInfoUrl: changeInfo.url,
    tabUrl: tab.url,
  });

  if (!cachedData.active || (!changeInfo.url && !tab.url)) {
    console.log('[DEBUG] chrome onUpdated: not active');
    return;
  }

  const url = changeInfo.url || tab.url;

  if (!url) {
    console.log('[DEBUG] chrome onUpdated: empty url');
    return;
  }

  if (isUrlWhitelisted(url, cachedData.whitelist)) {
    console.log('[DEBUG] chrome onUpdated: whitelisted');
    return;
  }

  if (isUrlBlacklisted(url, cachedData.blacklist)) {
    console.log('[DEBUG] chrome onUpdated: blacklisted');
    chrome.tabs.update(tabId, { url: getBlockedPage() });
  }
});

/*
 * MAIN FLOW - END
 */
