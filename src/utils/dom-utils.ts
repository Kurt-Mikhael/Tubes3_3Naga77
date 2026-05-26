import { ExactRes, RegexRes, FuzzyRes } from '../types/type';

export interface TextNodeInfo {
    node: Text;
    startIndex: number;
    endIndex: number;
}


export function walkTextNodes(root: Node): TextNodeInfo[] {
    const nodes: TextNodeInfo[] = [];
    let currentIndex = 0;

    function traverse(node: Node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            const tag = el.tagName.toLowerCase();
            if (tag === 'script' || tag === 'style' || tag === 'noscript' || tag === 'iframe') return;
            if (el.classList && el.classList.contains('judol-detector-highlight')) return;
            if (el.classList && el.classList.contains('judol-detector-tooltip')) return;
        }

        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent || '';
            if (text.length > 0) {
                nodes.push({
                    node: node as Text,
                    startIndex: currentIndex,
                    endIndex: currentIndex + text.length,
                });
                currentIndex += text.length + 1; // +1 for space separator
            }
        } else {
            for (const child of Array.from(node.childNodes)) {
                traverse(child);
            }
        }
    }

    traverse(root);
    return nodes;
}


export function buildAggregatedText(nodes: TextNodeInfo[]): string {
    return nodes.map(n => n.node.textContent || '').join(' ');
}

export function getNodeAndOffset(nodes: TextNodeInfo[], globalIndex: number): { node: Text; offset: number } | null {
    for (const info of nodes) {
        if (globalIndex >= info.startIndex && globalIndex < info.endIndex) {
            return {
                node: info.node,
                offset: globalIndex - info.startIndex,
            };
        }
    }
    return null;
}

interface MatchData {
    keyword: string;
    algorithm: string;
    count: number;
    comparisons: number;
    timeMs: number;
}


export function highlightRange(
    nodes: TextNodeInfo[],
    startGlobal: number,
    endGlobal: number,
    matchData: MatchData
): void {
    for (const info of nodes) {
        if (info.endIndex <= startGlobal || info.startIndex >= endGlobal) continue;

        const node = info.node;
        const text = node.textContent || '';
        const localStart = Math.max(0, startGlobal - info.startIndex);
        const localEnd = Math.min(text.length, endGlobal - info.startIndex);

        if (localStart >= localEnd) continue;

        const before = text.slice(0, localStart);
        const matched = text.slice(localStart, localEnd);
        const after = text.slice(localEnd);

        const parent = node.parentNode;
        if (!parent) continue;

        const span = document.createElement('span');
        span.className = 'judol-detector-highlight';
        span.textContent = matched;
        span.dataset.keyword = matchData.keyword;
        span.dataset.algorithm = matchData.algorithm;
        span.dataset.count = String(matchData.count);
        span.dataset.comparisons = String(matchData.comparisons);
        span.dataset.timeMs = String(matchData.timeMs.toFixed(3));

        const fragment = document.createDocumentFragment();
        if (before) fragment.appendChild(document.createTextNode(before));
        fragment.appendChild(span);
        if (after) fragment.appendChild(document.createTextNode(after));

        parent.replaceChild(fragment, node);
    }
}

export interface HighlightMatch {
    startGlobal: number;
    endGlobal: number;
    keyword: string;
    matchedWord?: string;
    algorithm: string;
    count: number;
    comparisons: number;
    timeMs: number;
}

