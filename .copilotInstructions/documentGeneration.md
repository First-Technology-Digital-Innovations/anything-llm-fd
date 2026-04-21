# Document Generation — End-to-End Trace

This document maps every file, function, and hop involved when a user asks the agent to generate a document (DOCX, PDF, PPTX, XLSX, or plain text). Use it as an audit map if you ever decide to replace this pipeline with an Azure Logic App, an Azure AI Agent call, or any other external generator.

Companion guide: see [customTools.md](customTools.md) for the imported-skill plugin contract. The built-in document generators in this trace are **internal aibitat plugins**, not imported skills — but they follow the same handler-contract shape.

---

## 1. The 30-Second Mental Model

Document generation is an **internal agent skill bundle** called `create-files-agent`. It is registered the same way other built-in plugins are (memory, web-scraping, etc.) and is only exposed to the LLM when `isToolAvailable()` returns true (dev mode, or `ANYTHING_LLM_RUNTIME=docker` in prod — see [server/utils/agents/aibitat/plugins/create-files/lib.js:57-60](server/utils/agents/aibitat/plugins/create-files/lib.js#L57-L60)).

The bundle contains five sub-skills, each a separate aibitat tool the LLM can call:

| Tool name | File | Library used |
|---|---|---|
| `create-docx-file` | [server/utils/agents/aibitat/plugins/create-files/docx/create-docx-file.js](server/utils/agents/aibitat/plugins/create-files/docx/create-docx-file.js) | `docx` v9.6.1 |
| `create-pdf-file` | [server/utils/agents/aibitat/plugins/create-files/pdf/create-pdf-file.js](server/utils/agents/aibitat/plugins/create-files/pdf/create-pdf-file.js) | `@mintplex-labs/mdpdf` + `pdf-lib` v1.17.1 |
| `create-pptx-presentation` | [server/utils/agents/aibitat/plugins/create-files/pptx/create-presentation.js](server/utils/agents/aibitat/plugins/create-files/pptx/create-presentation.js) | `pptxgenjs` v4.0.1 |
| `create-excel-file` | [server/utils/agents/aibitat/plugins/create-files/xlsx/create-excel-file.js](server/utils/agents/aibitat/plugins/create-files/xlsx/create-excel-file.js) | `exceljs` v4.4.0 |
| `create-text-file` | [server/utils/agents/aibitat/plugins/create-files/text/create-text-file.js](server/utils/agents/aibitat/plugins/create-files/text/create-text-file.js) | none — raw UTF-8 Buffer |

All five share a single persistence layer — [CreateFilesManager in lib.js](server/utils/agents/aibitat/plugins/create-files/lib.js) — which writes every binary to `{STORAGE_DIR}/generated-files/{fileType}-{uuid}.{ext}` and pushes a `fileDownloadCard` event down the chat websocket.

**This is the swap-out seam.** If you replace the generator with an Azure Logic App or Azure Agent, you almost certainly want to keep `CreateFilesManager.saveGeneratedFile()` + the websocket message, and only change what produces the `buffer` that gets saved. See §9 for the detailed swap-out guide.

---

## 2. The Full Request → Delivery Flow (One Diagram)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ USER TYPES "@agent create a Word doc about X" IN CHAT                        │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                ▼
  Frontend sends chat msg via normal chat websocket/HTTP path, which
  eventually triggers an agent invocation. The server creates an
  AgentInvocation row and the frontend opens a new websocket to:
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ WS  /agent-invocation/:uuid                                                  │
│   → server/endpoints/agentWebsocket.js:21                                    │
│   → new AgentHandler({ uuid }).init()                                        │
│   → agentHandler.createAIbitat({ socket })                                   │
│   → agentHandler.startAgentCluster()                                         │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ AIBITAT (the agent runtime) loads all default plugins, including             │
│ create-files-agent's five sub-skills.                                        │
│   → server/utils/agents/aibitat/plugins/index.js:10,23,36                    │
│   → server/utils/agents/defaults.js:139 (gates availability)                 │
│   → server/utils/agents/aibitat/plugins/create-files/index.js:7-19           │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ LLM PICKS A TOOL based on its description, e.g. create-docx-file             │
│ The handler runs (example: docx):                                            │
│   → create-docx-file.js:22 (aibitat.function registration)                   │
│   → create-docx-file.js handler body:                                        │
│       1. marked() parses markdown → HTML                                     │
│       2. htmlToDocxElements() converts HTML → docx AST                       │
│       3. new Document({...}) builds the doc                                  │
│       4. Packer.toBuffer(doc)  →  raw .docx Buffer   [line 249]              │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PERSISTENCE & DELIVERY (shared by all five generators)                       │
│   createFilesLib.saveGeneratedFile({fileType, extension, buffer, displayFilename})
│     → lib.js:213 writes to {STORAGE_DIR}/generated-files/docx-{uuid}.docx    │
│                                                                              │
│   this.super.socket.send("fileDownloadCard", {                               │
│     filename, storageFilename, fileSize                                      │
│   })                                                                         │
│     → create-docx-file.js:263                                                │
│     → delivered live to the browser over the agent websocket                 │
│                                                                              │
│   createFilesLib.registerOutput(this.super, "DocxFileDownload", payload)     │
│     → lib.js:158 pushes into aibitat._pendingOutputs                         │
│     → later persisted by chat-history plugin:                                │
│       server/utils/agents/aibitat/plugins/chat-history.js:49-73              │
│     → stored inside WorkspaceChats.response JSON as { outputs: [...] }       │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ FRONTEND RECEIVES fileDownloadCard                                           │
│   → frontend/src/utils/chat/agent.js:187-204                                 │
│   → appends a chat history entry of type "fileDownloadCard"                  │
│   → rendered by:                                                             │
│       frontend/src/components/WorkspaceChat/ChatContainer/ChatHistory/       │
│         FileDownloadCard/index.jsx                                           │
│                                                                              │
│   For historical messages (page refresh, re-open chat):                      │
│   → HistoricalMessage/HistoricalOutputs/index.jsx reads the outputs[]        │
│     array from the saved chat and renders the same FileDownloadCard.         │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ USER CLICKS "DOWNLOAD" BUTTON                                                │
│   → FileDownloadCard/index.jsx:15 handleDownload()                           │
│   → StorageFiles.download(storageFilename)                                   │
│   → frontend/src/models/files.js:10                                          │
│     GET  /api/agent-skills/generated-files/:filename                         │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ SECURE DOWNLOAD ENDPOINT                                                     │
│   → server/endpoints/agentFileServer.js:27                                   │
│     1. validatedRequest + flexUserRoleValid([ROLES.all])                     │
│     2. createFilesLib.parseFilename(filename)      [lib.js:193]              │
│     3. findValidChatForFile(filename, user, …)     [agentFileServer.js:94]   │
│        → confirms the caller has access to a workspace whose chat history    │
│          contains this storageFilename in its outputs[]                      │
│     4. createFilesLib.getGeneratedFile(filename)   [lib.js:238]              │
│        → reads bytes from {STORAGE_DIR}/generated-files/…                    │
│     5. getMimeType() + sanitizeFilenameForHeader()                           │
│     6. response.send(buffer)  → browser                                      │
│                                                                              │
│   Browser-side: file-saver saveAs(blob, filename)  in FileDownloadCard.jsx   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Breakdown — What Happens When The User Asks

### 3.1 Trigger

The user sends a chat message in a workspace that has agents enabled (or explicitly starts it with `@agent`). Nothing in the pure-chat path is document-specific yet.

### 3.2 Agent session start

Once the chat server decides the message should invoke an agent, the frontend opens a websocket to `/agent-invocation/:uuid`. The server-side handler is [server/endpoints/agentWebsocket.js:21](server/endpoints/agentWebsocket.js#L21):

```js
app.ws("/agent-invocation/:uuid", async function (socket, request) {
  const agentHandler = await new AgentHandler({ uuid: String(request.params.uuid) }).init();
  ...
  await agentHandler.createAIbitat({ socket });
  await agentHandler.startAgentCluster();
});
```

`AgentHandler` (in [server/utils/agents/index.js](server/utils/agents/index.js)) builds an AIbitat instance and loads every plugin listed in `defaults.js`.

### 3.3 Plugin registration

Relevant files:

- [server/utils/agents/aibitat/plugins/index.js:10,23,36](server/utils/agents/aibitat/plugins/index.js#L10) — exports `createFilesAgent` and slots it into the default plugin registry.
- [server/utils/agents/aibitat/plugins/create-files/index.js:7-19](server/utils/agents/aibitat/plugins/create-files/index.js#L7-L19) — declares the bundle:
  ```js
  const createFilesAgent = {
    name: "create-files-agent",
    startupConfig: { params: {} },
    plugin: [CreatePptxPresentation, CreateTextFile, CreatePdfFile, CreateExcelFile, CreateDocxFile],
  };
  ```
- [server/utils/agents/defaults.js:139-143](server/utils/agents/defaults.js#L139-L143) — gates the bundle:
  ```js
  if (skillName === "create-files-agent") {
    const createFilesTool = require("./aibitat/plugins/create-files/lib");
    if (!createFilesTool.isToolAvailable()) continue;
    if (_disabledCreateFilesSkills.includes(subPlugin.name)) continue;
  }
  ```
- `isToolAvailable()` at [lib.js:57-60](server/utils/agents/aibitat/plugins/create-files/lib.js#L57-L60) — only returns true in dev or inside Docker. Outside those environments the tools are simply not shown to the LLM.

Each sub-plugin calls `aibitat.function({...})` in its `setup()` to register as a callable tool. The LLM then sees `create-docx-file`, `create-pdf-file`, etc., alongside every other agent tool.

### 3.4 LLM decides to call a generator

The LLM reads each tool's `description` and `examples` fields and, if the user's prompt matches, emits a tool call. Example description from [create-docx-file.js:25-26](server/utils/agents/aibitat/plugins/create-files/docx/create-docx-file.js#L25-L26):

```
"Create a Microsoft Word document (.docx) from markdown or plain text content.
 Supports professional styling with color themes, title pages, and running headers/footers."
```

The params schema (filename, title, subtitle, author, theme, includeTitlePage, margins, content, …) is declared in the same file and is what the LLM must fill in.

### 3.5 Handler execution (DOCX example)

The handler body (roughly lines 160-295 of [create-docx-file.js](server/utils/agents/aibitat/plugins/create-files/docx/create-docx-file.js)) does this:

1. Loads `marked` and `docx` via `loadLibraries()` (lazy-loaded to keep cold start light).
2. Parses the markdown content to HTML: `marked.parse(content)`.
3. Converts HTML to docx AST: `htmlToDocxElements(html, …)`.
4. Optionally builds a cover page section, headers, footers, theme styling.
5. Builds the document:
   ```js
   const doc = new Document({ title, creator, description, numbering, sections });
   const buffer = await Packer.toBuffer(doc);   // line 249 — raw .docx bytes
   ```
6. Saves + announces + registers (see §3.6).
7. Returns a short string to the LLM describing what happened (the LLM then uses it in the next assistant turn to explain to the user what it produced).

The other generators follow the same shape:

- **PDF**: [create-pdf-file.js:61-120](server/utils/agents/aibitat/plugins/create-files/pdf/create-pdf-file.js#L61-L120) — markdown → HTML → PDF via `mdpdf`, then `pdf-lib` for branding, `PDFDocument.save()` for the buffer.
- **PPTX**: [create-presentation.js:36-320](server/utils/agents/aibitat/plugins/create-files/pptx/create-presentation.js#L36-L320) — outlines via parent agent, content via section sub-agents, `pptxgenjs` renders.
- **XLSX**: [create-excel-file.js:14-330](server/utils/agents/aibitat/plugins/create-files/xlsx/create-excel-file.js#L14-L330) — CSV input with auto-delim detection, `exceljs` builds multi-sheet workbook.
- **TXT (and md/json/csv/html/xml/yaml/log)**: [create-text-file.js:78-135](server/utils/agents/aibitat/plugins/create-files/text/create-text-file.js#L78-L135) — just `Buffer.from(content, "utf-8")`.

### 3.6 Persistence + live delivery (shared path for all five)

All generators converge on three calls in the same order. Using DOCX as the example ([create-docx-file.js:256-273](server/utils/agents/aibitat/plugins/create-files/docx/create-docx-file.js#L256-L273)):

```js
// 1. Write bytes to disk under a UUID filename
const savedFile = await createFilesLib.saveGeneratedFile({
  fileType: "docx",
  extension: "docx",
  buffer,
  displayFilename,
});

// 2. Push a live card down the agent websocket to the browser
this.super.socket.send("fileDownloadCard", {
  filename: savedFile.displayFilename,
  storageFilename: savedFile.filename,
  fileSize: savedFile.fileSize,
});

// 3. Queue the same payload so it is persisted to WorkspaceChats.response
createFilesLib.registerOutput(this.super, "DocxFileDownload", { ... });
```

Implementation of each call:

- `saveGeneratedFile()` — [lib.js:213-231](server/utils/agents/aibitat/plugins/create-files/lib.js#L213-L231). Generates `docx-{uuid}.docx`, writes under `{STORAGE_DIR}/generated-files/`, returns metadata.
- `this.super.socket` — this is the websocket opened at `/agent-invocation/:uuid` in step 3.2. Messages cross directly to the browser.
- `registerOutput()` — [lib.js:158-174](server/utils/agents/aibitat/plugins/create-files/lib.js#L158-L174). Pushes `{ type, payload }` onto `aibitat._pendingOutputs`.
- Pending outputs are flushed into the DB by the chat-history plugin — [chat-history.js:49-73](server/utils/agents/aibitat/plugins/chat-history.js#L49-L73) — when the agent completes its turn. They become part of `WorkspaceChats.response.outputs[]` and get rendered on any subsequent page load.

### 3.7 Frontend live rendering

The browser-side agent websocket handler at [frontend/src/utils/chat/agent.js:187-204](frontend/src/utils/chat/agent.js#L187-L204) receives the `fileDownloadCard` event and appends a new entry to `chatHistory`:

```js
if (data.type === "fileDownloadCard") {
  return setChatHistory((prev) => [
    ...prev.filter((msg) => !!msg.content),
    { type: "fileDownloadCard", uuid: v4(), content: data.content, role: "assistant", ... },
  ]);
}
```

The chat history renderer at [ChatHistory/index.jsx](frontend/src/components/WorkspaceChat/ChatContainer/ChatHistory/index.jsx) maps `type: "fileDownloadCard"` to [FileDownloadCard/index.jsx](frontend/src/components/WorkspaceChat/ChatContainer/ChatHistory/FileDownloadCard/index.jsx), which renders a card with the filename, size, and a **Download** button.

For historical messages (reload, re-open chat), [HistoricalMessage/HistoricalOutputs/index.jsx](frontend/src/components/WorkspaceChat/ChatContainer/ChatHistory/HistoricalMessage/HistoricalOutputs/index.jsx) reads the persisted `outputs[]` from the chat record and renders the same component.

### 3.8 Download click

`handleDownload` in [FileDownloadCard/index.jsx:15-29](frontend/src/components/WorkspaceChat/ChatContainer/ChatHistory/FileDownloadCard/index.jsx#L15-L29):

```js
const blob = await StorageFiles.download(storageFilename);
saveAs(blob, filename || storageFilename);
```

- `StorageFiles.download` — [frontend/src/models/files.js:10-23](frontend/src/models/files.js#L10-L23). Simple `fetch(API_BASE + "/agent-skills/generated-files/" + filename, { headers: baseHeaders() })` returning a blob.
- `saveAs` is from `file-saver` (browser file download API).

### 3.9 Secure serve

[server/endpoints/agentFileServer.js:27-83](server/endpoints/agentFileServer.js#L27-L83) handles `GET /agent-skills/generated-files/:filename`:

1. `validatedRequest` + `flexUserRoleValid([ROLES.all])` middleware — must be a logged-in user.
2. `createFilesLib.parseFilename(filename)` — rejects anything not matching `^[a-z]+-[uuid]\.ext$` (prevents path traversal).
3. `findValidChatForFile()` — [agentFileServer.js:94-139](server/endpoints/agentFileServer.js#L94-L139):
   - In multi-user mode, fetches the workspaces the user is actually attached to.
   - Looks through `WorkspaceChats.response.outputs[]` for a chat that contains this `storageFilename`.
   - Returns the workspace + the original `displayFilename` if found.
   - This is the **authorization check**: you can only download a file if it appears in a chat belonging to a workspace you can see. There is no other ACL.
4. `createFilesLib.getGeneratedFile(filename)` — [lib.js:238](server/utils/agents/aibitat/plugins/create-files/lib.js#L238). Reads the raw bytes from disk.
5. Sets `Content-Type` (via `getMimeType`), `Content-Disposition: attachment; filename="…"` (via `sanitizeFilenameForHeader`), `Content-Length`, and `response.send(buffer)`.

Bytes land in the browser as a blob → `saveAs()` → filesystem.

---

## 4. File Index (Everywhere Document Generation Is Touched)

### Backend
- [server/endpoints/agentWebsocket.js](server/endpoints/agentWebsocket.js) — opens `/agent-invocation/:uuid` and boots the agent.
- [server/endpoints/agentFileServer.js](server/endpoints/agentFileServer.js) — `GET /agent-skills/generated-files/:filename` download endpoint + access check.
- [server/utils/agents/index.js](server/utils/agents/index.js) — `AgentHandler`, builds the AIbitat instance, wires `socket` + `handlerProps` onto `this.super`.
- [server/utils/agents/defaults.js:139-143](server/utils/agents/defaults.js#L139-L143) — gates `create-files-agent` on `isToolAvailable()`.
- [server/utils/agents/aibitat/plugins/index.js](server/utils/agents/aibitat/plugins/index.js) — plugin registry, includes `createFilesAgent`.
- [server/utils/agents/aibitat/plugins/create-files/index.js](server/utils/agents/aibitat/plugins/create-files/index.js) — bundle manifest (lists the 5 sub-skills).
- [server/utils/agents/aibitat/plugins/create-files/lib.js](server/utils/agents/aibitat/plugins/create-files/lib.js) — `CreateFilesManager`. Directory init, filename gen/parse, save/read, mime types, header-safe filenames, logo assets, output registration. **This is the shared persistence seam.**
- [server/utils/agents/aibitat/plugins/create-files/docx/](server/utils/agents/aibitat/plugins/create-files/docx/) — DOCX handler + helpers (`utils.js` with `htmlToDocxElements`, themes, margins, cover page builder, etc.).
- [server/utils/agents/aibitat/plugins/create-files/pdf/](server/utils/agents/aibitat/plugins/create-files/pdf/) — PDF handler + branding.
- [server/utils/agents/aibitat/plugins/create-files/pptx/](server/utils/agents/aibitat/plugins/create-files/pptx/) — PPTX handler + the section-sub-agent flow (`runSectionAgent.js`).
- [server/utils/agents/aibitat/plugins/create-files/xlsx/](server/utils/agents/aibitat/plugins/create-files/xlsx/) — XLSX handler + CSV parser + type inference.
- [server/utils/agents/aibitat/plugins/create-files/text/](server/utils/agents/aibitat/plugins/create-files/text/) — plain-text handler.
- [server/utils/agents/aibitat/plugins/chat-history.js:49-73](server/utils/agents/aibitat/plugins/chat-history.js#L49-L73) — flushes `aibitat._pendingOutputs` into `WorkspaceChats.response`.

### Frontend
- [frontend/src/utils/chat/agent.js:187-204](frontend/src/utils/chat/agent.js#L187-L204) — handles the live `fileDownloadCard` websocket event.
- [frontend/src/components/WorkspaceChat/ChatContainer/ChatHistory/index.jsx](frontend/src/components/WorkspaceChat/ChatContainer/ChatHistory/index.jsx) — maps message type to the download-card component.
- [frontend/src/components/WorkspaceChat/ChatContainer/ChatHistory/FileDownloadCard/index.jsx](frontend/src/components/WorkspaceChat/ChatContainer/ChatHistory/FileDownloadCard/index.jsx) — the card UI and download click handler.
- [frontend/src/components/WorkspaceChat/ChatContainer/ChatHistory/HistoricalMessage/HistoricalOutputs/index.jsx](frontend/src/components/WorkspaceChat/ChatContainer/ChatHistory/HistoricalMessage/HistoricalOutputs/index.jsx) — re-renders persisted outputs on reload.
- [frontend/src/models/files.js](frontend/src/models/files.js) — `StorageFiles.download()` helper.

### Storage & DB
- `{STORAGE_DIR}/generated-files/{fileType}-{uuid}.{ext}` — on disk. `STORAGE_DIR` defined in [server/.env.example](server/.env.example).
- `WorkspaceChats.response` (JSON column) — contains `{ outputs: [ { type, payload }, … ] }` for historical rendering.

### Configuration / gates
- `process.env.STORAGE_DIR` — where `generated-files/` lives.
- `process.env.NODE_ENV === "development"` — enables tool in dev.
- `process.env.ANYTHING_LLM_RUNTIME === "docker"` — enables tool in prod Docker.
- `_disabledCreateFilesSkills` array in [defaults.js](server/utils/agents/defaults.js) — lets you disable individual sub-skills without removing the bundle.

---

## 5. Data/Event Contract Between Backend and Frontend

The `fileDownloadCard` websocket message is the single contract between the agent and the UI. Schema:

```ts
{
  type: "fileDownloadCard",
  content: {
    filename: string,         // display name, e.g. "meeting-notes.docx"
    storageFilename: string,  // opaque UUID name used to fetch it back
    fileSize: number,         // bytes
  }
}
```

The historical representation stored in `WorkspaceChats.response.outputs[]` is identical in structure, with `type` being one of `DocxFileDownload | PdfFileDownload | PptxFileDownload | ExcelFileDownload | TextFileDownload`.

If you preserve **this contract** and the **`GET /agent-skills/generated-files/:filename` endpoint**, you can replace everything else without touching the frontend.

---

## 6. MIME Type Table (from lib.js:100-126)

| Extension | MIME |
|---|---|
| `.docx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| `.pdf`  | `application/pdf` |
| `.pptx` | `application/vnd.openxmlformats-officedocument.presentationml.presentation` |
| `.xlsx` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| `.csv`  | `text/csv` |
| `.txt` / `.md` / `.json` / etc. | sensible text equivalents |

---

## 7. Known Behaviours Worth Remembering

- **Tool only visible in dev or Docker prod.** Outside those, the generators don't appear to the LLM at all. If you run the server on bare metal in production, expect the feature to silently disappear.
- **UUID filenames are the only collision-avoidance mechanism.** `displayFilename` is cosmetic; the LLM may hand the user a file called `report.docx` while the on-disk name is `docx-7f3e….docx`.
- **Access control is by chat reference, not by owner column.** A file is readable iff it is cited inside a chat the user can reach. There is no "owner_id" field on files — move a chat to a different workspace and the file becomes unreachable until (if ever) it appears in another chat. Delete the chat row and the file is orphaned on disk.
- **`aibitat._pendingOutputs`** is the only bridge between tool execution and DB persistence. If the chat-history plugin doesn't get to flush (crash, aborted session, bail command), the file is on disk but not reachable through the UI — there's no listing endpoint.
- **Cover pages, themes, and branding** are DOCX/PDF/PPTX only and are hard-coded in the `utils.js` helper files alongside each generator.

---

## 8. Debugging Checklist

1. **Tool doesn't appear to the LLM.** Check `isToolAvailable()` ([lib.js:57](server/utils/agents/aibitat/plugins/create-files/lib.js#L57)). Are you in `NODE_ENV=development`, or is `ANYTHING_LLM_RUNTIME=docker`?
2. **Tool called but file never shows up.** Check the server log for `[CreateFilesManager] saveGeneratedFile - saved …`. If present, look at `{STORAGE_DIR}/generated-files/` on disk.
3. **File on disk but no card in chat.** The websocket `fileDownloadCard` emit might have failed (socket closed mid-stream). The chat-history persistence path still runs; a page reload should pull it from `WorkspaceChats.response.outputs[]`.
4. **Download button returns 404 "not found or access denied".** `findValidChatForFile` ([agentFileServer.js:94](server/endpoints/agentFileServer.js#L94)) couldn't match the filename in any chat the user can see. Either the chat didn't persist (see #3) or you moved the workspace.
5. **Download returns 400 "Invalid filename format".** `parseFilename` rejects anything that isn't `{lowercase-type}-{uuid}.{ext}`. If you manually put files there, they won't match.
6. **Handler crashes.** Server console will have `create-{type}-file error: …` — the handler returns the error string to the LLM as a tool result rather than throwing, so the user sees a polite failure instead of a generic agent error.

---

## 9. Swap-Out Guide — Replacing With Azure Logic App / Azure Agent

If the in-tree `docx`/`pdf-lib`/`pptxgenjs`/`exceljs` rendering doesn't meet quality standards, here's what to change and what to leave alone.

### What to leave alone
- The download endpoint `GET /agent-skills/generated-files/:filename` in [agentFileServer.js](server/endpoints/agentFileServer.js).
- The `CreateFilesManager` in [lib.js](server/utils/agents/aibitat/plugins/create-files/lib.js) — `saveGeneratedFile()`, `getGeneratedFile()`, `parseFilename()`, `generateFilename()`, the MIME table.
- The `fileDownloadCard` websocket contract and the entire frontend render path.
- The `registerOutput()` call and the chat-history persistence.

Those are all "filename-in, bytes-out" and do not care where the bytes came from.

### What to change
Replace the body of the individual generator handlers (`create-docx-file.js` etc.) so that instead of calling the in-process libraries they:

1. Send the prompt/markdown/parameters to the Azure Logic App HTTP trigger (or invoke the Azure Agent via REST).
2. Await the response, which should be the rendered file as either:
   - **Direct bytes** (binary response or base64) — easiest; wrap in `Buffer.from(...)` and feed straight to `saveGeneratedFile`.
   - **A SAS URL / blob URL** — `fetch` it, take the ArrayBuffer, convert to Buffer.
3. Keep the existing three-line tail:
   ```js
   const savedFile = await createFilesLib.saveGeneratedFile({ fileType, extension, buffer, displayFilename });
   this.super.socket.send("fileDownloadCard", { filename: savedFile.displayFilename, storageFilename: savedFile.filename, fileSize: savedFile.fileSize });
   createFilesLib.registerOutput(this.super, "DocxFileDownload", { ... });
   ```
4. Keep the final `return` string so the LLM knows what happened.

### Config & secrets
Add whatever the Logic App / Agent needs (endpoint URL, API key, agent id) to `server/.env` and read via `process.env` in the handler. There's no admin-UI config layer for built-in plugins — if you want that (like `setup_args` in imported skills), consider converting the generator into an **imported skill** (see [customTools.md](customTools.md) §3.3) so the admin can paste credentials without editing the env file.

### Progress updates
The Logic App/Agent call may take a while. Use `this.super.introspect("Generating document via Azure…")` to keep a thinking bubble in the chat while you wait. See [create-docx-file.js](server/utils/agents/aibitat/plugins/create-files/docx/create-docx-file.js) for examples.

### Fallback strategy
Worth considering: detect failure from the remote service and fall back to the in-tree generator, or vice versa. You have the full handler context (`this.super`, the params object) at both call sites so it's a `try { azure } catch { local }` pattern inside the handler.

### Blast-radius note
Each of the five generators is independent. You can swap only the ones whose output quality is actually insufficient (e.g., DOCX via Azure, keep XLSX and TXT local). The shared persistence/delivery layer doesn't care which tool produced the buffer.
