import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import AuthScreen from './components/auth/AuthScreen.jsx';
import Sidebar from './components/layout/Sidebar.jsx';
import AppHeader from './components/layout/AppHeader.jsx';
import MetricRibbon from './components/dashboard/MetricRibbon.jsx';
import DashboardOverview from './components/dashboard/DashboardOverview.jsx';
import StudentTable from './components/roster/StudentTable.jsx';
import StudentLedgerDrawer from './components/roster/StudentLedgerDrawer.jsx';
import BillingInvoicesView from './components/billing/BillingInvoicesView.jsx';
import FeeScheduleManager from './components/billing/FeeScheduleManager.jsx';
import CashDrawerView from './components/cash/CashDrawerView.jsx';
import CashApprovalsPageView from './components/cash/CashApprovalsPageView.jsx';
import TransactionFeed from './components/transactions/TransactionFeed.jsx';
import SuspenseQueueView from './components/suspense/SuspenseQueueView.jsx';
import ReminderConsole from './components/reminders/ReminderConsole.jsx';
import SettlementSettings from './components/settings/SettlementSettings.jsx';
import CsvUploadModal from './components/CsvUploadModal.jsx';
import ReceiptModal from './components/ReceiptModal.jsx';
import AddStudentModal from './components/modals/AddStudentModal.jsx';
import CommandPalette from './components/CommandPalette.jsx';
import ParentPortal from './pages/ParentPortal.jsx';
import {
  useSchools,
  useStudents,
  useInvoices,
  useSuspenseItems,
  useSimulatePaymentMutation
} from './api/queryHooks.js';
import {
  CreditCard,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // Auth Session State
  const [token, setToken] = useState(() => localStorage.getItem('bursar_token') || null);
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('bursar_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Mobile Sidebar Drawer State
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  // TanStack Query Hooks
  const { data: schoolsData = [] } = useSchools(token);

  const selectedSchool = React.useMemo(() => {
    const targetSchoolId = currentUser?.schoolId;
    if (targetSchoolId && schoolsData.length > 0) {
      const matched = schoolsData.find((s) => s.id === targetSchoolId);
      if (matched) return matched;
    }
    // IfcurrentUser has a school object attached directly on login payload, use it
    if (currentUser?.school) return currentUser.school;
    return schoolsData.length > 0 ? schoolsData[0] : null;
  }, [schoolsData, currentUser]);

  const schoolId = currentUser?.schoolId || selectedSchool?.id;

  const {
    data: students = [],
    isLoading: loadingStudents,
    refetch: refetchStudents
  } = useStudents(schoolId, token);

  const {
    data: invoices = [],
    isLoading: loadingInvoices,
    refetch: refetchInvoices
  } = useInvoices(schoolId, token);

  const {
    data: suspenseItems = [],
    isLoading: loadingSuspense,
    refetch: refetchSuspense
  } = useSuspenseItems(schoolId, token);

  const simulatePaymentMutation = useSimulatePaymentMutation(token);

  const loading = Boolean(token && (loadingStudents || loadingInvoices || loadingSuspense));

  // Fetch pending cash approvals count for sidebar badge
  const fetchPendingApprovals = useCallback(async () => {
    if (!schoolId || !token) return;
    try {
      const res = await fetch(
        `${API_BASE}/api/schools/${schoolId}/cash-drawer/handovers?status=PENDING_VERIFICATION`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      if (res.ok) {
        const data = await res.json();
        setPendingApprovalsCount(data.handovers?.length || 0);
      }
    } catch {
      // Non-critical badge counter
    }
  }, [schoolId, token]);

  useEffect(() => {
    fetchPendingApprovals();
  }, [fetchPendingApprovals]);

  const fetchData = () => {
    refetchStudents();
    refetchInvoices();
    refetchSuspense();
    fetchPendingApprovals();
  };

  // Modal & Drawer States
  const [selectedStudentForLedger, setSelectedStudentForLedger] = useState(null);
  const [selectedStudentForPayment, setSelectedStudentForPayment] = useState(null);
  const [selectedStudentForReceipt, setSelectedStudentForReceipt] = useState(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Simulation Form States
  const [paymentAmountNaira, setPaymentAmountNaira] = useState('');
  const [toastNotification, setToastNotification] = useState(null);

  // Global Keyboard Shortcut (Cmd + K / Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  // Handle Login & Session Initialization
  const handleLoginSuccess = (newToken, newUser) => {
    localStorage.setItem('bursar_token', newToken);
    localStorage.setItem('bursar_user', JSON.stringify(newUser));
    setToken(newToken);
    setCurrentUser(newUser);
    navigate('/overview');
  };

  // Handle Sign Out
  const handleLogout = () => {
    localStorage.removeItem('bursar_token');
    localStorage.removeItem('bursar_user');
    setToken(null);
    setCurrentUser(null);
  };

  // Handle Bank Transfer Payment Simulation via TanStack Mutation
  const handleSimulatePayment = async (e) => {
    e.preventDefault();
    if (!selectedStudentForPayment || !paymentAmountNaira || Number(paymentAmountNaira) <= 0) return;

    try {
      const accountNumber = selectedStudentForPayment.virtualAccount?.accountNumber;
      await simulatePaymentMutation.mutateAsync({
        accountNumber,
        amountNaira: Number(paymentAmountNaira)
      });

      setToastNotification({
        type: 'success',
        message: `Bank transfer received! Reconciled ₦${Number(paymentAmountNaira).toLocaleString()} for ${selectedStudentForPayment.firstName} ${selectedStudentForPayment.lastName}.`
      });
      setPaymentAmountNaira('');
      setTimeout(() => setToastNotification(null), 5000);
      setSelectedStudentForPayment(null);
    } catch (err) {
      setToastNotification({
        type: 'error',
        message: err.message || 'Payment reconciliation failed.'
      });
    }
  };

  // Public Parent Portal Route (Unauthenticated)
  if (location.pathname.startsWith('/portal')) {
    return (
      <Routes>
        <Route path="/portal/*" element={<ParentPortal />} />
      </Routes>
    );
  }

  // If user is not authenticated, render AuthScreen
  if (!token || !currentUser) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Compute Metrics for Badges
  const totalBilledKobo = invoices.reduce((acc, inv) => acc + (inv.totalAmountKobo || 0), 0);
  const totalCollectedKobo = invoices.reduce((acc, inv) => acc + (inv.amountPaidKobo || 0), 0);
  const unpaidStudentsCount = students.filter((s) => {
    const studentInvoices = invoices.filter((inv) => inv.studentId === s.id);
    const latest = studentInvoices[0];
    return latest && (latest.status === 'UNPAID' || latest.status === 'PART_PAID');
  }).length;

  // Active Tab determination based on current path
  const getActiveTab = () => {
    const p = location.pathname;
    if (p.startsWith('/students') || p.startsWith('/roster')) return 'roster';
    if (p.startsWith('/billing')) return 'billing';
    if (p.startsWith('/fee-schedules')) return 'fee-schedules';
    if (p.startsWith('/cash-approvals')) return 'cash-approvals';
    if (p.startsWith('/cash') || p.startsWith('/cash-drawer')) return 'cash-drawer';
    if (p.startsWith('/transactions')) return 'transactions';
    if (p.startsWith('/suspense')) return 'suspense';
    if (p.startsWith('/reminders')) return 'reminders';
    if (p.startsWith('/settings')) return 'settings';
    return 'overview';
  };

  const activeTab = getActiveTab();

  const tabTitles = {
    overview: 'Executive Dashboard',
    roster: 'Student Roster',
    billing: 'Billing & Invoices',
    'fee-schedules': 'Fee Schedules',
    transactions: 'Transaction Feed',
    suspense: 'Suspense Queue',
    reminders: 'Payment Reminders',
    'cash-drawer': 'Cash Drawer',
    'cash-approvals': 'Cash Approvals',
    settings: 'Settings'
  };

  const handleTabNavigation = (tabKey) => {
    const tabMap = {
      overview: '/overview',
      roster: '/students',
      students: '/students',
      billing: '/billing',
      'fee-schedules': '/fee-schedules',
      transactions: '/transactions',
      suspense: '/suspense',
      reminders: '/reminders',
      'cash-drawer': '/cash',
      cash: '/cash',
      'cash-approvals': '/cash-approvals',
      settings: '/settings'
    };
    navigate(tabMap[tabKey] || `/${tabKey}`);
  };

  return (
    <div className="bg-slate-50 min-h-screen font-sans text-slate-900 antialiased flex">
      {/* 1. Persistent Left SaaS Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabNavigation}
        school={selectedSchool}
        currentUser={currentUser}
        studentsCount={students.length}
        invoicesCount={invoices.length}
        suspenseCount={suspenseItems.length}
        unpaidCount={unpaidStudentsCount}
        pendingApprovalsCount={pendingApprovalsCount}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        onLogout={handleLogout}
      />

      {/* 2. Main Right Content Canvas (Offset for Persistent Desktop Sidebar) */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen lg:pl-64 xl:pl-72 transition-all duration-200">
        {/* Top Header */}
        <AppHeader
          selectedSchool={selectedSchool}
          currentUser={currentUser}
          onLogout={handleLogout}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          activeTabTitle={tabTitles[activeTab]}
        />

        {/* Toast Notification Container */}
        {toastNotification && (
          <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-4 w-full">
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between shadow-xs ${
                toastNotification.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {toastNotification.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span className="text-xs sm:text-sm font-medium">
                  {toastNotification.message}
                </span>
              </div>
              <button
                onClick={() => setToastNotification(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Route Content */}
        <main className="max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Loader2 className="w-7 h-7 animate-spin text-emerald-600 mb-2.5" />
              <p className="text-xs font-medium">Loading workspace records...</p>
            </div>
          ) : (
            <Routes>
              <Route path="/" element={<Navigate to="/overview" replace />} />
              <Route
                path="/overview"
                element={
                  <DashboardOverview
                    school={selectedSchool}
                    currentUser={currentUser}
                    students={students}
                    invoices={invoices}
                    suspenseItems={suspenseItems}
                    onNavigateTab={handleTabNavigation}
                    onOpenCashModal={() => navigate('/cash')}
                    onOpenCsvModal={() => setIsCsvModalOpen(true)}
                    onOpenAddStudentModal={() => setIsAddStudentModalOpen(true)}
                    onRefresh={fetchData}
                  />
                }
              />
              <Route
                path="/students"
                element={
                  <div className="space-y-6">
                    <MetricRibbon
                      totalBilledKobo={totalBilledKobo}
                      totalCollectedKobo={totalCollectedKobo}
                      totalStudents={students.length}
                      unpaidStudentsCount={unpaidStudentsCount}
                    />
                    <StudentTable
                      students={students}
                      invoices={invoices}
                      school={selectedSchool}
                      onSelectStudentForLedger={(student) => setSelectedStudentForLedger(student)}
                      onSimulatePayment={(student) => setSelectedStudentForPayment(student)}
                      onOpenReceipt={(student) => setSelectedStudentForReceipt(student)}
                      onOpenCsvModal={() => setIsCsvModalOpen(true)}
                      onOpenAddStudentModal={() => setIsAddStudentModalOpen(true)}
                    />
                  </div>
                }
              />
              <Route
                path="/roster"
                element={<Navigate to="/students" replace />}
              />
              <Route
                path="/billing"
                element={
                  <BillingInvoicesView
                    invoices={invoices}
                    students={students}
                    school={selectedSchool}
                    onNavigateTab={handleTabNavigation}
                    onOpenReceipt={(student) => setSelectedStudentForReceipt(student)}
                    onRefresh={fetchData}
                  />
                }
              />
              <Route
                path="/fee-schedules"
                element={
                  <FeeScheduleManager
                    school={selectedSchool}
                    students={students}
                    token={token}
                    onRefresh={fetchData}
                    onNavigateTab={handleTabNavigation}
                  />
                }
              />
              <Route
                path="/cash"
                element={
                  <CashDrawerView
                    school={selectedSchool}
                    currentUser={currentUser}
                    onOpenCashModal={() => {
                      if (students.length > 0) {
                        setSelectedStudentForPayment(students[0]);
                      }
                    }}
                    onRefresh={fetchData}
                  />
                }
              />
              <Route
                path="/cash-drawer"
                element={<Navigate to="/cash" replace />}
              />
              <Route
                path="/cash-approvals"
                element={
                  <CashApprovalsPageView
                    school={selectedSchool}
                    currentUser={currentUser}
                    onRefresh={fetchData}
                  />
                }
              />
              <Route
                path="/transactions"
                element={<TransactionFeed schoolId={selectedSchool?.id} />}
              />
              <Route
                path="/suspense"
                element={
                  <SuspenseQueueView
                    suspenseItems={suspenseItems}
                    students={students}
                    school={selectedSchool}
                    onAllocated={fetchData}
                    onRefresh={fetchData}
                  />
                }
              />
              <Route
                path="/reminders"
                element={
                  <ReminderConsole
                    students={students}
                    invoices={invoices}
                    school={selectedSchool}
                  />
                }
              />
              <Route
                path="/settings"
                element={<SettlementSettings school={selectedSchool} user={currentUser} />}
              />
              <Route path="*" element={<Navigate to="/overview" replace />} />
            </Routes>
          )}
        </main>
      </div>

      {/* 4. Global Command Palette Overlay (⌘K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        students={students}
        onSelectStudent={(st) => setSelectedStudentForLedger(st)}
        onOpenCashModal={() => {
          if (students.length > 0) setSelectedStudentForPayment(students[0]);
        }}
        onOpenCsvModal={() => setIsCsvModalOpen(true)}
        onOpenAddStudentModal={() => setIsAddStudentModalOpen(true)}
      />

      {/* 5. Slide-Over Drawers & Global Modals */}
      {selectedStudentForLedger && (
        <StudentLedgerDrawer
          student={selectedStudentForLedger}
          school={selectedSchool}
          onClose={() => setSelectedStudentForLedger(null)}
          onSimulatePayment={(st) => {
            setSelectedStudentForPayment(st);
            setSelectedStudentForLedger(null);
          }}
          onOpenReceipt={(st) => {
            setSelectedStudentForReceipt(st);
            setSelectedStudentForLedger(null);
          }}
        />
      )}

      {selectedStudentForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl relative text-slate-900">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/60">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    Simulate Bank Transfer
                  </h3>
                  <p className="text-xs text-slate-500">
                    Triggers instant automated Paystack/NIBSS reconciliation
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentForPayment(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSimulatePayment} className="space-y-4 mt-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/70 text-xs space-y-1">
                <div className="text-slate-500">
                  Student:{' '}
                  <span className="font-semibold text-slate-900">
                    {selectedStudentForPayment.firstName} {selectedStudentForPayment.lastName}
                  </span>
                </div>
                <div className="text-slate-500">
                  Virtual Account:{' '}
                  <span className="font-mono font-medium text-slate-800">
                    {selectedStudentForPayment.virtualAccount?.bankName} •{' '}
                    {selectedStudentForPayment.virtualAccount?.accountNumber}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Amount (₦)
                </label>
                <input
                  type="number"
                  min="100"
                  value={paymentAmountNaira}
                  onChange={(e) => setPaymentAmountNaira(e.target.value)}
                  placeholder="e.g. 50000"
                  required
                  className="w-full border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-lg py-2 px-3 text-sm text-slate-900 tabular-nums outline-none transition"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedStudentForPayment(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={simulatePaymentMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg text-xs shadow-xs transition flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {simulatePaymentMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Reconciling payment...</span>
                    </>
                  ) : (
                    <span>Confirm & Reconcile</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedStudentForReceipt && (
        <ReceiptModal
          student={selectedStudentForReceipt}
          school={selectedSchool}
          onClose={() => setSelectedStudentForReceipt(null)}
        />
      )}

      {isCsvModalOpen && (
        <CsvUploadModal
          schoolId={selectedSchool?.id}
          onClose={() => setIsCsvModalOpen(false)}
          onSuccess={() => {
            fetchData();
            setIsCsvModalOpen(false);
          }}
        />
      )}

      {isAddStudentModalOpen && (
        <AddStudentModal
          schoolId={selectedSchool?.id}
          school={selectedSchool}
          token={token}
          isOpen={isAddStudentModalOpen}
          onClose={() => setIsAddStudentModalOpen(false)}
          onSuccess={() => {
            fetchData();
            setToastNotification({
              type: 'success',
              message: 'Student record and Dedicated Virtual Account created successfully!'
            });
            setTimeout(() => setToastNotification(null), 4000);
          }}
        />
      )}
    </div>
  );
}
