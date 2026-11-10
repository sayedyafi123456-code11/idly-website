# IDLY — Your Code. Your Details.

IDLY is a profile-community website starter with account sign-in, profile discovery, message requests and IDLY AI tools.

## Project files
- `app/`: Next.js website and AI API route
- `lib/supabase.ts`: Supabase client setup
- `supabase/schema.sql`: database tables and access policies
- `.env.example`: environment variable template

## What is needed before it works for everyone
1. Create a Supabase project.
2. Run `supabase/schema.sql` in Supabase → SQL Editor.
3. Add the Supabase project URL and anon key to the hosting environment.
4. Add an OpenAI API key as the server-only variable `OPENAI_API_KEY` to enable IDLY AI.
5. Deploy the repository with Vercel and test sign-up, profiles and messaging.

## Run on your computer
Install Node.js 20+, then run:
```bash
npm install
npm run dev
```
Open http://localhost:3000.

## Security
Never commit real API keys, passwords, or the Supabase service-role key. Use hosting environment variables. The service-role key must never be exposed in browser code.

## Status
The source code is in place as a starter build. Database credentials, AI key, deployment, and a production test are still required before the site is publicly usable.