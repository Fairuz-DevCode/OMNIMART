import React, { useState } from 'react';
import { Ticket, Plus } from 'lucide-react';
import Modal from '../../../shared/components/Modal';

export const ManageDiscount: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [vouchers, setVouchers] = useState([
    {
      id: 1,
      code: 'STRT30',
      desc: 'App Exclusive Drop',
      type: 'Persentase (%)',
      discount: '30% (Max 500rb)',
      used: '620 / 800',
      progress: 77.5,
      period: '1 Sep 2026 – 30 Sep 2026',
      active: true,
    },
    {
      id: 2,
      code: 'VIPFREESHIP',
      desc: 'Tier Obsidian Members',
      type: 'Ongkir Gratis',
      discount: 'Flat Rp 100.000',
      used: '189 / Tak Terbatas',
      progress: 45,
      period: 'Permanen (Always On)',
      active: true,
    },
    {
      id: 3,
      code: 'SUNBURSTFLAT',
      desc: 'End of Season Clearance',
      type: 'Nominal Tetap',
      discount: 'Rp 250.000',
      used: '100 / 100 (Full)',
      progress: 100,
      period: '1 Ags – 15 Ags 2026 (Expired)',
      active: false,
    },
  ]);

  const [newVoucher, setNewVoucher] = useState({
    code: '',
    desc: '',
    type: 'Persentase (%)',
    discount: '',
    quota: '100',
  });

  const toggleStatus = (id: number) => {
    setVouchers(vouchers.map((v) => (v.id === id ? { ...v, active: !v.active } : v)));
  };

  const handleAddVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVoucher.code) return;
    setVouchers([
      ...vouchers,
      {
        id: Date.now(),
        code: newVoucher.code.toUpperCase(),
        desc: newVoucher.desc || 'Promo Diskon Spesial',
        type: newVoucher.type,
        discount: newVoucher.discount || '15%',
        used: `0 / ${newVoucher.quota}`,
        progress: 0,
        period: '1 Okt – 31 Okt 2026',
        active: true,
      },
    ]);
    setIsModalOpen(false);
    setNewVoucher({ code: '', desc: '', type: 'Persentase (%)', discount: '', quota: '100' });
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200/90 shadow-xl shadow-gray-200/40 mb-8 font-body">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-black" />
            <h2 className="text-xl font-extrabold font-headline text-gray-900">
              Manajemen Diskon, Voucher & Drop Campaigns
            </h2>
          </div>
          <p className="text-xs text-gray-500 font-label mt-1">
            Konfigurasi kuota kampanye promosi musiman dan voucher loyalty Tier VIP.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-black hover:bg-gray-800 text-white px-4 py-2.5 rounded-2xl text-xs font-bold shadow-md transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Buat Voucher Baru</span>
        </button>
      </div>

      {/* Vouchers Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200">
        <table className="w-full text-left text-xs font-body border-collapse">
          <thead>
            <tr className="bg-gray-50/80 text-gray-500 font-label font-bold border-b border-gray-200">
              <th className="py-3.5 px-4">KODE VOUCHER</th>
              <th className="py-3.5 px-4">TIPE DISKON</th>
              <th className="py-3.5 px-4">NILAI POTONGAN</th>
              <th className="py-3.5 px-4">KUOTA TERPAKAI</th>
              <th className="py-3.5 px-4">PERIODE AKTIF</th>
              <th className="py-3.5 px-4 text-center">STATUS KAMPANYE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {vouchers.map((v) => (
              <tr key={v.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="py-3.5 px-4">
                  <span className="px-2.5 py-1 bg-black text-white font-mono font-bold rounded-lg tracking-wider text-xs">
                    {v.code}
                  </span>
                  <p className="text-[11px] text-gray-400 mt-1">{v.desc}</p>
                </td>
                <td className="py-3.5 px-4 font-bold text-gray-700">{v.type}</td>
                <td className="py-3.5 px-4 font-extrabold text-gray-900">{v.discount}</td>
                <td className="py-3.5 px-4 w-48">
                  <div className="flex justify-between text-[10px] font-bold text-gray-600 mb-1">
                    <span>{v.used}</span>
                    <span>{v.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        v.progress === 100 ? 'bg-red-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${v.progress}%` }}
                    />
                  </div>
                </td>
                <td className="py-3.5 px-4 text-gray-500 font-medium">{v.period}</td>
                <td className="py-3.5 px-4 text-center">
                  <button
                    onClick={() => toggleStatus(v.id)}
                    className={`px-3 py-1 rounded-full text-[10px] font-extrabold transition-colors cursor-pointer ${
                      v.active
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {v.active ? '• AKTIF' : '• NONAKTIF'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Add Voucher */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Buat Voucher / Kampanye Diskon Baru"
      >
        <form onSubmit={handleAddVoucher} className="space-y-4 font-body">
          <div>
            <label className="block text-xs font-label font-bold text-gray-700 mb-1">Kode Voucher</label>
            <input
              type="text"
              required
              placeholder="e.g. STREETWEAR20"
              value={newVoucher.code}
              onChange={(e) => setNewVoucher({ ...newVoucher, code: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-black outline-none font-mono uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-label font-bold text-gray-700 mb-1">Deskripsi Kampanye</label>
            <input
              type="text"
              required
              placeholder="e.g. Diskon Khusus Akhir Bulan"
              value={newVoucher.desc}
              onChange={(e) => setNewVoucher({ ...newVoucher, desc: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-black outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-label font-bold text-gray-700 mb-1">Tipe Diskon</label>
              <select
                value={newVoucher.type}
                onChange={(e) => setNewVoucher({ ...newVoucher, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-black outline-none bg-white font-label"
              >
                <option value="Persentase (%)">Persentase (%)</option>
                <option value="Nominal Tetap">Nominal Tetap (Rp)</option>
                <option value="Ongkir Gratis">Ongkir Gratis</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-label font-bold text-gray-700 mb-1">Nilai Potongan</label>
              <input
                type="text"
                required
                placeholder="e.g. 20% (Max 200rb) / Rp 50.000"
                value={newVoucher.discount}
                onChange={(e) => setNewVoucher({ ...newVoucher, discount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-black outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-black text-white font-label font-bold rounded-xl text-sm hover:bg-gray-800 transition-colors mt-2 cursor-pointer"
          >
            Simpan Voucher Baru
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default ManageDiscount;
