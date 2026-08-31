import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
const HUNK_RE = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/;
export function readGitDiff(cwd, mode = { type: "working-tree" }) {
    const args = mode.type === "branch" ? ["diff", "--no-ext-diff", `${mode.base}...HEAD`] : ["diff", "--no-ext-diff"];
    const trackedRaw = execFileSync("git", args, {
        cwd,
        encoding: "utf8",
        maxBuffer: 50 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
    });
    const untrackedRaw = mode.type === "working-tree" ? readUntrackedFilesAsDiff(cwd) : "";
    const raw = [trackedRaw.trimEnd(), untrackedRaw.trimEnd()].filter(Boolean).join("\n");
    return { mode, files: parseUnifiedGitDiff(raw), raw };
}
export function readChangedFiles(cwd, mode = { type: "working-tree" }) {
    const args = mode.type === "branch" ? ["diff", "--name-only", `${mode.base}...HEAD`] : ["diff", "--name-only"];
    const raw = execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    const tracked = raw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    return mode.type === "working-tree" ? [...tracked, ...readUntrackedFiles(cwd)] : tracked;
}
export function countReviewHunkLines(hunk) {
    let insertions = 0;
    let deletions = 0;
    for (const line of hunk.lines) {
        if (line.type === "add")
            insertions++;
        else if (line.type === "del")
            deletions++;
    }
    return { insertions, deletions };
}
export function countReviewFileLines(file) {
    let insertions = 0;
    let deletions = 0;
    for (const hunk of file.hunks) {
        const counts = countReviewHunkLines(hunk);
        insertions += counts.insertions;
        deletions += counts.deletions;
    }
    return { insertions, deletions };
}
export function countReviewDiffLines(diff) {
    let insertions = 0;
    let deletions = 0;
    for (const file of diff.files) {
        const counts = countReviewFileLines(file);
        insertions += counts.insertions;
        deletions += counts.deletions;
    }
    return { insertions, deletions };
}
export function parseUnifiedGitDiff(raw) {
    const files = [];
    let currentFile = null;
    let currentHunk = null;
    let oldLine = 0;
    let newLine = 0;
    for (const line of raw.split("\n")) {
        if (line.startsWith("diff --git ")) {
            currentFile = createFileDiff(line);
            files.push(currentFile);
            currentHunk = null;
            continue;
        }
        if (!currentFile)
            continue;
        if (line.startsWith("new file mode")) {
            currentFile.status = "added";
            continue;
        }
        if (line.startsWith("deleted file mode")) {
            currentFile.status = "deleted";
            continue;
        }
        if (line.startsWith("rename from ")) {
            currentFile.status = "renamed";
            currentFile.oldPath = line.slice("rename from ".length);
            continue;
        }
        if (line.startsWith("rename to ")) {
            currentFile.status = "renamed";
            currentFile.newPath = line.slice("rename to ".length);
            currentFile.path = currentFile.newPath;
            continue;
        }
        if (line.startsWith("--- ")) {
            currentFile.oldPath = normalizeDiffPath(line.slice(4));
            continue;
        }
        if (line.startsWith("+++ ")) {
            currentFile.newPath = normalizeDiffPath(line.slice(4));
            currentFile.path = currentFile.newPath ?? currentFile.oldPath ?? currentFile.path;
            continue;
        }
        const hunkMatch = line.match(HUNK_RE);
        if (hunkMatch) {
            const oldStart = Number(hunkMatch[1]);
            const oldLines = Number(hunkMatch[2] ?? "1");
            const newStart = Number(hunkMatch[3]);
            const newLines = Number(hunkMatch[4] ?? "1");
            currentHunk = {
                id: `${currentFile.path}:${oldStart}:${newStart}`,
                oldStart,
                oldLines,
                newStart,
                newLines,
                header: line,
                lines: [],
            };
            currentFile.hunks.push(currentHunk);
            oldLine = oldStart;
            newLine = newStart;
            continue;
        }
        if (!currentHunk || line === "\\ No newline at end of file")
            continue;
        const prefix = line[0];
        const content = line.slice(1);
        if (prefix === "+") {
            currentHunk.lines.push({ type: "add", oldNum: null, newNum: newLine++, content });
        }
        else if (prefix === "-") {
            currentHunk.lines.push({ type: "del", oldNum: oldLine++, newNum: null, content });
        }
        else if (prefix === " ") {
            currentHunk.lines.push({ type: "ctx", oldNum: oldLine++, newNum: newLine++, content });
        }
    }
    return files;
}
function readUntrackedFiles(cwd) {
    const raw = execFileSync("git", ["ls-files", "--others", "--exclude-standard"], {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
    });
    return raw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((path) => {
        try {
            return statSync(join(cwd, path)).isFile();
        }
        catch {
            return false;
        }
    });
}
function readUntrackedFilesAsDiff(cwd) {
    return readUntrackedFiles(cwd)
        .map((path) => formatNewFileDiff(path, readFileSync(join(cwd, path), "utf8")))
        .join("\n");
}
function formatNewFileDiff(path, content) {
    const lines = content.split("\n");
    if (lines.at(-1) === "")
        lines.pop();
    const lineCount = Math.max(lines.length, 1);
    return [
        `diff --git a/${path} b/${path}`,
        "new file mode 100644",
        "index 0000000..0000000",
        "--- /dev/null",
        `+++ b/${path}`,
        `@@ -0,0 +1,${lineCount} @@`,
        ...lines.map((line) => `+${line}`),
    ].join("\n");
}
function createFileDiff(header) {
    const match = header.match(/^diff --git a\/(.*) b\/(.*)$/);
    const oldPath = match?.[1] ?? null;
    const newPath = match?.[2] ?? oldPath;
    return {
        oldPath,
        newPath,
        path: newPath ?? oldPath ?? "unknown",
        status: "modified",
        hunks: [],
    };
}
function normalizeDiffPath(path) {
    if (path === "/dev/null")
        return null;
    return path.replace(/^[ab]\//, "");
}
//# sourceMappingURL=git.js.map