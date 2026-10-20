# Habbit — email sign-in

Passwordless email sign-in is implemented. See the current auth section below; the original architecture notes follow.

## App

Habbit is a single-habit accountability app for iOS, Android and web. Users choose a habit and schedule, connect a Telegram witness group, take camera-only photo proof, and let the group vote. The app tracks progress, deadlines and shame messages. Keep its existing dark navy/violet design and very short onboarding. The goal is to launch it free for users, without subscriptions.

## How it is built

- TypeScript, Expo SDK 57, React Native 0.86, Expo Router.
- HeroUI Native + Uniwind for UI; Zustand + AsyncStorage for local state.
- Expo Camera for proof, Expo Notifications for reminders.
- Main screens: `app/(tabs)/index.tsx`, `app/(tabs)/progress.tsx`, `app/camera.tsx`.
- State and logic: `lib/habbit-store.ts`, `lib/habbit-engine.ts`, `components/HabbitRuntime.tsx`.

## Existing backend

Bilt Cloud is already connected, with PostgreSQL, auth and Deno edge functions. The app uses `@biltme/backend` (Supabase-compatible API) through the existing `bilt` client in `lib/bilt.ts`. Do not create a second client.

The app now starts with **email + 6-digit code**. Existing anonymous sessions are upgraded with `updateUser({ email })` and `verifyOtp` (`email_change`), retaining the UUID. If the email is registered, it falls back to ordinary `signInWithOtp` / `verifyOtp` (`email`) without revealing the conflict or transferring Telegram ownership. Fresh installs do not create anonymous accounts. Habit settings and progress stay in AsyncStorage and are not cloud-synced.

## Current auth implementation

- `app/signin.tsx`: EN/RU email and code entry, paste/autofill, auto-submit, 60-second timestamp-based resend UI. Bilt's default server OTP limits apply; no custom attempt limits.
- `components/AuthRuntime.tsx` and the root protected stack: persisted-session bootstrap, auth event subscription, profile creation/update, same-account Telegram connection recovery, and signed-out runtime suspension.
- `public.profiles`: owner-only SELECT/INSERT/UPDATE, guests blocked. RLS reads verified with two existing IDs under authenticated claims and guest/logged-out claims. Five Telegram owner foreign keys now cascade when an auth user is deleted.
- `account-context`: new authenticated, read-only server function returns only the caller's connection/code. It prevents a new device's fresh setup code from being interpreted as a connection reset. Existing Telegram functions/webhook are unchanged.
- `delete-account`: new authenticated function verifies the caller with `auth.getUser(token)` and deletes only that auth user with `auth.admin.deleteUser`. Foreign keys cascade profile and Telegram-owned rows. Already-posted Telegram content remains.
- `components/AccountActions.tsx`: local-device logout (keeps progress) and confirmed deletion (removes that account's local progress/session and cancels reminders), available during setup and alongside Reset app.
- Switching identities archives the previous account's `habbit.v1` under `habbit.account.<uuid>` and restores the destination account's own archive or starts fresh. No Telegram ownership merge. Deleting one account leaves another account's archive untouched.
- `app/terms.tsx` and `app/privacy.tsx` are placeholder legal pages; replace with real legal text before release.
- Real email delivery, anonymous upgrade, registered-email fallback, cross-device login, native autofill, and destructive deletion need end-to-end testing with accounts controlled by the app owner.

Telegram uses one shared bot with its token stored only on the server. The authenticated `telegram` function checks each user's group/message permissions. The secret-validated `telegram-events` webhook routes events into per-user inboxes; the app pulls its own events. Pairing codes expire. Multiple habits belonging to the same account can share one group; proof messages and voting remain habit-specific. Telegram messages highlight the habit and scheduled time with the owner's device timezone.

Existing tables include `telegram_connections`, `telegram_pairings`, `telegram_inbox`, `telegram_messages`, `telegram_webhook_config` and legacy `telegram_bot_access`. Connection/event data is accessed through server functions; protected tables are not generally client-readable. Schema types are generated in `lib/database.types.ts`—do not edit them manually. Inspect the live schema and deployed functions before changing them; their source is not stored in this repository.

Relevant integration files: `lib/telegram.ts`, `lib/habbit-connection.ts`, `lib/bilt.ts`.

## Future scope

Cloud habit/progress sync and Telegram sign-in/linking are not part of this implementation. Preserve the existing email flow, anonymous upgrade identity and per-account Telegram ownership when adding them.

Keep secrets server-side and enforce user isolation on every read/write. Use the auth service's users, not a custom password/user store. Confirm the backend choice before replacing any existing integration. Photo storage in the app is not yet agreed; proof is currently sent to Telegram.

Known gaps: no cross-device habit sync; scheduled deadline/shame delivery while the app is closed is not implemented. Permanent auth alone will not solve background scheduling. No payment integration is needed.