export function highlightAll(
    nodes: TextNodeInfo[],
    matches: HighlightMatch[]
): void {
    if (matches.length === 0) return;

    const nodeHighlights = new Map<TextNodeInfo, { startLocal: number; endLocal: number; match: HighlightMatch }[]>();

    for (const match of matches) {
        for (const info of nodes) {
            const overlapStart = Math.max(match.startGlobal, info.startIndex);
            const overlapEnd = Math.min(match.endGlobal, info.endIndex);
            if (overlapStart < overlapEnd) {
                if (!nodeHighlights.has(info)) nodeHighlights.set(info, []);
                nodeHighlights.get(info)!.push({
                    startLocal: overlapStart - info.startIndex,
                    endLocal: overlapEnd - info.startIndex,
                    match
                });
            }
        }
    }

    for (const [info, ranges] of nodeHighlights) {
        const parent = info.node.parentNode;
        if (!parent) continue;

        const text = info.node.textContent || '';

        // Deduplicate and sort by startLocal
        const seen = new Set<string>();
        const uniqueRanges = ranges.filter(r => {
            const key = `${r.startLocal}_${r.endLocal}_${r.match.keyword}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }).sort((a, b) => a.startLocal - b.startLocal);

        if (uniqueRanges.length === 0) continue;

        // Merge overlapping ranges
        const merged: { start: number; end: number; match: HighlightMatch }[] = [];
        for (const r of uniqueRanges) {
            const last = merged[merged.length - 1];
            if (last && r.startLocal < last.end) {
                // Overlap: extend if this range goes farther, adopt its match data
                if (r.endLocal > last.end) {
                    last.end = r.endLocal;
                    last.match = r.match;
                }
            } else {
                merged.push({ start: r.startLocal, end: r.endLocal, match: r.match });
            }
        }

        // Build segments: text, match, text, match, ...
        const segments: { start: number; end: number; match: HighlightMatch | null }[] = [];
        let current = 0;

        for (const r of merged) {
            if (r.start > current) {
                segments.push({ start: current, end: r.start, match: null });
            }
            segments.push({ start: r.start, end: r.end, match: r.match });
            current = r.end;
        }
        if (current < text.length) {
            segments.push({ start: current, end: text.length, match: null });
        }

        const fragment = document.createDocumentFragment();
        for (const seg of segments) {
            const slice = text.slice(seg.start, seg.end);
            if (seg.match) {
                const span = document.createElement('span');
                span.className = 'judol-detector-highlight';
                span.textContent = slice;
                span.dataset.keyword = seg.match.keyword;
                span.dataset.matchedWord = seg.match.matchedWord || seg.match.keyword;
                span.dataset.algorithm = seg.match.algorithm;
                span.dataset.count = String(seg.match.count);
                span.dataset.comparisons = String(seg.match.comparisons);
                span.dataset.timeMs = String(seg.match.timeMs.toFixed(3));
                fragment.appendChild(span);
            } else {
                fragment.appendChild(document.createTextNode(slice));
            }
        }

        parent.replaceChild(fragment, info.node);
    }
}


export function clearHighlights(doc: Document = document): void {
    const highlights = doc.querySelectorAll('.judol-detector-highlight, .judol-detector-blur');
    highlights.forEach(el => {
        const parent = el.parentNode;
        if (!parent) return;
        parent.insertBefore(document.createTextNode(el.textContent || ''), el);
        parent.removeChild(el);
        parent.normalize();
    });
}


export function createTooltip(): HTMLElement {
    const old = document.getElementById('judol-detector-tooltip');
    if (old) old.remove();

    const tooltip = document.createElement('div');
    tooltip.id = 'judol-detector-tooltip';
    tooltip.className = 'judol-detector-tooltip';
    tooltip.innerHTML = `
        <div class="tooltip-header" id="tooltip-header">Judol Detector</div>
        <div class="tooltip-content" id="tooltip-content"></div>
    `;
    document.body.appendChild(tooltip);
    return tooltip;
}


export function showTooltip(tooltip: HTMLElement, x: number, y: number, data: {
    keyword: string;
    matchedWord: string;
    algorithm: string;
    count: string;
    comparisons: string;
    timeMs: string;
}): void {
    const header = tooltip.querySelector('#tooltip-header') as HTMLElement;
    const content = tooltip.querySelector('#tooltip-content') as HTMLElement;

    const isFuzzy = data.algorithm.includes('Fuzzy');
    if (isFuzzy) {
        header.textContent = `${data.keyword} (mirip: ${data.matchedWord})`;
    } else {
        header.textContent = data.keyword;
    }

    content.innerHTML = `
        <p><strong>Algoritma:</strong> ${data.algorithm}</p>
        <p><strong>Kemunculan:</strong> ${data.count}</p>
        <p><strong>Perbandingan:</strong> ${data.comparisons} karakter</p>
        <p><strong>Waktu:</strong> ${data.timeMs} ms</p>
    `;

    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y - 10}px`;
    tooltip.classList.add('visible');
}


export function hideTooltip(tooltip: HTMLElement): void {
    tooltip.classList.remove('visible');
}


export function setBlurEnabled(enabled: boolean): void {
    const highlights = document.querySelectorAll('.judol-detector-highlight, .judol-detector-blur');
    highlights.forEach(el => {
        if (enabled) {
            el.classList.remove('judol-detector-highlight');
            el.classList.add('judol-detector-blur');
        } else {
            el.classList.remove('judol-detector-blur');
            el.classList.add('judol-detector-highlight');
        }
    });
}
