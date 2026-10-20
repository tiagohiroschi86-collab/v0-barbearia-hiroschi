# RCA — Deploy run 6a7bc7dc-7b0a-4aaa-94f7-78f0a0c62e31

## Summary
Initial deploy failed at **build_image** (Cloud/Code build, step `builder 5/8`). The frontend dependency install `pnpm i --frozen-lockfile` aborts with **`ERR_PNPM_IGNORED_BUILDS`**. Not a transient error — the build retried 3× and failed identically each time.

## Evidence (build logs, run 6a7bc7dc...)
```
#12 24.12 ✓ Lockfile passes supply-chain policies (verified 15s ago)
#12 24.14 Error: ERR_PNPM_IGNORED_BUILDS
  × installing dependencies
  ╰─▶ Ignored build scripts: @firebase/util@1.15.1, protobufjs@7.6.2, sharp@0.34.5
  help: Run "pnpm approve-builds" to pick which dependencies should be allowed to run scripts.
[RETRY] All 3 attempts failed
ERROR: process "/bin/sh -c ... pnpm i --frozen-lockfile ..." did not complete successfully: exit code: 1
```
Template: `nextjs_mongo_shadcn_base_image` (Next.js, kubernetes frontend). The base image enforces a supply-chain policy that runs pnpm in strict mode (`strict-dep-builds`), so dependencies with **ignored build scripts** become a hard failure instead of a warning.

## Root cause
pnpm (v10+) does not run dependency build/post-install scripts unless they are explicitly approved via `onlyBuiltDependencies`. The app has not approved the three packages that ship build scripts — `@firebase/util`, `protobufjs`, and `sharp` — so under the base image's strict policy the install errors out. `sharp` in particular is Next.js's image-optimization native module and genuinely needs its build approved.

This is an **app-source/config** issue, not a deployment-manifest issue.

## Fix (Code — E1 to apply in the repo, then redeploy)
Approve the flagged build scripts in the **frontend** project. Either:

Option A — add a `pnpm` field to `frontend/package.json`:
```json
{
  "pnpm": {
    "onlyBuiltDependencies": ["@firebase/util", "protobufjs", "sharp"]
  }
}
```

Option B — if the project uses a `pnpm-workspace.yaml`, add there instead:
```yaml
onlyBuiltDependencies:
  - "@firebase/util"
  - protobufjs
  - sharp
```

Commit the change, then redeploy. The approved packages will run their build scripts and the install will complete.

## Notes / not done
- Could NOT reproduce in an eph sandbox — `spawn_eph_pod` failed 3× with an infra error ("pod reached terminal phase Failed before becoming Running"), so the exact package.json/pnpm-workspace.yaml location was not visually confirmed. The fix target (frontend project's pnpm config) is inferred from the standard Next.js layout.
- No manifest override was written: non-farm (Next.js) template with an empty GCS override folder means there is no authoritative base manifest set to safely edit, and fabricating one is disallowed.
- A plain re-run without the source change will reproduce the identical failure.
