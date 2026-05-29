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
import * as Tesseract from 'tesseract.js';

let tooltipEl: HTMLElement | null = null;
let isBlurEnabled = false;
let isOcrRunning = false;
let tooltipSetupDone = false;
let isOcrEnabled = false;

const ocrProcessedImages = new Map<HTMLImageElement, string>();

let tesseractWorker: any = null;

let imageObserver: MutationObserver | null = null;
let ocrDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let ocrInterval: ReturnType<typeof setInterval> | null = null;

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
            endGlobal: match.endIndex ?? match.index + match.matchedWord.length,
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
            endGlobal: match.endIndex ?? match.index + match.matchedWord.length,
            keyword: match.keyword,
            matchedWord: match.matchedWord,
            algorithm: 'Fuzzy (Weighted Levenshtein)',
            count: results.fuzzy.length,
            comparisons: 0,
            timeMs: results.executionTime.fuzzy,
        });
    }

    highlightAll(textNodes, allMatches);

    // Hitung statistik berdasarkan apa yang benar-benar ter-render di DOM
    const highlightSpans = document.querySelectorAll('.judol-detector-highlight');
    const uniqueDomKeywords = new Set<string>();
    const algorithmCounts: Record<string, number> = {};

    highlightSpans.forEach((span) => {
        const el = span as HTMLElement;
        const kw = el.dataset.keyword || '';
        const algo = el.dataset.algorithm || '';
        if (kw) uniqueDomKeywords.add(kw.toLowerCase());
        algorithmCounts[algo] = (algorithmCounts[algo] || 0) + 1;
    });

    results.highlightStats = {
        totalHighlights: highlightSpans.length,
        uniqueKeywordCount: uniqueDomKeywords.size,
        algorithmCounts,
    };

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
        if (target.classList.contains('judol-detector-highlight')) {
            const rect = target.getBoundingClientRect();
            showTooltip(tooltipEl!, rect.left + rect.width / 2, rect.top, {
                keyword: target.dataset.keyword || '',
                matchedWord: target.dataset.matchedWord || target.dataset.keyword || '',
                algorithm: target.dataset.algorithm || '',
                count: target.dataset.count || '0',
                comparisons: target.dataset.comparisons || '0',
                timeMs: target.dataset.timeMs || '0',
            });
        } else if (target.classList.contains('judol-detector-blur')) {
            const rect = target.getBoundingClientRect();
            tooltipEl!.classList.add('image-blur-tooltip');
            showTooltip(tooltipEl!, rect.left + rect.width / 2, rect.top, {
                keyword: target.dataset.keyword || 'Judol Content',
                matchedWord: target.dataset.matchedWord || 'Gambar terdeteksi mengandung konten judi online',
                algorithm: target.dataset.algorithm || 'OCR (Tesseract.js)',
                count: target.dataset.count || '1',
                comparisons: target.dataset.comparisons || '0',
                timeMs: target.dataset.timeMs || '0',
            });
        }
    });

    document.body.addEventListener('mouseout', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('judol-detector-highlight') || target.classList.contains('judol-detector-blur')) {
            tooltipEl!.classList.remove('image-blur-tooltip');
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
        chrome.storage.local.set({ ocrEnabled: isOcrEnabled });
        setOcrEnabled(isOcrEnabled);
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
    try {
        const createWorker = (Tesseract as any).createWorker || (Tesseract as any).default?.createWorker;
        if (!createWorker) {
            throw new Error('Tesseract.createWorker not found. Module shape: ' + JSON.stringify(Object.keys(Tesseract)));
        }

        const workerPath = chrome.runtime.getURL('tesseract/worker.min.js');
        console.log('[JUDOL-DETECTOR] Loading Tesseract worker from:', workerPath);

        tesseractWorker = await createWorker('eng', 1, {
            workerPath,
            logger: (m: any) => {
                if (m.status === 'recognizing text') {
                    console.log(`[Tesseract] ${m.status}: ${Math.round(m.progress * 100)}%`);
                }
            },
            errorHandler: (e: any) => console.error('[Tesseract Error]', e),
        });
        await tesseractWorker.setParameters({
            tessedit_pageseg_mode: '11',
        });

        console.log('[JUDOL-DETECTOR] Tesseract worker ready');
        return tesseractWorker;
    } catch (err) {
        console.error('[JUDOL-DETECTOR] Failed to initialize Tesseract worker:', err);
        throw err;
    }
}

async function terminateWorker() {
    if (tesseractWorker) {
        await tesseractWorker.terminate();
        tesseractWorker = null;
    }
}

