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

    const mediaDevices = navigator.mediaDevices;
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

    this.video.srcObject = stream;
    await this.video.play();
    this.stream = stream;

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
