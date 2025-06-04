import { captureFullpage } from './utils.js';

let options = {
  deviceScaleFactor: 1,
  format: 'png',
  fromSurface: true,
};

let imageBase64 :string;
let editorTabId: number | null = null;
let tabTitle :string;
let tabId: number | null = null;

const onMessages = async (request, sender, sendResponse) => {
  try {
    const { currentTabId, currentTabTitle, actionType } = request;

    if (request.currentTabId) {
      tabTitle = currentTabTitle;
      tabId = currentTabId;
    }

    if (actionType === 'get-screenshot') {
      sendResponse({ imageBase64, editorTabId, tabTitle });
    }

    if (actionType === 'screenshot-fullpage') {
      // await chrome.debugger.sendCommand({ tabId }, 'Debugger.enable');
      imageBase64 = String(await captureFullpage(tabId, options));

      if (imageBase64) {
        const tabInfos = await chrome.tabs.create({ url: 'editor.html' });
        editorTabId = tabInfos.id ?? null;
        // await chrome.debugger.sendCommand({ tabId }, 'Debugger.disable');
        sendResponse({ message: 'screenshot-done' });
      }
    }
  } catch (error) {
    console.log('Error ==> ', error.message);
  }
}

chrome.runtime.onMessage.addListener(onMessages);