function otsuThreshold(gray: Uint8Array): number {
    const hist = new Array(256).fill(0);
    for (let i = 0; i < gray.length; i++) {
        hist[gray[i]]++;
    }

    let total = gray.length;
    let sum = 0;
    for (let i = 0; i < 256; i++) {
        sum += i * hist[i];
    }

    let sumB = 0;
    let wB = 0;
    let maxVariance = 0;
    let threshold = 128;

    for (let t = 0; t < 256; t++) {
        wB += hist[t];
        if (wB === 0) continue;

        const wF = total - wB;
        if (wF === 0) break;

        sumB += t * hist[t];
        const mB = sumB / wB;
        const mF = (sum - sumB) / wF;

        const variance = wB * wF * (mB - mF) * (mB - mF);
        if (variance > maxVariance) {
            maxVariance = variance;
            threshold = t;
        }
    }

    return threshold;
}

function sharpen(data: Uint8ClampedArray, w: number, h: number): void {
    const kernel = [
        0, -1,  0,
       -1,  5, -1,
        0, -1,  0
    ];
    const copy = new Uint8ClampedArray(data);
    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            const idx = (y * w + x) * 4;
            let r = 0, g = 0, b = 0;
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const nidx = ((y + ky) * w + (x + kx)) * 4;
                    const kval = kernel[(ky + 1) * 3 + (kx + 1)];
                    r += copy[nidx] * kval;
                    g += copy[nidx + 1] * kval;
                    b += copy[nidx + 2] * kval;
                }
            }
            data[idx] = Math.min(255, Math.max(0, r));
            data[idx + 1] = Math.min(255, Math.max(0, g));
            data[idx + 2] = Math.min(255, Math.max(0, b));
        }
    }
}

function applyThreshold(gray: Float32Array, data: Uint8ClampedArray, w: number, h: number, invert: boolean): void {
    const n = w * h;
    const integral = new Float32Array((h + 1) * (w + 1));
    const g = invert ? gray.map(v => 255 - v) : gray;

    for (let y = 1; y <= h; y++) {
        let rowSum = 0;
        for (let x = 1; x <= w; x++) {
            rowSum += g[(y - 1) * w + (x - 1)];
            integral[y * (w + 1) + x] = integral[(y - 1) * (w + 1) + x] + rowSum;
        }
    }

    const blockSize = Math.max(15, Math.floor(Math.min(w, h) / 8));
    const half = blockSize >> 1;
    const C = 2;
    let darkPixelCount = 0;

    for (let y = 0; y < h; y++) {
        const y1 = Math.max(0, y - half);
        const y2 = Math.min(h, y + half + 1);
        const rowOffset = y * w;
        const iY1 = y1 * (w + 1);
        const iY2 = y2 * (w + 1);

        for (let x = 0; x < w; x++) {
            const x1 = Math.max(0, x - half);
            const x2 = Math.min(w, x + half + 1);
            const count = (x2 - x1) * (y2 - y1);

            const sum =
                integral[iY2 + x2] -
                integral[iY2 + x1] -
                integral[iY1 + x2] +
                integral[iY1 + x1];

            const threshold = sum / count - C;
            const val = g[rowOffset + x] > threshold ? 255 : 0;
            const base = (rowOffset + x) << 2;
            data[base] = val;
            data[base + 1] = val;
            data[base + 2] = val;
            if (val === 0) darkPixelCount++;
        }
    }

    const darkRatio = darkPixelCount / n;
    if (darkRatio < 0.03 || darkRatio > 0.85) {
        let sum = 0;
        for (let i = 0; i < n; i++) sum += g[i];
        const mean = sum / n;
        const threshold = mean - 5;
        for (let i = 0, p = 0; i < data.length; i += 4, p++) {
            const val = g[p] > threshold ? 255 : 0;
            data[i] = val;
            data[i + 1] = val;
            data[i + 2] = val;
        }
    }
}

