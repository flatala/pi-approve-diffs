// Assert-based self-check for the vendored renderer + preview pipeline.
import { parseDiff } from "../src/vendor/pi-diff/core/diff.js";
import { __testing } from "../src/vendor/pi-diff/index.js";

const oldText = [
	"function greet(name) {",
	'  console.log("hello " + name);',
	"  return name.length;",
	"}",
	"",
].join("\n");

const newText = [
	"function greet(name) {",
	"  console.log(`hello, ${name}!`);",
	"  return name.length;",
	"}",
	"",
].join("\n");

const diff = parseDiff(oldText, newText);
if (diff.added < 1 || diff.removed < 1) throw new Error(`parseDiff produced no hunks: ${JSON.stringify({ added: diff.added, removed: diff.removed })}`);

const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");

const split = await __testing.renderSplit(diff, "typescript");
if (!split.includes("\x1b[")) throw new Error("renderSplit produced no ANSI escapes");
if (!stripAnsi(split).includes("hello, ${name}")) throw new Error("renderSplit missing added line");

const unified = await __testing.renderUnified(diff, "typescript");
if (!unified.includes("\x1b[")) throw new Error("renderUnified produced no ANSI escapes");
if (!stripAnsi(unified).includes("hello, ${name}")) throw new Error("renderUnified missing added line");

const noColor = await __testing.renderSplit(diff, undefined);
if (!stripAnsi(noColor).includes("hello, ${name}")) throw new Error("renderSplit without language lost content");

console.log(`check: OK — +${diff.added} -${diff.removed}, split ${split.split("\n").length} lines, unified ${unified.split("\n").length} lines`);
