"use client";

import React, { useMemo } from "react";

interface BarcodeGeneratorProps {
  value: string;
  width?: number;
  height?: number;
  format?: "CODE128" | "CODE39" | "EAN13" | "EAN8" | "UPC";
  displayValue?: boolean;
  fontSize?: number;
  className?: string;
}

const CODE128_START_A = 103;
const CODE128_START_B = 104;
const CODE128_START_C = 105;
const CODE128_STOP = 106;

const CODE128_PATTERNS: number[][] = [
  [2, 1, 2, 2, 2, 2], [2, 2, 2, 1, 2, 2], [2, 2, 2, 2, 2, 1],
  [1, 2, 1, 2, 2, 3], [1, 2, 1, 3, 2, 2], [1, 3, 1, 2, 2, 2],
  [1, 2, 2, 2, 1, 3], [1, 2, 2, 3, 1, 2], [1, 3, 2, 2, 1, 2],
  [2, 2, 1, 2, 1, 3], [2, 2, 1, 3, 1, 2], [2, 3, 1, 2, 1, 2],
  [1, 1, 2, 2, 3, 2], [1, 2, 2, 1, 3, 2], [1, 2, 2, 2, 3, 1],
  [1, 1, 3, 2, 2, 2], [1, 2, 3, 1, 2, 2], [1, 2, 3, 2, 2, 1],
  [2, 2, 3, 2, 1, 1], [2, 2, 1, 1, 3, 2], [2, 2, 1, 2, 3, 1],
  [2, 1, 3, 2, 1, 2], [2, 2, 3, 1, 1, 2], [3, 1, 2, 1, 3, 1],
  [3, 1, 1, 2, 2, 2], [3, 2, 1, 1, 2, 2], [3, 2, 1, 2, 2, 1],
  [3, 1, 2, 2, 1, 2], [3, 2, 2, 1, 1, 2], [3, 2, 2, 2, 1, 1],
  [2, 1, 2, 1, 2, 3], [2, 1, 2, 3, 2, 1], [2, 3, 2, 1, 2, 1],
  [1, 1, 1, 3, 2, 3], [1, 3, 1, 1, 2, 3], [1, 3, 1, 3, 2, 1],
  [1, 1, 2, 3, 1, 3], [1, 3, 2, 1, 1, 3], [1, 3, 2, 3, 1, 1],
  [2, 1, 1, 3, 1, 3], [2, 3, 1, 1, 1, 3], [2, 3, 1, 3, 1, 1],
  [1, 1, 2, 1, 3, 3], [1, 1, 2, 3, 3, 1], [1, 3, 2, 1, 3, 1],
  [1, 1, 3, 1, 2, 3], [1, 1, 3, 3, 2, 1], [1, 3, 3, 1, 2, 1],
  [3, 1, 3, 1, 2, 1], [2, 1, 1, 3, 3, 1], [2, 3, 1, 1, 3, 1],
  [2, 1, 3, 1, 1, 3], [2, 1, 3, 3, 1, 1], [2, 1, 3, 1, 3, 1],
  [3, 1, 1, 1, 2, 3], [3, 1, 1, 3, 2, 1], [3, 3, 1, 1, 2, 1],
  [3, 1, 2, 1, 1, 3], [3, 1, 2, 3, 1, 1], [3, 3, 2, 1, 1, 1],
  [3, 1, 4, 1, 1, 1], [2, 2, 1, 4, 1, 1], [4, 3, 1, 1, 1, 1],
  [1, 1, 1, 2, 2, 4], [1, 1, 1, 4, 2, 2], [1, 2, 1, 1, 2, 4],
  [1, 2, 1, 4, 2, 1], [1, 4, 1, 1, 2, 2], [1, 4, 1, 2, 2, 1],
  [1, 1, 2, 2, 1, 4], [1, 1, 2, 4, 1, 2], [1, 2, 2, 1, 1, 4],
  [1, 2, 2, 4, 1, 1], [1, 4, 2, 1, 1, 2], [1, 4, 2, 2, 1, 1],
  [2, 4, 1, 2, 1, 1], [2, 2, 1, 1, 1, 4], [4, 1, 3, 1, 1, 1],
  [2, 4, 1, 1, 1, 2], [1, 3, 4, 1, 1, 1], [1, 1, 1, 2, 4, 2],
  [1, 2, 1, 1, 4, 2], [1, 2, 1, 2, 4, 1], [1, 1, 4, 2, 1, 2],
  [1, 2, 4, 1, 1, 2], [1, 2, 4, 2, 1, 1], [4, 1, 1, 2, 1, 2],
  [4, 2, 1, 1, 1, 2], [4, 2, 1, 2, 1, 1], [2, 1, 2, 1, 4, 1],
  [2, 1, 4, 1, 2, 1], [4, 1, 2, 1, 2, 1], [1, 1, 1, 1, 4, 3],
  [1, 1, 1, 3, 4, 1], [1, 3, 1, 1, 4, 1], [1, 1, 4, 1, 1, 3],
  [1, 1, 4, 3, 1, 1], [4, 1, 1, 1, 1, 3], [4, 1, 1, 3, 1, 1],
  [1, 1, 3, 1, 4, 1], [1, 1, 4, 1, 3, 1], [3, 1, 1, 1, 4, 1],
  [4, 1, 1, 1, 3, 1], [2, 1, 1, 4, 1, 2], [2, 1, 1, 2, 1, 4],
  [2, 1, 1, 2, 3, 2], [2, 3, 3, 1, 1, 1, 2],
];

