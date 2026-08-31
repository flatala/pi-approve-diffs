import type { HashlineEdit } from "../hashline.js";
import { type ParsedDiff } from "./diff.js";
export declare const HASHLINE_WORKFLOW = "Workflow: hashline_read(path) \u2192 copy HASH anchors from output \u2192 hashline_edit(path, start_hash, end_hash, replacement). Do not use plain read for edits.";
export declare const HASHLINE_READ_DESC = "Workflow: hashline_read(path) \u2192 copy HASH anchors from output \u2192 hashline_edit(path, start_hash, end_hash, replacement). Do not use plain read for edits. Returns lines as LINE\u2502HASH\u2502content (1-based line numbers). Use HASH anchors in hashline_edit only.";
export declare const HASHLINE_EDIT_DESC = "Workflow: hashline_read(path) \u2192 copy HASH anchors from output \u2192 hashline_edit(path, start_hash, end_hash, replacement). Do not use plain read for edits. Strict atomic apply. Empty replacement deletes the range. Set dryRun:true to validate and preview diff without writing.";
export type HashlineToolResult = {
    content: Array<{
        type: "text";
        text: string;
    }>;
    isError?: boolean;
    details: Record<string, unknown>;
};
export type HashlineExecuteOptions = {
    resolvedPath: string;
    changes: HashlineEdit[];
    dryRun?: boolean;
    /** Pi tool call id — used to stash diff stats for renderCall */
    toolCallId?: string;
    onDiffStats?: (toolCallId: string, diff: ParsedDiff) => void;
};
export declare function runHashlineEdit(opts: HashlineExecuteOptions): Promise<HashlineToolResult>;
export declare function executeHashlineRead(fp: string, content: string, startLine: number, endLine: number): HashlineToolResult;
//# sourceMappingURL=hashline-execute.d.ts.map