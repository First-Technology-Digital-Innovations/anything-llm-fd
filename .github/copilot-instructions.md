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

## Azure Deployment & Infrastructure

### Azure Container Instance Deployment

**Production Environment:** https://bcpai.southafricanorth.azurecontainer.io

The application is deployed to Azure using Bicep templates in the `infra/` directory:

- **main.bicep** - Primary deployment template with parameter definitions
- **aci.bicep** - Container Instance configuration with environment variables
- **postgres.bicep** - PostgreSQL Flexible Server for vector storage
- **storage-account.bicep** - Azure Storage for persistent data
- **parameters.json** - Environment-specific configuration values

### Azure AD Authentication Integration

**Status:** ✅ **COMPLETED** - Azure AD SSO fully configured for production

Azure AD authentication is configured for enterprise SSO with the following setup:

**Required Environment Variables:**

```bash
AZURE_AD_CLIENT_ID=9b09e4c5-806b-41dd-8f70-310d9311dcf3
AZURE_AD_TENANT_ID=03c6495c-8727-480c-b411-808e8a551337
AZURE_AD_CLIENT_SECRET=Wwk8Q~vw2K8fJXrB8sw.bqkGI6ytbYs7jXChMdsK
AZURE_AD_REDIRECT_URI=https://bcpai.southafricanorth.azurecontainer.io/api/auth/azure/callback
AZURE_AD_ADMIN_EMAIL=nathang@yamahadistributors.onmicrosoft.com
FRONTEND_URL=https://bcpai.southafricanorth.azurecontainer.io
```

**Authentication Flow:**

1. `/api/auth/azure` - Initiates Azure AD OAuth flow
2. `/api/auth/azure/callback` - Handles OAuth callback and token exchange
3. User profile creation/update based on Azure AD claims
4. JWT token issuance for subsequent API authentication

**Azure AD App Registration Requirements:**

- Redirect URI must include production callback URL
- Required Microsoft Graph permissions for user profile access
- Supports both development (localhost) and production endpoints

### Deployment Commands

```bash
cd infra/
.\deploy.ps1  # Builds image, pushes to ACR, deploys via Bicep
```

**Deployment Process:**

1. Builds Docker image from monorepo
2. Pushes to Azure Container Registry (rgbcpaiacr.azurecr.io)
3. Deploys infrastructure via Bicep templates
4. Configures container with all environment variables
5. Sets up PostgreSQL vector database and Azure Storage persistence

### Infrastructure Components

- **Container Registry:** rgbcpaiacr.azurecr.io
- **Resource Group:** rg-bcp_ai
- **Location:** South Africa North
- **Vector DB:** PostgreSQL with pgvector extension
- **Storage:** Azure File Shares for persistence
- **Networking:** Public IP with custom domain support
