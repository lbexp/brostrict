const path = require('path');

const EXTENSION_PATH = path.resolve(__dirname, '../../build');

async function getExtensionPopupUrl(context) {
  const bgPage = context.backgroundPages()[0];
  if (bgPage) {
    return bgPage.url();
  }

  const serviceWorker = context.serviceWorkers()[0];
  if (serviceWorker) {
    return serviceWorker.url();
  }

  return null;
}

async function clearExtensionStorage(context) {
  const bgPage = context.backgroundPages()[0];
  if (bgPage) {
    await bgPage.evaluate(() => {
      chrome.storage.local.clear();
    });
  }
}

async function setExtensionStorageData(context, data) {
  const bgPage = context.backgroundPages()[0];
  if (bgPage) {
    await bgPage.evaluate(
      (d) => {
        chrome.storage.local.set({ brostrict_data: d });
      },
      data,
    );
  }
}

async function getPopupPage(context) {
  const allPages = context.pages();

  for (const page of allPages) {
    const url = page.url();
    if (url.includes('popup') || url.includes('index.html') || url.includes('chrome-extension:')) {
      if (!url.includes('background') && !url.includes('service-worker')) {
        return page;
      }
    }
  }

  return null;
}

module.exports = {
  EXTENSION_PATH,
  getExtensionPopupUrl,
  clearExtensionStorage,
  setExtensionStorageData,
  getPopupPage,
};
