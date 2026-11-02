import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, LayoutDashboard, Users, Rss, MessageSquare, Settings, Search, Download, 
  CheckCircle, Clock, Check, ChevronRight, LogIn, UserPlus, Upload, Volume2, VolumeX, 
  Image as ImageIcon, X, User as UserIcon, Edit3, ShieldAlert, FileText, CheckCircle2, 
  XCircle, Filter, Trash2, ExternalLink, AlertTriangle, Eye, RefreshCw, FileSpreadsheet, 
  Sparkles, CheckSquare, Square, Loader2 
} from 'lucide-react';
import { auth, db } from './firebase';
import { 
  onAuthStateChanged, User, signOut, createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, updateProfile, GoogleAuthProvider, 
  signInWithPopup, sendPasswordResetEmail 
} from 'firebase/auth';
import { 
  collection, query, onSnapshot, addDoc, serverTimestamp, 
  orderBy, doc, updateDoc, deleteDoc, setDoc, where,
  writeBatch, getDocs
} from 'firebase/firestore';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { 
  FACULTIES_DATA, 
  ALL_FACULTIES, 
  getDepartmentsForFaculty, 
  normalizeFaculty, 
  inferFacultyFromDepartment 
} from './data/faculties';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [isAdminRole, setIsAdminRole] = useState(false);
  const [isEditingMyDetails, setIsEditingMyDetails] = useState(false);
  const [activeView, setActiveView] = useState('entry');
  
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  const [newsList, setNewsList] = useState<any[]>([]);
  const [newsTitle, setNewsTitle] = useState('');
  const [newsContent, setNewsContent] = useState('');
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  
  const [settingsSaved, setSettingsSaved] = useState(false);
  
  // Auth states
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authError, setAuthError] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter for directory and dashboard: 'all' | 'Pending' | 'Approved' | 'Rejected'
  const [statusFilter, setStatusFilter] = useState<'all' | 'Pending' | 'Approved' | 'Rejected'>('all');
  const [facultyFilter, setFacultyFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  
  // Registration / Entry form states
  const [entryName, setEntryName] = useState('');
  const [entryEmail, setEntryEmail] = useState('');
  const [entryFaculty, setEntryFaculty] = useState('');
  const [entryDept, setEntryDept] = useState('');
  const [entryRank, setEntryRank] = useState('');
  const [entryQualification, setEntryQualification] = useState('');
  const [entryDateEmployed, setEntryDateEmployed] = useState('');
  const [entryEmploymentStatus, setEntryEmploymentStatus] = useState<'Active' | 'Inactive' | 'On Leave' | 'Retired'>('Active');
  const [entryPhone, setEntryPhone] = useState('');
  const [entryPhoto, setEntryPhoto] = useState('');
  const [entryDocumentUrl, setEntryDocumentUrl] = useState('');
  const [entryDocumentName, setEntryDocumentName] = useState('');
  const [entryDocumentSize, setEntryDocumentSize] = useState('');
  const [uploadError, setUploadError] = useState('');
  
  // Admin manual entry decision
  const [adminEntryAction, setAdminEntryAction] = useState<'Approved' | 'Pending'>('Approved');

  // Bulk Roster Ingestion & AI Parsing states (PDF, Excel, CSV)
  const [isParsingRoster, setIsParsingRoster] = useState(false);
  const [rosterParseMessage, setRosterParseMessage] = useState('');
  const [rosterPreviewList, setRosterPreviewList] = useState<any[]>([]);
  const [rosterFileName, setRosterFileName] = useState('');
  const [rosterTargetStatus, setRosterTargetStatus] = useState<'Approved' | 'Pending'>('Approved');
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [isImportingBatch, setIsImportingBatch] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

  // Delete All Details Modal & State
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 });
  const [includeNewsAndMessages, setIncludeNewsAndMessages] = useState(false);

  // Modals
  const [reviewStaff, setReviewStaff] = useState<any | null>(null);
  const [rejectModalStaff, setRejectModalStaff] = useState<any | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  
  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const isSuperAdmin = user?.email?.toLowerCase() === 'brossj50@gmail.com' || user?.email?.toLowerCase() === 'ogungbadekehinde19@gmail.com';
  const isAdmin = isSuperAdmin || isAdminRole;

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        const isSuper = currentUser.email?.toLowerCase() === 'brossj50@gmail.com' || currentUser.email?.toLowerCase() === 'ogungbadekehinde19@gmail.com';
        if (isSuper) {
          setActiveView('dashboard');
        } else {
          setActiveView('entry');
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Staff normalization helper: ensures 'Pending' | 'Approved' | 'Rejected'
  const getNormalizedStatus = (staff: any): 'Pending' | 'Approved' | 'Rejected' => {
    if (!staff) return 'Pending';
    const vs = staff.verificationStatus;
    const st = staff.status;
    if (vs === 'Rejected' || st === 'Rejected') return 'Rejected';
    if (vs === 'Approved' || st === 'Approved') return 'Approved';
    return 'Pending';
  };

  // Listen to staff data with strict RBAC:
  // - SuperAdmins & Appointed Admins get the full staff database
  // - Regular users get ONLY their own record matching their email/userId
  // - Guests receive no staff records
  useEffect(() => {
    if (!user) {
      setStaffList([]);
      setIsAdminRole(false);
      return;
    }

    if (isSuperAdmin) {
      setIsAdminRole(true);
      const qStaff = query(collection(db, 'staff'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(
        qStaff,
        (snapshot) => {
          setStaffList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        },
        (err) => console.warn("Staff listener notice:", err)
      );
      return () => unsub();
    } else {
      // Query only own record for non-superadmin
      const emails = [user.email, user.email?.toLowerCase()].filter(Boolean) as string[];
      const uniqueEmails = Array.from(new Set(emails));
      const qMyStaff = query(collection(db, 'staff'), where('email', 'in', uniqueEmails));
      let unsubAllStaff: (() => void) | null = null;

      const unsubMyStaff = onSnapshot(
        qMyStaff,
        (snapshot) => {
          const myDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const hasAdminRole = myDocs.some((d: any) => d.role === 'admin');
          setIsAdminRole(hasAdminRole);

          if (hasAdminRole) {
            // Promoted admin: load full collection
            if (!unsubAllStaff) {
              const qAll = query(collection(db, 'staff'), orderBy('createdAt', 'desc'));
              unsubAllStaff = onSnapshot(
                qAll,
                (allSnap) => {
                  setStaffList(allSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                },
                (err) => console.warn("Appointed admin staff listener error:", err)
              );
            }
          } else {
            // Regular user: ONLY their own document is present in state
            setStaffList(myDocs);
          }
        },
        (err) => console.warn("User staff record listener notice:", err)
      );

      return () => {
        unsubMyStaff();
        if (unsubAllStaff) unsubAllStaff();
      };
    }
  }, [user, isSuperAdmin]);

  // Messages and News subscriptions
  useEffect(() => {
    if (!user && !isGuest) return;
    
    const qMessages = query(collection(db, 'messages'), orderBy('createdAt', 'asc'));
    const unsubMessages = onSnapshot(
      qMessages,
      (snapshot) => {
        setChatMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (err) => {
        console.warn("Messages snapshot listener notice:", err);
      }
    );

    const qNews = query(collection(db, 'news'), orderBy('createdAt', 'desc'));
    const unsubNews = onSnapshot(
      qNews,
      (snapshot) => {
        setNewsList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (err) => {
        console.warn("News snapshot listener notice:", err);
      }
    );

    return () => {
      unsubMessages();
      unsubNews();
    };
  }, [user, isGuest]);

  // Route security: redirect non-admin away from admin-only views
  useEffect(() => {
    if (!isAdmin && (activeView === 'dashboard' || activeView === 'directory')) {
      setActiveView('entry');
    }
  }, [isAdmin, activeView]);

  useEffect(() => {
    if (activeView === 'news') {
      if (audioRef.current && !isAudioMuted) {
        audioRef.current.volume = 0.3;
        audioRef.current.play().catch(e => console.log('Audio auto-play blocked by browser', e));
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
  }, [activeView, isAudioMuted]);

  const handlePasswordReset = async () => {
    if (!authEmail.trim()) {
      setAuthError('Please enter your email to reset password.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, authEmail);
      showToast('Password reset email sent! Check your inbox.', 'info');
    } catch(err: any) {
      setAuthError(err.message || 'Failed to send reset email.');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        await updateProfile(userCredential.user, { displayName: authName });
        
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          name: authName,
          phone: authPhone,
          email: authEmail,
          createdAt: serverTimestamp()
        });
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
    } catch (error: any) {
      console.error("Auth failed", error);
      setAuthError(error.message || 'Authentication failed');
    }
  };

  const handleGoogleAuth = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setAuthError('');
    setIsGoogleLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ 
        prompt: 'select_account' 
      });

      const userCredential = await signInWithPopup(auth, provider);

      if (userCredential?.user) {
        try {
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            name: userCredential.user.displayName || 'Google User',
            email: userCredential.user.email || '',
            photoUrl: userCredential.user.photoURL || '',
            lastLoginAt: serverTimestamp(),
            createdAt: serverTimestamp()
          }, { merge: true });
        } catch (profileErr) {
          console.warn("User profile sync notice (non-fatal):", profileErr);
        }
        showToast(`Welcome, ${userCredential.user.displayName || 'User'}!`, 'success');
      }
    } catch (error: any) {
      console.error("Google Auth failed", error);
      const code = error?.code || '';
      if (code === 'auth/popup-blocked') {
        setAuthError('Sign-in popup was blocked by the browser. Please allow popups or check your browser settings and try again.');
        showToast('Browser blocked the sign-in popup. Please allow popups.', 'error');
      } else if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setAuthError('Google sign-in was closed or cancelled. Please try again.');
      } else if (code === 'auth/unauthorized-domain') {
        setAuthError('Domain is not authorized for OAuth in Firebase Console. Please add this domain to Authorized Domains.');
        showToast('Domain not authorized in Firebase Auth.', 'error');
      } else {
        setAuthError(error?.message || 'Google Authentication failed. Please try again.');
        showToast(error?.message || 'Failed to sign in with Google.', 'error');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || (!user && !isGuest)) return;
    try {
      await addDoc(collection(db, 'messages'), {
        text: newMessage,
        senderEmail: user?.email || 'guest@absu.edu',
        senderName: user?.displayName || 'Guest User',
        createdAt: serverTimestamp()
      });
      setNewMessage('');
    } catch(err) {
      console.error(err);
    }
  };

  const handleAddNews = async () => {
    if (!newsTitle.trim() || !newsContent.trim() || (!user && !isGuest)) return;
    try {
      if (editingNewsId) {
        await updateDoc(doc(db, 'news', editingNewsId), {
          title: newsTitle,
          content: newsContent
        });
        setEditingNewsId(null);
        showToast("News updated successfully!", "success");
      } else {
        await addDoc(collection(db, 'news'), {
          title: newsTitle,
          content: newsContent,
          author: user?.displayName || user?.email || 'Admin',
          createdAt: serverTimestamp()
        });
        showToast("News published globally!", "success");
      }
      setNewsTitle('');
      setNewsContent('');
    } catch(err) {
      console.error(err);
      showToast("Failed to publish news.", "error");
    }
  };

  const handleDeleteNews = async (newsId: string) => {
    if (!window.confirm("Are you sure you want to delete this news post?")) return;
    try {
      await deleteDoc(doc(db, 'news', newsId));
      showToast("News post deleted.", "info");
    } catch(err) {
      console.error(err);
    }
  };

  const handleEditNews = (news: any) => {
    setNewsTitle(news.title);
    setNewsContent(news.content);
    setEditingNewsId(news.id);
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!window.confirm("Are you sure you want to delete this message?")) return;
    try {
      await deleteDoc(doc(db, 'messages', msgId));
      showToast("Message deleted.", "info");
    } catch(err) {
      console.error(err);
    }
  };

  const handleRemoveAdmin = async (staffId: string) => {
    try {
      await updateDoc(doc(db, 'staff', staffId), { role: 'user' });
      showToast("Admin privileges revoked.", "info");
    } catch(err) {
      console.error(err);
    }
  };

  const handleMakeAdmin = async (staffId: string) => {
    try {
      await updateDoc(doc(db, 'staff', staffId), { role: 'admin' });
      showToast("Staff promoted to Admin.", "success");
    } catch(err) {
      console.error(err);
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this staff record?")) return;
    try {
      await deleteDoc(doc(db, 'staff', staffId));
      showToast("Staff record deleted.", "info");
      if (reviewStaff?.id === staffId) setReviewStaff(null);
    } catch(err) {
      console.error("Error deleting staff:", err);
      showToast("Failed to delete staff record.", "error");
    }
  };

  // ADMIN ACTION: DELETE ALL DETAILS FROM WEBSITE
  const handleDeleteAllDetails = async () => {
    setIsDeletingAll(true);
    setDeleteProgress({ current: 0, total: Math.max(staffList.length, 1) });

    try {
      // 1. Fetch all documents currently in the 'staff' collection
      const staffSnapshot = await getDocs(collection(db, 'staff'));
      const totalDocs = staffSnapshot.docs;
      setDeleteProgress({ current: 0, total: totalDocs.length });
      
      let deletedCount = 0;
      // Delete in batches of 400 (safe limit below 500)
      for (let i = 0; i < totalDocs.length; i += 400) {
        const batch = writeBatch(db);
        const chunk = totalDocs.slice(i, i + 400);
        chunk.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
        await batch.commit();
        deletedCount += chunk.length;
        setDeleteProgress({ current: deletedCount, total: totalDocs.length });
      }

      // 2. Also wipe news and messages if requested
      if (includeNewsAndMessages) {
        try {
          const newsSnap = await getDocs(collection(db, 'news'));
          for (let i = 0; i < newsSnap.docs.length; i += 400) {
            const batch = writeBatch(db);
            newsSnap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
            await batch.commit();
          }
          setNewsList([]);
        } catch (ne) {
          console.warn("News wipe notice:", ne);
        }

        try {
          const msgSnap = await getDocs(collection(db, 'messages'));
          for (let i = 0; i < msgSnap.docs.length; i += 400) {
            const batch = writeBatch(db);
            msgSnap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
            await batch.commit();
          }
          setChatMessages([]);
        } catch (me) {
          console.warn("Messages wipe notice:", me);
        }
      }

      // 3. Clear all staged roster items and reset states
      setStaffList([]);
      setRosterPreviewList([]);
      setReviewStaff(null);
      setRejectModalStaff(null);
      setShowDeleteAllModal(false);
      setIsDeletingAll(false);

      showToast(`Every single data (${deletedCount} records) has been completely deleted from the database!`, "success");
    } catch (error: any) {
      console.error("Error deleting all details:", error);
      // Fallback single-document delete
      try {
        const staffSnapshot = await getDocs(collection(db, 'staff'));
        let count = 0;
        for (const d of staffSnapshot.docs) {
          await deleteDoc(d.ref);
          count++;
          setDeleteProgress({ current: count, total: staffSnapshot.docs.length });
        }
        setStaffList([]);
        setRosterPreviewList([]);
        setReviewStaff(null);
        setShowDeleteAllModal(false);
        setIsDeletingAll(false);
        showToast(`Every single data (${count} records) has been completely deleted!`, "success");
      } catch (fallbackError: any) {
        console.error("Fallback delete error:", fallbackError);
        setIsDeletingAll(false);
        showToast("Error deleting records: " + (fallbackError.message || 'Action failed'), "error");
      }
    }
  };

  // ADMIN APPROVAL ACTION: Strictly marks as Approved
  const handleApproveStaff = async (staffId: string) => {
    try {
      await updateDoc(doc(db, 'staff', staffId), { 
        verificationStatus: 'Approved',
        status: 'Approved',
        approvedAt: serverTimestamp(),
        reviewedBy: user?.displayName || user?.email || 'Admin',
        rejectionReason: ''
      });
      showToast("Staff record Approved successfully! Feedback sent.", "success");
      if (reviewStaff && reviewStaff.id === staffId) {
        setReviewStaff((prev: any) => ({ 
          ...prev, 
          verificationStatus: 'Approved', 
          status: 'Approved',
          rejectionReason: '' 
        }));
      }
    } catch(err) { 
      console.error("Error approving staff:", err);
      showToast("Failed to approve staff record.", "error");
    }
  };

  // ADMIN REJECTION ACTION: Strictly marks as Rejected
  const handleRejectStaff = async (staffId: string, customReason?: string) => {
    try {
      const reason = customReason || rejectionReasonInput.trim() || 'Application rejected by Admin. Please update details.';
      await updateDoc(doc(db, 'staff', staffId), { 
        verificationStatus: 'Rejected',
        status: 'Rejected',
        rejectedAt: serverTimestamp(),
        reviewedBy: user?.displayName || user?.email || 'Admin',
        rejectionReason: reason
      });
      showToast("Staff record Rejected. Feedback sent to staff portal.", "info");
      if (reviewStaff && reviewStaff.id === staffId) {
        setReviewStaff((prev: any) => ({ 
          ...prev, 
          verificationStatus: 'Rejected', 
          status: 'Rejected',
          rejectionReason: reason 
        }));
      }
      setRejectModalStaff(null);
      setRejectionReasonInput('');
    } catch(err) { 
      console.error("Error rejecting staff:", err);
      showToast("Failed to reject staff record.", "error");
    }
  };

  // PDF Export
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text("Abia State University - Staff Database Directory", 14, 15);
    const tableData = filteredStaffList.map(s => [
      s.name || 'N/A',
      s.email || 'N/A',
      s.department || 'N/A',
      s.faculty || 'N/A',
      s.rank || s.role || 'Staff',
      s.qualification || 'N/A',
      s.dateEmployed || 'N/A',
      getNormalizedStatus(s),
      s.phone || 'N/A'
    ]);
    autoTable(doc, {
      head: [['Full Name', 'Email', 'Department', 'Faculty', 'Rank', 'Qualification', 'Date Employed', 'Approval Status', 'Phone Number']],
      body: tableData,
      startY: 22,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 58, 138] }
    });
    doc.save('absu_staff_directory.pdf');
    showToast("PDF directory exported successfully!", "success");
  };

  // Excel Export
  const handleExportExcel = () => {
    const wsData = filteredStaffList.map(s => ({
      'Full Name': s.name || '',
      'Email': s.email || '',
      'Department': s.department || '',
      'Faculty': s.faculty || '',
      'Rank': s.rank || s.role || 'Staff',
      'Qualification': s.qualification || '',
      'Date Employed': s.dateEmployed || '',
      'Approval Status': getNormalizedStatus(s),
      'Employment Status': s.employmentStatus || s.status || 'Active',
      'Phone Number': s.phone || '',
      'Has Document': s.documentUrl || s.cvUrl ? 'Yes' : 'No'
    }));
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Staff Directory");
    XLSX.writeFile(wb, "absu_staff_directory.xlsx");
    showToast("Excel spreadsheet exported successfully!", "success");
  };

  // Filtered Staff List with Search, Status Tabs, and Faculty/Department Filters
  const filteredStaffList = staffList.filter(staff => {
    // 1. Status Filter
    if (statusFilter !== 'all') {
      const norm = getNormalizedStatus(staff);
      if (norm !== statusFilter) return false;
    }

    // 2. Faculty Filter
    if (facultyFilter !== 'all') {
      if ((staff.faculty || '').toLowerCase() !== facultyFilter.toLowerCase()) return false;
    }

    // 3. Department Filter
    if (departmentFilter !== 'all') {
      if ((staff.department || '').toLowerCase() !== departmentFilter.toLowerCase()) return false;
    }

    // 4. Search query filter
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      staff.name?.toLowerCase().includes(q) ||
      staff.email?.toLowerCase().includes(q) ||
      staff.department?.toLowerCase().includes(q) ||
      staff.faculty?.toLowerCase().includes(q) ||
      staff.rank?.toLowerCase().includes(q) ||
      staff.qualification?.toLowerCase().includes(q) ||
      staff.phone?.toLowerCase().includes(q) ||
      getNormalizedStatus(staff).toLowerCase().includes(q)
    );
  });

  // Calculate status counts
  const pendingCount = staffList.filter(s => getNormalizedStatus(s) === 'Pending').length;
  const approvedCount = staffList.filter(s => getNormalizedStatus(s) === 'Approved').length;
  const rejectedCount = staffList.filter(s => getNormalizedStatus(s) === 'Rejected').length;

  const myStaffRecord = staffList.find(s => 
    s.email?.toLowerCase() === user?.email?.toLowerCase() || 
    (user?.uid && s.userId === user.uid)
  );

  useEffect(() => {
    if (activeView === 'entry') {
      if (!isAdmin && user?.email) {
        if (myStaffRecord) {
          setEntryName(myStaffRecord.name || '');
          setEntryEmail(myStaffRecord.email || user.email || '');
          setEntryFaculty(myStaffRecord.faculty || '');
          setEntryDept(myStaffRecord.department || '');
          setEntryRank(myStaffRecord.rank || '');
          setEntryQualification(myStaffRecord.qualification || '');
          setEntryDateEmployed(myStaffRecord.dateEmployed || '');
          setEntryEmploymentStatus(myStaffRecord.employmentStatus || 'Active');
          setEntryPhone(myStaffRecord.phone || '');
          setEntryPhoto(myStaffRecord.photoUrl || '');
          setEntryDocumentUrl(myStaffRecord.documentUrl || myStaffRecord.cvUrl || '');
          setEntryDocumentName(myStaffRecord.documentName || (myStaffRecord.cvUrl ? 'CV_Document.pdf' : ''));
          setEntryDocumentSize(myStaffRecord.documentSize || '');
        } else {
          setEntryEmail(user.email || '');
          setEntryName(user.displayName || '');
        }
      }
    }
  }, [activeView, isAdmin, user, myStaffRecord]);

  // Robust Photo Upload Handler: Smart canvas downscaling to ensure compact base64 (~40KB)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Please select a valid image file (PNG, JPG, JPEG, WEBP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 500;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
        setEntryPhoto(compressedBase64);
        showToast("Passport photo attached successfully!", "success");
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Robust Document Upload Handler: Supports PDF, DOC, DOCX, images with size limit checking
  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');

    // Safe ceiling for Firestore document storage: 750 KB
    if (file.size > 750 * 1024) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setUploadError(`File is too large (${sizeMB} MB). Maximum allowed size for database storage is 750 KB. Please compress your PDF.`);
      alert(`File is too large (${sizeMB} MB). Maximum allowed size is 750 KB for database storage. Please compress your PDF or upload a smaller file.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Content = event.target?.result as string;
      setEntryDocumentUrl(base64Content);
      setEntryDocumentName(file.name);
      const sizeStr = file.size < 1024 * 1024 
        ? `${Math.round(file.size / 1024)} KB` 
        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
      setEntryDocumentSize(sizeStr);
      showToast(`Document "${file.name}" attached successfully!`, "success");
    };
    reader.onerror = () => {
      setUploadError('Failed to read the file.');
      showToast('Failed to read document.', 'error');
    };
    reader.readAsDataURL(file);
  };

  // Submit / Save Staff Details Handler
  const handleManualEntry = async () => {
    const finalEmail = (!isAdmin && user?.email) 
      ? user.email.toLowerCase().trim() 
      : (entryEmail.trim().toLowerCase() || user?.email?.toLowerCase() || '');

    if (!entryName.trim() || !finalEmail.trim() || !entryDept.trim() || !entryFaculty.trim() || !entryRank.trim()) {
      showToast("Please fill in required fields: Full Name, Email, Department, Faculty, and Rank.", "error");
      return;
    }

    try {
      const staffData = {
        name: entryName.trim(),
        email: finalEmail.trim(),
        faculty: entryFaculty.trim(),
        department: entryDept.trim(),
        rank: entryRank.trim(),
        qualification: entryQualification.trim(),
        dateEmployed: entryDateEmployed,
        employmentStatus: entryEmploymentStatus || 'Active',
        phone: entryPhone.trim(),
        photoUrl: entryPhoto || '',
        documentUrl: entryDocumentUrl || '',
        cvUrl: entryDocumentUrl || '',
        documentName: entryDocumentName || '',
        documentSize: entryDocumentSize || '',
        userId: user?.uid || '',
      };

      if (!isAdmin && user?.email) {
        if (myStaffRecord) {
          // When a staff member updates their record, ALWAYS send to admin as 'Pending'
          await updateDoc(doc(db, 'staff', myStaffRecord.id), {
            ...staffData,
            status: 'Pending',
            verificationStatus: 'Pending',
            rejectionReason: '',
            updatedAt: serverTimestamp()
          });
          setIsEditingMyDetails(false);
          showToast("Your data has been sent to the Admin! Status is now PENDING review.", "success");
          return;
        }
      }

      // New entry:
      // If submitted by regular staff member, it is ALWAYS 'Pending'
      // If registered by Admin, admin can choose 'Approved' or 'Pending'
      const initialStatus = isAdmin ? adminEntryAction : 'Pending';

      await addDoc(collection(db, 'staff'), {
        ...staffData,
        role: 'user',
        status: initialStatus,
        verificationStatus: initialStatus,
        rejectionReason: '',
        createdAt: serverTimestamp(),
      });
      
      if (!isAdmin) {
        setIsEditingMyDetails(false);
        showToast("Your data has been submitted and sent to the admin. Status: PENDING review.", "success");
      } else {
        showToast(`Staff member registered with status: ${initialStatus}!`, "success");
        setEntryName('');
        setEntryEmail('');
        setEntryFaculty('');
        setEntryDept('');
        setEntryRank('');
        setEntryQualification('');
        setEntryDateEmployed('');
        setEntryEmploymentStatus('Active');
        setEntryPhone('');
        setEntryPhoto('');
        setEntryDocumentUrl('');
        setEntryDocumentName('');
        setEntryDocumentSize('');
      }
    } catch(err) {
      console.error(err);
      showToast("An error occurred while saving details.", "error");
    }
  };

  // Handle dynamic faculty selection with automatic department reset
  const handleFacultyChange = (newFaculty: string) => {
    setEntryFaculty(newFaculty);
    const validDepts = getDepartmentsForFaculty(newFaculty);
    if (!validDepts.includes(entryDept)) {
      setEntryDept('');
    }
  };

  // Comprehensive Document & Spreadsheet Ingestion (PDF, Excel .xlsx, .xls, .csv)
  const handleRosterFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRosterFileName(file.name);
    setIsParsingRoster(true);
    const fileNameLower = file.name.toLowerCase();

    try {
      // 1. PDF DOCUMENT PARSING
      if (fileNameLower.endsWith('.pdf') || file.type === 'application/pdf') {
        setRosterParseMessage('Reading PDF layout and analyzing lecturer roster with AI model...');
        
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const base64Data = event.target?.result as string;
            const res = await fetch('/api/parse-roster', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                pdfBase64: base64Data,
                fileName: file.name,
                mimeType: 'application/pdf'
              })
            });

            const data = await res.json();
            const extracted = data.lecturers || [];

            if (extracted.length === 0) {
              showToast("No lecturer records detected in PDF. Please verify format.", "error");
              setIsParsingRoster(false);
              return;
            }

            // Clean & standardize against ABSU Faculties & Departments
            const standardized = extracted.map((l: any, index: number) => {
              let fac = normalizeFaculty(l.faculty || '');
              let dept = l.department || '';

              // If faculty is missing or unrecognized, infer from department
              if (!fac && dept) {
                const inferred = inferFacultyFromDepartment(dept);
                if (inferred) {
                  fac = inferred.faculty;
                  dept = inferred.department;
                }
              }

              // Default faculty if still unmatched
              if (!fac) fac = "Faculty of Physical Sciences";

              const validDepts = getDepartmentsForFaculty(fac);
              if (dept && !validDepts.includes(dept)) {
                // Find closest match or keep as-is
                const match = validDepts.find(d => d.toLowerCase().includes(dept.toLowerCase()) || dept.toLowerCase().includes(d.toLowerCase()));
                if (match) dept = match;
              } else if (!dept && validDepts.length > 0) {
                dept = validDepts[0];
              }

              return {
                id: `pdf_row_${index}_${Date.now()}`,
                name: l.name || 'Unnamed Lecturer',
                email: (l.email && l.email.includes('@')) ? l.email.toLowerCase() : `${(l.name || 'staff').toLowerCase().replace(/[^a-z0-9]/g, '.')}@absu.edu.ng`,
                faculty: fac,
                department: dept,
                rank: l.rank || 'Lecturer',
                qualification: l.qualification || 'M.Sc',
                dateEmployed: l.dateEmployed || '',
                employmentStatus: ['Active', 'Inactive', 'On Leave', 'Retired'].includes(l.employmentStatus) ? l.employmentStatus : 'Active',
                phone: l.phone || '',
                status: l.status === 'Rejected' ? 'Rejected' : (l.status === 'Pending' ? 'Pending' : 'Approved'),
                documentInfo: l.documentInfo || 'Verified Document in PDF',
                selected: true
              };
            });

            setRosterPreviewList(standardized);
            setShowRosterModal(true);
            setIsParsingRoster(false);
            showToast(`Successfully extracted ${standardized.length} lecturers from ${file.name}!`, "success");
          } catch (err: any) {
            console.error("PDF upload error:", err);
            showToast("Failed to parse PDF: " + (err.message || 'Error occurred'), "error");
            setIsParsingRoster(false);
          }
        };
        reader.readAsDataURL(file);
        return;
      }

      // 2. EXCEL (.xlsx, .xls) AND CSV DOCUMENT PARSING
      setRosterParseMessage('Reading spreadsheet tables and mapping departments, faculties & ranks...');
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const buffer = event.target?.result as ArrayBuffer;
          const workbook = XLSX.read(buffer, { type: 'array' });
          const allRows: any[] = [];

          workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
            allRows.push(...jsonRows);
          });

          if (allRows.length === 0) {
            showToast("The uploaded spreadsheet is empty.", "error");
            setIsParsingRoster(false);
            return;
          }

          // Smart column synonym matching helper
          const findVal = (row: any, synonyms: string[]): string => {
            const keys = Object.keys(row);
            for (const syn of synonyms) {
              const matchedKey = keys.find(k => k.trim().toLowerCase() === syn.toLowerCase() || k.trim().toLowerCase().includes(syn.toLowerCase()));
              if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
                return String(row[matchedKey]).trim();
              }
            }
            return '';
          };

          const parsedList: any[] = [];

          allRows.forEach((row, idx) => {
            const name = findVal(row, ['name', 'full name', 'lecturer name', 'staff name', 'lecturer', 'staff', 'fullname', 'title & name']);
            const email = findVal(row, ['email', 'e-mail', 'email address', 'official email', 'contact email', 'mail']);
            let dept = findVal(row, ['department', 'dept', 'programme', 'program', 'course', 'discipline']);
            let fac = findVal(row, ['faculty', 'school', 'college', 'fac']);
            const rank = findVal(row, ['rank', 'designation', 'position', 'academic rank', 'cadre', 'title', 'role']) || 'Lecturer';
            const qual = findVal(row, ['qualification', 'qualifications', 'degree', 'degrees', 'highest degree', 'certificate']);
            const dateEmp = findVal(row, ['date employed', 'employment date', 'appointment date', 'date', 'joined']);
            const empStatus = findVal(row, ['employment status', 'state', 'active status']);
            const phone = findVal(row, ['phone', 'phone number', 'mobile', 'gsm', 'telephone', 'tel']);
            const docInfo = findVal(row, ['document', 'documents', 'cv', 'file', 'link', 'credentials', 'cert']);
            const statusVal = findVal(row, ['status', 'approval status', 'approval', 'decision']);

            // Ignore header row echoes or empty rows
            if (!name && !email && !dept) return;
            if (name.toLowerCase() === 'name' || name.toLowerCase() === 'full name') return;

            // Normalize Faculty & Department
            let canonicalFac = normalizeFaculty(fac);
            if (!canonicalFac && dept) {
              const inferred = inferFacultyFromDepartment(dept);
              if (inferred) {
                canonicalFac = inferred.faculty;
                dept = inferred.department;
              }
            }

            if (!canonicalFac) canonicalFac = "Faculty of Physical Sciences";

            const validDepts = getDepartmentsForFaculty(canonicalFac);
            if (dept) {
              const matchedDept = validDepts.find(d => d.toLowerCase().includes(dept.toLowerCase()) || dept.toLowerCase().includes(d.toLowerCase()));
              if (matchedDept) dept = matchedDept;
            } else if (validDepts.length > 0) {
              dept = validDepts[0];
            }

            const cleanEmail = (email && email.includes('@')) 
              ? email.toLowerCase() 
              : `${(name || `lecturer_${idx}`).toLowerCase().replace(/[^a-z0-9]/g, '.')}@absu.edu.ng`;

            parsedList.push({
              id: `excel_row_${idx}_${Date.now()}`,
              name: name || `Lecturer ${idx + 1}`,
              email: cleanEmail,
              faculty: canonicalFac,
              department: dept || 'Computer Science',
              rank: rank || 'Lecturer',
              qualification: qual || 'M.Sc',
              dateEmployed: dateEmp || '',
              employmentStatus: ['Active', 'Inactive', 'On Leave', 'Retired'].includes(empStatus) ? empStatus : 'Active',
              phone: phone || '',
              status: statusVal.toLowerCase().includes('reject') ? 'Rejected' : (statusVal.toLowerCase().includes('pend') ? 'Pending' : 'Approved'),
              documentInfo: docInfo || 'Credentials spreadsheet record',
              selected: true
            });
          });

          if (parsedList.length === 0) {
            showToast("Could not recognize lecturer columns in spreadsheet.", "error");
            setIsParsingRoster(false);
            return;
          }

          setRosterPreviewList(parsedList);
          setShowRosterModal(true);
          setIsParsingRoster(false);
          showToast(`Extracted ${parsedList.length} lecturers from ${file.name}!`, "success");
        } catch (err: any) {
          console.error("Spreadsheet error:", err);
          showToast("Failed to parse spreadsheet: " + (err.message || 'Error occurred'), "error");
          setIsParsingRoster(false);
        }
      };
      reader.readAsArrayBuffer(file);

    } catch (error: any) {
      console.error("Upload error:", error);
      showToast("Error processing file.", "error");
      setIsParsingRoster(false);
    }
  };

  // Batch insert confirmed records into Firestore
  const handleConfirmBatchImport = async () => {
    const toImport = rosterPreviewList.filter(item => item.selected);
    if (toImport.length === 0) {
      showToast("Please select at least one lecturer record to import.", "info");
      return;
    }

    setIsImportingBatch(true);
    setImportProgress({ current: 0, total: toImport.length });
    let count = 0;

    try {
      for (let i = 0; i < toImport.length; i++) {
        const item = toImport[i];
        await addDoc(collection(db, 'staff'), {
          name: item.name || '',
          email: item.email.toLowerCase() || '',
          department: item.department || 'General',
          faculty: item.faculty || 'Faculty of Physical Sciences',
          rank: item.rank || 'Lecturer',
          qualification: item.qualification || '',
          dateEmployed: item.dateEmployed || '',
          employmentStatus: item.employmentStatus || 'Active',
          phone: item.phone || '',
          documentName: item.documentInfo || 'Roster Record',
          role: 'user',
          status: rosterTargetStatus,
          verificationStatus: rosterTargetStatus,
          rejectionReason: '',
          createdAt: serverTimestamp(),
          importedFrom: rosterFileName || 'Bulk Upload'
        });
        count++;
        setImportProgress({ current: count, total: toImport.length });
      }

      showToast(`Successfully imported ${count} lecturers into the database with status "${rosterTargetStatus}"!`, "success");
      setRosterPreviewList([]);
      setShowRosterModal(false);
      setIsImportingBatch(false);
    } catch (err: any) {
      console.error("Error importing batch:", err);
      showToast(`Import completed with ${count}/${toImport.length} records.`, "info");
      setIsImportingBatch(false);
    }
  };

  const handleSaveSettings = () => {
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  };

  const departmentCounts = staffList.reduce((acc, curr) => {
    const dept = curr.department || 'Unspecified';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const facultyCounts = staffList.reduce((acc, curr) => {
    const fac = curr.faculty || 'Unspecified';
    acc[fac] = (acc[fac] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const facultyChartData = Object.keys(facultyCounts).map(fac => ({ name: fac, value: facultyCounts[fac] }));
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#64748b'];

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-artistic-mesh p-4 text-slate-700 font-bold">Loading ABSU Staff Portal...</div>;
  }

  // Authentication Screen
  if (!user && !isGuest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-artistic-mesh p-4">
        <div className="glass-panel p-8 rounded-[2rem] w-full max-w-sm relative overflow-hidden">
          <div className="text-center mb-6">
            <div className="w-20 h-20 mx-auto mb-6 rounded-[2rem] overflow-hidden shadow-2xl border border-white/60 flex items-center justify-center bg-white/50 backdrop-blur-md">
               <img src="/Absu.jpg" alt="ABSU Logo" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=ABSU&background=0D8ABC&color=fff'; }} />
            </div>
            <h1 className="text-xl font-bold text-slate-800 mb-2">ABSU STAFF DATABASE</h1>
            <p className="text-xs text-slate-500">
              {authMode === 'signin' ? 'Sign in to access the staff portal.' : 'Register for an account.'}
            </p>
          </div>
          
          {authError && <div className="mb-4 p-2.5 bg-red-50 text-red-600 text-xs rounded-xl border border-red-200">{authError}</div>}
          
          <form onSubmit={handleAuth} className="flex flex-col gap-3">
            {authMode === 'signup' && (
              <>
                <input 
                  type="text" 
                  placeholder="Full Name" 
                  required 
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
                <input 
                  type="tel" 
                  placeholder="Phone Number" 
                  required 
                  value={authPhone}
                  onChange={(e) => setAuthPhone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </>
            )}
            <input 
              type="email" 
              placeholder="Email Address" 
              required 
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            <input 
              type="password" 
              placeholder="Password" 
              required 
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            {authMode === 'signin' && (
              <button type="button" onClick={handlePasswordReset} className="text-[10px] text-indigo-600 hover:underline self-end">
                Forgot Password?
              </button>
            )}

            <button 
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-md transition-all flex items-center justify-center gap-2 text-sm mt-2"
            >
              {authMode === 'signin' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {authMode === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
            <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink-0 mx-4 text-slate-400 text-xs">Or</span>
                <div className="flex-grow border-t border-slate-200"></div>
            </div>
            <button 
              type="button"
              onClick={(e) => handleGoogleAuth(e)}
              disabled={isGoogleLoading}
              className="w-full bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-semibold py-3 px-4 rounded-xl shadow-sm hover:shadow-md border border-slate-200 hover:border-slate-300 transition-all duration-200 flex items-center justify-center gap-2.5 text-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  <span>Connecting to Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>
          </form>
          
          <div className="mt-4 text-center flex flex-col gap-2">
            <button 
              onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setAuthError(''); }}
              className="text-xs text-indigo-600 hover:underline"
            >
              {authMode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
            </button>
            <button 
              onClick={() => setIsGuest(true)}
              className="text-xs text-slate-500 hover:text-slate-700 hover:underline"
            >
              Continue as Guest
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full font-sans overflow-hidden bg-artistic-mesh">
      <audio ref={audioRef} src="https://www.chosic.com/wp-content/uploads/2020/07/Art-Of-Silence_V2.mp3" loop />
      
      {/* Toast Alert Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 max-w-md ${
              toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-400' :
              toast.type === 'error' ? 'bg-rose-600 text-white border-rose-400' :
              'bg-slate-900 text-white border-slate-700'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0" />}
            {toast.type === 'error' && <AlertTriangle className="w-5 h-5 shrink-0" />}
            {toast.type === 'info' && <Clock className="w-5 h-5 shrink-0" />}
            <span className="text-xs font-semibold leading-relaxed">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-auto text-white/80 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <nav className="w-56 bg-gradient-to-b from-indigo-950 to-slate-950 border-r border-indigo-900/30 flex flex-col shrink-0 hidden md:flex">
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-lg border border-white/20 bg-white/50 flex shrink-0 backdrop-blur-sm p-1">
               <img src="/Absu.jpg" alt="ABSU Logo" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=ABSU&background=0D8ABC&color=fff'; }} />
            </div>
            <span className="text-white font-bold text-xs tracking-wide leading-tight">ABSU STAFF<br/>DATABASE</span>
          </div>
        </div>
        <div className="flex-1 py-4">
          <div className="px-4 mb-2 text-[10px] uppercase font-bold text-slate-500 tracking-wider">Main Navigation</div>
          {isAdmin ? (
            <>
              <button onClick={() => setActiveView('dashboard')} className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-all duration-300 ${activeView === 'dashboard' ? 'text-indigo-300 bg-white/10 border-r-4 border-indigo-400 shadow-[inset_4px_0_12px_rgba(255,255,255,0.05)]' : 'text-slate-400 hover:text-white border-r-4 border-transparent'}`}>
                <LayoutDashboard className="w-4 h-4" /> Dashboard
                {pendingCount > 0 && (
                  <span className="ml-auto bg-amber-500 text-slate-900 font-black text-[10px] px-2 py-0.5 rounded-full animate-pulse">
                    {pendingCount}
                  </span>
                )}
              </button>
              <button onClick={() => setActiveView('directory')} className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-all duration-300 ${activeView === 'directory' ? 'text-indigo-300 bg-white/10 border-r-4 border-indigo-400 shadow-[inset_4px_0_12px_rgba(255,255,255,0.05)]' : 'text-slate-400 hover:text-white border-r-4 border-transparent'}`}>
                <Users className="w-4 h-4" /> Staff Directory
              </button>
              <button onClick={() => setActiveView('entry')} className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-all duration-300 ${activeView === 'entry' ? 'text-indigo-300 bg-white/10 border-r-4 border-indigo-400 shadow-[inset_4px_0_12px_rgba(255,255,255,0.05)]' : 'text-slate-400 hover:text-white border-r-4 border-transparent'}`}>
                <UserPlus className="w-4 h-4" /> Add Staff Member
              </button>
            </>
          ) : (
            <button onClick={() => setActiveView('entry')} className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-all duration-300 ${activeView === 'entry' ? 'text-indigo-300 bg-white/10 border-r-4 border-indigo-400 shadow-[inset_4px_0_12px_rgba(255,255,255,0.05)]' : 'text-slate-400 hover:text-white border-r-4 border-transparent'}`}>
              <UserIcon className="w-4 h-4" /> My Staff Profile
              {myStaffRecord && (
                <span className={`ml-auto text-[9px] px-2 py-0.5 rounded-full font-bold ${
                  getNormalizedStatus(myStaffRecord) === 'Approved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                  getNormalizedStatus(myStaffRecord) === 'Rejected' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                  'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                }`}>
                  {getNormalizedStatus(myStaffRecord)}
                </span>
              )}
            </button>
          )}
          <button 
            onClick={() => {
              setActiveView('news');
              if (audioRef.current && !isAudioMuted) {
                audioRef.current.volume = 0.3;
                audioRef.current.play().catch(e => {
                  console.log('Play blocked, mutating fallback:', e);
                  setIsAudioMuted(true);
                });
              }
            }} 
            className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-all duration-300 ${activeView === 'news' ? 'text-indigo-300 bg-white/10 border-r-4 border-indigo-400 shadow-[inset_4px_0_12px_rgba(255,255,255,0.05)]' : 'text-slate-400 hover:text-white border-r-4 border-transparent'}`}
          >
            <Rss className="w-4 h-4" /> News Feed
          </button>
          <button onClick={() => setActiveView('messages')} className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-all duration-300 ${activeView === 'messages' ? 'text-indigo-300 bg-white/10 border-r-4 border-indigo-400 shadow-[inset_4px_0_12px_rgba(255,255,255,0.05)]' : 'text-slate-400 hover:text-white border-r-4 border-transparent'}`}>
            <MessageSquare className="w-4 h-4" /> Messages
            <span className="ml-auto bg-red-500 text-[10px] px-1.5 rounded-full text-white font-bold">4</span>
          </button>
          <div className="px-4 mt-6 mb-2 text-[10px] uppercase font-bold text-slate-500 tracking-wider">System</div>
          <button onClick={() => setActiveView('settings')} className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-all duration-300 ${activeView === 'settings' ? 'text-indigo-300 bg-white/10 border-r-4 border-indigo-400 shadow-[inset_4px_0_12px_rgba(255,255,255,0.05)]' : 'text-slate-400 hover:text-white border-r-4 border-transparent'}`}>
            <Settings className="w-4 h-4" /> Settings
          </button>
        </div>
        <div className="p-4 mt-auto border-t border-white/10 bg-slate-900/40 backdrop-blur-md">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => {
            if (user) {
              signOut(auth);
            } else {
              setIsGuest(false);
            }
          }}>
            <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden border border-slate-600 flex items-center justify-center">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-xs font-bold">{user?.displayName?.charAt(0) || 'G'}</span>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-xs font-medium text-white truncate">{user?.displayName || (user ? 'User' : 'Guest')}</div>
              <div className="text-[10px] text-slate-500 truncate">{user?.email || 'Not signed in'}</div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 glass-panel border-b border-white/40 px-8 flex items-center justify-between shrink-0 z-20">
          <h1 className="text-lg font-bold text-slate-800">
            {activeView === 'dashboard' && 'Analytics Dashboard'}
            {activeView === 'directory' && 'Staff Directory & Approvals'}
            {activeView === 'entry' && (isAdmin ? 'Staff Management Entry' : 'My Staff Profile')}
            {activeView === 'news' && 'News Feed'}
            {activeView === 'messages' && 'Messages & Chat'}
            {activeView === 'settings' && 'System Settings'}
          </h1>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Search records..." 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    className="pl-9 pr-4 py-2 bg-white/50 backdrop-blur-sm border border-white/40 rounded-full text-xs w-72 focus:ring-2 focus:ring-indigo-400 focus:bg-white/80 outline-none shadow-inner transition-all" 
                  />
                  <Search className="w-4 h-4 absolute left-3 top-2 text-indigo-400" />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleExportPDF} className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-[0_4px_12px_rgba(225,29,72,0.3)] hover:-translate-y-0.5 text-xs font-bold py-1.5 px-3 rounded-full transition-all duration-300 flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5" /> PDF
                  </button>
                  <button onClick={handleExportExcel} className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)] hover:-translate-y-0.5 text-xs font-bold py-1.5 px-3 rounded-full transition-all duration-300 flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5" /> Excel
                  </button>
                  <button 
                    onClick={() => setShowDeleteAllModal(true)} 
                    className="bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white shadow-[0_4px_12px_rgba(225,29,72,0.35)] hover:-translate-y-0.5 text-xs font-bold py-1.5 px-3 rounded-full transition-all duration-300 flex items-center gap-1.5"
                    title="Delete every single data currently uploaded on the website"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete All Details
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <AnimatePresence mode="wait">

        {/* DASHBOARD VIEW */}
        {isAdmin && activeView === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 15, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -15, filter: 'blur(8px)' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
          >
            <div className="flex-1 p-6 space-y-6 overflow-auto">
              {/* Admin Database Master Controls Banner */}
              <div className="glass-panel p-4 rounded-3xl border border-white/60 shadow-md flex flex-wrap items-center justify-between gap-4 bg-white/40 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      Portal Database Master Controls
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                        {staffList.length} Active Records
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500">
                      Manage staff records, process pending approvals, or wipe uploaded data.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setActiveView('directory')}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white/70 hover:bg-white border border-slate-200 shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <Users className="w-3.5 h-3.5 text-indigo-600" /> Full Directory
                  </button>
                  <button
                    onClick={() => setShowDeleteAllModal(true)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5 hover:-translate-y-0.5 active:translate-y-0"
                    title="Delete every single data currently uploaded on the website"
                  >
                    <Trash2 className="w-4 h-4" /> Delete All Details
                  </button>
                </div>
              </div>

              {/* Top Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div 
                  onClick={() => { setStatusFilter('all'); setActiveView('directory'); }}
                  className="glass-panel p-6 rounded-3xl cursor-pointer hover:border-indigo-400 transition-all hover:-translate-y-0.5"
                >
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Staff (DB)</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900">{staffList.length}</span>
                    <span className="text-emerald-500 text-xs font-bold">+Live</span>
                  </div>
                  <div className="mt-3 h-1 w-full bg-white/40 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-gradient-to-r from-indigo-400 to-purple-400 w-[100%]"></div>
                  </div>
                </div>

                {/* Clickable Pending Approval Card */}
                <div 
                  onClick={() => { setStatusFilter('Pending'); setActiveView('directory'); }}
                  className="glass-panel p-6 rounded-3xl cursor-pointer border border-amber-300/80 bg-amber-50/40 hover:bg-amber-50/70 hover:shadow-lg transition-all hover:-translate-y-0.5 relative group"
                >
                  <div className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-1 flex items-center justify-between">
                    <span>Pending Approval</span>
                    <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-amber-900">{pendingCount}</span>
                    <span className="text-amber-600 text-xs font-bold">Action Req.</span>
                  </div>
                  <div className="mt-2 text-[10px] font-bold text-amber-700 flex items-center gap-1 group-hover:underline">
                    <span>Click to review pending</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                  <div className="mt-2 h-1 w-full bg-amber-200/60 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: `${(pendingCount / Math.max(staffList.length, 1)) * 100}%`}}></div>
                  </div>
                </div>

                <div 
                  onClick={() => { setStatusFilter('Approved'); setActiveView('directory'); }}
                  className="glass-panel p-6 rounded-3xl cursor-pointer hover:border-emerald-400 transition-all hover:-translate-y-0.5"
                >
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Approved Staff</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900">{approvedCount}</span>
                    <span className="text-emerald-600 text-xs font-bold">Verified</span>
                  </div>
                  <div className="mt-3 h-1 w-full bg-white/40 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-emerald-500" style={{ width: `${(approvedCount / Math.max(staffList.length, 1)) * 100}%`}}></div>
                  </div>
                </div>

                <div 
                  onClick={() => { setStatusFilter('Rejected'); setActiveView('directory'); }}
                  className="glass-panel p-6 rounded-3xl cursor-pointer hover:border-rose-400 transition-all hover:-translate-y-0.5"
                >
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Rejected Staff</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900">{rejectedCount}</span>
                    <span className="text-rose-500 text-xs font-bold">Flagged</span>
                  </div>
                  <div className="mt-3 h-1 w-full bg-white/40 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-rose-500" style={{ width: `${(rejectedCount / Math.max(staffList.length, 1)) * 100}%`}}></div>
                  </div>
                </div>
              </div>

              {/* Faculty Pie Chart & Quick Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="glass-panel p-6 rounded-[2rem] border border-white/60 shadow-lg flex flex-col">
                   <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Staff per Faculty</h3>
                   </div>
                   <div className="flex-1 min-h-[250px]">
                     <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                         <Pie
                           data={facultyChartData}
                           cx="50%"
                           cy="50%"
                           innerRadius={60}
                           outerRadius={80}
                           paddingAngle={5}
                           dataKey="value"
                         >
                           {facultyChartData.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                           ))}
                         </Pie>
                         <Tooltip 
                           contentStyle={{ borderRadius: '8px', fontSize: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                           itemStyle={{ color: '#1e293b' }}
                         />
                         <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                       </PieChart>
                     </ResponsiveContainer>
                   </div>
                </div>

                <div className="glass-panel p-6 rounded-[2rem] border border-white/60 shadow-lg flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3">Approval Workflow Summary</h3>
                    <p className="text-xs text-slate-600 leading-relaxed mb-4">
                      All new submissions by staff members are marked as <span className="font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">Pending</span>. Admins can review, download uploaded credentials, and choose to strictly <span className="font-bold text-emerald-700">Approve</span> or <span className="font-bold text-rose-700">Reject</span>.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2.5 bg-white/50 rounded-xl text-xs">
                        <span className="font-medium text-slate-700 flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-amber-500" /> Pending Approvals:</span>
                        <span className="font-bold text-amber-700">{pendingCount}</span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 bg-white/50 rounded-xl text-xs">
                        <span className="font-medium text-slate-700 flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Approved Staff:</span>
                        <span className="font-bold text-emerald-700">{approvedCount}</span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 bg-white/50 rounded-xl text-xs">
                        <span className="font-medium text-slate-700 flex items-center gap-2"><X className="w-3.5 h-3.5 text-rose-500" /> Rejected Staff:</span>
                        <span className="font-bold text-rose-700">{rejectedCount}</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setStatusFilter('Pending'); setActiveView('directory'); }}
                    className="mt-4 w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-2.5 px-4 rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <Clock className="w-4 h-4" /> Go to Pending Approvals ({pendingCount})
                  </button>
                </div>
              </div>

              {/* Live Staff Registrations Table */}
              <div className="glass-panel rounded-[2rem] overflow-hidden mt-6">
                <div className="bg-white/40 backdrop-blur-sm border-b border-white/50 px-5 py-3 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Recent Staff Registrations</h3>
                  <button onClick={() => setActiveView('directory')} className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1">
                    View Full Directory <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                
                {/* Status, Faculty & Department Filters */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white/30 border-b border-white/40">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-600 mr-1 flex items-center gap-1">
                      <Filter className="w-3.5 h-3.5 text-indigo-600" /> Filter:
                    </span>
                    <button
                      onClick={() => setStatusFilter('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        statusFilter === 'all'
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-white/60 text-slate-600 hover:bg-white'
                      }`}
                    >
                      All ({staffList.length})
                    </button>
                    <button
                      onClick={() => setStatusFilter('Pending')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                        statusFilter === 'Pending'
                          ? 'bg-amber-500 text-slate-900 shadow-md font-black'
                          : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      Pending ({pendingCount})
                    </button>
                    <button
                      onClick={() => setStatusFilter('Approved')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                        statusFilter === 'Approved'
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      <CheckCircle className="w-3 h-3" />
                      Approved ({approvedCount})
                    </button>
                    <button
                      onClick={() => setStatusFilter('Rejected')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                        statusFilter === 'Rejected'
                          ? 'bg-rose-600 text-white shadow-md'
                          : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                      }`}
                    >
                      <X className="w-3 h-3" />
                      Rejected ({rejectedCount})
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={facultyFilter}
                      onChange={(e) => {
                        setFacultyFilter(e.target.value);
                        setDepartmentFilter('all');
                      }}
                      className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-white border border-slate-200 shadow-sm text-slate-700 focus:ring-1 focus:ring-indigo-400 outline-none max-w-[180px]"
                    >
                      <option value="all">All Faculties</option>
                      {FACULTIES_DATA.map(f => (
                        <option key={f.faculty} value={f.faculty}>{f.faculty}</option>
                      ))}
                    </select>

                    <select
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                      disabled={facultyFilter === 'all'}
                      className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-white border border-slate-200 shadow-sm text-slate-700 focus:ring-1 focus:ring-indigo-400 outline-none disabled:opacity-50 disabled:bg-slate-100 max-w-[180px]"
                    >
                      <option value="all">
                        {facultyFilter === 'all' ? 'All Depts' : `All Depts`}
                      </option>
                      {facultyFilter !== 'all' && getDepartmentsForFaculty(facultyFilter).map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>

                    {(facultyFilter !== 'all' || departmentFilter !== 'all' || statusFilter !== 'all') && (
                      <button
                        onClick={() => {
                          setFacultyFilter('all');
                          setDepartmentFilter('all');
                          setStatusFilter('all');
                        }}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline px-1 py-1"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-white/40 backdrop-blur-sm text-[10px] font-bold text-indigo-900 uppercase border-b border-white/40">
                      <tr>
                        <th className="px-5 py-3 whitespace-nowrap">Staff Member</th>
                        <th className="px-5 py-3 whitespace-nowrap">Department & Faculty</th>
                        <th className="px-5 py-3 whitespace-nowrap">Rank</th>
                        <th className="px-5 py-3 whitespace-nowrap">Status</th>
                        <th className="px-5 py-3 whitespace-nowrap">Document</th>
                        <th className="px-5 py-3 text-right whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStaffList.length === 0 ? (
                         <tr><td colSpan={6} className="px-5 py-4 text-center text-xs text-slate-500">No staff records match filter "{statusFilter}".</td></tr>
                      ) : (
                        filteredStaffList.slice(0, 6).map((staff) => (
                        <tr key={staff.id} className="text-xs hover:bg-white/40 transition-colors">
                          <td className="px-5 py-2.5 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-indigo-100 border border-indigo-200 flex items-center justify-center font-bold text-[11px] text-indigo-700">
                              {staff.photoUrl ? (
                                <img src={staff.photoUrl} alt={staff.name} className="w-full h-full object-cover" />
                              ) : (
                                <span>{(staff.name || 'S').substring(0, 2).toUpperCase()}</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 truncate">{staff.name}</div>
                              <div className="text-[10px] text-slate-500 truncate">{staff.email || 'No email'}</div>
                            </div>
                          </td>
                          <td className="px-5 py-2.5 whitespace-nowrap">
                            <div className="font-medium text-slate-800">{staff.department || 'N/A'}</div>
                            <div className="text-[10px] text-slate-500">{staff.faculty || ''}</div>
                          </td>
                          <td className="px-5 py-2.5 whitespace-nowrap">
                            <div className="font-semibold text-indigo-900">{staff.rank || staff.role || 'Staff'}</div>
                            <div className="text-[10px] text-slate-500">{staff.qualification || 'N/A'}</div>
                          </td>
                          <td className="px-5 py-2.5 whitespace-nowrap">
                            {getNormalizedStatus(staff) === 'Approved' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Approved
                              </span>
                            )}
                            {getNormalizedStatus(staff) === 'Pending' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                                <Clock className="w-3 h-3 text-amber-600" /> Pending Review
                              </span>
                            )}
                            {getNormalizedStatus(staff) === 'Rejected' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                <XCircle className="w-3 h-3 text-rose-600" /> Rejected
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-2.5 whitespace-nowrap">
                            {staff.documentUrl || staff.cvUrl ? (
                              <a 
                                href={staff.documentUrl || staff.cvUrl} 
                                download={staff.documentName || "staff_document.pdf"}
                                target="_blank" 
                                rel="noreferrer" 
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-200 hover:bg-indigo-100 transition-colors"
                              >
                                <FileText className="w-3 h-3" /> {staff.documentName ? 'Doc' : 'CV'}
                              </a>
                            ) : (
                              <span className="text-[10px] text-slate-400">None</span>
                            )}
                          </td>
                          <td className="px-5 py-2.5 text-right whitespace-nowrap">
                            <button 
                              onClick={() => setReviewStaff(staff)} 
                              className="text-indigo-600 hover:text-indigo-900 font-bold px-2 py-1 text-xs hover:underline"
                            >
                              Review
                            </button>
                            {isAdmin && (
                              <>
                                {getNormalizedStatus(staff) !== 'Approved' && (
                                  <button 
                                    onClick={() => handleApproveStaff(staff.id)} 
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 ml-1 rounded-lg text-[10px] shadow-sm transition-all"
                                    title="Approve staff record"
                                  >
                                    Approve
                                  </button>
                                )}
                                {getNormalizedStatus(staff) !== 'Rejected' && (
                                  <button 
                                    onClick={() => {
                                      setRejectModalStaff(staff);
                                      setRejectionReasonInput('');
                                    }} 
                                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-2.5 py-1 ml-1 rounded-lg text-[10px] shadow-sm transition-all"
                                    title="Reject staff record"
                                  >
                                    Reject
                                  </button>
                                )}
                              </>
                            )}
                          </td>
                        </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* FULL STAFF DIRECTORY VIEW */}
        {isAdmin && activeView === 'directory' && (
          <motion.div
            key="directory"
            initial={{ opacity: 0, y: 15, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -15, filter: 'blur(8px)' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
          >
            <div className="flex-1 p-6 overflow-auto">
             <div className="glass-panel rounded-[2rem] overflow-hidden min-h-[500px]">
                <div className="bg-white/40 backdrop-blur-sm border-b border-white/50 px-5 py-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Full Staff Directory & Approvals</h3>
                      <p className="text-[11px] text-slate-500">Filter and process pending applications, approve or reject records.</p>
                    </div>
                    <div className="flex items-center gap-2">
                       <button onClick={handleExportPDF} className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-1 px-2.5 rounded-lg flex items-center gap-1">
                         <Download className="w-3 h-3"/> PDF
                       </button>
                       <button onClick={handleExportExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1 px-2.5 rounded-lg flex items-center gap-1">
                         <Download className="w-3 h-3"/> Excel
                       </button>
                       <button 
                         onClick={() => setShowDeleteAllModal(true)} 
                         className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-1 px-2.5 rounded-lg flex items-center gap-1 shadow-sm transition-all"
                         title="Delete every single data currently uploaded"
                       >
                         <Trash2 className="w-3 h-3"/> Delete All Details
                       </button>
                    </div>
                </div>

                {/* Status, Faculty & Department Filters */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white/40 border-b border-white/40">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 mr-1 flex items-center gap-1">
                      <Filter className="w-3.5 h-3.5 text-indigo-600" /> Filter:
                    </span>
                    <button
                      onClick={() => setStatusFilter('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        statusFilter === 'all'
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-white/60 text-slate-600 hover:bg-white'
                      }`}
                    >
                      All Staff ({staffList.length})
                    </button>
                    <button
                      onClick={() => setStatusFilter('Pending')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                        statusFilter === 'Pending'
                          ? 'bg-amber-500 text-slate-900 shadow-md font-black ring-2 ring-amber-400'
                          : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      Pending Approval ({pendingCount})
                    </button>
                    <button
                      onClick={() => setStatusFilter('Approved')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                        statusFilter === 'Approved'
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      Approved ({approvedCount})
                    </button>
                    <button
                      onClick={() => setStatusFilter('Rejected')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                        statusFilter === 'Rejected'
                          ? 'bg-rose-600 text-white shadow-md'
                          : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                      }`}
                    >
                      <X className="w-3.5 h-3.5 text-rose-600" />
                      Rejected ({rejectedCount})
                    </button>
                  </div>

                  {/* Academic Dependent Dropdown Filters (Faculty & Department) */}
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={facultyFilter}
                      onChange={(e) => {
                        setFacultyFilter(e.target.value);
                        setDepartmentFilter('all');
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 shadow-sm text-slate-700 focus:ring-1 focus:ring-indigo-400 outline-none max-w-[200px]"
                    >
                      <option value="all">All Faculties ({FACULTIES_DATA.length})</option>
                      {FACULTIES_DATA.map(f => (
                        <option key={f.faculty} value={f.faculty}>{f.faculty}</option>
                      ))}
                    </select>

                    <select
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                      disabled={facultyFilter === 'all'}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 shadow-sm text-slate-700 focus:ring-1 focus:ring-indigo-400 outline-none disabled:opacity-50 disabled:bg-slate-100 max-w-[200px]"
                    >
                      <option value="all">
                        {facultyFilter === 'all' ? 'All Departments' : `All Depts in ${facultyFilter.replace('Faculty of ', '')}`}
                      </option>
                      {facultyFilter !== 'all' && getDepartmentsForFaculty(facultyFilter).map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>

                    {(facultyFilter !== 'all' || departmentFilter !== 'all' || statusFilter !== 'all') && (
                      <button
                        onClick={() => {
                          setFacultyFilter('all');
                          setDepartmentFilter('all');
                          setStatusFilter('all');
                        }}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline px-1 py-1"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-white/40 backdrop-blur-sm text-[10px] font-bold text-indigo-900 uppercase border-b border-white/40">
                      <tr>
                        <th className="px-5 py-3 whitespace-nowrap">Staff Member</th>
                        <th className="px-5 py-3 whitespace-nowrap">Department & Faculty</th>
                        <th className="px-5 py-3 whitespace-nowrap">Rank & Qualification</th>
                        <th className="px-5 py-3 whitespace-nowrap">Date Employed</th>
                        <th className="px-5 py-3 whitespace-nowrap">Approval Status</th>
                        <th className="px-5 py-3 whitespace-nowrap">Document / CV</th>
                        <th className="px-5 py-3 whitespace-nowrap">Phone</th>
                        <th className="px-5 py-3 text-right whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStaffList.length === 0 ? (
                         <tr><td colSpan={8} className="px-5 py-6 text-center text-xs text-slate-500 font-medium">No staff records match filter "{statusFilter}".</td></tr>
                      ) : (
                        filteredStaffList.map((staff) => (
                        <tr key={staff.id} className="text-xs hover:bg-white/40 transition-colors">
                          <td className="px-5 py-2.5 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-indigo-100 border border-indigo-200 flex items-center justify-center font-bold text-[11px] text-indigo-700">
                              {staff.photoUrl ? (
                                <img src={staff.photoUrl} alt={staff.name} className="w-full h-full object-cover" />
                              ) : (
                                <span>{(staff.name || 'S').substring(0, 2).toUpperCase()}</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 truncate">{staff.name}</div>
                              <div className="text-[10px] text-slate-500 truncate">{staff.email || 'No email'}</div>
                            </div>
                          </td>
                          <td className="px-5 py-2.5 whitespace-nowrap">
                            <div className="font-medium text-slate-800">{staff.department || 'N/A'}</div>
                            <div className="text-[10px] text-slate-500">{staff.faculty || ''}</div>
                          </td>
                          <td className="px-5 py-2.5 whitespace-nowrap">
                            <div className="font-semibold text-indigo-900">{staff.rank || staff.role || 'Staff'}</div>
                            <div className="text-[10px] text-slate-500">{staff.qualification || 'N/A'}</div>
                          </td>
                          <td className="px-5 py-2.5 text-slate-600 whitespace-nowrap">
                            {staff.dateEmployed || (staff.createdAt?.toDate ? staff.createdAt.toDate().toLocaleDateString() : 'N/A')}
                          </td>
                          <td className="px-5 py-2.5 whitespace-nowrap">
                            {getNormalizedStatus(staff) === 'Approved' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Approved
                              </span>
                            )}
                            {getNormalizedStatus(staff) === 'Pending' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                                <Clock className="w-3 h-3 text-amber-600" /> Pending Review
                              </span>
                            )}
                            {getNormalizedStatus(staff) === 'Rejected' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                <XCircle className="w-3 h-3 text-rose-600" /> Rejected
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-2.5 whitespace-nowrap">
                            {staff.documentUrl || staff.cvUrl ? (
                              <a 
                                href={staff.documentUrl || staff.cvUrl} 
                                download={staff.documentName || "staff_document.pdf"}
                                target="_blank" 
                                rel="noreferrer" 
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 hover:bg-indigo-100 transition-colors"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                {staff.documentName ? (staff.documentName.length > 15 ? staff.documentName.substring(0, 15) + '...' : staff.documentName) : 'View Document'}
                              </a>
                            ) : (
                              <span className="text-[10px] text-slate-400">No document</span>
                            )}
                          </td>
                          <td className="px-5 py-2.5 text-slate-600 whitespace-nowrap font-mono text-[11px]">
                            {staff.phone || 'N/A'}
                          </td>
                          <td className="px-5 py-2.5 text-right whitespace-nowrap">
                            <button 
                              onClick={() => setReviewStaff(staff)} 
                              className="text-indigo-600 hover:text-indigo-900 font-bold px-2 py-1 text-xs hover:underline"
                            >
                              Review
                            </button>

                            {/* Prominent Approve & Reject Buttons */}
                            {isAdmin && (
                              <>
                                {getNormalizedStatus(staff) !== 'Approved' && (
                                  <button 
                                    onClick={() => handleApproveStaff(staff.id)} 
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 ml-1 rounded-lg text-[10px] shadow-sm transition-all"
                                    title="Approve staff record"
                                  >
                                    Approve
                                  </button>
                                )}
                                {getNormalizedStatus(staff) !== 'Rejected' && (
                                  <button 
                                    onClick={() => {
                                      setRejectModalStaff(staff);
                                      setRejectionReasonInput('');
                                    }} 
                                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-2.5 py-1 ml-1 rounded-lg text-[10px] shadow-sm transition-all"
                                    title="Reject staff record"
                                  >
                                    Reject
                                  </button>
                                )}
                                {isSuperAdmin && staff.role !== "admin" && (
                                  <button onClick={() => handleMakeAdmin(staff.id)} className="text-slate-600 hover:text-slate-900 font-bold px-2 py-1 ml-1 border border-slate-300 rounded text-[10px]">Make Admin</button>
                                )}
                                {isSuperAdmin && staff.role === "admin" && staff.email !== user?.email && (
                                  <button onClick={() => handleRemoveAdmin(staff.id)} className="text-amber-600 hover:text-amber-800 font-bold px-2 py-1 ml-1 border border-amber-200 rounded text-[10px]">Remove Admin</button>
                                )}
                                <button onClick={() => handleDeleteStaff(staff.id)} className="text-red-500 hover:text-red-700 font-bold px-2 py-1 ml-1 text-[10px] border border-red-200 rounded uppercase">Delete</button>
                              </>
                            )}
                          </td>
                        </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
             </div>
            </div>
          </motion.div>
        )}

        {/* STAFF ENTRY / MY PROFILE VIEW */}
        {activeView === 'entry' && (
          <motion.div
            key="entry"
            initial={{ opacity: 0, y: 15, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -15, filter: 'blur(8px)' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
          >
            <div className="flex-1 p-6 overflow-auto">
             <div className="glass-panel rounded-[2rem] max-w-2xl mx-auto p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">
                      {isAdmin ? 'Staff Management Entry' : (myStaffRecord && !isEditingMyDetails ? 'My Staff Profile' : (isEditingMyDetails ? 'Edit My Details' : 'Register My Details'))}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {isAdmin 
                        ? 'Register university staff members or perform bulk CSV uploads.' 
                        : (myStaffRecord && !isEditingMyDetails 
                            ? 'Your official submitted record in Abia State University database.' 
                            : 'Fill in your official employment, credentials, and upload required documents.')}
                    </p>
                  </div>
                  {!isAdmin && myStaffRecord && !isEditingMyDetails && (
                    <button 
                      onClick={() => setIsEditingMyDetails(true)} 
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-md transition-all flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit My Details
                    </button>
                  )}
                </div>
                
                {/* ADMIN MANUAL ENTRY FORM */}
                {isAdmin ? (
                   <div className="space-y-8">
                      <div className="border-b border-slate-200 pb-8">
                         <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                           <UserPlus className="w-4 h-4 text-indigo-600" /> Manual Staff Registration
                         </h3>
                         <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                 <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                                 <input type="text" value={entryName} onChange={(e) => setEntryName(e.target.value)} className="w-full px-3 py-2 bg-white/50 border border-white/60 backdrop-blur-sm shadow-inner rounded-md text-xs focus:ring-1 focus:ring-indigo-400 focus:bg-white/80 transition-all outline-none" placeholder="e.g. Dr. Ngozi Eze" />
                              </div>
                              <div>
                                 <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                                 <input type="email" value={entryEmail} onChange={(e) => setEntryEmail(e.target.value)} className="w-full px-3 py-2 bg-white/50 border border-white/60 backdrop-blur-sm shadow-inner rounded-md text-xs focus:ring-1 focus:ring-indigo-400 focus:bg-white/80 transition-all outline-none" placeholder="e.g. ngozi.eze@absu.edu.ng" />
                              </div>
                              <div>
                                 <label className="block text-xs font-bold text-slate-700 mb-1">Faculty *</label>
                                 <select 
                                   value={entryFaculty} 
                                   onChange={(e) => handleFacultyChange(e.target.value)} 
                                   className="w-full px-3 py-2 bg-white/70 border border-white/60 backdrop-blur-sm shadow-inner rounded-md text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-400 focus:bg-white outline-none"
                                 >
                                    <option value="">-- Select Faculty --</option>
                                    {FACULTIES_DATA.map(f => (
                                      <option key={f.faculty} value={f.faculty}>{f.faculty}</option>
                                    ))}
                                 </select>
                              </div>
                              <div>
                                 <label className="block text-xs font-bold text-slate-700 mb-1">Department *</label>
                                 <select 
                                   value={entryDept} 
                                   onChange={(e) => setEntryDept(e.target.value)} 
                                   disabled={!entryFaculty}
                                   className="w-full px-3 py-2 bg-white/70 border border-white/60 backdrop-blur-sm shadow-inner rounded-md text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-400 focus:bg-white outline-none disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed"
                                 >
                                    <option value="">{entryFaculty ? '-- Select Department --' : '-- Choose Faculty First --'}</option>
                                    {getDepartmentsForFaculty(entryFaculty).map(dept => (
                                      <option key={dept} value={dept}>{dept}</option>
                                    ))}
                                 </select>
                              </div>
                              <div>
                                 <label className="block text-xs font-bold text-slate-700 mb-1">Rank *</label>
                                 <input type="text" value={entryRank} onChange={(e) => setEntryRank(e.target.value)} className="w-full px-3 py-2 bg-white/50 border border-white/60 backdrop-blur-sm shadow-inner rounded-md text-xs focus:ring-1 focus:ring-indigo-400 focus:bg-white/80 transition-all outline-none" placeholder="e.g. Senior Lecturer / Professor" />
                              </div>
                              <div>
                                 <label className="block text-xs font-bold text-slate-700 mb-1">Qualification</label>
                                 <input type="text" value={entryQualification} onChange={(e) => setEntryQualification(e.target.value)} className="w-full px-3 py-2 bg-white/50 border border-white/60 backdrop-blur-sm shadow-inner rounded-md text-xs focus:ring-1 focus:ring-indigo-400 focus:bg-white/80 transition-all outline-none" placeholder="e.g. Ph.D, M.Sc, B.Sc" />
                              </div>
                              <div>
                                 <label className="block text-xs font-bold text-slate-700 mb-1">Date Employed</label>
                                 <input type="date" value={entryDateEmployed} onChange={(e) => setEntryDateEmployed(e.target.value)} className="w-full px-3 py-2 bg-white/50 border border-white/60 backdrop-blur-sm shadow-inner rounded-md text-xs focus:ring-1 focus:ring-indigo-400 focus:bg-white/80 transition-all outline-none" />
                              </div>
                              <div>
                                 <label className="block text-xs font-bold text-slate-700 mb-1">Employment Status</label>
                                 <select value={entryEmploymentStatus} onChange={(e) => setEntryEmploymentStatus(e.target.value as any)} className="w-full px-3 py-2 bg-white/70 border border-white/60 backdrop-blur-sm shadow-inner rounded-md text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-400 focus:bg-white outline-none">
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                    <option value="On Leave">On Leave</option>
                                    <option value="Retired">Retired</option>
                                 </select>
                              </div>
                              <div className="md:col-span-2">
                                 <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                                 <input type="tel" value={entryPhone} onChange={(e) => setEntryPhone(e.target.value)} className="w-full px-3 py-2 bg-white/50 border border-white/60 backdrop-blur-sm shadow-inner rounded-md text-xs focus:ring-1 focus:ring-indigo-400 focus:bg-white/80 transition-all outline-none" placeholder="e.g. +234 803 000 0000" />
                              </div>
                            </div>

                            {/* Photo Upload Section */}
                            <div className="p-4 bg-white/40 rounded-2xl border border-white/60">
                               <label className="block text-xs font-bold text-slate-700 mb-2">Passport Photo</label>
                               <div className="flex items-center gap-4">
                                  {entryPhoto ? (
                                     <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-indigo-300 shadow-sm shrink-0 relative group">
                                        <img src={entryPhoto} alt="Preview" className="w-full h-full object-cover" />
                                        <button 
                                          type="button" 
                                          onClick={() => setEntryPhoto('')}
                                          className="absolute inset-0 bg-red-600/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-bold transition-opacity"
                                        >
                                          Remove
                                        </button>
                                     </div>
                                  ) : (
                                     <div className="w-14 h-14 rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-slate-400 bg-slate-50 shrink-0">
                                       <ImageIcon className="w-6 h-6" />
                                     </div>
                                  )}
                                  <div className="flex-1">
                                    <input 
                                      type="file" 
                                      accept="image/*" 
                                      onChange={handlePhotoUpload} 
                                      className="w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" 
                                    />
                                    <span className="text-[10px] text-slate-400 mt-1 block">JPG, PNG, WEBP. Automatically optimized for database.</span>
                                  </div>
                               </div>
                            </div>

                            {/* Official Document Upload Section */}
                            <div className="p-4 bg-white/40 rounded-2xl border border-white/60">
                               <label className="block text-xs font-bold text-slate-700 mb-2">Official Documents / CV / Credentials</label>
                               {entryDocumentUrl ? (
                                 <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                                   <div className="flex items-center gap-2.5 overflow-hidden">
                                     <FileText className="w-6 h-6 text-indigo-600 shrink-0" />
                                     <div className="truncate">
                                       <div className="text-xs font-bold text-slate-800 truncate">{entryDocumentName || 'Attached_Document.pdf'}</div>
                                       <div className="text-[10px] text-slate-500">{entryDocumentSize || 'Verified Document'}</div>
                                     </div>
                                   </div>
                                   <div className="flex items-center gap-2 shrink-0">
                                     <a 
                                       href={entryDocumentUrl} 
                                       download={entryDocumentName || "document.pdf"}
                                       target="_blank" 
                                       rel="noreferrer" 
                                       className="text-[11px] font-bold text-indigo-600 hover:underline px-2 py-1"
                                     >
                                       View
                                     </a>
                                     <button 
                                       type="button" 
                                       onClick={() => {
                                         setEntryDocumentUrl('');
                                         setEntryDocumentName('');
                                         setEntryDocumentSize('');
                                       }}
                                       className="text-[11px] font-bold text-rose-600 hover:text-rose-800 px-2 py-1"
                                     >
                                       Remove
                                     </button>
                                   </div>
                                 </div>
                               ) : (
                                 <div>
                                   <input 
                                     type="file" 
                                     accept=".pdf,.doc,.docx,image/*" 
                                     onChange={handleDocumentUpload} 
                                     className="w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" 
                                   />
                                   <span className="text-[10px] text-slate-400 mt-1 block">Supports PDF, DOC, DOCX, or images (Max 750 KB for database storage).</span>
                                   {uploadError && <div className="text-[11px] text-rose-600 font-semibold mt-1">{uploadError}</div>}
                                 </div>
                               )}
                            </div>

                            {/* Registration Initial Status Option */}
                            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200 flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-700">Initial Approval Status:</span>
                              <div className="flex items-center gap-2">
                                <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                                  <input 
                                    type="radio" 
                                    name="adminAction" 
                                    value="Approved" 
                                    checked={adminEntryAction === 'Approved'} 
                                    onChange={() => setAdminEntryAction('Approved')} 
                                    className="text-emerald-600"
                                  />
                                  <span className="text-emerald-700">Approve Immediately</span>
                                </label>
                                <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer ml-3">
                                  <input 
                                    type="radio" 
                                    name="adminAction" 
                                    value="Pending" 
                                    checked={adminEntryAction === 'Pending'} 
                                    onChange={() => setAdminEntryAction('Pending')} 
                                    className="text-amber-600"
                                  />
                                  <span className="text-amber-700">Save as Pending</span>
                                </label>
                              </div>
                            </div>

                            <button 
                              onClick={handleManualEntry} 
                              disabled={!entryName.trim() || !entryEmail.trim() || !entryDept.trim() || !entryFaculty.trim() || !entryRank.trim()} 
                              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all px-6 py-2.5 rounded-xl text-xs font-bold hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50"
                            >
                              Add Staff Member
                            </button>
                         </div>
                      </div>

                      {/* Universal Lecturer Roster Upload (PDF & Excel) */}
                      <div className="pt-2">
                         <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-indigo-600" />
                              Universal Lecturer Roster Upload (PDF & Excel)
                            </h3>
                            {rosterPreviewList.length > 0 && (
                              <button
                                onClick={() => setShowRosterModal(true)}
                                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-lg border border-indigo-200 transition-colors flex items-center gap-1"
                              >
                                View Extracted ({rosterPreviewList.length}) <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                         </div>
                         <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                            Upload a general PDF roster or Excel spreadsheet (<span className="font-mono font-semibold">.xlsx, .xls, .csv</span>). The system will automatically understand and map each lecturer, their faculty, department, rank, status, and credentials.
                         </p>

                         {isParsingRoster ? (
                           <div className="p-6 rounded-2xl bg-indigo-50/80 border border-indigo-200 flex flex-col items-center justify-center text-center animate-pulse">
                              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
                              <div className="text-xs font-bold text-indigo-900">{rosterParseMessage}</div>
                              <div className="text-[10px] text-indigo-600/80 mt-1">Reading and understanding lecturer structure for ABSU...</div>
                           </div>
                         ) : (
                           <div className="p-4 bg-white/40 border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-2xl transition-all">
                              <div className="flex flex-col sm:flex-row items-center gap-4">
                                <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl shrink-0">
                                   <FileSpreadsheet className="w-6 h-6" />
                                </div>
                                <div className="flex-1 w-full">
                                  <input 
                                    type="file" 
                                    accept=".pdf,.xlsx,.xls,.csv" 
                                    onChange={handleRosterFileUpload} 
                                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer" 
                                  />
                                  <div className="flex flex-wrap items-center gap-2 mt-2">
                                     <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">PDF Documents</span>
                                     <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">Excel (.xlsx, .xls)</span>
                                     <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">CSV</span>
                                     <span className="text-[10px] text-emerald-700 font-bold ml-auto flex items-center gap-1">
                                       <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Auto-maps 14 ABSU Faculties
                                     </span>
                                  </div>
                                </div>
                              </div>
                           </div>
                         )}
                      </div>
                   </div>
                ) : myStaffRecord && !isEditingMyDetails ? (
                  /* READ-ONLY PROFILE VIEW FOR STAFF MEMBER WITH CLEAR STATUS FEEDBACK */
                  <div className="space-y-6">
                    {/* Status Feedback Banner */}
                    {getNormalizedStatus(myStaffRecord) === 'Approved' && (
                      <div className="p-5 rounded-2xl border bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-sm flex items-start gap-4">
                        <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">STATUS: APPROVED & VERIFIED</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-800">Verified Staff Member</span>
                          </div>
                          <p className="text-xs text-emerald-900/90 mt-1">
                            Your staff profile has been verified and approved by the University Administration! You are officially confirmed in the Abia State University database.
                          </p>
                          {myStaffRecord.reviewedBy && (
                            <p className="text-[10px] text-emerald-700 font-mono mt-1">
                              Approved by: {myStaffRecord.reviewedBy}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {getNormalizedStatus(myStaffRecord) === 'Pending' && (
                      <div className="p-5 rounded-2xl border bg-amber-50/90 border-amber-300 text-amber-950 shadow-sm flex items-start gap-4">
                        <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700 shrink-0">
                          <Clock className="w-6 h-6 animate-pulse" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">STATUS: PENDING REVIEW</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">Awaiting Admin Action</span>
                          </div>
                          <p className="text-xs text-amber-900/90 mt-1">
                            Your staff details have been submitted and sent to the Administrator. It is currently awaiting administrative approval or rejection. Once the admin takes action, real-time feedback will appear right here.
                          </p>
                          <div className="mt-3 flex items-center gap-2">
                            <button
                              onClick={() => setIsEditingMyDetails(true)}
                              className="text-xs font-bold text-amber-950 bg-amber-200/90 hover:bg-amber-300 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1 shadow-sm"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Edit My Submitted Details
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {getNormalizedStatus(myStaffRecord) === 'Rejected' && (
                      <div className="p-5 rounded-2xl border bg-rose-50/90 border-rose-300 text-rose-950 shadow-sm flex items-start gap-4">
                        <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700 shrink-0">
                          <XCircle className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">STATUS: REJECTED</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-200 text-rose-800">Action Required</span>
                          </div>
                          <p className="text-xs text-rose-900/90 mt-1">
                            Your submission was reviewed and marked as Rejected by the administration. Please check the feedback note below, update your details or credentials, and resubmit.
                          </p>
                          {myStaffRecord.rejectionReason && (
                            <div className="mt-2 p-2.5 bg-white/80 rounded-xl border border-rose-200 text-xs font-semibold text-rose-900">
                              Admin Feedback: {myStaffRecord.rejectionReason}
                            </div>
                          )}
                          <div className="mt-3">
                            <button
                              onClick={() => setIsEditingMyDetails(true)}
                              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-md transition-all flex items-center gap-1.5"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Edit & Resubmit Application
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Profile Card */}
                    <div className="flex flex-col sm:flex-row gap-6 items-start bg-white/40 p-5 rounded-2xl border border-white/60">
                      <div className="flex flex-col items-center shrink-0 w-full sm:w-40">
                        <div className="w-32 h-32 rounded-2xl overflow-hidden shadow-md border-2 border-white bg-indigo-50 flex items-center justify-center">
                          {myStaffRecord.photoUrl ? (
                            <img src={myStaffRecord.photoUrl} alt={myStaffRecord.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-indigo-400">
                              <UserIcon className="w-12 h-12 mb-1" />
                              <span className="text-[9px] font-bold uppercase">No Photo</span>
                            </div>
                          )}
                        </div>
                        <div className="mt-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            getNormalizedStatus(myStaffRecord) === 'Approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            getNormalizedStatus(myStaffRecord) === 'Rejected' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                            'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {getNormalizedStatus(myStaffRecord)}
                          </span>
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full">
                        <div className="bg-white/60 p-3 rounded-xl border border-white/70">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Full Name</span>
                          <span className="text-xs font-bold text-slate-800">{myStaffRecord.name}</span>
                        </div>
                        <div className="bg-white/60 p-3 rounded-xl border border-white/70">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Official Email</span>
                          <span className="text-xs font-medium text-slate-800 font-mono">{myStaffRecord.email}</span>
                        </div>
                        <div className="bg-white/60 p-3 rounded-xl border border-white/70">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Department</span>
                          <span className="text-xs font-semibold text-slate-800">{myStaffRecord.department || 'N/A'}</span>
                        </div>
                        <div className="bg-white/60 p-3 rounded-xl border border-white/70">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Faculty</span>
                          <span className="text-xs font-semibold text-slate-800">{myStaffRecord.faculty || 'N/A'}</span>
                        </div>
                        <div className="bg-white/60 p-3 rounded-xl border border-white/70">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Rank / Designation</span>
                          <span className="text-xs font-bold text-indigo-900">{myStaffRecord.rank || 'Staff'}</span>
                        </div>
                        <div className="bg-white/60 p-3 rounded-xl border border-white/70">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Qualification</span>
                          <span className="text-xs font-semibold text-slate-800">{myStaffRecord.qualification || 'N/A'}</span>
                        </div>
                        <div className="bg-white/60 p-3 rounded-xl border border-white/70">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Date Employed</span>
                          <span className="text-xs font-semibold text-slate-800">{myStaffRecord.dateEmployed || 'N/A'}</span>
                        </div>
                        <div className="bg-white/60 p-3 rounded-xl border border-white/70">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Phone Number</span>
                          <span className="text-xs font-semibold text-slate-800 font-mono">{myStaffRecord.phone || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Uploaded Document / CV Card */}
                    {(myStaffRecord.documentUrl || myStaffRecord.cvUrl) && (
                      <div className="p-4 bg-white/50 rounded-2xl border border-white/70 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Uploaded Document / Credentials</span>
                            <span className="text-xs font-bold text-slate-800">{myStaffRecord.documentName || 'Official_Document.pdf'}</span>
                            {myStaffRecord.documentSize && <span className="text-[10px] text-slate-500 ml-2">({myStaffRecord.documentSize})</span>}
                          </div>
                        </div>
                        <a 
                          href={myStaffRecord.documentUrl || myStaffRecord.cvUrl} 
                          download={myStaffRecord.documentName || "document.pdf"}
                          target="_blank" 
                          rel="noreferrer" 
                          className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-sm transition-all"
                        >
                          <Download className="w-3.5 h-3.5" /> Download Document
                        </a>
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <button 
                        onClick={() => setIsEditingMyDetails(true)} 
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-6 rounded-xl shadow-md transition-all flex items-center gap-2"
                      >
                        <Edit3 className="w-4 h-4" /> Edit My Details
                      </button>
                    </div>
                  </div>
                ) : (
                  /* STAFF EDITING OR INITIAL SUBMISSION FORM */
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500 mb-4">
                      {isEditingMyDetails 
                        ? 'Update your details below and submit. Your record will be sent to the administrator with status PENDING review.' 
                        : 'Please submit your official details below. Once sent, it will be marked as PENDING and submitted to the admin for approval.'}
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                         <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                         <input type="text" value={entryName} onChange={(e) => setEntryName(e.target.value)} className="w-full px-3 py-2 bg-white/50 border border-white/60 backdrop-blur-sm shadow-inner rounded-md text-xs focus:ring-1 focus:ring-indigo-400 focus:bg-white/80 transition-all outline-none" placeholder="e.g. Dr. Ngozi Eze" />
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                         <input type="email" value={entryEmail || user?.email || ''} onChange={(e) => setEntryEmail(e.target.value)} disabled={!isAdmin} className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-md text-xs text-slate-600 outline-none cursor-not-allowed" placeholder="e.g. yourname@absu.edu.ng" />
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-slate-700 mb-1">Faculty *</label>
                         <select 
                           value={entryFaculty} 
                           onChange={(e) => handleFacultyChange(e.target.value)} 
                           className="w-full px-3 py-2 bg-white/70 border border-white/60 backdrop-blur-sm shadow-inner rounded-md text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-400 focus:bg-white outline-none"
                         >
                            <option value="">-- Select Faculty --</option>
                            {FACULTIES_DATA.map(f => (
                              <option key={f.faculty} value={f.faculty}>{f.faculty}</option>
                            ))}
                         </select>
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-slate-700 mb-1">Department *</label>
                         <select 
                           value={entryDept} 
                           onChange={(e) => setEntryDept(e.target.value)} 
                           disabled={!entryFaculty}
                           className="w-full px-3 py-2 bg-white/70 border border-white/60 backdrop-blur-sm shadow-inner rounded-md text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-400 focus:bg-white outline-none disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed"
                         >
                            <option value="">{entryFaculty ? '-- Select Department --' : '-- Choose Faculty First --'}</option>
                            {getDepartmentsForFaculty(entryFaculty).map(dept => (
                              <option key={dept} value={dept}>{dept}</option>
                            ))}
                         </select>
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-slate-700 mb-1">Rank *</label>
                         <input type="text" value={entryRank} onChange={(e) => setEntryRank(e.target.value)} className="w-full px-3 py-2 bg-white/50 border border-white/60 backdrop-blur-sm shadow-inner rounded-md text-xs focus:ring-1 focus:ring-indigo-400 focus:bg-white/80 transition-all outline-none" placeholder="e.g. Senior Lecturer / Professor" />
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-slate-700 mb-1">Qualification</label>
                         <input type="text" value={entryQualification} onChange={(e) => setEntryQualification(e.target.value)} className="w-full px-3 py-2 bg-white/50 border border-white/60 backdrop-blur-sm shadow-inner rounded-md text-xs focus:ring-1 focus:ring-indigo-400 focus:bg-white/80 transition-all outline-none" placeholder="e.g. Ph.D, M.Sc, B.Sc" />
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-slate-700 mb-1">Date Employed</label>
                         <input type="date" value={entryDateEmployed} onChange={(e) => setEntryDateEmployed(e.target.value)} className="w-full px-3 py-2 bg-white/50 border border-white/60 backdrop-blur-sm shadow-inner rounded-md text-xs focus:ring-1 focus:ring-indigo-400 focus:bg-white/80 transition-all outline-none" />
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-slate-700 mb-1">Employment Status</label>
                         <select value={entryEmploymentStatus} onChange={(e) => setEntryEmploymentStatus(e.target.value as any)} className="w-full px-3 py-2 bg-white/70 border border-white/60 backdrop-blur-sm shadow-inner rounded-md text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-400 focus:bg-white outline-none">
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                            <option value="On Leave">On Leave</option>
                            <option value="Retired">Retired</option>
                         </select>
                      </div>
                      <div className="md:col-span-2">
                         <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                         <input type="tel" value={entryPhone} onChange={(e) => setEntryPhone(e.target.value)} className="w-full px-3 py-2 bg-white/50 border border-white/60 backdrop-blur-sm shadow-inner rounded-md text-xs focus:ring-1 focus:ring-indigo-400 focus:bg-white/80 transition-all outline-none" placeholder="e.g. +234 803 000 0000" />
                      </div>
                    </div>
                    
                    {/* Passport Photo Upload */}
                    <div className="p-4 bg-white/40 rounded-2xl border border-white/60 mt-2">
                       <label className="block text-xs font-bold text-slate-700 mb-2">Passport Photo</label>
                       <div className="flex items-center gap-4">
                          {entryPhoto ? (
                             <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-indigo-300 shadow-sm shrink-0 relative group">
                                <img src={entryPhoto} alt="Preview" className="w-full h-full object-cover" />
                                <button 
                                  type="button" 
                                  onClick={() => setEntryPhoto('')}
                                  className="absolute inset-0 bg-red-600/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-bold transition-opacity"
                                >
                                  Remove
                                </button>
                             </div>
                          ) : (
                             <div className="w-14 h-14 rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-slate-400 bg-slate-50 shrink-0">
                               <ImageIcon className="w-6 h-6" />
                             </div>
                          )}
                          <div className="flex-1">
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={handlePhotoUpload} 
                              className="w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" 
                            />
                            <span className="text-[10px] text-slate-400 mt-1 block">JPG, PNG, WEBP. Automatically optimized.</span>
                          </div>
                       </div>
                    </div>

                    {/* Official Document Upload */}
                    <div className="p-4 bg-white/40 rounded-2xl border border-white/60 mt-2">
                       <label className="block text-xs font-bold text-slate-700 mb-2">Upload Document / CV / Appointment Letter</label>
                       {entryDocumentUrl ? (
                         <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                           <div className="flex items-center gap-2.5 overflow-hidden">
                             <FileText className="w-6 h-6 text-indigo-600 shrink-0" />
                             <div className="truncate">
                               <div className="text-xs font-bold text-slate-800 truncate">{entryDocumentName || 'Attached_Document.pdf'}</div>
                               <div className="text-[10px] text-slate-500">{entryDocumentSize || 'Attached'}</div>
                             </div>
                           </div>
                           <div className="flex items-center gap-2 shrink-0">
                             <a 
                               href={entryDocumentUrl} 
                               download={entryDocumentName || "document.pdf"}
                               target="_blank" 
                               rel="noreferrer" 
                               className="text-[11px] font-bold text-indigo-600 hover:underline px-2 py-1"
                             >
                               View
                             </a>
                             <button 
                               type="button" 
                               onClick={() => {
                                 setEntryDocumentUrl('');
                                 setEntryDocumentName('');
                                 setEntryDocumentSize('');
                               }}
                               className="text-[11px] font-bold text-rose-600 hover:text-rose-800 px-2 py-1"
                             >
                               Remove
                             </button>
                           </div>
                         </div>
                       ) : (
                         <div>
                           <input 
                             type="file" 
                             accept=".pdf,.doc,.docx,image/*" 
                             onChange={handleDocumentUpload} 
                             className="w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" 
                           />
                           <span className="text-[10px] text-slate-400 mt-1 block">Supports PDF, DOC, DOCX, or scanned images (Max 750 KB).</span>
                           {uploadError && <div className="text-[11px] text-rose-600 font-semibold mt-1">{uploadError}</div>}
                         </div>
                       )}
                    </div>

                    <div className="flex items-center gap-3 pt-3">
                      <button 
                        onClick={handleManualEntry} 
                        disabled={!entryName.trim() || !entryDept.trim() || !entryFaculty.trim() || !entryRank.trim()} 
                        className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all px-6 py-2.5 rounded-xl text-xs font-bold hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        <Clock className="w-4 h-4" />
                        {isEditingMyDetails ? "Submit Changes to Admin (Set to Pending)" : "Submit Data to Admin (Pending)"}
                      </button>
                      {isEditingMyDetails && (
                        <button 
                          onClick={() => setIsEditingMyDetails(false)} 
                          className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                )}
             </div>
            </div>
          </motion.div>
        )}

        {/* NEWS FEED VIEW */}
        {activeView === 'news' && (
          <motion.div
            key="news"
            initial={{ opacity: 0, y: 15, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -15, filter: 'blur(8px)' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
          >
            <div className="flex-1 p-0 overflow-auto relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-slate-800 to-black z-0 pointer-events-none">
                 <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=2070&auto=format&fit=crop')] opacity-10 bg-cover bg-center mix-blend-overlay"></div>
              </div>
              
              <div className="relative z-10 min-h-full p-8 md:p-12 max-w-5xl mx-auto flex flex-col">
                  <div className="flex items-center justify-between mb-12">
                     <div>
                        <h2 className="text-4xl font-display text-white mb-2 tracking-tight">University Announcements</h2>
                        <p className="text-indigo-200 text-sm font-light">Stay inspired. Stay informed.</p>
                     </div>
                     <button 
                        onClick={() => {
                          setIsAudioMuted(!isAudioMuted);
                          if (!isAudioMuted && audioRef.current) audioRef.current.pause();
                          if (isAudioMuted && audioRef.current) audioRef.current.play();
                        }}
                        className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20 transition-all shadow-lg"
                        title={isAudioMuted ? "Unmute Ambient Audio" : "Mute Ambient Audio"}
                     >
                        {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                     </button>
                  </div>

                  {isAdmin && (
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-6 mb-12">
                      <h3 className="text-sm font-bold text-white mb-4 tracking-wide uppercase">Publish News</h3>
                      <div className="space-y-4">
                        <input 
                          type="text" 
                          placeholder="Headline" 
                          className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-sm text-white placeholder-white/40 focus:ring-1 focus:ring-white/30 outline-none transition-all"
                          value={newsTitle}
                          onChange={(e) => setNewsTitle(e.target.value)}
                        />
                        <textarea 
                          placeholder="Craft an announcement..." 
                          className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-sm text-white placeholder-white/40 focus:ring-1 focus:ring-white/30 outline-none h-32 resize-none transition-all font-display"
                          value={newsContent}
                          onChange={(e) => setNewsContent(e.target.value)}
                        />
                        <div className="flex justify-end">
                          <button 
                            onClick={handleAddNews}
                            disabled={!newsTitle.trim() || !newsContent.trim()}
                            className="bg-gradient-to-r from-white to-indigo-50 text-indigo-900 px-6 py-3 rounded-full text-xs font-bold hover:scale-105 disabled:opacity-50 shadow-[0_4px_12px_rgba(255,255,255,0.3)] transition-all tracking-wide"
                          >
                            {editingNewsId ? 'Update Globally' : 'Publish Globally'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {newsList.length === 0 ? (
                    <div className="text-center text-white/50 text-sm font-display italic py-12">No announcements posted yet.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {newsList.map(news => (
                        <div key={news.id} className="bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 hover:border-white/20 rounded-2xl p-6 transition-all shadow-xl group">
                             <div className="flex items-center justify-between mb-4">
                               <div className="flex items-center gap-3">
                                   <span className="px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-200 text-[10px] font-bold tracking-widest uppercase border border-indigo-500/30">Dispatch</span>
                                   <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">
                                     {news.createdAt?.toDate ? news.createdAt.toDate().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : 'Just now'}
                                   </span>
                               </div>
                               {isAdmin && (
                                 <div className="flex gap-2">
                                   <button onClick={() => handleEditNews(news)} className="text-[10px] text-indigo-300 hover:text-white uppercase tracking-wider font-bold">Edit</button>
                                   <button onClick={() => handleDeleteNews(news.id)} className="text-[10px] text-red-400 hover:text-red-300 uppercase tracking-wider font-bold">Delete</button>
                                 </div>
                               )}
                             </div>
                             <h3 className="text-xl font-display text-white mb-3 leading-snug group-hover:text-indigo-200 transition-all duration-300">{news.title}</h3>
                             <p className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed font-light">{news.content}</p>
                             <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center">
                               <span className="text-[10px] text-white/40 uppercase tracking-widest">Authored by</span>
                               <span className="text-xs text-white/90 font-medium">{news.author}</span>
                             </div>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            </div>
          </motion.div>
        )}

        {/* MESSAGES & CHAT VIEW */}
        {activeView === 'messages' && (
          <motion.div
            key="messages"
            initial={{ opacity: 0, y: 15, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -15, filter: 'blur(8px)' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
          >
            <div className="flex-1 p-6 flex flex-col overflow-hidden h-full">
              <div className="flex-1 glass-panel rounded-[2rem] flex overflow-hidden min-h-[400px]">
                  <div className="w-1/3 border-r border-white/50 bg-white/30 backdrop-blur-md">
                     <div className="p-4 border-b border-slate-200 font-bold text-xs text-slate-700">Recent Channels</div>
                     <div className="p-3 border-b border-slate-100 flex items-center gap-3 cursor-pointer bg-white">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">ABSU</div>
                        <div className="flex-1 overflow-hidden">
                            <div className="text-xs font-bold truncate">University Staff Forum</div>
                            <div className="text-[10px] text-slate-500 truncate">Official announcement channel</div>
                        </div>
                     </div>
                  </div>
                  <div className="flex-1 flex flex-col bg-white">
                     <div className="p-4 border-b border-slate-200 font-bold text-xs text-slate-700 flex items-center justify-between">
                       <span>Staff Portal Chat</span>
                       <span className="text-[10px] font-normal text-slate-400">Live Communication</span>
                     </div>
                     <div className="flex-1 p-4 flex flex-col gap-3 overflow-auto">
                        {chatMessages.length === 0 && (
                          <div className="text-center text-slate-400 text-xs py-4">No messages yet. Start the conversation!</div>
                        )}
                        {chatMessages.map(msg => {
                          const isMe = msg.senderEmail === user?.email;
                          return (
                            <div key={msg.id} className={`max-w-[80%] flex flex-col gap-1 ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] text-slate-400 font-bold">{msg.senderName}</span>
                                {isAdmin && (
                                  <button onClick={() => handleDeleteMessage(msg.id)} className="text-[9px] text-red-500 hover:text-red-700">Delete</button>
                                )}
                              </div>
                              <div className={`px-3 py-2 rounded-lg text-xs text-slate-800 ${isMe ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md' : 'glass-panel text-slate-800 shadow-sm border border-white/50'}`}>
                                {msg.text}
                              </div>
                            </div>
                          );
                        })}
                     </div>
                     {user ? (
                        <div className="p-3 border-t border-slate-200 flex gap-2">
                            <input 
                              type="text" 
                              placeholder="Type a message..." 
                              className="flex-1 px-4 py-2.5 bg-white/50 backdrop-blur-sm rounded-full text-xs border border-white/40 outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white/80 shadow-inner transition-all" 
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            />
                            <button onClick={handleSendMessage} className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-5 py-2.5 rounded-full text-xs font-bold hover:from-indigo-600 hover:to-purple-700 hover:shadow-lg disabled:opacity-50 hover:-translate-y-0.5 transition-all" disabled={!newMessage.trim()}>Send</button>
                        </div>
                     ) : (
                        <div className="p-3 border-t border-slate-200 text-center text-xs text-slate-500">
                          Please sign in to participate in the chat.
                        </div>
                     )}
                  </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* SETTINGS VIEW */}
        {activeView === 'settings' && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 15, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -15, filter: 'blur(8px)' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
          >
            <div className="flex-1 p-6 overflow-auto">
              <div className="glass-panel rounded-[2rem] max-w-2xl mx-auto">
                  <div className="p-5 border-b border-slate-200">
                      <h3 className="text-sm font-bold text-slate-800">System Settings</h3>
                      <p className="text-xs text-slate-500">Manage application preferences and configurations.</p>
                  </div>
                  <div className="p-5 space-y-4">
                      <div>
                         <label className="block text-xs font-bold text-slate-700 mb-1">Institution Name</label>
                         <input type="text" value="Abia State University" disabled className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-md text-xs text-slate-500 cursor-not-allowed outline-none" />
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-slate-700 mb-1">Admin Approval Notifications</label>
                         <div className="flex items-center gap-2 mt-2">
                             <input type="checkbox" defaultChecked className="rounded border-slate-300 text-indigo-600" />
                             <span className="text-xs text-slate-600">Notify Admin when a staff member submits details (Pending status)</span>
                         </div>
                      </div>
                      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                         {settingsSaved && <span className="text-emerald-600 text-xs font-bold flex items-center gap-1"><Check className="w-4 h-4"/> Saved!</span>}
                         <button onClick={handleSaveSettings} className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white shadow-md hover:-translate-y-0.5 text-xs font-bold py-2 px-4 rounded-xl transition-all duration-300">Save Changes</button>
                      </div>
                  </div>
              </div>
            </div>
          </motion.div>
        )}

        </AnimatePresence>
      
        {/* REVIEW STAFF MODAL (With direct Approve and Reject buttons) */}
        <AnimatePresence>
          {reviewStaff && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => setReviewStaff(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="glass-panel w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
              >
                <div className="bg-white/60 p-5 border-b border-white/50 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-slate-800">Staff Profile Review</h3>
                    {getNormalizedStatus(reviewStaff) === 'Approved' && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Approved
                      </span>
                    )}
                    {getNormalizedStatus(reviewStaff) === 'Pending' && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                        Pending Review
                      </span>
                    )}
                    {getNormalizedStatus(reviewStaff) === 'Rejected' && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        Rejected
                      </span>
                    )}
                  </div>
                  <button onClick={() => setReviewStaff(null)} className="p-2 bg-white/50 hover:bg-white rounded-full text-slate-500 hover:text-slate-800 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                  {/* Status Banner in Modal */}
                  {getNormalizedStatus(reviewStaff) === 'Pending' && (
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-900">
                      <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                      <div className="text-xs">
                        <span className="font-bold">Awaiting Decision:</span> This staff member submitted their details and is waiting for your approval or rejection.
                      </div>
                    </div>
                  )}

                  {getNormalizedStatus(reviewStaff) === 'Rejected' && reviewStaff.rejectionReason && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-900">
                      <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      <div className="text-xs">
                        <span className="font-bold">Rejection Feedback:</span> {reviewStaff.rejectionReason}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Photo section */}
                    <div className="flex flex-col items-center shrink-0">
                      <div className="w-32 h-32 rounded-2xl overflow-hidden shadow-lg border-2 border-white bg-white/50 flex items-center justify-center relative">
                        {reviewStaff.photoUrl ? (
                          <img src={reviewStaff.photoUrl} alt={reviewStaff.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-indigo-300">
                            <UserIcon className="w-12 h-12 mb-2" />
                            <span className="text-[10px] font-bold uppercase">No Photo</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-3 text-center">
                        <span className="text-xs font-bold text-slate-700">{reviewStaff.rank || 'Staff'}</span>
                      </div>
                    </div>
                    
                    {/* Details section */}
                    <div className="flex-1 space-y-4">
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">{reviewStaff.name}</h2>
                        <p className="text-indigo-600 font-mono text-xs mt-0.5">{reviewStaff.email || 'No email provided'}</p>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-white/50 p-2.5 rounded-xl border border-white/60">
                          <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Department</p>
                          <p className="text-xs font-semibold text-slate-800">{reviewStaff.department || 'N/A'}</p>
                        </div>
                        <div className="bg-white/50 p-2.5 rounded-xl border border-white/60">
                          <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Faculty</p>
                          <p className="text-xs font-semibold text-slate-800">{reviewStaff.faculty || 'N/A'}</p>
                        </div>
                        <div className="bg-white/50 p-2.5 rounded-xl border border-white/60">
                          <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Qualification</p>
                          <p className="text-xs font-semibold text-slate-800">{reviewStaff.qualification || 'N/A'}</p>
                        </div>
                        <div className="bg-white/50 p-2.5 rounded-xl border border-white/60">
                          <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Date Employed</p>
                          <p className="text-xs font-semibold text-slate-800">{reviewStaff.dateEmployed || 'N/A'}</p>
                        </div>
                        <div className="bg-white/50 p-2.5 rounded-xl border border-white/60">
                          <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Employment Status</p>
                          <p className="text-xs font-semibold text-slate-800">{reviewStaff.employmentStatus || 'Active'}</p>
                        </div>
                        <div className="bg-white/50 p-2.5 rounded-xl border border-white/60">
                          <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Phone Number</p>
                          <p className="text-xs font-semibold text-slate-800 font-mono">{reviewStaff.phone || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Attached Official Document */}
                  {(reviewStaff.documentUrl || reviewStaff.cvUrl) ? (
                    <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-indigo-900 block">Uploaded Document Credentials</span>
                          <span className="text-xs font-bold text-slate-900">{reviewStaff.documentName || 'Staff_CV_Credentials.pdf'}</span>
                          {reviewStaff.documentSize && <span className="text-[10px] text-slate-500 ml-2">({reviewStaff.documentSize})</span>}
                        </div>
                      </div>
                      <a 
                        href={reviewStaff.documentUrl || reviewStaff.cvUrl} 
                        download={reviewStaff.documentName || "staff_document.pdf"}
                        target="_blank" 
                        rel="noreferrer" 
                        className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-sm transition-all"
                      >
                        <Download className="w-3.5 h-3.5" /> Download / View Document
                      </a>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
                      No document or CV was uploaded for this staff member.
                    </div>
                  )}
                </div>

                {/* Modal Admin Actions Footer: Dedicated Reject & Approve Buttons */}
                {isAdmin && (
                  <div className="p-4 bg-white/80 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
                    <span className="text-xs font-medium text-slate-500">Admin Actions:</span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setRejectModalStaff(reviewStaff);
                          setRejectionReasonInput('');
                        }}
                        className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2.5 px-5 rounded-xl shadow-md transition-all flex items-center gap-1.5"
                      >
                        <X className="w-4 h-4" /> Reject Record
                      </button>
                      <button 
                        onClick={() => handleApproveStaff(reviewStaff.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-6 rounded-xl shadow-md transition-all flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" /> Approve Record
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* REJECT CONFIRMATION MODAL */}
        <AnimatePresence>
          {rejectModalStaff && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setRejectModalStaff(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-rose-200"
              >
                <div className="flex items-center gap-3 text-rose-600 mb-3">
                  <div className="p-2 rounded-xl bg-rose-100">
                    <XCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Reject Staff Submission</h3>
                    <p className="text-xs text-slate-500">{rejectModalStaff.name} ({rejectModalStaff.email})</p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 mb-3">
                  Are you sure you want to reject this staff record? The system will strictly mark it as <span className="font-bold text-rose-600">Rejected</span> and notify the staff member on their portal.
                </p>

                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Rejection (Optional note for staff):</label>
                  <textarea 
                    value={rejectionReasonInput}
                    onChange={(e) => setRejectionReasonInput(e.target.value)}
                    placeholder="e.g. Please upload a clear copy of your degree certificate or correct department."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-400 h-20 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button 
                    onClick={() => setRejectModalStaff(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => handleRejectStaff(rejectModalStaff.id, rejectionReasonInput)}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2 px-5 rounded-xl shadow-md transition-all flex items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" /> Confirm Reject
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ROSTER BATCH IMPORT PREVIEW & CONFIRMATION MODAL */}
        <AnimatePresence>
          {showRosterModal && rosterPreviewList.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => !isImportingBatch && setShowRosterModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-indigo-100 flex flex-col max-h-[88vh] overflow-hidden"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 p-5 text-white flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md">
                      <Sparkles className="w-6 h-6 text-indigo-300" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold flex items-center gap-2">
                        Roster Ingestion Preview
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                          {rosterPreviewList.length} Lecturers Extracted
                        </span>
                      </h3>
                      <p className="text-xs text-indigo-200/80 font-mono mt-0.5 truncate max-w-md">
                        Source: {rosterFileName || 'Uploaded Document'}
                      </p>
                    </div>
                  </div>
                  {!isImportingBatch && (
                    <button 
                      onClick={() => setShowRosterModal(false)}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Sub-bar with Options */}
                <div className="bg-slate-50 border-b border-slate-200 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700">Import Target Status:</span>
                    <button
                      type="button"
                      onClick={() => setRosterTargetStatus('Approved')}
                      className={`px-3 py-1 rounded-xl font-bold transition-all ${
                        rosterTargetStatus === 'Approved'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Approved Directly
                    </button>
                    <button
                      type="button"
                      onClick={() => setRosterTargetStatus('Pending')}
                      className={`px-3 py-1 rounded-xl font-bold transition-all ${
                        rosterTargetStatus === 'Pending'
                          ? 'bg-amber-500 text-slate-900 shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Pending Review
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const allSelected = rosterPreviewList.every(r => r.selected);
                        setRosterPreviewList(prev => prev.map(r => ({ ...r, selected: !allSelected })));
                      }}
                      className="text-indigo-600 hover:underline font-bold"
                    >
                      {rosterPreviewList.every(r => r.selected) ? 'Deselect All' : 'Select All'}
                    </button>
                    <span className="text-slate-400">|</span>
                    <span className="font-semibold text-slate-600">
                      {rosterPreviewList.filter(r => r.selected).length} of {rosterPreviewList.length} Selected
                    </span>
                  </div>
                </div>

                {/* Table View */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 text-[10px] font-bold text-slate-700 uppercase border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2.5 w-10 text-center">Sel</th>
                          <th className="px-4 py-2.5">Lecturer</th>
                          <th className="px-4 py-2.5">Faculty</th>
                          <th className="px-4 py-2.5">Department</th>
                          <th className="px-4 py-2.5">Rank & Qual</th>
                          <th className="px-4 py-2.5">Document / Notes</th>
                          <th className="px-3 py-2.5 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {rosterPreviewList.map((lecturer) => (
                          <tr key={lecturer.id} className={`hover:bg-slate-50 transition-colors ${!lecturer.selected ? 'opacity-50 bg-slate-50/50' : ''}`}>
                            <td className="px-3 py-2.5 text-center">
                              <input 
                                type="checkbox"
                                checked={!!lecturer.selected}
                                onChange={() => {
                                  setRosterPreviewList(prev => prev.map(r => r.id === lecturer.id ? { ...r, selected: !r.selected } : r));
                                }}
                                className="rounded border-slate-300 text-indigo-600 cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="font-bold text-slate-900">{lecturer.name}</div>
                              <div className="text-[10px] text-slate-500 font-mono truncate">{lecturer.email}</div>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 inline-block max-w-[170px] truncate">
                                {lecturer.faculty}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="font-semibold text-slate-800">{lecturer.department}</div>
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <div className="font-bold text-indigo-900">{lecturer.rank}</div>
                              <div className="text-[10px] text-slate-500">{lecturer.qualification}</div>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="text-[10px] text-slate-600 flex items-center gap-1">
                                <FileText className="w-3 h-3 text-indigo-500 shrink-0" />
                                <span className="truncate max-w-[130px]">{lecturer.documentInfo || 'Verified Roster Record'}</span>
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setRosterPreviewList(prev => prev.filter(r => r.id !== lecturer.id));
                                }}
                                className="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50"
                                title="Remove this record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer with Progress & Import Action */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                  {isImportingBatch ? (
                    <div className="w-full flex items-center gap-3">
                      <Loader2 className="w-5 h-5 text-indigo-600 animate-spin shrink-0" />
                      <div className="flex-1">
                        <div className="text-xs font-bold text-slate-800">
                          Importing to Firestore: {importProgress.current} / {importProgress.total} records...
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-1">
                          <div 
                            className="bg-indigo-600 h-full transition-all duration-300"
                            style={{ width: `${importProgress.total ? (importProgress.current / importProgress.total) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="text-xs text-slate-500">
                        Ready to import <span className="font-bold text-slate-800">{rosterPreviewList.filter(r => r.selected).length}</span> lecturers into ABSU database with status <span className="font-bold text-indigo-600">"{rosterTargetStatus}"</span>.
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                          type="button"
                          onClick={() => setShowRosterModal(false)}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                          Close / Keep Staged
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmBatchImport}
                          disabled={rosterPreviewList.filter(r => r.selected).length === 0}
                          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold py-2.5 px-6 rounded-xl shadow-md transition-all flex items-center gap-2"
                        >
                          <Check className="w-4 h-4" /> Import Selected to Database
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* DELETE ALL DETAILS CONFIRMATION MODAL */}
        <AnimatePresence>
          {showDeleteAllModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm"
              onClick={() => !isDeletingAll && setShowDeleteAllModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-rose-200 relative overflow-hidden"
              >
                {/* Decorative alert stripe */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-rose-500 to-red-600"></div>

                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 rounded-2xl bg-rose-100 text-rose-600 shrink-0 border border-rose-200 shadow-sm">
                    <AlertTriangle className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                      CRITICAL DATABASE ACTION
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-1">Delete All Details</h3>
                    <p className="text-xs text-slate-500">
                      Permanently wipe all uploaded data across all 14 faculties
                    </p>
                  </div>
                  {!isDeletingAll && (
                    <button 
                      onClick={() => setShowDeleteAllModal(false)} 
                      className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Question Callout */}
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 mb-4">
                  <div className="text-sm font-black text-rose-900 mb-1 flex items-center gap-1.5">
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    Would you like to delete everything?
                  </div>
                  <p className="text-xs text-rose-900/90 leading-relaxed">
                    This operation will delete every single data that is currently uploaded on the website. Once confirmed, every staff profile, faculty designation, uploaded credentials, and document will be permanently purged from the database.
                  </p>
                </div>

                {/* Details Breakdown */}
                <div className="space-y-2 mb-5 text-xs text-slate-600">
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-medium text-slate-700 flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-500" /> Staff Profiles & Records:
                    </span>
                    <span className="font-bold text-rose-600">{staffList.length} records</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-medium text-slate-700 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-500" /> Uploaded Documents & CVs:
                    </span>
                    <span className="font-bold text-rose-600">
                      {staffList.filter(s => s.documentUrl || s.cvUrl).length} attached files
                    </span>
                  </div>
                  {rosterPreviewList.length > 0 && (
                    <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="font-medium text-slate-700 flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-slate-500" /> Staged Roster Imports:
                      </span>
                      <span className="font-bold text-rose-600">{rosterPreviewList.length} staged rows</span>
                    </div>
                  )}

                  {/* Optional checkbox to also purge news and messages */}
                  <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={includeNewsAndMessages} 
                      onChange={(e) => setIncludeNewsAndMessages(e.target.checked)}
                      className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                    <span className="text-[11px] font-medium text-slate-700">
                      Also delete all News Announcements ({newsList.length}) and Chat Messages ({chatMessages.length})
                    </span>
                  </label>
                </div>

                {/* Progress State or Action Buttons */}
                {isDeletingAll ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <Loader2 className="w-4 h-4 text-rose-600 animate-spin" />
                      Deleting all data from Firestore: {deleteProgress.current} / {deleteProgress.total} records...
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-rose-600 h-full transition-all duration-300"
                        style={{ width: `${deleteProgress.total ? (deleteProgress.current / deleteProgress.total) * 100 : 50}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 text-right">Please wait while database is being cleared...</span>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowDeleteAllModal(false)}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors text-center"
                    >
                      No, Keep Data
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteAllDetails}
                      className="w-full sm:w-auto bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
                    >
                      <Trash2 className="w-4 h-4" /> Yes, Delete Everything
                    </button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}
