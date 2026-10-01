import { describe, expect, it } from "vite-plus/test";
import { tolerateUnsupportedSocketTypeOfService } from "./socketTypeOfService.ts";

describe("socket type-of-service compatibility", () => {
  it("preserves the socket receiver, requested priority and return value", () => {
    const socket = {
      priority: -1,
      setTypeOfService(value: number) {
        this.priority = value;
        return this;
      },
    };
    tolerateUnsupportedSocketTypeOfService(socket);
    expect(socket.setTypeOfService(32)).toBe(socket);
    expect(socket.priority).toBe(32);
  });

  it("lets requests continue when macOS rejects optional QoS marking", () => {
    const socket = {
      setTypeOfService() {
        throw Object.assign(new Error("setTypeOfService EINVAL"), {
          code: "EINVAL",
          syscall: "setTypeOfService",
        });
      },
    };
    tolerateUnsupportedSocketTypeOfService(socket);
    expect(socket.setTypeOfService()).toBe(socket);
  });

  it.each([
    { code: "ECONNRESET", syscall: "setTypeOfService" },
    { code: "EINVAL", syscall: "connect" },
    {},
  ])("preserves unrelated errors: %j", (details) => {
    const error = Object.assign(new Error("socket failure"), details);
    const socket = {
      setTypeOfService() {
        throw error;
      },
    };
    tolerateUnsupportedSocketTypeOfService(socket);
    expect(() => socket.setTypeOfService()).toThrow(error);
  });

  it("supports runtimes without the optional API", () => {
    const socket = {};
    tolerateUnsupportedSocketTypeOfService(socket);
    expect(socket).toEqual({});
  });
});
