# Sub Timer — Changelog

All notable changes to the app, by version. The in-app "What's New" modal pulls the same data from `CHANGELOG_DATA` in `sub-timer.html`.

---

## v1.7-beta — Jersey numbers

- 🔢 **Per-player jersey number** — small input on each row in the team editor (all sports)
- 🔢 **Displayed on pitch cards + bench rows** at runtime so coaches can call players by number
- 🔢 **Optional** — leave blank for kids without fixed jerseys, no impact
- ☁ New `numbers` JSONB column on cloud `teams` table; merge logic preserves the richer side, same pattern as positions / sides / foots
- 📝 Rename + delete handlers migrate the numbers key alongside everything else

---

## v1.6-beta — Player side + foot preferences

- 🦶 **Per-player side preference** (L / R / Both) — captured in the team editor for soccer teams
- 🦶 **Per-player dominant foot** (L / R / Both) — a right-footer often prefers playing left to cut inside, so we keep these as separate fields
- 🆕 Open any existing team's editor to fill these in — defaults are "Both" so old teams aren't broken
- 🏐 Soccer only — netball positions are fixed by rule, no side concept
- ☁ New `sides` + `foots` JSONB columns on the cloud `teams` table; merge logic preserves the richer side
- 📝 Rename + delete handlers migrate side/foot keys alongside positions

---

## v1.5-beta — Sync hardening + smarter score handling

- 🛡 **Position tags no longer get wiped when syncing across devices** — the cloud merge now preserves whichever side has data
- 🛡 **Players added offline are preserved** on sync — the longer list wins
- 🎯 **Sub strategy + GK settings** are correctly preserved across sync
- ✓ **Tap −1 on the score** to correct a fat-finger goal — match log stays clean (no phantom goals)
- 🏐 **Sport-aware text** on Settings — netball shows "quarters", soccer shows "halves"
- 🏐 **Legacy netball teams** now correctly identified by format (no more soccer ball icon on netball cards)
- 🏷 **Version tag** visible next to the BETA pill (header + landing hero)
- 📐 "Next sub at" time on the game screen — slightly bigger so it's easier to glance
- ✨ **What's New modal** introduced — you're looking at it

---

## v1.4-beta — Undo + reorder + futsal

- ↶ **Undo Last Sub** — instantly reverts a swap, restoring players, minutes, and the match log
- ↕ **Bench reorder chevrons** — promote or demote players in the sub queue (Manual + Equal-time modes)
- ⏱ **Sub strategy chooser moved to Settings** — pick Equal-time, Paired rotation, or Manual before kickoff, not as a post-Start popup
- 🔄 **Paired rotation now balances minutes** — the pair with the most game time goes off, keeping groups together AND minutes fair
- 🕐 **Whole-game continuous sub schedule** — sub cadence flows continuously across both halves rather than restarting each period
- 🥅 **Custom soccer ball icon** with proper pentagon-centre geometry
- 🏐 **Custom netball icon** with proper volleyball-style seam pattern
- ⚽ **Futsal 5v5 format** — 4 outfield + 1 GK, 2-minute hockey-style line rotations, 1-2-1 diamond default
- ☀ **Summer 6v6 format** — 5 outfield + 1 GK, classic 2-2-1 default
- 🎨 **Lucide icon library** replaces all emoji throughout the app
- 🏠 **Tighter home screen** — Start/Edit buttons on every team card, side-by-side New Team + Match History row, floating logo banished
- 🏃 **11v11 default half = 45 minutes** (was 30)

---

## v1.3-beta — Beta release + feedback channel

- 🆕 **BETA badge** + version tag in the header
- 💬 **In-app feedback** channel — writes to a Supabase `feedback` table
- 💡 **Home tips carousel** — feature reminders for returning users
- 🎯 **Tactical tips** per formation
- ☕ **Buy Me a Coffee** tip jar (home + match summary)
- 📲 **PWA home-screen icons** (PNG)
- ⚽ **Scorer picker** when you tag a goal for your team
- 🔔 **Sound-pack picker** — 6 alert sounds (Classic, Whistle, Air Horn, Bell, Retro, Silent)
- ☁ **Match history cloud sync** with sync-state indicator
- 📐 **Sticky header fix** — no more "hanging heading" mid-page
- 📐 **iPad scaling** — app widens to 560/640px on larger screens
- 📋 **Scannable formation pills** with short descriptors

---

## v1.2-beta — Multi-sport core (Netball)

- 🏐 **Netball** added as a second sport (Set, GO, Junior, Open formats)
- 🏐 **Netball court** rendered with thirds + semicircular goal circles
- ⏱ **Quarter Length** / "Minutes per quarter" labels for netball
- 🌅 **Animated 2-3-1 dot logo** — represents subs flowing on/off
- 🆕 **New-user signup hardened** against Supabase duplicate-email race
- ✕ **Abandon-game** button on the game screen
- 🌗 **Light mode** added, then removed (contrast issues)

---

## v1.1-beta — Auth + sync + position tags

- 🔐 **Magic-link sign-in** via Supabase + Resend SMTP
- ☁ **Teams sync** across devices via Supabase Postgres
- 🎯 **Position tags** per player (GK/DEF/MID/WNG/FWD)
- 📷 **AI roster import** via photo (OpenAI gpt-4o-mini vision)
- ⚽ **Same-first-name** disambiguation with last-name initial

---

## v1.0-beta — First public version

- ⏱ Live game clock with sub alerts at scheduled times
- 🔄 Paired-rotation substitution model
- 📊 Per-player playing-time tracking
- 🏃 Manual SUB button + automatic prompts
- 🥅 Goalkeeper choice (1H + 2H)
- 📝 Match log with subs / goals / period boundaries
- 💾 Match history with score, opponent, location

---

## How to update this file

Append a new section at the top when bumping `APP_VERSION` in `sub-timer.html`. Mirror the change list into `CHANGELOG_DATA` near the top of the JS so the in-app **What's New** modal shows the same entries when users open the app on the new version.
