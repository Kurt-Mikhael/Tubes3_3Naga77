import { runPipeline } from '../core/pipeline';
import {
    walkTextNodes,
    buildAggregatedText,
    highlightAll,
    clearHighlights,
    createTooltip,
    showTooltip,
    hideTooltip,
    setBlurEnabled
} from '../utils/dom-utils';
import { ExactRes, RegexRes, FuzzyRes } from '../types/type';
import { HighlightMatch } from '../utils/dom-utils';

let tooltipEl: HTMLElement | null = null;
let isBlurEnabled = false;
let isOcrRunning = false;
let tooltipSetupDone = false;

async function scanPage(): Promise<void> {
    clearHighlights();

    const textNodes = walkTextNodes(document.body);
    const aggregatedText = buildAggregatedText(textNodes);

    if (!aggregatedText.trim()) {
        console.log('[JUDOL-DETECTOR] Tidak ada teks untuk di-scan');
        return;
    }

    console.log('[JUDOL-DETECTOR] Scanning page...');
    const results = await runPipeline(aggregatedText);

    const allExact = [
        ...results.exact.kmp,
        ...results.exact.bm,
        ...results.exact.ahoCorasick,
        ...results.exact.rabinKarp,
    ];

    const seen = new Set<string>();
    const uniqueExact: ExactRes[] = [];

    for (const match of allExact) {
        const key = `${match.keyword.toLowerCase()}_${match.index}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueExact.push(match);
        }
    }

    const allMatches: HighlightMatch[] = [];

    // Exact matches
    for (const match of uniqueExact) {
        allMatches.push({
            startGlobal: match.index,
            endGlobal: match.index + match.keyword.length,
            keyword: match.keyword,
            algorithm: match.algorithm,
            count: match.count,
            comparisons: match.comparisons,
            timeMs: results.executionTime[mapAlgoKey(match.algorithm)],
        });
    }

    // Regex matches
    for (const match of results.regex) {
        allMatches.push({
            startGlobal: match.index,
            endGlobal: match.index + match.matchedWord.length,
            keyword: match.matchedWord,
            algorithm: 'RegEx',
            count: results.regex.length,
            comparisons: 0,
            timeMs: results.executionTime.regex,
        });
    }

    // Fuzzy matches
    for (const match of results.fuzzy) {
        allMatches.push({
            startGlobal: match.index,
            endGlobal: match.index + match.matchedWord.length,
            keyword: match.keyword,
            matchedWord: match.matchedWord,
            algorithm: 'Fuzzy (Weighted Levenshtein)',
            count: results.fuzzy.length,
            comparisons: 0,
            timeMs: results.executionTime.fuzzy,
        });
    }

    highlightAll(textNodes, allMatches);

    if (isBlurEnabled) {
        setBlurEnabled(true);
    }

    if (!tooltipSetupDone) {
        setupTooltip();
        tooltipSetupDone = true;
    }

    chrome.runtime.sendMessage({ type: 'SCAN_COMPLETE', data: results });

    console.log('[JUDOL-DETECTOR] Scan selesai');
}

function mapAlgoKey(algo: string): 'kmp' | 'bm' | 'ahoCorasick' | 'rabinKarp' {
    switch (algo) {
        case 'KMP': return 'kmp';
        case 'BM': return 'bm';
        case 'AC': return 'ahoCorasick';
        case 'RK': return 'rabinKarp';
        default: return 'kmp';
    }
}


function setupTooltip(): void {
    if (!tooltipEl) {
        tooltipEl = createTooltip();
    }

    document.body.addEventListener('mouseover', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('judol-detector-highlight') || target.classList.contains('judol-detector-blur')) {
            const rect = target.getBoundingClientRect();
            showTooltip(tooltipEl!, rect.left + rect.width / 2, rect.top, {
                keyword: target.dataset.keyword || '',
                matchedWord: target.dataset.matchedWord || target.dataset.keyword || '',
                algorithm: target.dataset.algorithm || '',
                count: target.dataset.count || '0',
                comparisons: target.dataset.comparisons || '0',
                timeMs: target.dataset.timeMs || '0',
            });
        }
    });

    document.body.addEventListener('mouseout', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('judol-detector-highlight') || target.classList.contains('judol-detector-blur')) {
            hideTooltip(tooltipEl!);
        }
    });
}


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'RESCAN') {
        scanPage().then(() => {
            sendResponse({ ok: true });
        }).catch(err => {
            console.error('[JUDOL-DETECTOR] Scan error:', err);
            sendResponse({ ok: false, error: String(err) });
        });
        return true; 
    }

    if (message.type === 'TOGGLE_BLUR') {
        isBlurEnabled = message.enabled;
        setBlurEnabled(isBlurEnabled);
        sendResponse({ ok: true });
        return false;
    }

    if (message.type === 'RUN_OCR') {
        runOcr().then(res => {
            sendResponse({ ok: true, data: res });
        }).catch(err => {
            sendResponse({ ok: false, error: String(err) });
        });
        return true;
    }

    return false;
});


async function runOcr(): Promise<{ detected: number; blurred: number }> {
    if (isOcrRunning) return { detected: 0, blurred: 0 };
    isOcrRunning = true;

    try {
        const Tesseract = await import('tesseract.js');
        const images = Array.from(document.querySelectorAll('img'));
        let detected = 0;
        let blurred = 0;

        for (const img of images) {
            if (!img.src || img.width < 50 || img.height < 50) continue;

            try {
                const result = await Tesseract.createWorker('eng').then(async (worker) => {
                    const ret = await worker.recognize(img.src);
                    await worker.terminate();
                    return ret;
                });

                const text = result.data.text;
                if (!text.trim()) continue;

                const pipelineRes = await runPipeline(text);
                const totalMatches = pipelineRes.exact.kmp.length +
                    pipelineRes.exact.bm.length +
                    pipelineRes.exact.ahoCorasick.length +
                    pipelineRes.exact.rabinKarp.length +
                    pipelineRes.regex.length +
                    pipelineRes.fuzzy.length;

                if (totalMatches > 0) {
                    detected++;
                    img.classList.add('judol-detector-blur');
                    img.style.filter = 'blur(15px)';
                    blurred++;
                }
            } catch (e) {
                console.error('[JUDOL-DETECTOR] OCR error on image:', e);}
        }

        return { detected, blurred };
    } catch (e) {
        console.error('[JUDOL-DETECTOR] OCR error:', e);
        return { detected: 0, blurred: 0 };
    } finally {
        isOcrRunning = false;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => scanPage());
} else {
    scanPage();
}
