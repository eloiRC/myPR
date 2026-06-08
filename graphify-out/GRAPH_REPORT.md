# Graph Report - .  (2026-05-26)

## Corpus Check
- Corpus is ~42,979 words - fits in a single context window. You may not need a graph.

## Summary
- 238 nodes · 254 edges · 24 communities (19 shown, 5 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Backend API Worker|Backend API Worker]]
- [[_COMMUNITY_Frontend Vue App|Frontend Vue App]]
- [[_COMMUNITY_Backend Package Config|Backend Package Config]]
- [[_COMMUNITY_Frontend Node TSConfig|Frontend Node TSConfig]]
- [[_COMMUNITY_System Architecture Docs|System Architecture Docs]]
- [[_COMMUNITY_Chatbot Component|Chatbot Component]]
- [[_COMMUNITY_Frontend Package Config|Frontend Package Config]]
- [[_COMMUNITY_Frontend Dev Dependencies|Frontend Dev Dependencies]]
- [[_COMMUNITY_Backend Root TSConfig|Backend Root TSConfig]]
- [[_COMMUNITY_ChatGPT Service|ChatGPT Service]]
- [[_COMMUNITY_Frontend App TSConfig|Frontend App TSConfig]]
- [[_COMMUNITY_Auth Service|Auth Service]]
- [[_COMMUNITY_Routes Configuration|Routes Configuration]]
- [[_COMMUNITY_App Icons and Assets|App Icons and Assets]]
- [[_COMMUNITY_BuscadorSelect Component|BuscadorSelect Component]]
- [[_COMMUNITY_SerieItem Component|SerieItem Component]]
- [[_COMMUNITY_Frontend Root TSConfig|Frontend Root TSConfig]]
- [[_COMMUNITY_VS Code Extensions|VS Code Extensions]]
- [[_COMMUNITY_Worker Type Definitions|Worker Type Definitions]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `compilerOptions` - 10 edges
3. `MyPR Frontend (Vue 3 SPA)` - 9 edges
4. `scripts` - 7 edges
5. `compilerOptions` - 7 edges
6. `MyPR Backend (Cloudflare Worker)` - 7 edges
7. `ChatGPTService` - 5 edges
8. `useAuthStore` - 5 edges
9. `scripts` - 4 edges
10. `getToken()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `Vue.js Logo SVG` --conceptually_related_to--> `MyPR Frontend (Vue 3 SPA)`  [INFERRED]
  mypr-fr/src/assets/vue.svg → mypr-fr/index.html
- `MyPR Application` --references--> `MyPR Backend (Cloudflare Worker)`  [INFERRED]
  README.md → DEPLOY.md
- `MyPR Application` --references--> `MyPR Frontend (Vue 3 SPA)`  [INFERRED]
  README.md → mypr-fr/index.html
- `MyPR Application` --references--> `Training Log Data (Exercise Series Records)`  [INFERRED]
  README.md → edit_result.txt
- `MyPR Backend (Cloudflare Worker)` --shares_data_with--> `MyPR Frontend (Vue 3 SPA)`  [INFERRED]
  DEPLOY.md → mypr-fr/index.html

## Hyperedges (group relationships)
- **Cloudflare Deployment Architecture** — mypr_backend, mypr_frontend, cloudflare_workers, cloudflare_pages, cloudflare_d1 [EXTRACTED 1.00]
- **API Communication Between Frontend and Backend** — mypr_backend, mypr_frontend, jwt_auth, cors_config [INFERRED 0.85]
- **Bot Icon Variants** — bot_svg, bot_accent_png, bot_light_grey_png [INFERRED 0.85]
- **Frontend Asset Collection** — bot_svg, bot_accent_png, bot_light_grey_png, vue_logo_svg, mypr_frontend [EXTRACTED 1.00]

## Communities (24 total, 5 thin omitted)

### Community 0 - "Backend API Worker"
Cohesion: 0.06
Nodes (41): app, Bindings, chat, chatConfig, chatHistory, data, exercisesListString, fromIdx (+33 more)

### Community 1 - "Frontend Vue App"
Cohesion: 0.09
Nodes (13): requireAuth(), router, app, pinia, useAuthStore, formatearTexto(), guardarNuevoEjercicio(), NuevoEjercicio (+5 more)

### Community 2 - "Backend Package Config"
Cohesion: 0.09
Nodes (22): dependencies, @google/generative-ai, hono, @hono/zod-validator, jose, openai, @tsndr/cloudflare-worker-jwt, zod (+14 more)

### Community 3 - "Frontend Node TSConfig"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 4 - "System Architecture Docs"
Cohesion: 0.15
Nodes (17): Bot Accent PNG Icon, Bot Light Grey PNG Icon, Bot SVG Icon, Cloudflare D1 Database, Cloudflare Pages, Cloudflare Workers, CORS Configuration, Custom Domain (+9 more)

### Community 5 - "Chatbot Component"
Cohesion: 0.15
Nodes (12): botMsg, currentTraining, decoder, eventData, firstUserIndex, history, lines, { messages: savedMessages, isFirstMessage: savedIsFirstMessage } (+4 more)

### Community 6 - "Frontend Package Config"
Cohesion: 0.17
Nodes (11): dependencies, vue, vue-router, name, private, scripts, build, dev (+3 more)

### Community 7 - "Frontend Dev Dependencies"
Cohesion: 0.17
Nodes (12): devDependencies, chart.js, pinia, postcss, terser, typescript, vite, vite-plugin-pwa (+4 more)

### Community 8 - "Backend Root TSConfig"
Cohesion: 0.18
Nodes (10): compilerOptions, jsx, jsxImportSource, lib, module, moduleResolution, skipLibCheck, strict (+2 more)

### Community 9 - "ChatGPT Service"
Cohesion: 0.22
Nodes (6): if(), ChatGPTPayload, ChatGPTService, ChatMessage, EntrenoData, getToken()

### Community 10 - "Frontend App TSConfig"
Cohesion: 0.20
Nodes (9): compilerOptions, noFallthroughCasesInSwitch, noUncheckedSideEffectImports, noUnusedLocals, noUnusedParameters, strict, tsBuildInfoFile, extends (+1 more)

### Community 11 - "Auth Service"
Cohesion: 0.29
Nodes (6): authService, LoginData, LoginResponse, RegisterData, RegisterResponse, UserInfo

### Community 12 - "Routes Configuration"
Cohesion: 0.40
Nodes (4): exclude, include, routes, version

### Community 13 - "App Icons and Assets"
Cohesion: 0.50
Nodes (5): mypr-fr Application, PWQ App Icon 192x192, PWQ App Icon 512x512, Trophy Icon, Vite Logo

## Knowledge Gaps
- **140 isolated node(s):** `name`, `dev`, `deploy`, `deploy-front`, `update-db` (+135 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `Frontend Dev Dependencies` to `Frontend Package Config`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `if()` connect `ChatGPT Service` to `Chatbot Component`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `MyPR Frontend (Vue 3 SPA)` (e.g. with `MyPR Application` and `MyPR Backend (Cloudflare Worker)`) actually correct?**
  _`MyPR Frontend (Vue 3 SPA)` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `dev`, `deploy` to the rest of the system?**
  _140 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Backend API Worker` be split into smaller, more focused modules?**
  _Cohesion score 0.06207482993197279 - nodes in this community are weakly interconnected._
- **Should `Frontend Vue App` be split into smaller, more focused modules?**
  _Cohesion score 0.08831908831908832 - nodes in this community are weakly interconnected._
- **Should `Backend Package Config` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._