const CODE39_PATTERNS: Record<string, string> = {
  "0": "101001101101", "1": "110100101011", "2": "101100101011",
  "3": "110110010101", "4": "101001101011", "5": "110100110101",
  "6": "101100110101", "7": "101001011011", "8": "110100101101",
  "9": "101100101101", A: "110101001011", B: "101101001011",
  C: "110110100101", D: "101011001011", E: "110101100101",
  F: "101101100101", G: "101010011011", H: "110101001101",
  I: "101101001101", J: "101011001101", K: "110101010011",
  L: "101101010011", M: "110110101001", N: "101011010011",
  O: "110101101001", P: "101101101001", Q: "101010110011",
  R: "110101011001", S: "101101011001", T: "101011011001",
  U: "110010101011", V: "100110101011", W: "110011010101",
  X: "100101101011", Y: "110010110101", Z: "100110110101",
  "-": "100101011011", ".": "110010101101", " ": "100110101101",
  $: "100100100101", "/": "100100101001", "+": "100101001001",
  "%": "101001001001", "*": "100101101101",
};

const EAN_PATTERNS_L = [
  "0001101", "0011001", "0010011", "0111101", "0100011",
  "0110001", "0101111", "0111011", "0110111", "0001011",
];
const EAN_PATTERNS_G = [
  "0100111", "0110011", "0011011", "0100001", "0011101",
  "0111001", "0000101", "0010001", "0001001", "0010111",
];
const EAN_PATTERNS_R = [
  "1110010", "1100110", "1101100", "1000010", "1011100",
  "1001110", "1010000", "1000100", "1001000", "1110100",
];
const EAN_PARITY = [
  "LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG",
  "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL",
];

function encodeCode128(value: string): number[] {
  const chars: number[] = [];
  const digitsOnly = /^[0-9]+$/.test(value);

  let startCode: number;
  if (digitsOnly && value.length >= 2) {
    startCode = CODE128_START_C;
    chars.push(startCode);
    for (let i = 0; i < value.length; i += 2) {
      if (i + 1 < value.length) {
        chars.push(parseInt(value.substring(i, i + 2), 10));
      } else {
        chars.push(CODE128_START_B);
        chars.push(value.charCodeAt(i) - 32);
      }
    }
  } else {
    startCode = CODE128_START_B;
    chars.push(startCode);
    for (let i = 0; i < value.length; i++) {
      const code = value.charCodeAt(i);
      if (code >= 32 && code <= 126) chars.push(code - 32);
    }
  }

  let checksum = startCode;
  for (let i = 0; i < chars.length; i++) {
    checksum += chars[i] * (i === 0 ? 0 : i);
  }
  checksum = checksum % 103;
  chars.push(checksum);
  chars.push(CODE128_STOP);

  return chars;
}