async function preprocessImageForOcr(imageSrc: string): Promise<string[]> {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve([imageSrc]);
                return;
            }

            // Resize: downscale gambar besar, UPSCALE gambar kecil supaya teks terbaca
            let w = img.width;
            let h = img.height;
            const MAX_OCR_DIMENSION = 2000;
            const MIN_OCR_DIMENSION = 600;

            if (w > MAX_OCR_DIMENSION || h > MAX_OCR_DIMENSION) {
                const ratio = Math.min(MAX_OCR_DIMENSION / w, MAX_OCR_DIMENSION / h);
                w = Math.round(w * ratio);
                h = Math.round(h * ratio);
            } else if (w < MIN_OCR_DIMENSION && h < MIN_OCR_DIMENSION) {
                const ratio = Math.min(MIN_OCR_DIMENSION / w, MIN_OCR_DIMENSION / h);
                w = Math.round(w * ratio);
                h = Math.round(h * ratio);
            }

            canvas.width = w;
            canvas.height = h;
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, w, h);

            const imageData = ctx.getImageData(0, 0, w, h);
            const data = imageData.data;
            const n = w * h;

            // 1. Grayscale + sharpening
            const gray = new Float32Array(n);
            for (let i = 0, p = 0; i < data.length; i += 4, p++) {
                gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            }

            // Contrast stretching
            let minVal = 255, maxVal = 0;
            for (let i = 0; i < n; i++) {
                if (gray[i] < minVal) minVal = gray[i];
                if (gray[i] > maxVal) maxVal = gray[i];
            }
            const range = maxVal - minVal || 1;
            for (let i = 0; i < n; i++) {
                gray[i] = ((gray[i] - minVal) / range) * 255;
            }

            const results: string[] = [];

            // Helper: process a region and add to results
            const processRegion = (grayRegion: Float32Array, wRegion: number, hRegion: number, invert: boolean) => {
                const c = document.createElement('canvas');
                c.width = wRegion;
                c.height = hRegion;
                const cx = c.getContext('2d')!;
                const id = cx.createImageData(wRegion, hRegion);
                const d = id.data;
                applyThreshold(grayRegion, d, wRegion, hRegion, invert);
                cx.putImageData(id, 0, 0);
                return c.toDataURL('image/png');
            };

            // Full image variants
            applyThreshold(gray, data, w, h, false);
            ctx.putImageData(imageData, 0, 0);
            results.push(canvas.toDataURL('image/png'));

            applyThreshold(gray, data, w, h, true);
            ctx.putImageData(imageData, 0, 0);
            results.push(canvas.toDataURL('image/png'));

            // Otsu global
            const grayUint = new Uint8Array(n);
            for (let i = 0; i < n; i++) grayUint[i] = Math.round(gray[i]);
            const otsuThresh = otsuThreshold(grayUint);
            const adjOtsu = Math.max(0, otsuThresh - 10);
            for (let i = 0, p = 0; i < data.length; i += 4, p++) {
                const val = gray[p] < adjOtsu ? 0 : 255;
                data[i] = val;
                data[i + 1] = val;
                data[i + 2] = val;
            }
            ctx.putImageData(imageData, 0, 0);
            results.push(canvas.toDataURL('image/png'));

            // Crop variants: bottom 40% (where text usually is in judol banners)
            const cropY = Math.floor(h * 0.55);
            const cropH = h - cropY;
            if (cropH >= 80) {
                const bottomGray = new Float32Array(w * cropH);
                for (let y = 0; y < cropH; y++) {
                    for (let x = 0; x < w; x++) {
                        bottomGray[y * w + x] = gray[(cropY + y) * w + x];
                    }
                }
                results.push(processRegion(bottomGray, w, cropH, false));
                results.push(processRegion(bottomGray, w, cropH, true));
            }

            // Center crop (for square/vertical images where text is centered)
            const centerY = Math.floor(h * 0.2);
            const centerH = Math.floor(h * 0.6);
            if (centerH >= 80) {
                const centerGray = new Float32Array(w * centerH);
                for (let y = 0; y < centerH; y++) {
                    for (let x = 0; x < w; x++) {
                        centerGray[y * w + x] = gray[(centerY + y) * w + x];
                    }
                }
                results.push(processRegion(centerGray, w, centerH, false));
                results.push(processRegion(centerGray, w, centerH, true));
            }

            resolve(results);
        };

        img.onerror = () => {
            // Kalau gagal load, resolve kosong — jangan pass original URL ke Tesseract
            resolve([]);
        };
        img.src = imageSrc;
    });
}

// Yield ke event loop supaya UI tidak freeze
function yieldToMain(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0));
}

