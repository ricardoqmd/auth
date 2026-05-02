# @ricardoqmd/auth-keycloak

> Keycloak adapter for `@ricardoqmd/auth-core`. Wraps `keycloak-js` to implement the `AuthProvider` contract.

## Install

```bash
npm install @ricardoqmd/auth-keycloak keycloak-js @ricardoqmd/auth-core
```

`keycloak-js` is a peer dependency — install it explicitly so you control its version.

## Status

🚧 **0.0.1 — Pre-release scaffold.** Public API not stable until 1.0.0.

## Compatibility

| Package version | keycloak-js   | Keycloak server |
| --------------- | ------------- | --------------- |
| 0.x             | >=26.0 <28.0  | >=26.0          |

**Note:** Since Keycloak 26.2, the `keycloak-js` adapter is released independently from the server and is backwards compatible with all actively supported Keycloak server versions.

## License

MIT © ricardoqmd
