import React from 'react';
import { PackageOpen, LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  actionLabel?: string;
  actionLink?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = PackageOpen,
  title = 'Tidak ada data',
  description = 'Belum ada data untuk ditampilkan saat ini.',
  actionLabel,
  actionLink,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-parchment-200 flex items-center justify-center text-parchment-700 mb-4">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-bold font-headline text-parchment-900 mb-1">{title}</h3>
      <p className="text-sm font-body text-parchment-600 max-w-md mb-6">{description}</p>
      
      {actionLabel && actionLink && (
        <Link
          to={actionLink}
          className="px-5 py-2.5 rounded-xl bg-black text-white text-sm font-label font-medium hover:bg-gray-800 transition-colors shadow-sm"
        >
          {actionLabel}
        </Link>
      )}

      {actionLabel && onAction && !actionLink && (
        <button
          onClick={onAction}
          className="px-5 py-2.5 rounded-xl bg-black text-white text-sm font-label font-medium hover:bg-gray-800 transition-colors shadow-sm cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
