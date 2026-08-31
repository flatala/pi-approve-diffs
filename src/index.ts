import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { loadConfig, saveConfig } from "./config.js";
import { buildPreview } from "./preview.js";
import { applyPiTheme, showApproval } from "./ui.js";

const GATED_TOOLS = new Set(["write", "edit", "hashline_edit"]);

export default function piApproveDiffs(pi: ExtensionAPI) {
	let sessionYolo = false;
	let config = loadConfig();

	pi.registerCommand("approve-diff", {
		description: "Toggle the write/edit approval gate (on|off|toggle|yolo|status)",
		handler: (args, ctx) => {
			const action = (args ?? "").trim().toLowerCase();
			if (action === "on") {
				config.enabled = true;
				saveConfig(config);
				ctx.ui.notify("approve-diffs: ON", "info");
			} else if (action === "off") {
				config.enabled = false;
				saveConfig(config);
				ctx.ui.notify("approve-diffs: OFF", "info");
			} else if (action === "toggle") {
				config.enabled = !config.enabled;
				saveConfig(config);
				ctx.ui.notify(`approve-diffs: ${config.enabled ? "ON" : "OFF"}`, "info");
			} else if (action === "yolo") {
				sessionYolo = true;
				ctx.ui.notify("approve-diffs: yolo — not asking again this session", "info");
			} else {
				ctx.ui.notify(
					`approve-diffs: ${config.enabled ? "ON" : "OFF"} · session yolo: ${sessionYolo ? "ON" : "OFF"}`,
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
