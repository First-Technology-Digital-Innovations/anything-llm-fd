# AnythingLLM Copilot Development Guide

## Architecture Overview

AnythingLLM is a monorepo with 3 core services that must run concurrently:

- **Frontend** (`frontend/`) - ViteJS React app for UI management
- **Server** (`server/`) - Express API handling LLM interactions & vector DB operations
- **Collector** (`collector/`) - Document processing & parsing service

### Key Data Flow

1. Documents uploaded via frontend → collector processes → JSON stored in `server/storage/documents/`
2. Server embedds documents → vectors stored in configured vector DB (LanceDB default)
3. Chat queries → server retrieves relevant vectors → sends context + query to LLM → streams response

### Core Concepts

- **Workspaces**: Document containers that isolate context (like threads but with document scoping)
- **Document**: Processed content with `pageContent` and metadata stored as JSON
- **Vector Cache**: Embedded document chunks stored in vector database for semantic search

## Development Workflow

### Essential Setup Commands

```bash
# Initial setup - MUST configure .env files before proceeding
pnpm setup

# Development (run in separate terminals)
pnpm dev:server    # Port 3001
pnpm dev:frontend  # Port 5173
pnpm dev:collector # Port 8888

# All services in one command
pnpm dev:all
```

### Critical Environment Setup

- `server/.env.development` MUST be configured first - server won't start without JWT_SECRET, SIG_KEY, SIG_SALT
- Default vector DB is LanceDB (no additional setup required)
- Most LLM providers optional for development, but configure one to test chat functionality

## Project-Specific Patterns

### Environment Configuration Architecture

- Multi-provider system: LLMs, embedders, vector DBs, TTS/STT all configurable via env vars
- Environment template pattern: `.env.example` files copied to working `.env` files
- Provider selection via `LLM_PROVIDER`, `EMBEDDING_ENGINE`, `VECTOR_DB` env vars
- Each provider has distinct env var namespace (e.g., `OPENAI_*`, `ANTHROPIC_*`)

### Model Architecture Patterns

```javascript
// Standard model pattern in server/models/
const ModelName = {
  writable: [...], // Fields that can be updated
  create: async (data) => {...},
  update: async (id, data) => {...},
  // Custom business logic methods
};
```

### API Endpoint Structure

- Endpoints in `server/endpoints/` follow RESTful conventions
- Authentication via JWT tokens in request headers
- Request validation using `reqBody()` helper
- Consistent error response format throughout

### Document Processing Flow

1. Files uploaded to collector via multipart/form-data
2. Collector converts to standardized JSON with `pageContent` key
3. JSON cached in `server/storage/documents/[namespace]/`
4. Server processes JSON → chunks → embeddings → vector storage
5. Special `published` metadata key reserved for timestamps

### Vector Database Integration

- Abstracted via `getVectorDbClass()` helper in `server/utils/helpers`
- All vector DBs implement common interface for add/query/delete operations
- Supports 9+ vector databases with runtime switching via configuration

## Code Style & Conventions

### Linting & Formatting

- ESLint config supports both Node.js (server/collector) and React (frontend)
- Prettier for consistent formatting across all files
- Flow types used in some areas (hermesParser in eslint config)
- Run `pnpm lint` to format all packages

### File Organization

- Monorepo structure: each service has own package.json and dependencies
- Frontend: React components in `src/components/` with feature-based organization
- Server: Models in `models/`, endpoints in `endpoints/`, utilities in `utils/`
- Collector: Processing logic in `processSingleFile/`, `processLink/`, `utils/`

### Database & State Management

- Prisma ORM for SQLite database (server)
- Database migrations via `pnpm prisma:migrate`
- No global state management library - React state and API calls

## Testing & Debugging

### Development Tools

- HTTP request logging enabled with `ENABLE_HTTP_LOGGER=true` in development
- Swagger API docs at `/api/docs` endpoint (disable in production)
- Frontend dev server with hot reload on `localhost:3000`
- API server accessible at `localhost:3001`

### Common Debugging Patterns

- Check `.env.development` configuration first for startup issues
- Verify all three services running for full functionality
- Document processing issues often related to collector service connectivity
- Vector search problems typically indicate embedding configuration issues

## Integration Points

### Service Communication

- Frontend → Server: REST API calls with JWT authentication
- Frontend → Collector: Direct file uploads for document processing
- Server ↔ Vector DB: Abstracted through provider classes
- Server ↔ LLM APIs: Provider-specific implementations with common interface

### External Dependencies

- Vector databases (LanceDB default, 8 other options supported)
- LLM providers (OpenAI, Anthropic, local models, 20+ total)
- Embedding services (native transformer.js default, multiple providers)
- TTS/STT services (browser native default, cloud options available)

## Security Considerations

- Multi-user support in Docker version only
- Authentication via JWT with configurable expiry
- Password complexity enforcement configurable via env vars
- File upload size limits (3GB default)
- HTTPS support with certificate configuration
- Telemetry can be disabled via `DISABLE_TELEMETRY=true`
