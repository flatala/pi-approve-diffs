/**
 * apply_patch — Multi-file patch engine.
 *
 * One call can add, update, delete, or move multiple files.
 * Uses replace.ts's conservative matcher for oldText → newText matching.
 */
export interface ApplyPatchChange {
    /** Absolute path to the file. */
    path: string;
    action: "add" | "update" | "delete" | "move";
    /** Content for new files (action=add). */
    content?: string;
    /** Text to find for updates (action=update). */
    oldText?: string;
    /** Replacement text for updates (action=update). */
    newText?: string;
    /** Destination path for moves (action=move). */
    movePath?: string;
}
export interface ApplyPatchResult {
    ok: boolean;
    applied: AppliedChange[];
    errors: ApplyPatchError[];
}
export interface AppliedChange {
    path: string;
    action: ApplyPatchChange["action"];
    bytes?: number;
    diff?: string;
    movePath?: string;
    oldContent?: string;
    newContent?: string;
}
export interface ApplyPatchError {
    path: string;
    action: string;
    error: string;
}
export declare function executeApplyPatch(changes: ApplyPatchChange[]): Promise<ApplyPatchResult>;
export declare function formatApplyPatchResult(result: ApplyPatchResult): string;
//# sourceMappingURL=apply-patch.d.ts.map