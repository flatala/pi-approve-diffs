import { Key, matchesKey, truncateToWidth, visibleWidth, type Component, type ThemeLike } from "@earendil-works/pi-tui";
import { __testing } from "./vendor/pi-diff/index.js";
import type { Preview } from "./preview.js";

const { renderSplit, renderUnified } = __testing;
const shouldUseSplit = __testing.shouldUseSplit as
	| ((diff: NonNullable<Preview["sections"][number]["diff"]>, tw: number | undefined, maxRows?: number) => boolean)
	| undefined;

export type Decision =
	| { action: "approve" }
	| { action: "yolo" }
	| { action: "decline" }
	| { action: "steer"; message?: string };

type TuiLike = { terminal: { rows: number; columns: number } };

/** Apply pi's theme to the vendored renderer so diff backgrounds match the UI. */
/** Reset the vendored renderer to its default (black) palette.
 *  Pre-approval: dark background, only +/- lines carry green/red.
 *  Post-approval the vendored result renderer re-derives the green box from the theme. */
export function resetPalette(): void {
	// ponytail: stale transforms may miss this export — degrade to current palette
	if (typeof __testing.resolveDiffColors === "function") __testing.resolveDiffColors({});
}

const printable = (data: string) => data.length > 0 && ![...data].some((ch) => ch < " ");

const ACTIONS = [
	{ action: "approve", label: "Approve", hot: "y" },
	{ action: "yolo", label: "Approve all (session)", hot: "a" },
	{ action: "decline", label: "Decline", hot: "n" },
	{ action: "steer", label: "Steer — type guidance", hot: "s" },
] as const;
type ActionIndex = 0 | 1 | 2 | 3;
const ACTION_LABEL_WIDTH = Math.max(...ACTIONS.map((a) => a.label.length));

class ApprovalScreen implements Component {
	private view: "split" | "unified";
	private splitLines: string[];
	private unifiedLines: string[];
	private offset = 0;
	private selected: ActionIndex = 0;
	private mode: "view" | "steer" = "view";
	private steerBuffer = "";
	private splitTooWide: boolean | undefined;
	private tui: TuiLike;
	private theme: ThemeLike;
	private preview: Preview;
	private done: (decision: Decision) => void;

	constructor(opts: {
		tui: TuiLike;
		theme: ThemeLike;
		preview: Preview;
		splitLines: string[];
		unifiedLines: string[];
		initialView: "split" | "unified";
		done: (decision: Decision) => void;
	}) {
		this.tui = opts.tui;
		this.theme = opts.theme;
		this.preview = opts.preview;
		this.splitLines = opts.splitLines;
		this.unifiedLines = opts.unifiedLines;
		this.view = opts.initialView;
		this.done = opts.done;
	}

	private get lines(): string[] {
		if (this.view === "split" && !this.splitTooWide) return this.splitLines;
		return this.unifiedLines;
	}

	private effectiveView(): string {
		return this.lines === this.splitLines ? "split" : "unified";
	}

	private scroll(delta: number): void {
		const max = Math.max(0, this.lines.length - this.bodyRows());
		this.offset = Math.min(max, Math.max(0, this.offset + delta));
	}

	private bodyRows(): number {
		// docked in the editor slot: cap the diff window at ~60% of the terminal,
		// minus header/warnings/blank/action list/hint/border chrome
		const capped = Math.min(Math.floor(this.tui.terminal.rows * 0.6), 40);
		return Math.max(3, capped - 10 - this.preview.warnings.length);
	}

	handleInput(data: string): void {
		if (this.mode === "steer") {
			if (matchesKey(data, Key.enter)) {
				this.done({ action: "steer", message: this.steerBuffer.trim() });
			} else if (matchesKey(data, Key.escape)) {
				this.mode = "view";
				this.steerBuffer = "";
			} else if (matchesKey(data, Key.backspace)) {
				this.steerBuffer = this.steerBuffer.slice(0, -1);
			} else if (printable(data)) {
				this.steerBuffer += data;
			}
			return;
		}

		// hotkey accelerators
		if (data === "y") this.done({ action: "approve" });
		else if (data === "a") this.done({ action: "yolo" });
		else if (data === "n" || matchesKey(data, Key.escape)) this.done({ action: "decline" });
		else if (data === "s") {
			this.selected = 3;
			this.mode = "steer";
		}
		// list navigation — arrows move the selection
		else if (matchesKey(data, Key.up)) this.selected = ((this.selected + 3) % 4) as ActionIndex;
		else if (matchesKey(data, Key.down)) this.selected = ((this.selected + 1) % 4) as ActionIndex;
		// enter confirms the selected action
		else if (matchesKey(data, Key.enter)) {
			const action = ACTIONS[this.selected].action;
			if (action === "steer") this.mode = "steer";
			else this.done({ action });
		}
		// view + scrolling
		else if (matchesKey(data, Key.tab)) this.view = this.effectiveView() === "split" ? "unified" : "split";
		else if (data === "k") this.scroll(-1);
		else if (data === "j") this.scroll(1);
		else if (matchesKey(data, Key.pageUp)) this.scroll(-this.bodyRows());
		else if (matchesKey(data, Key.pageDown) || data === " ") this.scroll(this.bodyRows());
		else if (matchesKey(data, Key.home)) this.offset = 0;
		else if (matchesKey(data, Key.end)) this.scroll(this.lines.length);
	}

