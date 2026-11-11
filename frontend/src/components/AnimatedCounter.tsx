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

  const formatVal = (val: number) => {
    let formatted = decimals > 0 
      ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(Math.abs(val))
      : formatCurrency(Math.abs(val));

    if (prefix) {
      if (prefix.includes('₹') && formatted.includes('₹')) {
        formatted = formatted.replace(/₹\s?/g, '');
      }
      return `${prefix}${formatted}`;
    }
    if (val < 0) return `-${formatted}`;
    return formatted;
  };

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
          spanRef.current.innerText = formatVal(proxy.val);
        }
      }
    });

    return () => {
      tween.kill();
    };
  }, [value, duration, prefix, decimals]);

  // Initial SSR render
  const displayInitial = formatVal(value || 0);

  return (
    <span ref={spanRef} className={className}>
      {displayInitial}
    </span>
  );
}
