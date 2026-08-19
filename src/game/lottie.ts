/**
 * Lottie animation utilities for game reactions and effects
 * Handles cashier reactions, sale bursts, approvals, avatars, level-ups, and UI flourishes
 */

import lottie from 'lottie-web';
import { RefObject, useEffect, useRef } from 'react';

export type AnimationType =
  | 'cashier-happy'
  | 'cashier-neutral'
  | 'cashier-stressed'
  | 'sale-burst'
  | 'approval-check'
  | 'customer-avatar'
  | 'level-up'
  | 'coin-flip'
  | 'star-burst'
  | 'ribbon-badge';

export interface LottieOptions {
  type: AnimationType;
  container: HTMLDivElement | null;
  width?: number | string;
  height?: number | string;
  loop?: boolean;
  autoplay?: boolean;
  speed?: number;
  onComplete?: () => void;
}

/**
 * Pre-defined Lottie animation configurations
 * In production, these would load from JSON files or URLs
 */
const ANIMATION_DATA: Record<AnimationType, any> = {
  'cashier-happy': {
    // Simplified placeholder - in real implementation would load JSON
    v: '5.5.7',
    fr: 30,
    ip: 0,
    op: 60,
    w: 100,
    h: 100,
    nm: 'Cashier Happy',
    ddd: 0,
    assets: [],
    layers: []
  },
  'cashier-neutral': {
    v: '5.5.7',
    fr: 30,
    ip: 0,
    op: 60,
    w: 100,
    h: 100,
    nm: 'Cashier Neutral',
    ddd: 0,
    assets: [],
    layers: []
  },
  'cashier-stressed': {
    v: '5.5.7',
    fr: 30,
    ip: 0,
    op: 60,
    w: 100,
    h: 100,
    nm: 'Cashier Stressed',
    ddd: 0,
    assets: [],
    layers: []
  },
  'sale-burst': {
    v: '5.5.7',
    fr: 30,
    ip: 0,
    op: 45,
    w: 150,
    h: 150,
    nm: 'Sale Burst',
    ddd: 0,
    assets: [],
    layers: []
  },
  'approval-check': {
    v: '5.5.7',
    fr: 30,
    ip: 0,
    op: 30,
    w: 80,
    h: 80,
    nm: 'Approval Check',
    ddd: 0,
    assets: [],
    layers: []
  },
  'customer-avatar': {
    v: '5.5.7',
    fr: 30,
    ip: 0,
    op: 90,
    w: 60,
    h: 60,
    nm: 'Customer Avatar',
    ddd: 0,
    assets: [],
    layers: []
  },
  'level-up': {
    v: '5.5.7',
    fr: 30,
    ip: 0,
    op: 90,
    w: 200,
    h: 200,
    nm: 'Level Up',
    ddd: 0,
    assets: [],
    layers: []
  },
  'coin-flip': {
    v: '5.5.7',
    fr: 30,
    ip: 0,
    op: 40,
    w: 50,
    h: 50,
    nm: 'Coin Flip',
    ddd: 0,
    assets: [],
    layers: []
  },
  'star-burst': {
    v: '5.5.7',
    fr: 30,
    ip: 0,
    op: 50,
    w: 120,
    h: 120,
    nm: 'Star Burst',
    ddd: 0,
    assets: [],
    layers: []
  },
  'ribbon-badge': {
    v: '5.5.7',
    fr: 30,
    ip: 0,
    op: 60,
    w: 100,
    h: 100,
    nm: 'Ribbon Badge',
    ddd: 0,
    assets: [],
    layers: []
  }
};

/**
 * Plays a Lottie animation with configurable options
 * Returns an object with control methods
 */
export function playLottie(options: LottieOptions) {
  const {
    type,
    container,
    width = '100%',
    height = '100%',
    loop = false,
    autoplay = true,
    speed = 1,
    onComplete
  } = options;

  if (!container) {
    return { destroy: () => {}, pause: () => {}, resume: () => {}, stop: () => {} };
  }

  const animData = ANIMATION_DATA[type];
  
  const anim = lottie.loadAnimation({
    container,
    renderer: 'svg',
    loop,
    autoplay,
    animationData: animData,
    name: type
  });

  anim.setSpeed(speed);

  if (onComplete && !loop) {
    anim.addEventListener('complete', onComplete);
  }

  return {
    destroy: () => anim.destroy(),
    pause: () => anim.pause(),
    resume: () => anim.play(),
    stop: () => {
      anim.stop();
      anim.destroy();
    },
    setSpeed: (newSpeed: number) => anim.setSpeed(newSpeed),
    play: () => anim.play()
  };
}

/**
 * React hook to manage a Lottie animation lifecycle
 */
export function useLottie(
  type: AnimationType,
  options?: {
    loop?: boolean;
    speed?: number;
    width?: number | string;
    height?: number | string;
    onComplete?: () => void;
  }
): { ref: RefObject<HTMLDivElement>; controls: ReturnType<typeof playLottie> | null } {
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<ReturnType<typeof playLottie> | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      controlsRef.current = playLottie({
        type,
        container: containerRef.current,
        loop: options?.loop ?? false,
        speed: options?.speed ?? 1,
        width: options?.width ?? '100%',
        height: options?.height ?? '100%',
        onComplete: options?.onComplete
      });
    }

    return () => {
      if (controlsRef.current) {
        controlsRef.current.destroy();
      }
    };
  }, [type, options?.loop, options?.speed, options?.width, options?.height, options?.onComplete]);

  return { ref: containerRef, controls: controlsRef.current };
}

/**
 * Component wrapper for Lottie animations
 */
export interface LottieAnimationProps {
  type: AnimationType;
  width?: number | string;
  height?: number | string;
  loop?: boolean;
  speed?: number;
  className?: string;
  onComplete?: () => void;
}

export function LottieAnimation({
  type,
  width = '100%',
  height = '100%',
  loop = false,
  speed = 1,
  className = '',
  onComplete
}: LottieAnimationProps) {
  const { ref } = useLottie(type, { loop, speed, width, height, onComplete });

  return (
    <div
      ref={ref}
      className={className}
      style={{ width, height, display: 'inline-block' }}
    />
  );
}

/**
 * Quick helper to trigger a one-time burst animation (sale, level-up, etc.)
 */
export function triggerBurstAnimation(
  container: HTMLElement,
  type: 'sale-burst' | 'star-burst' | 'level-up' | 'coin-flip',
  duration?: number
): Promise<void> {
  return new Promise((resolve) => {
    const controls = playLottie({
      type,
      container,
      loop: false,
      autoplay: true,
      onComplete: () => {
        controls.destroy();
        resolve();
      }
    });

    if (duration) {
      setTimeout(() => {
        controls.destroy();
        resolve();
      }, duration);
    }
  });
}
