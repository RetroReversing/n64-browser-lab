# N64 Browser Lab

A standalone proof of concept for loading a local N64 ROM and running **KMC-compatible GCC 2.7.2 → GNU assembler 2.6 → GNU linker 2.46 → byte comparison entirely in the browser**.

The compiler runs in a Web Worker. No compilation service, native subprocess, local decompdecomp installation, API key or AI calls are required. The development server only serves static assets. The ROM is read through the browser file picker and is saved locally in IndexedDB (never uploaded).

## Run

Node 22.12+ (Node 24 recommended):

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:4179**. `dev` stages the pinned WASM modules automatically. For production, `npm run build`, then serve `dist/` over HTTP(S). Do not open `index.html` via `file://`. Static asset paths currently assume hosting at the origin root.

1. Choose your local V-Rally ROM (`.z64`, `.v64`, or `.n64`, uncompressed). Other N64 ROMs can also be inspected.
2. Start with the original, self-contained **Return zero**, **Add**, or **Clamp** C examples, or enter a candidate and its declarations. Set the function identifier and actual link VRAM.
3. Compile. The tool output lists each actual WASM compiler/assembler/linker invocation. The generated ELF can be downloaded.
4. Compare at a known ROM offset, or search for instruction-aligned exact byte occurrences. The selected function's ELF symbol size is used; assembler section padding is excluded.
5. Export a candidate proposal for future host-side rechecking. This downloads JSON locally; it does not submit anything.

**A byte occurrence is not a function identity.** Tiny return stubs repeat throughout games; matching eight bytes does not establish a unique function or prove the surrounding function boundaries. The ROM entry point is only an initial link-address suggestion, not an automatic ROM-to-VRAM mapping. Set the correct VRAM and ROM offset for a real task.

## What has been verified

On Chromium on macOS, the browser-produced bytes matched the installed native KMC-compatible compiler/assembler for five original test functions: return-zero (8 bytes), addition (8), clamp (36), memory loads (16), and a conditional branch (20).

A local V-Rally PAL ROM loaded successfully, and the independently compiled eight-byte return-zero sequence had 16 exact occurrences. This validates local ROM loading and byte comparison, not 16 newly decompiled functions. No ROM bytes or extracted game source are in this repository.

The production browser test uses a **homemade ROM fixture**, verifies exact linked bytes, external call relocation, syntax/link failures, source-bound proposal export, mobile layout and the absence of uploads. These checks run without any commercial game.

```sh
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

For an existing local Chromium, set `BROWSER_EXECUTABLE=/path/to/chrome`. `PLAYWRIGHT_MODULE` may point to an existing Playwright module for local QA.

## How the browser runtime works

The pinned romdev packages contain WebAssembly ports of the decompals KMC-compatible compiler and binutils assembler. Their generated glue targets Node's file APIs. `scripts/stage-tools.mjs` adds a host binding to that glue; `src/host.js` supplies an in-memory filesystem and a deliberately narrow host facade **inside the browser worker**. It cannot spawn native processes or access the real filesystem. The WASM binaries themselves are copied without modification.

The browser runs explicit preprocessing, cc1, assembler, linker and objcopy passes. It does not run GCC's native driver or require its process-spawn hook. `docs/toolchain-lock.json` records module SHA-256 hashes. Source pins, upstream patches and rebuild references are in [THIRD_PARTY.md](THIRD_PARTY.md).

This is a KMC-compatible open-source compiler build, not a redistributed proprietary Nintendo SDK. GCC's emitted MIPS code is the compatibility target. Browser and native hosts can expose differences on inputs beyond the tested corpus; every real candidate still needs its own target-byte check.

## Scope and limitations

- Freestanding **C**, one translation unit, MIPS III, big endian, 32-bit GPR/FPR; `-O0` through `-O3`, `-G0` or `-G8`. No C++ frontend, SDK headers, libraries, include-tree importer, decompiler, function discovery or full-game rebuild yet.
- No standard headers or implicit runtime libraries. Supply declarations in the editor and explicit linker symbols when needed. Undefined references are errors.
- Bytes are extracted for one defined ELF function. This is not a rodata/data/relocation-aware whole-function semantic judge; string tables, jump tables and surrounding dependencies need a fuller task format and host recheck.
- Explicit preprocessor macros approximate this freestanding setup; this is not a full emulation of every GCC driver flag/spec or environment. Branches dependent on other predefined macros need explicit handling.
- ROMs persist locally in IndexedDB; use **Forget saved ROM** to remove them. Source edits and the worker filesystem are still temporary: download proposals before closing. Stop terminates the worker.
- The memory-only host adapter is intentionally limited; it is not Node.js in the browser. The worker's filesystem is not a system filesystem.
- An optional, explicitly paired desktop bridge supports manual KMC ROM tasks and source submission for independent host checking. See [the bridge protocol](docs/room-bridge.md). No automatic room joining or work claims.

## License

App code: GPL-3.0-or-later. Individual third-party tools retain their upstream licenses; see [THIRD_PARTY.md](THIRD_PARTY.md). No ROMs, SDK headers, extracted functions or user credentials are distributed.

## Pair with the desktop app

Requires the matching **browser-worker bridge** update in decompdecomp. The older app does not expose these routes.

1. In desktop **Settings → Pair a browser worker**, select a local KMC ROM project, set the exact browser origin shown by this page (normally `http://127.0.0.1:4179`), and create a code.
2. In this page’s **Connect to decompdecomp**, enter the desktop loopback URL (normally `http://127.0.0.1:6464`) and the code. Press **Pair**. Browser localhost permission may be requested.
3. Load your own matching ROM, choose an open function and press **Fetch task**. The ROM and target-range hashes must match.
4. Edit the function body, **Compile**, then **Submit compiled candidate**. The desktop app recompiles the saved source snapshot with its own toolchain and unchanged judge.
5. Fetch a fresh task after submission. Tasks expire after five minutes and do not reserve a function; if another agent claims or changes it, submission is rejected.

The token is saved in localStorage to reconnect after a browser restart and is scoped to one origin/project for one hour. **Revoke project browser access** in desktop Settings immediately invalidates capabilities, including results still compiling. Restarting the desktop app also invalidates them. Disconnect & forget clears the browser’s saved token; it does not revoke other browsers.

The initial bridge accepts plain C (no source preprocessor directives, assembly or attributes), self-contained host declarations, and an allowlisted KMC flag set including debug levels. Native imports, other toolchains and unrestricted files/commands are unavailable. The browser can still compile standalone examples without pairing.

Linker symbol addresses are passed through the generated linker script, avoiding oversized WASM command-line argument stacks for full project symbol tables.