function encodeCode39(value: string): string {
  const normalized = value.toUpperCase();
  let pattern = "";
  for (const ch of normalized) {
    if (CODE39_PATTERNS[ch]) pattern += CODE39_PATTERNS[ch] + "0";
  }
  return CODE39_PATTERNS["*"] + "0" + pattern;
}

function encodeEAN13(value: string): string {
  const digits = value.split("").map(Number);
  if (digits.length < 13) while (digits.length < 13) digits.unshift(0);
  const parity = EAN_PARITY[digits[0]];
  let pattern = "101";
  for (let i = 0; i < 6; i++) {
    pattern += parity[i] === "L" ? EAN_PATTERNS_L[digits[i + 1]] : EAN_PATTERNS_G[digits[i + 1]];
  }
  pattern += "01010";
  for (let i = 0; i < 6; i++) pattern += EAN_PATTERNS_R[digits[i + 7]];
  pattern += "101";
  return pattern;
}

function encodeEAN8(value: string): string {
  const digits = value.split("").map(Number);
  if (digits.length < 8) while (digits.length < 8) digits.unshift(0);
  let pattern = "101";
  for (let i = 0; i < 4; i++) pattern += EAN_PATTERNS_L[digits[i]];
  pattern += "01010";
  for (let i = 4; i < 8; i++) pattern += EAN_PATTERNS_R[digits[i]];
  pattern += "101";
  return pattern;
}

function encodeUPC(value: string): string {
  const digits = value.split("").map(Number);
  if (digits.length < 12) while (digits.length < 12) digits.unshift(0);
  let pattern = "101";
  for (let i = 0; i < 6; i++) pattern += EAN_PATTERNS_L[digits[i]];
  pattern += "01010";
  for (let i = 6; i < 12; i++) pattern += EAN_PATTERNS_R[digits[i]];
  pattern += "101";
  return pattern;
}

function renderBars(segments: number[], singleUnit: number, barHeight: number): React.ReactNode[] {
  const rects: React.ReactNode[] = [];
  let xPos = 0;
  for (let i = 0; i < segments.length; i++) {
    const w = segments[i] * singleUnit;
    if (i % 2 === 0) {
      rects.push(<rect key={i} x={xPos} y={0} width={w} height={barHeight} fill="currentColor" />);
    }
    xPos += w;
  }
  return rects;
}

function renderBinaryBars(pattern: string, singleUnit: number, barHeight: number): React.ReactNode[] {
  const rects: React.ReactNode[] = [];
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === "1") {
      rects.push(<rect key={i} x={i * singleUnit} y={0} width={singleUnit} height={barHeight} fill="currentColor" />);
    }
  }
  return rects;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

