import React from 'react';
import { CreditCard } from 'lucide-react';

interface PaymentMethodProps {
  paymentType: string;
  setPaymentType: (type: string) => void;
}

export const PaymentMethod: React.FC<PaymentMethodProps> = ({ paymentType, setPaymentType }) => {
  const methods = [
    { id: 'bank_transfer', label: 'Transfer Bank / VA' },
    { id: 'qris', label: 'QRIS / E-Wallet' },
    { id: 'credit_card', label: 'Kartu Kredit' },
  ];

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
      <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-4">
        <CreditCard className="w-5 h-5 text-gray-900" />
        <h2 className="text-base font-bold font-headline text-gray-900">
          3. Metode Pembayaran
        </h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {methods.map((pm) => (
          <button
            key={pm.id}
            onClick={() => setPaymentType(pm.id)}
            className={`p-3.5 rounded-xl border text-left text-xs font-label transition-all cursor-pointer ${
              paymentType === pm.id
                ? 'border-black bg-gray-50 font-bold text-gray-900'
                : 'border-gray-200 text-gray-600 hover:border-gray-400'
            }`}
          >
            {pm.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PaymentMethod;
