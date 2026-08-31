/**
 * pi-diff — Shiki-powered terminal diff renderer for pi.
 *
 * @module pi-diff
 * @see https://github.com/buddingnewinsights/pi-diff
 *
 * Architecture (like OpenTUI / delta):
 *   1. Syntax-highlight full code blocks via Shiki → ANSI (fg-only codes)
 *   2. Layer diff background colors underneath (composites at cell level)
 *   3. For word-level changes, inject brighter bg at changed char positions
 *   4. Result: syntax fg + diff bg + word emphasis — all three visible together
 *
 * Views:
 *   • Split (side-by-side) — edit tool, auto-falls back to unified on narrow terminals
 *   • Unified (stacked)    — write tool overwrites
 *
 * Performance:
 *   • Singleton Shiki highlighter (managed by @shikijs/cli)
 *   • LRU memo cache per highlighted block
 *   • Large-diff fallback (skip highlighting, still show diff)
 *   • Async rendering with invalidate() for non-blocking preview
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { codeToANSI } from "@shikijs/cli";
import { computeHunkBlocks, getSepStyle, type ParsedDiff, parseDiff, parsePatchFiles, resolveSepStyle } from "./core/diff.js";
type BundledLanguage = Parameters<typeof codeToANSI>[1];
/** Simplified Pi theme — only methods pi-diff actually calls. */
interface PiTheme {
    fg(name: string, text: string): string;
    getFgAnsi?(name: string): string;
    getBgAnsi?(name: string): string;
    bg?(name: string, text: string): string;
    bold(text: string): string;
}
declare function formatToolHeaderName(name: string): string;
declare function isToolResultError(result: {
    isError?: boolean;
}, context: {
    isError?: boolean;
}): boolean;
declare function formatToolHeaderPath(theme: Pick<PiTheme, "fg">, filePath: string): string;
/** Resolved ANSI colors for diff rendering — theme overrides hardcoded defaults. */
interface DiffColors {
    fgAdd: string;
    fgDel: string;
    fgCtx: string;
}
declare function normalizeShikiContrast(ansi: string): string;
declare function renderUnified(diff: ParsedDiff, language: BundledLanguage | undefined, max?: number, dc?: DiffColors): Promise<string>;
declare function renderSplit(diff: ParsedDiff, language: BundledLanguage | undefined, max?: number, dc?: DiffColors): Promise<string>;
export declare const __testing: {
    computeHunkBlocks: typeof computeHunkBlocks;
    formatToolHeaderName: typeof formatToolHeaderName;
    formatToolHeaderPath: typeof formatToolHeaderPath;
    isToolResultError: typeof isToolResultError;
    normalizeShikiContrast: typeof normalizeShikiContrast;
    getSepStyle: typeof getSepStyle;
    parseDiff: typeof parseDiff;
    parsePatchFiles: typeof parsePatchFiles;
    resolveSepStyle: typeof resolveSepStyle;
    renderSplit: typeof renderSplit;
    renderUnified: typeof renderUnified;
};
export default function diffRendererExtension(pi: ExtensionAPI): Promise<void>;
export {};
//# sourceMappingURL=index.d.ts.map