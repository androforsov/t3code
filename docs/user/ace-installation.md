# ACE 0.1.11 beta — Apple Silicon

ACE (Agent Comms Expert) is an independent MIT-licensed T3 Code fork. This beta is intended for running agents locally on your Mac. A paired phone may connect to that host.

## Install

1. Download ACE-0.1.11-arm64.zip from the ACE GitHub release, expand it, and drag ACE.app into Applications.
2. This build is ad-hoc signed and NOT Apple-notarized. macOS may require opening approval or authentication. Follow [Apple’s opening instructions](https://support.apple.com/102445) if you choose to open it. Do not disable Gatekeeper or system security.
3. Install and authenticate a supported provider runtime using its official instructions (Codex CLI, Claude Code, etc.). ACE may detect an existing login on YOUR computer. Use your own subscription/account.
4. Add your project folder. Import existing histories only if desired. The download contains no author project database, saved server connection, pairing credential, or provider authentication file.

## What this beta verifies

- macOS minimum declared by the bundle:13.0; Apple Silicon only. Runtime testing performed on macOS27.
- Linked two-pane chats and ACE desktop styling.
- Startup skips Keychain when no saved desktop connections need decryption/migration. Two instrumented packaged builds with different signatures reached startup with zero calls to all six Electron safeStorage methods. Uninstrumented0.1.11 opened over the existing0.1.10 local-host profile without a Keychain prompt.
- Fresh APP-PROFILE startup was tested on the maintainer's Mac. A completely separate clean Mac/user-account onboarding test is still pending; installed provider tools can discover that Mac user's own existing accounts.
- Official T3 iOS pairing and reading chats on the same Wi-Fi was observed. Away-from-home access and mobile message continuation are not release-verified.

## Known limitations

- This is not a promise of zero password prompts. Provider sign-in, macOS first-open approval, a locked Keychain, and saved remote DESKTOP-client credentials are separate cases.
- When ACE is used to connect to another server and stores its credentials, Keychain approval may still be needed after a rebuild/update. Those credentials remain encrypted. The current beta does not include the experimental credential helper or any credential migration.
- Imported Codex histories may fail continuation if another Codex app retains an active writer. Reading imported history does not prove the original session can be resumed concurrently.
- Automatic updates are disabled. Install only deliberately published ACE releases manually. Do not replace ACE with an upstream T3 app update.
- Inherited Electron cookie-encryption fuse is off; this beta does not change that behavior. Saved remote connection credentials still use OS-backed encryption.

## Update and rollback

Finish active work and quit ACE before replacing the app. Keep ~/.harness and ~/Library/Application Support/Harness: those contain your own data and are not part of the download. Back up these folders and your current app before updating. Existing ACE data paths and incoming phone pairings are preserved by this release.

Source commit: b370479ae7b4f140cf356ea4d738f1c714c897ca. Preserve the included MIT LICENSE and third-party notices when redistributing.
