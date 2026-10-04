'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { formatCurrency } from '@/lib/utils';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  className?: string;
  decimals?: number;
}

export function AnimatedCounter({ 
  value, 
  duration = 1.2, 
  prefix = '', 
  className = '',
  decimals = 0
}: AnimatedCounterProps) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const proxyRef = useRef({ val: 0 });

  useEffect(() => {
    if (!spanRef.current) return;

    const targetVal = isNaN(value) ? 0 : value;
    const proxy = proxyRef.current;

    const tween = gsap.to(proxy, {
      val: targetVal,
      duration,
      ease: 'power3.out',
      onUpdate: () => {
        if (spanRef.current) {
          const formatted = decimals > 0 
            ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(Math.abs(proxy.val))
            : formatCurrency(Math.abs(proxy.val));

          if (prefix) {
            spanRef.current.innerText = `${prefix}${formatted}`;
          } else if (proxy.val < 0) {
            spanRef.current.innerText = `-${formatted}`;
          } else {
            spanRef.current.innerText = formatted;
          }
        }
      }
    });

    return () => {
      tween.kill();
    };
  }, [value, duration, prefix, decimals]);

  // Initial SSR render
  const initialFormatted = decimals > 0
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(Math.abs(value || 0))
    : formatCurrency(Math.abs(value || 0));

  const displayInitial = prefix 
    ? `${prefix}${initialFormatted}` 
    : (value < 0 ? `-${initialFormatted}` : initialFormatted);

  return (
    <span ref={spanRef} className={className}>
      {displayInitial}
    </span>
  );
}
