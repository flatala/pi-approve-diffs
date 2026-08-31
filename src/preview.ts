import { existsSync, readFileSync } from "node:fs";
import { extname } from "node:path";
import { parseDiff, type ParsedDiff } from "./vendor/pi-diff/core/diff.js";

const LANGUAGES: Record<string, string> = {
	".ts": "typescript", ".tsx": "tsx", ".js": "javascript", ".mjs": "javascript",
	".cjs": "javascript", ".jsx": "jsx", ".py": "python", ".rb": "ruby",
	".rs": "rust", ".go": "go", ".java": "java", ".kt": "kotlin",
	".swift": "swift", ".c": "c", ".h": "c", ".cpp": "cpp", ".cc": "cpp",
	".hpp": "cpp", ".cs": "csharp", ".php": "php", ".sh": "bash",
	".bash": "bash", ".zsh": "bash", ".json": "json", ".jsonc": "jsonc",
	".yaml": "yaml", ".yml": "yaml", ".toml": "toml", ".md": "markdown",
	".html": "html", ".css": "css", ".scss": "scss", ".sql": "sql",
	".lua": "lua", ".xml": "xml",
};

export type Preview = {
	toolName: string;
	path: string;
	diff: ParsedDiff;
	language: string | undefined;
	warnings: string[];
};

type EditInput = { oldText?: string; newText?: string };
type ToolInput = {
	path?: string;
	content?: string;
	edits?: EditInput[];
	oldText?: string;
	newText?: string;
	replaceAll?: boolean;
	changes?: unknown[];
};

function countOccurrences(haystack: string, needle: string): number {
	let count = 0;
	let index = 0;
	while ((index = haystack.indexOf(needle, index)) !== -1) {
		count++;
		index += needle.length;
	}
	return count;
}

function applyEdits(
	text: string,
	edits: EditInput[],
	replaceAll: boolean,
	warnings: string[],
): string {
	let result = text;
	for (const [i, edit] of edits.entries()) {
		const oldText = edit.oldText ?? "";
		if (oldText === "") {
			warnings.push(`edit ${i + 1}: empty oldText — skipped in preview`);
			continue;
		}
		const matches = countOccurrences(result, oldText);
		if (matches === 0) {
			warnings.push(`edit ${i + 1}: oldText not found — nothing to show`);
			continue;
		}
		if (matches > 1 && !replaceAll) {
			warnings.push(`edit ${i + 1}: ${matches} matches — preview shows the first`);
		}
		result =
			matches > 1 && replaceAll
				? result.replaceAll(oldText, edit.newText ?? "")
				: result.replace(oldText, edit.newText ?? "");
	}
	return result;
}

export async function buildPreview(toolName: string, input: ToolInput): Promise<Preview | null> {
	const path = input.path;
	if (!path) return null;

	const exists = existsSync(path);
	const oldText = exists ? readFileSync(path, "utf8") : "";
	const warnings: string[] = [];
	let newText = oldText;

	if (toolName === "write") {
		newText = input.content ?? "";
	} else if (toolName === "edit") {
		const edits = input.edits ?? [{ oldText: input.oldText, newText: input.newText }];
		newText = applyEdits(oldText, edits, input.replaceAll === true, warnings);
	} else if (toolName === "hashline_edit") {
		const { applyHashlineEditsToFile } = await import("./vendor/pi-diff/core/hashline-edit.js");
		const result = await applyHashlineEditsToFile(path, (input.changes ?? []) as never, {
			dryRun: true,
		});
		if (result && "newContent" in result && typeof result.newContent === "string") {
			newText = result.newContent;
		} else {
			// ponytail: hashline previews that fail to decode pass through ungated
			return null;
		}
	} else {
		return null;
	}

	if (newText === oldText) return null;

	return {
		toolName,
		path,
		diff: parseDiff(oldText, newText),
		language: LANGUAGES[extname(path).toLowerCase()],
		warnings,
	};
}