const BarcodeGenerator: React.FC<BarcodeGeneratorProps> = ({
  value,
  width = 300,
  height = 80,
  format = "CODE128",
  displayValue = true,
  fontSize = 12,
  className,
}) => {
  const barcodeContent = useMemo(() => {
    if (!value || value.trim().length === 0) return null;

    const barH = displayValue ? height * 0.82 : height;

    try {
      if (format === "CODE128") {
        const segments = encodeCode128(value);
        const totalWidth = segments.reduce((sum, idx) => sum + CODE128_PATTERNS[idx].reduce((s, v) => s + v, 0), 0);
        const singleUnit = width / totalWidth;
        const allBars: React.ReactNode[] = [];
        let xOffset = 0;

        for (let i = 0; i < segments.length; i++) {
          const pattern = CODE128_PATTERNS[segments[i]];
          allBars.push(
            <g key={i} transform={`translate(${xOffset}, 0)`}>
              {renderBars(pattern, singleUnit, 1)}
            </g>
          );
          xOffset += pattern.reduce((s, v) => s + v, 0) * singleUnit;
        }

        return (
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className={className}
            style={{ backgroundColor: "#ffffff", color: "#000000" }}
          >
            <rect x={0} y={0} width={width} height={height} fill="#ffffff" />
            <g transform="translate(0, 0)">{allBars}</g>
            {displayValue && (
              <text
                x={width / 2}
                y={height - 2}
                textAnchor="middle"
                fontSize={fontSize}
                fontFamily="monospace"
                fill="#000000"
              >
                {value}
              </text>
            )}
          </svg>
        );
      } else if (format === "CODE39") {
        const pattern = encodeCode39(value);
        const su = width / pattern.length;
        return (
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className={className}
            style={{ backgroundColor: "#ffffff", color: "#000000" }}
          >
            <rect x={0} y={0} width={width} height={height} fill="#ffffff" />
            {renderBinaryBars(pattern, su, barH)}
            {displayValue && (
              <text x={width / 2} y={height - 2} textAnchor="middle" fontSize={fontSize} fontFamily="monospace" fill="#000000">
                *{value.toUpperCase()}*
              </text>
            )}
          </svg>
        );
      } else if (format === "EAN13") {
        const pattern = encodeEAN13(value);
        const su = width / pattern.length;
        return (
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className={className}
            style={{ backgroundColor: "#ffffff", color: "#000000" }}
          >
            <rect x={0} y={0} width={width} height={height} fill="#ffffff" />
            {renderBinaryBars(pattern, su, barH)}
            {displayValue && (
              <text x={width / 2} y={height - 2} textAnchor="middle" fontSize={fontSize} fontFamily="monospace" fill="#000000">
                {value}
              </text>
            )}
          </svg>
        );
      } else if (format === "EAN8") {
        const pattern = encodeEAN8(value);
        const su = width / pattern.length;
        return (
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className={className}
            style={{ backgroundColor: "#ffffff", color: "#000000" }}
          >
            <rect x={0} y={0} width={width} height={height} fill="#ffffff" />
            {renderBinaryBars(pattern, su, barH)}
            {displayValue && (
              <text x={width / 2} y={height - 2} textAnchor="middle" fontSize={fontSize} fontFamily="monospace" fill="#000000">
                {value}
              </text>
            )}
          </svg>
        );
      } else if (format === "UPC") {
        const pattern = encodeUPC(value);
        const su = width / pattern.length;
        return (
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className={className}
            style={{ backgroundColor: "#ffffff", color: "#000000" }}
          >
            <rect x={0} y={0} width={width} height={height} fill="#ffffff" />
            {renderBinaryBars(pattern, su, barH)}
            {displayValue && (
              <text x={width / 2} y={height - 2} textAnchor="middle" fontSize={fontSize} fontFamily="monospace" fill="#000000">
                {value}
              </text>
            )}
          </svg>
        );
      }
      return null;
    } catch {
      return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} style={{ backgroundColor: "#ffffff" }}>
          <rect x={0} y={0} width={width} height={height} fill="#ffffff" stroke="#ff0000" strokeWidth={1} />
          <text x={width / 2} y={height / 2} textAnchor="middle" dominantBaseline="middle" fontSize={10} fill="#ff0000">
            Código inválido
          </text>
        </svg>
      );
    }
  }, [value, format, width, height, displayValue, fontSize, className]);

  if (!value || value.trim().length === 0) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ backgroundColor: "#ffffff" }}
        className={className}
      >
        <rect x={0} y={0} width={width} height={height} fill="#ffffff" stroke="#cccccc" strokeWidth={1} strokeDasharray="4,4" opacity={0.5} />
        <text x={width / 2} y={height / 2} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill="#999999">
          Sin código
        </text>
      </svg>
    );
  }

  return barcodeContent;
};

