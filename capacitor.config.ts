import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native shell config. Capacitor wraps the built web game (`dist/`) into a
 * real iOS app for TestFlight / App Store — the gameplay code is unchanged.
 * Assets are bundled, so the game runs fully offline on device.
 */
const config: CapacitorConfig = {
  appId: "com.fallen911.wearealreadydead",
  appName: "We Are Already Dead",
  webDir: "dist",
  backgroundColor: "#05060a",
  ios: {
    // Let the canvas paint behind the notch/home-indicator; CSS safe-area
    // insets keep UI clear of them.
    contentInset: "never",
    backgroundColor: "#05060a",
  },
};

export default config;
