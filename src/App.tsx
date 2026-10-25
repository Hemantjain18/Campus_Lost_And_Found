/**
 * CampusFind - University Lost & Found Portal
 * Full Interactive Frontend with Smart Matching Engine & Admin Dashboard
 */

import React, { useState, useMemo } from 'react';
import { 
  Search, PlusCircle, ShieldCheck, MapPin, Calendar, User as UserIcon, 
  CheckCircle2, XCircle, ArrowLeft, Filter, Tag, FileText, Check, 
  Sparkles, AlertCircle, RefreshCw, LogOut, ChevronRight, Copy
} from 'lucide-react';
import { Item, Claim, User, ItemType, ItemStatus, Category } from './types';
import { 
  INITIAL_ITEMS, INITIAL_CATEGORIES, INITIAL_CLAIMS, DEMO_USERS, 
  CAMPUS_LOCATIONS, calculateMatchScore, extractKeywords 
} from './data';
import { PROJECT_FILES } from './codeVault';

export default function App() {
  // Global Application State
  const [currentUser, setCurrentUser] = useState<User | null>(DEMO_USERS[1]); // Default to Alex Rivera (Student)
  const [currentView, setCurrentView] = useState<'home' | 'browse' | 'report' | 'detail' | 'my-posts' | 'admin' | 'auth' | 'vault'>('home');
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  
  // Data State
  const [items, setItems] = useState<Item[]>(INITIAL_ITEMS);
  const [claims, setClaims] = useState<Claim[]>(INITIAL_CLAIMS);
  const [categories] = useState<Category[]>(INITIAL_CATEGORIES);

  // Filters State
  const [filters, setFilters] = useState({
    type: '' as '' | ItemType,
    categoryId: '' as string,
    location: '',
    keyword: '',
    status: 'open' as '' | ItemStatus,
    startDate: '',
    endDate: ''
  });

  // Report Form State
  const [reportType, setReportType] = useState<ItemType>('lost');
  const [reportTitle, setReportTitle] = useState('');
  const [reportDesc, setReportDesc] = useState('');
  const [reportCategoryId, setReportCategoryId] = useState('7');
  const [reportLocation, setReportLocation] = useState('Main Library');
  const [reportSpecificLocation, setReportSpecificLocation] = useState('');
  const [reportDate, setReportDate] = useState('2026-10-08');
  const [reportContactEmail, setReportContactEmail] = useState(currentUser?.email || 'student@university.edu');
  const [reportContactPhone, setReportContactPhone] = useState('555-0142');
  const [reportImagePreview, setReportImagePreview] = useState<string | null>(null);

  // Claim Modal State
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimMessage, setClaimMessage] = useState('');
  const [claimProof, setClaimProof] = useState('');

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  // Vault Tab State
  const [activeVaultFile, setActiveVaultFile] = useState(PROJECT_FILES[1].name); // schema.sql
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  // Trigger Toast
  const triggerToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Switch Active User / Persona
  const switchUser = (role: 'student' | 'admin' | 'guest') => {
    if (role === 'student') {
      setCurrentUser(DEMO_USERS[1]);
      triggerToast('Switched to Student persona: Alex Rivera', 'info');
    } else if (role === 'admin') {
      setCurrentUser(DEMO_USERS[0]);
      triggerToast('Switched to Admin persona: Officer Marcus Vance', 'info');
    } else {
      setCurrentUser(null);
      triggerToast('Signed out (Browsing as Guest)', 'info');
    }
  };

  // Filtered Items for Browse View
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (filters.type && item.type !== filters.type) return false;
      if (filters.categoryId && item.categoryId.toString() !== filters.categoryId) return false;
      if (filters.location && item.location !== filters.location) return false;
      if (filters.status && item.status !== filters.status) return false;
      if (filters.startDate && item.dateOccurred < filters.startDate) return false;
      if (filters.endDate && item.dateOccurred > filters.endDate) return false;
      if (filters.keyword) {
        const q = filters.keyword.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesDesc = item.description.toLowerCase().includes(q);
        const matchesLoc = item.location.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesLoc) return false;
      }
      return true;
    });
  }, [items, filters]);

  // Selected Item
  const selectedItem = useMemo(() => {
    return items.find(i => i.id === selectedItemId) || null;
  }, [items, selectedItemId]);

  // Smart Matches for Selected Item
  const matches = useMemo(() => {
    if (!selectedItem) return [];
    const oppositeType = selectedItem.type === 'lost' ? 'found' : 'lost';
    const candidates = items.filter(i => i.type === oppositeType && i.id !== selectedItem.id && i.status === 'open');
    
    return candidates
      .map(c => calculateMatchScore(selectedItem, c))
      .filter(res => res.score >= 35)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }, [selectedItem, items]);

  // Admin Metrics
  const adminMetrics = useMemo(() => {
    const lostCount = items.filter(i => i.type === 'lost' && i.status === 'open').length;
    const foundCount = items.filter(i => i.type === 'found' && i.status === 'open').length;
    const resolvedCount = items.filter(i => i.status === 'resolved').length;
    const pendingClaims = claims.filter(c => c.status === 'pending').length;

    // Distribution by category
    const catCounts = categories.map(cat => ({
      categoryName: cat.name,
      count: items.filter(i => i.categoryId === cat.id).length
    })).sort((a, b) => b.count - a.count);

    return {
      lostCount,
      foundCount,
      resolvedCount,
      pendingClaims,
      catCounts
    };
  }, [items, claims, categories]);

  // Handle Item Submission
  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      triggerToast('Please sign in to submit a report', 'error');
      setCurrentView('auth');
      return;
    }

    const catObj = categories.find(c => c.id.toString() === reportCategoryId);
    const newItem: Item = {
      id: items.length + 1,
      userId: currentUser.id,
      categoryId: parseInt(reportCategoryId, 10),
      categoryName: catObj?.name || 'General Item',
      categorySlug: catObj?.slug || 'general',
      type: reportType,
      title: reportTitle.trim(),
      description: reportDesc.trim(),
      location: reportLocation,
      specificLocation: reportSpecificLocation.trim() || undefined,
      dateOccurred: reportDate,
      contactEmail: reportContactEmail,
      contactPhone: reportContactPhone || undefined,
      status: 'open',
      reporterName: currentUser.fullName,
      createdAt: new Date().toISOString(),
    };

    setItems([newItem, ...items]);
    triggerToast(`Successfully reported ${reportType.toUpperCase()} item!`, 'success');
    
    // Reset Form
    setReportTitle('');
    setReportDesc('');
    setReportSpecificLocation('');
    setReportImagePreview(null);

    // Navigate to Detail
    setSelectedItemId(newItem.id);
    setCurrentView('detail');
  };

  // Handle Claim Submission
  const handleClaimSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedItem) {
      triggerToast('Authentication required to submit claims', 'error');
      return;
    }

    if (selectedItem.userId === currentUser.id) {
      triggerToast('You cannot claim an item you reported yourself', 'error');
      return;
    }

    const newClaim: Claim = {
      id: claims.length + 1,
      itemId: selectedItem.id,
      itemTitle: selectedItem.title,
      itemType: selectedItem.type,
      claimerId: currentUser.id,
      claimerName: currentUser.fullName,
      claimerEmail: currentUser.email,
      message: claimMessage.trim(),
      proofDetails: claimProof.trim() || undefined,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    setClaims([newClaim, ...claims]);
    setIsClaimModalOpen(false);
    setClaimMessage('');
    setClaimProof('');
    triggerToast('Claim submitted for security review!', 'success');
  };

  // Admin Claim Approval/Rejection
  const handleAdminClaimAction = (claimId: number, newStatus: 'approved' | 'rejected') => {
    const claim = claims.find(c => c.id === claimId);
    if (!claim) return;

    setClaims(claims.map(c => c.id === claimId ? { ...c, status: newStatus } : c));
    
    // If approved, mark item as claimed
    if (newStatus === 'approved') {
      setItems(items.map(i => i.id === claim.itemId ? { ...i, status: 'claimed' } : i));
    }
    triggerToast(`Claim #${claimId} marked as ${newStatus}`, 'success');
  };

  // Mark Item as Resolved
  const handleResolveItem = (itemId: number) => {
    setItems(items.map(i => i.id === itemId ? { ...i, status: 'resolved' } : i));
    triggerToast('Item marked as resolved & reunified!', 'success');
  };

  // Delete Item
  const handleDeleteItem = (itemId: number) => {
    if (!confirm('Are you sure you want to remove this listing?')) return;
    setItems(items.filter(i => i.id !== itemId));
    triggerToast('Item removed from campus directory', 'info');
    if (currentView === 'detail' && selectedItemId === itemId) {
      setCurrentView('browse');
    }
  };

  // Copy code helper
  const handleCopyCode = (text: string, fileName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFile(fileName);
    triggerToast(`Copied ${fileName} to clipboard!`, 'success');
    setTimeout(() => setCopiedFile(null), 2000);
  };

  // Keywords preview for report form
  const extractedKeywords = useMemo(() => {
    return Array.from(extractKeywords(`${reportTitle} ${reportDesc}`)).slice(0, 6);
  }, [reportTitle, reportDesc]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      
      {/* ========================================================
          TOP NAVIGATION BAR (Strict 3-zone contract)
          ======================================================== */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setCurrentView('home')} 
              className="text-xl font-bold tracking-tight text-slate-900 hover:text-blue-600 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-sm">
                CF
              </div>
              CampusFind
            </button>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <button 
              onClick={() => setCurrentView('home')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${currentView === 'home' ? 'text-blue-600 font-semibold' : ''}`}
            >
              Home
            </button>
            <button 
              onClick={() => setCurrentView('browse')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${currentView === 'browse' ? 'text-blue-600 font-semibold' : ''}`}
            >
              Browse Catalog
            </button>
            <button 
              onClick={() => setCurrentView('report')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${currentView === 'report' ? 'text-blue-600 font-semibold' : ''}`}
            >
              Report Item
            </button>
            {currentUser && (
              <button 
                onClick={() => setCurrentView('my-posts')}
                className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${currentView === 'my-posts' ? 'text-blue-600 font-semibold' : ''}`}
              >
                My Posts
              </button>
            )}
            <button 
              onClick={() => setCurrentView('admin')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${currentView === 'admin' ? 'text-blue-600 font-semibold' : ''}`}
            >
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              Admin Console
            </button>
            <button 
              onClick={() => setCurrentView('vault')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1 text-slate-500 hover:text-blue-600 ${currentView === 'vault' ? 'text-blue-600 font-semibold' : ''}`}
            >
              <FileText className="w-3.5 h-3.5" />
              Code Vault
            </button>
          </nav>

          {/* Zone 3: Single Primary Action & Role Switcher */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Quick Demo Persona Switcher */}
            <div className="hidden sm:flex items-center bg-slate-100 rounded-lg p-1 text-xs font-medium">
              <button 
                onClick={() => switchUser('student')} 
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${currentUser?.role === 'student' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-900'}`}
                title="Log in as student Alex Rivera"
              >
                Student
              </button>
              <button 
                onClick={() => switchUser('admin')} 
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${currentUser?.role === 'admin' ? 'bg-white text-blue-700 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-900'}`}
                title="Log in as Campus Security Officer"
              >
                Admin
              </button>
              <button 
                onClick={() => switchUser('guest')} 
                className={`px-2 py-1 rounded-md transition-all cursor-pointer ${!currentUser ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-900'}`}
                title="Sign out"
              >
                Guest
              </button>
            </div>

            {currentUser ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700 hidden lg:inline">
                  {currentUser.fullName}
                </span>
                <button
                  onClick={() => switchUser('guest')}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setCurrentView('auth')}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer shadow-xs"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Toast Notification Container */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium text-white bg-slate-900 transition-all animate-fade-in">
          {toastType === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {toastType === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
          {toastType === 'info' && <Sparkles className="w-4 h-4 text-blue-400" />}
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ========================================================
            VIEW 1: HOME PAGE
            ======================================================== */}
        {currentView === 'home' && (
          <div className="space-y-10">
            {/* Hero Section */}
            <section className="relative rounded-2xl bg-gradient-to-b from-white to-slate-100/70 border border-slate-200/80 p-8 sm:p-12 text-center shadow-xs">
              <div className="max-w-2xl mx-auto space-y-4">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
                  Reuniting Campus With What Was Lost
                </h1>
                <p className="text-base sm:text-lg text-slate-600 font-normal">
                  The centralized, verified repository for student electronics, dorm keys, wallets, and lecture materials.
                </p>

                {/* Live Search Bar */}
                <div className="pt-2 flex gap-2 max-w-xl mx-auto">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text"
                      placeholder="Search items by keyword, brand, or location..."
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-xs"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setFilters(prev => ({ ...prev, keyword: (e.target as HTMLInputElement).value }));
                          setCurrentView('browse');
                        }
                      }}
                    />
                  </div>
                  <button 
                    onClick={() => setCurrentView('browse')}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg transition-colors cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    Search
                  </button>
                </div>

                {/* Quick Action Buttons */}
                <div className="pt-2 flex items-center justify-center gap-3">
                  <button 
                    onClick={() => { setReportType('lost'); setCurrentView('report'); }}
                    className="px-4 py-2 text-sm font-semibold bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <PlusCircle className="w-4 h-4 text-rose-500" />
                    Report Lost Item
                  </button>
                  <button 
                    onClick={() => { setReportType('found'); setCurrentView('report'); }}
                    className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <PlusCircle className="w-4 h-4 text-emerald-300" />
                    Report Found Item
                  </button>
                </div>
              </div>

              {/* Campus Real-Time Metrics Strip */}
              <div className="mt-10 pt-8 border-t border-slate-200/80 grid grid-cols-3 max-w-lg mx-auto text-center gap-4">
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
                    {items.filter(i => i.status === 'open').length}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Active Listings</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
                    {items.filter(i => i.status === 'resolved').length + 84}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Reunited Items</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-blue-600 tabular-nums">
                    84%
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Recovery Rate</div>
                </div>
              </div>
            </section>

            {/* Latest Items Grid Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    Latest Campus Reports
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Recent items turned in or reported missing in campus buildings
                  </p>
                </div>
                <button 
                  onClick={() => setCurrentView('browse')}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer flex items-center gap-1"
                >
                  View All ({items.length}) &rarr;
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {items.slice(0, 6).map(item => (
                  <ItemCard 
                    key={item.id} 
                    item={item} 
                    onSelect={() => { setSelectedItemId(item.id); setCurrentView('detail'); }} 
                  />
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ========================================================
            VIEW 2: BROWSE & FILTER VIEW
            ======================================================== */}
        {currentView === 'browse' && (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-start">
            
            {/* Filter Sidebar */}
            <aside className="bg-white border border-slate-200 rounded-xl p-5 space-y-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <Filter className="w-4 h-4 text-blue-600" />
                  Filter Catalog
                </span>
                <button 
                  onClick={() => setFilters({ type: '', categoryId: '', location: '', keyword: '', status: 'open', startDate: '', endDate: '' })}
                  className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                >
                  Reset
                </button>
              </div>

              {/* Listing Type Segmented Control */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Listing Type</label>
                <div className="grid grid-cols-3 p-1 bg-slate-100 rounded-lg text-xs font-medium">
                  <button 
                    onClick={() => setFilters(f => ({ ...f, type: '' }))}
                    className={`py-1.5 rounded-md transition-all cursor-pointer ${filters.type === '' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    All
                  </button>
                  <button 
                    onClick={() => setFilters(f => ({ ...f, type: 'lost' }))}
                    className={`py-1.5 rounded-md transition-all cursor-pointer ${filters.type === 'lost' ? 'bg-white text-rose-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Lost
                  </button>
                  <button 
                    onClick={() => setFilters(f => ({ ...f, type: 'found' }))}
                    className={`py-1.5 rounded-md transition-all cursor-pointer ${filters.type === 'found' ? 'bg-white text-emerald-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Found
                  </button>
                </div>
              </div>

              {/* Keyword Search */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Keyword Search</label>
                <input 
                  type="text"
                  placeholder="E.g. Hydro, AirPods, TI-84..."
                  value={filters.keyword}
                  onChange={(e) => setFilters(f => ({ ...f, keyword: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-600"
                />
              </div>

              {/* Category Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Category</label>
                <select 
                  value={filters.categoryId}
                  onChange={(e) => setFilters(f => ({ ...f, categoryId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-600"
                >
                  <option value="">All Categories</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id.toString()}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Location Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Campus Facility</label>
                <select 
                  value={filters.location}
                  onChange={(e) => setFilters(f => ({ ...f, location: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-600"
                >
                  <option value="">All Campus Facilities</option>
                  {CAMPUS_LOCATIONS.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              {/* Date Occurred Range */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Date Range</label>
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                    title="From date"
                  />
                  <input 
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                    title="To date"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Status</label>
                <select 
                  value={filters.status}
                  onChange={(e) => setFilters(f => ({ ...f, status: e.target.value as any }))}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-600"
                >
                  <option value="open">Active / Open Only</option>
                  <option value="">All (Including Resolved)</option>
                  <option value="claimed">Claimed</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </aside>

            {/* Results Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  Showing <strong className="text-slate-900 font-bold tabular-nums">{filteredItems.length}</strong> listings
                </span>
              </div>

              {filteredItems.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                    <Search className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">No items match your criteria</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Try clearing one or more filters, or search using broader keywords.
                  </p>
                  <button 
                    onClick={() => setFilters({ type: '', categoryId: '', location: '', keyword: '', status: 'open', startDate: '', endDate: '' })}
                    className="mt-2 px-4 py-2 text-xs font-semibold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Clear All Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredItems.map(item => (
                    <ItemCard 
                      key={item.id} 
                      item={item} 
                      onSelect={() => { setSelectedItemId(item.id); setCurrentView('detail'); }} 
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            VIEW 3: REPORT FORM
            ======================================================== */}
        {currentView === 'report' && (
          <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
            <div className="border-b border-slate-100 pb-4 mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                {reportType === 'lost' ? 'Report a Lost Campus Item' : 'Report a Found Campus Item'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Please provide specific descriptions to assist campus security and fellow students in verification.
              </p>
            </div>

            <form onSubmit={handleReportSubmit} className="space-y-5">
              {/* Report Type Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Are you reporting an item you lost or found?</label>
                <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-lg text-sm font-semibold">
                  <button 
                    type="button"
                    onClick={() => setReportType('lost')}
                    className={`py-2 rounded-md transition-all cursor-pointer ${reportType === 'lost' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    I Lost an Item
                  </button>
                  <button 
                    type="button"
                    onClick={() => setReportType('found')}
                    className={`py-2 rounded-md transition-all cursor-pointer ${reportType === 'found' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    I Found an Item
                  </button>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Item Title / Headline *</label>
                <input 
                  type="text"
                  required
                  placeholder="E.g. Sage Green Hydro Flask 32oz with NASA Sticker"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-600"
                />
                <span className="text-[11px] text-slate-400">Include brand, primary color, or distinguishing model name.</span>
              </div>

              {/* Category & Date Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Category *</label>
                  <select 
                    required
                    value={reportCategoryId}
                    onChange={(e) => setReportCategoryId(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-600"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id.toString()}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Date Occurred *</label>
                  <input 
                    type="date"
                    required
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Location & Specific Spot */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Campus Facility / Zone *</label>
                  <select 
                    required
                    value={reportLocation}
                    onChange={(e) => setReportLocation(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-600"
                  >
                    {CAMPUS_LOCATIONS.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Specific Area / Room</label>
                  <input 
                    type="text"
                    placeholder="E.g. 2nd floor quiet carrels, desk 14"
                    value={reportSpecificLocation}
                    onChange={(e) => setReportSpecificLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Detailed Description *</label>
                <textarea 
                  required
                  rows={4}
                  placeholder="Detail stickers, minor dents, scratches, case color, engraved initials, or distinctive accessories..."
                  value={reportDesc}
                  onChange={(e) => setReportDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-600"
                />
                
                {/* Real-time Keyword Extractor Badge List */}
                {extractedKeywords.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs text-slate-500">
                    <span className="font-semibold text-slate-600">Extracted match tokens:</span>
                    {extractedKeywords.map(k => (
                      <span key={k} className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-mono text-[11px]">
                        #{k}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Photo Upload Simulation with Live Preview */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Item Photo (Optional, &le; 5MB)</label>
                
                {reportImagePreview ? (
                  <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-100 p-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 bg-slate-200 rounded-lg flex items-center justify-center font-bold text-xs text-slate-600">
                        Photo
                      </div>
                      <span className="text-xs font-medium text-slate-700">Image attached (Simulated upload)</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setReportImagePreview(null)}
                      className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div className="text-xs text-slate-500 mb-2">Upload or simulate photo attachment:</div>
                    <div className="flex justify-center gap-2">
                      <button 
                        type="button"
                        onClick={() => setReportImagePreview('simulated_item.jpg')}
                        className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        Attach Verified Photo
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Contact Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Contact Email *</label>
                  <input 
                    type="email"
                    required
                    value={reportContactEmail}
                    onChange={(e) => setReportContactEmail(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Contact Phone (Optional)</label>
                  <input 
                    type="tel"
                    value={reportContactPhone}
                    onChange={(e) => setReportContactPhone(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setCurrentView('browse')}
                  className="px-4 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  Submit Item Report
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================
            VIEW 4: ITEM DETAIL & SMART MATCHING
            ======================================================== */}
        {currentView === 'detail' && selectedItem && (
          <div className="max-w-4xl mx-auto space-y-8">
            <button 
              onClick={() => setCurrentView('browse')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Catalog
            </button>

            {/* Main Item Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs grid grid-cols-1 md:grid-cols-[320px_1fr] gap-8">
              
              {/* Left Column: Visual container */}
              <div className="space-y-3">
                <div className="w-full aspect-square bg-slate-100 rounded-xl border border-slate-200/80 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
                  <div className="w-16 h-16 rounded-full bg-white shadow-xs flex items-center justify-center text-slate-400 mb-2">
                    <Tag className="w-8 h-8 text-blue-600" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700">{selectedItem.categoryName}</span>
                  <span className="text-[11px] text-slate-400 mt-1">Campus Listing #{selectedItem.id}</span>

                  <span className={`absolute top-3 left-3 text-[11px] font-bold tracking-wider px-2 py-0.5 rounded shadow-xs uppercase ${selectedItem.type === 'lost' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                    {selectedItem.type}
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Listing Status</span>
                    <span className="font-semibold text-slate-900 capitalize">{selectedItem.status}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Reported by</span>
                    <span className="font-semibold text-slate-900">{selectedItem.reporterName}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Information & Actions */}
              <div className="space-y-5">
                <div>
                  {/* Zero-Pill Unboxed Metadata */}
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                    <span>{selectedItem.categoryName}</span>
                    <span aria-hidden="true">&middot;</span>
                    <span>{selectedItem.location}</span>
                    <span aria-hidden="true">&middot;</span>
                    <span>{selectedItem.dateOccurred}</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {selectedItem.title}
                  </h1>
                </div>

                {/* Location & Details Strip */}
                <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block">Specific Location</span>
                    <span className="font-semibold text-slate-800">{selectedItem.specificLocation || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Contact Info</span>
                    <span className="font-semibold text-slate-800">{selectedItem.contactEmail}</span>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Description</h3>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {selectedItem.description}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 flex items-center gap-3">
                  {selectedItem.status === 'open' ? (
                    <button 
                      onClick={() => setIsClaimModalOpen(true)}
                      className="px-5 py-2.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer shadow-xs flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      {selectedItem.type === 'found' ? 'Claim This Item (It’s Mine)' : 'I Found This Item'}
                    </button>
                  ) : (
                    <div className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold">
                      This listing is {selectedItem.status}
                    </div>
                  )}

                  {/* Owner or Admin can resolve or delete */}
                  {(currentUser?.id === selectedItem.userId || currentUser?.role === 'admin') && (
                    <>
                      {selectedItem.status !== 'resolved' && (
                        <button 
                          onClick={() => handleResolveItem(selectedItem.id)}
                          className="px-3.5 py-2 text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                        >
                          Mark Resolved
                        </button>
                      )}
                      <button 
                        onClick={() => handleDeleteItem(selectedItem.id)}
                        className="px-3.5 py-2 text-xs font-semibold bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ========================================================
                SMART MATCHING ENGINE (Possible Matches Box)
                ======================================================== */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <h2 className="text-lg font-bold text-slate-900">
                      Possible Matching Listings ({matches.length})
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Automated scoring algorithm cross-referencing Category (+40%), Keyword Tokens (+40%), and Date Proximity (+20%).
                  </p>
                </div>
                <div className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                  Campus Match Engine
                </div>
              </div>

              {matches.length === 0 ? (
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-6 text-center text-xs text-slate-500">
                  No reciprocal candidate listings found matching this item’s keywords and date range currently.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {matches.map(m => (
                    <div 
                      key={m.item.id} 
                      className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 hover:bg-white hover:border-blue-300 transition-all space-y-3 cursor-pointer"
                      onClick={() => { setSelectedItemId(m.item.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-blue-600 tabular-nums">
                          {m.score}% Match Score
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {m.item.dateOccurred}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{m.item.title}</h4>
                        <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">{m.item.description}</p>
                      </div>

                      {/* Match breakdown breakdown */}
                      <div className="text-[11px] text-slate-500 border-t border-slate-200/80 pt-2 flex items-center justify-between">
                        <span>📍 {m.item.location}</span>
                        {m.breakdown.matchedKeywords.length > 0 && (
                          <span className="font-mono text-[10px] text-blue-700">
                            tokens: {m.breakdown.matchedKeywords.slice(0, 3).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            VIEW 5: MY POSTS VIEW
            ======================================================== */}
        {currentView === 'my-posts' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  My Campus Reports
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Manage your listings, review received ownership claims, or resolve items.
                </p>
              </div>
              <button 
                onClick={() => setCurrentView('report')}
                className="px-4 py-2 bg-blue-600 text-white font-semibold text-xs rounded-lg hover:bg-blue-700 transition-colors cursor-pointer shadow-xs"
              >
                + Report Another Item
              </button>
            </div>

            {/* User Items List */}
            <div className="space-y-4">
              {items.filter(i => i.userId === currentUser?.id).length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
                  You have not submitted any item reports yet.
                </div>
              ) : (
                items.filter(i => i.userId === currentUser?.id).map(item => {
                  const itemClaims = claims.filter(c => c.itemId === item.id);
                  return (
                    <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                            <span className={`font-bold uppercase ${item.type === 'lost' ? 'text-rose-600' : 'text-emerald-600'}`}>{item.type}</span>
                            <span>&middot;</span>
                            <span>{item.categoryName}</span>
                            <span>&middot;</span>
                            <span>{item.dateOccurred}</span>
                            <span>&middot;</span>
                            <span className="font-semibold text-slate-800 capitalize">{item.status}</span>
                          </div>
                          <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">{item.description}</p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.status === 'open' && (
                            <button 
                              onClick={() => handleResolveItem(item.id)}
                              className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md transition-colors cursor-pointer border border-emerald-200"
                            >
                              Mark Resolved
                            </button>
                          )}
                          <button 
                            onClick={() => handleDeleteItem(item.id)}
                            className="px-3 py-1.5 text-xs font-semibold bg-white text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer border border-rose-200"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {/* Claims Received on this item */}
                      {itemClaims.length > 0 && (
                        <div className="border-t border-slate-100 pt-3 space-y-2">
                          <span className="text-xs font-bold text-slate-700">Received Claims ({itemClaims.length})</span>
                          {itemClaims.map(cl => (
                            <div key={cl.id} className="bg-slate-50 p-3 rounded-lg text-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-800">{cl.claimerName} ({cl.claimerEmail})</span>
                                <span className="font-semibold capitalize text-blue-600">{cl.status}</span>
                              </div>
                              <p className="text-slate-600">"{cl.message}"</p>
                              {cl.proofDetails && (
                                <p className="text-slate-500 italic">Proof provided: {cl.proofDetails}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Claims Submitted by this user */}
            <div className="pt-6 border-t border-slate-200 space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Claims You Submitted</h2>
              {claims.filter(c => c.claimerId === currentUser?.id).length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-xs text-slate-500">
                  You have not submitted any claims on found items.
                </div>
              ) : (
                claims.filter(c => c.claimerId === currentUser?.id).map(cl => (
                  <div key={cl.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{cl.itemTitle}</div>
                      <div className="text-slate-500 mt-0.5">"{cl.message}"</div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${cl.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : cl.status === 'rejected' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                        {cl.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            VIEW 6: ADMIN DASHBOARD (Admin Only)
            ======================================================== */}
        {currentView === 'admin' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                  Campus Security & Lost/Found Console
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Centralized campus monitoring, claim adjudication queue, and item inventory management.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-md">
                  Officer Marcus Vance (Admin)
                </span>
              </div>
            </div>

            {/* KPI Cards Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                  {adminMetrics.lostCount}
                </div>
                <div className="text-xs font-medium text-slate-500 mt-1">Open Lost Items</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                  {adminMetrics.foundCount}
                </div>
                <div className="text-xs font-medium text-slate-500 mt-1">Open Found Items</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <div className="text-2xl font-extrabold text-emerald-600 tabular-nums">
                  {adminMetrics.resolvedCount}
                </div>
                <div className="text-xs font-medium text-slate-500 mt-1">Reunited & Resolved</div>
              </div>
              <div className="bg-white border border-blue-200 bg-blue-50/30 rounded-xl p-5 shadow-xs">
                <div className="text-2xl font-extrabold text-blue-600 tabular-nums">
                  {adminMetrics.pendingClaims}
                </div>
                <div className="text-xs font-medium text-slate-600 mt-1">Pending Claims Queue</div>
              </div>
            </div>

            {/* Category Chart Panel */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Items by Campus Category</h3>
                <p className="text-xs text-slate-500">Distribution of lost and found volume across product classifications</p>
              </div>

              <div className="space-y-3 pt-2">
                {adminMetrics.catCounts.map(cat => {
                  const maxCount = Math.max(...adminMetrics.catCounts.map(c => c.count), 1);
                  const pct = Math.round((cat.count / maxCount) * 100);
                  return (
                    <div key={cat.categoryName} className="grid grid-cols-[160px_1fr_40px] items-center gap-4 text-xs">
                      <span className="font-semibold text-slate-700 truncate">{cat.categoryName}</span>
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-right font-bold text-slate-600 tabular-nums">{cat.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Claims Queue Management Table */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Student Ownership Claims Queue</h3>
                <p className="text-xs text-slate-500">Review student identity and proof of ownership notes before releasing items.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold">
                      <th className="py-2.5 px-3">Claim ID</th>
                      <th className="py-2.5 px-3">Item Title</th>
                      <th className="py-2.5 px-3">Claimer</th>
                      <th className="py-2.5 px-3">Student Message & Proof</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {claims.map(cl => (
                      <tr key={cl.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-3 font-mono">#{cl.id}</td>
                        <td className="py-3 px-3 font-semibold text-slate-900">{cl.itemTitle}</td>
                        <td className="py-3 px-3">
                          <span className="font-medium text-slate-800 block">{cl.claimerName}</span>
                          <span className="text-slate-400 text-[11px]">{cl.claimerEmail}</span>
                        </td>
                        <td className="py-3 px-3 max-w-xs">
                          <p className="text-slate-700">{cl.message}</p>
                          {cl.proofDetails && (
                            <span className="text-[11px] text-blue-600 block mt-0.5">Proof: {cl.proofDetails}</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${cl.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : cl.status === 'rejected' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                            {cl.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          {cl.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button 
                                onClick={() => handleAdminClaimAction(cl.id, 'approved')}
                                className="px-2.5 py-1 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors cursor-pointer"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => handleAdminClaimAction(cl.id, 'rejected')}
                                className="px-2.5 py-1 text-xs font-semibold bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Processed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* All Cataloged Items Table */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">All Cataloged Items</h3>
                <p className="text-xs text-slate-500">Global control to resolve listings or purge obsolete records</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold">
                      <th className="py-2.5 px-3">ID</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Title</th>
                      <th className="py-2.5 px-3">Location</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-3 font-mono">#{item.id}</td>
                        <td className="py-3 px-3">
                          <span className={`font-bold uppercase ${item.type === 'lost' ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {item.type}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-900">{item.title}</td>
                        <td className="py-3 px-3 text-slate-600">{item.location}</td>
                        <td className="py-3 px-3 text-slate-500">{item.dateOccurred}</td>
                        <td className="py-3 px-3 capitalize font-medium">{item.status}</td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {item.status !== 'resolved' && (
                              <button 
                                onClick={() => handleResolveItem(item.id)}
                                className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded transition-colors cursor-pointer"
                              >
                                Resolve
                              </button>
                            )}
                            <button 
                              onClick={() => handleDeleteItem(item.id)}
                              className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            VIEW 7: SOURCE CODE & BLUEPRINT VAULT
            ======================================================== */}
        {currentView === 'vault' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                  Project Code & Architecture Vault
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Inspect and copy the standalone Python Flask backend, MySQL schema, requirements, and setup files.
                </p>
              </div>
            </div>

            {/* File Switcher Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-200 text-xs font-semibold">
              {PROJECT_FILES.map(f => (
                <button
                  key={f.name}
                  onClick={() => setActiveVaultFile(f.name)}
                  className={`px-3 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap ${activeVaultFile === f.name ? 'bg-blue-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  {f.name}
                </button>
              ))}
            </div>

            {/* Active File Viewer */}
            {PROJECT_FILES.filter(f => f.name === activeVaultFile).map(file => (
              <div key={file.name} className="bg-slate-900 text-slate-100 rounded-2xl overflow-hidden shadow-lg border border-slate-800">
                <div className="px-5 py-3.5 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-400">{file.name}</span>
                    <span className="text-slate-400">&mdash; {file.description}</span>
                  </div>
                  <button
                    onClick={() => handleCopyCode(file.code, file.name)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {copiedFile === file.name ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedFile === file.name ? 'Copied!' : 'Copy File'}
                  </button>
                </div>
                <div className="p-5 overflow-x-auto max-h-[600px] font-mono text-xs leading-relaxed text-slate-300">
                  <pre className="whitespace-pre">{file.code}</pre>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ========================================================
            VIEW 8: AUTH VIEW (Sign In / Register)
            ======================================================== */}
        {currentView === 'auth' && (
          <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Campus Account</h2>
              <p className="text-xs text-slate-500">Sign in with university credentials or pick a demo persona</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">University Email</label>
                <input 
                  type="email" 
                  defaultValue="arivera@student.university.edu"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-600"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Password</label>
                <input 
                  type="password" 
                  defaultValue="••••••••••••"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-600"
                />
              </div>
              <button 
                onClick={() => { switchUser('student'); setCurrentView('browse'); }}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                Sign In
              </button>
            </div>

            <div className="pt-4 border-t border-slate-100 text-center space-y-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Or quick test persona:</span>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => { switchUser('student'); setCurrentView('browse'); }}
                  className="py-2 px-3 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  Alex (Student)
                </button>
                <button 
                  onClick={() => { switchUser('admin'); setCurrentView('admin'); }}
                  className="py-2 px-3 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-blue-700 rounded-lg transition-colors cursor-pointer"
                >
                  Officer Marcus (Admin)
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ========================================================
          CLAIM SUBMISSION MODAL
          ======================================================== */}
      {isClaimModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                Submit Ownership Claim
              </h3>
              <button 
                onClick={() => setIsClaimModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg">
              Claiming: <strong className="text-slate-900">{selectedItem.title}</strong>
              <span className="block text-slate-500 mt-0.5">Found at {selectedItem.location} on {selectedItem.dateOccurred}</span>
            </div>

            <form onSubmit={handleClaimSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Why is this your item? *</label>
                <textarea 
                  required
                  rows={3}
                  value={claimMessage}
                  onChange={(e) => setClaimMessage(e.target.value)}
                  placeholder="Explain when and where you lost it, or how you can identify it..."
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Proof of Ownership / Distinctive Identifiers</label>
                <textarea 
                  rows={2}
                  value={claimProof}
                  onChange={(e) => setClaimProof(e.target.value)}
                  placeholder="Mention serial numbers, unique scratches, lock passcode, engraved initials, or wallpaper..."
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-600"
                />
                <span className="text-[11px] text-slate-400">Campus staff check these identifying notes before returning items.</span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsClaimModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  Submit Claim to Security
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <strong>CampusFind</strong> &mdash; University Lost and Found Coordination System
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => setCurrentView('browse')} className="hover:text-slate-900 cursor-pointer">Browse</button>
            <button onClick={() => setCurrentView('report')} className="hover:text-slate-900 cursor-pointer">Report</button>
            <button onClick={() => setCurrentView('vault')} className="hover:text-slate-900 cursor-pointer">Source Code Vault</button>
          </div>
        </div>
      </footer>

    </div>
  );
}

// -----------------------------------------------------------------------------
// Component: Item Card (Zero-Pill Typography & Unboxed Metadata)
// -----------------------------------------------------------------------------
function ItemCard({ item, onSelect }: { item: Item; onSelect: () => void }) {
  const isLost = item.type === 'lost';
  
  return (
    <div 
      onClick={onSelect}
      className="group bg-white border border-slate-200/90 rounded-xl overflow-hidden hover:border-slate-300 hover:shadow-md transition-all duration-150 cursor-pointer flex flex-col"
    >
      {/* Visual Thumbnail */}
      <div className="w-full h-44 bg-slate-100 relative flex items-center justify-center overflow-hidden border-b border-slate-100">
        <div className="text-slate-400 group-hover:scale-105 transition-transform duration-200">
          <Tag className="w-10 h-10 text-slate-300" />
        </div>
        
        {/* Type indicator chip */}
        <span className={`absolute top-3 left-3 text-[11px] font-bold tracking-wider px-2 py-0.5 rounded shadow-xs uppercase ${isLost ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
          {item.type}
        </span>

        {item.status !== 'open' && (
          <span className="absolute top-3 right-3 text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-900/80 text-white backdrop-blur-xs">
            {item.status}
          </span>
        )}
      </div>

      {/* Card Content Body */}
      <div className="p-4 flex flex-col flex-1">
        {/* Zero-Pill Unboxed Metadata */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
          <span>{item.categoryName}</span>
          <span aria-hidden="true">&middot;</span>
          <span>{item.dateOccurred}</span>
        </div>

        <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
          {item.title}
        </h3>

        <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
          {item.description}
        </p>

        <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="truncate max-w-[70%]">
            📍 {item.location}
          </span>
          <span className="font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform">
            Details &rarr;
          </span>
        </div>
      </div>
    </div>
  );
}
