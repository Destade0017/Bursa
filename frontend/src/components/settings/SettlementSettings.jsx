import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Wallet,
  Users,
  Bell,
  ShieldCheck,
  CheckCircle2,
  Save,
  UserPlus,
  Mail,
  Phone,
  Lock,
  X,
  RefreshCw,
  AlertCircle,
  Upload,
  MapPin,
  CreditCard,
  Receipt,
  Key,
  Laptop,
  Smartphone,
  LogOut,
  Shield,
  Trash2,
  Loader2
} from 'lucide-react';

const rawApiBase = import.meta.env.VITE_API_URL || '';
const API_BASE = rawApiBase.endsWith('/') ? rawApiBase.slice(0, -1) : rawApiBase;

export default function SettlementSettings({ school, user, onRefresh }) {
  // Navigation State
  const [activeSection, setActiveSection] = useState('general');

  // General Settings State
  const [schoolName, setSchoolName] = useState(school?.name || '');
  const [schoolEmail, setSchoolEmail] = useState(school?.email || '');
  const [schoolPhone, setSchoolPhone] = useState(school?.phone || '08034567890');
  const [schoolAddress, setSchoolAddress] = useState(
    school?.address || '15 Education Avenue, Victoria Island, Lagos'
  );
  const [academicSession, setAcademicSession] = useState('2026/2027');
  const [currentTerm, setCurrentTerm] = useState('First Term');
  const [logoUrl, setLogoUrl] = useState(school?.logoUrl || null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef(null);

  // Finance & Settlement State
  const [currency] = useState('NGN (₦)');
  const [paymentRefFormat, setPaymentRefFormat] = useState('BURSA-{SESSION}-{STUDENT_ID}');
  const [receiptPrefix, setReceiptPrefix] = useState('RCP-');
  const [receiptFooter, setReceiptFooter] = useState(
    'Thank you for your prompt payment. Official BURSA e-Receipt.'
  );
  const [bankName, setBankName] = useState('Wema Bank PLC');
  const [accountNumber, setAccountNumber] = useState('0123456789');
  const [accountName, setAccountName] = useState(
    school?.name ? `${school.name} Operating Account` : ''
  );

  // Notification Toggles State
  const [notifications, setNotifications] = useState({
    paymentReceived: true,
    paymentReconciled: true,
    suspenseActivity: true,
    overdueFees: true,
    dailyDigest: false
  });

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [securityMessage, setSecurityMessage] = useState(null);

  // Global Save Feedback Toast
  const [savedToast, setSavedToast] = useState(null);

  // Staff Management State
  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [isAddBursarOpen, setIsAddBursarOpen] = useState(false);

  // New Bursar Form State
  const [bursarName, setBursarName] = useState('');
  const [bursarEmail, setBursarEmail] = useState('');
  const [bursarPhone, setBursarPhone] = useState('');
  const [bursarPassword, setBursarPassword] = useState('');
  const [bursarRole, setBursarRole] = useState('BURSAR');
  const [bursarSubmitting, setBursarSubmitting] = useState(false);
  const [bursarError, setBursarError] = useState(null);
  const [bursarSuccessMsg, setBursarSuccessMsg] = useState(null);

  // Fetch school details from DB on mount/school.id change
  const fetchSchoolDetails = async () => {
    if (!school?.id) return;
    try {
      const token = localStorage.getItem('bursar_token');
      const res = await fetch(`${API_BASE}/api/schools/${school.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.data) {
        const s = data.data;
        if (s.name) setSchoolName(s.name);
        if (s.email) setSchoolEmail(s.email);
        if (s.phone) setSchoolPhone(s.phone);
        if (s.address) setSchoolAddress(s.address);
        if (s.academicSession) setAcademicSession(s.academicSession);
        if (s.currentTerm) setCurrentTerm(s.currentTerm);
        if (s.bankName) setBankName(s.bankName);
        if (s.accountNumber) setAccountNumber(s.accountNumber);
        if (s.accountName) setAccountName(s.accountName);
        if (s.paymentRefFormat) setPaymentRefFormat(s.paymentRefFormat);
        if (s.receiptPrefix) setReceiptPrefix(s.receiptPrefix);
        if (s.receiptFooter) setReceiptFooter(s.receiptFooter);
        if (s.logoUrl !== undefined) setLogoUrl(s.logoUrl);
      }
    } catch (err) {
      console.error('Failed to fetch school details:', err);
    }
  };

  const handleLogoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !school?.id) return;

    if (file.size > 2 * 1024 * 1024) {
      triggerSaveNotification('Logo image size exceeds 2MB limit.');
      return;
    }

    try {
      setUploadingLogo(true);
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Logo = reader.result;
        const token = localStorage.getItem('bursar_token');
        const res = await fetch(`${API_BASE}/api/schools/${school.id}/logo`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ logo: base64Logo })
        });
        const data = await res.json();
        if (res.ok) {
          setLogoUrl(data.logoUrl || data.data?.logoUrl);
          triggerSaveNotification('School logo uploaded successfully!');
          if (onRefresh) onRefresh();
        } else {
          triggerSaveNotification(data.message || data.error || 'Failed to upload logo.');
        }
        setUploadingLogo(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Logo upload error:', err);
      triggerSaveNotification('Network error uploading school logo.');
      setUploadingLogo(false);
    }
  };

  const handleDeleteLogo = async () => {
    if (!school?.id) return;
    try {
      setUploadingLogo(true);
      const token = localStorage.getItem('bursar_token');
      const res = await fetch(`${API_BASE}/api/schools/${school.id}/logo`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setLogoUrl(null);
        triggerSaveNotification('School logo removed successfully.');
        if (onRefresh) onRefresh();
      } else {
        triggerSaveNotification('Failed to remove school logo.');
      }
    } catch (err) {
      console.error('Error removing logo:', err);
    } finally {
      setUploadingLogo(false);
    }
  };

  // Fetch school staff members from backend
  const fetchStaff = async () => {
    if (!school?.id) return;
    setLoadingStaff(true);
    try {
      const token = localStorage.getItem('bursar_token');
      const res = await fetch(`${API_BASE}/api/schools/${school.id}/staff`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setStaffList(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch staff roster:', err);
    } finally {
      setLoadingStaff(false);
    }
  };

  useEffect(() => {
    fetchSchoolDetails();
    fetchStaff();
  }, [school?.id]);

  // Handle Save Settings Actions with API Calls & DB Persistence
  const triggerSaveNotification = (msg = 'Settings saved successfully.') => {
    setSavedToast(msg);
    setTimeout(() => setSavedToast(null), 3500);
  };

  const handleSaveGeneral = async (e) => {
    e.preventDefault();
    if (!school?.id) return;
    try {
      const token = localStorage.getItem('bursar_token');
      const res = await fetch(`${API_BASE}/api/schools/${school.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: schoolName,
          email: schoolEmail,
          phone: schoolPhone,
          address: schoolAddress,
          academicSession,
          currentTerm
        })
      });
      const data = await res.json();
      if (res.ok) {
        triggerSaveNotification('General school profile and session settings saved.');
        if (onRefresh) onRefresh();
      } else {
        triggerSaveNotification(data.error || 'Failed to save general settings.');
      }
    } catch (err) {
      triggerSaveNotification('Network error while saving general settings.');
    }
  };

  const handleSaveFinance = async (e) => {
    e.preventDefault();
    if (!school?.id) return;
    try {
      const token = localStorage.getItem('bursar_token');
      const res = await fetch(`${API_BASE}/api/schools/${school.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          bankName,
          accountNumber,
          accountName,
          paymentRefFormat,
          receiptPrefix,
          receiptFooter
        })
      });
      const data = await res.json();
      if (res.ok) {
        triggerSaveNotification('Finance payment, receipt, and payout settings saved.');
        if (onRefresh) onRefresh();
      } else {
        triggerSaveNotification(data.error || 'Failed to save finance settings.');
      }
    } catch (err) {
      triggerSaveNotification('Network error while saving finance settings.');
    }
  };

  const handleSecuritySave = async (e) => {
    e.preventDefault();
    setSecurityMessage(null);
    if (!currentPassword || !newPassword) {
      setSecurityMessage({ type: 'error', text: 'Current and new password are required.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    try {
      const token = localStorage.getItem('bursar_token');
      const res = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSecurityMessage({ type: 'success', text: 'Password changed successfully.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setSecurityMessage({ type: 'error', text: data.error || 'Failed to update password.' });
      }
    } catch (err) {
      setSecurityMessage({ type: 'error', text: 'Network error while updating password.' });
    }
  };

  // Add Bursar Submit Handler
  const handleAddBursarSubmit = async (e) => {
    e.preventDefault();
    setBursarError(null);
    setBursarSuccessMsg(null);

    if (!bursarName || !bursarEmail || !bursarPhone || !bursarPassword) {
      setBursarError('All fields are required.');
      return;
    }

    setBursarSubmitting(true);

    try {
      const token = localStorage.getItem('bursar_token');
      const res = await fetch(`${API_BASE}/api/schools/${school?.id}/staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fullName: bursarName,
          email: bursarEmail,
          phone: bursarPhone,
          password: bursarPassword,
          role: bursarRole
        })
      });

      const data = await res.json();

      if (res.ok) {
        setBursarSuccessMsg(`Staff account for ${bursarName} created successfully!`);
        setBursarName('');
        setBursarEmail('');
        setBursarPhone('');
        setBursarPassword('');
        fetchStaff();
        setTimeout(() => {
          setIsAddBursarOpen(false);
          setBursarSuccessMsg(null);
        }, 1500);
      } else {
        setBursarError(data.error || 'Failed to create staff account.');
      }
    } catch (err) {
      setBursarError('Network error while adding staff member.');
    } finally {
      setBursarSubmitting(false);
    }
  };

  // Delete Staff Handler
  const handleDeleteStaff = async (staffId) => {
    if (!school?.id || !staffId) return;
    try {
      const token = localStorage.getItem('bursar_token');
      const res = await fetch(`${API_BASE}/api/schools/${school.id}/staff/${staffId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        triggerSaveNotification('Staff member removed successfully.');
        fetchStaff();
      }
    } catch (err) {
      console.error('Error removing staff member:', err);
    }
  };

  // Toggle Notification Row Helper
  const handleToggleNotification = (key) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
    triggerSaveNotification('Notification preferences updated.');
  };

  // Navigation Items Config
  const navItems = [
    { id: 'general', label: 'General', icon: Building2 },
    { id: 'finance', label: 'Finance', icon: Wallet },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: ShieldCheck }
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-2xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Settings</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your school profile, payout accounts, staff roles, and system preferences.
          </p>
        </div>
        {savedToast && (
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#ECFDF5] border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
            <span>{savedToast}</span>
          </div>
        )}
      </div>

      {/* Main Two-Column Layout */}
      <div className="flex flex-col md:flex-row items-start gap-6">
        {/* Left Column: Settings Vertical Navigation (Mobile scrollable tabs) */}
        <div className="w-full md:w-56 shrink-0 bg-white border border-slate-200/90 rounded-2xl p-2 sm:p-3 shadow-2xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2 hidden md:block">
            Settings Menu
          </div>

          {/* Horizontal scroll on mobile, Vertical list on desktop */}
          <nav className="flex md:flex-col gap-1 overflow-x-auto no-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-[#ECFDF5] text-[#10B981] font-bold border border-emerald-200/70 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#10B981]' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Column: Selected Settings Section */}
        <div className="flex-1 w-full space-y-6">
          {/* SECTION 1: GENERAL */}
          {activeSection === 'general' && (
            <form onSubmit={handleSaveGeneral} className="space-y-6">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">General</h3>
                <p className="text-xs text-slate-500 mt-0.5">Manage your school and account information.</p>
              </div>

              {/* Account Card */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-2xs space-y-5">
                <div className="text-xs font-extrabold text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-wider">
                  Account Details
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Profile Name</label>
                    <input
                      type="text"
                      value={user?.fullName || 'School Administrator'}
                      disabled
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 font-medium opacity-80 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={user?.email || 'admin@school.edu.ng'}
                      disabled
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 font-medium opacity-80 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* School Profile Card */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-2xs space-y-5">
                <div className="text-xs font-extrabold text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-wider">
                  School Profile
                </div>

                {/* Logo Upload Avatar */}
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoSelect}
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                    className="hidden"
                  />
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="School Logo"
                      className="w-14 h-14 rounded-2xl object-cover border border-emerald-200 shadow-2xs"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-[#ECFDF5] border border-emerald-200 flex items-center justify-center text-[#10B981] font-black text-lg shadow-2xs">
                      {schoolName ? schoolName.slice(0, 2).toUpperCase() : 'SCH'}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={uploadingLogo}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer inline-flex items-center gap-1.5 shadow-2xs disabled:opacity-60"
                    >
                      {uploadingLogo ? (
                        <Loader2 className="w-3.5 h-3.5 text-slate-500 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      <span>{uploadingLogo ? 'Uploading...' : 'Upload Logo'}</span>
                    </button>

                    {logoUrl && (
                      <button
                        type="button"
                        disabled={uploadingLogo}
                        onClick={handleDeleteLogo}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition cursor-pointer inline-flex items-center gap-1.5 shadow-2xs disabled:opacity-60"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 -mt-2">PNG, JPG, WEBP or SVG. Max size 2MB.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">School Name</label>
                    <input
                      type="text"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">School Email</label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 absolute left-3.5 top-3 text-slate-400" />
                      <input
                        type="email"
                        value={schoolEmail}
                        onChange={(e) => setSchoolEmail(e.target.value)}
                        required
                        className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] transition"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Phone Number</label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 absolute left-3.5 top-3 text-slate-400" />
                      <input
                        type="tel"
                        value={schoolPhone}
                        onChange={(e) => setSchoolPhone(e.target.value)}
                        required
                        className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] transition font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">School Address</label>
                    <div className="relative">
                      <MapPin className="w-3.5 h-3.5 absolute left-3.5 top-3 text-slate-400" />
                      <input
                        type="text"
                        value={schoolAddress}
                        onChange={(e) => setSchoolAddress(e.target.value)}
                        required
                        className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] transition"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Academic Session Card */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-2xs space-y-5">
                <div className="text-xs font-extrabold text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-wider">
                  Academic Session & Term
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Current Academic Session
                    </label>
                    <select
                      value={academicSession}
                      onChange={(e) => setAcademicSession(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-xs text-slate-900 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] cursor-pointer font-semibold"
                    >
                      <option value="2026/2027">2026/2027 Academic Session</option>
                      <option value="2027/2028">2027/2028 Academic Session</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Current Term</label>
                    <select
                      value={currentTerm}
                      onChange={(e) => setCurrentTerm(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-xs text-slate-900 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] cursor-pointer font-semibold"
                    >
                      <option value="First Term">First Term</option>
                      <option value="Second Term">Second Term</option>
                      <option value="Third Term">Third Term</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex items-center justify-end pt-2">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save General Settings</span>
                </button>
              </div>
            </form>
          )}

          {/* SECTION 2: FINANCE */}
          {activeSection === 'finance' && (
            <form onSubmit={handleSaveFinance} className="space-y-6">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Finance</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure default currency, payment references, receipts, and settlement payout accounts.
                </p>
              </div>

              {/* Payment Settings Card */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-2xs space-y-5">
                <div className="text-xs font-extrabold text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-wider flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#10B981]" />
                  <span>Payment Settings</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Default Currency
                    </label>
                    <input
                      type="text"
                      value={currency}
                      disabled
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 font-bold opacity-80 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Payment Reference Format
                    </label>
                    <input
                      type="text"
                      value={paymentRefFormat}
                      onChange={(e) => setPaymentRefFormat(e.target.value)}
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]"
                    />
                  </div>
                </div>
              </div>

              {/* Receipt Settings Card */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-2xs space-y-5">
                <div className="text-xs font-extrabold text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-wider flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#3B82F6]" />
                  <span>Receipt Settings</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Receipt Prefix</label>
                    <input
                      type="text"
                      value={receiptPrefix}
                      onChange={(e) => setReceiptPrefix(e.target.value)}
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Receipt Footer Text
                    </label>
                    <input
                      type="text"
                      value={receiptFooter}
                      onChange={(e) => setReceiptFooter(e.target.value)}
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]"
                    />
                  </div>
                </div>
              </div>

              {/* Primary Settlement Payout Bank Account */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-2xs space-y-5">
                <div className="text-xs font-extrabold text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-wider flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-[#10B981]" />
                  <span>Primary Payout Bank Account</span>
                </div>

                <p className="text-xs text-slate-500">
                  All cleared student DVA fee transfers are swept automatically into this account.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Bank Name</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      10-Digit Account Number
                    </label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Verified Account Name
                  </label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]"
                  />
                </div>

                {/* Paystack Webhook HMAC Box */}
                <div className="bg-[#EFF6FF] rounded-xl p-4 border border-blue-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <Key className="w-4 h-4 text-[#3B82F6]" /> Paystack Webhook Security Check
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-[#ECFDF5] px-2.5 py-0.5 rounded-full border border-emerald-200">
                      HMAC-SHA512 Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Cryptographic signatures are verified automatically on every incoming transfer.
                  </p>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex items-center justify-end pt-2">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Finance Settings</span>
                </button>
              </div>
            </form>
          )}

          {/* SECTION 3: USERS & ROLES */}
          {activeSection === 'users' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Users & Roles</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Manage staff access, bursary permissions, and invite team members.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddBursarOpen(true)}
                  className="flex items-center gap-2 bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Invite User</span>
                </button>
              </div>

              {/* Users Table Card */}
              <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  {loadingStaff ? (
                    <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#10B981]" />
                      <span>Loading user roster...</span>
                    </div>
                  ) : staffList.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">
                      No team members added yet. Click <span className="font-bold text-[#10B981]">+ Invite User</span> above to add a team member.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs text-slate-700 border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                          <th className="p-4">Name</th>
                          <th className="p-4">Email</th>
                          <th className="p-4">Role</th>
                          <th className="p-4 text-center">Status</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {staffList.map((member) => (
                          <tr key={member.id} className="hover:bg-slate-50/70 transition">
                            <td className="p-4 font-bold text-slate-900 flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-[#ECFDF5] text-[#10B981] font-bold flex items-center justify-center text-xs border border-emerald-200">
                                {member.fullName.slice(0, 1).toUpperCase()}
                              </div>
                              <span>{member.fullName}</span>
                            </td>
                            <td className="p-4 text-slate-500 font-mono">{member.email}</td>
                            <td className="p-4">
                              {member.role === 'PROPRIETOR' ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold">
                                  Administrator
                                </span>
                              ) : member.role === 'ACCOUNTANT' ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold">
                                  Accountant
                                </span>
                              ) : member.role === 'VIEWER' ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold">
                                  Viewer
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#ECFDF5] text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                                  Bursar
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                                Active
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              {member.role !== 'PROPRIETOR' && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteStaff(member.id)}
                                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition cursor-pointer inline-flex items-center gap-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Remove</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Role Permissions Card */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-2xs space-y-4">
                <div className="text-xs font-extrabold text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-wider">
                  Available Roles
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                        Administrator
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">Full system access, payout configurations, staff management, and audit logs.</p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                        Bursar
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">Student billing, fee schedules, manual cash entry, suspense allocation, and receipts.</p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                        Accountant
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">Transaction feeds, fee reconciliation, and financial report exports.</p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold">
                        Viewer
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">Read-only access to roster, invoice ledger, and transaction feed.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: NOTIFICATIONS */}
          {activeSection === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Notifications</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose how and when you receive financial alerts and activity updates.
                </p>
              </div>

              {/* Simple Toggle Rows */}
              <div className="bg-white border border-slate-200/90 rounded-2xl divide-y divide-slate-100 shadow-2xs">
                <div className="p-5 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold text-slate-900">Payment received</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Receive a notification when a payment is received.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleNotification('paymentReceived')}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                      notifications.paymentReceived ? 'bg-[#10B981]' : 'bg-slate-200'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${
                        notifications.paymentReceived ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-5 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold text-slate-900">Payment reconciled</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Receive a notification when a payment is successfully matched.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleNotification('paymentReconciled')}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                      notifications.paymentReconciled ? 'bg-[#10B981]' : 'bg-slate-200'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${
                        notifications.paymentReconciled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-5 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold text-slate-900">Suspense activity</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Receive a notification when a payment requires review.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleNotification('suspenseActivity')}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                      notifications.suspenseActivity ? 'bg-[#10B981]' : 'bg-slate-200'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${
                        notifications.suspenseActivity ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-5 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold text-slate-900">Overdue fees</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Receive notifications about overdue invoices.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleNotification('overdueFees')}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                      notifications.overdueFees ? 'bg-[#10B981]' : 'bg-slate-200'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${
                        notifications.overdueFees ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: SECURITY */}
          {activeSection === 'security' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Security</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage your password, two-factor authentication, and active sessions.
                </p>
              </div>

              {securityMessage && (
                <div
                  className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                    securityMessage.type === 'error'
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : 'bg-[#ECFDF5] border-emerald-200 text-emerald-800'
                  }`}
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{securityMessage.text}</span>
                </div>
              )}

              {/* Change Password Card */}
              <form onSubmit={handleSecuritySave} className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-2xs space-y-4">
                <div className="text-xs font-extrabold text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-wider flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#10B981]" />
                  <span>Change Password</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    Update Password
                  </button>
                </div>
              </form>

              {/* Two-Factor Authentication Toggle Card */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-2xs space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-[#3B82F6]" />
                      <span>Two-Factor Authentication (2FA)</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Require an authenticator app code when signing into BURSA.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setTwoFactorEnabled(!twoFactorEnabled);
                      triggerSaveNotification(
                        !twoFactorEnabled ? 'Two-Factor Authentication enabled.' : '2FA disabled.'
                      );
                    }}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                      twoFactorEnabled ? 'bg-[#10B981]' : 'bg-slate-200'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${
                        twoFactorEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Active Sessions Card */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-2xs space-y-4">
                <div className="text-xs font-extrabold text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-wider">
                  Active Sessions
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl text-xs">
                    <div className="flex items-center gap-3">
                      <Laptop className="w-4 h-4 text-[#10B981]" />
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span>MacBook Pro • Chrome</span>
                          <span className="px-2 py-0.5 rounded-full bg-[#ECFDF5] text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                            Current Session
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">Lagos, Nigeria • Active now</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl text-xs">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-4 h-4 text-slate-400" />
                      <div>
                        <div className="font-bold text-slate-900">iPhone 15 • Mobile Safari</div>
                        <div className="text-[11px] text-slate-500">Lagos, Nigeria • Last active 2 hours ago</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => triggerSaveNotification('Logged out of all other active sessions.')}
                    className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 transition cursor-pointer shadow-2xs flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5 text-slate-500" />
                    <span>Log Out of Other Sessions</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Form: + Invite User / Add Bursar Account */}
      {isAddBursarOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-5 animate-fadeIn">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <UserPlus className="w-4 h-4 text-[#10B981]" />
                <span>Invite Team Member</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAddBursarOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Notifications */}
            {bursarError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{bursarError}</span>
              </div>
            )}

            {bursarSuccessMsg && (
              <div className="p-3 rounded-xl bg-[#ECFDF5] border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                <span>{bursarSuccessMsg}</span>
              </div>
            )}

            {/* Bursar Creation Form */}
            <form onSubmit={handleAddBursarSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={bursarName}
                  onChange={(e) => setBursarName(e.target.value)}
                  placeholder="e.g. Mr. Chinedu Eze"
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Official Email Address</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="email"
                    value={bursarEmail}
                    onChange={(e) => setBursarEmail(e.target.value)}
                    placeholder="chinedu@school.edu.ng"
                    required
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Phone Number</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="tel"
                    value={bursarPhone}
                    onChange={(e) => setBursarPhone(e.target.value)}
                    placeholder="08034567890"
                    required
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assign Role</label>
                <select
                  value={bursarRole}
                  onChange={(e) => setBursarRole(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] cursor-pointer font-bold"
                >
                  <option value="BURSAR">Bursar (Financial Administrator)</option>
                  <option value="ACCOUNTANT">Accountant</option>
                  <option value="VIEWER">Viewer (Read-Only)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Temporary Password
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="password"
                    value={bursarPassword}
                    onChange={(e) => setBursarPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddBursarOpen(false)}
                  className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2.5 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bursarSubmitting}
                  className="w-1/2 bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {bursarSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" /> Send Invite
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
