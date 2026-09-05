import React from 'react';
import { SemaphoreStatus } from '../utils/types';
import { getSemaphoreColor } from '../utils/formatters';

interface Props {
  status: SemaphoreStatus;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5',
};

const SemaphoreIndicator: React.FC<Props> = ({ status, size = 'md' }) => {
  const colorClass = getSemaphoreColor(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold border ${colorClass} ${sizeClasses[size]}`}
      role="status"
      aria-label={`Estado: ${status}`}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          status === SemaphoreStatus.Green
            ? 'bg-green-500'
            : status === SemaphoreStatus.Yellow
              ? 'bg-yellow-500'
              : status === SemaphoreStatus.Red
                ? 'bg-red-500'
                : 'bg-slate-400'
        }`}
        aria-hidden="true"
      />
      {status}
    </span>
  );
};

export default React.memo(SemaphoreIndicator);
