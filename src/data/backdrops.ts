/**
 * Generated narrative backdrops (Higgsfield · Soul Location), keyed by beat.
 * Each set has a portrait (9:16) and, where ready, a landscape (16:9) so wide
 * screens get a real composition instead of a brutal crop. Remote URLs for
 * now; swap to bundled files for offline/iOS later.
 */
const CDN = "https://d8j0ntlcm91z4.cloudfront.net/user_39QINnmNmBBiubSSJmkbUn6DLnb";

export interface BackdropSet {
  /** Portrait 9:16. */
  readonly p: string;
  /** Landscape 16:9, when generated. */
  readonly l?: string;
}

export const BACKDROPS: Record<string, BackdropSet> = {
  intro: {
    p: `${CDN}/hf_20260610_042140_1a19ff97-069c-4e46-b349-9a82aa6b4bd3_min.webp`,
    l: `${CDN}/hf_20260610_042141_d65dadcf-84b9-4e30-aa38-926bbae24ba9_min.webp`,
  },
  machine: {
    p: `${CDN}/hf_20260610_035300_abc5e5e2-5315-4821-9cde-f23512c5a966_min.webp`,
    l: `${CDN}/hf_20260610_042206_c1a45ab9-da96-42da-a7e9-bd8ce24ffd0a_min.webp`,
  },
  ascent: {
    p: `${CDN}/hf_20260610_035301_68ebd0c9-f16d-4a25-af44-3f5cd42eb083_min.webp`,
    l: `${CDN}/hf_20260610_043003_71a499e4-f865-4b00-bbc5-8d9ac94e53b1_min.webp`,
  },
  autonomy: {
    p: `${CDN}/hf_20260610_042959_0c661c71-ee10-4bf1-a79c-b4f2ab4235d1_min.webp`,
    l: `${CDN}/hf_20260610_043001_4895da63-5b31-4d52-a310-f070800b9d90_min.webp`,
  },
  un: {
    p: `${CDN}/hf_20260610_042143_656acfbe-c9f3-461f-b535-a50fe93d4968_min.webp`,
    l: `${CDN}/hf_20260610_042145_095b386a-6d1f-4696-9e2a-de75c15e458f_min.webp`,
  },
  frozen: {
    p: `${CDN}/hf_20260610_042147_464266c2-5115-445c-b4c4-3ea4491500eb_min.webp`,
    l: `${CDN}/hf_20260610_042148_8382888b-d10e-476a-b9ec-fae4374553dd_min.webp`,
  },
  blackbox: {
    p: `${CDN}/hf_20260610_042158_f1db2c7f-ece9-4848-b6ac-b9d8bc8d340f_min.webp`,
    l: `${CDN}/hf_20260610_042200_7315509f-1f28-47e4-9570-561f2432a818_min.webp`,
  },
  crisis: {
    p: `${CDN}/hf_20260610_040355_4eb44072-46f5-4c6b-a91f-e675a8234c6a_min.webp`,
    l: `${CDN}/hf_20260610_042207_41b254af-fe6c-41cb-a45c-624485f018a1_min.webp`,
  },
  body: {
    p: `${CDN}/hf_20260610_040356_36884a2b-ad63-4232-af9c-79077eb6a237_min.webp`,
    l: `${CDN}/hf_20260610_043005_338153b6-d4fd-49b2-850a-7f4eb78063ed_min.webp`,
  },
  orbit: {
    p: `${CDN}/hf_20260610_040358_a0d22d08-7ada-4b44-98e5-0734ae077356_min.webp`,
    l: `${CDN}/hf_20260610_043007_5edf6e0d-6aa8-4617-935d-2a51fdfca15b_min.webp`,
  },
  late: {
    p: `${CDN}/hf_20260610_040400_c270afe6-05db-411c-bca9-702b072c846d_min.webp`,
    l: `${CDN}/hf_20260610_043008_689b9b66-ca9c-475d-b4e2-d3deb2ace671_min.webp`,
  },
  dawn: {
    p: `${CDN}/hf_20260610_040402_29ae5c61-8b15-4988-a263-59b0b0392c37_min.webp`,
    l: `${CDN}/hf_20260610_043009_b39f6d41-2219-486b-8794-5889ffbc365f_min.webp`,
  },
};

/** Which backdrop each ascent phase uses; phases not listed fall back to "ascent". */
export const PHASE_BG: Record<number, string> = {
  1: "un",
  2: "frozen",
  3: "blackbox",
  4: "crisis",
  5: "autonomy",
  6: "body",
  7: "orbit",
  8: "late",
};
