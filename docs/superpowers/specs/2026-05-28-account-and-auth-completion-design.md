# Account And Auth Completion Design

## Objective

Complete the MVP account and authentication layer so Quizzy is more usable in beta and closer to the PRD.

This iteration must provide:

- a basic account page for authenticated creators
- editable profile fields:
  - name
  - company
  - avatar
- password change for credential-based users
- password reset flow using secure tokens and beta-friendly internal delivery
- Google OAuth fully prepared for activation via environment configuration

## Scope

This design covers:

- account management UI inside the dashboard
- user profile data model updates
- password reset token generation and verification
- password change flow for logged-in users
- login and registration UI updates related to Google availability

This iteration does not cover:

- real transactional email delivery
- organization admin roles and user invitations
- account deletion
- multi-factor authentication
- avatar uploads
- full account settings/navigation system

## Recommended Approach

Deliver the account block in two short waves:

1. profile editing and password change
2. password reset and Google activation readiness

Keep the Google provider behind configuration and only expose the UI when:

- `GOOGLE_CLIENT_ID` exists
- `GOOGLE_CLIENT_SECRET` exists

Use a secure token table for password reset and avoid encoding recovery state directly on `users`.

This is the recommended approach because it closes a real product gap without opening extra dependencies such as email infrastructure or media uploads.

## User Experience

### Account page

Introduce:

- `/dashboard/account`

Recommended sections:

1. `Perfil`
2. `Seguranca`
3. `Login social`

This keeps account work discoverable without creating a large settings surface.

### Profile section

Fields:

- `Nome`
- `Empresa`
- `Avatar`

Recommended avatar behavior:

- use a fixed set of predefined avatar options
- no upload in this phase

This keeps the implementation aligned with the existing product language and avoids storage complexity.

### Security section

For users with email/password authentication:

- show current email
- allow password change with:
  - current password
  - new password
  - password confirmation
- show a link or action to start password recovery

For Google-only users:

- do not show password change controls
- show that sign-in is managed through Google when active

### Password recovery flow

Routes:

- `/forgot-password`
- `/reset-password?token=...`

Flow:

1. user submits email on forgot-password page
2. app always returns a neutral success message
3. if the user exists, generate a reset token with expiration
4. store only the token hash in the database
5. log the reset URL internally for beta use
6. user opens reset page from that link
7. app validates token and expiration
8. user defines a new password
9. token becomes unusable after completion

### Google sign-in visibility

Recommended UI rule:

- show the Google sign-in button only when Google credentials are configured
- otherwise keep the UI clean and omit the button entirely

This prevents dead-end actions in production and keeps the feature activation simple.

## Existing Code Alignment

The current codebase already includes:

- credential auth with NextAuth
- Google provider wiring gated by environment variables
- Google user provisioning logic on first sign-in

This iteration should preserve those patterns and extend them rather than replacing them.

Specifically:

- continue using `NextAuth`
- continue using the existing `users` and `organizations` model
- expand account functionality through focused routes, actions, and db tables

## Data Model

### `users` updates

Add fields to `users`:

- `company`
- `avatar`

Recommended types:

- `company`: nullable varchar/text
- `avatar`: nullable varchar

Behavior:

- existing users remain valid with null values
- registration may keep current defaults and let the account page complete the profile later

### `password_reset_tokens`

Introduce a dedicated table:

```ts
password_reset_tokens
- id
- user_id
- token_hash
- expires_at
- used_at
- created_at
```

Recommended rules:

- multiple tokens may exist historically
- only unused and unexpired tokens are valid
- mark token as used immediately after successful reset

Do not store the raw token in the database.

## Authentication Behavior

### Credentials users

These users can:

- sign in with email/password
- change password
- use forgot-password and reset-password
- later optionally link Google in a future iteration

### Google users

These users can:

- sign in through Google when configured
- edit profile fields
- not use local password flows unless a password is explicitly created in a later feature

This iteration should not force hybrid account-linking logic.

## Account Page Behavior

### Profile form

On save:

- validate trimmed name
- validate company length when provided
- validate avatar against allowed values
- persist changes
- revalidate account and dashboard pages as needed

### Password form

On save:

- require current password
- verify current password hash
- require new password confirmation match
- enforce minimum password rule
- overwrite password hash

Recommended minimum password rule for MVP:

- at least 8 characters

This is intentionally simple and sufficient for the current beta stage.

## Password Reset Behavior

### Forgot password request

Input:

- email

Response:

- always show a generic confirmation message such as:
  - `Se o email existir, enviaremos um link de recuperacao.`

If the email exists and the user has a local password flow:

- create a token
- hash it
- insert token row
- log the recovery URL using the web logger

For beta, internal delivery means:

- log the URL in structured logs
- optionally surface it in development output if useful

This avoids email-vendor work while preserving the real flow contract.

### Reset password request

Input:

- token
- new password
- confirm password

Validation:

- token exists
- token hash matches
- token not expired
- token not used

If valid:

- update user password hash
- mark token used
- optionally invalidate older unused tokens for the same user

## Routes And Components

Recommended additions:

- `/dashboard/account`
- `/forgot-password`
- `/reset-password`

Recommended UI components:

- account profile form
- account password form
- avatar picker
- forgot-password form
- reset-password form

Recommended server actions:

- `updateAccountProfile`
- `changePassword`
- `requestPasswordReset`
- `resetPasswordWithToken`

This keeps the behavior close to existing app-router patterns in the repo.

## Logging

Add structured web logs for:

- password reset requested
- password reset link generated
- password reset completed
- password change completed
- invalid reset token attempts

Avoid logging:

- raw passwords
- raw reset tokens
- sensitive session secrets

For reset links in beta:

- log the full URL only in the explicit internal recovery event
- keep that usage temporary until real email delivery exists

## Error Handling

### Forgot password

- never reveal whether the email exists
- always show the same success response

### Reset password

- expired or invalid tokens should show a clear recovery-failed state
- offer a link back to forgot-password

### Password change

- wrong current password should show a specific but safe validation error
- mismatched confirmation should remain a normal form validation error

### Google button

- if Google env vars are absent, the button is simply not rendered
- no placeholder or disabled dead control is needed

## Testing

### Automated

- unit/integration coverage for:
  - password reset token generation and hashing
  - password reset token validation
  - token expiration and used-token rejection
  - password change current-password validation
  - profile update validation

### Manual

- update name/company/avatar
- change password with correct current password
- reject password change with incorrect current password
- request password reset for existing email
- request password reset for non-existing email with same outward response
- complete password reset with valid token
- reject expired token
- confirm Google button visibility toggles with env presence

## Success Criteria

This phase is successful when:

- creators can manage their basic profile without touching the database
- local-auth users can change passwords safely
- password recovery works end to end for beta through secure internal links
- Google sign-in is production-ready and hidden until configured
- the account/auth section of the PRD moves materially closer to complete

## Implementation Notes

Recommended delivery order:

1. schema updates for `users` and `password_reset_tokens`
2. `/dashboard/account` with profile editing
3. password change for authenticated users
4. forgot-password and reset-password flows
5. login/register UI cleanup for Google visibility

This order delivers immediate value early and keeps token-based recovery isolated and testable.
