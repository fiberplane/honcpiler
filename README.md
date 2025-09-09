# 🪿 HONCpiler

A TypeScript compiler service built as a Cloudflare Worker that provides real-time TypeScript compilation and
error checking for HONC applications and other TypeScript projects.

## Overview

HONCpiler is a cloud-based TypeScript compilation service designed to:

- **Compile TypeScript code** in a sandboxed Cloudflare Worker environment
- **Provide type checking** with full dependency resolution
- **Cache npm package types** for fast compilation
- **Support Hono framework** and Cloudflare Workers development
- **Stream type definitions** from npm packages on-demand

The service creates a virtual file system with TypeScript libraries and dependency types, allowing for accurate type checking without requiring local installations.

## Features

- 🚀 **Fast compilation** using Cloudflare Workers edge computing
- 📦 **Automatic dependency resolution** from npm packages
- 🎯 **TypeScript error reporting** with location information  
- 🔄 **Streaming type definitions** with intelligent caching
- 🛠️ **Hono framework support** with specialized type handling
- 🌐 **Edge deployment** for low-latency global access
- 📊 **Debug mode** for detailed compilation insights

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client Code   │───▶│    HONCpiler     │───▶│   KV Storage    │
│                 │    │   (CF Worker)    │    │ (Package Types) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │  TypeScript VFS  │
                       │ + Error Results  │
                       └──────────────────┘
```

## API

### RPC Method: `compileTypeScript`

```typescript
async compileTypeScript(
  files: InputFiles[],
  chatId: string,
  userId: string,
  debug?: boolean
): Promise<ErrorInfo[]>
```

**Parameters:**
- `files`: Array of TypeScript files to compile
- `chatId`: Identifier for the compilation session
- `userId`: User identifier for tracking
- `debug`: Optional debug mode flag

**Returns:** Array of compilation errors and warnings

### HTTP Endpoint (Testing)

```bash
POST /
Headers: X-Honcpiler-Auth: meow
Body: InputFiles[]
```

## Types

```typescript
type InputFiles = {
  path: string;      // File path (should start with "/")
  content: string;   // File content
};

type ErrorInfo = {
  message: string;           // Error message
  severity: "error" | "warning";  // Error severity
  location?: string;         // Optional location info
};
```

## Usage Examples

### Basic TypeScript Compilation

```typescript
const files = [
  {
    path: "/main.ts",
    content: `
      import { Hono } from "hono";
      
      const app = new Hono();
      
      app.get("/", (c) => {
        return c.text("Hello World!");
      });
      
      export default app;
    `
  },
  {
    path: "/package.json",
    content: JSON.stringify({
      dependencies: {
        "hono": "^4.0.0"
      }
    })
  }
];

const errors = await honcpiler.compileTypeScript(files, "chat123", "user456");
```

### With Debug Mode

```typescript
const errors = await honcpiler.compileTypeScript(
  files, 
  "chat123", 
  "user456", 
  true  // Enable debug logging
);
```

## Development

### Prerequisites

- Node.js 18+
- pnpm
- Cloudflare account with Workers and KV

### Setup

```bash
# Install dependencies
pnpm install

# Generate Cloudflare types
pnpm cf-typegen

# Start development server
pnpm dev
```

### Testing

```bash
# Run unit tests
pnpm test

# Type checking
pnpm typecheck
```

### Building & Deployment

```bash
# Build for production
pnpm build

# Deploy to Cloudflare Workers
pnpm deploy

# Deploy to preview environment
pnpm deploy:preview
```

### Seeding Package Types

The service relies on cached npm package types stored in Cloudflare KV:

```bash
# Seed KV with package types
pnpm kv:seed:prod

# Download specific package types
pnpm download-types
```

## Configuration

### Environment Variables

Configure in `wrangler.toml`:

```toml
[env.production.vars]
CLOUDFLARE_ENV = "production"

[env.preview.vars]  
CLOUDFLARE_ENV = "preview"
```

### KV Namespaces

- **KV**: Stores npm package type definitions
- **COMPILE_DB**: D1 database for compilation results

### Compiler Options

The service uses these TypeScript compiler options:

```typescript
{
  target: "ESNext",
  module: "ESNext", 
  moduleResolution: "Bundler",
  lib: ["ESNext"],
  strict: true,
  types: ["@cloudflare/workers-types"],
  skipLibCheck: true,
  noEmit: true
}
```

## Package Type Caching

HONCpiler automatically fetches and caches type definitions for npm packages:

1. **Dependency Detection**: Parses `package.json` files to identify dependencies
2. **Type Resolution**: Fetches `.d.ts` files from npm packages
3. **KV Storage**: Caches types in Cloudflare KV for fast access
4. **Virtual FS**: Creates in-memory filesystem with all type definitions

## Supported Dependencies

- **Hono**: Full framework support with routing and middleware types
- **@cloudflare/workers-types**: Cloudflare Workers runtime types  
- **drizzle-orm**: Database ORM type definitions
- **@fiberplane/hono**: Fiberplane Hono extensions
- Most npm packages with TypeScript definitions

## Scripts

- `pnpm dev` - Start development server on port 8437
- `pnpm build` - Build for production
- `pnpm test` - Run test suite
- `pnpm format` - Format code with Biome
- `pnpm typecheck` - Type check all files
- `pnpm deploy` - Deploy to Cloudflare Workers

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality  
5. Run `pnpm format` and `pnpm typecheck`
6. Submit a pull request

## License

 MIT
