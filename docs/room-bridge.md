# Future decompdecomp “decompile together” browser worker

This POC is deliberately disconnected from the running app. No existing app auth tokens are reused, no localhost scanning occurs and no network protocol has been silently added to the desktop app.

## Boundary

```
Room host → authorized task → browser worker → candidate proposal → host's existing judge
                                      ↕
                              user's local ROM
```

The browser does the compile work. The host owns project state, leases, attribution, compiler settings and acceptance. A browser's `localExact: true` is advisory, never a way around the normal judge.

## Task envelope to add next

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

This requires an explicit decompdecomp API addition, not merely pointing this page at `/api/`. No such app change is part of this repository.
