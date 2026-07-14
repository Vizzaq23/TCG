/**
 * Re-spawn Node with --use-system-ca via NODE_OPTIONS so loaders like tsx
 * inherit OS trust store (needed on Windows with HTTPS inspection).
 */
import { spawn } from "node:child_process";

const args = process.argv.slice(2);
if (!args.length) {
  console.error("Usage: node scripts/node-system-ca.mjs <node-args...>");
  process.exit(1);
}

const env = {
  ...process.env,
  NODE_OPTIONS: [process.env.NODE_OPTIONS, "--use-system-ca"].filter(Boolean).join(" "),
};

const child = spawn(process.execPath, args, {
  stdio: "inherit",
  env,
  shell: false,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
