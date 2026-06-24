# ProPrev

ProPrev is a dark-mode AI chat app powered by the "Prevy" assistant — a student study companion that builds checklists and assignment plans to fight procrastination.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/proprev run dev` — run the React frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required env: `OPENAI_API_KEY` — OpenAI API key for Responses API + file search

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + OpenAI Responses API (`client.responses.create()`)
- Frontend: React + Vite, Tailwind CSS, shadcn/ui, framer-motion
- AI: OpenAI `gpt-4o-mini` with file_search tool over an existing vector store
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/api-server/` — Express backend with chat SSE, config, and file upload routes
- `artifacts/api-server/config.json` — assistant name, instructions, model, vector_store_id
- `artifacts/proprev/` — React frontend (single-page chat UI)
- `lib/api-spec/openapi.yaml` — OpenAPI contract
- `lib/api-client-react/` — generated React Query hooks
- `lib/api-zod/` — generated Zod validation schemas

## Architecture decisions

- Uses OpenAI **Responses API** (`client.responses.create()`) — NOT the deprecated Assistants/threads/runs API.
- Vector store is pre-loaded at `vs_6a3bf8e10804819191f726613868050c` — corpus is never rebuilt.
- Conversation is chained using `previous_response_id` returned from each API call.
- SSE streaming is done with raw `fetch` on the frontend (not React Query hooks) since Orval can't type SSE responses.
- File uploads go to OpenAI with `purpose="assistants"` and are attached per-message, keeping uploads scoped to one conversation.
- App is always forced into dark mode — no light mode toggle.

## Product

- Hero section with "Need help organizing?" welcome message and 4 clickable starter questions
- Full chat interface with typing indicators and streaming responses
- Expandable citation pills that reveal source document filenames
- File attachment support (PDF, txt, docx, md) for per-session document search
- Mobile-friendly layout with Inter font

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always check `OPENAI_API_KEY` is set before running the API server
- `config.json` is read at runtime from `artifacts/api-server/config.json` — resolved relative to workspace root
- The Responses API call is cast with `Record<string, unknown>` to avoid strict SDK type conflicts with the `input` field shape

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
