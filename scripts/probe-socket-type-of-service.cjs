// Fault injection runs only in a disposable test process, never the live app.
const NodeAssert = require("node:assert/strict");
const NodeChildProcess = require("node:child_process");
const NodeHttp = require("node:http");
const NodeNet = require("node:net");
const NodeURL = require("node:url");

async function probe() {
  const mode = process.argv[3];
  let rejectedNativeCalls = 0;
  if (mode !== "baseline") {
    // Preserve Node's real JS socket implementation, including its Windows
    // error handling. Only substitute the failing OS syscall's return value.
    process.binding("tcp_wrap").TCP.prototype.setTypeOfService = function () {
      rejectedNativeCalls++;
      return process.binding("uv").UV_EINVAL;
    };
  }
  if (mode === "fixed") {
    await import(NodeURL.pathToFileURL(process.argv[4]).href);
  }
  const server = NodeHttp.createServer((_request, response) => response.end("ACE_NETWORK_OK"));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    for (let i = 0; i < 10; i++) {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/`);
      NodeAssert.equal(await response.text(), "ACE_NETWORK_OK");
    }
    if (mode !== "baseline") NodeAssert.ok(rejectedNativeCalls > 0);
    console.log(
      JSON.stringify({
        platform: process.platform,
        node: process.versions.node,
        electron: process.versions.electron,
        undici: process.versions.undici,
        socketApi: typeof NodeNet.Socket.prototype.setTypeOfService,
        requests: 10,
        rejectedNativeCalls,
      }),
    );
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}

if (process.argv[2] === "--child") {
  probe().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
} else {
  const compatibilityModule = process.argv[2];
  const results = {};
  for (const mode of ["baseline", "native-error", ...(compatibilityModule ? ["fixed"] : [])]) {
    const child = NodeChildProcess.spawnSync(
      process.execPath,
      [__filename, "--child", mode, ...(compatibilityModule ? [compatibilityModule] : [])],
      { encoding: "utf8", timeout: 20000, windowsHide: true },
    );
    results[mode] = {
      exit: child.status,
      signal: child.signal,
      ...(child.stdout.trim() ? { result: JSON.parse(child.stdout) } : {}),
      ...(child.status !== 0 ? { stderr: child.stderr.slice(-2000) } : {}),
    };
    NodeAssert.ifError(child.error);
  }
  console.log(JSON.stringify(results, null, 2));
  NodeAssert.equal(results.baseline.exit, 0);
  if (process.platform === "win32") NodeAssert.equal(results["native-error"].exit, 0);
  if (compatibilityModule) NodeAssert.equal(results.fixed.exit, 0);
}
