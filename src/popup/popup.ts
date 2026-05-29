

interface PipelineData {
    exact: {
        kmp: any[];
        bm: any[];
        ahoCorasick: any[];
        rabinKarp: any[];
    };
    regex: any[];
    fuzzy: any[];
    executionTime: {
        kmp: number;
        bm: number;
        ahoCorasick: number;
        rabinKarp: number;
        regex: number;
        fuzzy: number;
    };
    highlightStats?: {
        totalHighlights: number;
        uniqueKeywordCount: number;
        algorithmCounts: Record<string, number>;
    };
}

async function initPopup() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];
    if (!activeTab || !activeTab.id) return;

    const tabId = activeTab.id;

    // Ambil hasil dari background
    chrome.runtime.sendMessage({ type: 'GET_RESULTS', tabId }, (response) => {
        if (response && response.data) {
            updateUI(response.data);
        }
    });

    // Tombol rescan
    const rescanBtn = document.getElementById('rescan-btn') as HTMLButtonElement;
    if (rescanBtn) {
        rescanBtn.addEventListener('click', () => {
            rescanBtn.textContent = 'Scanning...';
            rescanBtn.disabled = true;

            chrome.runtime.sendMessage({ type: 'RESCAN', tabId }, () => {
                // Tunggu sebentar lalu refresh data
                setTimeout(() => {
                    chrome.runtime.sendMessage({ type: 'GET_RESULTS', tabId }, (response) => {
                        if (response && response.data) {
                            updateUI(response.data);
                        }
                        rescanBtn.textContent = 'Scan Ulang Halaman';
                        rescanBtn.disabled = false;
                    });
                }, 500);
            });
        });
    }

    // Toggle blur
    const blurToggle = document.getElementById('blur-toggle') as HTMLInputElement;
    if (blurToggle) {
        blurToggle.addEventListener('change', () => {
            chrome.runtime.sendMessage({ type: 'TOGGLE_BLUR', tabId, enabled: blurToggle.checked });
        });
    }

    const ocrToggle = document.getElementById('ocr-toggle') as HTMLInputElement;
    if (ocrToggle) {
        chrome.storage.local.get(['ocrEnabled'], (res) => {
            ocrToggle.checked = !!res.ocrEnabled;
        });

        chrome.runtime.sendMessage({ type: 'GET_OCR_STATE', tabId }, (response) => {
            if (response && response.state) {
                updateOcrResult(response.state.detected, response.state.blurred);
            }
        });

        ocrToggle.addEventListener('change', () => {
            chrome.runtime.sendMessage({ type: 'TOGGLE_OCR', tabId, enabled: ocrToggle.checked });
        });
    }

    const ocrBtn = document.getElementById('ocr-btn') as HTMLButtonElement;
    if (ocrBtn) {
        ocrBtn.addEventListener('click', () => {
            ocrBtn.textContent = 'Scanning Gambar...';
            ocrBtn.disabled = true;

            chrome.runtime.sendMessage({ type: 'RUN_OCR', tabId }, (response) => {
                ocrBtn.textContent = 'Scan Gambar Sekarang';
                ocrBtn.disabled = false;
                if (response && response.ok && response.data) {
                    updateOcrResult(response.data.detected, response.data.blurred);
                }
            });
        });
    }
}

function updateOcrResult(detected: number, blurred: number) {
    const ocrResult = document.getElementById('ocr-result');
    if (ocrResult) {
        ocrResult.textContent = `Gambar terdeteksi: ${detected}, Diblur: ${blurred}`;
        ocrResult.style.display = 'block';
    }
}

