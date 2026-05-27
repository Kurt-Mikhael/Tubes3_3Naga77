
type TabResults = any;

type OcrState = { enabled: boolean; detected: number; blurred: number };

const tabResults = new Map<number, TabResults>();
const ocrStates = new Map<number, OcrState>();

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

    if (message.type === 'TOGGLE_OCR') {
        const targetTabId = message.tabId;
        ocrStates.set(targetTabId, { enabled: message.enabled, detected: 0, blurred: 0 });
        chrome.storage.local.set({ ocrEnabled: message.enabled });
        chrome.tabs.sendMessage(targetTabId, { type: 'TOGGLE_OCR', enabled: message.enabled }, (res) => {
            sendResponse({ ok: true });
        });
        return true;
    }

    if (message.type === 'RUN_OCR') {
        const targetTabId = message.tabId;
        chrome.tabs.sendMessage(targetTabId, { type: 'RUN_OCR' }, (res) => {
            if (res && res.ok && res.data) {
                const state = ocrStates.get(targetTabId) || { enabled: true, detected: 0, blurred: 0 };
                state.detected += res.data.detected;
                state.blurred += res.data.blurred;
                ocrStates.set(targetTabId, state);
                sendResponse({ ok: true, data: res.data });
            } else {
                sendResponse({ ok: false, error: res?.error || 'Unknown error' });
            }
        });
        return true;
    }

    if (message.type === 'FETCH_IMAGE_BASE64') {
        fetch(message.url)
            .then(response => response.blob())
            .then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    sendResponse({ ok: true, dataUrl: reader.result });
                };
                reader.readAsDataURL(blob);
            })
            .catch(err => {
                sendResponse({ ok: false, error: err.toString() });
            });
        return true; 
    }

    if (message.type === 'GET_OCR_STATE') {
        const targetTabId = message.tabId;
        const state = ocrStates.get(targetTabId);
        if (state) {
            sendResponse({ state });
        } else {
            chrome.storage.local.get(['ocrEnabled'], (res) => {
                sendResponse({ state: { enabled: !!res.ocrEnabled, detected: 0, blurred: 0 } });
            });
            return true;
        }
        return false;
    }

    if (message.type === 'OCR_COMPLETE') {
        const targetTabId = sender.tab?.id;
        if (targetTabId !== undefined && message.data) {
            const state = ocrStates.get(targetTabId) || { enabled: true, detected: 0, blurred: 0 };
            state.detected += message.data.detected;
            state.blurred += message.data.blurred;
            ocrStates.set(targetTabId, state);
        }
        sendResponse({ ok: true });
        return false;
    }

    sendResponse({ ok: false });
    return false;
});

chrome.tabs.onRemoved.addListener((tabId) => {
    tabResults.delete(tabId);
    ocrStates.delete(tabId);
});
