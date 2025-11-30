'use client';

import { useEffect, useState } from 'react';

interface ElapsedTimeProps {
  startTime: string | Date;
  className?: string;
  showMinutesOnly?: boolean;
}

export default function ElapsedTime({ startTime, className = '', showMinutesOnly = false }: ElapsedTimeProps) {
  const [elapsed, setElapsed] = useState('00:00:00');

  useEffect(() => {
    if (!startTime) {
      setElapsed('00:00:00');
      return;
    }

    const updateElapsed = () => {
      const start = new Date(startTime).getTime();
      const now = Date.now();
      const elapsedMs = now - start;

      if (elapsedMs < 0) {
        setElapsed('00:00:00');
        return;
      }

      const hours = Math.floor(elapsedMs / (1000 * 60 * 60));
      const minutes = Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((elapsedMs % (1000 * 60)) / 1000);

      if (showMinutesOnly) {
        setElapsed(`${minutes} min`);
      } else {
        setElapsed(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
      }
    };

    // Update immediately
    updateElapsed();

    // Update every second
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [startTime, showMinutesOnly]);

  return <span className={className}>{elapsed}</span>;
}

