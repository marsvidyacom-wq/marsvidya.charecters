import { describe, expect, it } from "vitest";
import { getVoiceCapability } from "./browser-capabilities";
import type { WindowLike } from "./browser-capabilities";

function supportedWindow(): WindowLike {
  return {
    navigator: {
      mediaDevices: {
        getUserMedia: async () => ({}) as MediaStream,
      },
    },
    MediaRecorder: class {},
  };
}

describe("browser voice capability", () => {
  it("reports_supported_when_all_required_browser_apis_exist", () => {
    expect(getVoiceCapability(supportedWindow())).toEqual({ supported: true });
  });

  it("rejects_a_missing_media_devices_api", () => {
    const windowLike = supportedWindow();
    windowLike.navigator = {};

    expect(getVoiceCapability(windowLike)).toEqual({
      supported: false,
      reason: "unsupported-browser",
    });
  });

  it("rejects_a_missing_get_user_media_api", () => {
    const windowLike = supportedWindow();
    windowLike.navigator = { mediaDevices: {} };

    expect(getVoiceCapability(windowLike)).toEqual({
      supported: false,
      reason: "unsupported-browser",
    });
  });

  it("rejects_a_missing_media_recorder_api", () => {
    const windowLike = supportedWindow();
    windowLike.MediaRecorder = undefined;

    expect(getVoiceCapability(windowLike)).toEqual({
      supported: false,
      reason: "unsupported-browser",
    });
  });
});
