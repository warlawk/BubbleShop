/**
 * Textures and procedural patterns for game UI elements
 * Generates canvas-based textures for receipt paper, awnings, and decorative elements
 */

import { useState, useEffect } from 'react';

/**
 * Creates a receipt paper texture with subtle horizontal lines
 */
export function createReceiptTexture(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 300;
  const ctx = canvas.getContext('2d')!;

  // Base off-white paper color
  ctx.fillStyle = '#f8f6f0';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Add subtle horizontal lines (like receipt thermal paper)
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.03)';
  ctx.lineWidth = 1;
  for (let y = 0; y < canvas.height; y += 8) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Add slight noise/grain
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 8;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }
  ctx.putImageData(imageData, 0, 0);

  // Add jagged bottom edge (torn receipt)
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, canvas.height - 10);
  for (let x = 0; x <= canvas.width; x += 20) {
    ctx.lineTo(x, canvas.height - 10 + (x % 40 === 0 ? 8 : -8));
  }
  ctx.lineTo(canvas.width, 0);
  ctx.closePath();
  ctx.fill();

  return canvas.toDataURL();
}

/**
 * Creates a striped awning texture with alternating colors
 */
export function createAwningTexture(color1: string = '#e63946', color2: string = '#f1faee'): string {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 100;
  const ctx = canvas.getContext('2d')!;

  const stripeWidth = 40;
  for (let x = 0; x < canvas.width; x += stripeWidth) {
    ctx.fillStyle = (x / stripeWidth) % 2 === 0 ? color1 : color2;
    ctx.fillRect(x, 0, stripeWidth, canvas.height);
  }

  // Add scalloped edge at bottom
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, canvas.height - 15);
  for (let x = 0; x <= canvas.width; x += 30) {
    ctx.arc(x + 15, canvas.height - 15, 15, Math.PI, 0);
  }
  ctx.lineTo(canvas.width, 0);
  ctx.closePath();
  ctx.fill();

  return canvas.toDataURL();
}

/**
 * Creates a subtle grid pattern for backgrounds
 */
export function createGridPattern(color: string = 'rgba(0, 0, 0, 0.05)', spacing: number = 20): string {
  const canvas = document.createElement('canvas');
  canvas.width = spacing;
  canvas.height = spacing;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'transparent';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = color;
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, canvas.height);
  ctx.moveTo(0, 0);
  ctx.lineTo(canvas.width, 0);
  ctx.stroke();

  return canvas.toDataURL();
}

/**
 * Creates a wood grain texture for shelves/counters
 */
export function createWoodTexture(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 200;
  const ctx = canvas.getContext('2d')!;

  // Base wood color
  ctx.fillStyle = '#8b5a2b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Add wood grain lines
  ctx.strokeStyle = 'rgba(60, 40, 20, 0.3)';
  ctx.lineWidth = 2;
  for (let y = 0; y < canvas.height; y += 15) {
    ctx.beginPath();
    ctx.moveTo(0, y + Math.sin(y * 0.1) * 5);
    for (let x = 0; x < canvas.width; x += 20) {
      ctx.lineTo(x, y + Math.sin((y + x) * 0.05) * 5);
    }
    ctx.stroke();
  }

  return canvas.toDataURL();
}

/**
 * Hook to generate and cache a texture as a data URL
 */
export function useTexture(
  type: 'receipt' | 'awning' | 'grid' | 'wood',
  options?: { color1?: string; color2?: string; spacing?: number }
): string {
  const [texture, setTexture] = useState<string>('');

  useEffect(() => {
    let result: string;
    switch (type) {
      case 'receipt':
        result = createReceiptTexture();
        break;
      case 'awning':
        result = createAwningTexture(options?.color1, options?.color2);
        break;
      case 'grid':
        result = createGridPattern(undefined, options?.spacing);
        break;
      case 'wood':
        result = createWoodTexture();
        break;
      default:
        result = '';
    }
    setTexture(result);
  }, [type, options?.color1, options?.color2, options?.spacing]);

  return texture;
}
