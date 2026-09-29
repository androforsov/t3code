# ACE releases

Publish only a deliberately selected, tested version. A source push is not a release.

The inherited T3 scheduled release workflow is gated to the upstream repository. Do not remove that gate to publish ACE. Use an explicitly selected ACE tag and a draft GitHub Release, review the exact assets, and publish only after the release checks pass. Keep the desktop updater disabled until the ACE update mechanism has been tested between two released versions. Never point ACE's updater at upstream T3 binaries; upstream source changes must first be merged and tested in ACE.

## Current release limits

There is no public ACE installer release yet. Local packages target Apple Silicon Macs. They are not Apple-notarized, and the normal macOS downloaded-app approval can apply.

Keychain approval across builds is unresolved. A September 29, 2026 synthetic test on macOS 27 found that two binaries signed by the same self-signed certificate had identical designated requirements, but the changed binary could not read the first binary's synthetic credential without authorization. Restoring the original binary restored access. The item's partition policy included a per-binary code hash. This agrees with [Apple's Security implementation](https://github.com/apple-oss-distributions/Security/blob/main/securityd/src/clientid.cpp), which falls back to code-hash partitions for self-signed code. Do not describe persistent self-signing alone as a verified fix, remove Keychain protection, or promise that a download/update never requires macOS consent.

Preserve existing encrypted connections and browser cookies when changing credentials or packaging identity. The installed fork's inherited `t3code` encryption namespace cannot be renamed safely without a tested migration.

## Required checks

1. Build the intended version from a reviewed commit. Run focused tests and package checks for changes in that release. Preserve the root MIT license and the generated third-party license notices in the binary.
2. Run the packaged privacy audit below. Audit the actual unpacked download too, not only the developer's build directory.
3. Verify first-run onboarding on a clean Mac user account or a clean Mac: no author project list, no preconfigured personal server, no author provider identity, and normal login with the recipient's own account. A fresh application folder in the author's account is insufficient to prove provider isolation because local provider authentication may still be discovered.
4. Test relaunch and an upgrade on that test installation; record any Gatekeeper/Keychain prompts honestly. Existing installations must retain chats, remote pairing and settings.
5. Prepare a release ZIP containing only the tested app, alongside installation notes, checksums and the exact source commit/tag. Do not upload staging folders, build logs, signing stores or developer profiles.
6. Review the draft release and publish deliberately. Download its exact assets again and check the checksum and package audit. Do not enable automatic installation until its signature/upgrade behavior has been verified.

See [ACE installation](../user/ace-installation.md) for the recipient-facing instructions.

## Privacy gate

Desktop artifact builds reject nonempty `VITE_HTTP_URL`, `VITE_WS_URL`, and frontend token/secret settings. The build then audits the packaged ASAR and loose resources before exporting artifacts. The audit rejects saved profiles, provider credential files, connection catalogs, server runtime state, concrete pairing URLs, complete private keys, and links outside the package. Findings report locations/categories without credential values.

To audit an existing Mac app or an extracted release ZIP:

```sh
node scripts/audit-desktop-privacy.mjs /path/to/ACE.app
```

A passing pattern scan is a release gate, not a proof against every possible secret encoding. Before publication, also review the release contents and verify first run in a clean user profile: no preconfigured private server, no author credentials, and provider authentication belongs to the recipient. Never package the developer's application-data directories or distribute a personal server pairing link. Account/connection data must be created at runtime on the recipient's machine.

Keep normal connection and pairing functionality available: users may explicitly connect their own remote machines. Public update-feed and relay-service addresses are not personal server credentials. The signing private key must never be included in an app, release asset, or repository.
