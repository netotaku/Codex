# RSS catalogue audit

Checked 10 November 2026.

The catalogue contains 202 entries with verified RSS URLs, representing 197 distinct feeds. The original audit filled 173 blank URLs and corrected 19 existing URLs. The 20 unresolved entries below have now been removed from the active catalogue.

URLs were discovered through Apple Podcasts, fyyd, publisher subscription pages, and published OPML directories, then fetched and parsed as RSS. Exact-title matches were reviewed for aliases and unrelated shows. The machine-readable results are in [feed-validation.json](feed-validation.json). This confirms feed availability, not browser CORS support, media playback, or continued publication.

## Removed entries

These entries were removed because no unique public feed with episodes was verified. They are retained here as an audit history. The loader reads only the RSS URLs in the active catalogue and performs no title searches.

| Catalogue entry | Finding |
| --- | --- |
| The Sample Lounge | A show hosted by Olu Femi is referenced publicly, but no public RSS endpoint was verified. |
| The Art of the Mix | Searches found a Mixcloud series, but no uniquely matching public podcast RSS. |
| NTS Radio | The public NTS 2020 SoundCloud RSS exists but contains no episodes. No populated station-wide podcast feed was verified. |
| The Craig Charles Funk and Soul Show | BBC music radio programme; no public podcast RSS for the full programme was verified. |
| The Huey Show | BBC music radio programme; no public podcast RSS for the full programme was verified. |
| The Jazz Show with Jamie Cullum | BBC music radio programme; no public podcast RSS for the full programme was verified. |
| The Funk and Soul Show | Ambiguous title: no publisher or host is provided to select a unique show. |
| The Scratch DJ Academy Podcast | No public podcast feed matching this title was verified. |
| The Story of Hip-Hop | Ambiguous title: search results contain multiple different hip-hop history shows. |
| The Producer's Podcast | Ambiguous title: multiple unrelated production podcasts use similar names. |
| The Drum and Bass Radio Show | Generic title: no publisher or host is provided to select a unique show. |
| Alpha Rhythm Drum and Bass Podcast | The public Alpha Rhythm SoundCloud RSS contains no episodes; a podcast series under this name was not verified. |
| The Liquid Drum and Bass Podcast | Several similarly named mix series exist; no unique match was verified. |
| Hospitality Podcast | Could refer to Hospital Records (already listed), or an unrelated hospitality-industry podcast. No distinct music feed verified. |
| DJcity Podcast | DJcity publishes mixes, but no current public RSS matching this catalogue entry was verified. |
| The World at One | BBC Radio 4 programme; no public podcast RSS matching the full programme was verified. |
| The MeidasTouch Network | Publisher/network rather than a uniquely identified podcast. The MeidasTouch Podcast is already listed. |
| The Mozilla Podcast | Publisher label rather than a unique show name; Mozilla has published IRL and other podcasts. |
| The Adam Curtis Podcast | No standalone podcast under this title was verified; search results were guest appearances on other shows. |
| The Infinite Monkey Cage Extras | No separate Extras feed was verified. The main Infinite Monkey Cage podcast is already listed. |

## Shared feeds and changed titles

The catalogue names are preserved. Entries sharing a verified URL are grouped once for tab counts and fetching:

- The Good Liars Tell the Truth, The Good Liars Podcast
- Off Menu, The Off Menu Podcast
- The Guardian Long Read, The Long Read
- Decoder with Nilay Patel, The Verge Decoder
- Curious Cases, The Curious Cases of Rutherford and Fry

- Worldwide FM resolves to its public **New Music Worldwide Mix Series BETA** archive, not a feed of all station broadcasts.
- The New Statesman Podcast now identifies itself as **The Politics Show** in its RSS.
- The Science Hour now identifies itself as **Unexpected Elements** in its RSS.
- The Curious Cases of Rutherford and Fry and Curious Cases share the current **Curious Cases** feed.

## Recheck

Run `python3 scripts/check-feeds.py` to fetch and validate the saved URLs again. Use `--report /tmp/feed-check.json` to save the results without overwriting this curated audit.
