import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender
} from '@tanstack/react-table';
import {
  Search,
  Copy,
  Check,
  CreditCard,
  MessageCircle,
  Upload,
  Plus,
  Users,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Papa from 'papaparse';
import { formatNaira, generateWhatsAppReminderUrl } from '../../utils/formatters.js';

export default function StudentTable({
  students = [],
  invoices = [],
  school,
  onSelectStudentForLedger,
  onSimulatePayment,
  onOpenReceipt,
  onOpenCsvModal,
  onOpenAddStudentModal
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('ALL');
  const [copiedAccountId, setCopiedAccountId] = useState(null);
  const [sorting, setSorting] = useState([]);
  const [rowSelection, setRowSelection] = useState({});

  // Prepare full data list
  const data = useMemo(() => {
    return students.map((s) => {
      const studentInvoices = invoices.filter((inv) => inv.studentId === s.id);
      const latestInvoice = studentInvoices[0] || null;
      return {
        ...s,
        latestInvoice,
        totalBilledKobo: latestInvoice ? latestInvoice.totalAmountKobo : 0,
        amountPaidKobo: latestInvoice ? latestInvoice.amountPaidKobo : 0,
        status: latestInvoice ? latestInvoice.status : 'NO_INVOICE'
      };
    });
  }, [students, invoices]);

  // Extract unique class grades
  const availableClasses = useMemo(() => {
    return Array.from(new Set(students.map((s) => s.classGrade).filter(Boolean))).sort();
  }, [students]);

  // Filtered data
  const filteredData = useMemo(() => {
    return data.filter((student) => {
      const query = searchQuery.toLowerCase().trim();
      const dvaNumber = student.virtualAccount?.accountNumber || '';
      const matchesSearch =
        !query ||
        student.firstName.toLowerCase().includes(query) ||
        student.lastName.toLowerCase().includes(query) ||
        (student.parentName && student.parentName.toLowerCase().includes(query)) ||
        (student.parentPhone && student.parentPhone.includes(query)) ||
        dvaNumber.includes(query);

      const matchesStatus = statusFilter === 'ALL' || student.status === statusFilter;
      const matchesClass = classFilter === 'ALL' || student.classGrade === classFilter;

      return matchesSearch && matchesStatus && matchesClass;
    });
  }, [data, searchQuery, statusFilter, classFilter]);

  // Column definitions for TanStack Table
  const columns = useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            onClick={(e) => e.stopPropagation()}
            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
          />
        ),
        enableSorting: false
      },
      {
        accessorKey: 'firstName',
        header: 'Student',
        cell: ({ row }) => {
          const student = row.original;
          const initials = `${student.firstName?.[0] || ''}${student.lastName?.[0] || ''}`.toUpperCase();
          return (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-semibold text-xs flex items-center justify-center border border-slate-200/80 shrink-0">
                {initials || 'S'}
              </div>
              <div>
                <div className="font-medium text-slate-900 text-sm leading-snug group-hover:text-emerald-600 transition-colors">
                  {student.firstName} {student.lastName}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {student.classGrade}
                  {student.admissionNumber && (
                    <span className="font-mono text-slate-400 ml-1.5">
                      • {student.admissionNumber}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        }
      },
      {
        accessorKey: 'parentName',
        header: 'Parent / Contact',
        cell: ({ row }) => {
          const student = row.original;
          return (
            <div>
              <div className="text-sm font-normal text-slate-800">
                {student.parentName || 'N/A'}
              </div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">
                {student.parentPhone || 'No phone'}
              </div>
            </div>
          );
        }
      },
      {
        accessorKey: 'virtualAccount.accountNumber',
        header: 'Virtual Account',
        cell: ({ row }) => {
          const student = row.original;
          const dva = student.virtualAccount;
          return dva ? (
            <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
              <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200/60 inline-flex items-center gap-1.5">
                <span>{dva.accountNumber}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(dva.accountNumber);
                    setCopiedAccountId(student.id);
                    setTimeout(() => setCopiedAccountId(null), 2000);
                  }}
                  className="text-slate-400 hover:text-slate-700 transition p-0.5 cursor-pointer"
                  title="Copy account number"
                >
                  {copiedAccountId === student.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </span>
              {copiedAccountId === student.id && (
                <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-medium px-2 py-0.5 rounded shadow-sm">
                  Copied!
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-slate-400 italic">No DVA</span>
          );
        }
      },
      {
        accessorKey: 'amountPaidKobo',
        header: 'Payment Progress',
        cell: ({ row }) => {
          const student = row.original;
          const hasInvoice = !!student.latestInvoice;
          const paidPercent =
            student.totalBilledKobo > 0
              ? Math.min(100, Math.round((student.amountPaidKobo / student.totalBilledKobo) * 100))
              : 0;

          if (!hasInvoice) {
            return (
              <div>
                <div className="tabular-nums text-xs font-medium text-slate-400 italic">
                  No invoice
                </div>
                <div className="mt-1 text-[10px] text-slate-400">
                  No fee schedule applied
                </div>
              </div>
            );
          }

          return (
            <div>
              <div className="tabular-nums text-xs font-medium text-slate-800">
                <span>{formatNaira(student.amountPaidKobo, true)}</span>
                <span className="text-slate-400 font-normal ml-1">
                  / {formatNaira(student.totalBilledKobo, true)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="w-28 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      student.status === 'PAID'
                        ? 'bg-emerald-600'
                        : student.status === 'PART_PAID'
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${paidPercent}%` }}
                  />
                </div>
                <span className="tabular-nums text-[11px] text-slate-500">
                  {paidPercent}%
                </span>
              </div>
            </div>
          );
        }
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.original.status;
          switch (status) {
            case 'PAID':
              return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  PAID
                </span>
              );
            case 'PART_PAID':
              return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/60">
                  PART PAID
                </span>
              );
            case 'NO_INVOICE':
              return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200/60">
                  NO INVOICE
                </span>
              );
            case 'UNPAID':
            default:
              return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200/60">
                  UNPAID
                </span>
              );
          }
        }
      },

      {
        id: 'actions',
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const student = row.original;
          const hasPayment = student.amountPaidKobo > 0;
          return (
            <div className="inline-flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => onSimulatePayment && onSimulatePayment(student)}
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                title="Simulate Bank Transfer Payment"
              >
                <CreditCard className="w-4 h-4" />
              </button>

              {hasPayment ? (
                <button
                  type="button"
                  onClick={() => onOpenReceipt && onOpenReceipt(student)}
                  className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                  title="Send WhatsApp Receipt & Exam Pass"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="p-1.5 text-slate-300 cursor-not-allowed rounded-lg"
                  title="Receipt available after payment"
                >
                  <MessageCircle className="w-4 h-4 text-slate-300" />
                </button>
              )}
            </div>
          );
        },
        enableSorting: false
      }
    ],
    [copiedAccountId, onSimulatePayment, onOpenReceipt]
  );

  // TanStack Table Instance
  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      rowSelection
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10
      }
    }
  });

  const selectedRows = table.getSelectedRowModel().rows;
  const selectedCount = selectedRows.length;

  // Bulk CSV Export
  const handleExportSelectedCsv = () => {
    const exportData = selectedRows.map((r) => ({
      'Student Name': `${r.original.firstName} ${r.original.lastName}`,
      'Class Grade': r.original.classGrade,
      'Admission Number': r.original.admissionNumber || '',
      'Parent Name': r.original.parentName || '',
      'Parent Phone': r.original.parentPhone || '',
      'Virtual Account Number': r.original.virtualAccount?.accountNumber || '',
      'Bank Name': r.original.virtualAccount?.bankName || '',
      'Total Billed (NGN)': r.original.totalBilledKobo / 100,
      'Amount Paid (NGN)': r.original.amountPaidKobo / 100,
      'Payment Status': r.original.status
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Student_Roster_Export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Bulk WhatsApp Reminders
  const handleBulkWhatsAppReminders = () => {
    const unpaidSelected = selectedRows.filter(
      (r) => r.original.status === 'UNPAID' || r.original.status === 'PART_PAID'
    );

    if (unpaidSelected.length === 0) return;

    unpaidSelected.forEach((r) => {
      const student = r.original;
      const dva = student.virtualAccount;
      const url = generateWhatsAppReminderUrl({
        parentPhone: student.parentPhone,
        parentName: student.parentName,
        studentName: `${student.firstName} ${student.lastName}`,
        classGrade: student.classGrade,
        remainingBalanceNaira: Math.max(0, student.totalBilledKobo - student.amountPaidKobo) / 100,
        accountNumber: dva?.accountNumber || 'N/A',
        bankName: dva?.bankName || 'Wema Bank',
        schoolName: school?.name || 'School'
      });
      window.open(url, '_blank');
    });
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setClassFilter('ALL');
  };

  return (
    <div className="space-y-4 relative">
      {/* Floating Bulk Action Bar */}
      {selectedCount > 0 && (
        <div className="sticky top-20 z-20 bg-white text-slate-900 rounded-xl p-3 shadow-lg border border-slate-200 flex items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="bg-[#ECFDF5] text-emerald-800 border border-emerald-200 text-xs font-bold px-2.5 py-1 rounded-full">
              {selectedCount} Selected
            </span>
            <span className="text-xs text-slate-600 font-medium">
              Bulk Actions Active
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBulkWhatsAppReminders}
              className="bg-[#10B981] hover:bg-[#059669] text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Bulk WhatsApp Reminders</span>
            </button>

            <button
              type="button"
              onClick={handleExportSelectedCsv}
              className="bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-slate-200 shadow-2xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Export Selected CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setRowSelection({})}
              className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 transition cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Roster Control Bar */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3 sm:p-4 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            id="roster-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student, parent phone, or account number..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200/80 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200/60 text-xs">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'UNPAID', label: 'Unpaid' },
              { id: 'PART_PAID', label: 'Part-Paid' },
              { id: 'PAID', label: 'Paid' }
            ].map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`filter-status-${tab.id.toLowerCase()}`}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-md text-xs transition cursor-pointer ${
                    isActive
                      ? 'bg-white shadow-xs text-slate-900 font-medium'
                      : 'text-slate-500 hover:text-slate-900 font-normal'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <select
            id="filter-class-select"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="bg-white border border-slate-200/80 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-600 transition cursor-pointer"
          >
            <option value="ALL">All Classes</option>
            {availableClasses.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>

          <button
            type="button"
            id="btn-upload-csv"
            onClick={onOpenCsvModal}
            className="border border-slate-200/80 hover:bg-slate-50 text-slate-700 font-medium px-3.5 py-2 rounded-lg text-xs transition cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Upload CSV</span>
          </button>

          <button
            type="button"
            id="btn-add-student"
            onClick={onOpenAddStudentModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-medium px-4 py-2 rounded-lg text-xs transition cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Student</span>
          </button>
        </div>
      </div>

      {/* TanStack Data Table */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  {headerGroup.headers.map((header) => {
                    const isSortable = header.column.getCanSort();
                    return (
                      <th
                        key={header.id}
                        onClick={header.column.getToggleSortingHandler()}
                        className={`px-6 py-3.5 select-none ${isSortable ? 'cursor-pointer hover:text-slate-900' : ''}`}
                      >
                        <div className="flex items-center gap-1.5">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {isSortable && (
                            <span className="text-slate-400">
                              {header.column.getIsSorted() === 'asc' ? (
                                <ArrowUp className="w-3 h-3 text-emerald-600" />
                              ) : header.column.getIsSorted() === 'desc' ? (
                                <ArrowDown className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-300" />
                              )}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>

            <tbody className="divide-y divide-slate-100 text-sm">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="py-16 text-center">
                    <div className="max-w-xs mx-auto space-y-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                        <Users className="w-5 h-5 text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-900">
                        No students match your filter
                      </p>
                      <p className="text-xs text-slate-500">
                        Try adjusting your search query, status, or class filter.
                      </p>
                      <button
                        type="button"
                        onClick={handleClearFilters}
                        className="text-xs font-medium text-emerald-600 hover:text-emerald-700 underline cursor-pointer pt-1 inline-block"
                      >
                        Clear filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => onSelectStudentForLedger && onSelectStudentForLedger(row.original)}
                    className={`hover:bg-slate-50/60 transition-colors cursor-pointer group ${
                      row.getIsSelected() ? 'bg-emerald-50/40' : ''
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-6 py-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between gap-4 text-xs text-slate-600 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="bg-white border border-slate-200 rounded px-2 py-1 text-xs font-medium text-slate-700 focus:outline-none"
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span className="text-slate-400 text-xs ml-2">
              Showing {table.getRowModel().rows.length} of {filteredData.length} records
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-medium">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <button
                type="button"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
