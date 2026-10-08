# Notifications function

- Config: secret `MAILGUN_API_KEY` (`firebase functions:secrets:set`). Sends through the EU endpoint from the
  `mg.aerotrips.fr` domain, hardcoded in `src/index.ts`. Subjects start with `[AeroTrips]` in production and
  `[<project id>]` anywhere else (staging, emulator), from the built-in `projectID` param.
- The CI account (`github-action-…`, Secret Manager Viewer) can't grant secret access: the runtime account already
  has `secretAccessor` on `MAILGUN_API_KEY`; a new secret needs that grant by hand
  (`gcloud secrets add-iam-policy-binding`).
