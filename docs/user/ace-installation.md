# Install ACE

ACE (Agent Comms Expert) is an independent T3 Code fork. Get ACE only from [the ACE fork's GitHub Releases](https://github.com/androforsov/t3code/releases). There is no public ACE installer yet; the instructions below describe the planned Apple Silicon release.

When a release is available, download its Apple Silicon ZIP, expand it, and drag `ACE.app` to Applications. Read that release's requirements and limitations before opening it. If macOS reports that Apple cannot verify the developer, follow [Apple's instructions for opening an app from an unidentified developer](https://support.apple.com/102445). Do not disable Gatekeeper or your system security settings.

ACE uses provider accounts on your own computer. If a supported provider runtime is already authenticated, ACE may recognize it; otherwise sign in through that provider's setup flow. Downloading ACE does not grant access to the author's accounts, chats, computer or server. Remote access requires separately pairing a server you are authorized to use.

Keychain access is separate from provider login. Current development builds may request macOS Keychain approval, including after an update. Approval behavior across releases is still being tested. Never enter your macOS password into ACE chat, GitHub, or a shared message.

To update a manually installed copy, finish or stop running work, quit ACE, and replace the app in Applications with a tested ACE release. Your runtime data is stored separately from the app. Keep your data folders; do not replace them with anyone else's files. ACE currently retains its original fork's `~/.harness` data directory. Automatic updates are not yet enabled.

ACE and official T3 Code can coexist. Do not replace ACE with a T3 installer when you want to keep ACE's custom features. New upstream improvements are incorporated into ACE through separately tested ACE releases.