// Parse srcset attribute untuk ambil URL gambar terbesar
function parseSrcset(srcset: string | null): string[] {
    if (!srcset) return [];
    // Regex: match URL (non-space chars, tapi boleh query string) lalu optional width descriptor
    const candidates: { url: string; width: number }[] = [];
    const parts = srcset.split(',');
    for (const part of parts) {
        const trimmed = part.trim();
        // Cari last occurrence of space yang diikuti width descriptor (e.g. " 150w", " 2x")
        const match = trimmed.match(/^(.+?)\s+(\d+w|\d+\.?\d*x)\s*$/);
        if (match) {
            const url = match[1].trim();
            const descriptor = match[2];
            const width = descriptor.endsWith('w') ? parseInt(descriptor.slice(0, -1), 10) : 0;
            if (url && !url.startsWith('data:image/svg+xml')) {
                candidates.push({ url, width });
            }
        } else if (trimmed && !trimmed.startsWith('data:image/svg+xml')) {
            // No descriptor, just URL
            candidates.push({ url: trimmed, width: 0 });
        }
    }
    candidates.sort((a, b) => b.width - a.width);
    return candidates.map(c => c.url);
}

function isImageInViewport(img: HTMLImageElement): boolean {
    const rect = img.getBoundingClientRect();
    const vh = window.innerHeight;
    // Hanya gambar yang benar-benar terlihat atau dekat viewport
    return rect.bottom >= -vh && rect.top <= 2 * vh && rect.width >= 40 && rect.height >= 25;
}

async function runOcr(): Promise<{ detected: number; blurred: number }> {
    if (isOcrRunning) return { detected: 0, blurred: 0 };
    isOcrRunning = true;

    try {
        const worker = await getOrCreateWorker();
        const allImages = Array.from(document.querySelectorAll('img'));

        // Filter: hanya gambar di viewport yang cukup besar
        const images = allImages.filter(isImageInViewport);

        console.log(`[JUDOL-DETECTOR] OCR: ${images.length} visible images to scan (dari ${allImages.length} total)`);

        let detected = 0;
        let blurred = 0;
        const BATCH_SIZE = 3;

        for (let i = 0; i < images.length; i++) {
            if (!isOcrEnabled) break; // Abort jika user matikan OCR di tengah jalan

            const img = images[i];
            const lastSrc = ocrProcessedImages.get(img);
            const currentSrc = img.currentSrc || img.src;
            if (lastSrc === currentSrc) continue;

            // Batch yield: setiap 3 gambar, kasih breath ke UI thread
            if (i > 0 && i % BATCH_SIZE === 0) {
                await yieldToMain();
                if (!isOcrEnabled) break;
            }

            // Ambil semua kemungkinan source gambar, termasuk srcset (DeviantArt, responsive img)
            const srcsetUrls = parseSrcset(img.getAttribute('srcset'));
            const possibleSources = [
                ...srcsetUrls,
                img.getAttribute('data-src'),
                img.getAttribute('data-original'),
                img.getAttribute('data-lazy-src'),
                img.currentSrc,
                img.src
            ].filter((src): src is string => !!src && src.trim().length > 0 && !src.startsWith('data:image/svg+xml'));

            let recognizedText = '';
            let bestConfidence = 0;
            let lastErr: any = null;

            for (const imageSrc of possibleSources) {
                try {
                    let imageToProcess = imageSrc;

                    if (!imageSrc.startsWith('data:')) {
                        const base64Res = await chrome.runtime.sendMessage({
                            type: 'FETCH_IMAGE_BASE64',
                            url: imageSrc
                        });

                        if (base64Res && base64Res.ok) {
                            imageToProcess = base64Res.dataUrl;
                        } else {
                            continue;
                        }
                    }

                    const preprocessedImages = await preprocessImageForOcr(imageToProcess);

                    // HANYA gunakan preprocessed images (valid base64 PNG), BUKAN original source
                    // Original source sering gagal: "Unknown format: no pix returned"
                    const psmModes = ['11', '7', '8', '6'];

                    for (const imgVariant of preprocessedImages) {
                        for (const psm of psmModes) {
                            try {
                                await worker.setParameters({ tessedit_pageseg_mode: psm });
                                const result = await worker.recognize(imgVariant);
                                const text = (result.data.text || '').trim();
                                const conf = result.data.confidence || 0;

                                if (text.length > recognizedText.length || (text.length === recognizedText.length && conf > bestConfidence)) {
                                    recognizedText = text;
                                    bestConfidence = conf;
                                }

                                if (recognizedText.length >= 5) break;
                            } catch (e) {
                                // Skip error untuk varian ini, coba varian lain
                            }
                        }
                        if (recognizedText.length >= 5) break;
                    }
                    // Reset ke default
                    await worker.setParameters({ tessedit_pageseg_mode: '11' });

                    if (recognizedText.length >= 5) break; // Cukup dari source ini
                } catch (err) {
                    lastErr = err;
                }
            }

            ocrProcessedImages.set(img, currentSrc);

            console.log(`[JUDOL-DETECTOR] OCR image #${i + 1} text: "${recognizedText.slice(0, 120)}" (conf: ${bestConfidence})`);

            if (!recognizedText.trim()) {
                if (lastErr) {
                    console.warn(`[JUDOL-DETECTOR] OCR failed for image #${i + 1}:`, lastErr);
                }
                continue;
            }

            const pipelineRes = await runPipeline(recognizedText);
            const totalMatches =
                pipelineRes.exact.kmp.length +
                pipelineRes.exact.bm.length +
                pipelineRes.exact.ahoCorasick.length +
                pipelineRes.exact.rabinKarp.length +
                pipelineRes.regex.length +
                pipelineRes.fuzzy.length;

            if (totalMatches > 0) {
                detected++;
                img.classList.add('judol-detector-blur');
                // Tambahkan dataset untuk tooltip
                const firstMatch = pipelineRes.exact.kmp[0] ||
                    pipelineRes.exact.bm[0] ||
                    pipelineRes.exact.ahoCorasick[0] ||
                    pipelineRes.exact.rabinKarp[0] ||
                    pipelineRes.regex[0] ||
                    pipelineRes.fuzzy[0];
                if (firstMatch) {
                    img.dataset.keyword = firstMatch.keyword || 'Unknown';
                    img.dataset.matchedWord = recognizedText.trim().slice(0, 100);
                    img.dataset.algorithm = 'OCR (Tesseract.js)';
                    img.dataset.count = String(totalMatches);
                    img.dataset.comparisons = '0';
                    img.dataset.timeMs = '0';
                }
                blurred++;
                console.log(`[JUDOL-DETECTOR] OCR image #${i + 1} BLURRED`);
            }
        }

        console.log(`[JUDOL-DETECTOR] OCR complete: ${detected} detected, ${blurred} blurred`);
        chrome.runtime.sendMessage({ type: 'OCR_COMPLETE', data: { detected, blurred } });
        return { detected, blurred };
    } catch (e) {
        console.error('[JUDOL-DETECTOR] OCR fatal error:', e);
        chrome.runtime.sendMessage({ type: 'OCR_COMPLETE', data: { detected: 0, blurred: 0, error: String(e) } });
        return { detected: 0, blurred: 0 };
    } finally {
        isOcrRunning = false;
    }
}

