/**
 * Hashline engine — content-anchored line IDs for robust edits.
 *
 * Hash format: 3-char URL-safe base64 from xxHash32, 18 bits entropy.
 * Display:    `HASH│content` (U+2502 box drawings light vertical).
 * Collisions:  resolved with `:R{n}` suffix (perfect hashing per file).
 * Canonical:   CR stripped, trailing whitespace stripped before hashing.
 *
 * Design: edit-pro style (strict, no fuzzy fallback). The conservative
 * `replaceForPatch` path remains available for apply_patch mutations.
 */
export declare function initHashline(): Promise<void>;
export declare function hashLines(content: string): string[];
export declare function parseAnchor(ref: string | undefined | null): string;
export interface AnchorResolveOk {
    ok: true;
    line: number;
    ref: string;
}
export interface AnchorResolveError {
    ok: false;
    error: "empty" | "not_found" | "ambiguous";
    ref: string;
    suggestions?: Array<{
        line: number;
        ref: string;
    }>;
}
export declare function resolveAnchor(ref: string, fileHashes: string[]): AnchorResolveOk | AnchorResolveError;
export interface HashlineEdit {
    hash_range_inclusive: [string, string];
    content_lines: string[];
}
export interface HashlineApplyOk {
    ok: true;
    newContent: string;
    changedRange: [number, number];
    boundaryWarnings: string[];
}
export interface HashlineApplyError {
    ok: false;
    error: string;
    code: "E_STALE_ANCHOR" | "E_BAD_RANGE" | "E_OVERLAP" | "E_EMPTY" | "E_NOT_INITIALIZED" | "E_READ_FAILED" | "E_WRITE_FAILED" | "E_BOUNDARY_DUP";
    ref?: string;
    suggestions?: Array<{
        line: number;
        ref: string;
    }>;
}
export declare function applyHashlineEdits(fileContent: string, changes: HashlineEdit[], filePathForErrors?: string): HashlineApplyOk | HashlineApplyError;
export declare function formatHashlineReadLines(fileContent: string, startLine?: number, endLine?: number): {
    text: string;
    lineCount: number;
    startLine: number;
    endLine: number;
};
/** @deprecated Use formatHashlineReadLines */
export declare function formatHashlineReadView(fileContent: string): string;
export declare function clearHashlineCache(): void;
//# sourceMappingURL=hashline.d.ts.map