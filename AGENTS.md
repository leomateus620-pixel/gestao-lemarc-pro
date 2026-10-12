# Project rules

- Auth calls on the login page and app gates go through `withTimeout` (src/lib/auth), and every signOut uses scope 'local'. Why: this stops endless loading screens on phones and keeps other devices signed in.
- The saved login is only cleared on a definitive server rejection (`classifyAuthError` in src/lib/auth/sessionPolicy), when the max age since the last login is reached, or when the user taps sign out / clear session — never on timeout, offline or 5xx. Why: field technicians with bad signal must stay signed in.
