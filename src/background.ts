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

const DEFAULT_DATA: Data = {
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

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  chrome.storage.local.get(STORAGE_KEY, (result) => {
    const stored = result[STORAGE_KEY];
    const data: Data = isValidData(stored) ? stored : DEFAULT_DATA;

    console.log('[DEBUG] chrome onUpdated invoked!', {
      data,
      changeInfoUrl: changeInfo.url,
      tabUrl: tab.url,
    });

    if (!data.active || (!changeInfo.url && !tab.url)) {
      console.log('[DEBUG] chrome onUpdated: not active');
      return;
    }

    const url = changeInfo.url || tab.url;

    if (!url) {
      console.log('[DEBUG] chrome onUpdated: empty url');
      return;
    }

    if (isUrlWhitelisted(url, data.whitelist)) {
      console.log('[DEBUG] chrome onUpdated: whitelisted');
      return;
    }

    if (isUrlBlacklisted(url, data.blacklist)) {
      console.log('[DEBUG] chrome onUpdated: blacklisted');
      chrome.tabs.update(tabId, { url: getBlockedPage() });
    }
  });
});

/*
 * MAIN FLOW - END
 */
