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
let isOcrEnabled = false;

// Keep track of images already processed so we don't re-scan them
const ocrProcessedImages = new WeakSet<HTMLImageElement>();

// Reuse a single Tesseract worker across scans
let tesseractWorker: any = null;

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

    if (message.type === 'TOGGLE_OCR') {
        isOcrEnabled = message.enabled;
        setOcrEnabled(isOcrEnabled);
        if (isOcrEnabled) {
            runOcr().then(res => {
                chrome.runtime.sendMessage({ type: 'OCR_COMPLETE', tabId: sender.tab?.id, data: res });
            });
        }
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


async function getOrCreateWorker() {
    if (tesseractWorker) return tesseractWorker;
    const Tesseract = await import('tesseract.js');
    tesseractWorker = await Tesseract.createWorker('eng');
    return tesseractWorker;
}

async function terminateWorker() {
    if (tesseractWorker) {
        await tesseractWorker.terminate();
        tesseractWorker = null;
    }
}

async function runOcr(): Promise<{ detected: number; blurred: number }> {
    if (isOcrRunning) return { detected: 0, blurred: 0 };
    isOcrRunning = true;

    try {
        const worker = await getOrCreateWorker();
        const allImages = Array.from(document.querySelectorAll('img'));

        // Filter only images that are actually visible and large enough
        const images = allImages.filter(img => {
            const rect = img.getBoundingClientRect();
            return rect.width >= 50 && rect.height >= 50;
        });

        console.log(`[JUDOL-DETECTOR] OCR: ${images.length} images found on page`);

        let detected = 0;
        let blurred = 0;

        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            if (ocrProcessedImages.has(img)) continue;
            ocrProcessedImages.add(img);

            // Try multiple image sources (lazy-loaded sites often use data-src)
            const possibleSources = [
                img.getAttribute('data-src'),
                img.getAttribute('data-original'),
                img.getAttribute('data-lazy-src'),
                img.currentSrc,   // from srcset
                img.src
            ].filter((src): src is string => !!src && src.trim().length > 0);

            console.log(`[JUDOL-DETECTOR] OCR image #${i + 1}: trying ${possibleSources.length} sources`);

            let recognizedText = '';
            let lastErr: any = null;

            for (const imageSrc of possibleSources) {
                try {
                    console.log(`[JUDOL-DETECTOR] OCR recognizing: ${imageSrc.slice(0, 80)}...`);
                    const result = await worker.recognize(imageSrc);
                    recognizedText = result.data.text || '';
                    if (recognizedText.trim()) {
                        console.log(`[JUDOL-DETECTOR] OCR text found: "${recognizedText.trim().slice(0, 100)}..."`);
                        break;
                    }
                } catch (err) {
                    lastErr = err;
                    // Continue to next source
                }
            }

            if (!recognizedText.trim()) {
                if (lastErr) {
                    console.warn(`[JUDOL-DETECTOR] OCR failed for image #${i + 1}:`, lastErr);
                }
                continue;
            }

            const pipelineRes = await runPipeline(recognizedText);
            const totalMatches = pipelineRes.exact.kmp.length +
                pipelineRes.exact.bm.length +
                pipelineRes.exact.ahoCorasick.length +
                pipelineRes.exact.rabinKarp.length +
                pipelineRes.regex.length +
                pipelineRes.fuzzy.length;

            console.log(`[JUDOL-DETECTOR] OCR image #${i + 1}: ${totalMatches} keyword matches`);

            if (totalMatches > 0) {
                detected++;
                img.classList.add('judol-detector-blur');
                if (isOcrEnabled) {
                    img.style.filter = 'blur(15px)';
                }
                blurred++;
                console.log(`[JUDOL-DETECTOR] OCR image #${i + 1} BLURRED`);
            }
        }

        console.log(`[JUDOL-DETECTOR] OCR complete: ${detected} detected, ${blurred} blurred`);
        return { detected, blurred };
    } catch (e) {
        console.error('[JUDOL-DETECTOR] OCR fatal error:', e);
        return { detected: 0, blurred: 0 };
    } finally {
        isOcrRunning = false;
    }
}

function setOcrEnabled(enabled: boolean): void {
    isOcrEnabled = enabled;
    const blurredImages = document.querySelectorAll('img.judol-detector-blur');
    blurredImages.forEach(img => {
        const el = img as HTMLElement;
        if (enabled) {
            el.style.filter = 'blur(15px)';
        } else {
            el.style.filter = '';
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => scanPage());
} else {
    scanPage();
}
