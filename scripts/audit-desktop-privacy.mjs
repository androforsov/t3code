import * as NodeFSP from "node:fs/promises";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";
import { listPackage, extractFile, statFile } from "@electron/asar";

// This gate never logs content or credentials, only paths and finding categories.
const privatePath =
  /(^|\/)(?:\.codex|\.claude|\.harness|\.t3|\.ace-signing|userdata|\.env(?:\.[^/]*)?|auth\.json|\.credentials\.json|state\.sqlite(?:-[^/]*)?|server-runtime\.json|client-settings\.json|desktop-settings\.json|saved-environments\.json|connection-catalog\.json|[^/]+\.(?:keychain(?:-db)?|p12|pfx)|keychain-password|environment-id|Local Storage|Session Storage|Cookies|Local State)(?:\/|$)/i;
const textFile = /\.(?:[cm]?js|json|html|css|txt|md|ya?ml|toml|plist|pem|key)$/i;

export function inspectReleaseEntry(name, bytes) {
  const findings = [];
  if (privatePath.test(name.replaceAll("\\", "/"))) findings.push("private runtime/profile file");
  if (!bytes || !textFile.test(name)) return findings;
  const text = bytes.toString("utf8");
  if (
    /-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----[\r\n]+[A-Za-z0-9+/=\r\n]{64,}-----END (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/.test(
      text,
    )
  ) {
    findings.push("private signing/SSH key");
  }
  // Concrete pairing URLs only: runtime URL-building code is expected in the app.
  if (
    /https?:\/\/[^\s"'`<>\\]+[?#&](?:token|pairingToken|bootstrapToken)=[A-Za-z0-9_~.%+-]{16,}/i.test(
      text,
    )
  ) {
    findings.push("embedded pairing URL");
  }
  if (
    /"(?:encryptedBearerToken|encryptedCatalog|bootstrapToken|pairingToken)"\s*:\s*"[A-Za-z0-9_+/=.-]{16,}"/.test(
      text,
    )
  ) {
    findings.push("embedded saved connection/credential");
  }
  return findings;
}

export async function auditDesktopPrivacy(root) {
  const findings = [];
  let files = 0;
  let archives = 0;
  async function inspect(name, bytes) {
    files++;
    for (const reason of inspectReleaseEntry(name, bytes)) findings.push({ path: name, reason });
  }
  async function walk(directory) {
    for (const name of await NodeFSP.readdir(directory)) {
      const full = NodePath.join(directory, name);
      const relative = NodePath.relative(root, full).replaceAll("\\", "/");
      const info = await NodeFSP.lstat(full);
      // Framework symlinks alias files already visited in Versions/A.
      if (info.isSymbolicLink()) {
        const target = NodePath.resolve(directory, await NodeFSP.readlink(full));
        const resolved = NodePath.relative(root, target);
        if (resolved.startsWith("..") || NodePath.isAbsolute(resolved)) {
          findings.push({ path: relative, reason: "symlink outside packaged app" });
        }
        continue;
      }
      if (info.isDirectory()) {
        if (privatePath.test(relative))
          findings.push({ path: relative, reason: "private runtime/profile directory" });
        await walk(full);
      } else if (name.endsWith(".asar")) {
        archives++;
        for (const entry of listPackage(full)) {
          const member = entry.replace(/^\//, "");
          const meta = statFile(full, member, false);
          if (meta.files || meta.link) continue;
          await inspect(
            `${relative}!/${member}`,
            textFile.test(member) ? extractFile(full, member) : undefined,
          );
        }
      } else {
        await inspect(relative, textFile.test(name) ? await NodeFSP.readFile(full) : undefined);
      }
    }
  }
  await walk(root);
  if (!archives)
    throw new Error(
      "Privacy audit found no packaged ASAR; refusing to approve an uninspected release.",
    );
  return { files, archives, findings };
}

if (
  process.argv[1] &&
  import.meta.url === NodeURL.pathToFileURL(NodePath.resolve(process.argv[1])).href
) {
  if (!process.argv[2])
    throw new Error(
      "Usage: node scripts/audit-desktop-privacy.mjs <packaged-app-or-dist-directory>",
    );
  const result = await auditDesktopPrivacy(NodePath.resolve(process.argv[2]));
  console.log(JSON.stringify(result, null, 2));
  if (result.findings.length) process.exitCode = 1;
}
