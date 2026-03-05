import React, { useState, useEffect, useRef } from 'react';
import useMeasure from 'react-use-measure';
import {
  Menu, X, ChevronRight, Plus, Upload, Image as ImageIcon,
  Users, Layout, Presentation, Trash2, Save, Wand2, ArrowLeft,
  Search, ShoppingBag, Maximize2, Minimize2, Sparkles, RotateCw, Camera,
  Grid, List, Edit2, ArrowUp, ArrowDown, Sun, Moon, Info
} from 'lucide-react';
import { motion, AnimatePresence, useMotionValue } from 'motion/react';
import { generateMockup, generateModelScene } from './services/geminiService';

function HoverTooltip({ content }: { content: string }) {
  return (
    <div className="relative inline-flex items-center ml-2 group -mt-1">
      <Info size={14} className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-help" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-zinc-900 border border-zinc-700 text-white text-[10px] leading-relaxed p-3 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] text-center pointer-events-none normal-case font-normal tracking-normal">
        {content}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-900" />
      </div>
    </div>
  );
}

export type Category = 'Athleisure' | 'Executive' | 'Auto-Industry';
export type Gender = 'Male' | 'Female' | 'Accessories';
export type GarmentType = 'Tops' | 'Bottom' | 'Headwear' | 'Bags' | 'Tumblers' | 'Other';

export interface Garment {
  id: number;
  name: string;
  description: string;
  price: number;
  category: Category;
  gender: Gender;
  type: GarmentType;
  image: string;
  images?: string[];
  supplier_link?: string;
}

export interface Customer {
  id: number;
  name: string;
  company: string;
}

export interface CustomerAsset {
  id: string;
  customer_id: number;
  image: string;
}

export interface Deck {
  id: number;
  customer_id: number;
  name: string;
  customer_name?: string;
  items?: DeckItem[];
}

export interface DeckItem {
  id: number;
  deck_id: number;
  garment_id?: number | null;
  mock_image: string;
  garment_name?: string;
  garment_description?: string;
  garment_price?: number;
  original_image?: string;
  custom_name?: string;
  custom_description?: string;
  custom_price?: number;
  custom_sizes?: string;
  variations?: string[];
  order_index?: number;
  category?: string;
  gender?: string;
  type?: string;
  supplier_link?: string | null;
}

type View = 'catalog' | 'admin' | 'customers' | 'deck-view' | 'mockup-studio' | 'presentation' | 'shared-presentation';

