export type ReviewDiffMode = {
    type: "working-tree";
} | {
    type: "branch";
    base: string;
};
export interface ReviewLine {
    type: "add" | "del" | "ctx";
    oldNum: number | null;
    newNum: number | null;
    content: string;
}
export interface ReviewHunk {
    id: string;
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
    header: string;
    lines: ReviewLine[];
}
export interface ReviewFileDiff {
    oldPath: string | null;
    newPath: string | null;
    path: string;
    status: "added" | "deleted" | "modified" | "renamed";
    hunks: ReviewHunk[];
}
export interface ReviewDiff {
    mode: ReviewDiffMode;
    files: ReviewFileDiff[];
    raw: string;
}
export declare function readGitDiff(cwd: string, mode?: ReviewDiffMode): ReviewDiff;
export declare function readChangedFiles(cwd: string, mode?: ReviewDiffMode): string[];
export declare function countReviewHunkLines(hunk: ReviewHunk): {
    insertions: number;
    deletions: number;
};
export declare function countReviewFileLines(file: ReviewFileDiff): {
    insertions: number;
    deletions: number;
};
export declare function countReviewDiffLines(diff: ReviewDiff): {
    insertions: number;
    deletions: number;
};
export declare function parseUnifiedGitDiff(raw: string): ReviewFileDiff[];
//# sourceMappingURL=git.d.ts.map