# Aero trips

## Setup
- run `npm i`
- For admin tasks: [download a service account key](https://console.firebase.google.com/project/aero-trips/settings/serviceaccounts/adminsdk) and copy the file as `serviceAccountKey.json` to the root of the project.
- `npm start` to run locally

## Testing
- `npm test`

## Build & deploy
- To test the build `npm run build` and then `npm run preview`
- Pushing to master will trigger the deployment to firebase

## Admin
- `node scripts/manage-edits.js` to review the changes submitted by users
- Add `--apply-all` to skip validation and apply all the changes submitted