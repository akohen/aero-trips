# Image resizer

- Invariants the resizer must keep: carry `firebaseStorageDownloadTokens` through every write (it is
  the secret in every URL already handed out); set the `resizedAt` custom-metadata marker, which is the
  **loop guard** against the write-back re-firing `finalize`; never touch `images/` (served via
  `publicUrl()` + per-object ACL, which an overwrite would drop) or legacy `_WxH` objects.
- **`npm run verify:resize`** drives the resizer against the real staging bucket (token survival,
  generation preconditions, loop guard). Needs staging credentials; cleans up after itself.
- Deploy (by hand, never by the release CI): run `verify:resize`, then
  `npx firebase deploy --only functions:images --project aero-trips`.
