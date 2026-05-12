import { useEffect, useRef, useState } from "react";

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

export function useCountUp(target: number, duration = 1200): number {
  const [current, setCurrent] = useState(target);
  const prevTargetRef = useRef(target);
  const startValueRef = useRef(target);
  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    // On first mount, skip animation
    if (prevTargetRef.current === target) {
      setCurrent(target);
      return;
    }

    startValueRef.current = prevTargetRef.current;
    prevTargetRef.current = target;
    startTimeRef.current = null;

    if (animRef.current) cancelAnimationFrame(animRef.current);

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuart(progress);

      const interpolated = startValueRef.current + (target - startValueRef.current) * eased;
      setCurrent(Math.round(interpolated));

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setCurrent(target);
      }
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [target, duration]);

  return current;
}