function barcodeToSVGString(
  value: string,
  format: "CODE128" | "CODE39" | "EAN13" | "EAN8" | "UPC",
  width: number,
  height: number,
  displayValue: boolean,
  fontSize: number
): string {
  const barHeight = displayValue ? height * 0.82 : height;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  svg += `<rect width="${width}" height="${height}" fill="#ffffff"/>`;

  if (format === "CODE128") {
    const segments = encodeCode128(value);
    const totalWidth = segments.reduce((sum, idx) => sum + CODE128_PATTERNS[idx].reduce((s, v) => s + v, 0), 0);
    const singleUnit = width / totalWidth;
    let xOffset = 0;

    for (let i = 0; i < segments.length; i++) {
      const pattern = CODE128_PATTERNS[segments[i]];
      let localX = 0;
      for (let j = 0; j < pattern.length; j++) {
        const w = pattern[j] * singleUnit;
        if (j % 2 === 0) {
          svg += `<rect x="${xOffset + localX}" y="0" width="${w}" height="${barHeight}" fill="#000000"/>`;
        }
        localX += w;
      }
      xOffset += pattern.reduce((s, v) => s + v, 0) * singleUnit;
    }
  } else if (format === "CODE39") {
    const pattern = encodeCode39(value);
    const su = width / pattern.length;
    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i] === "1") svg += `<rect x="${i * su}" y="0" width="${su}" height="${barHeight}" fill="#000000"/>`;
    }
  } else if (format === "EAN13") {
    const pattern = encodeEAN13(value);
    const su = width / pattern.length;
    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i] === "1") svg += `<rect x="${i * su}" y="0" width="${su}" height="${barHeight}" fill="#000000"/>`;
    }
  } else if (format === "EAN8") {
    const pattern = encodeEAN8(value);
    const su = width / pattern.length;
    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i] === "1") svg += `<rect x="${i * su}" y="0" width="${su}" height="${barHeight}" fill="#000000"/>`;
    }
  } else if (format === "UPC") {
    const pattern = encodeUPC(value);
    const su = width / pattern.length;
    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i] === "1") svg += `<rect x="${i * su}" y="0" width="${su}" height="${barHeight}" fill="#000000"/>`;
    }
  }

  if (displayValue) {
    svg += `<text x="${width / 2}" y="${height - 2}" text-anchor="middle" font-size="${fontSize}" font-family="monospace" fill="#000000">${escapeXml(value)}</text>`;
  }

  svg += `</svg>`;
  return svg;
}

export function barcodeToCanvasDataURL(
  value: string,
  format: "CODE128" | "CODE39" | "EAN13" | "EAN8" | "UPC" = "CODE128",
  width = 300,
  height = 80,
  displayValue = true,
  fontSize = 10
): string {
  if (!value) return "";

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#000000";
  const barHeight = displayValue ? height * 0.82 : height;

  if (format === "CODE128") {
    const segments = encodeCode128(value);
    const totalWidth = segments.reduce((sum, idx) => sum + CODE128_PATTERNS[idx].reduce((s, v) => s + v, 0), 0);
    const su = width / totalWidth;
    let xPos = 0;

    for (let i = 0; i < segments.length; i++) {
      const p = CODE128_PATTERNS[segments[i]];
      for (let j = 0; j < p.length; j++) {
        const w = p[j] * su;
        if (j % 2 === 0) ctx.fillRect(xPos, 0, w, barHeight);
        xPos += w;
      }
    }
  } else {
    let pattern = "";
    if (format === "CODE39") pattern = encodeCode39(value);
    else if (format === "EAN13") pattern = encodeEAN13(value);
    else if (format === "EAN8") pattern = encodeEAN8(value);
    else if (format === "UPC") pattern = encodeUPC(value);

    const su = width / pattern.length;
    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i] === "1") ctx.fillRect(i * su, 0, su, barHeight);
    }
  }

  if (displayValue) {
    ctx.fillStyle = "#000000";
    ctx.font = `${fontSize}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(value, width / 2, height - 2);
  }

  return canvas.toDataURL("image/png");
}

export function barcodeToDataURL(
  value: string,
  format: "CODE128" | "CODE39" | "EAN13" | "EAN8" | "UPC" = "CODE128",
  width = 300,
  height = 80
): string {
  if (!value) return "";
  const svg = barcodeToSVGString(value, format, width, height, true, 10);
  return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
}

export default BarcodeGenerator;
