import { afterEach, describe, expect, it, vi } from "vitest";
import { CameraController, listVideoInputDevices } from "./cameraController";

function setMediaDevices(mediaDevices: MediaDevices | undefined): void {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: mediaDevices,
  });
}

function createTrack(): MediaStreamTrack {
  return {
    stop: vi.fn(),
  } as unknown as MediaStreamTrack;
}

describe("listVideoInputDevices", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    setMediaDevices(undefined);
  });

  it("enumerateDevices 결과에서 videoinput 장치만 반환한다", async () => {
    const camera = {
      deviceId: "camera-1",
      groupId: "group-1",
      kind: "videoinput",
      label: "Camera",
      toJSON: () => ({}),
    } as MediaDeviceInfo;
    const microphone = {
      deviceId: "microphone-1",
      groupId: "group-1",
      kind: "audioinput",
      label: "Microphone",
      toJSON: () => ({}),
    } as MediaDeviceInfo;
    const speaker = {
      deviceId: "speaker-1",
      groupId: "group-1",
      kind: "audiooutput",
      label: "Speaker",
      toJSON: () => ({}),
    } as MediaDeviceInfo;
    const enumerateDevices = vi.fn().mockResolvedValue([camera, microphone, speaker]);
    setMediaDevices({ enumerateDevices } as unknown as MediaDevices);

    await expect(listVideoInputDevices()).resolves.toEqual([camera]);
    expect(enumerateDevices).toHaveBeenCalledOnce();
  });

  it("mediaDevices가 없으면 빈 배열을 반환한다", async () => {
    setMediaDevices(undefined);

    await expect(listVideoInputDevices()).resolves.toEqual([]);
  });
});

describe("CameraController", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    setMediaDevices(undefined);
  });

  it("지정된 장치와 기본 영상 제약 조건으로 카메라를 시작한다", async () => {
    const track = createTrack();
    const stream = { getTracks: () => [track] } as unknown as MediaStream;
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    const video = {
      play: vi.fn().mockResolvedValue(undefined),
      srcObject: null,
    } as unknown as HTMLVideoElement;
    setMediaDevices({ getUserMedia } as unknown as MediaDevices);

    const controller = new CameraController(video);
    const result = await controller.start("camera-1");

    expect(result).toBe(stream);
    expect(getUserMedia).toHaveBeenCalledWith({
      audio: false,
      video: {
        deviceId: { exact: "camera-1" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "user",
      },
    });
    expect(video.srcObject).toBe(stream);
    expect(video.play).toHaveBeenCalledOnce();
  });

  it("새 카메라를 시작하기 전에 이전 스트림을 중지한다", async () => {
    const firstTrack = createTrack();
    const secondTrack = createTrack();
    const firstStream = { getTracks: () => [firstTrack] } as unknown as MediaStream;
    const secondStream = { getTracks: () => [secondTrack] } as unknown as MediaStream;
    const getUserMedia = vi.fn().mockResolvedValueOnce(firstStream).mockResolvedValueOnce(secondStream);
    const video = {
      play: vi.fn().mockResolvedValue(undefined),
      srcObject: null,
    } as unknown as HTMLVideoElement;
    setMediaDevices({ getUserMedia } as unknown as MediaDevices);

    const controller = new CameraController(video);
    await controller.start();
    const result = await controller.start();

    expect(result).toBe(secondStream);
    expect(firstTrack.stop).toHaveBeenCalledOnce();
    expect(video.srcObject).toBe(secondStream);
  });

  it("stop 호출 시 모든 트랙을 중지하고 video srcObject를 비운다", async () => {
    const firstTrack = createTrack();
    const secondTrack = createTrack();
    const stream = { getTracks: () => [firstTrack, secondTrack] } as unknown as MediaStream;
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    const video = {
      play: vi.fn().mockResolvedValue(undefined),
      srcObject: null,
    } as unknown as HTMLVideoElement;
    setMediaDevices({ getUserMedia } as unknown as MediaDevices);

    const controller = new CameraController(video);
    await controller.start();
    controller.stop();

    expect(firstTrack.stop).toHaveBeenCalledOnce();
    expect(secondTrack.stop).toHaveBeenCalledOnce();
    expect(video.srcObject).toBeNull();
  });
});