function setOcrEnabled(enabled: boolean): void {
    isOcrEnabled = enabled;
    const blurredImages = document.querySelectorAll('img.judol-detector-blur');
    blurredImages.forEach(img => {
        if (enabled) {
            img.classList.add('judol-detector-blur');
        } else {
            img.classList.remove('judol-detector-blur');
        }
    });

    if (enabled) {
        startImageObserver();
        runOcr();
    } else {
        stopImageObserver();
        ocrProcessedImages.clear();
    }
}

function startImageObserver(): void {
    if (imageObserver) return;

    imageObserver = new MutationObserver((mutations) => {
        if (!isOcrEnabled || isOcrRunning) return;

        let hasNewImages = false;
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node instanceof HTMLImageElement) {
                    hasNewImages = true;
                } else if (node instanceof HTMLElement) {
                    if (node.querySelector('img')) hasNewImages = true;
                }
            }
        }

        if (hasNewImages) {
            if (ocrDebounceTimer) clearTimeout(ocrDebounceTimer);
            ocrDebounceTimer = setTimeout(() => {
                if (isOcrEnabled && !isOcrRunning) {
                    runOcr();
                }
            }, 1000);
        }
    });

    imageObserver.observe(document.body, { childList: true, subtree: true });

    // Periodic re-scan jarang-jarang saja untuk lazy-loaded images
    if (ocrInterval) clearInterval(ocrInterval);
    ocrInterval = setInterval(() => {
        if (isOcrEnabled && !isOcrRunning) {
            runOcr();
        }
    }, 10000);
}

function stopImageObserver(): void {
    if (imageObserver) {
        imageObserver.disconnect();
        imageObserver = null;
    }
    if (ocrInterval) {
        clearInterval(ocrInterval);
        ocrInterval = null;
    }
    if (ocrDebounceTimer) {
        clearTimeout(ocrDebounceTimer);
        ocrDebounceTimer = null;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => scanPage());
} else {
    scanPage();
}

// Check if OCR was previously enabled and re-enable it
chrome.storage.local.get(['ocrEnabled'], (res) => {
    if (res.ocrEnabled) {
        isOcrEnabled = true;
        setOcrEnabled(true);
    }
});
