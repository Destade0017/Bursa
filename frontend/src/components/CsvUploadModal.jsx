import React, { useState } from 'react';
import Papa from 'papaparse';
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  Users,
  RefreshCw
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function CsvUploadModal({ school, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [parsingError, setParsingError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);

  // 1. Download Sample CSV Template
  const handleDownloadTemplate = () => {
    const csvContent =
      'firstName,lastName,classGrade,parentName,parentPhone,feeAmountNaira\n' +
      'Tunde,Bakare,SSS 3,Chief G. Bakare,08031112233,185000\n' +
      'Zainab,Aliyu,JSS 2,Dr. M. Aliyu,08092223344,140000\n' +
      'Chinedu,Okonkwo,Primary 5,Mrs. E. Okonkwo,08053334455,95000\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'BURSA_Sample_Roster_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. Parse uploaded file using PapaParse
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParsingError(null);
    setParsedData([]);

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors && results.errors.length > 0) {
          setParsingError(`CSV Parsing Error: ${results.errors[0].message}`);
          return;
        }

        const cleanRows = results.data
          .filter((row) => row.firstName && row.lastName)
          .map((row) => ({
            firstName: row.firstName?.trim(),
            lastName: row.lastName?.trim(),
            classGrade: row.classGrade?.trim() || 'JSS 1',
            parentName: row.parentName?.trim() || 'Parent',
            parentPhone: row.parentPhone?.trim() || '08000000000',
            feeAmountNaira: parseFloat(row.feeAmountNaira) || 120000
          }));

        if (cleanRows.length === 0) {
          setParsingError('No valid student records found in this CSV. Please check headers.');
          return;
        }

        setParsedData(cleanRows);
      },
      error: (err) => {
        setParsingError(`File read error: ${err.message}`);
      }
    });
  };

  // 3. Submit Roster to Backend API
  const handleImportRoster = async () => {
    if (parsedData.length === 0 || !school?.id) return;

    setIsSubmitting(true);
    setUploadStatus(null);

    const payloadStudents = parsedData.map((st) => ({
      firstName: st.firstName,
      lastName: st.lastName,
      classGrade: st.classGrade,
      parentName: st.parentName,
      parentPhone: st.parentPhone,
      feeAmountKobo: Math.round(st.feeAmountNaira * 100)
    }));

    try {
      const token = localStorage.getItem('bursar_token');
      const response = await fetch(`${API_BASE}/api/schools/${school.id}/students/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          students: payloadStudents,
          academicSession: '2026/2027',
          term: 'FIRST'
        })
      });

      const data = await response.json();

      if (response.ok) {
        setUploadStatus({
          type: 'success',
          message: `Successfully imported ${data.data?.length || parsedData.length} students with active DVAs!`
        });

        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 1500);
      } else {
        setUploadStatus({
          type: 'error',
          message: data.error || 'Server rejected bulk import payload.'
        });
      }
    } catch (err) {
      console.error('Bulk upload error:', err);
      setUploadStatus({
        type: 'error',
        message: 'Network error connecting to school API server.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-xl relative text-slate-900">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center border border-blue-200">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Bulk CSV Student Roster Upload</h3>
            <p className="text-xs text-slate-500">Import an entire class or school roster at once</p>
          </div>
        </div>

        {/* Status Toast */}
        {uploadStatus && (
          <div
            className={`p-3.5 mb-4 rounded-xl border flex items-center gap-3 text-xs font-semibold ${
              uploadStatus.type === 'success'
                ? 'bg-[#ECFDF5] border-emerald-200 text-emerald-800'
                : 'bg-[#FEE2E2] border-rose-200 text-rose-800'
            }`}
          >
            {uploadStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{uploadStatus.message}</span>
          </div>
        )}

        {/* Feature A: Download Sample CSV Template */}
        <div className="bg-slate-50 rounded-xl p-4 mb-5 border border-slate-200/80 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-800">Need the standard CSV template?</h4>
            <p className="text-xs text-slate-500">Includes headers and sample student rows</p>
          </div>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-blue-600 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 shadow-2xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            Download Sample CSV
          </button>
        </div>

        {/* Feature B: File Dropzone / Picker */}
        <div className="mb-5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Select CSV Roster File
          </label>
          <div className="relative border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50/50 rounded-xl p-6 text-center transition group">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <Upload className="w-8 h-8 text-emerald-600 mx-auto mb-2 group-hover:scale-105 transition-transform" />
            <p className="text-xs font-bold text-slate-800">
              {file ? file.name : 'Click or drag & drop a .csv file here'}
            </p>
            <p className="text-xs text-slate-400 mt-1">Accepts UTF-8 formatted .csv files</p>
          </div>
        </div>

        {/* Parsing Error Message */}
        {parsingError && (
          <div className="p-3 mb-4 rounded-xl bg-[#FEE2E2] border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{parsingError}</span>
          </div>
        )}

        {/* Feature B2: Data Preview Table */}
        {parsedData.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                Parsed Roster Preview
              </span>
              <span className="text-xs font-bold text-emerald-700 bg-[#ECFDF5] px-2 py-0.5 rounded-full border border-emerald-200">
                {parsedData.length} Students Ready
              </span>
            </div>

            <div className="overflow-x-auto max-h-48 border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2">Student Name</th>
                    <th className="px-3 py-2">Class</th>
                    <th className="px-3 py-2">Parent Name</th>
                    <th className="px-3 py-2">Phone</th>
                    <th className="px-3 py-2 text-right">Fee (₦)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedData.slice(0, 5).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-bold text-slate-900">
                        {row.firstName} {row.lastName}
                      </td>
                      <td className="px-3 py-2 text-blue-600 font-medium">{row.classGrade || 'JSS 1'}</td>
                      <td className="px-3 py-2 text-slate-700">{row.parentName || 'Parent'}</td>
                      <td className="px-3 py-2 font-mono text-slate-500">{row.parentPhone}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-emerald-600">
                        ₦{Number(row.feeAmountNaira || 120000).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsedData.length > 5 && (
              <p className="text-[11px] text-slate-400 mt-1 italic text-right">
                Showing first 5 of {parsedData.length} records
              </p>
            )}
          </div>
        )}

        {/* Feature C: "Import Roster" Submit Action */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleImportRoster}
            disabled={isSubmitting || parsedData.length === 0}
            className="w-full bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl shadow-xs flex items-center justify-center gap-2 text-xs transition active:scale-98 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Provisioning DVAs & Invoices...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" /> Import {parsedData.length > 0 ? `${parsedData.length} Students` : 'Roster'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