function updateUI(data: PipelineData) {
    const exactKmp = data.exact.kmp.length;
    const exactBm = data.exact.bm.length;
    const exactAc = data.exact.ahoCorasick.length;
    const exactRk = data.exact.rabinKarp.length;
    const regexCount = data.regex.length;
    const fuzzyCount = data.fuzzy.length;

    // Total unique keywords berdasarkan yang benar-benar ter-highlight di DOM
    const totalUnique = data.highlightStats?.uniqueKeywordCount ?? (() => {
        const uniqueKeywords = new Set<string>();
        data.exact.kmp.forEach((r: any) => uniqueKeywords.add(r.keyword.toLowerCase()));
        data.exact.bm.forEach((r: any) => uniqueKeywords.add(r.keyword.toLowerCase()));
        data.exact.ahoCorasick.forEach((r: any) => uniqueKeywords.add(r.keyword.toLowerCase()));
        data.exact.rabinKarp.forEach((r: any) => uniqueKeywords.add(r.keyword.toLowerCase()));
        data.regex.forEach((r: any) => uniqueKeywords.add(r.keyword.toLowerCase()));
        data.fuzzy.forEach((r: any) => uniqueKeywords.add(r.keyword.toLowerCase()));
        return uniqueKeywords.size;
    })();

    // Update total
    const totalEl = document.getElementById('total-keywords');
    if (totalEl) totalEl.textContent = String(totalUnique);

    // Update match counts
    updateElement('kmp-matches', exactKmp);
    updateElement('bm-matches', exactBm);
    updateElement('ac-matches', exactAc);
    updateElement('rk-matches', exactRk);
    updateElement('regex-matches', regexCount);
    updateElement('fuzzy-matches', fuzzyCount);

    // Update times
    updateElement('kmp-time', formatTime(data.executionTime.kmp));
    updateElement('bm-time', formatTime(data.executionTime.bm));
    updateElement('ac-time', formatTime(data.executionTime.ahoCorasick));
    updateElement('rk-time', formatTime(data.executionTime.rabinKarp));
    updateElement('regex-time', formatTime(data.executionTime.regex));
    updateElement('fuzzy-time', formatTime(data.executionTime.fuzzy));

    // Update chart bars
    const maxVal = Math.max(exactKmp, exactBm, exactAc, exactRk, regexCount, fuzzyCount, 1);
    updateBar('bar-kmp', 'bar-val-kmp', exactKmp, maxVal);
    updateBar('bar-bm', 'bar-val-bm', exactBm, maxVal);
    updateBar('bar-ac', 'bar-val-ac', exactAc, maxVal);
    updateBar('bar-rk', 'bar-val-rk', exactRk, maxVal);
    updateBar('bar-regex', 'bar-val-regex', regexCount, maxVal);
    updateBar('bar-fuzzy', 'bar-val-fuzzy', fuzzyCount, maxVal);

    renderFuzzyDetails(data.fuzzy);
}

function renderFuzzyDetails(fuzzyMatches: any[]) {
    const container = document.getElementById('fuzzy-details');
    if (!container) return;

    container.innerHTML = '';

    if (fuzzyMatches.length === 0) {
        container.innerHTML = '<p class="fuzzy-empty">Tidak ada fuzzy match ditemukan.</p>';
        return;
    }

    const seen = new Set<string>();
    const uniqueMatches = [];
    for (const m of fuzzyMatches) {
        const key = `${m.keyword.toLowerCase()}_${m.matchedWord.toLowerCase()}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueMatches.push(m);
        }
    }

    for (const match of uniqueMatches) {
        const item = document.createElement('div');
        item.className = 'fuzzy-item';
        item.innerHTML = `
            <span class="fuzzy-keyword">${escapeHtml(match.keyword)}</span>
            <span class="fuzzy-arrow">→</span>
            <span class="fuzzy-match">${escapeHtml(match.matchedWord)}</span>
            <span class="fuzzy-score">dist ${match.difDis}</span>`;
        container.appendChild(item);
    }
}

function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateElement(id: string, value: number | string) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
}

function formatTime(ms: number): string {
    return ms.toFixed(3);
}

function updateBar(barId: string, valId: string, value: number, max: number) {
    const bar = document.getElementById(barId);
    const val = document.getElementById(valId);
    if (bar) bar.style.width = `${(value / max) * 100}%`;
    if (val) val.textContent = String(value);
}

document.addEventListener('DOMContentLoaded', initPopup);
