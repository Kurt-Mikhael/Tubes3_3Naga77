import { ExactRes } from '../types/type';

// Trie Structure
class TrieNode {
    children: Map<string, TrieNode> = new Map();
    fail: TrieNode | null = null;
    output: string[] = [];
}

export function ahoCorasickSearch(keywords: string[], text: string): ExactRes[] {
    const results: ExactRes[] = [];
    if (!text || keywords.length === 0) return results;

    let comparisons = 0;
    const root = new TrieNode();

    // Build Trie First
    for (const keyword of keywords) {
        if (keyword.length === 0) continue;
        let current = root;
        for (let i = 0; i < keyword.length; i++) {
            const char = keyword[i].toLowerCase();
            if (!current.children.has(char)) {
                current.children.set(char, new TrieNode());
            }
            current = current.children.get(char)!;
        }
        current.output.push(keyword);
    }

    // Failure Links (Breadth-First Search)
    const queue: TrieNode[] = [];
    for (const child of root.children.values()) {
        child.fail = root;
        queue.push(child);
    }

    while (queue.length > 0) {
        const current = queue.shift()!;
        for (const [char, child] of current.children.entries()) {
            queue.push(child);
            let failNode = current.fail;
            
            while (failNode !== null && !failNode.children.has(char)) {
                failNode = failNode.fail;
            }
            
            child.fail = failNode ? failNode.children.get(char)! : root;
            child.output.push(...child.fail.output);
        }
    }

    // Now Searching
    let current = root;
    const matchMap = new Map<string, number[]>();

    for (let i = 0; i < text.length; i++) {
        const char = text[i].toLowerCase();
        comparisons++;

        while (current !== root && !current.children.has(char)) {
            current = current.fail!;
            comparisons++;
        }

        if (current.children.has(char)) {
            current = current.children.get(char)!;
        }

        for (const keyword of current.output) {
            const startIndex = i - keyword.length + 1;
            if (!matchMap.has(keyword)) {
                matchMap.set(keyword, []);
            }
            matchMap.get(keyword)!.push(startIndex);
        }
    }

    // Mapping to ExactRes
    for (const [keyword, indices] of matchMap.entries()) {
        for (const index of indices) {
            results.push({
                keyword: keyword,
                index: index,
                count: indices.length,
                comparisons: comparisons,
                algorithm: 'AC'
            });
        }
    }

    return results;
}