	private semanticOf(action: string): "success" | "error" | "accent" {
		return action === "decline" ? "error" : action === "steer" ? "accent" : "success";
	}

	private actionLine(i: number): string {
		const a = ACTIONS[i];
		const pad = a.label.padEnd(ACTION_LABEL_WIDTH);
		const semantic = this.semanticOf(a.action);
		const hot = this.theme.fg("dim", ` ${a.hot}`);
		if (i !== this.selected) {
			return `   ${this.theme.fg("dim", `▐ ${pad} ▌`)}${hot}`;
		}
		const inner = ` ${this.theme.bold(pad)} `;
		let filled: string;
		const bgName = semantic === "error" ? "toolErrorBg" : semantic === "success" ? "toolSuccessBg" : undefined;
		const bg = bgName ? this.theme.bg?.(bgName, inner) : undefined;
		if (bg) {
			filled = bg;
		} else {
			filled = `\x1b[7m${inner}\x1b[27m`;
		}
		return `${this.theme.fg(semantic, "❯ ▐")}${filled}${this.theme.fg(semantic, "▌")}${hot}`;
	}

	render(width: number): string[] {
		const p = this.preview;
		if (this.splitTooWide === undefined) {
			// split only when every line fits the terminal — otherwise stacked unified
			this.splitTooWide = this.splitLines.some((l) => visibleWidth(l) > width);
		}
		if (this.effectiveView() === "split" && this.splitTooWide) this.offset = 0;
		const rows = this.bodyRows();
		const max = Math.max(0, this.lines.length - rows);
		this.offset = Math.min(this.offset, max);

		const stats = this.theme.fg("dim", ` +${p.added} -${p.removed} · ${p.toolName} · ${p.path}`);
		const header = [
			this.theme.bold(this.theme.fg("accent", "approve-diffs")) + stats,
			...p.warnings.map((w) => this.theme.fg("warning", ` ⚠ ${w}`)),
		];

		const window_ = this.lines.slice(this.offset, this.offset + rows).map((l) => truncateToWidth(l, width));
		const shown = `(${this.offset + 1}–${Math.min(this.lines.length, this.offset + rows)}/${this.lines.length})`;
		const scrolled = this.lines.length > rows ? ` ${shown}` : "";

		const actionLines = ACTIONS.map((_, i) => this.actionLine(i));

		const bottom =
			this.mode === "steer"
				? this.theme.fg("accent", ` steer > ${this.steerBuffer}█`) +
						this.theme.fg("dim", "  (enter send · esc cancel)")
					: this.theme.fg("dim", ` tab ${this.effectiveView() === "split" ? "unified" : "split"} · j/k scroll · PgUp/PgDn page${scrolled}`);

		const border = this.theme.fg("dim", "─".repeat(Math.max(0, width)));
		return [border, ...header, "", ...window_, "", ...actionLines, bottom, border].map((l) => truncateToWidth(l, width));
	}

	invalidate(): void {}
}

async function renderSections(preview: Preview, view: "split" | "unified"): Promise<string[]> {
	const render = view === "split" ? renderSplit : renderUnified;
	const out: string[] = [];
	for (const [i, section] of preview.sections.entries()) {
		if (!section.diff) {
			out.push(section.path + (section.note ? ` — ${section.note}` : ""));
			continue;
		}
		if (preview.sections.length > 1) out.push(section.path);
		const text = await render(section.diff, section.language as never);
		out.push(...text.split("\n"));
		// one empty row beneath each file's change for separation (not after the last)
		if (i < preview.sections.length - 1) out.push("");
	}
	return out;
}

export async function showApproval(
	ctx: {
		ui: {
			custom<T>(
				factory: (tui: TuiLike, theme: ThemeLike, kb: unknown, done: (value: T) => void) => Component,
				options?: unknown,
			): Promise<T>;
		};
	},
	preview: Preview,
): Promise<Decision> {
	resetPalette();
	const [splitLines, unifiedLines] = await Promise.all([
		renderSections(preview, "split"),
		renderSections(preview, "unified"),
	]);

	// width/balance-aware default, mirroring pi-diff's own wrapper
	const firstDiff = preview.sections.find((s) => s.diff)?.diff;
	const initialView: "split" | "unified" =
		firstDiff && shouldUseSplit?.(firstDiff, process.stdout.columns ?? 120) === false
			? "unified"
			: "split";

	return ctx.ui.custom<Decision>(
		(tui, theme, _kb, done) =>
			new ApprovalScreen({ tui, theme, preview, splitLines, unifiedLines, initialView, done }),
		// no overlay: pi docks the component into the editor slot at the bottom of the screen
	);
}
