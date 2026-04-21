# Building a Custom Agent Skill (Imported Plugin)

Official docs (use these alongside this guide):

- https://docs.anythingllm.com/agent/custom/introduction
- https://docs.anythingllm.com/agent/custom/developer-guide
- https://docs.anythingllm.com/agent/custom/plugin-json
- https://docs.anythingllm.com/agent/custom/handler-js

This file is a **practical, code-grounded** walkthrough for building a custom agent skill from nothing, with pointers to the exact loader code so you can debug when things go sideways. It is written for the version of the codebase in this fork.

---

## 1. The 30-Second Mental Model

A custom skill is **two files in a folder**:

```
server/storage/plugins/agent-skills/
└── my-skill/
    ├── plugin.json   ← manifest (what the LLM sees, admin config, params)
    └── handler.js    ← the JavaScript the agent actually executes
```

At boot time AnythingLLM scans that directory, reads every `plugin.json`, and if `active: true` exposes the skill to the LLM under the id `@@<hubId>`. When the LLM decides to call the tool, [server/utils/agents/imported.js](server/utils/agents/imported.js) `require()`s your `handler.js`, wires helpers onto `this`, and calls `runtime.handler(params)`.

Two bits of good news:

- **No restart needed for handler code changes.** [imported.js:20](server/utils/agents/imported.js#L20) does `delete require.cache[...]` before every load, so editing `handler.js` and firing another agent query picks up the new code.
- **Restart *is* needed for plugin.json changes** (the active-plugin list is read once per agent session) and for adding/removing plugins. In practice just restart the dev server when in doubt.

---

## 2. Folder Layout and Paths

The loader computes `pluginsPath` like this ([imported.js:6-9](server/utils/agents/imported.js#L6-L9)):

```js
const pluginsPath =
  process.env.NODE_ENV === "development"
    ? path.resolve(__dirname, "../../storage/plugins/agent-skills")
    : path.resolve(process.env.STORAGE_DIR, "plugins", "agent-skills");
```

So:

- **Dev:** `server/storage/plugins/agent-skills/<hubId>/`
- **Prod / Docker / Azure Files:** `$STORAGE_DIR/plugins/agent-skills/<hubId>/`

The folder name **must equal the `hubId` value** inside `plugin.json`. The loader uses the folder name to locate the plugin and then the `hubId` in the manifest for identity — if they differ, behaviour is undefined.

The folder is created for you if missing ([imported.js:53-57](server/utils/agents/imported.js#L53-L57)), so dropping a new subfolder in place is the full install step.

---

## 3. `plugin.json` — The Manifest

### 3.1 Authoritative schema

The full JSON-Schema lives at [server/utils/agents/imported-manifest.schema.json](server/utils/agents/imported-manifest.schema.json). Required top-level fields:

| Field | Type | Notes |
|---|---|---|
| `active` | boolean | If `false` the skill is invisible to the LLM. |
| `hubId` | string | Must equal the parent folder name. |
| `name` | string | Shown in the admin UI. |
| `schema` | `"skill-1.0.0"` | Fixed literal. |
| `version` | string | Your own version tag, e.g. `"0.1.0"`. |
| `description` | string | The LLM uses this to decide whether to call the tool. Make it **precise and action-oriented**. |
| `entrypoint` | object | See below. |
| `imported` | `true` | Must be literally `true`. |

Optional but commonly useful:

- `author`, `author_url`, `license` — metadata only.
- `setup_args` — admin-configurable values (API keys, base URLs). Exposed to your handler as `this.runtimeArgs`.
- `examples` — few-shot pairs the loader pre-injects to nudge the LLM.

### 3.2 The `entrypoint` block

```jsonc
"entrypoint": {
  "file": "handler.js",
  "params": {
    "city": {
      "description": "City name to look up, e.g. 'Cape Town'.",
      "type": "string"                // only "string" | "number" | "boolean"
    },
    "units": {
      "description": "'metric' or 'imperial'. Defaults to metric.",
      "type": "string"
    }
  }
}
```

These `params` become the JSON-Schema the LLM sees on the tool. Internally the loader wraps them like this ([imported.js:192-197](server/utils/agents/imported.js#L192-L197)):

```js
parameters: {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  properties: this.config.entrypoint.params ?? {},
  additionalProperties: false,
}
```

**Gotchas:**

- Only `string`, `number`, `boolean` are accepted param types. No arrays or nested objects in the manifest — if you need structured input, take a `string` and `JSON.parse` it in the handler.
- `additionalProperties: false` is enforced — the LLM cannot pass fields you did not declare.
- `description` on each param is **what the LLM reads** to decide how to fill it. Invest here.

### 3.3 The `setup_args` block (admin-configurable secrets/config)

```jsonc
"setup_args": {
  "apiKey": {
    "type": "string",
    "required": true,
    "input": {
      "type": "password",             // "text" | "password" | "number"
      "placeholder": "sk-...",
      "hint": "OpenWeather API key"
    }
  },
  "baseUrl": {
    "type": "string",
    "required": false,
    "input": {
      "type": "text",
      "default": "https://api.openweathermap.org/data/2.5"
    }
  }
}
```

These render in the admin UI ([frontend/src/pages/Admin/Agents/Imported/ImportedSkillConfig/index.jsx](frontend/src/pages/Admin/Agents/Imported/ImportedSkillConfig/index.jsx)). When an admin saves a value, the backend writes it back into `plugin.json` under `setup_args.<key>.value`. At call time `parseCallOptions()` ([imported.js:157-172](server/utils/agents/imported.js#L157-L172)) flattens them to a simple `{ apiKey, baseUrl }` object available to your handler as `this.runtimeArgs`.

### 3.4 A complete minimal manifest

```json
{
  "active": true,
  "hubId": "weather-lookup",
  "name": "Weather Lookup",
  "schema": "skill-1.0.0",
  "version": "0.1.0",
  "description": "Fetches current weather for a city. Use when the user asks about temperature, conditions, or forecasts.",
  "author": "Mike",
  "license": "MIT",
  "setup_args": {
    "apiKey": {
      "type": "string",
      "required": true,
      "input": { "type": "password", "placeholder": "OpenWeather API key" }
    }
  },
  "entrypoint": {
    "file": "handler.js",
    "params": {
      "city": {
        "description": "City name to look up, e.g. 'Cape Town' or 'London,UK'.",
        "type": "string"
      }
    }
  },
  "examples": [
    {
      "prompt": "What's the weather in Johannesburg right now?",
      "call": "{\"city\": \"Johannesburg\"}"
    }
  ],
  "imported": true
}
```

---

## 4. `handler.js` — The Contract

### 4.1 The export shape

Your file must export a `runtime` object whose `handler` is an async function:

```js
module.exports.runtime = {
  handler: async function (params) {
    // 'this' is populated by the loader — see §4.2
    // 'params' is an object matching entrypoint.params in plugin.json
    return "string result to hand back to the LLM";
  },
  // Any other methods you add here are reachable as this.methodName()
};
```

Nothing else is required. The loader does `this.handler = require(handlerPath)` ([imported.js:21](server/utils/agents/imported.js#L21)) and later spreads `...this.handler.runtime` into the function definition it registers with AIbitat ([imported.js:198](server/utils/agents/imported.js#L198)).

### 4.2 What the loader puts on `this`

From [imported.js:180-199](server/utils/agents/imported.js#L180-L199) the registered function is assembled with these fields — all reachable as `this.<name>` inside your handler:

| Field | What it is | Typical use |
|---|---|---|
| `this.super` | The live AIbitat instance. | `this.super.introspect(...)`, `this.super.handlerProps.invocation`, `this.super.provider`, `this.super.model`, `this.super.addCitation(...)` |
| `this.name` | `hubId` from manifest. | Logging. |
| `this.config` | The parsed `plugin.json`. | Rare — if you really need manifest fields at runtime. |
| `this.runtimeArgs` | Flattened `setup_args` (from `parseCallOptions`). | Read API keys / config values here. |
| `this.description` | `description` from manifest. | Rarely used. |
| `this.logger` | `aibitat.handlerProps.log` or `console.log`. | Server-side debug logging. |
| `this.introspect` | `aibitat.introspect` or `console.log`. | **Stream status to the user's chat window.** Prefer `this.super.introspect` for consistency with built-ins. |
| `this.webScraper` | A shared `CollectorApi` instance. | If you need to scrape pages — see `web-scraping.js` plugin. |
| `this.examples` | `examples` array from manifest. | Usually read by the framework, not the handler. |
| `this.parameters` | The JSON-Schema the LLM was shown. | Rarely used. |

### 4.3 What to return

**Return a string.** The return value is appended to the LLM's context as the tool result. If you return an object, it will get JSON-serialised by the provider layer, which is usually fine but less predictable than controlling the phrasing yourself.

Pattern:

```js
if (!response.ok) return `Weather API returned ${response.status}. Try again later or confirm the city spelling.`;
return `Current weather in ${city}: ${temp}°C, ${description}.`;
```

### 4.4 Error handling

Prefer **returning a user-friendly error string** over throwing. Thrown errors bubble up into AIbitat and generally produce a less useful "function not found / try again" type message. Only throw for genuinely unrecoverable situations.

```js
try {
  const data = await fetchThing();
  if (!data) return "I couldn't find any data for that request.";
  return summarise(data);
} catch (err) {
  this.logger?.(`[weather-lookup] ${err.message}`);
  return `Weather lookup failed: ${err.message}`;
}
```

### 4.5 Streaming status to the UI with `introspect`

`introspect()` writes a "thinking" bubble into the chat while the handler is still running. Use it to keep the user informed during long operations:

```js
this.introspect(`Looking up weather for ${params.city}…`);
```

Both `this.introspect` and `this.super.introspect` work; built-in skills use the latter.

### 4.6 A complete minimal handler

```js
// handler.js
module.exports.runtime = {
  handler: async function ({ city }) {
    const { apiKey, baseUrl = "https://api.openweathermap.org/data/2.5" } =
      this.runtimeArgs || {};

    if (!apiKey) return "Weather skill is missing its API key. Ask an admin to configure it.";
    if (!city) return "I need a city name to look up the weather.";

    this.introspect(`Looking up weather for ${city}…`);

    try {
      const url = `${baseUrl}/weather?q=${encodeURIComponent(city)}&units=metric&appid=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) return `Weather API returned ${res.status}. Check the city spelling.`;

      const body = await res.json();
      const temp = body?.main?.temp;
      const desc = body?.weather?.[0]?.description ?? "conditions unknown";

      if (temp === undefined) return `Could not parse weather response for ${city}.`;
      return `Current weather in ${city}: ${temp}°C, ${desc}.`;
    } catch (err) {
      this.logger?.(`[weather-lookup] ${err.message}`);
      return `Weather lookup failed: ${err.message}`;
    }
  },
};
```

### 4.7 Accessing workspace/user context

If your skill needs to know who is asking or which workspace they are in, use `this.super.handlerProps.invocation`:

```js
const invocation = this.super?.handlerProps?.invocation;
// { workspace, user, thread_id, workspace_id, user_id }
```

This is the same pattern the built-in `memory` plugin ([server/utils/agents/aibitat/plugins/memory.js](server/utils/agents/aibitat/plugins/memory.js)) uses.

### 4.8 Multiple helper methods on `runtime`

Anything else you hang off `runtime` becomes callable from inside the handler via `this`. Useful for splitting logic:

```js
module.exports.runtime = {
  handler: async function (params) {
    const raw = await this.fetchRaw(params.city);
    return this.format(raw);
  },
  fetchRaw: async function (city) { /* ... */ },
  format: function (raw) { /* ... */ },
};
```

---

## 5. In-Repo Examples to Read

The cleanest built-in references (they are not strictly "imported" plugins, but the handler-contract shape matches closely):

- **Simple:** [server/utils/agents/aibitat/plugins/memory.js](server/utils/agents/aibitat/plugins/memory.js) — uses `this.super.introspect`, accesses workspace via `this.super.handlerProps.invocation`, returns strings.
- **HTTP-heavy:** [server/utils/agents/aibitat/plugins/web-scraping.js](server/utils/agents/aibitat/plugins/web-scraping.js) — shows async work, progress reporting, adding citations with `this.super.addCitation`, reading `this.super.provider` / `this.super.model`.

For an actual `plugin.json` + `handler.js` pair, once you install anything via the Community Hub, look at `server/storage/plugins/agent-skills/<whatever>/` for a working, deployed manifest.

---

## 6. Installing and Enabling

### 6.1 Manual install (what you'll do while developing)

1. Create `server/storage/plugins/agent-skills/<hubId>/` (the folder is created on first scan if the parent is missing — [imported.js:53-57](server/utils/agents/imported.js#L53-L57)).
2. Drop in `plugin.json` and `handler.js`.
3. Set `"active": true` in `plugin.json`.
4. Restart the server (or at least start a fresh agent session — the active-plugin list is evaluated per session).

That is the entire install. There is no registration step anywhere else in the codebase.

### 6.2 Community Hub install

The official flow is `POST /community-hub/import` with a hub item — [imported.js:214-314](server/utils/agents/imported.js#L214-L314) `importCommunityItemFromUrl()` downloads a signed ZIP, validates against Zip-Slip, extracts into `agent-skills/<hubId>/`, and **forces `active: false`** so an admin has to explicitly enable it.

### 6.3 Toggling, configuring, and deleting

Admin UI: [frontend/src/pages/Admin/Agents/Imported/](frontend/src/pages/Admin/Agents/Imported/) (`SkillList/index.jsx` lists, `ImportedSkillConfig/index.jsx` configures).

Backend endpoints ([server/endpoints/experimental/imported-agent-plugins.js](server/endpoints/experimental/imported-agent-plugins.js)):

- `POST /experimental/agent-plugins/:hubId/toggle` → flips `active`.
- `POST /experimental/agent-plugins/:hubId/config` → writes `setup_args.<key>.value`.
- `DELETE /experimental/agent-plugins/:hubId` → `fs.rmSync` the entire folder.

All three ultimately call `ImportedPlugin.updateImportedPlugin()` / `deletePlugin()` in [imported.js](server/utils/agents/imported.js).

---

## 7. Using Your Skill

Once `active: true`, the skill is registered as `@@<hubId>` and made available to the agent via [server/utils/agents/defaults.js](server/utils/agents/defaults.js) (which calls `ImportedPlugin.activeImportedPlugins()`). From the chat UI:

```
@agent what's the weather in Cape Town today?
```

The LLM sees your skill's `description` and `params` and (if the description is written well) picks it. The `examples` in the manifest are injected as few-shot hints, which markedly improves trigger reliability on smaller models.

---

## 8. Debugging Checklist (when it doesn't appear or fails)

1. **Skill not shown in admin UI?**
   - Folder name must equal `hubId`.
   - `plugin.json` must parse — the loader uses `safeJsonParse` and silently skips on failure.
   - `schema` must be `"skill-1.0.0"` and `imported` must be literally `true`.
   - Folder must actually be under `server/storage/plugins/agent-skills/` (in dev). `isWithin()` at [imported.js:44-48](server/utils/agents/imported.js#L44-L48) rejects anything outside.

2. **Shown but the LLM never calls it?**
   - `active` is `false`.
   - `description` is vague — rewrite it as an explicit trigger (e.g. "Use when the user asks about X").
   - Param descriptions are empty; add one per param.
   - Add an `examples` entry that matches the target prompt shape.
   - Try explicitly: `@agent use the weather-lookup tool to check …`.

3. **Handler crashes?**
   - Check the server console — `this.logger` output lands there.
   - The loader hot-reloads `handler.js` per call, so no restart is needed between edits. You *do* need a fresh agent session between `plugin.json` edits.
   - Syntax errors in `handler.js` throw at `require()` time — you'll see them on the next agent invocation.

4. **`this.runtimeArgs` is empty?**
   - Did you configure values in the admin UI? Otherwise only `setup_args.<key>.default` is used.
   - Required args without a `value` log a warning and are **skipped**, not rejected — your handler will see `undefined` for them. Defensive-check at the top of the handler.

5. **Works in dev, broken in prod?**
   - `STORAGE_DIR` not set (or different) — the loader resolves to a different folder. In this fork, storage is on Azure Files, so confirm the mount contains your plugin folder.

---

## 9. Suggested Template to Copy

When you start a new skill, copy this skeleton into `server/storage/plugins/agent-skills/<hubId>/`:

**plugin.json**

```json
{
  "active": true,
  "hubId": "<hubId>",
  "name": "<Display Name>",
  "schema": "skill-1.0.0",
  "version": "0.1.0",
  "description": "<What it does and WHEN to call it.>",
  "setup_args": {},
  "entrypoint": {
    "file": "handler.js",
    "params": {
      "example": {
        "description": "<What this param is for.>",
        "type": "string"
      }
    }
  },
  "examples": [
    { "prompt": "<example user prompt>", "call": "{\"example\": \"value\"}" }
  ],
  "imported": true
}
```

**handler.js**

```js
module.exports.runtime = {
  handler: async function (params) {
    this.introspect?.(`Running ${this.name}…`);
    try {
      // TODO: real work
      return `Done. You passed: ${JSON.stringify(params)}`;
    } catch (err) {
      this.logger?.(`[${this.name}] ${err.message}`);
      return `Skill failed: ${err.message}`;
    }
  },
};
```

Rename `<hubId>` in the folder and in the manifest to match. Restart the server. Done.
