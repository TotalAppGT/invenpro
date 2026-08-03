"use client";

import { useState, useCallback, useEffect, useRef } from "react";

interface UseBarcodeScannerOptions {
  autoStop?: boolean;
  scannerElementId?: string;
  onScan?: (value: string) => void;
  onError?: (error: string) => void;
}

interface UseBarcodeScannerResult {
  scannedValue: string | null;
  isScanning: boolean;
  isPaused: boolean;
  lastScanned: string | null;
  startCameraScan: () => Promise<void>;
  stopCameraScan: () => void;
  pauseScanning: () => void;
  resumeScanning: () => void;
  clearScan: () => void;
  error: string | null;
}

const KEYSTROKE_MIN_LENGTH = 8;
const KEYSTROKE_MAX_INTERVAL = 50;
const KEYSTROKE_TIMEOUT = 150;

export function useBarcodeScanner(
  options: UseBarcodeScannerOptions = {}
): UseBarcodeScannerResult {
  const {
    autoStop = true,
    scannerElementId = "barcode-scanner",
    onScan,
    onError,
  } = options;

  const [scannedValue, setScannedValue] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void; pause: () => void; resume: () => void } | null>(null);
  const bufferRef = useRef<string>("");
  const keystrokeTimestamps = useRef<number[]>([]);
  const bufferTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);
  onScanRef.current = onScan;
  onErrorRef.current = onError;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPaused) return;

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      if (e.key === "Enter") {
        if (bufferRef.current.length >= KEYSTROKE_MIN_LENGTH) {
          const value = bufferRef.current.trim();
          handleSuccessfulScan(value);
        }
        bufferRef.current = "";
        keystrokeTimestamps.current = [];
        return;
      }

      if (e.key.length === 1) {
        const now = Date.now();

        if (keystrokeTimestamps.current.length > 0) {
          const lastTimestamp = keystrokeTimestamps.current[keystrokeTimestamps.current.length - 1];
          const interval = now - lastTimestamp;

          if (interval > KEYSTROKE_MAX_INTERVAL) {
            keystrokeTimestamps.current = [];
            bufferRef.current = "";
          }
        }

        keystrokeTimestamps.current.push(now);
        bufferRef.current += e.key;

        if (bufferTimerRef.current) {
          clearTimeout(bufferTimerRef.current);
        }

        bufferTimerRef.current = setTimeout(() => {
          const isPhysicalScanner = keystrokeTimestamps.current.length >= KEYSTROKE_MIN_LENGTH
            && keystrokeTimestamps.current.length >= 2;

          if (isPhysicalScanner) {
            const first = keystrokeTimestamps.current[0];
            const last = keystrokeTimestamps.current[keystrokeTimestamps.current.length - 1];
            const avgInterval = (last - first) / (keystrokeTimestamps.current.length - 1);

            if (avgInterval <= KEYSTROKE_MAX_INTERVAL && bufferRef.current.length >= KEYSTROKE_MIN_LENGTH) {
              const value = bufferRef.current.trim();
              handleSuccessfulScan(value);
              bufferRef.current = "";
              keystrokeTimestamps.current = [];
            }
          }

          if (bufferRef.current.length > 0 && bufferRef.current.length < KEYSTROKE_MIN_LENGTH) {
            bufferRef.current = "";
            keystrokeTimestamps.current = [];
          }
        }, KEYSTROKE_TIMEOUT);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      if (bufferTimerRef.current) {
        clearTimeout(bufferTimerRef.current);
      }
    };
  }, [isPaused, autoStop]);

  const handleSuccessfulScan = (value: string) => {
    if (!value) return;
    setScannedValue(value);
    setLastScanned(value);
    onScanRef.current?.(value);

    if (autoStop) {
      setIsScanning(false);
    }
  };

  const startCameraScan = useCallback(async () => {
    setError(null);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");

      const existingScanner = scannerRef.current as any;
      if (existingScanner) {
        try {
          await existingScanner.stop();
          existingScanner.clear();
        } catch {}
      }

      const html5QrCode = new Html5Qrcode(scannerElementId);
      (scannerRef as any).current = html5QrCode;
      setIsScanning(true);
      setIsPaused(false);

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText: string) => {
          if (isPaused) return;
          handleSuccessfulScan(decodedText);

          if (autoStop) {
            html5QrCode.stop().catch(() => {});
            html5QrCode.clear();
            setIsScanning(false);
          }
        },
        () => {}
      );
    } catch (err: any) {
      const message = err instanceof Error ? err.message : "No se pudo iniciar la camara. Verifique permisos.";
      setError(message);
      onErrorRef.current?.(message);
      setIsScanning(false);
    }
  }, [scannerElementId, autoStop, isPaused]);

  const stopCameraScan = useCallback(() => {
    const scanner = scannerRef.current;
    if (scanner) {
      scanner.stop().catch(() => {});
      scanner.clear();
      scannerRef.current = null;
    }
    setIsScanning(false);
    setIsPaused(false);
  }, []);

  const pauseScanning = useCallback(() => {
    setIsPaused(true);
    const scanner = scannerRef.current as any;
    if (scanner && typeof scanner.pause === "function") {
      scanner.pause();
    }
  }, []);

  const resumeScanning = useCallback(() => {
    setIsPaused(false);
    const scanner = scannerRef.current as any;
    if (scanner && typeof scanner.resume === "function") {
      scanner.resume();
    }
  }, []);

  const clearScan = useCallback(() => {
    setScannedValue(null);
    setError(null);
    bufferRef.current = "";
    keystrokeTimestamps.current = [];
  }, []);

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;
      if (scanner) {
        scanner.stop().catch(() => {});
        scanner.clear();
      }
    };
  }, []);

  return {
    scannedValue,
    isScanning,
    isPaused,
    lastScanned,
    error,
    startCameraScan,
    stopCameraScan,
    pauseScanning,
    resumeScanning,
    clearScan,
  };
}
