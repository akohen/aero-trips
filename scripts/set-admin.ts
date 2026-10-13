/**
 * Grants (or revokes) the `admin` custom claim, which lets an account review guest changes
 * (firestore.rules `isAdmin()`, the `applyChange` callable in functions/admin/).
 *
 * Usage:
 *   npm run set-admin -- <email>              # staging
 *   npm run set-admin:prod -- <email>
 *   npm run set-admin:prod -- <email> --revoke
 *   npm run set-admin:prod -- --list          # current admins
 *
 * The account must have signed in once. The claim reaches the browser with the next ID token:
 * sign out and back in (or wait up to an hour). Other custom claims are kept.
 */
import admin from 'firebase-admin'
import chalk from 'chalk'
import { projectId } from './firestore-admin.ts'

const args = process.argv.slice(2)
const revoke = args.includes('--revoke')
const email = args.find((arg) => !arg.startsWith('--'))

const listAdmins = async () => {
  let pageToken: string | undefined
  do {
    const page = await admin.auth().listUsers(1000, pageToken)
    for (const user of page.users) {
      if (user.customClaims?.admin === true) console.log(`${user.email ?? '(no email)'}  ${chalk.dim(user.uid)}`)
    }
    pageToken = page.pageToken
  } while (pageToken)
}

const main = async () => {
  if (args.includes('--list')) {
    console.log(chalk.bold(`Admins on ${projectId}`))
    return listAdmins()
  }
  if (!email) {
    console.error('Usage: npm run set-admin[:prod] -- <email> [--revoke] | --list')
    process.exit(1)
  }

  const user = await admin.auth().getUserByEmail(email)
  const otherClaims = { ...user.customClaims }
  delete otherClaims.admin
  await admin.auth().setCustomUserClaims(user.uid, revoke ? otherClaims : { ...otherClaims, admin: true })
  console.log(`${revoke ? chalk.red('Revoked') : chalk.green('Granted')} admin for ${email} (${user.uid}) on ${chalk.bold(projectId)}`)
  if (!revoke) console.log(chalk.dim('Sign out and back in for the claim to reach the browser.'))
}

main().catch((e) => {
  console.error(chalk.red(e.message))
  process.exit(1)
})
