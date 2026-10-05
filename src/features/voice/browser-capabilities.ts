export interface WindowLike {
  navigator?: {
    mediaDevices?: {
      getUserMedia?: (...args: never[]) => Promise<MediaStream>;
    };
  };
  MediaRecorder?: unknown;
}

export type VoiceCapability =
  | { supported: true }
  | { supported: false; reason: "unsupported-browser" };

export function getVoiceCapability(_windowLike: WindowLike): VoiceCapability {
  const mediaDevices = _windowLike.navigator?.mediaDevices;

  if (
    typeof mediaDevices?.getUserMedia !== "function" ||
    typeof _windowLike.MediaRecorder !== "function"
  ) {
    return { supported: false, reason: "unsupported-browser" };
  }

  return { supported: true };
}
