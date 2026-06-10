/**
 * Generated backdrops (Higgsfield · Soul Location, 9:16), keyed by scene/beat.
 * Remote URLs for now — the dev sandbox can't reach the CDN to bundle them,
 * but the player's browser loads them fine. Swap to local `img/*.webp` once
 * bundled for offline/iOS.
 */
const CDN = "https://d8j0ntlcm91z4.cloudfront.net/user_39QINnmNmBBiubSSJmkbUn6DLnb";

export const BACKDROPS: Record<string, string> = {
  intro: `${CDN}/hf_20260610_035258_2b9c8fe3-5022-4f63-aa88-1b18ed2c2ea4_min.webp`,
  machine: `${CDN}/hf_20260610_035300_abc5e5e2-5315-4821-9cde-f23512c5a966_min.webp`,
  ascent: `${CDN}/hf_20260610_035301_68ebd0c9-f16d-4a25-af44-3f5cd42eb083_min.webp`,
  crisis: `${CDN}/hf_20260610_040355_4eb44072-46f5-4c6b-a91f-e675a8234c6a_min.webp`,
  body: `${CDN}/hf_20260610_040356_36884a2b-ad63-4232-af9c-79077eb6a237_min.webp`,
  orbit: `${CDN}/hf_20260610_040358_a0d22d08-7ada-4b44-98e5-0734ae077356_min.webp`,
  late: `${CDN}/hf_20260610_040400_c270afe6-05db-411c-bca9-702b072c846d_min.webp`,
  dawn: `${CDN}/hf_20260610_040402_29ae5c61-8b15-4988-a263-59b0b0392c37_min.webp`,
};

/** Which backdrop each ascent phase uses; phases not listed fall back to "ascent". */
export const PHASE_BG: Record<number, string> = {
  4: "crisis",
  6: "body",
  7: "orbit",
  8: "late",
};
