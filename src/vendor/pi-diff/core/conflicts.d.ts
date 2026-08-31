/** A single merge conflict region within a file. */
export interface ConflictRegion {
    /** The ref/branch name from <<<<<<< header. */
    currentRef: string;
    /** Lines in the current (ours) side. */
    current: string[];
    /** Lines in the base/ancestor side (3-way merge only). */
    base: string[];
    /** Lines in the incoming (theirs) side. */
    incoming: string[];
    /** The ref/branch name from >>>>>>> footer. */
    incomingRef: string;
    /** Whether this is a 3-way conflict (has base section). */
    hasBase: boolean;
    /** Starting line number in the file (1-based). */
    startLine: number;
}
/** Result of parsing a file for merge conflicts. */
export interface ConflictParseResult {
    regions: ConflictRegion[];
    hasConflicts: boolean;
}
/**
 * Parse a string of file content for merge conflict markers.
 * Returns all conflict regions found.
 */
export declare function parseConflicts(content: string): ConflictParseResult;
/**
 * Check if a string contains merge conflict markers.
 * Fast check without full parsing.
 */
export declare function hasConflictMarkers(content: string): boolean;
/**
 * Build a human-readable summary of a conflict region.
 */
export declare function formatConflictSummary(region: ConflictRegion): string;
//# sourceMappingURL=conflicts.d.ts.map