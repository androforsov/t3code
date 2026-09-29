# ACE release privacy

Publish only a deliberately selected, tested version. A source push is not a release.

Desktop artifact builds reject nonempty `VITE_HTTP_URL`, `VITE_WS_URL`, and frontend token/secret settings. The build then audits the packaged ASAR and loose resources before exporting artifacts. The audit rejects saved profiles, provider credential files, connection catalogs, server runtime state, concrete pairing URLs, complete private keys, and links outside the package. Findings report locations/categories without credential values.

To audit an existing Mac app or an extracted release ZIP:

```sh
node scripts/audit-desktop-privacy.mjs /path/to/ACE.app
```

A passing pattern scan is a release gate, not a proof against every possible secret encoding. Before publication, also review the release contents and verify first run in a clean user profile: no preconfigured private server, no author credentials, and provider authentication belongs to the recipient. Never package the developer's application-data directories or distribute a personal server pairing link. Account/connection data must be created at runtime on the recipient's machine.

Keep normal connection and pairing functionality available: users may explicitly connect their own remote machines. Public update-feed and relay-service addresses are not personal server credentials. The signing private key must never be included in an app, release asset, or repository.
