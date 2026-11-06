import React from 'react';
import { MapPin, Plus, CheckCircle2 } from 'lucide-react';
import { Address } from '../../../types';

interface AddressSelectorProps {
  addresses: Address[];
  selectedAddressId: number | string | null;
  onSelectAddress: (id: number | string) => void;
  onOpenAddModal: () => void;
}

export const AddressSelector: React.FC<AddressSelectorProps> = ({
  addresses,
  selectedAddressId,
  onSelectAddress,
  onOpenAddModal,
}) => {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-gray-900" />
          <h2 className="text-base font-bold font-headline text-gray-900">
            1. Alamat Pengiriman
          </h2>
        </div>
        <button
          onClick={onOpenAddModal}
          className="text-xs font-label font-bold text-gray-900 hover:underline flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Tambah Alamat
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-xs text-gray-500 mb-3">Belum ada alamat pengiriman tersimpan.</p>
          <button
            onClick={onOpenAddModal}
            className="px-4 py-2 bg-black text-white text-xs font-label rounded-xl cursor-pointer"
          >
            + Tambah Alamat Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {addresses.map((addr) => {
            const isSelected = selectedAddressId === addr.id;
            return (
              <div
                key={addr.id}
                onClick={() => addr.id && onSelectAddress(addr.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-black bg-gray-50 ring-1 ring-black'
                    : 'border-gray-200 bg-white hover:border-gray-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-label font-bold uppercase text-gray-900 bg-gray-200 px-2 py-0.5 rounded-md">
                    {addr.label}
                  </span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                </div>
                <p className="text-xs font-bold text-gray-900 mt-1">{addr.phone}</p>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                  {addr.street_address}, {addr.city}, {addr.postal_code}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AddressSelector;
