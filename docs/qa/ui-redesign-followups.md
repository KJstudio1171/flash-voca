# UI Redesign Follow-ups

## Placeholder Features

- Study pronunciation icon is visual-only. Wire it to TTS or audio playback before making it interactive.
- Bundle detail share icon is disabled until a share implementation is added.
- Locked bundle purchase CTA remains disabled until the IAP provider flow is implemented.
- Home study time, streak, and recent activity need a real activity/history data source.
- Store category filtering is title/description based until catalog categories exist in the data model.

## QA Focus

- Check all five tabs on a small Android viewport for label overflow and tab crowding.
- Check Home, Study Hub, Store, and Bundle Detail with empty data and populated data.
- Check Study Session card height, rating buttons, and example box on small screens.
- Check that `/study/[deckId]` remains a session route and `/(tabs)/study/index` remains a hub route.
