import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { loadConfig, saveConfig } from "./config.js";
import { buildPreview } from "./preview.js";
import { applyPiTheme, showApproval } from "./ui.js";
import diffRendererExtension from "./vendor/pi-diff/index.js";

const GATED_TOOLS = new Set(["write", "edit", "hashline_edit", "apply_patch"]);

export default async function piApproveDiffs(pi: ExtensionAPI) {
	let sessionYolo = false;
	const config = loadConfig();

	// Approved-change highlighting (green result boxes) — vendored pi-diff machinery.
	if (config.results) {
		await diffRendererExtension(pi);
	}

	pi.registerCommand("approve-diff", {
		description: "Toggle the write/edit approval gate (on|off|toggle|yolo|results on|off|status)",
		handler: (args, ctx) => {
			const [verb, value] = (args ?? "").trim().toLowerCase().split(/\s+/);
			if (verb === "results") {
				if (value === "on" || value === "off") {
					config.results = value === "on";
					saveConfig(config);
					ctx.ui.notify(`approve-diffs: result highlighting ${value} — /reload to apply`, "info");
				} else {
					ctx.ui.notify(`approve-diffs: result highlighting ${config.results ? "ON" : "OFF"} (usage: /approve-diff results on|off)`, "info");
				}
				return;
			}
			if (verb === "on") {
				config.enabled = true;
				saveConfig(config);
				ctx.ui.notify("approve-diffs: ON", "info");
			} else if (verb === "off") {
				config.enabled = false;
				saveConfig(config);
				ctx.ui.notify("approve-diffs: OFF", "info");
			} else if (verb === "toggle") {
				config.enabled = !config.enabled;
				saveConfig(config);
				ctx.ui.notify(`approve-diffs: ${config.enabled ? "ON" : "OFF"}`, "info");
			} else if (verb === "yolo") {
				sessionYolo = true;
				ctx.ui.notify("approve-diffs: yolo — not asking again this session", "info");
			} else {
				ctx.ui.notify(
					`approve-diffs: ${config.enabled ? "ON" : "OFF"} · session yolo: ${sessionYolo ? "ON" : "OFF"} · results: ${config.results ? "ON" : "OFF"}`,
					"info",
				);
			}
		},
	});

	pi.on("tool_call", async (event, ctx: ExtensionContext) => {
		if (!GATED_TOOLS.has(event.toolName)) return;
		if (!config.enabled || sessionYolo || !ctx.hasUI) return;

		const preview = await buildPreview(event.toolName, event.input as never);
		if (!preview) return;

		applyPiTheme((ctx.ui as { theme?: unknown }).theme);
		const decision = await showApproval(ctx as never, preview);
		if (decision.action === "approve") return;
		if (decision.action === "yolo") {
			sessionYolo = true;
			return;
		}

		let reason = `User declined changes to ${preview.path}.`;
		if (decision.action === "steer" && decision.message) {
			reason = `User declined changes to ${preview.path}. Follow this guidance instead: ${decision.message}`;
		}
		return { block: true, reason };
	});
}
