"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Reveal halus saat elemen masuk viewport (fade + translateY kecil, lihat
 * .reveal-on-enter di globals.css). Satu IntersectionObserver per instance,
 * berhenti mengamati setelah trigger pertama - bukan scroll listener yang
 * dievaluasi terus-menerus, jadi murah untuk performance.
 */
export function Reveal({
  children,
  className,
  delayMs = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal-on-enter ${isVisible ? "is-visible" : ""} ${className ?? ""}`}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
