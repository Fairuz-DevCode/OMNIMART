import { useState, useEffect } from 'react';
import { useAuth } from '../../auth';
import { Address } from '../../../types';
import {
  updateUserProfile,
  changePassword,
  getAddresses,
  createAddress,
  deleteAddress,
} from '../services/profileApi';

export const useUserProfile = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'address'>('profile');

  // Profile State
  const [profileForm, setProfileForm] = useState({
    name: currentUser?.username || '',
    phone: currentUser?.phone || '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Password State
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Address State
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAddr, setNewAddr] = useState({
    label: '',
    phone: '',
    street_address: '',
    city: '',
    country: 'Indonesia',
    postal_code: '',
  });

  useEffect(() => {
    if (currentUser) {
      setProfileForm({
        name: currentUser.username || '',
        phone: currentUser.phone || '',
      });
    }
  }, [currentUser]);

  const loadAddresses = () => {
    setLoadingAddresses(true);
    getAddresses()
      .then((data) => setAddresses(data || []))
      .catch(() => {})
      .finally(() => setLoadingAddresses(false));
  };

  useEffect(() => {
    if (activeTab === 'address') {
      loadAddresses();
    }
  }, [activeTab]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setProfileSaving(true);
      await updateUserProfile(profileForm);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      alert('Gagal memperbarui profil: ' + (err.response?.data?.message || err.message));
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setPasswordSaving(true);
      await changePassword(passwordForm);
      setPasswordSuccess(true);
      setPasswordForm({ oldPassword: '', newPassword: '' });
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      alert('Gagal mengubah password: ' + (err.response?.data?.message || err.message));
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAddress(newAddr);
      setIsAddModalOpen(false);
      setNewAddr({ label: '', phone: '', street_address: '', city: '', country: 'Indonesia', postal_code: '' });
      loadAddresses();
    } catch (err: any) {
      alert('Gagal menambah alamat: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteAddress = async (id: number | string) => {
    if (!window.confirm('Hapus alamat ini?')) return;
    try {
      await deleteAddress(id);
      loadAddresses();
    } catch (err: any) {
      alert('Gagal menghapus alamat: ' + (err.response?.data?.message || err.message));
    }
  };

  return {
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
  };
};
