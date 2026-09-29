// Runs only in the packaged Electron Node runtime on the disposable CI host.
const NodeModule = require("node:module");
const NodePath = require("node:path");
const root = process.argv[2];
if (process.platform !== "win32" || !root) process.exit(64);
const packagedRequire = NodeModule.createRequire(
  NodePath.join(root, "resources", "server.asar", "package.json"),
);
const pty = packagedRequire("node-pty");
const child = pty.spawn(process.env.ComSpec || "cmd.exe", ["/d", "/c", "echo ACE_TERMINAL_OK"], {
  name: "xterm-color",
  cols: 80,
  rows: 24,
  cwd: process.env.TEMP,
  env: process.env,
});
let received = false;
let output = "";
const deadline = setTimeout(() => {
  child.kill();
  process.exit(1);
}, 15000);
child.onData((data) => {
  output = (output + data).slice(-4096);
  if (output.includes("ACE_TERMINAL_OK")) received = true;
});
child.onExit(({ exitCode }) => {
  clearTimeout(deadline);
  if (!received || exitCode !== 0) {
    console.error("Packaged terminal probe failed.");
    process.exit(1);
  }
  process.stdout.write(JSON.stringify({ packagedTerminal: "passed", modelCalls: 0 }) + "\n", () =>
    process.exit(0),
  );
});
