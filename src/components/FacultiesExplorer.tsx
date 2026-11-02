import React, { useState } from 'react';
import { 
  Building2, GraduationCap, ArrowRight, CheckCircle2, 
  Layers, ChevronDown, Sparkles, UserPlus, Filter 
} from 'lucide-react';
import { 
  FACULTIES_DATA, 
  getDepartmentsForFaculty 
} from '../data/faculties';

interface FacultiesExplorerProps {
  onSelectForRegistration: (faculty: string, department: string) => void;
  onFilterDirectory?: (faculty: string, department: string) => void;
  staffList?: any[];
  isAdmin?: boolean;
  selectedFaculty?: string;
  selectedDept?: string;
  onSelectionChange?: (faculty: string, department: string) => void;
}

export const FacultiesExplorer: React.FC<FacultiesExplorerProps> = ({
  onSelectForRegistration,
  onFilterDirectory,
  staffList = [],
  isAdmin = false,
  selectedFaculty: propSelectedFaculty,
  selectedDept: propSelectedDept,
  onSelectionChange,
}) => {
  const [selectedFaculty, setSelectedFaculty] = useState<string>(
    propSelectedFaculty || FACULTIES_DATA[0].faculty
  );
  const [selectedDept, setSelectedDept] = useState<string>(
    propSelectedDept || FACULTIES_DATA[0].departments[0] || ''
  );
  const [searchFilter, setSearchFilter] = useState('');

  // Sync state when controlled props change from browser History navigation
  React.useEffect(() => {
    if (propSelectedFaculty && propSelectedFaculty !== selectedFaculty) {
      setSelectedFaculty(propSelectedFaculty);
    }
  }, [propSelectedFaculty]);

  React.useEffect(() => {
    if (propSelectedDept && propSelectedDept !== selectedDept) {
      setSelectedDept(propSelectedDept);
    }
  }, [propSelectedDept]);

  const currentDepartments = getDepartmentsForFaculty(selectedFaculty);

  const handleFacultyChange = (newFaculty: string) => {
    setSelectedFaculty(newFaculty);
    const depts = getDepartmentsForFaculty(newFaculty);
    const newDept = depts[0] || '';
    setSelectedDept(newDept);
    onSelectionChange?.(newFaculty, newDept);
  };

  const handleDeptChange = (newDept: string) => {
    setSelectedDept(newDept);
    onSelectionChange?.(selectedFaculty, newDept);
  };

  const getStaffCountForFaculty = (facultyName: string) => {
    return staffList.filter(s => (s.faculty || '').toLowerCase() === facultyName.toLowerCase()).length;
  };

  const getStaffCountForDept = (deptName: string) => {
    return staffList.filter(s => (s.department || '').toLowerCase() === deptName.toLowerCase()).length;
  };

  const filteredFaculties = FACULTIES_DATA.filter(f => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return f.faculty.toLowerCase().includes(q) || 
           f.departments.some(d => d.toLowerCase().includes(q));
  });

  return (
    <div className="flex-1 p-4 md:p-6 overflow-y-auto custom-scrollbar space-y-6 max-w-6xl mx-auto w-full">
      {/* Top Hero Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-white/60 shadow-lg bg-gradient-to-r from-indigo-900/90 via-indigo-800/90 to-purple-900/90 text-white relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-white/20 text-indigo-100 border border-white/30 tracking-wider uppercase">
              Abia State University
            </span>
            <span className="text-xs text-indigo-200">14 Official Accredited Faculties</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-2">
            Academic Faculties & Departments
          </h2>
          <p className="text-xs md:text-sm text-indigo-200/90 max-w-2xl leading-relaxed">
            Select any faculty to explore its approved academic departments, staff designations, and submit your official lecturer credentials.
          </p>
        </div>
      </div>

      {/* Interactive 2-Tier Dependent Dropdown Card */}
      <div className="glass-panel p-6 rounded-3xl border border-white/70 shadow-xl bg-white/70 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4 border-b border-slate-200/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Interactive Faculty & Department Selector
              </h3>
              <p className="text-[11px] text-slate-500">
                Step 1: Choose Faculty &rarr; Step 2: Choose Department
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Dynamic Selection
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Step 1: Faculty Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
              Select Faculty
            </label>
            <div className="relative">
              <select
                value={selectedFaculty}
                onChange={(e) => handleFacultyChange(e.target.value)}
                className="w-full appearance-none px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 shadow-sm focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none cursor-pointer pr-10 transition-all"
              >
                {FACULTIES_DATA.map((f, idx) => (
                  <option key={f.faculty} value={f.faculty}>
                    {idx + 1}. {f.faculty} ({f.departments.length} depts)
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
            </div>
            <div className="text-[10px] text-slate-500 flex items-center justify-between px-1">
              <span>{currentDepartments.length} departments available</span>
              <span className="text-indigo-600 font-semibold">{getStaffCountForFaculty(selectedFaculty)} staff registered</span>
            </div>
          </div>

          {/* Step 2: Dependent Department Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">2</span>
              Select Department under {selectedFaculty.replace('Faculty of ', '')}
            </label>
            <div className="relative">
              <select
                value={selectedDept}
                onChange={(e) => handleDeptChange(e.target.value)}
                className="w-full appearance-none px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-indigo-900 shadow-sm focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none cursor-pointer pr-10 transition-all"
              >
                {currentDepartments.map(dept => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
            </div>
            <div className="text-[10px] text-slate-500 flex items-center justify-between px-1">
              <span>Selected department</span>
              <span className="text-emerald-600 font-semibold">{getStaffCountForDept(selectedDept)} staff registered</span>
            </div>
          </div>
        </div>

        {/* Selected Summary Callout & Quick Action */}
        <div className="mt-5 p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-indigo-700 font-bold uppercase tracking-wide">
                Active Selection
              </div>
              <div className="text-sm font-bold text-slate-900">
                {selectedDept} &bull; <span className="text-slate-600 font-normal">{selectedFaculty}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {isAdmin && onFilterDirectory && (
              <button
                onClick={() => onFilterDirectory(selectedFaculty, selectedDept)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition-all flex items-center gap-1.5"
              >
                <Filter className="w-3.5 h-3.5 text-indigo-600" /> Filter Directory
              </button>
            )}
            <button
              onClick={() => onSelectForRegistration(selectedFaculty, selectedDept)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-5 rounded-xl shadow-md transition-all flex items-center gap-1.5 hover:-translate-y-0.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Register Staff in this Department
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Search & All 14 Faculties Grid */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              All 14 ABSU Faculties & Accredited Departments
            </h3>
            <p className="text-xs text-slate-500">
              Click any department chip to immediately select it or register your details.
            </p>
          </div>
          <input
            type="text"
            placeholder="Search faculty or department..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="px-3.5 py-2 bg-white/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-400 w-full sm:w-64 shadow-sm"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFaculties.map((fac, idx) => {
            const isSelected = selectedFaculty === fac.faculty;
            const staffCount = getStaffCountForFaculty(fac.faculty);
            return (
              <div
                key={fac.faculty}
                className={`glass-panel p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                  isSelected 
                    ? 'border-indigo-500 ring-2 ring-indigo-400/30 shadow-md bg-white/90' 
                    : 'border-white/60 hover:border-indigo-300 hover:bg-white/80'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Faculty #{idx + 1}
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold">
                      {staffCount} Staff
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 leading-snug mb-3">
                    {fac.faculty}
                  </h4>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {fac.departments.map(dept => {
                      const isDeptSelected = isSelected && selectedDept === dept;
                      return (
                        <button
                          key={dept}
                          type="button"
                          onClick={() => {
                            setSelectedFaculty(fac.faculty);
                            setSelectedDept(dept);
                            onSelectionChange?.(fac.faculty, dept);
                          }}
                          className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-all text-left ${
                            isDeptSelected
                              ? 'bg-indigo-600 text-white shadow-sm font-bold'
                              : 'bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200/60'
                          }`}
                        >
                          {dept}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      const firstDept = fac.departments[0] || '';
                      setSelectedFaculty(fac.faculty);
                      setSelectedDept(firstDept);
                      onSelectionChange?.(fac.faculty, firstDept);
                    }}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    Select Faculty
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectForRegistration(fac.faculty, fac.departments[0] || '')}
                    className="text-[11px] font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-1"
                  >
                    Register <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
