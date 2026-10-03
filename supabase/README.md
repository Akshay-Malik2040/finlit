# Supabase deployment

The existing `backend/` Express/Mongo service remains available. This directory is the production-ready Supabase replacement with the same room, expense, settlement, and recurring-expense HTTP contract used by both clients.

1. Install and authenticate the [Supabase CLI](https://supabase.com/docs/guides/cli), then link your project: `supabase link --project-ref <project-ref>`.
2. Apply the schema: `supabase db push`.
3. Deploy the API: `supabase functions deploy api --no-verify-jwt`.
4. Configure the clients as below. Do **not** put the service-role key in either client; the Edge Function receives it securely from Supabase.

## Client environment

Web (`frontend/.env.production`):
```env
VITE_API_URL=https://<project-ref>.supabase.co/functions/v1/api
```

React Native mobile: set `SPLITSENSE_API_URL` in your build environment to the same URL. It has an emulator fallback for local Express development.

Native Android: build with `./gradlew :app:assembleRelease -PSPLITSENSE_API_URL=https://<project-ref>.supabase.co/functions/v1/api/`. This is compiled into the app's `BuildConfig`; the release URL must use HTTPS.

Before shipping, set the allowed origins in the Edge Function's `cors` constant to your deployed web domain(s). The function is intentionally a server-side gateway: PostgREST tables have RLS enabled and no direct client policies.
