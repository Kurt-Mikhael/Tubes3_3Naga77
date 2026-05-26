
type TabResults = any; 

const tabResults = new Map<number, TabResults>();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const tabId = sender.tab?.id;

    if (message.type === 'SCAN_COMPLETE' && tabId !== undefined) {
        tabResults.set(tabId, message.data);
        sendResponse({ ok: true });
        return false;
    }

    if (message.type === 'GET_RESULTS') {
        const targetTabId = message.tabId;
        const data = tabResults.get(targetTabId) || null;
        sendResponse({ data });
        return false;
    }

    if (message.type === 'RESCAN') {
        const targetTabId = message.tabId;
        chrome.tabs.sendMessage(targetTabId, { type: 'RESCAN' }, (res) => {
            sendResponse({ ok: true });
        });
        return true;
    }

    if (message.type === 'TOGGLE_BLUR') {
        const targetTabId = message.tabId;
        chrome.tabs.sendMessage(targetTabId, { type: 'TOGGLE_BLUR', enabled: message.enabled }, (res) => {
            sendResponse({ ok: true });
        });
        return true;
    }

    if (message.type === 'RUN_OCR') {
        const targetTabId = message.tabId;
        chrome.tabs.sendMessage(targetTabId, { type: 'RUN_OCR' }, (res) => {
            sendResponse({ ok: true, data: res });
        });
        return true;
    }

    sendResponse({ ok: false });
    return false;
});

chrome.tabs.onRemoved.addListener((tabId) => {
    tabResults.delete(tabId);
});
