import type { Data } from '../../../src/background';

export interface ChromeStorageMock {
  get: (key: string, callback?: (result: Record<string, unknown>) => void) => Promise<Record<string, unknown>>;
  set: (data: Record<string, unknown>) => Promise<void>;
  clear: () => Promise<void>;
  onChanged: {
    addListener: (callback: (changes: Record<string, { newValue: unknown }>) => void) => void;
    removeListener: (callback: (changes: Record<string, { newValue: unknown }>) => void) => void;
  };
}

export interface ChromeDeclarativeNetRequestMock {
  updateDynamicRules: (options: {
    removeRuleIds?: number[];
    addRules?: Array<{
      id: number;
      priority: number;
      action: { type: string; redirect?: { url: string } };
      condition: { resourceTypes: string[]; urlFilter: string };
    }>;
  }) => Promise<void>;
  getDynamicRules: () => Promise<Array<{
    id: number;
    priority: number;
    action: { type: string; redirect?: { url: string } };
    condition: { resourceTypes: string[]; urlFilter: string };
  }>>;
}

export interface ChromeRuntimeMock {
  getURL: (path: string) => string;
  onInstalled: { addListener: (callback: (details: { reason: string }) => void) => void };
  onStartup: { addListener: (callback: () => void) => void };
  onMessage: {
    addListener: (callback: (message: { type: string; url?: string }, sender: unknown, sendResponse: (response: unknown) => void) => void) => void;
  };
  sendMessage: (message: { type: string; url?: string }) => Promise<unknown>;
}

export interface ChromeTabsMock {
  onUpdated: {
    addListener: (callback: (tabId: number, changeInfo: { url?: string }, tab: { url?: string }) => void) => void;
  };
  update: (tabId: number, options: { url: string }) => Promise<void>;
}

export interface ChromeMock {
  storage: { local: ChromeStorageMock };
  declarativeNetRequest: ChromeDeclarativeNetRequestMock;
  runtime: ChromeRuntimeMock;
  tabs: ChromeTabsMock;
}

let storageData: Record<string, unknown> = {};
let storageListeners: Array<(changes: Record<string, { newValue: unknown }>) => void> = [];
let messageListeners: Array<(message: { type: string; url?: string }, sender: unknown, sendResponse: (response: unknown) => void) => void> = [];
let dynamicRules: Array<{
  id: number;
  priority: number;
  action: { type: string; redirect?: { url: string } };
  condition: { resourceTypes: string[]; urlFilter: string };
}> = [];

function createMockFunction() {
  let calls: unknown[][] = [];
  const fn = async (...args: unknown[]) => {
    calls.push(args);
    return undefined;
  };
  (fn as typeof fn & { mock: { calls: unknown[][] } }).mock = { calls };
  return fn as typeof fn & { mock: { calls: unknown[][] } };
}

export const createChromeMock = (): ChromeMock => {
  storageData = {};
  storageListeners = [];
  messageListeners = [];
  dynamicRules = [];

  const updateDynamicRulesCalls: Array<{
    removeRuleIds: number[];
    addRules: Array<{
      id: number;
      priority: number;
      action: { type: string; redirect?: { url: string } };
      condition: { resourceTypes: string[]; urlFilter: string };
    }>;
  }> = [];

  return {
    storage: {
      local: {
        get: (key: string, callback?: (result: Record<string, unknown>) => void): Promise<Record<string, unknown>> => {
          const result: Record<string, unknown> = {};
          if (key === 'brostrict_data') {
            result[key] = storageData[key];
          }
          if (callback) {
            queueMicrotask(() => callback(result));
          }
          return Promise.resolve(result);
        },
        set: async (data: Record<string, unknown>) => {
          storageData = { ...storageData, ...data };
          const changes: Record<string, { newValue: unknown }> = {};
          for (const key of Object.keys(data)) {
            changes[key] = { newValue: data[key] };
          }
          storageListeners.forEach((cb) => cb(changes));
        },
        clear: async () => {
          storageData = {};
        },
        onChanged: {
          addListener: (cb) => {
            storageListeners.push(cb);
          },
          removeListener: (cb) => {
            const idx = storageListeners.indexOf(cb);
            if (idx !== -1) storageListeners.splice(idx, 1);
          },
        },
      },
    },
    declarativeNetRequest: {
      updateDynamicRules: async (options) => {
        updateDynamicRulesCalls.push({
          removeRuleIds: options.removeRuleIds || [],
          addRules: options.addRules || [],
        });
        dynamicRules = dynamicRules.filter((r) => !(options.removeRuleIds || []).includes(r.id));
        for (const rule of (options.addRules || [])) {
          const existing = dynamicRules.findIndex((r) => r.id === rule.id);
          if (existing !== -1) {
            dynamicRules[existing] = rule;
          } else {
            dynamicRules.push(rule);
          }
        }
      },
      getDynamicRules: async () => [...dynamicRules],
    },
    runtime: {
      getURL: (path: string) => `chrome-extension://mock_id/${path}`,
      onInstalled: { addListener: () => {} },
      onStartup: { addListener: () => {} },
      onMessage: {
        addListener: (cb) => {
          messageListeners.push(cb);
        },
      },
      sendMessage: async (message) => {
        for (const listener of messageListeners) {
          let response: unknown;
          listener(message, {}, (res) => { response = res; });
          if (response !== undefined) return response;
        }
        return undefined;
      },
    },
    tabs: {
      onUpdated: { addListener: () => {} },
      update: async () => {},
    },
  };
};

export const resetChromeState = (): void => {
  storageData = {};
  storageListeners = [];
  messageListeners = [];
  dynamicRules = [];
};

export const setStorageData = (key: string, value: unknown): void => {
  storageData = { ...storageData, [key]: value };
};

export const clearStorageData = (): void => {
  storageData = {};
};
