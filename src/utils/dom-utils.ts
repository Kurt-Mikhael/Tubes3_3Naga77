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
            if (text.trim().length > 0) {
                nodes.push({
                    node: node as Text,
                    startIndex: currentIndex,
                    endIndex: currentIndex + text.length,
                });
                currentIndex += text.length;
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
    return nodes.map(n => n.node.textContent || '').join('');
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

/**
 * Buat tooltip element dan attach ke document.body
 */
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
    algorithm: string;
    count: string;
    comparisons: string;
    timeMs: string;
}): void {
    const header = tooltip.querySelector('#tooltip-header') as HTMLElement;
    const content = tooltip.querySelector('#tooltip-content') as HTMLElement;

    header.textContent = data.keyword;
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

/**
 * Sembunyikan tooltip
 */
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
