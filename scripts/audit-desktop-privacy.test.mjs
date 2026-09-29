import { describe, it, expect } from "vitest";
import * as NodeFSP from "node:fs/promises";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import { createPackage } from "@electron/asar";
import { auditDesktopPrivacy, inspectReleaseEntry } from "./audit-desktop-privacy.mjs";

describe("desktop release privacy", () => {
  it("rejects private profiles and saved connection files", () => {
    for (const name of [
      ".codex/auth.json",
      ".claude/.credentials.json",
      "userdata/state.sqlite",
      "Resources/connection-catalog.json",
      "Resources/.env.local",
      "Resources/.ace-signing/identity.json",
      "Resources/signing-identity.p12",
      "Resources/identity.pfx",
      "Resources/signing.keychain-db",
      "Resources/keychain-password",
    ]) {
      expect(inspectReleaseEntry(name).length).toBeGreaterThan(0);
    }
  });
  it("rejects concrete pairing URLs and encrypted connection payloads without returning their values", () => {
    const secret = "synthetic-pairing-secret-12345";
    const findings = inspectReleaseEntry(
      "client.js",
      Buffer.from(`const url = "https://example.invalid/#token=${secret}"`),
    );
    expect(findings).toEqual(["embedded pairing URL"]);
    expect(JSON.stringify(findings)).not.toContain(secret);
    expect(
      inspectReleaseEntry(
        "seed.json",
        Buffer.from('{"encryptedBearerToken":"synthetic-connection-token-12345"}'),
      ),
    ).toEqual(["embedded saved connection/credential"]);
  });
  it("rejects complete private keys but permits parser labels", () => {
    const pem = "-----BEGIN PRIVATE KEY-----\n" + "A".repeat(80) + "\n-----END PRIVATE KEY-----";
    expect(inspectReleaseEntry("secret.pem", Buffer.from(pem))).toEqual([
      "private signing/SSH key",
    ]);
    expect(
      inspectReleaseEntry(
        "parser.js",
        Buffer.from('const marker = "-----BEGIN PRIVATE KEY-----";'),
      ),
    ).toEqual([]);
  });
  it("permits normal runtime code and public update URLs", () => {
    expect(
      inspectReleaseEntry(
        "client.js",
        Buffer.from(
          'url.hash = new URLSearchParams({token}); const feed = "https://github.com/example/ace/releases";',
        ),
      ),
    ).toEqual([]);
  });
  it("inspects the packaged ASAR rather than just the source directory", async () => {
    const root = await NodeFSP.mkdtemp(NodePath.join(NodeOS.tmpdir(), "ace-privacy-test-"));
    try {
      const source = NodePath.join(root, "source");
      const output = NodePath.join(root, "output");
      await NodeFSP.mkdir(source);
      await NodeFSP.mkdir(output);
      await NodeFSP.writeFile(
        NodePath.join(source, "connection-catalog.json"),
        '{"encryptedCatalog":"synthetic-encrypted-secret-12345"}',
      );
      await createPackage(source, NodePath.join(output, "app.asar"));
      const result = await auditDesktopPrivacy(output);
      expect(result.archives).toBe(1);
      expect(result.findings.map((f) => f.reason)).toEqual([
        "private runtime/profile file",
        "embedded saved connection/credential",
      ]);
    } finally {
      await NodeFSP.rm(root, { recursive: true, force: true });
    }
  });
});
