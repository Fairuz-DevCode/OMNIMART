import React from 'react';
import Modal from '../../../shared/components/Modal';

interface AddAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: {
    label: string;
    phone: string;
    street_address: string;
    city: string;
    country: string;
    postal_code: string;
  };
  setForm: React.Dispatch<React.SetStateAction<{
    label: string;
    phone: string;
    street_address: string;
    city: string;
    country: string;
    postal_code: string;
  }>>;
  onSubmit: (e: React.FormEvent) => void;
}

export const AddAddressModal: React.FC<AddAddressModalProps> = ({
  isOpen,
  onClose,
  form,
  setForm,
  onSubmit,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tambah Alamat Baru">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-label font-bold text-gray-700 mb-1">Label Alamat</label>
          <input
            type="text"
            required
            placeholder="Rumah / Kantor / Apartemen"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-black outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-label font-bold text-gray-700 mb-1">Nomor Telepon Penerima</label>
          <input
            type="text"
            required
            placeholder="08123456789"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-black outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-label font-bold text-gray-700 mb-1">Alamat Lengkap</label>
          <textarea
            required
            rows={2}
            placeholder="Nama Jalan, RT/RW, No. Rumah"
            value={form.street_address}
            onChange={(e) => setForm({ ...form, street_address: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-black outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-label font-bold text-gray-700 mb-1">Kota</label>
            <input
              type="text"
              required
              placeholder="Jakarta Selatan"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-black outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-label font-bold text-gray-700 mb-1">Kode Pos</label>
            <input
              type="text"
              required
              placeholder="12340"
              value={form.postal_code}
              onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-black outline-none"
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full py-2.5 bg-black text-white font-label font-bold rounded-xl text-sm hover:bg-gray-800 transition-colors mt-2 cursor-pointer"
        >
          Simpan Alamat
        </button>
      </form>
    </Modal>
  );
};

export default AddAddressModal;
