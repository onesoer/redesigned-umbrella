// Skillshare-managed binding: forward pi prompts to `codegraph prompt-hook`
// (pi `before_agent_start` ≈ Claude `UserPromptSubmit`). Fire-and-forget —
// failures never affect the pi agent loop.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const bin = join(homedir(), ".local", "bin", "codegraph");

export default function (pi: any) {
  if (!existsSync(bin)) return;
  pi.on("before_agent_start", (event: any, ctx: any) => {
    if (ctx?.hasUI === false) return; // subagent / print mode: no-op
    try {
      const child = spawn(bin, ["prompt-hook"], {
        stdio: ["pipe", "ignore", "ignore"],
        detached: true,
      });
      child.on("error", () => {});
      child.stdin?.on("error", () => {});
      child.stdin?.end(
        JSON.stringify({
          prompt: event?.prompt ?? "",
          cwd: process.cwd(),
          session_id: event?.id ?? "",
        }),
      );
      child.unref();
    } catch {
      // swallow — never affect the agent loop
    }
  });
}
