export async function listVideoInputDevices(): Promise<MediaDeviceInfo[]> {
  if (typeof navigator === "undefined") {
    return [];
  }

  const mediaDevices = navigator.mediaDevices;
  if (!mediaDevices?.enumerateDevices) {
    return [];
  }

  const devices = await mediaDevices.enumerateDevices();
  return devices.filter((device) => device.kind === "videoinput");
}

export class CameraController {
  private stream: MediaStream | null = null;

  constructor(private readonly video: HTMLVideoElement) {}

  async start(deviceId?: string): Promise<MediaStream> {
    this.stop();

    const mediaDevices = typeof navigator === "undefined" ? undefined : navigator.mediaDevices;
    if (!mediaDevices?.getUserMedia) {
      if (typeof window !== "undefined" && !window.isSecureContext) {
        throw new Error("모바일 카메라는 HTTPS 또는 localhost 주소에서만 사용할 수 있어요.");
      }

      throw new Error("이 브라우저에서 카메라 API를 사용할 수 없어요.");
    }

    const videoConstraints: MediaTrackConstraints = {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: "user",
    };

    if (deviceId) {
      videoConstraints.deviceId = { exact: deviceId };
    }

    const stream = await mediaDevices.getUserMedia({
      audio: false,
      video: videoConstraints,
    });

    try {
      this.video.srcObject = stream;
      await this.video.play();
      this.stream = stream;
    } catch (error) {
      for (const track of stream.getTracks()) {
        track.stop();
      }

      this.video.srcObject = null;
      throw error;
    }

    return stream;
  }

  stop(): void {
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
    }

    this.stream = null;
    this.video.srcObject = null;
  }
}
