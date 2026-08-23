# @samaljailani/homegate-types

Shared TypeScript types and a typed API client for HomeGate, generated
from the server's OpenAPI schema.

## Contents

- `paths`, `components`, `operations` — types generated from the
  server's OpenAPI document via [`openapi-typescript`](https://openapi-ts.dev/).
- `createApiClient` — a thin [`openapi-fetch`](https://openapi-ts.dev/openapi-fetch/)
  wrapper bound to the generated `paths` type, giving you a fully typed
  HTTP client for the HomeGate API.

## Installation

```sh
npm install @samaljailani/homegate-types
```

This package is published to GitHub Packages. Configure your project's
`.npmrc` to resolve the `@samaljailani` scope from
`https://npm.pkg.github.com/`.

## Usage

```ts
import { createApiClient } from '@samaljailani/homegate-types'

const client = createApiClient({ baseUrl: 'https://api.example.com' })

const { data, error } = await client.GET('/some/path')
```

## Development

This package is generated from the server's OpenAPI schema and should
not be hand-edited outside of `src/client.ts` and `src/index.ts`.

```sh
npm run build   # regenerates src/schema.ts from ../../server/openapi.json, then compiles
```
