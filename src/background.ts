/*
 * INTERFACES - START
 */

interface Data {
  blacklist: string[];
  whitelist: string[];
  active: boolean;
}

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
 * INTERFACES - END
 */

/*
 * VARIABLES - START
 */

const STORAGE_KEY = 'brostrict_data';
const getBlockedPage = (): string => chrome.runtime.getURL('blocked.html');

let currentRuleIds: number[] = [];

export let cachedData: Data = {
  blacklist: [],
  whitelist: [],
  active: true,
};

/*
 * VARIABLES - END
 */

import { isUrlWhitelisted, isUrlBlacklisted, toUrlFilter } from './url-utils.ts';

/*
 * BUILDING BLOCKS - START
 */

export { isUrlWhitelisted, isUrlBlacklisted, toUrlFilter };

export const updateRules = (): void => {
  const removeAllRules = (): Promise<void> => {
    if (currentRuleIds.length === 0) {
      return Promise.resolve();
    }
    return chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: currentRuleIds,
      addRules: [],
    }).then(() => {
      currentRuleIds = [];
    }).catch((err) => {
      console.error('Failed to remove rules:', err);
      currentRuleIds = [];
    });
  };

  if (!cachedData.active) {
    removeAllRules();
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
          url: getBlockedPage(),
        },
      },
      condition: {
        resourceTypes: ['main_frame'],
        urlFilter: toUrlFilter(item),
      },
    });
  });

  const newRuleIds = rules.map((r) => r.id);

  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: currentRuleIds,
    addRules: rules,
  }).then(() => {
    currentRuleIds = newRuleIds;
  }).catch((err) => {
    console.error('Failed to update rules:', err);
  });
};

/*
 * BUILDING BLOCKS - END
 */

/*
 * MAIN FLOW - START
 */

export const init = (): void => {
  chrome.storage.local.get(STORAGE_KEY, (result) => {
    if (isValidData(result[STORAGE_KEY])) {
      cachedData = result[STORAGE_KEY] as Data;
    }
    updateRules();
  });
};

chrome.runtime.onInstalled.addListener(init);
chrome.runtime.onStartup.addListener(init);

chrome.storage.local.onChanged.addListener((changes) => {
  if (changes[STORAGE_KEY]) {
    if (isValidData(changes[STORAGE_KEY].newValue)) {
      cachedData = changes[STORAGE_KEY].newValue as Data;
      updateRules();
    }
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'getWhitelist') {
    sendResponse({ whitelist: cachedData.whitelist });
  }
  if (message.type === 'isWhitelisted') {
    if (typeof message.url === 'string') {
      sendResponse({
        result: isUrlWhitelisted(message.url, cachedData.whitelist),
      });
    } else {
      sendResponse({ result: false });
    }
  }
  return true;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!cachedData.active || !changeInfo.url || !tab.url) return;

  const url = tab.url;

  if (isUrlWhitelisted(url, cachedData.whitelist)) return;

  if (isUrlBlacklisted(url, cachedData.blacklist)) {
    chrome.tabs.update(tabId, { url: getBlockedPage() });
  }
});

/*
 * MAIN FLOW - END
 */
