# Toolchain provenance and notices

This project reuses existing WASM ports; it does not claim authorship of GCC, binutils, their compatibility patches, or Emscripten's generated runtime.

Only the five listed modules are staged into the application; unrelated package tools are not shipped in `dist/`.

| Tools | Package pin | Upstream |
|---|---|---|
| `cpp`, `cc1` | `romdev-toolchain-decomp-gcc@0.1.0` | [decompals/mips-gcc-2.7.2](https://github.com/decompals/mips-gcc-2.7.2), commit `43d1cdb67ed135879869b5266f01efaaada5e35a` |
| `as` | same | [decompals/mips-binutils-2.6](https://github.com/decompals/mips-binutils-2.6), commit `54514ded39ceb32165a125ddba04ca5b551773a2` |
| `ld`, `objcopy` | `romdev-toolchain-mips-gcc@0.1.3` | GNU binutils 2.46.0, target `mips-linux-gnu` |

GCC 2.7.2 and binutils 2.6 are GNU GPL version 2 or later. Binutils 2.46 is GNU GPL version 3 or later. GNU copyright notices and license terms remain applicable. App licensing does not alter the licenses of compiler output. See `LICENSE` (GPL3) and `licenses/GPL-2.0.txt`.

## Corresponding sources and build recipes

The pinned romdev source used for this POC's build provenance is [monteslu/romdev at 3bc339e1c381adfb4e53b66138d9284dfcd53a28](https://github.com/monteslu/romdev/tree/3bc339e1c381adfb4e53b66138d9284dfcd53a28).

Within `packages/romdevtools/scripts/`:

- `versions.json`: upstream commit/tarball pins.
- `build-decomp-gcc.sh kmc`: native generators followed by Emscripten replay for GCC and assembler.
- `patches/kmc-gcc-2.7.2-wasm.patch`: Emscripten compatibility and explicit driver spawning hook.
- `patches/kmc-binutils-2.6-wasm.patch`: reference-host-compatible obstack/fragment layout.
- `emcc-replay.mjs`: recompiles the logged build commands with Emscripten.
- `build-mips-linux-binutils-wasm.sh`: WASM linker/objcopy build.

The upstream recipes use Emscripten 4.0.18. This application consumes their pinned published artifacts and records exact binary hashes in `docs/toolchain-lock.json`; `npm ci` also verifies npm package integrity using the lockfile. Rebuilding tools from source can require a compatible Linux build environment and GNU build utilities; running this POC does not.

Our only generated-glue modification is the explicit `process` facade binding in `scripts/stage-tools.mjs`. The compiler/assembler/linker WASM bytes are unchanged. The complete application adapter source and staging script are in this repository.

Runtime dependencies include memfs (Apache-2.0), path-browserify and buffer (MIT), and Emscripten runtime portions under their upstream MIT/NCSA terms. Vite, Playwright and build polyfills retain their package licenses. Package metadata contains the complete dependency inventory. The mixed-license romdev npm package also contains unrelated tools (including AGPL tools); those files are neither loaded nor copied into this POC's build.
