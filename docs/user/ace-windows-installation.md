# ACE for Windows — 0.1.12 beta.1

## [Download ACE for Windows — Intel/AMD 64-bit (.exe)](https://github.com/androforsov/t3code/releases/download/ace-v0.1.12-windows-beta.1/ACE-0.1.12-beta.1-x64.exe)

This is an early Windows beta of ACE (Agent Comms Expert), an independent T3 Code fork. Windows11 on an Intel/AMD64-bit PC is the intended desktop target. Windows ARM and Windows10 are not validated in this beta.

## Install

1. Download the EXE above from this repository’s release page.
2. Run the installer, then open ACE from the Start menu or desktop shortcut.
3. Install and authenticate your supported provider tools using their official instructions: [Codex CLI](https://developers.openai.com/codex/cli) or [Claude Code](https://code.claude.com/docs/en/setup). You can set these up before opening ACE. An existing login on your own computer may be detected automatically.
4. Start with an empty test project folder and a small request before using an important project. Use your own subscription/account; this download contains no maintainer accounts, projects or private server connections.

The installer is unsigned. Windows SmartScreen or an organization’s policy may warn about or block an unknown publisher. Do not disable security protections to install it. No Microsoft Store purchase is required.

## What was tested

Two GitHub-hosted Windows Server2025 runners performed build/package checks and fresh-runner installation checks:

- Installer built successfully with the ACE icon.
- 20 focused Windows tests passed, covering release privacy, split/drag behavior and WSL data isolation.
- Silent installation of the exact installer passed.
- The installed ACE main process reported ready, its backend served the web client with HTTP200, and its database initialized.
- The installed native terminal library successfully ran an echo command.
- Packaged privacy scan: 2,569 files, 2 ASAR archives, 0 findings. The bundled Linux WSL runtime also passed a separate extracted-content privacy scan.
- Downloaded installer checksum matched the build artifact.

**Not yet manually tested:** interactive Windows11 UI, real provider login/model turns, GPU/display behavior, an end-to-end WSL session, phone pairing to Windows, automatic updates or uninstall. Automated startup used a GPU-disabled headless CI configuration. This is not a claim of full consumer-PC testing.

## Accounts and data

Provider authentication belongs to your own Windows account or selected WSL distro. Install/login inside WSL when choosing that environment. ACE bundles a matching Linux server runtime; it does not include WSL or install a Linux distro for you.

Default ACE server data uses .harness beneath the relevant user home, including inside WSL, separate from upstream T3’s default .t3 data. Back up your app data before upgrading. Do not copy another user’s data directory or pairing link.

Automatic updates remain disabled. Future ACE updates will be deliberately published, tested releases. This Windows release does not replace or change the Mac beta.

Source:98b288d6f582cea42fc36abcd3b3bacd2f58de50.
[Build checks](https://github.com/androforsov/t3code/actions/runs/36628877109) · [Installed-app checks](https://github.com/androforsov/t3code/actions/runs/36631474363).

MIT license and third-party notices are included. ACE is not an official T3 Tools release.
