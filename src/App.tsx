import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Database, LayoutDashboard, Users, Rss, MessageSquare, Settings, Search, Download, CheckCircle, Clock, Check, ChevronRight, LogIn, UserPlus, Upload, Volume2, VolumeX, Image as ImageIcon, X, User as UserIcon, Edit3, ShieldAlert } from 'lucide-react';
import { auth, db } from './firebase';
import { onAuthStateChanged, User, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from 'firebase/auth';
import { collection, query, onSnapshot, addDoc, serverTimestamp, orderBy, doc, updateDoc, deleteDoc, setDoc, where } from 'firebase/firestore';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

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
  const [searchQuery, setSearchQuery] = useState('');
  
  // Registration / Entry form states
  const [entryName, setEntryName] = useState('');
  const [entryEmail, setEntryEmail] = useState('');
  const [entryFaculty, setEntryFaculty] = useState('');
  const [entryDept, setEntryDept] = useState('');
  const [entryRank, setEntryRank] = useState('');
  const [entryQualification, setEntryQualification] = useState('');
  const [entryDateEmployed, setEntryDateEmployed] = useState('');
  const [entryStatus, setEntryStatus] = useState<'Active' | 'Inactive' | 'On Leave' | 'Retired'>('Active');
  const [entryPhone, setEntryPhone] = useState('');
  const [entryPhoto, setEntryPhoto] = useState('');
  const [reviewStaff, setReviewStaff] = useState<any | null>(null);

  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const isSuperAdmin = user?.email?.toLowerCase() === 'brossj50@gmail.com' || user?.email?.toLowerCase() === 'ogungbadekehinde19@gmail.com';
  const isAdmin = isSuperAdmin || isAdminRole;

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
      setAuthError('Password reset email sent! Check your inbox.');
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
        
        // Save additional user data to firestore
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

  const handleGoogleAuth = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      // Ensure user document exists if they are signing up via Google
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name: userCredential.user.displayName || 'Google User',
        email: userCredential.user.email,
        createdAt: serverTimestamp()
      }, { merge: true });
    } catch (error: any) {
      console.error("Google Auth failed", error);
      setAuthError(error.message || 'Google Authentication failed');
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
      } else {
        await addDoc(collection(db, 'news'), {
          title: newsTitle,
          content: newsContent,
          author: user?.displayName || user?.email || 'Guest User',
          createdAt: serverTimestamp()
        });
      }
      setNewsTitle('');
      setNewsContent('');
    } catch(err) {
      console.error(err);
    }
  };

  const handleDeleteNews = async (newsId: string) => {
    if (!window.confirm("Are you sure you want to delete this news post?")) return;
    try {
      await deleteDoc(doc(db, 'news', newsId));
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
    } catch(err) {
      console.error(err);
    }
  };

  const handleRemoveAdmin = async (staffId: string) => {
    try {
      await updateDoc(doc(db, 'staff', staffId), { role: 'user' });
    } catch(err) {
      console.error(err);
    }
  };

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
      s.status || 'Active',
      s.phone || 'N/A'
    ]);
    autoTable(doc, {
      head: [['Full Name', 'Email', 'Department', 'Faculty', 'Rank', 'Qualification', 'Date Employed', 'Status', 'Phone Number']],
      body: tableData,
      startY: 22,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 58, 138] }
    });
    doc.save('absu_staff_directory.pdf');
  };

  const handleExportExcel = () => {
    const wsData = filteredStaffList.map(s => ({
      'Full Name': s.name || '',
      'Email': s.email || '',
      'Department': s.department || '',
      'Faculty': s.faculty || '',
      'Rank': s.rank || s.role || 'Staff',
      'Qualification': s.qualification || '',
      'Date Employed': s.dateEmployed || '',
      'Status': s.status || 'Active',
      'Phone Number': s.phone || ''
    }));
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Staff Directory");
    XLSX.writeFile(wb, "absu_staff_directory.xlsx");
  };

  const filteredStaffList = staffList.filter(staff => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      staff.name?.toLowerCase().includes(q) ||
      staff.email?.toLowerCase().includes(q) ||
      staff.department?.toLowerCase().includes(q) ||
      staff.faculty?.toLowerCase().includes(q) ||
      staff.rank?.toLowerCase().includes(q) ||
      staff.qualification?.toLowerCase().includes(q) ||
      staff.status?.toLowerCase().includes(q) ||
      staff.phone?.toLowerCase().includes(q)
    );
  });

  const handleAcceptStaff = async (staffId: string) => {
    try {
      await updateDoc(doc(db, 'staff', staffId), { verificationStatus: 'Approved' });
    } catch(err) { console.error(err); }
  };
  const handleRejectStaff = async (staffId: string) => {
    try {
      await updateDoc(doc(db, 'staff', staffId), { verificationStatus: 'Rejected' });
    } catch(err) { console.error(err); }
  };

  const handleMakeAdmin = async (staffId: string) => {
    try {
      await updateDoc(doc(db, 'staff', staffId), {
        role: 'admin'
      });
    } catch(err) {
      console.error(err);
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (!window.confirm("Are you sure you want to delete this staff record?")) return;
    try {
      await deleteDoc(doc(db, 'staff', staffId));
    } catch(err) {
      console.error("Error deleting staff:", err);
      alert("Failed to delete staff record.");
    }
  };

  
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
          setEntryStatus(myStaffRecord.status || 'Active');
          setEntryPhone(myStaffRecord.phone || '');
          setEntryPhoto(myStaffRecord.photoUrl || '');
        } else {
          setEntryEmail(user.email || '');
          setEntryName(user.displayName || '');
        }
      }
    }
  }, [activeView, isAdmin, user, myStaffRecord]);

  const handleManualEntry = async () => {
    const finalEmail = (!isAdmin && user?.email) ? user.email.toLowerCase().trim() : (entryEmail.trim().toLowerCase() || user?.email?.toLowerCase() || '');
    if (!entryName.trim() || !finalEmail.trim() || !entryDept.trim() || !entryFaculty.trim() || !entryRank.trim()) {
      alert("Please fill in the required fields: Full Name, Email, Department, Faculty, and Rank.");
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
        status: entryStatus || 'Active',
        phone: entryPhone.trim(),
        photoUrl: entryPhoto,
        userId: user?.uid || '',
      };

      if (!isAdmin && user?.email) {
        if (myStaffRecord) {
          await updateDoc(doc(db, 'staff', myStaffRecord.id), {
            ...staffData,
            verificationStatus: myStaffRecord.verificationStatus === 'Rejected' ? 'Submitted' : (myStaffRecord.verificationStatus || 'Submitted'),
            updatedAt: serverTimestamp()
          });
          setIsEditingMyDetails(false);
          alert("Your details have been updated successfully!");
          return;
        }
      }

      await addDoc(collection(db, 'staff'), {
        ...staffData,
        role: 'user',
        verificationStatus: isAdmin ? 'Approved' : 'Submitted',
        createdAt: serverTimestamp(),
      });
      
      if (!isAdmin) {
        setIsEditingMyDetails(false);
        alert("Your details have been submitted successfully!");
      } else {
        alert("Staff member registered successfully!");
      }

      setEntryName('');
      setEntryEmail('');
      setEntryFaculty('');
      setEntryDept('');
      setEntryRank('');
      setEntryQualification('');
      setEntryDateEmployed('');
      setEntryStatus('Active');
      setEntryPhone('');
      setEntryPhoto('');
    } catch(err) {
      console.error(err);
      alert("An error occurred while saving the details.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // For PDFs/Docs, don't try to resize
    if (!file.type.startsWith('image/')) {
       const reader = new FileReader();
       reader.onload = (event) => setter(event.target?.result as string);
       reader.readAsDataURL(file);
       return;
    }

    // For images, resize to prevent exceeding 1MB
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        setter(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      for (let i = 1; i < lines.length; i++) { // skip header
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(',').map(p => p.trim());
        const [name, email, dept, faculty, rank, qualification, dateEmployed, status, phone] = parts;
        if (name) {
          await addDoc(collection(db, 'staff'), {
             name: name || '',
             email: email || '',
             department: dept || 'General',
             faculty: faculty || '',
             rank: rank || 'Staff',
             qualification: qualification || '',
             dateEmployed: dateEmployed || '',
             status: (['Active', 'Inactive', 'On Leave', 'Retired'].includes(status) ? status : 'Active'),
             phone: phone || '',
             role: 'user',
             verificationStatus: 'Approved',
             createdAt: serverTimestamp()
          });
        }
      }
      alert("CSV data uploaded successfully!");
    };
    reader.readAsText(file);
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
    return <div className="min-h-screen flex items-center justify-center bg-artistic-mesh p-4">Loading...</div>;
  }

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
          
          {authError && <div className="mb-4 p-2 bg-red-50 text-red-600 text-xs rounded border border-red-100">{authError}</div>}
          
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
              onClick={handleGoogleAuth}
              className="w-full glass-panel hover:bg-white/40 text-slate-700 font-bold py-3 px-4 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-white/60 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
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
              </button>
              <button onClick={() => setActiveView('directory')} className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-all duration-300 ${activeView === 'directory' ? 'text-indigo-300 bg-white/10 border-r-4 border-indigo-400 shadow-[inset_4px_0_12px_rgba(255,255,255,0.05)]' : 'text-slate-400 hover:text-white border-r-4 border-transparent'}`}>
                <Users className="w-4 h-4" /> Staff Directory
              </button>
              <button onClick={() => setActiveView('entry')} className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-all duration-300 ${activeView === 'entry' ? 'text-indigo-300 bg-white/10 border-r-4 border-indigo-400 shadow-[inset_4px_0_12px_rgba(255,255,255,0.05)]' : 'text-slate-400 hover:text-white border-r-4 border-transparent'}`}>
                <UserPlus className="w-4 h-4" /> Add Staff
              </button>
            </>
          ) : (
            <button onClick={() => setActiveView('entry')} className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-all duration-300 ${activeView === 'entry' ? 'text-indigo-300 bg-white/10 border-r-4 border-indigo-400 shadow-[inset_4px_0_12px_rgba(255,255,255,0.05)]' : 'text-slate-400 hover:text-white border-r-4 border-transparent'}`}>
              <UserIcon className="w-4 h-4" /> My Staff Profile
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
            {activeView === 'directory' && 'Staff Directory'}
            {activeView === 'entry' && (isAdmin ? 'Staff Management Entry' : 'My Staff Profile')}
            {activeView === 'news' && 'News Feed'}
            {activeView === 'messages' && 'Messages & Chat'}
            {activeView === 'settings' && 'System Settings'}
          </h1>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <>
                <div className="relative">
                  <input type="text" placeholder="Search records..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-4 py-2 bg-white/50 backdrop-blur-sm border border-white/40 rounded-full text-xs w-72 focus:ring-2 focus:ring-indigo-400 focus:bg-white/80 outline-none shadow-inner transition-all" />
                  <Search className="w-4 h-4 absolute left-3 top-2 text-indigo-400" />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleExportPDF} className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-[0_4px_12px_rgba(225,29,72,0.3)] hover:-translate-y-0.5 text-xs font-bold py-1.5 px-3 rounded-full transition-all duration-300 flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5" /> PDF
                  </button>
                  <button onClick={handleExportExcel} className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)] hover:-translate-y-0.5 text-xs font-bold py-1.5 px-3 rounded-full transition-all duration-300 flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5" /> Excel
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <AnimatePresence mode="wait">

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
            {/* Top Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass-panel p-6 rounded-3xl">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Staff (DB)</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900">{filteredStaffList.length}</span>
                  <span className="text-emerald-500 text-xs font-bold">+Live</span>
                </div>
                <div className="mt-3 h-1 w-full bg-white/40 rounded-full overflow-hidden shadow-inner">
                  <div className="h-full bg-gradient-to-r from-indigo-400 to-purple-400 w-[100%]"></div>
                </div>
              </div>
              <div className="glass-panel p-6 rounded-3xl">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Pending Approval</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900">{staffList.filter(s => s.status === 'Submitted' || s.status === 'Draft').length}</span>
                  <span className="text-amber-500 text-xs font-bold">Action Req.</span>
                </div>
                <div className="mt-3 h-1 w-full bg-white/40 rounded-full overflow-hidden shadow-inner">
                  <div className="h-full bg-amber-500" style={{ width: `${(staffList.filter(s => s.status !== 'Approved').length / Math.max(staffList.length, 1)) * 100}%`}}></div>
                </div>
              </div>
              <div className="glass-panel p-6 rounded-3xl">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Departments</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900">{Object.keys(departmentCounts).length}</span>
                  <span className="text-slate-400 text-xs">Active units</span>
                </div>
                <div className="mt-3 h-1 w-full bg-white/40 rounded-full overflow-hidden shadow-inner">
                  <div className="h-full bg-indigo-500 w-[100%]"></div>
                </div>
              </div>
              <div className="glass-panel p-6 rounded-3xl">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Faculties</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900">{Object.keys(facultyCounts).length}</span>
                  <span className="text-indigo-500 text-xs font-bold">Recorded</span>
                </div>
                <div className="mt-3 h-1 w-full bg-white/40 rounded-full overflow-hidden shadow-inner">
                  <div className="h-full bg-purple-500 w-[100%]"></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {/* Pie Chart */}
              <div className="glass-panel p-6 rounded-[2rem] border border-white/60 shadow-lg flex flex-col transition-transform hover:-translate-y-1 duration-300">
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
            </div>

            {/* Table */}
            <div className="col-span-12 glass-panel rounded-[2rem] overflow-hidden mt-6">
              <div className="bg-white/40 backdrop-blur-sm border-b border-white/50 px-5 py-3 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Live Staff Registrations (Firebase)</h3>
                <button onClick={() => setActiveView('directory')} className="text-[10px] font-bold text-indigo-600 hover:underline">View Full Directory</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-white/40 backdrop-blur-sm text-[10px] font-bold text-indigo-900 uppercase border-b border-white/40">
                    <tr>
                      <th className="px-5 py-3 whitespace-nowrap">Staff Member</th>
                      <th className="px-5 py-3 whitespace-nowrap">Department & Faculty</th>
                      <th className="px-5 py-3 whitespace-nowrap">Rank & Qualification</th>
                      <th className="px-5 py-3 whitespace-nowrap">Date Employed</th>
                      <th className="px-5 py-3 whitespace-nowrap">Status</th>
                      <th className="px-5 py-3 whitespace-nowrap">Phone</th>
                      <th className="px-5 py-3 text-right whitespace-nowrap">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStaffList.length === 0 ? (
                       <tr><td colSpan={7} className="px-5 py-4 text-center text-xs text-slate-500">No staff records found.</td></tr>
                    ) : (
                      filteredStaffList.slice(0, 5).map((staff) => (
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
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            staff.status === 'Active' || staff.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            staff.status === 'Inactive' ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                            staff.status === 'On Leave' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                            staff.status === 'Retired' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                            'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}>
                            {['Active', 'Inactive', 'On Leave', 'Retired'].includes(staff.status) ? staff.status : (staff.status || 'Active')}
                          </span>
                          {staff.verificationStatus === 'Submitted' && (
                            <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-2.5 text-slate-600 whitespace-nowrap font-mono text-[11px]">
                          {staff.phone || 'N/A'}
                        </td>
                        <td className="px-5 py-2.5 text-right whitespace-nowrap">
                          {isSuperAdmin && staff.role !== "admin" && (
                            <button onClick={() => handleMakeAdmin(staff.id)} className="text-emerald-600 hover:text-emerald-800 font-bold px-2 py-1 mr-1 border border-emerald-200 rounded text-[10px]">Make Admin</button>
                          )}
                          {isSuperAdmin && staff.role === "admin" && staff.email !== user?.email && (
                            <button onClick={() => handleRemoveAdmin(staff.id)} className="text-amber-600 hover:text-amber-800 font-bold px-2 py-1 mr-1 border border-amber-200 rounded text-[10px]">Remove Admin</button>
                          )}
                          <button onClick={() => setReviewStaff(staff)} className="text-indigo-600 hover:text-indigo-800 font-bold px-2 py-1">Review</button>
                          {isAdmin && (staff.verificationStatus === "Submitted" || staff.status === "Submitted") && (
                            <>
                              <button onClick={() => handleAcceptStaff(staff.id)} className="text-emerald-600 hover:text-emerald-800 font-bold px-2 py-1 ml-1 border border-emerald-200 rounded text-[10px]">Accept</button>
                              <button onClick={() => handleRejectStaff(staff.id)} className="text-rose-600 hover:text-rose-800 font-bold px-2 py-1 ml-1 border border-rose-200 rounded text-[10px]">Reject</button>
                            </>
                          )}
                          {isAdmin && (
                            <button onClick={() => handleDeleteStaff(staff.id)} className="text-red-500 hover:text-red-700 font-bold px-2 py-1 ml-1 text-[10px] border border-red-200 rounded uppercase tracking-wider">Delete</button>
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
                <div className="bg-white/40 backdrop-blur-sm border-b border-white/50 px-5 py-3 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Full Staff Directory</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-white/40 backdrop-blur-sm text-[10px] font-bold text-indigo-900 uppercase border-b border-white/40">
                      <tr>
                        <th className="px-5 py-3 whitespace-nowrap">Staff Member</th>
                        <th className="px-5 py-3 whitespace-nowrap">Department & Faculty</th>
                        <th className="px-5 py-3 whitespace-nowrap">Rank & Qualification</th>
                        <th className="px-5 py-3 whitespace-nowrap">Date Employed</th>
                        <th className="px-5 py-3 whitespace-nowrap">Status</th>
                        <th className="px-5 py-3 whitespace-nowrap">Phone</th>
                        <th className="px-5 py-3 text-right whitespace-nowrap">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStaffList.length === 0 ? (
                         <tr><td colSpan={7} className="px-5 py-4 text-center text-xs text-slate-500">No live data yet. Staff registered through the mobile app will appear here.</td></tr>
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
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              staff.status === 'Active' || staff.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                              staff.status === 'Inactive' ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                              staff.status === 'On Leave' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                              staff.status === 'Retired' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                              'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}>
                              {['Active', 'Inactive', 'On Leave', 'Retired'].includes(staff.status) ? staff.status : (staff.status || 'Active')}
                            </span>
                            {staff.verificationStatus === 'Submitted' && (
                              <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-2.5 text-slate-600 whitespace-nowrap font-mono text-[11px]">
                            {staff.phone || 'N/A'}
                          </td>
                          <td className="px-5 py-2.5 text-right whitespace-nowrap">
                            {isSuperAdmin && staff.role !== "admin" && (
                              <button onClick={() => handleMakeAdmin(staff.id)} className="text-emerald-600 hover:text-emerald-800 font-bold px-2 py-1 mr-1 border border-emerald-200 rounded text-[10px]">Make Admin</button>
                            )}
                            {isSuperAdmin && staff.role === "admin" && staff.email !== user?.email && (
                              <button onClick={() => handleRemoveAdmin(staff.id)} className="text-amber-600 hover:text-amber-800 font-bold px-2 py-1 mr-1 border border-amber-200 rounded text-[10px]">Remove Admin</button>
                            )}
                            <button onClick={() => setReviewStaff(staff)} className="text-indigo-600 hover:text-indigo-800 font-bold px-2 py-1">Review</button>
                            {isAdmin && (staff.verificationStatus === "Submitted" || staff.status === "Submitted") && (
                              <>
                                <button onClick={() => handleAcceptStaff(staff.id)} className="text-emerald-600 hover:text-emerald-800 font-bold px-2 py-1 ml-1 border border-emerald-200 rounded text-[10px]">Accept</button>
                                <button onClick={() => handleRejectStaff(staff.id)} className="text-rose-600 hover:text-rose-800 font-bold px-2 py-1 ml-1 border border-rose-200 rounded text-[10px]">Reject</button>
                              </>
                            )}
                            {isAdmin && (
                              <button onClick={() => handleDeleteStaff(staff.id)} className="text-red-500 hover:text-red-700 font-bold px-2 py-1 ml-1 text-[10px] border border-red-200 rounded uppercase tracking-wider">Delete</button>
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
                     <div className="p-4 border-b border-slate-200 font-bold text-xs text-slate-700">Recent Chats</div>
                     <div className="p-3 border-b border-slate-100 flex items-center gap-3 cursor-pointer bg-white">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">HR</div>
                        <div className="flex-1 overflow-hidden">
                            <div className="text-xs font-bold truncate">HR Department</div>
                            <div className="text-[10px] text-slate-500 truncate">Please review the new policy.</div>
                        </div>
                     </div>
                  </div>
                  <div className="flex-1 flex flex-col bg-white">
                     <div className="p-4 border-b border-slate-200 font-bold text-xs text-slate-700">Company Chat</div>
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
                      <p className="text-xs text-slate-500">Manage your application preferences and configurations.</p>
                  </div>
                  <div className="p-5 space-y-4">
                      <div>
                         <label className="block text-xs font-bold text-slate-700 mb-1">Institution Name</label>
                         <input type="text" value="Abia State University" disabled className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-md text-xs text-slate-500 cursor-not-allowed outline-none" />
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-slate-700 mb-1">Admin Email Notifications</label>
                         <div className="flex items-center gap-2 mt-2">
                             <input type="checkbox" defaultChecked className="rounded border-slate-300 text-indigo-600" />
                             <span className="text-xs text-slate-600">Email me when a new staff member registers</span>
                         </div>
                      </div>
                      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                         {settingsSaved && <span className="text-emerald-600 text-xs font-bold flex items-center gap-1"><Check className="w-4 h-4"/> Saved!</span>}
                         <button onClick={handleSaveSettings} className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white shadow-[0_8px_16px_rgba(147,51,234,0.3)] hover:shadow-[0_12px_24px_rgba(147,51,234,0.4)] hover:-translate-y-0.5 text-white text-xs font-bold py-2 px-4 rounded shadow-sm transition-all duration-300">Save Changes</button>
                      </div>
                  </div>
              </div>
            </div>
          </motion.div>
        )}

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
                            : 'Fill in your official employment and personal credentials.')}
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
                
                {isAdmin ? (
                   <div className="space-y-8">
                      <div className="border-b border-slate-200 pb-8">
                         <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2"><UserPlus className="w-4 h-4 text-indigo-600" /> Manual Entry</h3>
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
                                 <label className="block text-xs font-bold text-slate-700 mb-1">Department *</label>
                                 <input type="text" value={entryDept} onChange={(e) => setEntryDept(e.target.value)} className="w-full px-3 py-2 bg-white/50 border border-white/60 backdrop-blur-sm shadow-inner rounded-md text-xs focus:ring-1 focus:ring-indigo-400 focus:bg-white/80 transition-all outline-none" placeholder="e.g. Computer Science" />
                              </div>
                              <div>
                                 <label className="block text-xs font-bold text-slate-700 mb-1">Faculty *</label>
                                 <input type="text" value={entryFaculty} onChange={(e) => setEntryFaculty(e.target.value)} className="w-full px-3 py-2 bg-white/50 border border-white/60 backdrop-blur-sm shadow-inner rounded-md text-xs focus:ring-1 focus:ring-indigo-400 focus:bg-white/80 transition-all outline-none" placeholder="e.g. Physical Sciences" />
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
                                 <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                                 <select value={entryStatus} onChange={(e) => setEntryStatus(e.target.value as any)} className="w-full px-3 py-2 bg-white/70 border border-white/60 backdrop-blur-sm shadow-inner rounded-md text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-400 focus:bg-white outline-none">
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
                            <div>
                               <label className="block text-xs font-bold text-slate-700 mb-1">Photo</label>
                               <div className="flex items-center gap-4">
                                  {entryPhoto && (
                                     <div className="w-12 h-12 rounded-xl overflow-hidden border border-indigo-200 shadow-sm shrink-0">
                                        <img src={entryPhoto} alt="Preview" className="w-full h-full object-cover" />
                                     </div>
                                  )}
                                  <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, setEntryPhoto)} className="w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                               </div>
                            </div>
                            <button onClick={handleManualEntry} disabled={!entryName.trim() || !entryEmail.trim() || !entryDept.trim() || !entryFaculty.trim() || !entryRank.trim()} className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all px-5 py-2.5 rounded-xl text-xs font-bold hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50">Add Staff Member</button>
                         </div>
                      </div>
                      <div>
                         <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2"><Upload className="w-4 h-4 text-indigo-600" /> Bulk Upload (CSV)</h3>
                         <p className="text-xs text-slate-500 mb-4">Upload a CSV file with columns: Name, Email, Department, Faculty, Rank, Qualification, Date Employed, Status, Phone.</p>
                         <input type="file" accept=".csv" onChange={handleCsvUpload} className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                      </div>
                   </div>
                ) : myStaffRecord && !isEditingMyDetails ? (
                  /* Read-Only Profile View for Staff Member */
                  <div className="space-y-6">
                    {/* Status Banner */}
                    <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
                      myStaffRecord.verificationStatus === 'Approved' ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' :
                      myStaffRecord.verificationStatus === 'Rejected' ? 'bg-rose-50/70 border-rose-200 text-rose-900' :
                      'bg-amber-50/70 border-amber-200 text-amber-900'
                    }`}>
                      {myStaffRecord.verificationStatus === 'Approved' ? (
                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : myStaffRecord.verificationStatus === 'Rejected' ? (
                        <X className="w-5 h-5 text-rose-600 shrink-0" />
                      ) : (
                        <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                      )}
                      <div className="text-xs">
                        <span className="font-bold">
                          {myStaffRecord.verificationStatus === 'Approved' ? 'Verified Staff Member' :
                           myStaffRecord.verificationStatus === 'Rejected' ? 'Application Flagged for Revision' :
                           'Submission Under Review'}
                        </span>
                        <p className="text-[11px] opacity-80 mt-0.5">
                          {myStaffRecord.verificationStatus === 'Approved' ? 'Your staff record has been validated and approved by University Administration.' :
                           myStaffRecord.verificationStatus === 'Rejected' ? 'Please review and update your information using the Edit button above.' :
                           'Your details have been submitted and are currently awaiting administrative confirmation.'}
                        </p>
                      </div>
                    </div>

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
                            myStaffRecord.status === 'Active' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            myStaffRecord.status === 'Inactive' ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                            myStaffRecord.status === 'On Leave' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                            'bg-purple-100 text-purple-800 border border-purple-200'
                          }`}>
                            {myStaffRecord.status || 'Active'}
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
                  /* Form for Submission or Editing */
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500 mb-4">
                      {isEditingMyDetails 
                        ? 'Update your details below. Once saved, your profile will be updated immediately.' 
                        : 'Please submit your official details below. Your submission will be recorded in the university database.'}
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
                         <label className="block text-xs font-bold text-slate-700 mb-1">Department *</label>
                         <input type="text" value={entryDept} onChange={(e) => setEntryDept(e.target.value)} className="w-full px-3 py-2 bg-white/50 border border-white/60 backdrop-blur-sm shadow-inner rounded-md text-xs focus:ring-1 focus:ring-indigo-400 focus:bg-white/80 transition-all outline-none" placeholder="e.g. Computer Science" />
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-slate-700 mb-1">Faculty *</label>
                         <input type="text" value={entryFaculty} onChange={(e) => setEntryFaculty(e.target.value)} className="w-full px-3 py-2 bg-white/50 border border-white/60 backdrop-blur-sm shadow-inner rounded-md text-xs focus:ring-1 focus:ring-indigo-400 focus:bg-white/80 transition-all outline-none" placeholder="e.g. Physical Sciences" />
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
                         <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                         <select value={entryStatus} onChange={(e) => setEntryStatus(e.target.value as any)} className="w-full px-3 py-2 bg-white/70 border border-white/60 backdrop-blur-sm shadow-inner rounded-md text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-400 focus:bg-white outline-none">
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
                    
                    <div>
                       <label className="block text-xs font-bold text-slate-700 mb-1">Photo</label>
                       <div className="flex items-center gap-4">
                          {entryPhoto && (
                             <div className="w-12 h-12 rounded-xl overflow-hidden border border-indigo-200 shadow-sm shrink-0">
                                <img src={entryPhoto} alt="Preview" className="w-full h-full object-cover" />
                             </div>
                          )}
                          <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, setEntryPhoto)} className="w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                       </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button onClick={handleManualEntry} disabled={!entryName.trim() || !entryDept.trim() || !entryFaculty.trim() || !entryRank.trim()} className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all px-6 py-2.5 rounded-xl text-xs font-bold hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50">
                        {isEditingMyDetails ? "Save Changes" : (myStaffRecord ? "Update My Details" : "Submit My Details")}
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
              {/* Immersive background layer */}
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
                      <h3 className="text-sm font-bold text-white mb-4 tracking-wide uppercase">Publish Excellence</h3>
                      <div className="space-y-4">
                        <input 
                          type="text" 
                          placeholder="Headline" 
                          className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-sm text-white placeholder-white/40 focus:ring-1 focus:ring-white/30 outline-none transition-all"
                          value={newsTitle}
                          onChange={(e) => setNewsTitle(e.target.value)}
                        />
                        <textarea 
                          placeholder="Craft an inspiring message..." 
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
                    <div className="text-center text-white/50 text-sm font-display italic py-12">The canvas is clear. Waiting for a spark of inspiration.</div>
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

        </AnimatePresence>
      
        {/* Review Staff Modal */}
        <AnimatePresence>
          {reviewStaff && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setReviewStaff(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="glass-panel w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
              >
                <div className="bg-white/40 p-6 border-b border-white/50 flex justify-between items-center shrink-0">
                  <h3 className="text-xl font-display font-bold text-slate-800">Staff Profile Details</h3>
                  <button onClick={() => setReviewStaff(null)} className="p-2 bg-white/50 hover:bg-white rounded-full text-slate-500 hover:text-slate-800 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-6 overflow-y-auto custom-scrollbar">
                  <div className="flex flex-col md:flex-row gap-8">
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
                      <div className="mt-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                          reviewStaff.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                          reviewStaff.status === 'Draft' ? 'bg-white/50 text-slate-600' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {reviewStaff.status}
                        </span>
                      </div>
                    </div>
                    
                    {/* Details section */}
                    <div className="flex-1 space-y-6">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900">{reviewStaff.name}</h2>
                        <p className="text-indigo-600 font-mono text-sm mt-0.5">{reviewStaff.email || 'No email provided'}</p>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-white/40 p-3 rounded-xl border border-white/50">
                          <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Department</p>
                          <p className="text-sm font-medium text-slate-800">{reviewStaff.department || 'N/A'}</p>
                        </div>
                        <div className="bg-white/40 p-3 rounded-xl border border-white/50">
                          <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Faculty</p>
                          <p className="text-sm font-medium text-slate-800">{reviewStaff.faculty || 'N/A'}</p>
                        </div>
                        <div className="bg-white/40 p-3 rounded-xl border border-white/50">
                          <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Rank</p>
                          <p className="text-sm font-medium text-slate-800">{reviewStaff.rank || reviewStaff.role || 'Staff'}</p>
                        </div>
                        <div className="bg-white/40 p-3 rounded-xl border border-white/50">
                          <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Qualification</p>
                          <p className="text-sm font-medium text-slate-800">{reviewStaff.qualification || 'N/A'}</p>
                        </div>
                        <div className="bg-white/40 p-3 rounded-xl border border-white/50">
                          <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Date Employed</p>
                          <p className="text-sm font-medium text-slate-800">{reviewStaff.dateEmployed || (reviewStaff.createdAt?.toDate ? reviewStaff.createdAt.toDate().toLocaleDateString() : 'N/A')}</p>
                        </div>
                        <div className="bg-white/40 p-3 rounded-xl border border-white/50">
                          <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Phone Number</p>
                          <p className="text-sm font-medium text-slate-800 font-mono">{reviewStaff.phone || 'N/A'}</p>
                        </div>
                      </div>
                      
                      {reviewStaff.address && (
                        <div className="bg-white/40 p-4 rounded-xl border border-white/50">
                          <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Residential Address</p>
                          <p className="text-sm text-slate-700 leading-relaxed">{reviewStaff.address}</p>
                        </div>
                      )}
                      
                      {reviewStaff.cvUrl && (
                        <div className="pt-4 border-t border-white/40">
                          <a href={reviewStaff.cvUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-bold py-2.5 px-6 rounded-full shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5">
                            <Download className="w-4 h-4" /> Download CV Document
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}
