import React, { useState, useMemo } from 'react';
import {
  Search, Package, Calendar, DollarSign, Clock, AlertTriangle, CheckCircle2,
  ExternalLink, ArrowUpDown, ChevronDown, Download, RefreshCw, Filter,
  FileText, Eye, Edit3, Check, X, ArrowUpRight, Truck, RotateCcw,
  SlidersHorizontal, Copy, Image as ImageIcon, Sparkles, Layers, Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { uploadImageToStorage } from './services/geminiService';

export interface SampleFlatItem {
  id: number | string;
  deck_id: number | string;
  deck_name: string;
  customer_id?: number | string;
  customer_name?: string;
  garment_id?: number | string | null;
  garment_name: string;
  garment_image?: string | null;
  mock_image?: string;
  original_image?: string;
  supplier_link?: string | null;
  category?: string | null;
  type?: string | null;
  gender?: string | null;
  
  sample_ordered?: boolean;
  sample_received?: boolean;
  sample_keep_item?: boolean;
  sample_receipt_url?: string | null;
  sample_return_by_date?: string | null;
  sample_returned?: boolean;
  sample_return_cost?: number | null;
  sample_return_tracking_number?: string | null;
  sample_cost?: number | null;
  sample_refund_amount?: number | null;
}

interface SamplesViewProps {
  sampleDecks: any[];
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  onOpenDeckItem?: (deckId: number | string, itemId: number | string) => void;
  onZoomImage?: (imageUrl: string) => void;
}

// Carrier tracking resolver helper
export function getCarrierTrackingInfo(trackingNumber?: string | null) {
  if (!trackingNumber) return null;
  const clean = trackingNumber.trim();
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return { carrier: 'Custom Link', url: clean };
  }
  const stripped = clean.replace(/[\s-]/g, '').toUpperCase();
  if (/^1Z[0-9A-Z]{16}$/i.test(stripped)) {
    return { carrier: 'UPS', url: `https://www.ups.com/track?tracknum=${stripped}` };
  }
  if (/^9[2-5][0-9]{20}$/i.test(stripped) || (stripped.length === 22 && /^[0-9]+$/.test(stripped))) {
    return { carrier: 'USPS', url: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${stripped}` };
  }
  if (/^[0-9]{12}$/.test(stripped) || /^[0-9]{15}$/.test(stripped)) {
    return { carrier: 'FedEx', url: `https://www.fedex.com/fedextrack/?trknbr=${stripped}` };
  }
  return { carrier: 'Track', url: `https://www.google.com/search?q=${encodeURIComponent('track package ' + clean)}` };
}

export default function SamplesView({
  sampleDecks,
  isLoading,
  onRefresh,
  onOpenDeckItem,
  onZoomImage
}: SamplesViewProps) {
  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'overdue' | 'awaiting' | 'received' | 'returned' | 'keep'>('all');
  const [selectedDeck, setSelectedDeck] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'overdue' | 'due-7' | 'due-30' | 'no-date'>('all');
  const [sortBy, setSortBy] = useState<'returnDate' | 'name' | 'deck' | 'customer' | 'cost' | 'refund'>('returnDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Interactive Quick Edit Modal
  const [editingItem, setEditingItem] = useState<SampleFlatItem | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleOpenZoom = (url: string) => {
    if (onZoomImage) onZoomImage(url);
    setLightboxImage(url);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Flatten sample items
  const allItems = useMemo<SampleFlatItem[]>(() => {
    const list: SampleFlatItem[] = [];
    sampleDecks.forEach(deck => {
      if (Array.isArray(deck.items)) {
        deck.items.forEach((item: any) => {
          list.push({
            ...item,
            deck_id: deck.id,
            deck_name: deck.name || 'Untitled Deck',
            customer_id: deck.customer_id,
            customer_name: deck.customer_name || 'Internal / WOVN'
          });
        });
      }
    });
    return list;
  }, [sampleDecks]);

  // Unique customers and decks for dropdown filters
  const uniqueDecks = useMemo(() => {
    const map = new Map<string, string>();
    sampleDecks.forEach(d => {
      if (d.id && d.name) map.set(String(d.id), d.name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [sampleDecks]);

  const uniqueCustomers = useMemo(() => {
    const set = new Set<string>();
    allItems.forEach(i => {
      if (i.customer_name) set.add(i.customer_name);
    });
    return Array.from(set).sort();
  }, [allItems]);

  // Today at midnight for due date comparisons
  const todayMidnight = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  // Compute status helpers for any item
  const getItemStatus = (item: SampleFlatItem) => {
    if (item.sample_returned) return 'returned';
    if (item.sample_keep_item) return 'keep';
    if (item.sample_return_by_date) {
      const returnTime = new Date(item.sample_return_by_date + 'T00:00:00').getTime();
      if (returnTime < todayMidnight) return 'overdue';
    }
    if (item.sample_received) return 'received';
    return 'awaiting';
  };

  // KPI Metrics Calculation
  const metrics = useMemo(() => {
    let totalSpend = 0;
    let totalRefunded = 0;
    let totalReturnCost = 0;
    let overdueCount = 0;
    let awaitingDeliveryCount = 0;
    let receivedPendingReturnCount = 0;
    let returnedCount = 0;
    let keptCount = 0;

    allItems.forEach(item => {
      const cost = typeof item.sample_cost === 'number' ? item.sample_cost : parseFloat(item.sample_cost as any) || 0;
      const refund = typeof item.sample_refund_amount === 'number' ? item.sample_refund_amount : parseFloat(item.sample_refund_amount as any) || 0;
      const retCost = typeof item.sample_return_cost === 'number' ? item.sample_return_cost : parseFloat(item.sample_return_cost as any) || 0;

      totalSpend += cost;
      totalRefunded += refund;
      totalReturnCost += retCost;

      const status = getItemStatus(item);
      if (status === 'overdue') overdueCount++;
      else if (status === 'awaiting') awaitingDeliveryCount++;
      else if (status === 'received') receivedPendingReturnCount++;
      else if (status === 'returned') returnedCount++;
      else if (status === 'keep') keptCount++;
    });

    const netSpend = totalSpend - totalRefunded + totalReturnCost;

    return {
      totalCount: allItems.length,
      overdueCount,
      awaitingDeliveryCount,
      receivedPendingReturnCount,
      returnedCount,
      keptCount,
      totalSpend,
      totalRefunded,
      totalReturnCost,
      netSpend
    };
  }, [allItems, todayMidnight]);

  // Filtered and Sorted Items
  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      // Text Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = item.garment_name?.toLowerCase().includes(query);
        const matchDeck = item.deck_name?.toLowerCase().includes(query);
        const matchCustomer = item.customer_name?.toLowerCase().includes(query);
        const matchTracking = item.sample_return_tracking_number?.toLowerCase().includes(query);
        if (!matchName && !matchDeck && !matchCustomer && !matchTracking) {
          return false;
        }
      }

      // Status Tab Filter
      const status = getItemStatus(item);
      if (statusFilter !== 'all') {
        if (statusFilter === 'overdue' && status !== 'overdue') return false;
        if (statusFilter === 'awaiting' && status !== 'awaiting') return false;
        if (statusFilter === 'received' && status !== 'received') return false;
        if (statusFilter === 'returned' && status !== 'returned') return false;
        if (statusFilter === 'keep' && status !== 'keep') return false;
      }

      // Deck Filter
      if (selectedDeck !== 'all' && String(item.deck_id) !== selectedDeck) {
        return false;
      }

      // Customer Filter
      if (selectedCustomer !== 'all' && item.customer_name !== selectedCustomer) {
        return false;
      }

      // Urgency Filter
      if (urgencyFilter !== 'all') {
        if (urgencyFilter === 'no-date') {
          if (item.sample_return_by_date) return false;
        } else if (!item.sample_return_by_date) {
          return false;
        } else {
          const returnTime = new Date(item.sample_return_by_date + 'T00:00:00').getTime();
          const diffDays = Math.round((returnTime - todayMidnight) / (1000 * 60 * 60 * 24));
          if (urgencyFilter === 'overdue' && diffDays >= 0) return false;
          if (urgencyFilter === 'due-7' && (diffDays < 0 || diffDays > 7)) return false;
          if (urgencyFilter === 'due-30' && (diffDays < 0 || diffDays > 30)) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'returnDate') {
        // Put overdue and nearest return dates first
        const timeA = a.sample_return_by_date ? new Date(a.sample_return_by_date + 'T00:00:00').getTime() : Infinity;
        const timeB = b.sample_return_by_date ? new Date(b.sample_return_by_date + 'T00:00:00').getTime() : Infinity;
        comparison = timeA - timeB;
      } else if (sortBy === 'name') {
        comparison = (a.garment_name || '').localeCompare(b.garment_name || '');
      } else if (sortBy === 'deck') {
        comparison = (a.deck_name || '').localeCompare(b.deck_name || '');
      } else if (sortBy === 'customer') {
        comparison = (a.customer_name || '').localeCompare(b.customer_name || '');
      } else if (sortBy === 'cost') {
        const costA = parseFloat(a.sample_cost as any) || 0;
        const costB = parseFloat(b.sample_cost as any) || 0;
        comparison = costA - costB;
      } else if (sortBy === 'refund') {
        const refA = parseFloat(a.sample_refund_amount as any) || 0;
        const refB = parseFloat(b.sample_refund_amount as any) || 0;
        comparison = refA - refB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [allItems, searchQuery, statusFilter, selectedDeck, selectedCustomer, urgencyFilter, sortBy, sortOrder, todayMidnight]);

  // Quick 1-click update for inline toggles
  const handleQuickItemUpdate = async (itemId: number | string, updates: Partial<SampleFlatItem>) => {
    try {
      const res = await fetch(`/api/deck-items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error('Failed to update sample item');
      showToast('Sample status updated successfully');
      await onRefresh();
    } catch (err: any) {
      console.error(err);
      alert('Error updating sample: ' + err.message);
    }
  };

  // CSV Exporter
  const handleExportCSV = () => {
    if (filteredItems.length === 0) {
      alert('No sample items to export with current filters.');
      return;
    }

    const headers = [
      'Garment Name',
      'Deck / Collection',
      'Customer / Brand',
      'Sample Ordered',
      'Sample Received',
      'Keep Item (No Return)',
      'Return By Date',
      'Return Status',
      'Days Remaining / Overdue',
      'Sample Returned',
      'Return Tracking Number',
      'Purchase Cost ($)',
      'Return Restock Fee ($)',
      'Refund Amount ($)',
      'Net Cost ($)',
      'Receipt Link',
      'Supplier Link'
    ];

    const rows = filteredItems.map(item => {
      const status = getItemStatus(item);
      let daysDiffStr = 'N/A';
      if (item.sample_return_by_date) {
        const returnTime = new Date(item.sample_return_by_date + 'T00:00:00').getTime();
        const diff = Math.round((returnTime - todayMidnight) / (1000 * 60 * 60 * 24));
        daysDiffStr = diff < 0 ? `${Math.abs(diff)} days OVERDUE` : `${diff} days left`;
      }

      const cost = parseFloat(item.sample_cost as any) || 0;
      const refund = parseFloat(item.sample_refund_amount as any) || 0;
      const retCost = parseFloat(item.sample_return_cost as any) || 0;
      const net = cost - refund + retCost;

      return [
        `"${(item.garment_name || '').replace(/"/g, '""')}"`,
        `"${(item.deck_name || '').replace(/"/g, '""')}"`,
        `"${(item.customer_name || '').replace(/"/g, '""')}"`,
        item.sample_ordered ? 'Yes' : 'No',
        item.sample_received ? 'Yes' : 'No',
        item.sample_keep_item ? 'Yes' : 'No',
        item.sample_return_by_date || '',
        status.toUpperCase(),
        daysDiffStr,
        item.sample_returned ? 'Yes' : 'No',
        `"${(item.sample_return_tracking_number || '').replace(/"/g, '""')}"`,
        cost.toFixed(2),
        retCost.toFixed(2),
        refund.toFixed(2),
        net.toFixed(2),
        item.sample_receipt_url || '',
        item.supplier_link || ''
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `wovn-sample-orders-returns-${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTracking(text);
    setTimeout(() => setCopiedTracking(null), 2000);
  };

  return (
    <div className="min-h-screen bg-zinc-50/50 pb-24">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 bg-zinc-900 text-white text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 font-medium border border-zinc-700"
          >
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Header */}
      <div className="bg-white border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-amber-50 text-amber-700 border border-amber-200/70 flex items-center gap-1.5">
                  <Package size={12} className="text-amber-600" />
                  Sample Management Center
                </span>
                {metrics.overdueCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-red-50 text-red-700 border border-red-200/70 flex items-center gap-1.5 animate-pulse">
                    <AlertTriangle size={12} className="text-red-500" />
                    {metrics.overdueCount} Overdue Action{metrics.overdueCount === 1 ? '' : 's'}
                  </span>
                )}
              </div>
              <h1 className="editorial-title text-zinc-900 text-3xl md:text-5xl font-serif tracking-tight">
                Sample Orders & Returns
              </h1>
              <p className="text-zinc-500 text-xs md:text-sm mt-1.5 max-w-2xl leading-relaxed">
                Centralized ledger tracking sample procurement, delivery confirmations, return expiration dates, carrier tracking numbers, and financial reconciliations.
              </p>
            </div>

            {/* Top Global Controls */}
            <div className="flex items-center gap-3 self-start md:self-auto">
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-200 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-all hover:border-zinc-300 cursor-pointer"
                title="Export current samples list to CSV"
              >
                <Download size={14} className="text-zinc-500" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                title="Refresh sample data"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Metric KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mt-8">
            {/* Total Ordered */}
            <div className="bg-white border border-zinc-100 rounded-2xl p-4 shadow-sm hover:border-zinc-200 transition-all">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-[10px] uppercase tracking-widest font-bold">Total Ordered</span>
                <Package size={16} className="text-zinc-400" />
              </div>
              <div className="text-2xl font-bold text-zinc-900">{metrics.totalCount}</div>
              <div className="text-[11px] text-zinc-400 font-medium mt-1">
                ${metrics.totalSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} spend
              </div>
            </div>

            {/* Overdue Returns */}
            <div className={`bg-white border rounded-2xl p-4 shadow-sm transition-all ${metrics.overdueCount > 0 ? 'border-red-200 bg-red-50/20 ring-1 ring-red-100' : 'border-zinc-100'}`}>
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className={`text-[10px] uppercase tracking-widest font-bold ${metrics.overdueCount > 0 ? 'text-red-600' : 'text-zinc-400'}`}>
                  Overdue Returns
                </span>
                <AlertTriangle size={16} className={metrics.overdueCount > 0 ? 'text-red-500' : 'text-zinc-400'} />
              </div>
              <div className={`text-2xl font-bold ${metrics.overdueCount > 0 ? 'text-red-600' : 'text-zinc-900'}`}>
                {metrics.overdueCount}
              </div>
              <div className="text-[11px] text-zinc-400 font-medium mt-1">
                {metrics.overdueCount > 0 ? 'Requires immediate return' : 'All clear'}
              </div>
            </div>

            {/* Pending Return (Received) */}
            <div className="bg-white border border-zinc-100 rounded-2xl p-4 shadow-sm hover:border-zinc-200 transition-all">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-[10px] uppercase tracking-widest font-bold">In Studio (Pending)</span>
                <Clock size={16} className="text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-zinc-900">{metrics.receivedPendingReturnCount}</div>
              <div className="text-[11px] text-zinc-400 font-medium mt-1">
                Received & awaiting return
              </div>
            </div>

            {/* Returned */}
            <div className="bg-white border border-zinc-100 rounded-2xl p-4 shadow-sm hover:border-zinc-200 transition-all">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-[10px] uppercase tracking-widest font-bold">Returned</span>
                <CheckCircle2 size={16} className="text-emerald-500" />
              </div>
              <div className="text-2xl font-bold text-zinc-900">{metrics.returnedCount}</div>
              <div className="text-[11px] text-emerald-600 font-medium mt-1">
                ${metrics.totalRefunded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} refunded
              </div>
            </div>

            {/* Kept Items */}
            <div className="bg-white border border-zinc-100 rounded-2xl p-4 shadow-sm hover:border-zinc-200 transition-all">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-[10px] uppercase tracking-widest font-bold">Kept Final</span>
                <RotateCcw size={16} className="text-zinc-400" />
              </div>
              <div className="text-2xl font-bold text-zinc-900">{metrics.keptCount}</div>
              <div className="text-[11px] text-zinc-400 font-medium mt-1">
                No return required
              </div>
            </div>

            {/* Net Out-of-Pocket */}
            <div className="bg-zinc-900 text-white rounded-2xl p-4 shadow-md">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-300">Net Studio Cost</span>
                <DollarSign size={16} className="text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-white">
                ${metrics.netSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-zinc-400 font-medium mt-1">
                Spend - Refund + Fees
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content & Filters */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6">
        {/* Status Filter Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-zinc-200/80">
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 max-w-full">
            {[
              { id: 'all', label: 'All Samples', count: metrics.totalCount },
              { id: 'overdue', label: 'Overdue', count: metrics.overdueCount, isAlert: metrics.overdueCount > 0 },
              { id: 'received', label: 'In Studio (Received)', count: metrics.receivedPendingReturnCount },
              { id: 'awaiting', label: 'In Transit / Ordered', count: metrics.awaitingDeliveryCount },
              { id: 'returned', label: 'Returned', count: metrics.returnedCount },
              { id: 'keep', label: 'Kept Final', count: metrics.keptCount },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-zinc-900 text-white shadow-sm'
                    : 'bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 border border-zinc-200/70'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  statusFilter === tab.id
                    ? 'bg-white/20 text-white'
                    : tab.isAlert
                      ? 'bg-red-100 text-red-700'
                      : 'bg-zinc-100 text-zinc-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl border border-zinc-200/70">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Spreadsheet
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'cards' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Visual Cards
            </button>
          </div>
        </div>

        {/* Search & Multi-Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 py-4">
          {/* Text Search */}
          <div className="relative lg:col-span-2">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search garment name, deck, client, tracking #..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-xl pl-10 pr-9 py-2.5 text-xs text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 outline-none transition-all shadow-sm font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Customer / Brand Filter */}
          <div>
            <select
              value={selectedCustomer}
              onChange={e => setSelectedCustomer(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-xs text-zinc-700 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 outline-none transition-all shadow-sm font-medium cursor-pointer"
            >
              <option value="all">All Clients / Brands ({uniqueCustomers.length})</option>
              {uniqueCustomers.map(cust => (
                <option key={cust} value={cust}>{cust}</option>
              ))}
            </select>
          </div>

          {/* Deck / Collection Filter */}
          <div>
            <select
              value={selectedDeck}
              onChange={e => setSelectedDeck(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-xs text-zinc-700 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 outline-none transition-all shadow-sm font-medium cursor-pointer"
            >
              <option value="all">All Decks / Collections ({uniqueDecks.length})</option>
              {uniqueDecks.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="flex gap-1.5">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="flex-1 bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-xs text-zinc-700 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 outline-none transition-all shadow-sm font-medium cursor-pointer"
            >
              <option value="returnDate">Sort: Return Due Date</option>
              <option value="name">Sort: Garment Name</option>
              <option value="customer">Sort: Client</option>
              <option value="deck">Sort: Deck</option>
              <option value="cost">Sort: Purchase Cost</option>
              <option value="refund">Sort: Refund Amount</option>
            </select>
            <button
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="px-2.5 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 text-zinc-600 transition-colors shadow-sm flex items-center justify-center cursor-pointer"
              title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              <ArrowUpDown size={14} />
            </button>
          </div>
        </div>

        {/* Filter Summary & Result Count */}
        <div className="flex items-center justify-between text-xs text-zinc-400 font-medium mb-4">
          <div>
            Showing <span className="text-zinc-900 font-bold">{filteredItems.length}</span> of {allItems.length} sample items
            {(searchQuery || selectedCustomer !== 'all' || selectedDeck !== 'all' || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCustomer('all');
                  setSelectedDeck('all');
                  setStatusFilter('all');
                  setUrgencyFilter('all');
                }}
                className="ml-3 text-zinc-500 hover:text-zinc-900 underline cursor-pointer"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>

        {/* Empty State */}
        {filteredItems.length === 0 && !isLoading && (
          <div className="bg-white border border-dashed border-zinc-300 rounded-2xl p-12 text-center my-6">
            <Package size={36} className="mx-auto text-zinc-300 mb-3" />
            <h3 className="text-base font-bold text-zinc-900 mb-1">No matching sample items</h3>
            <p className="text-xs text-zinc-500 max-w-md mx-auto mb-4">
              {searchQuery || statusFilter !== 'all' || selectedCustomer !== 'all' || selectedDeck !== 'all'
                ? 'Try adjusting your search criteria or filters to see more sample items.'
                : 'No active sample garments are currently tracked. Enable "Sample Ordered" on any garment in a deck to track it here.'}
            </p>
          </div>
        )}

        {/* SPREADSHEET / TABLE VIEW */}
        {viewMode === 'table' && filteredItems.length > 0 && (
          <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-sm overflow-hidden mb-8">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-50/80 border-b border-zinc-200/80 text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
                    <th className="py-3.5 pl-4 pr-2">Garment</th>
                    <th className="py-3.5 px-3">Deck & Client</th>
                    <th className="py-3.5 px-3">Order Status</th>
                    <th className="py-3.5 px-3">Return Status / Due</th>
                    <th className="py-3.5 px-3">Carrier Tracking</th>
                    <th className="py-3.5 px-3">Financials</th>
                    <th className="py-3.5 px-3">Receipt</th>
                    <th className="py-3.5 pr-4 pl-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredItems.map(item => {
                    const status = getItemStatus(item);
                    const isOverdue = status === 'overdue';
                    const trackingInfo = getCarrierTrackingInfo(item.sample_return_tracking_number);

                    let returnDueInfo = null;
                    if (item.sample_keep_item) {
                      returnDueInfo = <span className="text-zinc-500 font-medium">Keep / No Return</span>;
                    } else if (item.sample_return_by_date) {
                      const returnTime = new Date(item.sample_return_by_date + 'T00:00:00').getTime();
                      const diffDays = Math.round((returnTime - todayMidnight) / (1000 * 60 * 60 * 24));
                      if (diffDays < 0) {
                        returnDueInfo = (
                          <div className="flex flex-col">
                            <span className="font-bold text-red-600 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                              Overdue: {item.sample_return_by_date}
                            </span>
                            <span className="text-[10px] text-red-500 font-semibold mt-0.5">
                              {Math.abs(diffDays)} day{Math.abs(diffDays) === 1 ? '' : 's'} late
                            </span>
                          </div>
                        );
                      } else {
                        returnDueInfo = (
                          <div className="flex flex-col">
                            <span className="text-zinc-800 font-semibold">Due {item.sample_return_by_date}</span>
                            <span className="text-[10px] text-zinc-400">
                              {diffDays === 0 ? 'Due today' : `${diffDays} day${diffDays === 1 ? '' : 's'} left`}
                            </span>
                          </div>
                        );
                      }
                    } else {
                      returnDueInfo = <span className="text-zinc-400 italic">No date set</span>;
                    }

                    const cost = parseFloat(item.sample_cost as any) || 0;
                    const refund = parseFloat(item.sample_refund_amount as any) || 0;
                    const retFee = parseFloat(item.sample_return_cost as any) || 0;

                    return (
                      <tr
                        key={`${item.deck_id}-${item.id}`}
                        className={`hover:bg-zinc-50/60 transition-colors group ${
                          isOverdue ? 'bg-red-50/10' : ''
                        }`}
                      >
                        {/* Garment Image & Name */}
                        <td className="py-3 pl-4 pr-2">
                          <div className="flex items-center gap-3">
                            <div
                              onClick={() => {
                                const img = item.mock_image || item.garment_image || item.original_image;
                                if (img) handleOpenZoom(img);
                              }}
                              className="w-11 h-11 rounded-lg bg-zinc-100 border border-zinc-200 shrink-0 overflow-hidden cursor-zoom-in relative group/img shadow-sm"
                              title="Click to zoom image"
                            >
                              {item.mock_image || item.garment_image || item.original_image ? (
                                <img
                                  src={item.mock_image || item.garment_image || item.original_image || ''}
                                  alt={item.garment_name}
                                  className="w-full h-full object-cover group-hover/img:scale-105 transition-transform"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-300">
                                  <ImageIcon size={16} />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 max-w-[200px]">
                              <div className="font-bold text-zinc-900 truncate leading-snug" title={item.garment_name}>
                                {item.garment_name}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {item.category && (
                                  <span className="text-[10px] text-zinc-400 font-medium">
                                    {item.category}
                                  </span>
                                )}
                                {item.supplier_link && (
                                  <a
                                    href={item.supplier_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] text-zinc-400 hover:text-zinc-700 flex items-center gap-0.5"
                                    title="Open Supplier Link"
                                  >
                                    <ExternalLink size={10} />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Deck & Client */}
                        <td className="py-3 px-3">
                          <div className="flex flex-col gap-0.5">
                            <span
                              onClick={() => onOpenDeckItem && onOpenDeckItem(item.deck_id, item.id)}
                              className="font-bold text-zinc-900 hover:text-zinc-600 truncate max-w-[160px] cursor-pointer transition-colors"
                              title={`Jump to ${item.deck_name}`}
                            >
                              {item.deck_name}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-medium truncate max-w-[160px]">
                              {item.customer_name}
                            </span>
                          </div>
                        </td>

                        {/* Order & Delivery Status */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleQuickItemUpdate(item.id, { sample_received: !item.sample_received })}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                item.sample_received
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70 hover:bg-emerald-100'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200/70 hover:bg-amber-100'
                              }`}
                              title="Click to toggle Received status"
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${item.sample_received ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                              <span>{item.sample_received ? 'Received' : 'Ordered'}</span>
                            </button>
                          </div>
                        </td>

                        {/* Return Status & Due Date */}
                        <td className="py-3 px-3">
                          <div className="space-y-1">
                            {item.sample_returned ? (
                              <button
                                onClick={() => handleQuickItemUpdate(item.id, { sample_returned: false })}
                                className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 hover:bg-emerald-100 transition-colors cursor-pointer"
                                title="Click to undo Returned"
                              >
                                <Check size={12} className="text-emerald-600" />
                                <span>Returned</span>
                              </button>
                            ) : (
                              returnDueInfo
                            )}
                          </div>
                        </td>

                        {/* Carrier Tracking */}
                        <td className="py-3 px-3">
                          {item.sample_return_tracking_number ? (
                            <div className="flex items-center gap-1.5 max-w-[170px]">
                              <span className="font-mono text-[11px] text-zinc-700 truncate" title={item.sample_return_tracking_number}>
                                {item.sample_return_tracking_number}
                              </span>
                              <button
                                onClick={() => copyToClipboard(item.sample_return_tracking_number!)}
                                className="p-1 text-zinc-400 hover:text-zinc-700 rounded transition-colors cursor-pointer"
                                title="Copy tracking number"
                              >
                                {copiedTracking === item.sample_return_tracking_number ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                              </button>
                              {trackingInfo && (
                                <a
                                  href={trackingInfo.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 text-zinc-500 hover:text-zinc-900 rounded hover:bg-zinc-100 transition-colors cursor-pointer"
                                  title={`Track on ${trackingInfo.carrier}`}
                                >
                                  <ArrowUpRight size={13} />
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-zinc-300 text-[11px] italic">No tracking</span>
                          )}
                        </td>

                        {/* Financials (Cost, Refund, Net) */}
                        <td className="py-3 px-3">
                          <div className="flex flex-col text-[11px]">
                            {cost > 0 && (
                              <span className="font-semibold text-zinc-900">
                                ${cost.toFixed(2)} cost
                              </span>
                            )}
                            {refund > 0 && (
                              <span className="text-emerald-600 font-semibold">
                                -${refund.toFixed(2)} refund
                              </span>
                            )}
                            {retFee > 0 && (
                              <span className="text-zinc-500 text-[10px]">
                                +${retFee.toFixed(2)} return fee
                              </span>
                            )}
                            {cost === 0 && refund === 0 && retFee === 0 && (
                              <span className="text-zinc-300 italic">No cost</span>
                            )}
                          </div>
                        </td>

                        {/* Receipt File */}
                        <td className="py-3 px-3">
                          {item.sample_receipt_url ? (
                            <button
                              onClick={() => {
                                if (item.sample_receipt_url) {
                                  if (item.sample_receipt_url.toLowerCase().includes('.pdf')) {
                                    window.open(item.sample_receipt_url, '_blank');
                                  } else {
                                    handleOpenZoom(item.sample_receipt_url);
                                  }
                                }
                              }}
                              className="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="View receipt"
                            >
                              <FileText size={12} />
                              <span>View</span>
                            </button>
                          ) : (
                            <span className="text-zinc-300 text-[11px] italic">None</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 pr-4 pl-2 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!item.sample_returned && !item.sample_keep_item && (
                              <button
                                onClick={() => handleQuickItemUpdate(item.id, { sample_returned: true })}
                                className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                                title="Mark as returned"
                              >
                                Return
                              </button>
                            )}

                            <button
                              onClick={() => setEditingItem(item)}
                              className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                              title="Quick Edit Sample Details"
                            >
                              <Edit3 size={14} />
                            </button>

                            <button
                              onClick={() => onOpenDeckItem && onOpenDeckItem(item.deck_id, item.id)}
                              className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                              title="Open in Deck"
                            >
                              <ExternalLink size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VISUAL CARDS GRID VIEW */}
        {viewMode === 'cards' && filteredItems.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-10">
            {filteredItems.map(item => {
              const status = getItemStatus(item);
              const isOverdue = status === 'overdue';
              const trackingInfo = getCarrierTrackingInfo(item.sample_return_tracking_number);
              const cost = parseFloat(item.sample_cost as any) || 0;
              const refund = parseFloat(item.sample_refund_amount as any) || 0;

              return (
                <div
                  key={`${item.deck_id}-${item.id}`}
                  className={`bg-white border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group ${
                    isOverdue ? 'border-red-200 ring-1 ring-red-100' : 'border-zinc-200/80'
                  }`}
                >
                  <div>
                    {/* Top Row: Status badge & Quick Edit */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      {status === 'returned' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Returned
                        </span>
                      )}
                      {status === 'keep' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-zinc-100 text-zinc-600 border border-zinc-200">
                          Kept Final
                        </span>
                      )}
                      {status === 'overdue' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-red-50 text-red-600 border border-red-200 animate-pulse flex items-center gap-1">
                          <AlertTriangle size={10} />
                          Overdue: {item.sample_return_by_date}
                        </span>
                      )}
                      {status === 'received' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-amber-50 text-amber-700 border border-amber-200">
                          In Studio (Received)
                        </span>
                      )}
                      {status === 'awaiting' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-zinc-100 text-zinc-600 border border-zinc-200">
                          Ordered / In Transit
                        </span>
                      )}

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingItem(item)}
                          className="p-1 text-zinc-400 hover:text-zinc-800 rounded transition-colors cursor-pointer"
                          title="Edit sample details"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => onOpenDeckItem && onOpenDeckItem(item.deck_id, item.id)}
                          className="p-1 text-zinc-400 hover:text-zinc-800 rounded transition-colors cursor-pointer"
                          title="Open in Deck"
                        >
                          <ExternalLink size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Image & Main Info */}
                    <div className="flex gap-3 mb-3">
                      <div
                        onClick={() => {
                          const img = item.mock_image || item.garment_image || item.original_image;
                          if (img) handleOpenZoom(img);
                        }}
                        className="w-16 h-20 bg-zinc-100 border border-zinc-200 rounded-xl overflow-hidden shrink-0 cursor-zoom-in relative shadow-sm"
                      >
                        {item.mock_image || item.garment_image || item.original_image ? (
                          <img
                            src={item.mock_image || item.garment_image || item.original_image || ''}
                            alt={item.garment_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-300">
                            <ImageIcon size={20} />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-zinc-900 text-sm truncate leading-snug" title={item.garment_name}>
                          {item.garment_name}
                        </h4>
                        <div className="text-[10px] text-zinc-500 font-semibold mt-0.5 truncate">
                          {item.deck_name}
                        </div>
                        <div className="text-[10px] text-zinc-400 truncate">
                          {item.customer_name}
                        </div>

                        {/* Due Date Details */}
                        {item.sample_return_by_date && !item.sample_keep_item && !item.sample_returned && (
                          <div className="mt-2 text-[10px] font-semibold flex items-center gap-1 text-zinc-600">
                            <Calendar size={11} className="text-zinc-400" />
                            <span>Due: {item.sample_return_by_date}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tracking & Carrier Info */}
                    {item.sample_return_tracking_number && (
                      <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-2.5 mb-3 flex items-center justify-between text-xs">
                        <div className="min-w-0 flex-1">
                          <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-400 block">
                            Return Tracking
                          </span>
                          <span className="font-mono text-[11px] text-zinc-800 truncate block font-medium">
                            {item.sample_return_tracking_number}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => copyToClipboard(item.sample_return_tracking_number!)}
                            className="p-1 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                            title="Copy tracking number"
                          >
                            {copiedTracking === item.sample_return_tracking_number ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                          </button>
                          {trackingInfo && (
                            <a
                              href={trackingInfo.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-zinc-500 hover:text-zinc-900 cursor-pointer"
                              title={`Track with ${trackingInfo.carrier}`}
                            >
                              <ArrowUpRight size={14} />
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom: Financials & Action Buttons */}
                  <div className="pt-3 border-t border-zinc-100 flex items-center justify-between mt-2">
                    <div className="text-xs">
                      {cost > 0 && (
                        <span className="font-bold text-zinc-900 block leading-tight">
                          ${cost.toFixed(2)}
                        </span>
                      )}
                      {refund > 0 && (
                        <span className="text-[10px] text-emerald-600 font-semibold block">
                          Refund: ${refund.toFixed(2)}
                        </span>
                      )}
                      {cost === 0 && refund === 0 && (
                        <span className="text-[11px] text-zinc-400 italic">No cost recorded</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleQuickItemUpdate(item.id, { sample_received: !item.sample_received })}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                          item.sample_received
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                        }`}
                        title="Toggle received"
                      >
                        {item.sample_received ? 'Received' : 'Mark Recv'}
                      </button>

                      {!item.sample_returned && !item.sample_keep_item && (
                        <button
                          onClick={() => handleQuickItemUpdate(item.id, { sample_returned: true })}
                          className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                          title="Mark returned"
                        >
                          Return
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* QUICK SAMPLE EDIT MODAL */}
      <AnimatePresence>
        {editingItem && (
          <QuickSampleEditModal
            item={editingItem}
            onClose={() => setEditingItem(null)}
            onSave={async (updatedFields) => {
              setIsUpdating(true);
              try {
                const res = await fetch(`/api/deck-items/${editingItem.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(updatedFields)
                });
                if (!res.ok) throw new Error('Failed to update sample details');
                setEditingItem(null);
                showToast('Sample details updated successfully');
                await onRefresh();
              } catch (err: any) {
                alert('Save error: ' + err.message);
              } finally {
                setIsUpdating(false);
              }
            }}
            onZoomImage={onZoomImage}
          />
        )}
      </AnimatePresence>

      {/* Lightbox Image Zoom */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
            onClick={() => setLightboxImage(null)}
          >
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-6 right-6 text-white/80 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
            >
              <X size={24} />
            </button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={lightboxImage}
              alt="Zoomed preview"
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
              onClick={e => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Quick Sample Edit Modal Component
function QuickSampleEditModal({
  item,
  onClose,
  onSave,
  onZoomImage
}: {
  item: SampleFlatItem;
  onClose: () => void;
  onSave: (fields: any) => Promise<void>;
  onZoomImage?: (url: string) => void;
}) {
  const [sampleOrdered, setSampleOrdered] = useState(item.sample_ordered !== false);
  const [sampleReceived, setSampleReceived] = useState(item.sample_received || false);
  const [sampleKeepItem, setSampleKeepItem] = useState(item.sample_keep_item || false);
  const [sampleReturnByDate, setSampleReturnByDate] = useState(item.sample_return_by_date || '');
  const [sampleReturned, setSampleReturned] = useState(item.sample_returned || false);
  const [sampleReturnCost, setSampleReturnCost] = useState(item.sample_return_cost?.toString() || '');
  const [sampleReturnTrackingNumber, setSampleReturnTrackingNumber] = useState(item.sample_return_tracking_number || '');
  const [sampleCost, setSampleCost] = useState(item.sample_cost?.toString() || '');
  const [sampleRefundAmount, setSampleRefundAmount] = useState(item.sample_refund_amount?.toString() || '');
  const [sampleReceiptUrl, setSampleReceiptUrl] = useState(item.sample_receipt_url || null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      setIsUploadingReceipt(true);
      reader.onloadend = async () => {
        try {
          const base64Str = reader.result as string;
          const uploadedUrl = await uploadImageToStorage(base64Str, 'mockups');
          setSampleReceiptUrl(uploadedUrl);
        } catch (err) {
          alert('Failed to upload receipt.');
        } finally {
          setIsUploadingReceipt(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave({
        sample_ordered: sampleOrdered,
        sample_received: sampleReceived,
        sample_keep_item: sampleKeepItem,
        sample_return_by_date: sampleKeepItem ? null : (sampleReturnByDate || null),
        sample_returned: sampleReturned,
        sample_return_cost: sampleReturnCost ? parseFloat(sampleReturnCost) : null,
        sample_return_tracking_number: sampleReturnTrackingNumber || null,
        sample_cost: sampleCost ? parseFloat(sampleCost) : null,
        sample_refund_amount: sampleRefundAmount ? parseFloat(sampleRefundAmount) : null,
        sample_receipt_url: sampleReceiptUrl
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-zinc-100 custom-scrollbar"
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-zinc-100 mb-5">
            <div>
              <span className="text-[10px] uppercase tracking-widest font-bold text-amber-600 mb-1 block">
                Edit Sample Tracking
              </span>
              <h3 className="font-bold text-zinc-900 text-lg leading-tight truncate max-w-sm">
                {item.garment_name}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Deck: {item.deck_name} • Client: {item.customer_name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-5">
            {/* Status Checkboxes */}
            <div className="space-y-3 bg-zinc-50 border border-zinc-200/80 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-zinc-900 block">Sample Ordered</span>
                  <span className="text-[10px] text-zinc-400">Mark if sample has been ordered</span>
                </div>
                <input
                  type="checkbox"
                  checked={sampleOrdered}
                  onChange={e => setSampleOrdered(e.target.checked)}
                  className="w-4 h-4 rounded text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-zinc-200/60">
                <div>
                  <span className="text-xs font-bold text-zinc-900 block">Sample Received</span>
                  <span className="text-[10px] text-zinc-400">Has the sample arrived at the studio?</span>
                </div>
                <input
                  type="checkbox"
                  checked={sampleReceived}
                  onChange={e => setSampleReceived(e.target.checked)}
                  className="w-4 h-4 rounded text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-zinc-200/60">
                <div>
                  <span className="text-xs font-bold text-zinc-900 block">Keep Item (No Return)</span>
                  <span className="text-[10px] text-zinc-400">Final studio purchase (will not be returned)</span>
                </div>
                <input
                  type="checkbox"
                  checked={sampleKeepItem}
                  onChange={e => setSampleKeepItem(e.target.checked)}
                  className="w-4 h-4 rounded text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-zinc-200/60">
                <div>
                  <span className="text-xs font-bold text-zinc-900 block">Sample Returned</span>
                  <span className="text-[10px] text-zinc-400">Mark when item has been shipped back</span>
                </div>
                <input
                  type="checkbox"
                  checked={sampleReturned}
                  onChange={e => setSampleReturned(e.target.checked)}
                  className="w-4 h-4 rounded text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                />
              </div>
            </div>

            {/* Return Date & Tracking */}
            {!sampleKeepItem && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 block">
                    Return By Date
                  </label>
                  <input
                    type="date"
                    value={sampleReturnByDate}
                    onChange={e => setSampleReturnByDate(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:border-zinc-400 outline-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 block">
                    Return Tracking #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1Z999999 or 94001000..."
                    value={sampleReturnTrackingNumber}
                    onChange={e => setSampleReturnTrackingNumber(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:border-zinc-400 outline-none font-mono"
                  />
                </div>
              </div>
            )}

            {/* Financials Breakdown */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-1 block">
                  Purchase Cost ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={sampleCost}
                  onChange={e => setSampleCost(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 outline-none"
                />
              </div>

              <div>
                <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-1 block">
                  Return Fee ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={sampleReturnCost}
                  onChange={e => setSampleReturnCost(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 outline-none"
                />
              </div>

              <div>
                <label className="text-[9px] uppercase tracking-widest font-bold text-emerald-600 mb-1 block">
                  Refund Recv ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={sampleRefundAmount}
                  onChange={e => setSampleRefundAmount(e.target.value)}
                  className="w-full bg-emerald-50/50 border border-emerald-200 rounded-xl px-3 py-2 text-xs font-semibold text-emerald-950 outline-none"
                />
              </div>
            </div>

            {/* Receipt Upload & Preview */}
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 block">
                Sample Receipt / Invoice
              </label>
              {sampleReceiptUrl ? (
                <div className="flex items-center justify-between border border-zinc-200 rounded-xl p-2.5 bg-zinc-50">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={16} className="text-zinc-500 shrink-0" />
                    <span className="text-xs font-medium text-zinc-800 truncate">
                      {sampleReceiptUrl.toLowerCase().includes('.pdf') ? 'PDF Invoice File' : 'Receipt Image'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (sampleReceiptUrl.toLowerCase().includes('.pdf')) {
                          window.open(sampleReceiptUrl, '_blank');
                        } else if (onZoomImage) {
                          onZoomImage(sampleReceiptUrl);
                        }
                      }}
                      className="text-xs font-bold text-zinc-900 hover:underline cursor-pointer"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => setSampleReceiptUrl(null)}
                      className="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label className="border-2 border-dashed border-zinc-200 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:bg-zinc-50 hover:border-zinc-300 transition-colors">
                  <FileText size={18} className="text-zinc-400" />
                  <span className="text-xs font-semibold text-zinc-700">
                    {isUploadingReceipt ? 'Uploading receipt...' : 'Upload receipt or invoice'}
                  </span>
                  <span className="text-[10px] text-zinc-400">PNG, JPG, or PDF</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleReceiptUpload}
                    className="hidden"
                    disabled={isUploadingReceipt}
                  />
                </label>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-zinc-600 hover:text-zinc-900 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || isUploadingReceipt}
                className="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
