import { useRef, useState, useCallback, useEffect } from "react";

let sharedStream: MediaStream | null = null;
let sharedStreamUsers = 0;

async function getSharedStream(): Promise<MediaStream> {
  if (sharedStream && sharedStream.active) {
    sharedStreamUsers++;
    return sharedStream;
  }

  sharedStream = await navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 480, facingMode: "user" },
    audio: false,
  });
  sharedStreamUsers = 1;
  return sharedStream;
}

function releaseSharedStream() {
  sharedStreamUsers--;
  if (sharedStreamUsers <= 0) {
    sharedStream?.getTracks().forEach((t) => t.stop());
    sharedStream = null;
    sharedStreamUsers = 0;
  }
}

export function useWebcam() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const usingShared = useRef(false);

  const start = useCallback(async () => {
    try {
      const stream = await getSharedStream();
      usingShared.current = true;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setActive(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Camera access denied");
      setActive(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (usingShared.current) {
      releaseSharedStream();
      usingShared.current = false;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setActive(false);
  }, []);

  useEffect(() => {
    return () => {
      if (usingShared.current) {
        releaseSharedStream();
        usingShared.current = false;
      }
    };
  }, []);

  return { videoRef, active, error, start, stop };
}
