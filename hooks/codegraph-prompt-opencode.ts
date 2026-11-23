// Skillshare-managed binding: forward OpenCode user messages to `codegraph prompt-hook`
// (OpenCode `chat.message` ≈ Claude `UserPromptSubmit`). Fire-and-forget —
// failures never affect the agent loop.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const bin = join(homedir(), ".local", "bin", "codegraph");

export default async function () {
  if (!existsSync(bin)) return {};
  const fire = (text: string, sessionID?: string) => {
    try {
      const child = spawn(bin, ["prompt-hook"], {
        stdio: ["pipe", "ignore", "ignore"],
        detached: true,
      });
      child.on("error", () => {});
      child.stdin?.on("error", () => {});
      child.stdin?.end(
        JSON.stringify({
          prompt: text ?? "",
          cwd: process.cwd(),
          session_id: sessionID ?? "",
        }),
      );
      child.unref();
    } catch {
      // swallow — never affect the agent loop
    }
  };
  return {
    "chat.message": async (_input: any, output: any) => {
      const parts = output?.parts ?? [];
      const text = parts
        .filter((p: any) => p?.type === "text")
        .map((p: any) => p.text)
        .join("\n");
      fire(text, output?.message?.id ?? _input?.sessionID);
    },
  };
}
