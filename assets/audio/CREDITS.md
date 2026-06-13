# Audio Credits

## 常驻调查 BGM

- Intended track: "Dark Ambient Background Mystery" by Lilliben
- Source: https://pixabay.com/music/ambient-dark-ambient-background-mystery-365195/
- License: Pixabay Content License, per the source page.
- Implementation note: the Pixabay MP3 download endpoint is Cloudflare-protected from this local environment. The BGM system keeps this track documented as the intended ambient layer and uses a local WebAudio dark-ambient fallback, with "Signal to Noise" as the remote audio fallback until the Pixabay MP3 can be downloaded and committed locally.

## 真相 / 归档

- Track: "Signal to Noise" by Scott Buckley
- Source: https://www.scottbuckley.com.au/library/signal-to-noise/
- License: Creative Commons Attribution 4.0 International (CC BY 4.0)
- Attribution: Music by Scott Buckley, released under CC BY 4.0.
- Implementation note: a local WebAudio fallback remains active until the remote MP3 actually starts playing, so browser autoplay and network failures do not leave the game silent.

## NVR / 北桥 / 隐藏线

- Track: "The Old Ones" by Scott Buckley
- Source: https://www.scottbuckley.com.au/library/the-old-ones/
- License: Creative Commons Attribution 4.0 International (CC BY 4.0)
- Attribution: Music by Scott Buckley, released under CC BY 4.0.
