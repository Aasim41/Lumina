'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MiniCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [days, setDays] = useState<{ day: number; isCurrentMonth: boolean; isToday: boolean }[]>([]);

  useEffect(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const today = new Date();
    const isCurrentMonthActual = today.getMonth() === month && today.getFullYear() === year;

    const calendarDays = [];
    
    // Previous month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      calendarDays.push({ day: daysInPrevMonth - i, isCurrentMonth: false, isToday: false });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      calendarDays.push({
        day: i,
        isCurrentMonth: true,
        isToday: isCurrentMonthActual && i === today.getDate()
      });
    }
    
    // Next month padding to complete 6 rows (42 days total)
    const remainingDays = 42 - calendarDays.length;
    for (let i = 1; i <= remainingDays; i++) {
      calendarDays.push({ day: i, isCurrentMonth: false, isToday: false });
    }
    
    setDays(calendarDays);
  }, [currentDate]);

  const daysLeft = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate() - currentDate.getDate();

  return (
    <div className="glass rounded-3xl p-5 border border-white/5 shadow-xl">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-sm font-medium text-text-primary">
            {currentDate.toLocaleDateString('default', { month: 'long', year: 'numeric' })}
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">{daysLeft} days remaining</p>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
          <div key={day} className="text-[10px] font-medium text-text-secondary uppercase">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => (
          <div
            key={i}
            className={cn(
              "h-7 flex items-center justify-center text-xs rounded-full transition-colors",
              d.isToday ? "bg-purple-500 text-white font-bold shadow-[0_0_10px_rgba(168,85,247,0.5)]" : "",
              !d.isCurrentMonth ? "text-text-secondary/30" : d.isToday ? "" : "text-text-primary",
              d.isCurrentMonth && !d.isToday ? "hover:bg-white/5" : ""
            )}
          >
            {d.day}
          </div>
        ))}
      </div>
    </div>
  );
}
