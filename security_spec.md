# Security Specification: Niro Protocol

## Data Invariants
1. **Identity Isolation**: A user can only read or write their own settings and entries.
2. **Family Support Bridge**: A user designated as a `caregiver` for another user (the `supported` user) can read the supported user's entries, provided sharing is active.
3. **Biological Integrity**: Entries must have valid timestamps, types, and values within reasonable physiological bounds.
4. **Immutability**: Once created, the `type` and `id` of an entry cannot be modified.

## The "Dirty Dozen" Payloads (Targets for Rejection)
1. **The Ghost ID**: Writing an entry with a 1MB string as the ID.
2. **The Identity Spoof**: Authenticated as `UserA`, attempting to write to `/users/UserB`.
3. **The Privilege Escalation**: A `supported` user attempting to modify their `familyCircle` to grant themselves `admin` or `caregiver` rights on others' data.
4. **The Time Warp**: Writing an entry with a `timestamp` set in the year 3000.
5. **The Type Injection**: Adding a custom field `isHack: true` to an entry.
6. **The Range Overload**: Setting a `glucoseCeiling` to -1 or 1,000,000.
7. **The Caregiver Bypass**: Authenticated as a user NOT in the family circle attempting to read data.
8. **The Immutable Break**: Updating an existing entry's `type` from `glucose` to `meal`.
9. **The Orphaned Entry**: Writing an entry before the parent user document exists.
10. **The PII Leak**: A non-owner attempting a blanket query for all user emails.
11. **The Denial-of-Wallet**: Writing an array of 50,000 alerts.
12. **The State Shortcircuit**: Setting `cgm.isConnected` true without a valid `provider`.

## Test Runner: firestore.rules.test.ts
(This file would use the `@firebase/rules-unit-testing` framework to verify the above payloads are denied.)