const compressImageIfNeeded = async (base64Str: string): Promise<string> => {
  // If it's already under ~800KB (base64 length < 1M), return as-is
  if (base64Str.length < 1000000) return base64Str;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      const maxDim = 1024;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = (height / width) * maxDim;
          width = maxDim;
        } else {
          width = (width / height) * maxDim;
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Use white background for transparent PNGs before converting to JPEG
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
      }
      // Compress to JPEG to dramatically reduce size
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = base64Str;
  });
};

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check local storage or system preference on initial load
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const [view, setView] = useState<View>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('deck')) {
        return 'shared-presentation';
      }
    }
    return 'catalog';
  });
  const [selectedCategory, setSelectedCategory] = useState<Category | ''>('Athleisure');
  const [selectedGender, setSelectedGender] = useState<Gender | ''>('');
  const [selectedType, setSelectedType] = useState<GarmentType | ''>('');

  const [garments, setGarments] = useState<Garment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [currentDeck, setCurrentDeck] = useState<Deck | null>(null);
  const [selectedGarment, setSelectedGarment] = useState<Garment | null>(null);
  const [selectedDeckItem, setSelectedDeckItem] = useState<DeckItem | null>(null);

  const [isDeckSelectorOpen, setIsDeckSelectorOpen] = useState(false);
  const [isNewDeckModalOpen, setIsNewDeckModalOpen] = useState(false);
  const [garmentToAddToDeck, setGarmentToAddToDeck] = useState<Garment | null>(null);
  const [pendingMockupImage, setPendingMockupImage] = useState<string | null>(null);
  const [showPricing, setShowPricing] = useState(true);
  const [allDecks, setAllDecks] = useState<(Deck & { customer_name: string })[]>([]);

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    fetchGarments();
    fetchCustomers();

    const params = new URLSearchParams(window.location.search);
    const sharedDeckId = params.get('deck');

    if (sharedDeckId) {
      if (!currentDeck) {
        fetch(`/api/decks/${sharedDeckId}`)
          .then(res => res.json())
          .then(deck => {
            if (deck && deck.id) {
              setCurrentDeck(deck);
              setView('shared-presentation');
              if (params.get('pricing') === 'off') {
                setShowPricing(false);
              }
            }
          })
          .catch(err => console.error("Could not load shared deck:", err));
      }
    } else {
      // Auto-select first deck if available
      fetch('/api/customers')
        .then(res => res.json())
        .then(customers => {
          if (customers.length > 0) {
            fetch(`/api/customers/${customers[0].id}/decks`)
              .then(res => res.json())
              .then(decks => {
                if (decks.length > 0) {
                  fetch(`/api/decks/${decks[0].id}`)
                    .then(res => res.json())
                    .then(setCurrentDeck);
                }
              });
          }
        });
    }
  }, [selectedCategory, selectedGender, selectedType]);

  const fetchGarments = async () => {
    const res = await fetch(`/api/garments?category=${selectedCategory}&gender=${selectedGender}&type=${selectedType}`);
    const data = await res.json();
    setGarments(data);
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers');
      if (!res.ok) throw new Error('Failed to fetch customers');
      const data = await res.json();
      setCustomers(data);
      fetchAllDecks(data);
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const fetchAllDecks = async (customersList: Customer[]) => {
    try {
      const decksPromises = customersList.map(async (c: Customer) => {
        const res = await fetch(`/api/customers/${c.id}/decks`);
        const decks = await res.json();
        return decks.map((d: Deck) => ({ ...d, customer_name: c.company }));
      });

      const decksResults = await Promise.all(decksPromises);
      setAllDecks(decksResults.flat());
    } catch (err) {
      console.error('Error fetching all decks:', err);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = formData.get('name') as string;
    const company = formData.get('company') as string;

    if (!company) {
      alert('Please fill in company name');
      return;
    }

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, company })
      });

      if (res.ok) {
        await fetchCustomers();
        form.reset();
      } else {
        const errorData = await res.json();
        alert(`Error: ${errorData.message || 'Failed to create customer'}`);
      }
    } catch (err) {
      alert('Network error. Please try again.');
    }
  };

  const handleUpdateCustomer = async (id: number, name: string, company: string) => {
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, company })
      });
      if (res.ok) {
        await fetchCustomers();
      } else {
        const errorData = await res.json();
        alert(`Error: ${errorData.message || 'Failed to update customer'}`);
      }
    } catch (err) {
      alert('Network error. Please try again.');
    }
  };

  const handleDeleteCustomer = async (customer: Customer) => {
    if (!window.confirm(`Are you sure you want to delete ${customer.company}? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/customers/${customer.id}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedCustomer?.id === customer.id) {
          setSelectedCustomer(null);
          setCurrentDeck(null);
        }
        await fetchCustomers();
      } else {
        const errorData = await res.json();
        alert(`Error: ${errorData.message || 'Failed to delete customer'}`);
      }
    } catch (err) {
      console.error('Error deleting customer:', err);
      alert('Network error. Please try again.');
    }
  };

  const handleDeleteGarment = async (garment: Garment) => {
    if (!window.confirm(`Are you sure you want to delete ${garment.name}? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/garments/${garment.id}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedGarment?.id === garment.id) {
          setSelectedGarment(null);
        }
        await fetchGarments();
      } else {
        const errorData = await res.json();
        alert(`Error: ${errorData.message || 'Failed to delete garment'}`);
      }
    } catch (err) {
      console.error('Error deleting garment:', err);
      alert('Network error. Please try again.');
    }
  };

  const handleCreateDeck = async (customerId: number, name: string) => {
    if (!name || name.trim() === '') return;

    try {
      const res = await fetch('/api/decks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: customerId, name: name.trim() })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to create deck');
      }

      const data = await res.json();

      const deckRes = await fetch(`/api/decks/${data.id}`);
      if (!deckRes.ok) {
        throw new Error('Failed to fetch new deck details');
      }

      const deckData = await deckRes.json();
      setCurrentDeck(deckData);
      setIsNewDeckModalOpen(false);
      setView('deck-view');
      fetchCustomers();
    } catch (err) {
      console.error('Error creating deck:', err);
      alert('Failed to create deck. Please try again.');
    }
  };

  const addToDeck = async (garment: Garment, deckId?: number, customImage?: string) => {
    const targetDeckId = deckId || currentDeck?.id;

    if (!targetDeckId) {
      alert('Please select a client and deck first in the "Customers" tab.');
      setView('customers');
      return;
    }

    try {
      const res = await fetch(`/api/decks/${targetDeckId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          garment_id: garment.id,
          mock_image: customImage || garment.image,
          order_index: currentDeck?.items?.length || 0
        })
      });

      if (res.ok) {
        const deckRes = await fetch(`/api/decks/${targetDeckId}`);
        const deckData = await deckRes.json();

        if (currentDeck?.id === targetDeckId) {
          setCurrentDeck(deckData);
        }

        // Refresh all decks to update counts
        fetchCustomers();

        // Visual feedback
        return true;
      }
    } catch (err) {
      console.error('Error adding to deck:', err);
      alert('Failed to add to deck. Please try again.');
    }
    return false;
  };

  const handleAddToDeckWithSelection = async (garment: Garment, deck: Deck, customImage?: string) => {
    const success = await addToDeck(garment, deck.id, customImage);
    if (success) {
      setIsDeckSelectorOpen(false);
      setGarmentToAddToDeck(null);
      setPendingMockupImage(null);

      if (view === 'mockup-studio') {
        setView('deck-view');
        // The deckData is already set in addToDeck if it's the current deck
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      {view !== 'shared-presentation' && (
        <header className="border-b border-zinc-100 dark:border-zinc-800 sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md z-50">
          <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 -ml-2">
                {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <div className="hidden md:flex items-center gap-6">
                <button
                  onClick={() => setView('catalog')}
                  className={`nav-link ${view === 'catalog' ? 'text-zinc-900 dark:text-zinc-50' : ''}`}
                >
                  Collection
                </button>
                <button
                  onClick={() => setView('customers')}
                  className={`nav-link ${view === 'customers' ? 'text-zinc-900 dark:text-zinc-50' : ''}`}
                >
                  Customers
                </button>
              </div>
            </div>

            <div className="absolute left-1/2 -translate-x-1/2">
              <h1 className="font-serif text-2xl tracking-widest uppercase">WOVN</h1>
            </div>

            <div className="flex items-center gap-4">
              {currentDeck && (
                <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-zinc-50 dark:bg-zinc-900 rounded-full border border-zinc-100 dark:border-zinc-800">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 dark:text-zinc-400">Active Deck:</span>
                  <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-900 dark:text-zinc-50">{currentDeck.name}</span>
                </div>
              )}
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
              >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <Search size={20} className="text-zinc-400 dark:text-zinc-500 cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors" />
              <div
                className="relative cursor-pointer group"
                onClick={() => { if (currentDeck) setView('deck-view'); else setView('customers'); }}
              >
                <ShoppingBag size={20} className="text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-50 transition-colors" />
                {currentDeck && (
                  <span className="absolute -top-1 -right-1 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {currentDeck.items?.length || 0}
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Side Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/20 dark:bg-black/20 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-80 bg-white dark:bg-zinc-950 z-[70] shadow-2xl p-8 overflow-y-auto"
            >
              <div className="flex flex-col gap-12">
                <section>
                  <h3 className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-6 font-bold">Category</h3>
                  <div className="flex flex-col gap-4">
                    {['Athleisure', 'Executive', 'Auto-Industry'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => { setSelectedCategory(selectedCategory === cat ? '' : cat as Category); setView('catalog'); }}
                        className={`text-left text-lg font-serif ${selectedCategory === cat ? 'italic underline underline-offset-8' : 'opacity-60 hover:opacity-100 transition-opacity'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-6 font-bold">Gender</h3>
                  <div className="flex flex-col gap-4">
                    {['Male', 'Female', 'Accessories'].map((gen) => (
                      <button
                        key={gen}
                        onClick={() => { setSelectedGender(selectedGender === gen ? '' : gen as Gender); setView('catalog'); }}
                        className={`text-left text-lg font-serif ${selectedGender === gen ? 'italic underline underline-offset-8' : 'opacity-60 hover:opacity-100 transition-opacity'}`}
                      >
                        {gen}
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-6 font-bold">Type</h3>
                  <div className="flex flex-col gap-4">
                    {['Tops', 'Bottom', 'Headwear', 'Bags', 'Tumblers', 'Other'].map((t) => (
                      <button
                        key={t}
                        onClick={() => { setSelectedType(selectedType === t ? '' : t as GarmentType); setView('catalog'); }}
                        className={`text-left text-lg font-serif ${selectedType === t ? 'italic underline underline-offset-8' : 'opacity-60 hover:opacity-100 transition-opacity'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1">
        {view === 'catalog' && (
          <CatalogView
            garments={garments}
            category={selectedCategory}
            gender={selectedGender}
            type={selectedType}
            currentDeck={currentDeck}
            onSelectGarment={(g) => { setSelectedGarment(g); setSelectedDeckItem(null); setView('mockup-studio'); }}
            onAddToDeck={(g) => { setGarmentToAddToDeck(g); setIsDeckSelectorOpen(true); }}
            onDeleteGarment={handleDeleteGarment}
            onAddGarment={() => setView('admin')}
          />
        )}
        {view === 'admin' && <AdminView onGarmentAdded={fetchGarments} />}
        {view === 'customers' && (
          <CustomersView
            customers={customers}
            onAddCustomer={handleCreateCustomer}
            onSelectCustomer={(c) => { setSelectedCustomer(c); }}
            onDeleteCustomer={handleDeleteCustomer}
            onViewDeck={(d) => { setCurrentDeck(d); setView('deck-view'); }}
            onCreateDeck={() => setIsNewDeckModalOpen(true)}
            onUpdateCustomer={handleUpdateCustomer}
          />
        )}
        {view === 'deck-view' && currentDeck && (
          <DeckPresentationView
            deck={currentDeck}
            showPricing={showPricing}
            setShowPricing={setShowPricing}
            onBack={() => setView('customers')}
            onGarmentClick={(g, item) => {
              setSelectedGarment(g);
              setSelectedDeckItem(item);
              setView('mockup-studio');
            }}
            onPresent={() => setView('presentation')}
            onRemoveItem={async (itemId) => {
              if (confirm('Are you sure you want to remove this item from the deck?')) {
                const res = await fetch(`/api/deck-items/${itemId}`, { method: 'DELETE' });
                if (res.ok) {
                  const deckRes = await fetch(`/api/decks/${currentDeck.id}`);
                  const deckData = await deckRes.json();
                  setCurrentDeck(deckData);
                  fetchCustomers(); // Refresh all decks counts
                }
              }
            }}
          />
        )}
        {view === 'presentation' && currentDeck && (
          <PresentationMode
            deck={currentDeck}
            onClose={() => setView('deck-view')}
            showPricing={showPricing}
          />
        )}
        {view === 'shared-presentation' && currentDeck && (
          <PresentationMode
            deck={currentDeck}
            onClose={() => { }}
            showPricing={showPricing}
            isSharedView={true}
          />
        )}
        {view === 'mockup-studio' && selectedGarment && (
          <MockupStudio
            garment={selectedGarment}
            deck={currentDeck}
            onBack={() => setView(selectedDeckItem ? 'deck-view' : 'catalog')}
            onSave={async (newImage, isVariation) => {
              try {
                const compressedImage = await compressImageIfNeeded(newImage);
                if (selectedDeckItem) {
                  const updates: any = {};
                  if (isVariation) {
                    updates.variations = [...(selectedDeckItem.variations || []), compressedImage];
                  } else {
                    updates.mock_image = compressedImage;
                  }
                  const res = await fetch(`/api/deck-items/${selectedDeckItem.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updates)
                  });
                  if (res.ok) {
                    const deckRes = await fetch(`/api/decks/${currentDeck!.id}`);
                    const deckData = await deckRes.json();
                    setCurrentDeck(deckData);
                    alert('Mockup saved to deck!');
                    setView('deck-view');
                  } else {
                    const errMsg = await res.text();
                    alert(`Failed to save mockup: ${res.status} ${errMsg}`);
                  }
                } else {
                  setPendingMockupImage(compressedImage);
                  setGarmentToAddToDeck(selectedGarment);
                  setIsDeckSelectorOpen(true);
                }
              } catch (err) {
                console.error(err);
                alert('An error occurred while saving the mockup.');
              }
            }}
          />
        )}
      </main>

      <AnimatePresence>
        {isNewDeckModalOpen && selectedCustomer && (
          <DeckModal
            onClose={() => setIsNewDeckModalOpen(false)}
            onConfirm={(name) => handleCreateDeck(selectedCustomer.id, name)}
          />
        )}
        {isDeckSelectorOpen && garmentToAddToDeck && (
          <DeckSelectorModal
            decks={allDecks}
            garment={garmentToAddToDeck}
            onClose={() => {
              setIsDeckSelectorOpen(false);
              setGarmentToAddToDeck(null);
              setPendingMockupImage(null);
            }}
            onSelect={(deck) => handleAddToDeckWithSelection(garmentToAddToDeck, deck, pendingMockupImage || undefined)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CatalogView({ garments, category, gender, type, currentDeck, onSelectGarment, onAddToDeck, onDeleteGarment, onAddGarment }: {
  garments: Garment[],
  category: string,
  gender: string,
  type: string,
  currentDeck: Deck | null,
  onSelectGarment: (g: Garment) => void,
  onAddToDeck: (g: Garment) => void,
  onDeleteGarment: (g: Garment) => void,
  onAddGarment: () => void
}) {
  const [viewingGarment, setViewingGarment] = useState<Garment | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [sortOrder, setSortOrder] = useState<"default" | "asc" | "desc">("default");

  const displayedGarments = [...garments];
  if (sortOrder === 'asc') {
    displayedGarments.sort((a, b) => a.price - b.price);
  } else if (sortOrder === 'desc') {
    displayedGarments.sort((a, b) => b.price - a.price);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 md:mb-16 gap-4 md:gap-8">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2 font-bold">
            {[category, gender].filter(Boolean).join(' / ') || 'All Garments'}
          </p>
          <h2 className="editorial-title">{type || 'Collection'}</h2>
        </div>
        <div className="flex flex-col md:items-end gap-4">
          <p className="text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 max-w-md text-sm leading-relaxed md:text-right">
            Our curated collection of high-performance garments designed for the modern professional.
            Each piece is selected for its quality, durability, and aesthetic appeal.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={onAddGarment}
              className="bg-zinc-900 dark:bg-zinc-50 text-white px-4 py-2 rounded-full text-[10px] uppercase font-bold tracking-widest hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-sm"
            >
              + Garment
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-bold">Sort By</span>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="bg-transparent border-b border-zinc-200 dark:border-zinc-700 py-1 text-sm font-medium focus:outline-none focus:border-zinc-900 dark:border-zinc-50 cursor-pointer text-zinc-700"
              >
                <option value="default">Default</option>
                <option value="asc">Price: Low to High</option>
                <option value="desc">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12 md:gap-y-16">
        {displayedGarments.map((garment) => (
          <motion.div
            key={garment.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group cursor-pointer"
            onClick={() => { setViewingGarment(garment); setActiveImageIndex(0); }}
          >
            <div className="aspect-[3/4] bg-white dark:bg-zinc-950 mb-6 overflow-hidden relative">
              <img
                src={garment.image}
                alt={garment.name}
                className="w-full h-full object-contain p-4 transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 dark:bg-black/0 group-hover:bg-black/10 dark:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteGarment(garment); }}
                  className="absolute top-4 right-4 bg-white/80 dark:bg-zinc-950/80 hover:bg-red-50 hover:text-red-500 text-zinc-400 dark:text-zinc-500 p-2 rounded-full transition-all"
                  title="Delete Garment"
                >
                  <Trash2 size={16} />
                </button>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); onAddToDeck(garment); }}
                    className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 px-6 py-3 text-xs uppercase tracking-widest font-bold hover:bg-zinc-900 dark:bg-zinc-50 hover:text-white transition-colors"
                  >
                    {currentDeck ? 'Add to Deck' : 'Select Deck'}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-serif text-xl mb-1">{garment.name}</h3>
                <p className="text-zinc-400 dark:text-zinc-500 text-xs uppercase tracking-widest">{garment.category}</p>
              </div>
              <p className="font-medium">${garment.price}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {garments.length === 0 && (
        <div className="py-32 text-center border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-3xl">
          <ImageIcon className="mx-auto text-zinc-200 dark:text-zinc-700 mb-4" size={48} />
          <p className="text-zinc-400 dark:text-zinc-500 font-serif italic">No garments found matching your filters.</p>
        </div>
      )}

      <AnimatePresence>
        {viewingGarment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 dark:bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4 md:p-6"
            onClick={() => setViewingGarment(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white dark:bg-zinc-950 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="md:w-1/2 bg-white dark:bg-zinc-950 flex flex-col p-6 md:p-12 min-h-[30vh] md:min-h-[40vh]">
                <div className="flex-1 mb-6 relative min-h-[300px]">
                  <img src={viewingGarment.images && viewingGarment.images.length > 0 ? viewingGarment.images[activeImageIndex] : viewingGarment.image} alt={viewingGarment.name} className="absolute inset-0 w-full h-full object-contain" />
                </div>
                {viewingGarment.images && viewingGarment.images.length > 1 && (
                  <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
                    {viewingGarment.images.map((img, i) => (
                      <button key={i} onClick={() => setActiveImageIndex(i)} className={`flex-shrink-0 w-20 h-24 rounded-lg overflow-hidden border-2 transition-all ${activeImageIndex === i ? 'border-zinc-900 dark:border-zinc-50 border-2' : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'}`}>
                        <img src={img} className="w-full h-full object-cover bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-50" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="md:w-1/2 p-6 md:p-12 flex flex-col max-h-[60vh] md:max-h-[90vh] overflow-y-auto">
                <div className="flex justify-end mb-2 md:mb-4">
                  <button onClick={() => setViewingGarment(null)} className="p-2 hover:bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-50 rounded-full transition-colors">
                    <X size={24} />
                  </button>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-bold mb-2 md:mb-3">{viewingGarment.category} / {viewingGarment.type} / {viewingGarment.gender}</p>
                  <h2 className="font-serif text-3xl md:text-5xl mb-4 md:mb-6 leading-tight">{viewingGarment.name}</h2>
                  <p className="text-2xl md:text-3xl font-medium mb-6 md:mb-8">${viewingGarment.price}</p>

                  {viewingGarment.supplier_link && (
                    <a href={viewingGarment.supplier_link} target="_blank" rel="noopener noreferrer" className="inline-block text-xs uppercase tracking-widest font-bold text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:text-zinc-50 transition-colors mb-6 border-b border-zinc-200 dark:border-zinc-700 hover:border-zinc-900 dark:border-zinc-50 pb-1">
                      Procurement Source ↗
                    </a>
                  )}

                  <p className="text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 text-sm md:text-lg leading-relaxed mb-8 md:mb-12 py-4 md:py-6 border-t border-zinc-100 dark:border-zinc-800">
                    {viewingGarment.description}
                  </p>

                  <div className="flex flex-col gap-4">
                    <button
                      onClick={() => {
                        onAddToDeck(viewingGarment);
                        setViewingGarment(null);
                      }}
                      className="w-full bg-zinc-900 dark:bg-zinc-50 text-white px-8 py-5 text-sm uppercase tracking-widest font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors rounded-full shadow-lg"
                    >
                      {currentDeck ? 'Add to Deck' : 'Select Deck'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AdminView({ onGarmentAdded }: { onGarmentAdded: () => void }) {
  const [images, setImages] = useState<string[]>([]);
  const [existingGarments, setExistingGarments] = useState<Garment[]>([]);
  const [editingGarment, setEditingGarment] = useState<Garment | null>(null);
  const [librarySortBy, setLibrarySortBy] = useState<'default' | 'category' | 'gender' | 'type'>('default');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterGender, setFilterGender] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');

  const filteredAndSortedGarments = [...existingGarments]
    .filter(g => {
      if (filterCategory && g.category !== filterCategory) return false;
      if (filterGender && g.gender !== filterGender) return false;
      if (filterType && g.type !== filterType) return false;
      return true;
    })
    .sort((a, b) => {
      if (librarySortBy === 'category') return (a.category || '').localeCompare(b.category || '');
      if (librarySortBy === 'gender') return (a.gender || '').localeCompare(b.gender || '');
      if (librarySortBy === 'type') return (a.type || '').localeCompare(b.type || '');
      return 0;
    });

  const fetchExisting = () => {
    fetch('/api/garments').then(res => res.json()).then(setExistingGarments);
  };

  useEffect(() => {
    fetchExisting();
  }, []);

  const handleEditClick = (g: Garment) => {
    setEditingGarment(g);
    setImages(g.images && g.images.length > 0 ? g.images : [g.image]);
  };

  const handleCancelEdit = () => {
    setEditingGarment(null);
    setImages([]);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 800; // Compress image to fit well within limits
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
          }
          setImages(prev => [...prev, canvas.toDataURL('image/jpeg', 0.8)]);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSetMainImage = (index: number) => {
    setImages(prev => {
      if (index === 0) return prev;
      const newImages = [...prev];
      const temp = newImages[0];
      newImages[0] = newImages[index];
      newImages[index] = temp;
      return newImages;
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (images.length === 0) {
      alert('Please upload at least one image.');
      return;
    }
    const form = e.currentTarget;
    const formData = new FormData(form);
    const data = {
      name: formData.get('name'),
      description: formData.get('description'),
      price: parseFloat(formData.get('price') as string),
      category: formData.get('category'),
      gender: formData.get('gender'),
      type: formData.get('type'),
      supplier_link: formData.get('supplier_link'),
      image: images[0],
      images: images
    };

    if (editingGarment) {
      const res = await fetch(`/api/garments/${editingGarment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        alert('Garment updated successfully!');
        onGarmentAdded();
        fetchExisting();
        handleCancelEdit();
      } else {
        const errText = await res.text();
        alert(`Failed to update garment: ${res.status} ${errText}`);
      }
    } else {
      const res = await fetch('/api/garments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        alert('Garment added successfully!');
        onGarmentAdded();
        fetchExisting();
        setImages([]);
        form.reset();
      } else {
        const errText = await res.text();
        alert(`Failed to add garment: ${res.status} ${errText}`);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="flex justify-between items-center mb-8 md:mb-12">
        <h2 className="editorial-title">{editingGarment ? 'Edit Garment' : 'New Garment'}</h2>
        {editingGarment && (
          <button type="button" onClick={handleCancelEdit} className="text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:text-zinc-50 transition-colors uppercase text-xs tracking-widest font-bold">
            Cancel Edit
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-16">
        <div className="lg:col-span-1 border-r border-zinc-100 dark:border-zinc-800 pr-0 lg:pr-8">
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-widest font-bold">Existing Library</h3>
              <select
                value={librarySortBy}
                onChange={(e) => setLibrarySortBy(e.target.value as any)}
                className="bg-transparent border-b border-zinc-200 dark:border-zinc-700 py-1 text-[10px] uppercase font-bold focus:outline-none focus:border-zinc-900 dark:border-zinc-50 cursor-pointer text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 w-24"
              >
                <option value="default">Sort: Default</option>
                <option value="category">Sort: Category</option>
                <option value="gender">Sort: Gender</option>
                <option value="type">Sort: Type</option>
              </select>
            </div>
            <div className="flex gap-2 text-[9px] uppercase font-bold text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="bg-transparent border-b border-zinc-200 dark:border-zinc-700 py-2 flex-1 focus:outline-none focus:border-zinc-900 dark:border-zinc-50 cursor-pointer">
                <option value="">All Categories</option>
                <option value="Athleisure">Athleisure</option>
                <option value="Executive">Executive</option>
                <option value="Auto-Industry">Auto-Industry</option>
              </select>
              <select value={filterGender} onChange={e => setFilterGender(e.target.value)} className="bg-transparent border-b border-zinc-200 dark:border-zinc-700 py-2 flex-1 focus:outline-none focus:border-zinc-900 dark:border-zinc-50 cursor-pointer">
                <option value="">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Accessories">Accessories</option>
              </select>
              <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-transparent border-b border-zinc-200 dark:border-zinc-700 py-2 flex-1 focus:outline-none focus:border-zinc-900 dark:border-zinc-50 cursor-pointer">
                <option value="">All Types</option>
                <option value="Tops">Tops</option>
                <option value="Bottom">Bottom</option>
                <option value="Headwear">Headwear</option>
                <option value="Bags">Bags</option>
                <option value="Tumblers">Tumblers</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
            {filteredAndSortedGarments.map(g => (
              <div key={g.id} onClick={() => handleEditClick(g)} className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-colors ${editingGarment?.id === g.id ? 'bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700' : 'hover:bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-50'}`}>
                <img src={g.image} alt={g.name} className="w-12 h-12 object-cover rounded-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700" />
                <div>
                  <p className="font-serif text-sm truncate">{g.name}</p>
                  <p className="text-[10px] uppercase text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">{g.category}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2">
          <form key={editingGarment?.id || 'new'} onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <div className="space-y-4">
              <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500 block">Garment Images</label>
              <div className="grid grid-cols-2 gap-4">
                {images.map((img, i) => (
                  <div key={i} className="aspect-[3/4] bg-white dark:bg-zinc-950 border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group">
                    <img src={img} className="w-full h-full object-contain p-2" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(i)}
                      className="absolute top-2 right-2 bg-white/80 dark:bg-zinc-950/80 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={16} className="text-red-500" />
                    </button>
                    {i === 0 ? (
                      <div className="absolute bottom-2 left-2 bg-zinc-900 dark:bg-zinc-50 text-white text-[8px] font-bold px-2 py-1 rounded-md uppercase tracking-widest z-10 shadow-md">Main</div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetMainImage(i)}
                        className="absolute bottom-2 left-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 text-[8px] font-bold px-2 py-1 rounded-md uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-50 shadow-md"
                      >
                        Set Main
                      </button>
                    )}
                  </div>
                ))}

                <label className="aspect-[3/4] bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-50 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl cursor-pointer hover:bg-zinc-100 dark:bg-zinc-800 transition-colors flex flex-col items-center justify-center p-4">
                  <Upload className="mx-auto text-zinc-400 dark:text-zinc-500 mb-2" size={24} />
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 font-medium text-center">Add Photo</span>
                  <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
                </label>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500 mb-2 block">Garment Name</label>
                <input name="name" required className="w-full border-b border-zinc-200 dark:border-zinc-700 py-2 focus:border-zinc-900 dark:border-zinc-50 outline-none transition-colors" defaultValue={editingGarment?.name || ""} placeholder="e.g. Camo Lightweight Puffer" />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500 mb-2 block">Supplier Link (Optional)</label>
                <input name="supplier_link" type="url" className="w-full border-b border-zinc-200 dark:border-zinc-700 py-2 focus:border-zinc-900 dark:border-zinc-50 outline-none transition-colors" defaultValue={editingGarment?.supplier_link || ""} placeholder="https://supplier.com/item" />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500 mb-2 block">Description</label>
                <textarea name="description" rows={3} className="w-full border-b border-zinc-200 dark:border-zinc-700 py-2 focus:border-zinc-900 dark:border-zinc-50 outline-none transition-colors resize-none" defaultValue={editingGarment?.description || ""} placeholder="Garment details..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500 mb-2 block">Price (USD)</label>
                  <input name="price" type="number" step="0.01" required className="w-full border-b border-zinc-200 dark:border-zinc-700 py-2 focus:border-zinc-900 dark:border-zinc-50 outline-none transition-colors" defaultValue={editingGarment?.price || ""} placeholder="219.00" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500 mb-2 block">Category</label>
                  <select name="category" className="w-full border-b border-zinc-200 dark:border-zinc-700 py-2 focus:border-zinc-900 dark:border-zinc-50 outline-none transition-colors bg-transparent" defaultValue={editingGarment?.category || "Athleisure"}>
                    <option>Athleisure</option>
                    <option>Executive</option>
                    <option>Auto-Industry</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500 mb-2 block">Gender</label>
                  <select name="gender" className="w-full border-b border-zinc-200 dark:border-zinc-700 py-2 focus:border-zinc-900 dark:border-zinc-50 outline-none transition-colors bg-transparent" defaultValue={editingGarment?.gender || "Male"}>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Accessories</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500 mb-2 block">Type</label>
                  <select name="type" className="w-full border-b border-zinc-200 dark:border-zinc-700 py-2 focus:border-zinc-900 dark:border-zinc-50 outline-none transition-colors bg-transparent" defaultValue={editingGarment?.type || "Tops"}>
                    <option>Tops</option>
                    <option>Bottom</option>
                    <option>Headwear</option>
                    <option>Bags</option>
                    <option>Tumblers</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="w-full bg-zinc-900 dark:bg-zinc-50 text-white py-4 text-xs uppercase tracking-widest font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors mt-8">
                {editingGarment ? 'Save Changes' : 'Add to Catalog'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function CustomersView({ customers, onAddCustomer, onSelectCustomer, onDeleteCustomer, onViewDeck, onCreateDeck, onUpdateCustomer }: {
  customers: Customer[],
  onAddCustomer: (e: React.FormEvent<HTMLFormElement>) => void,
  onSelectCustomer: (c: Customer) => void,
  onDeleteCustomer: (c: Customer) => void,
  onViewDeck: (d: Deck) => void,
  onCreateDeck: (customerId: number) => void,
  onUpdateCustomer: (id: number, name: string, company: string) => void
}) {
  const [selectedCustId, setSelectedCustId] = useState<number | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [assets, setAssets] = useState<CustomerAsset[]>([]);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [isUploadingAsset, setIsUploadingAsset] = useState(false);

  useEffect(() => {
    if (selectedCustId) {
      Promise.all([
        fetch(`/api/customers/${selectedCustId}/decks`).then(res => res.json()),
        fetch(`/api/customers/${selectedCustId}/assets`).then(res => res.json())
      ]).then(([decksData, assetsData]) => {
        setDecks(decksData);
        setAssets(assetsData);
      });
    }
  }, [selectedCustId]);

  const handleUploadAsset = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedCustId) {
      setIsUploadingAsset(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const compressed = await compressImageIfNeeded(reader.result as string);
          const res = await fetch(`/api/customers/${selectedCustId}/assets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: compressed })
          });
          if (res.ok) {
            const newAsset = await res.json();
            setAssets(prev => [...prev, newAsset]);
          }
        } catch (err) {
          alert('Failed to upload asset');
        } finally {
          setIsUploadingAsset(false);
          if (e.target) e.target.value = '';
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!selectedCustId || !confirm('Delete this asset?')) return;
    try {
      const res = await fetch(`/api/customers/${selectedCustId}/assets/${assetId}`, { method: 'DELETE' });
      if (res.ok) {
        setAssets(prev => prev.filter(a => a.id !== assetId));
      }
    } catch (err) {
      alert('Failed to delete asset');
    }
  };

  const handleRenameDeck = async (newName: string) => {
    if (!editingDeck) return;
    try {
      const res = await fetch(`/api/decks/${editingDeck.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });
      if (res.ok) {
        setDecks(prev => prev.map(d => d.id === editingDeck.id ? { ...d, name: newName } : d));
        setEditingDeck(null);
      } else {
        alert('Failed to rename deck');
      }
    } catch {
      alert('Network error. Please try again.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-16">
        <div className="lg:col-span-1">
          <h2 className="editorial-title mb-8">Clients</h2>
          <form onSubmit={onAddCustomer} className="space-y-6 mb-12 p-6 bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-50 rounded-2xl">
            <h3 className="text-xs uppercase tracking-widest font-bold mb-4">New Customer</h3>
            <input name="name" placeholder="Contact Name (Optional)" className="w-full bg-transparent border-b border-zinc-200 dark:border-zinc-700 py-2 outline-none focus:border-zinc-900 dark:border-zinc-50" />
            <input name="company" required placeholder="Company Name" className="w-full bg-transparent border-b border-zinc-200 dark:border-zinc-700 py-2 outline-none focus:border-zinc-900 dark:border-zinc-50" />
            <button type="submit" className="w-full bg-zinc-900 dark:bg-zinc-50 text-white py-3 text-[10px] uppercase tracking-widest font-bold">Add Client</button>
          </form>

          <div className="space-y-2">
            {[...customers].sort((a, b) => a.company.localeCompare(b.company)).map(c => (
              <div key={c.id} className="relative group/card">
                <button
                  onClick={() => { setSelectedCustId(c.id); onSelectCustomer(c); }}
                  className={`w-full text-left p-4 rounded-xl transition-all flex items-center justify-between group-hover/card:pr-12 ${selectedCustId === c.id ? 'bg-zinc-900 dark:bg-zinc-50 text-white' : 'hover:bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-50'}`}
                >
                  <div>
                    <p className="font-serif text-lg">{c.company}</p>
                    <p className={`text-xs ${selectedCustId === c.id ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-500 dark:text-zinc-400 dark:text-zinc-500'}`}>{c.name || <span className="italic opacity-50">No contact name</span>}</p>
                  </div>
                  <ChevronRight size={16} className={selectedCustId === c.id ? 'text-white' : 'text-zinc-300'} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteCustomer(c);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-zinc-400 dark:text-zinc-500 opacity-0 group-hover/card:opacity-100 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                  title="Delete Client"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedCustId ? (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="editorial-title">{customers.find(c => c.id === selectedCustId)?.company}</h2>
                    <button
                      onClick={() => setEditingCustomer(customers.find(c => c.id === selectedCustId) || null)}
                      className="p-2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:text-zinc-50 hover:bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-50 rounded-full transition-colors"
                      title="Edit Client Profile"
                    >
                      <Edit2 size={24} />
                    </button>
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 mt-2 text-lg">
                    Contact: {customers.find(c => c.id === selectedCustId)?.name ? <span className="font-medium text-zinc-900 dark:text-zinc-50">{customers.find(c => c.id === selectedCustId)?.name}</span> : <span className="italic text-zinc-400 dark:text-zinc-500">Not provided</span>}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (selectedCustId !== null) {
                      onCreateDeck(selectedCustId);
                    } else {
                      alert('Please select a client first.');
                    }
                  }}
                  className="flex items-center gap-2 bg-zinc-900 dark:bg-zinc-50 text-white px-6 py-3 rounded-full text-xs uppercase tracking-widest font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-lg active:scale-95"
                >
                  <Plus size={16} /> New Deck
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {decks.map(d => (
                  <div
                    key={d.id}
                    className="group border border-zinc-100 dark:border-zinc-800 rounded-[2rem] p-6 md:p-8 hover:border-zinc-900 dark:border-zinc-50 transition-colors cursor-pointer"
                    onClick={() => onViewDeck(d)}
                  >
                    <div className="flex items-center justify-between mb-6 md:mb-8">
                      <div className="p-3 bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-50 rounded-2xl group-hover:bg-zinc-900 dark:bg-zinc-50 group-hover:text-white transition-colors">
                        <Presentation size={24} />
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500">Presentation</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingDeck(d);
                          }}
                          className="p-1.5 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:text-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                          title="Rename Presentation"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    </div>
                    <h3 className="font-serif text-2xl mb-2">{d.name}</h3>
                    <p className="text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 text-sm">Curated garment selection for client review.</p>
                  </div>
                ))}
                {decks.length === 0 && (
                  <div className="col-span-full py-24 text-center border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-3xl">
                    <Layout className="mx-auto text-zinc-200 dark:text-zinc-700 mb-4" size={48} />
                    <p className="text-zinc-400 dark:text-zinc-500 font-serif italic">No decks created for this client yet.</p>
                  </div>
                )}
              </div>

              <div className="mt-16 sm:mt-24 pt-12 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="editorial-title text-2xl">Asset Vault</h3>
                    <p className="text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 text-sm mt-1">Stored logos and assets for {customers.find(c => c.id === selectedCustId)?.company}.</p>
                  </div>
                  <label className={`flex items-center gap-2 px-6 py-3 rounded-full text-xs uppercase tracking-widest font-bold transition-all shadow-sm ${isUploadingAsset ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed' : 'bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 hover:border-zinc-900 dark:border-zinc-50 cursor-pointer'}`}>
                    {isUploadingAsset ? <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" /> : <Upload size={16} />}
                    {isUploadingAsset ? 'Uploading' : 'Upload Asset'}
                    <input type="file" className="hidden" accept="image/*" onChange={handleUploadAsset} disabled={isUploadingAsset} />
                  </label>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {assets.map(asset => (
                    <div key={asset.id} className="aspect-square bg-checkerboard border border-zinc-100 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group hover:border-zinc-300 transition-colors">
                      <img src={asset.image} className="w-full h-full object-contain p-4 transition-transform group-hover:scale-105" />
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteAsset(asset.id); }}
                        className="absolute top-2 right-2 p-2 bg-white/90 dark:bg-zinc-950/90 backdrop-blur shadow-sm rounded-full text-zinc-400 dark:text-zinc-500 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all pointer-events-auto"
                        title="Remove Asset"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {assets.length === 0 && !isUploadingAsset && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-2xl bg-zinc-50/50">
                      <ImageIcon className="mx-auto text-zinc-300 mb-3" size={32} />
                      <p className="text-zinc-400 dark:text-zinc-500 font-serif italic text-sm">No assets uploaded to the vault yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-[2rem] bg-zinc-50/50">
              <Users className="text-zinc-300 mb-6" size={48} />
              <h3 className="editorial-title text-3xl mb-2 text-zinc-400 dark:text-zinc-500">Select a Client</h3>
              <p className="text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 font-serif italic">Choose a client from the list to view their decks and assets.</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {editingCustomer && (
          <EditCustomerModal
            customer={editingCustomer}
            onClose={() => setEditingCustomer(null)}
            onSave={(name, company) => {
              onUpdateCustomer(editingCustomer.id, name, company);
              setEditingCustomer(null);
            }}
          />
        )}
        {editingDeck && (
          <DeckModal
            initialName={editingDeck.name}
            onClose={() => setEditingDeck(null)}
            onConfirm={handleRenameDeck}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function EditCustomerModal({ customer, onClose, onSave }: {
  customer: Customer,
  onClose: () => void,
  onSave: (name: string, company: string) => void
}) {
  const [name, setName] = useState(customer.name || '');
  const [company, setCompany] = useState(customer.company || '');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 dark:bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-white dark:bg-zinc-950 rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 md:p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500 mb-1">Client Profile</p>
            <h3 className="font-serif text-2xl">Edit Client</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-50 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500">Company Name</label>
            <input
              value={company}
              onChange={e => setCompany(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-50 border-none rounded-xl p-4 text-sm outline-none focus:ring-2 ring-zinc-900 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500">Contact Name (Optional)</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-50 border-none rounded-xl p-4 text-sm outline-none focus:ring-2 ring-zinc-900 transition-all"
              placeholder="Add contact name later..."
            />
          </div>
        </div>

        <div className="p-6 md:p-8 border-t border-zinc-100 dark:border-zinc-800 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-50 text-zinc-900 dark:text-zinc-50 py-4 rounded-full text-xs uppercase tracking-widest font-bold hover:bg-zinc-100 dark:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(name, company)}
            className="flex-1 bg-zinc-900 dark:bg-zinc-50 text-white py-4 rounded-full text-xs uppercase tracking-widest font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function DeckPresentationView({ deck, onBack, onGarmentClick, onPresent, onRemoveItem, showPricing, setShowPricing }: {
  deck: Deck,
  onBack: () => void,
  onGarmentClick: (g: Garment, item: DeckItem) => void,
  onPresent: () => void,
  onRemoveItem: (itemId: number) => void,
  showPricing: boolean,
  setShowPricing: (show: boolean) => void
}) {
  const [items, setItems] = useState<DeckItem[]>(deck.items || []);
  const [displayMode, setDisplayMode] = useState<'presentation' | 'grid'>('grid');
  const [editingItem, setEditingItem] = useState<DeckItem | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [activeVariations, setActiveVariations] = useState<Record<number, string>>({});
  const [generatingSceneForItem, setGeneratingSceneForItem] = useState<DeckItem | null>(null);

  const fetchItems = () => {
    fetch(`/api/decks/${deck.id}`)
      .then(res => res.json())
      .then(data => setItems(data.items));
  };

  useEffect(() => {
    fetchItems();
  }, [deck.id]);

  const [sortBy, setSortBy] = useState<'default' | 'category' | 'gender' | 'type'>('default');

  const displayedItems = [...items].sort((a, b) => {
    if (sortBy === 'default') return (a.order_index || 0) - (b.order_index || 0);
    if (sortBy === 'category') return (a.category || '').localeCompare(b.category || '');
    if (sortBy === 'gender') return (a.gender || '').localeCompare(b.gender || '');
    if (sortBy === 'type') return (a.type || '').localeCompare(b.type || '');
    return 0;
  });

  const handleMoveItem = async (itemId: number, direction: 'up' | 'down') => {
    if (sortBy !== 'default') return;
    const currentIndex = items.findIndex(i => i.id === itemId);
    if (currentIndex < 0) return;

    const newItems = [...items];
    if (direction === 'up' && currentIndex > 0) {
      [newItems[currentIndex - 1], newItems[currentIndex]] = [newItems[currentIndex], newItems[currentIndex - 1]];
    } else if (direction === 'down' && currentIndex < newItems.length - 1) {
      [newItems[currentIndex + 1], newItems[currentIndex]] = [newItems[currentIndex], newItems[currentIndex + 1]];
    } else {
      return;
    }

    newItems.forEach((item, idx) => item.order_index = idx);
    setItems(newItems);

    await fetch(`/api/decks/${deck.id}/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: newItems.map(i => ({ id: i.id, order_index: i.order_index })) })
    });
  };

  const handleMockupEdit = (item: DeckItem) => {
    onGarmentClick({
      id: item.garment_id || 0,
      name: item.custom_name || item.garment_name || 'Custom Item',
      description: item.custom_description || item.garment_description || '',
      price: item.custom_price || item.garment_price || 0,
      image: item.original_image || item.mock_image,
      category: (item.category as Category) || 'Athleisure',
      gender: (item.gender as Gender) || 'Male',
      type: (item.type as GarmentType) || 'Tops'
    }, item);
  };

  const handleSaveDetails = async (itemId: number, details: any) => {
    const res = await fetch(`/api/deck-items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(details)
    });
    if (res.ok) {
      fetchItems();
      setEditingItem(null);
    } else {
      throw new Error(await res.text());
    }
  };

  const handleSaveModelScene = async (img: string) => {
    if (!generatingSceneForItem) return;

    try {
      const compressedImg = await compressImageIfNeeded(img);
      const updatedVariations = [...(generatingSceneForItem.variations || []), compressedImg];
      await handleSaveDetails(generatingSceneForItem.id, {
        ...generatingSceneForItem,
        variations: updatedVariations
      });
      setGeneratingSceneForItem(null);
    } catch (err) {
      console.error(err);
      alert('Failed to save generated scene. The server might have rejected the file size or the network was interrupted.');
    }
  };

  const handleUploadExternal = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Str = reader.result as string;
        try {
          const compressed = await compressImageIfNeeded(base64Str);
          const res = await fetch(`/api/decks/${deck.id}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              garment_id: null,
              mock_image: compressed,
              order_index: items.length
            })
          });
          if (res.ok) {
            fetchItems();
          }
        } catch (err) {
          alert('Failed to upload custom item.');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50/50">
      <AnimatePresence>
        {generatingSceneForItem && (
          <ModelSceneGeneratorModal
            item={generatingSceneForItem}
            baseImage={activeVariations[generatingSceneForItem.id] || generatingSceneForItem.mock_image}
            onClose={() => setGeneratingSceneForItem(null)}
            onSave={handleSaveModelScene}
          />
        )}
      </AnimatePresence>
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:text-zinc-50 transition-colors mb-8 md:mb-12">
          <ArrowLeft size={16} /> Back to Clients
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 md:mb-20 gap-6 md:gap-8">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2 font-bold">Presentation Deck</p>
            <h2 className="editorial-title">{deck.name}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-4 md:mt-0">
            <div className="flex items-center gap-2 mr-4">
              <span className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-bold">Sort By:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent border-b border-zinc-200 dark:border-zinc-700 py-1 text-sm font-medium focus:outline-none focus:border-zinc-900 dark:border-zinc-50 cursor-pointer text-zinc-700"
              >
                <option value="default">Custom Order</option>
                <option value="category">Category</option>
                <option value="gender">Gender</option>
                <option value="type">Type</option>
              </select>
            </div>
            <div className="flex items-center gap-2 mr-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 p-1 rounded-full shadow-sm">
              <button
                onClick={() => setShowPricing(!showPricing)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all text-[10px] uppercase tracking-widest font-bold ${showPricing ? 'bg-zinc-900 dark:bg-zinc-50 text-white' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600'}`}
              >
                {showPricing ? 'Pricing On' : 'Pricing Off'}
              </button>
              <button
                onClick={() => setDisplayMode('presentation')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all text-[10px] uppercase tracking-widest font-bold ${displayMode === 'presentation' ? 'bg-zinc-900 dark:bg-zinc-50 text-white' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600'}`}
              >
                <List size={14} /> Presentation
              </button>
              <button
                onClick={() => setDisplayMode('grid')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all text-[10px] uppercase tracking-widest font-bold ${displayMode === 'grid' ? 'bg-zinc-900 dark:bg-zinc-50 text-white' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600'}`}
              >
                <Grid size={14} /> Grid
              </button>
            </div>
            <label className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 px-6 py-4 rounded-full text-xs uppercase tracking-widest font-bold hover:border-zinc-900 dark:border-zinc-50 transition-colors cursor-pointer flex items-center gap-2">
              <Upload size={14} /> Custom Item
              <input type="file" className="hidden" accept="image/*" onChange={handleUploadExternal} />
            </label>
            <button
              onClick={() => {
                const url = `${window.location.origin}${window.location.pathname}?deck=${deck.id}&pricing=${showPricing ? 'on' : 'off'}`;
                navigator.clipboard.writeText(url).then(() => {
                  alert('Share link copied to clipboard!');
                }).catch(() => {
                  alert('Failed to copy link. Please manually copy: ' + url);
                });
              }}
              className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 px-8 py-4 rounded-full text-xs uppercase tracking-widest font-bold hover:border-zinc-900 dark:border-zinc-50 transition-colors"
            >
              Share Link
            </button>
            <button
              onClick={() => onPresent()}
              className="bg-zinc-900 dark:bg-zinc-50 text-white px-8 py-4 rounded-full text-xs uppercase tracking-widest font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
            >
              Present View
            </button>
          </div>
        </div>

        {displayMode === 'presentation' ? (
          <div className="grid grid-cols-1 gap-16 md:gap-32">
            {displayedItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`flex flex-col ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} gap-8 md:gap-16 items-center`}
              >
                <div className="flex-1 w-full">
                  <div className="aspect-[4/5] bg-white dark:bg-zinc-950 shadow-2xl rounded-[2rem] overflow-hidden relative group">
                    <img
                      src={activeVariations[item.id] || item.mock_image}
                      alt={item.garment_name}
                      onClick={() => setZoomedImage(activeVariations[item.id] || item.mock_image)}
                      className="w-full h-full object-contain p-4 md:p-8 cursor-zoom-in"
                    />
                    <div className="absolute top-4 right-4 md:top-8 md:right-8 flex flex-col gap-2 md:gap-3 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all transform md:translate-x-4 group-hover:translate-x-0 pointer-events-none">
                      <button
                        onClick={() => handleMockupEdit(item)}
                        className="bg-white/90 dark:bg-zinc-950/90 backdrop-blur p-3 md:p-4 rounded-full shadow-lg hover:bg-zinc-900 dark:bg-zinc-50 hover:text-white transition-colors pointer-events-auto"
                        title="Edit Mockup"
                      >
                        <Wand2 size={20} />
                      </button>
                      <button
                        onClick={() => setGeneratingSceneForItem(item)}
                        className="bg-white/90 dark:bg-zinc-950/90 backdrop-blur p-3 md:p-4 rounded-full shadow-lg hover:bg-zinc-900 dark:bg-zinc-50 hover:text-white transition-colors pointer-events-auto"
                        title="Generate Scene"
                      >
                        <Camera size={20} />
                      </button>
                      <button
                        onClick={() => setEditingItem(item)}
                        className="bg-white/90 dark:bg-zinc-950/90 backdrop-blur p-4 rounded-full shadow-lg hover:bg-zinc-900 dark:bg-zinc-50 hover:text-white transition-colors pointer-events-auto"
                        title="Edit Details"
                      >
                        <Edit2 size={20} />
                      </button>
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="bg-white/90 dark:bg-zinc-950/90 backdrop-blur p-4 rounded-full shadow-lg hover:bg-red-500 hover:text-white transition-colors pointer-events-auto"
                        title="Remove from Deck"
                      >
                        <Trash2 size={20} />
                      </button>

                      {sortBy === 'default' && (
                        <>
                          {index > 0 && (
                            <button
                              onClick={() => handleMoveItem(item.id, 'up')}
                              className="bg-white/90 dark:bg-zinc-950/90 backdrop-blur p-4 rounded-full shadow-lg hover:bg-zinc-900 dark:bg-zinc-50 hover:text-white transition-colors pointer-events-auto"
                              title="Move Up"
                            >
                              <ArrowUp size={20} />
                            </button>
                          )}
                          {index < displayedItems.length - 1 && (
                            <button
                              onClick={() => handleMoveItem(item.id, 'down')}
                              className="bg-white/90 dark:bg-zinc-950/90 backdrop-blur p-4 rounded-full shadow-lg hover:bg-zinc-900 dark:bg-zinc-50 hover:text-white transition-colors pointer-events-auto"
                              title="Move Down"
                            >
                              <ArrowDown size={20} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex-1 space-y-8 max-w-lg">
                  <div className="space-y-4">
                    <p className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-bold">Item {index + 1}</p>
                    <h3 className="font-serif text-3xl md:text-5xl leading-tight">{item.custom_name || item.garment_name}</h3>
                    <p className="text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 text-base md:text-lg leading-relaxed">
                      {item.custom_description || item.garment_description}
                    </p>
                  </div>
                  <div className="pt-8 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                    {showPricing ? <p className="text-2xl font-medium">${item.custom_price || item.garment_price}</p> : <div />}
                    <div className="flex flex-wrap gap-2">
                      {(item.custom_sizes || 'XS,S,M,L,XL').split(',').map(size => (
                        <span key={size} className="px-3 h-10 border border-zinc-200 dark:border-zinc-700 rounded-full flex items-center justify-center text-[10px] font-bold text-zinc-900 dark:text-zinc-50">
                          {size}
                        </span>
                      ))}
                    </div>
                  </div>

                  {item.variations && item.variations.length > 0 && (
                    <div className="pt-8 border-t border-zinc-200 dark:border-zinc-700">
                      <p className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-bold mb-4">View Variation</p>
                      <div className="flex gap-2 lg:gap-3 flex-wrap">
                        <button
                          onClick={() => setActiveVariations(prev => ({ ...prev, [item.id]: item.mock_image }))}
                          className={`w-16 h-16 rounded-xl border-2 overflow-hidden transition-all p-1 bg-white dark:bg-zinc-950 ${(!activeVariations[item.id] || activeVariations[item.id] === item.mock_image) ? 'border-zinc-900 dark:border-zinc-50 shadow-sm scale-105' : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'}`}
                        >
                          <img src={item.mock_image} className="w-full h-full object-contain" />
                        </button>
                        {item.variations.map((v, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActiveVariations(prev => ({ ...prev, [item.id]: v }))}
                            className={`w-16 h-16 rounded-xl border-2 overflow-hidden transition-all p-1 bg-white dark:bg-zinc-950 ${activeVariations[item.id] === v ? 'border-zinc-900 dark:border-zinc-50 shadow-sm scale-105' : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'}`}
                          >
                            <img src={v} className="w-full h-full object-contain" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
            {displayedItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="group"
              >
                <div className="aspect-[3/4] bg-white dark:bg-zinc-950 rounded-2xl overflow-hidden relative mb-4 shadow-sm border border-zinc-100 dark:border-zinc-800">
                  <img
                    src={activeVariations[item.id] || item.mock_image}
                    onClick={() => setZoomedImage(activeVariations[item.id] || item.mock_image)}
                    className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105 cursor-zoom-in"
                  />
                  <div className="absolute inset-0 bg-black/0 dark:bg-black/0 group-hover:bg-black/20 dark:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                    <div className="flex flex-wrap justify-center gap-2 pointer-events-auto px-4 w-full">
                      <button
                        onClick={() => handleMockupEdit(item)}
                        className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 p-3 rounded-full shadow-lg hover:bg-zinc-900 dark:bg-zinc-50 hover:text-white transition-colors"
                        title="Edit Mockup"
                      >
                        <Wand2 size={18} />
                      </button>
                      <button
                        onClick={() => setGeneratingSceneForItem(item)}
                        className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 p-3 rounded-full shadow-lg hover:bg-zinc-900 dark:bg-zinc-50 hover:text-white transition-colors"
                        title="Generate Scene"
                      >
                        <Camera size={18} />
                      </button>
                      <button
                        onClick={() => setEditingItem(item)}
                        className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 p-3 rounded-full shadow-lg hover:bg-zinc-900 dark:bg-zinc-50 hover:text-white transition-colors"
                        title="Edit Details"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 p-3 rounded-full shadow-lg hover:bg-red-500 hover:text-white transition-colors"
                        title="Remove from Deck"
                      >
                        <Trash2 size={18} />
                      </button>

                      {sortBy === 'default' && (
                        <>
                          {index > 0 && (
                            <button
                              onClick={() => handleMoveItem(item.id, 'up')}
                              className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 p-3 rounded-full shadow-lg hover:bg-zinc-900 dark:bg-zinc-50 hover:text-white transition-colors"
                              title="Move Up"
                            >
                              <ArrowUp size={18} />
                            </button>
                          )}
                          {index < displayedItems.length - 1 && (
                            <button
                              onClick={() => handleMoveItem(item.id, 'down')}
                              className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 p-3 rounded-full shadow-lg hover:bg-zinc-900 dark:bg-zinc-50 hover:text-white transition-colors"
                              title="Move Down"
                            >
                              <ArrowDown size={18} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {item.variations && item.variations.length > 0 && (
                  <div className="flex gap-1.5 mb-3 px-1 overflow-x-auto hide-scrollbar">
                    <button
                      onClick={() => setActiveVariations(prev => ({ ...prev, [item.id]: item.mock_image }))}
                      className={`w-8 h-8 rounded border overflow-hidden p-0.5 transition-all flex-shrink-0 ${(!activeVariations[item.id] || activeVariations[item.id] === item.mock_image) ? 'border-zinc-900 dark:border-zinc-50 shadow-sm' : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'}`}
                    >
                      <img src={item.mock_image} className="w-full h-full object-contain" />
                    </button>
                    {item.variations.map((v, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveVariations(prev => ({ ...prev, [item.id]: v }))}
                        className={`w-8 h-8 rounded border overflow-hidden p-0.5 transition-all flex-shrink-0 ${activeVariations[item.id] === v ? 'border-zinc-900 dark:border-zinc-50 shadow-sm' : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'}`}
                      >
                        <img src={v} className="w-full h-full object-contain" />
                      </button>
                    ))}
                  </div>
                )}

                <h4 className="font-serif text-lg truncate">{item.custom_name || item.garment_name}</h4>
                <div className="flex items-center justify-between mt-1">
                  {showPricing ? <p className="text-zinc-400 dark:text-zinc-500 text-xs uppercase tracking-widest font-bold">${item.custom_price || item.garment_price}</p> : <div />}
                  {item.supplier_link && (
                    <a href={item.supplier_link} target="_blank" rel="noopener noreferrer" className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:text-zinc-50 border-b border-transparent hover:border-zinc-900 dark:border-zinc-50 transition-colors" onClick={(e) => e.stopPropagation()}>
                      Link
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
            {items.length === 0 && (
              <div className="col-span-full py-24 text-center border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-3xl">
                <p className="text-zinc-400 dark:text-zinc-500 font-serif italic">This deck is empty. Add some garments from the catalog!</p>
              </div>
            )}
          </div>
        )
        }
      </div >

      <AnimatePresence>
        {editingItem && (
          <EditItemModal
            item={editingItem}
            onClose={() => setEditingItem(null)}
            onSave={(details) => handleSaveDetails(editingItem.id, details)}
          />
        )}
        {zoomedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 dark:bg-black/95 z-[120] flex items-center justify-center p-4 md:p-12 cursor-zoom-out"
            onClick={() => setZoomedImage(null)}
          >
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={zoomedImage}
              className="w-full h-full object-contain"
            />
            <button
              className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors"
              onClick={() => setZoomedImage(null)}
            >
              <X size={32} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div >
  );
}

function EditItemModal({ item, onClose, onSave }: {
  item: DeckItem,
  onClose: () => void,
  onSave: (details: any) => void
}) {
  const [name, setName] = useState(item.custom_name || item.garment_name || '');
  const [description, setDescription] = useState(item.custom_description || item.garment_description || '');
  const [price, setPrice] = useState(item.custom_price?.toString() || item.garment_price?.toString() || '');
  const [sizes, setSizes] = useState(item.custom_sizes || 'XS,S,M,L,XL');
  const [mockImage, setMockImage] = useState(item.mock_image);
  const [variations, setVariations] = useState<string[]>(item.variations || []);

  const handleImageReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Str = reader.result as string;
        try {
          const compressed = await compressImageIfNeeded(base64Str);
          setMockImage(compressed);
        } catch (err) {
          alert('Failed to process image.');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddVariation = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Str = reader.result as string;
        try {
          const compressed = await compressImageIfNeeded(base64Str);
          setVariations([...variations, compressed]);
        } catch (err) {
          alert('Failed to process variation image.');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 dark:bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-white dark:bg-zinc-950 rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 md:p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500 mb-1">Client Customization</p>
            <h3 className="font-serif text-2xl">Edit Item Details</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-50 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <div className="space-y-6">
              <div className="aspect-[3/4] bg-white dark:bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 flex items-center justify-center p-4 relative group">
                <img src={mockImage} className="w-full h-full object-contain" />
                <label className="absolute inset-0 bg-black/40 dark:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <div className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 px-6 py-3 rounded-full text-[10px] uppercase tracking-widest font-bold flex items-center gap-2">
                    <Upload size={14} /> Replace Main Photo
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageReplace} />
                </label>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500">Variations (Colors/Mockups)</p>
                <div className="flex flex-wrap gap-2">
                  {variations.map((v, i) => (
                    <div key={i} className="w-16 h-16 border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden relative group">
                      <img src={v} className="w-full h-full object-contain p-1" />
                      <button
                        title="Remove Variation"
                        onClick={() => setVariations(variations.filter((_, index) => index !== i))}
                        className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={12} />
                      </button>
                      <button
                        title="Set as Main Image"
                        onClick={() => {
                          setMockImage(v);
                          setVariations(variations.map((val, idx) => idx === i ? mockImage : val));
                        }}
                        className="absolute top-0 right-0 p-1 bg-zinc-900 dark:bg-zinc-50 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-bl text-[8px] uppercase font-bold tracking-widest"
                      >
                        Main
                      </button>
                    </div>
                  ))}
                  <label className="w-16 h-16 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl flex items-center justify-center cursor-pointer hover:border-zinc-900 dark:border-zinc-50 transition-colors text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:text-zinc-50" title="Add Variation">
                    <Plus size={16} />
                    <input type="file" className="hidden" accept="image/*" onChange={handleAddVariation} />
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500">Display Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-50 border-none rounded-xl p-4 text-sm outline-none focus:ring-2 ring-zinc-900 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500">Price ($)</label>
                <input
                  type="number"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-50 border-none rounded-xl p-4 text-sm outline-none focus:ring-2 ring-zinc-900 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500">Size Spread (comma separated)</label>
                <input
                  value={sizes}
                  onChange={e => setSizes(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-50 border-none rounded-xl p-4 text-sm outline-none focus:ring-2 ring-zinc-900 transition-all"
                  placeholder="XS, S, M, L, XL"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-50 border-none rounded-xl p-4 text-sm outline-none focus:ring-2 ring-zinc-900 transition-all resize-none"
              rows={4}
            />
          </div>
        </div>

        <div className="p-6 md:p-8 border-t border-zinc-100 dark:border-zinc-800 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-50 text-zinc-900 dark:text-zinc-50 py-4 rounded-full text-xs uppercase tracking-widest font-bold hover:bg-zinc-100 dark:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave({
              custom_name: name,
              custom_description: description,
              custom_price: parseFloat(price),
              custom_sizes: sizes,
              mock_image: mockImage,
              variations: variations
            })}
            className="flex-1 bg-zinc-900 dark:bg-zinc-50 text-white py-4 rounded-full text-xs uppercase tracking-widest font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function MockupStudio({ garment, deck, onBack, onSave }: {
  garment: Garment,
  deck: Deck | null,
  onBack: () => void,
  onSave: (img: string, isVariation?: boolean) => void
}) {
  const [activeGarmentImage, setActiveGarmentImage] = useState<string>(
    garment.images && garment.images.length > 0 ? garment.images[0] : garment.image
  );
  const [logo, setLogo] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState('Place the logo realistically. Wrap it securely along the sleeve, hat curve, or fabric folds matching the angles as needed.');
  const [garmentColor, setGarmentColor] = useState('Original (No Change)');
  const [logoColor, setLogoColor] = useState('Original (No Change)');
  const [garmentView, setGarmentView] = useState('Front View (Default)');
  const [logoScale, setLogoScale] = useState(1);
  const [logoRotation, setLogoRotation] = useState(0);
  const [containerRef, bounds] = useMeasure();

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useMotionValue(0);
  const [vaultAssets, setVaultAssets] = useState<CustomerAsset[]>([]);

  useEffect(() => {
    if (deck?.customer_id) {
      fetch(`/api/customers/${deck.customer_id}/assets`)
        .then(res => res.json())
        .then(setVaultAssets);
    }
  }, [deck?.customer_id]);

  // Sync motion value with state for AI generation
  useEffect(() => {
    rotate.set(logoRotation);
  }, [logoRotation]);

  // Center logo when bounds are first measured
  useEffect(() => {
    if (bounds.width && bounds.height && x.get() === 0 && y.get() === 0) {
      x.set(0); // Already at 0 because of top-1/2 left-1/2
      y.set(0);
    }
  }, [bounds.width, bounds.height]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLogo(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const getCompositeImage = async (): Promise<string | null> => {
    if (!logo) return null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const garmentImg = new Image();
    garmentImg.crossOrigin = "anonymous";
    garmentImg.src = activeGarmentImage;

    await new Promise((resolve) => {
      garmentImg.onload = resolve;
    });

    canvas.width = garmentImg.naturalWidth;
    canvas.height = garmentImg.naturalHeight;

    // Draw garment
    ctx.drawImage(garmentImg, 0, 0);

    // Draw logo
    const logoImg = new Image();
    logoImg.src = logo;
    await new Promise((resolve) => {
      logoImg.onload = resolve;
    });

    const scale = Math.max(canvas.width / bounds.width, canvas.height / bounds.height);

    ctx.save();
    // Move to logo position
    // x and y are offsets from center
    const centerX = canvas.width / 2 + x.get() * scale;
    const centerY = canvas.height / 2 + y.get() * scale;

    ctx.translate(centerX, centerY);
    ctx.rotate((logoRotation * Math.PI) / 180);

    // Calculate logo dimensions respecting its own aspect ratio
    const logoAspectRatio = logoImg.naturalWidth / logoImg.naturalHeight;
    let drawW, drawH;

    if (logoAspectRatio > 1) {
      drawW = 128 * logoScale * scale;
      drawH = drawW / logoAspectRatio;
    } else {
      drawH = 128 * logoScale * scale;
      drawW = drawH * logoAspectRatio;
    }

    ctx.drawImage(logoImg, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    return canvas.toDataURL('image/png');
  };

  const handleGenerate = async () => {
    if (!logo) {
      alert('Please upload a customer logo first');
      return;
    }
    setIsGenerating(true);

    try {
      const compositeImage = await getCompositeImage();
      if (!compositeImage) throw new Error("Could not generate composite image");

      let prompt = customPrompt;
      if (garmentColor !== 'Original (No Change)') {
        prompt += ` Change the garment fabric color to ${garmentColor}, preserving all lighting and textures.`;
      }
      if (logoColor !== 'Original (No Change)') {
        prompt += ` Make the logo completely ${logoColor}.`;
      }

      if (garmentView !== 'Front View (Default)') {
        prompt += ` Rotate the garment to specifically display the ${garmentView.toLowerCase()} angle.`;
      }

      const isRotationRequested = garmentView !== 'Front View (Default)';
      const mockup = await generateMockup(activeGarmentImage, compositeImage, prompt, isRotationRequested);
      setResultImage(mockup);
    } catch (err) {
      console.error(err);
      alert('Failed to generate mockup. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveCurrentView = async () => {
    const dataUrl = await getCompositeImage();
    if (dataUrl) {
      onSave(dataUrl);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-8 h-[calc(100vh-80px)] flex flex-col">
      <button onClick={onBack} className="flex-shrink-0 flex items-center gap-2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:text-zinc-50 transition-colors mb-4 md:mb-6 w-max">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-start overflow-hidden min-h-0 border-b border-transparent">
        <div className="h-full w-full flex flex-col items-center justify-start lg:justify-center relative">
          <div
            ref={containerRef}
            className="aspect-[3/4] max-h-[80vh] lg:max-h-full w-full max-w-md lg:max-w-lg bg-white dark:bg-zinc-950 rounded-3xl overflow-hidden shadow-2xl relative border border-zinc-100 dark:border-zinc-800 cursor-crosshair mx-auto"
          >
            <img src={resultImage || activeGarmentImage} className="w-full h-full object-contain pointer-events-none" />

            {!resultImage && logo && (
              <motion.div
                drag
                dragMomentum={false}
                dragElastic={0}
                dragConstraints={containerRef}
                style={{ x, y, scale: logoScale, rotate }}
                className="absolute top-1/2 left-1/2 w-32 h-32 -ml-16 -mt-16 flex items-center justify-center cursor-move group z-10"
              >
                <div className="relative w-full h-full border-2 border-zinc-900 dark:border-zinc-50/0 group-hover:border-zinc-900 dark:border-zinc-50/50 transition-colors">
                  <img src={logo} className="w-full h-full object-contain drop-shadow-xl pointer-events-none" />

                  {/* Rotation Handle */}
                  <div
                    className="absolute -top-12 left-1/2 -translate-x-1/2 w-8 h-8 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-full flex items-center justify-center cursor-alias opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      const startX = e.clientX;
                      const startY = e.clientY;
                      const startRotation = logoRotation;

                      const onMouseMove = (moveEvent: MouseEvent) => {
                        const dx = moveEvent.clientX - startX;
                        const dy = moveEvent.clientY - startY;
                        // Simple rotation logic based on horizontal movement for demo
                        setLogoRotation(startRotation + dx);
                      };

                      const onMouseUp = () => {
                        window.removeEventListener('mousemove', onMouseMove);
                        window.removeEventListener('mouseup', onMouseUp);
                      };

                      window.addEventListener('mousemove', onMouseMove);
                      window.addEventListener('mouseup', onMouseUp);
                    }}
                  >
                    <RotateCw size={14} className="text-zinc-900 dark:text-zinc-50" />
                  </div>

                  {/* Scale Handle */}
                  <div
                    className="absolute -bottom-2 -right-2 w-4 h-4 bg-zinc-900 dark:bg-zinc-50 border-2 border-white rounded-sm cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      const startX = e.clientX;
                      const startScale = logoScale;

                      const onMouseMove = (moveEvent: MouseEvent) => {
                        const dx = moveEvent.clientX - startX;
                        setLogoScale(Math.max(0.1, startScale + dx / 100));
                      };

                      const onMouseUp = () => {
                        window.removeEventListener('mousemove', onMouseMove);
                        window.removeEventListener('mouseup', onMouseUp);
                      };

                      window.addEventListener('mousemove', onMouseMove);
                      window.addEventListener('mouseup', onMouseUp);
                    }}
                  />
                </div>

                <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-zinc-900 dark:bg-zinc-50 text-white text-[8px] px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest pointer-events-none whitespace-nowrap shadow-xl">
                  Drag to Position • Use Handles to Transform
                </div>
              </motion.div>
            )}

            {isGenerating && (
              <div className="absolute inset-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md flex flex-col items-center justify-center p-12 text-center z-50">
                <div className="w-16 h-16 border-4 border-zinc-900 dark:border-zinc-50 border-t-transparent rounded-full animate-spin mb-6"></div>
                <h3 className="font-serif text-2xl mb-2">Creating Realistic Mockup</h3>
                <p className="text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 text-sm">Our AI is meticulously placing the logo and adjusting lighting for a perfect result...</p>
              </div>
            )}
          </div>

          {!resultImage && logo && (
            <div className="flex items-center gap-6 bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-50 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800">
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500 flex items-center">
                    Scale <HoverTooltip content="Precisely scale the flat logo before baking." />
                  </span>
                  <span className="text-[10px] font-mono text-zinc-900 dark:text-zinc-50">{(logoScale * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="4"
                  step="0.01"
                  value={logoScale}
                  onChange={(e) => setLogoScale(parseFloat(e.target.value))}
                  className="w-full accent-zinc-900"
                />
              </div>

              <div className="w-px h-12 bg-zinc-200 dark:bg-zinc-700" />

              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500 flex items-center">
                    Rotation <HoverTooltip content="Spin the flat logo to match the angle of the garment surface." />
                  </span>
                  <span className="text-[10px] font-mono text-zinc-900 dark:text-zinc-50">{logoRotation.toFixed(0)}°</span>
                </div>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={logoRotation}
                  onChange={(e) => setLogoRotation(parseFloat(e.target.value))}
                  className="w-full accent-zinc-900"
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-12 h-full overflow-y-auto pr-2 pb-20 hide-scrollbar pt-2">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2 font-bold">Mockup Studio</p>
            <h2 className="editorial-title mb-4">Interactive Placement</h2>
            <p className="text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 leading-relaxed">
              Drag the logo to your desired position and adjust the scale.
              Our AI will then "bake" it into the garment, matching perspective and lighting perfectly.
            </p>
          </div>

          <div className="space-y-8">
            {garment.images && garment.images.length > 1 && (
              <section>
                <h3 className="text-xs uppercase tracking-widest font-bold mb-4">Select Garment Photo</h3>
                <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
                  {garment.images.map((img, i) => (
                    <button key={i} onClick={() => { setActiveGarmentImage(img); setResultImage(''); }} className={`flex-shrink-0 w-20 h-24 rounded-lg overflow-hidden border-2 transition-all ${activeGarmentImage === img ? 'border-zinc-900 dark:border-zinc-50 border-2' : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'}`}>
                      <img src={img} className="w-full h-full object-cover bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-50" />
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h3 className="text-xs uppercase tracking-widest font-bold mb-4 flex items-center">
                1. Customer Logo <HoverTooltip content="Upload a high-quality graphic (transparent PNG works best) to overlay on the garment." />
              </h3>
              <div className="flex items-center gap-6 mb-6">
                <div className="w-24 h-24 bg-checkerboard border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0">
                  {logo ? (
                    <img src={logo} className="w-full h-full object-contain p-2" />
                  ) : (
                    <ImageIcon className="text-zinc-200 dark:text-zinc-700" size={24} />
                  )}
                </div>
                <label className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 px-6 py-3 rounded-full text-[10px] uppercase tracking-widest font-bold cursor-pointer hover:border-zinc-900 dark:border-zinc-50 transition-colors flex-shrink-0">
                  Upload Logo
                  <input type="file" className="hidden" onChange={handleLogoUpload} accept="image/*" />
                </label>
              </div>

              {vaultAssets.length > 0 && (
                <div className="bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-50 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800">
                  <h4 className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 mb-3 flex items-center gap-2">
                    <Sparkles size={12} className="text-zinc-400 dark:text-zinc-500" />
                    Or Select from Asset Vault <HoverTooltip content="Quickly re-use logos previously uploaded and saved to this customer's profile." />
                  </h4>
                  <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                    {vaultAssets.map(asset => (
                      <button
                        key={asset.id}
                        onClick={() => setLogo(asset.image)}
                        className={`flex-shrink-0 w-16 h-16 bg-checkerboard border-2 rounded-xl flex items-center justify-center p-2 transition-all ${logo === asset.image ? 'border-zinc-900 dark:border-zinc-50 shadow-sm scale-105' : 'border-transparent hover:border-zinc-200 dark:border-zinc-700'}`}
                      >
                        <img src={asset.image} className="w-full h-full object-contain" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section>
              <h3 className="text-xs uppercase tracking-widest font-bold mb-4 flex items-center">
                2. Describe the Finish <HoverTooltip content="Optional details for the AI to follow (e.g. 'Faded vintage screenprint' or 'Thick 3D embroidery'). It will incorporate this lighting/texture." />
              </h3>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-50 border-none rounded-2xl p-4 text-sm outline-none focus:ring-2 ring-zinc-900 transition-all resize-none mb-6"
                rows={3}
                placeholder="e.g. High-quality silver embroidery, screen printed with a vintage fade..."
              />

              <h3 className="text-xs uppercase tracking-widest font-bold mb-4 flex items-center">
                3. Color Options <HoverTooltip content="Prompt the AI to realistically change the base color of the garment or graphic." />
              </h3>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500">Garment Color</label>
                  <select
                    value={garmentColor}
                    onChange={(e) => setGarmentColor(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-50 border-none rounded-xl p-4 text-sm outline-none focus:ring-2 ring-zinc-900 transition-all appearance-none cursor-pointer"
                  >
                    {[
                      'Original (No Change)', 'Black', 'White', 'Charcoal', 'Navy Blue',
                      'Royal Blue', 'Red', 'Maroon', 'Forest Green', 'Olive',
                      'Heather Grey', 'Cream', 'Pink', 'Yellow', 'Orange'
                    ].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500">Logo Color</label>
                  <select
                    value={logoColor}
                    onChange={(e) => setLogoColor(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-50 border-none rounded-xl p-4 text-sm outline-none focus:ring-2 ring-zinc-900 transition-all appearance-none cursor-pointer"
                  >
                    {[
                      'Original (No Change)', 'Black', 'White', 'Silver / Grey',
                      'Gold', 'Navy Blue', 'Red', 'Yellow', 'Green'
                    ].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <h3 className="text-xs uppercase tracking-widest font-bold mb-4 mt-6 flex items-center">
                4. Garment View <HoverTooltip content="Allow the AI to regenerate the garment from a completely different camera perspective to showcase sides or rear placements." />
              </h3>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500">Rotation / Perspective</label>
                  <select
                    value={garmentView}
                    onChange={(e) => setGarmentView(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-50 border-none rounded-xl p-4 text-sm outline-none focus:ring-2 ring-zinc-900 transition-all appearance-none cursor-pointer"
                  >
                    {[
                      'Front View (Default)', 'Back View', 'Left Side View', 'Right Side View', 'Slight Angle / Three-Quarter View'
                    ].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !logo}
                  className="flex-1 bg-zinc-900 dark:bg-zinc-50 text-white py-4 rounded-full text-xs uppercase tracking-widest font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Sparkles size={16} /> {isGenerating ? 'Generating...' : (resultImage ? 'Re-bake Mockup' : 'Bake Mockup')}
                </button>
                {resultImage && (
                  <button
                    onClick={() => setResultImage('')}
                    className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-900 dark:border-zinc-50 text-zinc-900 dark:text-zinc-50 py-4 rounded-full text-xs uppercase tracking-widest font-bold hover:bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-50 transition-colors flex items-center justify-center gap-2 animate-in fade-in"
                  >
                    <Edit2 size={16} /> Adjust Placement
                  </button>
                )}
              </div>

              {!resultImage && (
                <div className="flex flex-col sm:flex-row gap-4 mt-2">
                  {logo ? (
                    <>
                      <button
                        onClick={handleSaveCurrentView}
                        className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-900 dark:border-zinc-50 text-zinc-900 dark:text-zinc-50 py-4 rounded-full text-xs uppercase tracking-widest font-bold hover:bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-50 transition-colors flex items-center justify-center gap-2 animate-in fade-in"
                      >
                        <Save size={16} /> Quick Save
                      </button>
                      <button
                        onClick={async () => {
                          const dataUrl = await getCompositeImage();
                          if (dataUrl) {
                            onSave(dataUrl, true);
                          }
                        }}
                        className="flex-1 bg-emerald-600 border border-emerald-600 text-white py-4 rounded-full text-xs uppercase tracking-widest font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 animate-in fade-in shadow-sm"
                      >
                        <Save size={16} /> Save as Variant
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => onSave(activeGarmentImage)}
                        className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-900 dark:border-zinc-50 text-zinc-900 dark:text-zinc-50 py-4 rounded-full text-xs uppercase tracking-widest font-bold hover:bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-50 transition-colors flex items-center justify-center gap-2 animate-in fade-in"
                      >
                        <Save size={16} /> Save Blank
                      </button>
                      <button
                        onClick={() => onSave(activeGarmentImage, true)}
                        className="flex-1 bg-emerald-600 border border-emerald-600 text-white py-4 rounded-full text-xs uppercase tracking-widest font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 animate-in fade-in shadow-sm"
                      >
                        <Save size={16} /> Save Blank as Variant
                      </button>
                    </>
                  )}
                </div>
              )}

              {resultImage && (
                <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-2">
                  <button
                    onClick={() => onSave(resultImage)}
                    className="flex-1 bg-zinc-900 dark:bg-zinc-50 text-white py-4 rounded-full text-xs uppercase tracking-widest font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <Save size={16} /> Update Main Mockup
                  </button>
                  <button
                    onClick={() => onSave(resultImage, true)}
                    className="flex-1 bg-emerald-600 text-white py-4 rounded-full text-xs uppercase tracking-widest font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus size={16} /> Add as Variation
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModelSceneGeneratorModal({ item, baseImage, onClose, onSave }: {
  item: DeckItem,
  baseImage: string,
  onClose: () => void,
  onSave: (img: string) => void
}) {
  const [prompt, setPrompt] = useState('A professional fashion model walking down a sunny city street in New York, confident pose');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string>('');
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError('');
    try {
      const generated = await generateModelScene(baseImage, prompt);
      setResultImage(generated);
    } catch (err) {
      console.error(err);
      setError('Failed to generate scene. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 dark:bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-white dark:bg-zinc-950 rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 md:p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500 mb-1">AI Model Generator</p>
            <h3 className="font-serif text-2xl">Create Lifestyle Scene</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-50 dark:bg-zinc-900 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <div className="space-y-4">
              <div className="aspect-[3/4] bg-white dark:bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 flex items-center justify-center relative bg-checkerboard">
                <img src={resultImage || baseImage} className="w-full h-full object-contain p-2" />
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500">Describe Scene & Model</label>
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border-none rounded-xl p-4 text-sm outline-none focus:ring-2 ring-zinc-900 transition-all resize-none"
                  rows={5}
                />
              </div>

              {error && (
                <p className="text-red-500 text-xs font-medium">{error}</p>
              )}

              <div className="space-y-4 pt-4">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt}
                  className="w-full bg-zinc-900 dark:bg-zinc-50 text-white py-4 rounded-full text-xs uppercase tracking-widest font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Sparkles size={16} /> {isGenerating ? 'Generating...' : 'Generate New Scene'}
                </button>

                {resultImage && (
                  <button
                    onClick={() => onSave(resultImage)}
                    className="w-full bg-emerald-600 border border-emerald-600 text-white py-4 rounded-full text-xs uppercase tracking-widest font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 animate-in fade-in shadow-sm"
                  >
                    <Save size={16} /> Add as Variation to Item
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function DeckSelectorModal({ decks, garment, onClose, onSelect }: {
  decks: (Deck & { customer_name: string })[],
  garment: Garment,
  onClose: () => void,
  onSelect: (deck: Deck) => void
}) {
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);

  const groupedDecks = decks.reduce((acc, deck) => {
    if (!acc[deck.customer_name]) acc[deck.customer_name] = [];
    acc[deck.customer_name].push(deck);
    return acc;
  }, {} as Record<string, typeof decks>);

  const sortedCompanies = Object.keys(groupedDecks).sort((a, b) => a.localeCompare(b));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 dark:bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-white dark:bg-zinc-950 rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 md:p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500 mb-1">Add to Deck</p>
            <h3 className="font-serif text-2xl">Select Destination</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-50 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-50 flex items-center gap-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="w-16 h-16 bg-white dark:bg-zinc-950 rounded-xl overflow-hidden border border-zinc-100 dark:border-zinc-800 flex-shrink-0">
            <img src={garment.image} className="w-full h-full object-contain p-1" />
          </div>
          <div>
            <p className="font-medium text-sm">{garment.name}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">${garment.price}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {sortedCompanies.map(company => (
            <div key={company} className="border border-zinc-100 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
              <button
                onClick={() => setExpandedCompany(expandedCompany === company ? null : company)}
                className="w-full text-left p-6 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-50 transition-colors flex items-center justify-between"
              >
                <div className="flex flex-col">
                  <h4 className="font-serif text-2xl font-bold">{company}</h4>
                </div>
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-50">
                  {expandedCompany === company ? (
                    <X size={16} className="text-zinc-600" />
                  ) : (
                    <Plus size={16} className="text-zinc-600" />
                  )}
                </div>
              </button>
              <AnimatePresence>
                {expandedCompany === company && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden bg-zinc-50/50"
                  >
                    <div className="p-4 space-y-2 border-t border-zinc-100 dark:border-zinc-800">
                      {groupedDecks[company].map(deck => (
                        <button
                          key={deck.id}
                          onClick={() => onSelect(deck)}
                          className="w-full text-left p-4 rounded-xl bg-white dark:bg-zinc-950 hover:border-zinc-300 border border-zinc-100 dark:border-zinc-800 shadow-sm transition-all flex items-center justify-between group"
                        >
                          <span className="text-base font-medium text-zinc-600 group-hover:text-zinc-900 dark:text-zinc-50 transition-colors">{deck.name}</span>
                          <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            Select <ChevronRight size={12} />
                          </span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
          {decks.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-zinc-400 dark:text-zinc-500 font-serif italic text-sm">No decks found. Create one in the Customers tab.</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
function PresentationMode({ deck, onClose, showPricing, isSharedView = false }: { deck: Deck, onClose: () => void, showPricing: boolean, isSharedView?: boolean }) {
  const [items, setItems] = useState<DeckItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeVariations, setActiveVariations] = useState<Record<number, string>>({});

  useEffect(() => {
    fetch(`/api/decks/${deck.id}`)
      .then(res => res.json())
      .then(data => setItems(data.items));

    // Lock scroll
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, [deck.id]);

  const next = () => setCurrentIndex(prev => (prev + 1) % items.length);
  const prev = () => setCurrentIndex(prev => (prev - 1 + items.length) % items.length);

  if (items.length === 0) return null;

  const currentItem = items[currentIndex];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-white dark:bg-zinc-950 z-[100] flex flex-col"
    >
      <div className="flex items-center justify-between p-4 md:p-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-zinc-900 dark:bg-zinc-50 rounded-full flex items-center justify-center text-white font-serif">
            W
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500">
              Presentation Mode {deck.customer_name ? `• ${deck.customer_name}` : ''}
            </p>
            <h3 className="font-serif text-xl">{deck.name}</h3>
          </div>
        </div>
        {!isSharedView && (
          <button
            onClick={onClose}
            className="p-4 hover:bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-50 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center relative px-4 md:px-20 overflow-y-auto overflow-x-hidden py-12 md:py-0">
        <button
          onClick={prev}
          className="absolute left-2 md:left-8 z-10 p-2 md:p-4 hover:bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-50 rounded-full transition-colors bg-white/50 dark:bg-zinc-950/50 backdrop-blur md:bg-transparent md:backdrop-blur-none"
        >
          <ArrowLeft size={24} className="md:w-8 md:h-8" />
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col md:flex-row items-center gap-8 md:gap-20 max-w-6xl w-full my-8 md:my-0"
          >
            <div className="flex flex-col flex-1 w-full max-w-sm lg:max-w-md mx-auto gap-4">
              <div className="aspect-[3/4] max-h-[60vh] w-full mx-auto rounded-[2rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl bg-white dark:bg-zinc-950 flex items-center justify-center p-6 md:p-12">
                <img
                  src={activeVariations[currentItem.id] || currentItem.mock_image}
                  className="w-full h-full object-contain"
                />
              </div>

              {currentItem.variations && currentItem.variations.length > 0 && (
                <div className="flex gap-2 lg:gap-3 flex-wrap justify-center">
                  <button
                    onClick={() => setActiveVariations(prev => ({ ...prev, [currentItem.id]: currentItem.mock_image }))}
                    className={`w-16 h-16 rounded-xl border-2 overflow-hidden transition-all p-1 bg-white dark:bg-zinc-950 ${(!activeVariations[currentItem.id] || activeVariations[currentItem.id] === currentItem.mock_image) ? 'border-zinc-900 dark:border-zinc-50 shadow-sm scale-110' : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 opacity-70 hover:opacity-100'}`}
                  >
                    <img src={currentItem.mock_image} className="w-full h-full object-contain" />
                  </button>
                  {currentItem.variations.map((v, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveVariations(prev => ({ ...prev, [currentItem.id]: v }))}
                      className={`w-16 h-16 rounded-xl border-2 overflow-hidden transition-all p-1 bg-white dark:bg-zinc-950 ${activeVariations[currentItem.id] === v ? 'border-zinc-900 dark:border-zinc-50 shadow-sm scale-110' : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 opacity-70 hover:opacity-100'}`}
                    >
                      <img src={v} className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex-1 space-y-4 md:space-y-8 w-full">
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500 text-center md:text-left">Item {currentIndex + 1} of {items.length}</p>
                <h2 className="font-serif text-4xl md:text-7xl leading-tight text-center md:text-left">{currentItem.custom_name || currentItem.garment_name}</h2>
                <p className="text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 text-base md:text-xl leading-relaxed text-center md:text-left">
                  {currentItem.custom_description || currentItem.garment_description}
                </p>
              </div>
              <div className="pt-8 md:pt-12 border-t border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-6">
                {showPricing ? <p className="text-3xl md:text-4xl font-medium">${currentItem.custom_price || currentItem.garment_price}</p> : <div />}
                <div className="flex flex-wrap justify-center md:justify-start gap-2 max-w-full">
                  {(currentItem.custom_sizes || 'XS,S,M,L,XL').split(',').map(size => (
                    <span key={size} className="w-10 h-10 md:w-12 md:h-12 border border-zinc-200 dark:border-zinc-700 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold text-zinc-400 dark:text-zinc-500">
                      {size}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <button
          onClick={next}
          className="absolute right-2 md:right-8 z-10 p-2 md:p-4 hover:bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-50 rounded-full transition-colors bg-white/50 dark:bg-zinc-950/50 backdrop-blur md:bg-transparent md:backdrop-blur-none"
        >
          <ChevronRight size={24} className="md:w-8 md:h-8" />
        </button>
      </div>

      <div className="p-8 flex justify-center gap-2">
        {items.map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-500 ${i === currentIndex ? 'w-12 bg-zinc-900 dark:bg-zinc-50' : 'w-2 bg-zinc-200 dark:bg-zinc-700'}`}
          />
        ))}
      </div>
    </motion.div>
  );
}

function DeckModal({ onClose, onConfirm, initialName = '' }: { onClose: () => void, onConfirm: (name: string) => void, initialName?: string }) {
  const [name, setName] = useState(initialName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onConfirm(name.trim());
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 dark:bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-white dark:bg-zinc-950 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 md:p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500 mb-1">{initialName ? 'Rename Presentation' : 'New Presentation'}</p>
            <h3 className="font-serif text-2xl">{initialName ? 'Rename Deck' : 'Create Deck'}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-50 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500 mb-2 block">Deck Name</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Spring 2026 Collection"
              className="w-full border-b border-zinc-200 dark:border-zinc-700 py-3 text-lg font-serif outline-none focus:border-zinc-900 dark:border-zinc-50 transition-colors"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 text-xs uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:text-zinc-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 bg-zinc-900 dark:bg-zinc-50 text-white py-4 rounded-full text-xs uppercase tracking-widest font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {initialName ? 'Save Changes' : 'Create Deck'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
