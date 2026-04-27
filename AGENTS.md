\# AGENTS.md



\## Project

Mobile flashcard vocabulary app built with Expo + React Native + TypeScript.



\## Stack

\- Expo

\- React Native

\- TypeScript

\- Expo Router

\- react-native-reanimated

\- react-native-gesture-handler

\- expo-sqlite

\- Supabase

\- TanStack Query



\## Product rules

\- Free: create/edit personal decks, personal study

\- Paid: official vocabulary bundles

\- Access control source of truth: entitlements

\- Local-first: study actions save locally first, sync later



\## Engineering rules

\- Do not call DB directly from screens

\- Use repository/service layers

\- Keep files small and focused

\- Prefer explicit types

\- Avoid large speculative refactors

\- Preserve future support for in-app purchases



\## Verification

Before finishing:

\- run relevant tests

\- run lint

\- run type check

\- summarize changed files

\- explain any incomplete item clearly

\## Local dev server

\- Expo must be started on port 8081 when the user asks to run the app.

\- Use: `npm run start -- --localhost --port 8081`

\- The Codex sandbox cannot open localhost listener ports in this workspace and returns `EPERM`.

\- Therefore, request escalated execution for Expo start commands instead of retrying inside the sandbox.

\- If Expo fails with `ERR_SOCKET_BAD_PORT` and port `65536`, treat it as a sandbox port-listen failure, not an app-code issue.
