import React from 'react';
import { User, ShieldCheck, MapPin, Save, CheckCircle2, Loader2, KeyRound, Plus, Trash2 } from 'lucide-react';
import Modal from '../../../shared/components/Modal';
import { useUserProfile } from '../hooks/useUserProfile';

export const UserProfile: React.FC = () => {
  const {
    currentUser,
    activeTab,
    setActiveTab,
    profileForm,
    setProfileForm,
    profileSaving,
    profileSuccess,
    handleSaveProfile,
    passwordForm,
    setPasswordForm,
    passwordSaving,
    passwordSuccess,
    handleChangePassword,
    addresses,
    loadingAddresses,
    isAddModalOpen,
    setIsAddModalOpen,
    newAddr,
    setNewAddr,
    handleAddAddress,
    handleDeleteAddress,
  } = useUserProfile();

  return (
    <div className="p-4 sm:p-8 font-body max-w-5xl mx-auto">
      <h1 className="text-2xl font-extrabold font-headline tracking-wide mb-6 text-gray-900">
        Pengaturan Akun
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar Navigasi Tab */}
        <div className="space-y-1">
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-label font-bold transition cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-black text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <User size={16} />
            <span>Profil Saya</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-label font-bold transition cursor-pointer ${
              activeTab === 'security'
                ? 'bg-black text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <ShieldCheck size={16} />
            <span>Keamanan Akun</span>
          </button>

          <button
            onClick={() => setActiveTab('address')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-label font-bold transition cursor-pointer ${
              activeTab === 'address'
                ? 'bg-black text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <MapPin size={16} />
            <span>Daftar Alamat</span>
          </button>
        </div>

        {/* Area Konten Tab */}
        <div className="md:col-span-3 bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
          {/* TAB 1: PROFIL */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <h2 className="text-base font-bold font-headline border-b border-gray-100 pb-3 mb-4 text-gray-900">
                Informasi Pribadi
              </h2>

              {profileSuccess && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs">
                  <CheckCircle2 size={16} />
                  <span>Profil berhasil diperbarui!</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-label font-bold text-gray-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-black outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-label font-bold text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={currentUser?.email || ''}
                  disabled
                  className="w-full p-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-label font-bold text-gray-700 mb-1">Nomor Telepon</label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-black outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={profileSaving}
                className="w-full py-3 bg-black text-white font-label font-bold rounded-xl text-xs flex justify-center items-center gap-2 hover:bg-gray-800 transition-all mt-4 shadow-sm cursor-pointer"
              >
                {profileSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                <span>Simpan Profil</span>
              </button>
            </form>
          )}

          {/* TAB 2: KEAMANAN */}
          {activeTab === 'security' && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <h2 className="text-base font-bold font-headline border-b border-gray-100 pb-3 mb-4 text-gray-900">
                Ubah Password
              </h2>

              {passwordSuccess && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs">
                  <CheckCircle2 size={16} />
                  <span>Password berhasil diperbarui!</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-label font-bold text-gray-700 mb-1">Password Lama</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={passwordForm.oldPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-black outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-label font-bold text-gray-700 mb-1">Password Baru</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-black outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={passwordSaving}
                className="w-full py-3 bg-black text-white font-label font-bold rounded-xl text-xs flex justify-center items-center gap-2 hover:bg-gray-800 transition-all mt-4 shadow-sm cursor-pointer"
              >
                {passwordSaving ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                <span>Update Password</span>
              </button>

              {/* 2FA / MFA Section */}
              <div className="pt-6 mt-6 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold font-headline text-gray-900">Autentikasi Dua Langkah (2FA)</h3>
                    <p className="text-xs text-gray-500 font-label mt-0.5">
                      Tambahkan lapisan keamanan ekstra dengan Google Authenticator.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await (await import('../../../shared/services/api')).default.post('/auth/2fa/setup');
                        const data = res.data.payload;
                        const otp = prompt(`Scan QR Code di Google Authenticator atau masukkan key: ${data.manualKey}\n\nMasukkan 6 digit kode dari aplikasi:`);
                        if (otp) {
                          await (await import('../../../shared/services/api')).default.post('/auth/2fa/verify', { token: otp });
                          alert('✅ 2FA berhasil diaktifkan pada akun Anda!');
                        }
                      } catch (err: any) {
                        alert(err.response?.data?.message || err.message || 'Gagal mengatur 2FA');
                      }
                    }}
                    className="px-4 py-2 border border-black text-black font-label font-bold rounded-xl text-xs hover:bg-black hover:text-white transition-colors cursor-pointer"
                  >
                    Aktifkan 2FA
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 3: ALAMAT */}
          {activeTab === 'address' && (
            <div>
              <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
                <h2 className="text-base font-bold font-headline text-gray-900">Alamat Pengiriman</h2>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-3.5 py-2 bg-black text-white rounded-xl text-xs font-label font-bold flex items-center gap-1 hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <Plus size={14} /> Tambah Alamat
                </button>
              </div>

              {loadingAddresses ? (
                <div className="py-8 text-center text-gray-500 text-xs font-label">Memuat daftar alamat...</div>
              ) : addresses.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-xs font-label">
                  Belum ada alamat pengiriman tersimpan.
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className="p-4 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-xs uppercase bg-gray-200 px-2 py-0.5 rounded-md text-gray-800">
                            {addr.label}
                          </span>
                          <span className="text-xs font-bold text-gray-900">{addr.phone}</span>
                        </div>
                        <p className="text-xs text-gray-600">
                          {addr.street_address}, {addr.city}, {addr.postal_code} ({addr.country})
                        </p>
                      </div>
                      {addr.id && (
                        <button
                          onClick={() => handleDeleteAddress(addr.id!)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Alamat"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Add Address */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Tambah Alamat Baru">
        <form onSubmit={handleAddAddress} className="space-y-4">
          <div>
            <label className="block text-xs font-label font-bold text-gray-700 mb-1">Label Alamat</label>
            <input
              type="text"
              required
              placeholder="Rumah / Kantor"
              value={newAddr.label}
              onChange={(e) => setNewAddr({ ...newAddr, label: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-black outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-label font-bold text-gray-700 mb-1">Nomor Telepon</label>
            <input
              type="text"
              required
              placeholder="08123456789"
              value={newAddr.phone}
              onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-black outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-label font-bold text-gray-700 mb-1">Alamat Lengkap</label>
            <textarea
              required
              rows={2}
              placeholder="Nama Jalan, RT/RW, No. Rumah"
              value={newAddr.street_address}
              onChange={(e) => setNewAddr({ ...newAddr, street_address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-black outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-label font-bold text-gray-700 mb-1">Kota</label>
              <input
                type="text"
                required
                placeholder="Surabaya"
                value={newAddr.city}
                onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-black outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-label font-bold text-gray-700 mb-1">Kode Pos</label>
              <input
                type="text"
                required
                placeholder="60243"
                value={newAddr.postal_code}
                onChange={(e) => setNewAddr({ ...newAddr, postal_code: e.target.value })}
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
    </div>
  );
};

export default UserProfile;
