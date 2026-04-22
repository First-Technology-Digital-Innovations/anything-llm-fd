# Document Generation Customization

A theme named "corporate" has been defined in DOCUMENT_STYLES and enforced whenever documents are generated. This theme is used for driving basic colours and theming for DOCX, PPTX, and XLSX document generation. PDF generation methods currently do not support styling and will need to be reworked if we want the AI generating theme'd PDF files (They're plain at the moment)

Also, built in customization covers the basic theming of a generated document, but not the structure of the content. If we want to enforce a certain template file we will need to make code changes.

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

---

## 10. Styling & Templates — Consistent Branding for Generated Files

Out-of-the-box output is functional but visually plain. There are four realistic levels of investment for making generated documents look like they belong to your organisation. Pick based on **who owns the look** (developers vs designers/marketing) and **how much layout control you need** (colors only vs full layout).

### 10.1 What already exists

All four binary formats have a theme layer and a logo-stamping layer, but everything is **code-defined** — no template files are loaded from disk.

| Format | Theme/style seam | Logo/branding seam |
|---|---|---|
| DOCX | [docx/utils.js:9-57](server/utils/agents/aibitat/plugins/create-files/docx/utils.js#L9-L57) — `DOCUMENT_STYLES` with `neutral` / `blue` / `warm` themes, `normal` / `narrow` / `wide` margins, Calibri fonts. Picked via `theme` and `margins` params on `create-docx-file`. | `createRunningFooter()` and `createCoverPageSection()` in [docx/utils.js](server/utils/agents/aibitat/plugins/create-files/docx/utils.js) embed a `logoBuffer` loaded via `createFilesLib.getLogo()`. |
| PDF | `@mintplex-labs/mdpdf` converts markdown → HTML → PDF using **its default CSS**. There is no custom-stylesheet call in [create-pdf-file.js:89-94](server/utils/agents/aibitat/plugins/create-files/pdf/create-pdf-file.js#L89-L94). | `applyBranding()` in [pdf/utils.js:10-66](server/utils/agents/aibitat/plugins/create-files/pdf/utils.js#L10-L66) stamps the logo PNG in the bottom-right corner of every page via `pdf-lib`. |
| PPTX | Theme dict in [pptx/utils.js](server/utils/agents/aibitat/plugins/create-files/pptx/utils.js) (slide colors, backgrounds). Picked per-invocation. | `addBranding()` in [pptx/utils.js:16](server/utils/agents/aibitat/plugins/create-files/pptx/utils.js#L16) adds the logo to each slide master. |
| XLSX | Header styling + zebra striping in [xlsx/utils.js](server/utils/agents/aibitat/plugins/create-files/xlsx/utils.js). | `applyBranding()` in [xlsx/utils.js:193](server/utils/agents/aibitat/plugins/create-files/xlsx/utils.js#L193) appends a "Created with AnythingLLM" row after the data. |

**Logo source of truth.** `createFilesLib.getLogo()` at [lib.js:278-295](server/utils/agents/aibitat/plugins/create-files/lib.js#L278-L295):

```js
const assetsPath = path.join(__dirname, "../../../../../storage/assets");
const filename = forDarkBackground ? "anything-llm.png" : "anything-llm-invert.png";
```

So there is a **single pair of files** (`storage/assets/anything-llm.png` for dark backgrounds, `storage/assets/anything-llm-invert.png` for light) that every generator uses. Replacing those two files re-brands every format in one shot.

### 10.2 Level 1 — Extend the theme dicts (≤ 1 hour, zero library changes)

Fastest path, suitable for "use our brand colors and logo":

1. **Swap the logo PNGs.** Drop your dark-bg and light-bg logos into `server/storage/assets/` with the existing filenames, or add a new filename and extend `getLogo()` to pick between `anythingllm` and `corporate` by an argument. Every format picks up the new logo automatically.
2. **Add a `corporate` theme entry** to `DOCUMENT_STYLES.themes` in [docx/utils.js:15-43](server/utils/agents/aibitat/plugins/create-files/docx/utils.js#L15-L43) with your brand hex codes:
   ```js
   corporate: {
     heading: "0B3D91",
     accent: "F5A623",
     tableHeader: "E6EEF9",
     border: "B9C7DD",
     coverBg: "0B3D91",
     coverText: "FFFFFF",
     footerText: "666666",
   },
   ```
3. **Default it** — change the `theme` param default in [create-docx-file.js](server/utils/agents/aibitat/plugins/create-files/docx/create-docx-file.js) (and equivalents in PDF/PPTX/XLSX) so the LLM doesn't have to pass `theme: "corporate"` for every request.
4. **Update fonts** — change `DOCUMENT_STYLES.fonts.body` / `.heading` / `.mono` in [docx/utils.js:44-48](server/utils/agents/aibitat/plugins/create-files/docx/utils.js#L44-L48). Be aware: Word uses the font **name only** — if your brand font is not installed on the reader's machine, Word substitutes. For guaranteed rendering, stick to safe fonts (Calibri, Arial, Times New Roman, Georgia) or embed the font into the `.docx` (the `docx` npm library does not do this out of the box).

**Covers:** colors, fonts, margins, logo. **Does not cover:** layout, page structure, multi-column, table of contents, real corporate cover pages.

### 10.3 Level 2 — Inject a stylesheet (medium effort, medium payoff)

For more visual control without replacing libraries:

**DOCX — `externalStyles`.** The `docx` npm library accepts a `styles.xml` string via `new Document({ externalStyles: "..." })`. Workflow:

1. Open a branded `.docx` in Word (your corporate template).
2. Unzip it (a `.docx` is a ZIP). Extract `word/styles.xml`.
3. Read that XML into a string at handler startup and pass it to `new Document({ externalStyles: xml, ... })` in [create-docx-file.js:241-247](server/utils/agents/aibitat/plugins/create-files/docx/create-docx-file.js#L241-L247).
4. In `htmlToDocxElements` ([docx/utils.js](server/utils/agents/aibitat/plugins/create-files/docx/utils.js)), tag paragraphs with style IDs (`new Paragraph({ style: "Heading1", ... })`) instead of hard-coded `HeadingLevel.HEADING_1`. The actual look (font family/size/color/spacing for Heading 1) now comes from the corporate template, not code.

Your developers still build content; the template owns appearance. This is the **most honest "use my Word template" mode** available without swapping the DOCX library.

**PDF — custom CSS via mdpdf.** Check whether `@mintplex-labs/mdpdf` accepts a CSS path/string (it's a thin wrapper; inspect `node_modules/@mintplex-labs/mdpdf`). If yes, one CSS file covers fonts, colors, headings, tables, page size, headers. If the fork does not expose this, either patch the fork or move to Level 3 for PDF.

**PPTX — slide masters.** `pptxgenjs` supports `pres.defineSlideMaster({ ... })` to define a reusable master. Put your master definition in [pptx/utils.js](server/utils/agents/aibitat/plugins/create-files/pptx/utils.js) and call `.defineSlideMaster()` once per presentation before adding slides. Controls backgrounds, placeholder positions, footer elements.

### 10.4 Level 3 — True template-document workflow (bigger change, best fidelity)

This is the "design in Word, fill in at runtime" model you asked about. **The current `docx` library does not do this**; you need to add a second library for the template use case.

**DOCX — `docxtemplater`.** Install [`docxtemplater`](https://docxtemplater.com/) (MIT-licensed). Your designers build `template.docx` in Word with content controls or `{placeholder}` tags. The handler then does:

```js
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");

const zip = new PizZip(fs.readFileSync(templatePath));
const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
doc.render({ title, author, sections: [{ heading, body }, ...] });
const buffer = doc.getZip().generate({ type: "nodebuffer" });
```

Feed that `buffer` into the unchanged `createFilesLib.saveGeneratedFile(...)` tail. You keep both options: freeform markdown DOCX for "write me anything" prompts, templated DOCX for structured documents (reports, contracts, meeting minutes) where the shape is known in advance.

**Where to store templates.** `server/storage/document-templates/<templateId>.docx` is a natural fit — same persistent mount as `generated-files/` and `plugins/`. Expose the template list as an admin UI page or just an env-configured directory.

**Picking a template at runtime.** Two reasonable patterns:
- Add a `template` param to the generator so the LLM picks (`"meeting-minutes"`, `"report"`, `"contract"`). Requires good descriptions so the LLM chooses the right one.
- Default to a single `default.docx` template for all invocations, add freeform content into a single `{body}` placeholder. Simpler, less flexible.

**PPTX — `pptxtemplater` / `officegen` / direct OOXML.** Similar story. Easier alternative: use `pptxgenjs` slide masters (Level 2) unless you need complex pre-existing slides.

**PDF — HTML + CSS template + Puppeteer/Playwright.** Drop `@mintplex-labs/mdpdf` and render HTML with headless Chrome:

```js
const puppeteer = require("puppeteer");
const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setContent(renderedHtml, { waitUntil: "networkidle0" });
const buffer = await page.pdf({ format: "A4", printBackground: true,
  displayHeaderFooter: true, headerTemplate, footerTemplate, margin: {...} });
await browser.close();
```

Designer maintains one HTML + CSS file with your branding (fonts via `@font-face`, gradients, page breaks via CSS `page-break-before`, `@page` rules). This is the industry-standard path for branded PDFs and gives you **full CSS-grade control**. Trade-off: Puppeteer adds ~150 MB to the image and a headless Chrome process per render. In a containerised prod environment that's usually fine; check the Docker base image has the needed libs (`libnss3`, `libatk1.0-0`, etc.).

### 10.5 Level 4 — Offload to an external template service (zero-library, designer-ownable)

Pairs naturally with the swap-out seam in §9. Worth considering because it **moves template editing out of the repo**.

**Azure Logic Apps — "Populate a Microsoft Word template".** Built-in connector (`Word Online (Business)`). Your marketing/ops team uploads `.docx` templates to SharePoint with content controls, Logic App has a "Populate" action, returns the populated file. Your handler just POSTs the data and writes the returned bytes:

```js
const response = await fetch(process.env.AZURE_DOC_LOGIC_APP_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-api-key": process.env.AZURE_DOC_KEY },
  body: JSON.stringify({ templateId, fields: { title, author, sections } }),
});
const buffer = Buffer.from(await response.arrayBuffer());
const savedFile = await createFilesLib.saveGeneratedFile({ fileType: "docx", extension: "docx", buffer, displayFilename });
// ...socket.send + registerOutput unchanged
```

**Trade-offs.**
- ✅ Non-developers own the look. Re-branding is a Word edit + save.
- ✅ Same mechanism works for DOCX, PPTX, and (via SharePoint + Power Automate) PDF export.
- ❌ Adds a network hop (latency + a new failure mode). Use `this.super.introspect(...)` to keep a thinking bubble visible during the call.
- ❌ Tied to Azure / Microsoft 365 licensing.
- ❌ You give up programmatic control over complex dynamic layouts (loops over variable-length sections work, but deeply nested/conditional layouts get awkward in Word template syntax).

Other vendors in the same space: [Carbone](https://carbone.io/), [Docassemble](https://docassemble.org/), [Templater](https://www.ntemplater.com/), [DocRaptor](https://docraptor.com/) (PDF-focused). Pick based on licensing, on-prem story, and template language preference.

### 10.6 Decision Matrix

| Need | Recommended level |
|---|---|
| Brand colors + corporate logo, tomorrow | **Level 1** |
| Typography and paragraph styling owned by corporate template, content built in code | **Level 2** (DOCX `externalStyles`, PDF custom CSS) |
| Pixel-perfect PDF brochures / reports with headers, cover pages, multi-column | **Level 3 — Puppeteer** |
| Word reports where marketing edits the template without dev involvement | **Level 3 — `docxtemplater`** or **Level 4 — Logic App** |
| Minimal eng maintenance burden, non-devs own the look, Azure already in stack | **Level 4 — Logic App + SharePoint templates** |

### 10.7 Implementation Checklist (regardless of level chosen)

- [ ] Replace the logo PNGs in `server/storage/assets/` (or add new filenames + extend `getLogo()`).
- [ ] Default to the corporate theme/template across all generators so the LLM does not have to ask.
- [ ] Update the examples in each generator's `aibitat.function({ examples: [...] })` block — the LLM uses these as few-shot guidance, so showing branded/templated invocations improves trigger reliability.
- [ ] Add a visual-regression check: keep a known-good sample of each format in `server/utils/agents/aibitat/plugins/create-files/*/test-themes.js` (one already exists for DOCX at [docx/test-themes.js](server/utils/agents/aibitat/plugins/create-files/docx/test-themes.js)) so you can spot accidental breakage after dependency upgrades.
- [ ] Document the font licensing. If you add a brand font (Level 2+), confirm the license covers redistribution inside generated files and/or server-side rendering.
- [ ] If using external templates (Level 3/4), version them and store alongside the code/repo or in a tracked SharePoint location — "who owns the template" should never be a mystery.
