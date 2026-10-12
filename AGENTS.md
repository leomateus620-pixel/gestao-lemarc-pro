# Project rules

- Auth calls on the login page and app gates go through `withTimeout` (src/lib/auth), and every signOut uses scope 'local'. Why: this stops endless loading screens on phones and keeps other devices signed in.
