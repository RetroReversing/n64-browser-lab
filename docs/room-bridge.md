# Future decompdecomp “decompile together” browser worker

The initial manual bridge is implemented in a separate decompdecomp update. It is disabled until the desktop user creates a pairing code for one exact origin and one project. No existing window/agent auth tokens are reused and no localhost scanning occurs.

## Boundary

```
Room host → authorized task → browser worker → candidate proposal → host's existing judge
                                      ↕
                              user's local ROM
```

The browser does the compile work. The host owns project state, leases, attribution, compiler settings and acceptance. A browser's `localExact: true` is advisory, never a way around the normal judge.

## Future full room task envelope

Version a task as `n64-browser-lab/task-v1`, containing:

- opaque room/project/function identifiers, task ID, single-use nonce, expiry and bounded lease;
- ROM SHA-256, target revision/hash, exact ROM offset/VRAM, function length and architecture;
- compiler ID, exact options, tool binary hashes and preprocessor context;
- approved declarations and symbolic address bindings; initially no includes or arbitrary files;
- a source candidate and explicit result-size/time budgets.

Validate against the locally chosen ROM and displayed project before enabling work. Never fetch a ROM from the host. Do not run an imported command string: tasks select allowlisted compiler options and the fixed pipeline.

## Existing local export

The UI exports `n64-browser-lab/proposal-v1`: compiled source snapshot (not later uncompiled edits), entry function, compile VRAM, selected ROM offset, normalized-ROM SHA-256, target-range SHA-256, candidate SHA-256, byte count, compiler options, external symbol bindings, tool hashes, advisory exact-byte result and `hostRecheckRequired: true`.

It contains no ROM image or target byte range. Source is included intentionally, as the future host needs it to reproduce the candidate. A first integration can manually import this proposal in a separate reviewed app change. Bind a proposal to a host-issued task/nonce/revision before any automated room submission; current exports are not authenticated room messages.

## Transport

Use an explicit host URL/invite and purpose-specific, revocable room capability. Do not expose the app window secret or reuse CLI credentials. A WebSocket or HTTP bridge needs origin checking, pairing, expiry, message-size limits, rate limits and browser CORS/local-network permission handling. HTTPS pages and localhost/private-network endpoints have browser-specific mixed-content and permission constraints; test the chosen transport rather than assuming existing desktop room endpoints can be called unchanged.

## Host acceptance

1. Validate capability, nonce, lease, scope, compiler pin and all target/context revisions.
2. Re-derive ROM-offset/VRAM mapping and target bytes from the host's own game.
3. Compile with the host's configured original toolchain and invoke its unchanged exact judge.
4. Retain only independently verified improvements; never trust submitted percentages, ELF bytes or hashes as proof.
5. Record original attribution and provenance; reject stale tasks and enforce one result per lease.

Full room support still needs a separate room/lease adapter. The initial implementation uses the narrow API below, not the general `/api/` surface.

## Implemented manual local API

Desktop window only: `POST /api/browser-bridge/authorize` creates a five-minute one-use code for `{slug, origin}` or revokes all capabilities for `{action: "revoke", slug}`.

Approved-origin CORS endpoints, all POST with JSON:

- `/api/browser-bridge/pair`: exchange `{code}` for a separate one-hour project capability.
- `/api/browser-bridge/functions`: list up to 100 unclaimed open functions using `{search}`.
- `/api/browser-bridge/task`: fetch `{functionId}`; one active task per capability, five-minute expiry, no editing-time claim.
- `/api/browser-bridge/submit`: consume `{taskId, source}` once and start independent native host judging.
- `/api/browser-bridge/result`: poll `{job}`; only that capability’s latest job is readable.

All except pairing require `Authorization: Bearer <capability>`. It is never placed in a URL, localStorage, exported proposal or log. The existing private API retains its window-only guard. No wildcard CORS is added.

The host snapshots target/name/offset, context and compiler settings when issuing a task, then checks them before compilation and again inside the existing recording transaction. Claimed functions are rejected; stale or revoked work cannot publish progress. Native exact matching remains authoritative. The client sends source only, never its ROM or a binary to be trusted.

Initial constraints: local KMC ROM mode, at most 16 KiB target code / 128 KiB source or context / 256 KiB task, 320 KiB requests, 30 submissions per capability, one running submission per capability. HTTP transport is restricted to explicit loopback URLs in this client. Hosted-site/remote-room transport, task leases, richer preprocessing and other compiler profiles are future work.
