# Habbit — auth agent handoff

Use this context to propose an authentication and user-database plan. Do not implement yet; I will bring your steps back to the app builder.

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

The app currently creates a persisted **anonymous auth session** for Telegram access. There is no permanent-account sign-in UI. Habit settings and progress live locally in AsyncStorage, not in a synced user database.

Telegram uses one shared bot with its token stored only on the server. The authenticated `telegram` function checks each user's group/message permissions. The secret-validated `telegram-events` webhook routes events into per-user inboxes; the app pulls its own events. Pairing codes expire, and each group supports one active habit connection.

Existing tables include `telegram_connections`, `telegram_pairings`, `telegram_inbox`, `telegram_messages`, `telegram_webhook_config` and legacy `telegram_bot_access`. Connection/event data is accessed through server functions; protected tables are not generally client-readable. Schema types are generated in `lib/database.types.ts`—do not edit them manually. Inspect the live schema and deployed functions before changing them; their source is not stored in this repository.

Relevant integration files: `lib/telegram.ts`, `lib/habbit-connection.ts`, `lib/bilt.ts`.

## What I need from you

Propose the sign-in flow, user-owned database tables, access rules, and migration steps for adding recoverable accounts and syncing habits/progress across devices. Prefer email + 6-digit code unless we choose another method. Preserve existing guest data and Telegram ownership; prefer upgrading the anonymous account in place so its user ID stays the same. Explain account conflicts, sign-out behavior and account deletion.

Keep secrets server-side and enforce user isolation on every read/write. Use the auth service's users, not a custom password/user store. Confirm the backend choice before replacing any existing integration. Photo storage in the app is not yet agreed; proof is currently sent to Telegram.

Known gaps: no account recovery or cross-device habit sync; scheduled deadline/shame delivery while the app is closed is not implemented. Permanent auth alone will not solve background scheduling. No payment integration is needed.
