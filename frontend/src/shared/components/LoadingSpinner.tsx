import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ text = 'Memuat data...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-parchment-300">
      <Loader2 className="w-8 h-8 animate-spin" />
      <p className="text-sm font-label">{text}</p>
    </div>
  );
};

export default LoadingSpinner;
