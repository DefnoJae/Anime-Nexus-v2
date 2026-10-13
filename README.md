# Anime Nexus v2 — development preview

**Not a playback release.** Version 0.0.1 contains direct catalogue/episode code and shared verification detection. Playback authorization and signed media-segment delivery are not implemented. It cannot play an episode or automatically move to the next episode. It uses a separate extension ID and does not replace the original Anime Nexus provider.

The local resolver URL and localhost helper requests from v1 are absent. This removes that dependency from catalogue code; it does not bypass site verification. A live test on Seanime 3.10.3 on 13 October 2026 returned HTTP 403 challenge HTML for the Nexus catalogue API and site. Catalogue parsing/pagination pass fixture tests, but live catalogue success is not claimed.

[Seanime Verify](https://github.com/DefnoJae/Seanime-Verify) provides challenge detection and clear errors. Installing its diagnostic plugin does not unlock Nexus. Its code is bundled into the provider at development build time.

## Remaining work

1. Establish a supported verification/session path within Seanime. Its browser API currently fails on this PC because it cannot find `google-chrome`; exposed options cannot select installed Edge.
2. Implement and verify playback attestation, persistent socket authorization, and fresh segment-token delivery without a separate helper service. The inspected extension API has no exposed HTTP route registration for replacing v1's HLS gateway.
3. Verify media segments, rendered playback, and the next episode before publishing a playback release.

There is no replacement solver dependency, hidden browser process, cookie export, separate service, or user-side installation included. Human verification may remain necessary, and solving a site challenge does not establish segment authorization.

## Development

Run `node build.cjs` and `node --test tests/provider.test.cjs`. To update shared source, use `node build.cjs ../Seanime-Verify`. Node is used for development, not by installed providers.
