// @effect-diagnostics nodeBuiltinImport:off
// Applied before the server runtime starts, including Electron's bundled Node.
import * as NodeNet from "node:net";

type SocketWithTypeOfService = {
  setTypeOfService?: (value: number) => unknown;
};

export function tolerateUnsupportedSocketTypeOfService(prototype: SocketWithTypeOfService) {
  const original = prototype.setTypeOfService;
  if (!original) return;

  prototype.setTypeOfService = function (value) {
    try {
      return original.call(this, value);
    } catch (error) {
      // Node 24.21's bundled Undici lets this optional QoS failure escape the
      // fetch promise and kill the backend on macOS. Keep the workaround narrow;
      // never suppress unrelated socket errors or uncaught exceptions.
      // Upstream: https://github.com/nodejs/undici/pull/5547
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "EINVAL" &&
        "syscall" in error &&
        error.syscall === "setTypeOfService"
      ) {
        return this;
      }
      throw error;
    }
  };
}

// oxlint-disable-next-line t3code/no-global-process-runtime -- Runtime compatibility must be installed before Effect starts.
if (process.platform === "darwin") {
  // The supported older Node type definitions predate this optional API.
  tolerateUnsupportedSocketTypeOfService(NodeNet.Socket.prototype as SocketWithTypeOfService);
}
