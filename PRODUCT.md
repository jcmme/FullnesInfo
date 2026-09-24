# Product

## What it is

Fuellness is a single-user personal growth panel. It exists because the owner saves clips on Instagram and never finds them again. The core loop:

1. **Capture**: type the name of a clip (or share it from iOS) and the app finds the original long-form video on YouTube (also books via Open Library and podcasts via Apple Podcasts), with thumbnail, duration and chapters.
2. **Consume and reflect daily**: every day before the cutoff (2:30 AM, adjustable in Ajustes), log what you consumed; the words of all the day's notes add up to the goal (50 by default), and today's notes can be reopened and continued. Long videos are tracked by resume position and chapters.
3. **Consequence**: a missed day spins a roulette of physical punishments (push-ups, squats, walking distance…), escalating with consecutive misses and with unpaid punishments.
4. **Discovery**: a daily mystery box reveals one nourishing topic (not trivia) to research, and the topics you pick for yourself get a researched sheet of their own: curious facts with sources, a timeline, the words you need, and what to read or watch next.
5. **Honesty**: every note is reviewed against the material it claims to be about. Filler (keyboard mash, one sentence repeated, a note copied from another one the same day) does not count toward the day, with one tap to appeal. Off-topic or copied-from-the-source notes count but say so, and show what the topic sheet says that you did not mention.

## Audience and scene

One person, Spanish-speaking (Mexico), on iPhone first, plus iPad and Mac. Used in two moments: a quick morning check after the 8:15 AM reminder, and a late-evening logging session before the 2:30 AM cutoff, often in bed in low light. Occasional workout sessions with the phone nearby while doing sets.

## Platform

Web app installed as a PWA from Safari. Must feel native on iOS: tab bar, safe areas, 44pt targets, system font for UI, light and dark following the system.

## Surfaces and modes

All app surfaces are **Operate**. Delight is concentrated in four authored moments: the day rings filling on Hoy, the mystery box opening, the roulette spin (draggable, inherits gesture velocity), and the streak number rolling up when the day is completed.

## Voice

Direct, Mexican Spanish, tú. Honest about consequences without being cruel. Controls name their action. No emojis, no em dashes.

## Where the content comes from

Topic sheets are researched once, verified against real sources and committed as data (`src/data/topic-packs.json`). Nothing is generated at read time: the app serves them with no API key, no quota and no risk of invented facts, and they work offline. Topics without a sheet fall back to the Spanish Wikipedia summary, cached per topic.

The note review is deterministic rules (`src/lib/review.ts`), so saving costs nothing and takes no extra time. The same function is the seam for a language-model review later: if `ANTHROPIC_API_KEY` ever exists, it runs there, after saving.

## Out of scope for v1

Live model review of notes, web push, social features.
