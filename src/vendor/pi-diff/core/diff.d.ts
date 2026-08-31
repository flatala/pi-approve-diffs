/** Hunk metadata attached to separator DiffLines. */
export interface HunkMeta {
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
    /** Function context from hunk header, e.g. "function foo() {" */
    context?: string;
}
export interface DiffLine {
    type: "add" | "del" | "ctx" | "sep";
    oldNum: number | null;
    newNum: number | null;
    content: string;
    /** Hunk metadata — present on first sep and between-hunk seps if available. */
    hunkMeta?: HunkMeta;
}
export interface ParsedDiff {
    lines: DiffLine[];
    added: number;
    removed: number;
    chars: number;
}
export declare function parsePatchFiles(patch: string): ParsedDiff[];
/** Style for rendering hunk separators between change blocks. */
export type HunkSeparatorStyle = "auto" | "simple" | "gap" | "context" | "metadata";
/**
 * Resolve hunk separator style from env var PI_DIFF_SEP_STYLE.
 * Call once during extension init, or with force=true to re-read.
 */
export declare function resolveSepStyle(): HunkSeparatorStyle;
/**
 * Get the current separator style (resolved once via resolveSepStyle()).
 */
export declare function getSepStyle(): HunkSeparatorStyle;
/**
 * Generate a hunk separator label for the unified view.
 * Returns the full label including spacing, or an empty string when no useful label exists.
 * If `content` is non-empty, it is used directly (e.g. "───── Edit 2 ─────").
 */
export declare function sepLabelUnified(style: HunkSeparatorStyle, hunkMeta: HunkMeta | undefined, gap: number | null, content?: string): string;
/**
 * Generate a hunk separator label for the split view.
 * Returns useful context/gap labels without decorative ellipses.
 * If `content` is non-empty, it is used directly (e.g. "───── Edit 2 ─────").
 */
export declare function sepLabelSplit(style: HunkSeparatorStyle, hunkMeta: HunkMeta | undefined, gap: number | null, content?: string): string;
/** A paired block of deletions and additions within a hunk. */
export interface HunkBlock {
    deletions: DiffLine[];
    additions: DiffLine[];
}
/**
 * Walk a ParsedDiff and extract hunk blocks.
 * Each block is a group of consecutive deletes followed by consecutive adds.
 * Context and separator lines are skipped.
 */
export declare function computeHunkBlocks(diff: ParsedDiff): HunkBlock[];
export declare function parseDiff(oldContent: string, newContent: string, ctx?: number): ParsedDiff;
//# sourceMappingURL=diff.d.ts.map