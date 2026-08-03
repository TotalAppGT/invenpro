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
  lastScanned: string | null;
  startCameraScan: () => Promise<void>;
  stopCameraScan: () => void;
  clearScan: () => void;
  error: string | null;
}

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
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scannerRef = useRef<unknown>(null);
  const bufferRef = useRef<string>("");
  const bufferTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === "Enter") {
        if (bufferRef.current.length > 0) {
          const value = bufferRef.current.trim();
          if (value) {
            setScannedValue(value);
            setLastScanned(value);
            onScanRef.current?.(value);

            if (autoStop) {
              setIsScanning(false);
            }
          }
          bufferRef.current = "";
        }
        return;
      }

      if (e.key.length === 1) {
        bufferRef.current += e.key;

        if (bufferTimerRef.current) {
          clearTimeout(bufferTimerRef.current);
        }

        bufferTimerRef.current = setTimeout(() => {
          if (bufferRef.current.length > 0) {
            const value = bufferRef.current.trim();
            if (value) {
              setScannedValue(value);
              setLastScanned(value);
              onScanRef.current?.(value);

              if (autoStop) {
                setIsScanning(false);
              }
            }
            bufferRef.current = "";
          }
        }, 150);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (bufferTimerRef.current) {
        clearTimeout(bufferTimerRef.current);
      }
    };
  }, [autoStop]);

  const startCameraScan = useCallback(async () => {
    setError(null);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");

      const existingScanner = scannerRef.current as { stop: () => Promise<void>; clear: () => void } | null;
      if (existingScanner) {
        await existingScanner.stop().catch(() => {});
        existingScanner.clear();
      }

      const html5QrCode = new Html5Qrcode(scannerElementId);
      scannerRef.current = html5QrCode;
      setIsScanning(true);

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText: string) => {
          setScannedValue(decodedText);
          setLastScanned(decodedText);
          onScanRef.current?.(decodedText);

          if (autoStop) {
            html5QrCode.stop().catch(() => {});
            html5QrCode.clear();
            setIsScanning(false);
          }
        },
        () => {}
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start camera scanner";
      setError(message);
      onErrorRef.current?.(message);
      setIsScanning(false);
    }
  }, [scannerElementId, autoStop]);

  const stopCameraScan = useCallback(() => {
    const scanner = scannerRef.current as { stop: () => Promise<void>; clear: () => void } | null;
    if (scanner) {
      scanner.stop().catch(() => {});
      scanner.clear();
      scannerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const clearScan = useCallback(() => {
    setScannedValue(null);
    setError(null);
    bufferRef.current = "";
  }, []);

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current as { stop: () => Promise<void>; clear: () => void } | null;
      if (scanner) {
        scanner.stop().catch(() => {});
        scanner.clear();
      }
    };
  }, []);

  return {
    scannedValue,
    isScanning,
    lastScanned,
    error,
    startCameraScan,
    stopCameraScan,
    clearScan,
  };
}
