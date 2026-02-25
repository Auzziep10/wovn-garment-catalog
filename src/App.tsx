import React, { useState, useEffect, useRef } from 'react';
import useMeasure from 'react-use-measure';
import {
  Menu, X, ChevronRight, Plus, Upload, Image as ImageIcon,
  Users, Layout, Presentation, Trash2, Save, Wand2, ArrowLeft,
  Search, ShoppingBag, Maximize2, Minimize2, Sparkles, RotateCw,
  Grid, List, Edit2
} from 'lucide-react';
import { motion, AnimatePresence, useMotionValue } from 'motion/react';
import { generateMockup } from './services/geminiService';

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
}

export interface Customer {
  id: number;
  name: string;
  company: string;
}

export interface Deck {
  id: number;
  customer_id: number;
  name: string;
  items?: DeckItem[];
}

export interface DeckItem {
  id: number;
  deck_id: number;
  garment_id: number;
  mock_image: string;
  garment_name?: string;
  garment_description?: string;
  garment_price?: number;
  original_image?: string;
  custom_name?: string;
  custom_description?: string;
  custom_price?: number;
  custom_sizes?: string;
}

type View = 'catalog' | 'admin' | 'customers' | 'deck-view' | 'mockup-studio' | 'presentation';

export default function App() {
  const [view, setView] = useState<View>('catalog');
  const [selectedCategory, setSelectedCategory] = useState<Category>('Athleisure');
  const [selectedGender, setSelectedGender] = useState<Gender>('Male');
  const [selectedType, setSelectedType] = useState<GarmentType>('Tops');

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
  const [allDecks, setAllDecks] = useState<(Deck & { customer_name: string })[]>([]);

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    fetchGarments();
    fetchCustomers();
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

    if (!name || !company) {
      alert('Please fill in both name and company');
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
          mock_image: customImage || garment.image
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
      <header className="border-b border-zinc-100 sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 -ml-2">
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="hidden md:flex items-center gap-6">
              <button
                onClick={() => setView('catalog')}
                className={`nav-link ${view === 'catalog' ? 'text-zinc-900' : ''}`}
              >
                Catalog
              </button>
              <button
                onClick={() => setView('admin')}
                className={`nav-link ${view === 'admin' ? 'text-zinc-900' : ''}`}
              >
                Garment
              </button>
              <button
                onClick={() => setView('customers')}
                className={`nav-link ${view === 'customers' ? 'text-zinc-900' : ''}`}
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
              <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-zinc-50 rounded-full border border-zinc-100">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">Active Deck:</span>
                <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-900">{currentDeck.name}</span>
              </div>
            )}
            <Search size={20} className="text-zinc-400 cursor-pointer hover:text-zinc-900 transition-colors" />
            <div
              className="relative cursor-pointer group"
              onClick={() => { if (currentDeck) setView('deck-view'); else setView('customers'); }}
            >
              <ShoppingBag size={20} className="text-zinc-400 group-hover:text-zinc-900 transition-colors" />
              {currentDeck && (
                <span className="absolute -top-1 -right-1 bg-zinc-900 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {currentDeck.items?.length || 0}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Side Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-80 bg-white z-[70] shadow-2xl p-8 overflow-y-auto"
            >
              <div className="flex flex-col gap-12">
                <section>
                  <h3 className="text-[10px] uppercase tracking-widest text-zinc-400 mb-6 font-bold">Category</h3>
                  <div className="flex flex-col gap-4">
                    {['Athleisure', 'Executive', 'Auto-Industry'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => { setSelectedCategory(cat as Category); setIsMenuOpen(false); setView('catalog'); }}
                        className={`text-left text-lg font-serif ${selectedCategory === cat ? 'italic underline underline-offset-8' : 'opacity-60'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] uppercase tracking-widest text-zinc-400 mb-6 font-bold">Gender</h3>
                  <div className="flex flex-col gap-4">
                    {['Male', 'Female', 'Accessories'].map((gen) => (
                      <button
                        key={gen}
                        onClick={() => { setSelectedGender(gen as Gender); setIsMenuOpen(false); setView('catalog'); }}
                        className={`text-left text-lg font-serif ${selectedGender === gen ? 'italic underline underline-offset-8' : 'opacity-60'}`}
                      >
                        {gen}
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] uppercase tracking-widest text-zinc-400 mb-6 font-bold">Type</h3>
                  <div className="flex flex-col gap-4">
                    {['Tops', 'Bottom', 'Headwear', 'Bags', 'Tumblers', 'Other'].map((t) => (
                      <button
                        key={t}
                        onClick={() => { setSelectedType(t as GarmentType); setIsMenuOpen(false); setView('catalog'); }}
                        className={`text-left text-lg font-serif ${selectedType === t ? 'italic underline underline-offset-8' : 'opacity-60'}`}
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
          />
        )}
        {view === 'deck-view' && currentDeck && (
          <DeckPresentationView
            deck={currentDeck}
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
          />
        )}
        {view === 'mockup-studio' && selectedGarment && (
          <MockupStudio
            garment={selectedGarment}
            deck={currentDeck}
            onBack={() => setView('catalog')}
            onSave={async (newImage) => {
              if (selectedDeckItem) {
                const res = await fetch(`/api/deck-items/${selectedDeckItem.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ mock_image: newImage })
                });
                if (res.ok) {
                  const deckRes = await fetch(`/api/decks/${currentDeck!.id}`);
                  const deckData = await deckRes.json();
                  setCurrentDeck(deckData);
                  alert('Mockup saved to deck!');
                  setView('deck-view');
                }
              } else {
                setPendingMockupImage(newImage);
                setGarmentToAddToDeck(selectedGarment);
                setIsDeckSelectorOpen(true);
              }
            }}
          />
        )}
      </main>

      <AnimatePresence>
        {isNewDeckModalOpen && selectedCustomer && (
          <NewDeckModal
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

function CatalogView({ garments, category, gender, type, currentDeck, onSelectGarment, onAddToDeck, onDeleteGarment }: {
  garments: Garment[],
  category: string,
  gender: string,
  type: string,
  currentDeck: Deck | null,
  onSelectGarment: (g: Garment) => void,
  onAddToDeck: (g: Garment) => void,
  onDeleteGarment: (g: Garment) => void
}) {
  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 font-bold">{category} / {gender}</p>
          <h2 className="editorial-title">{type}</h2>
        </div>
        <p className="text-zinc-500 max-w-md text-sm leading-relaxed">
          Our curated collection of high-performance garments designed for the modern professional.
          Each piece is selected for its quality, durability, and aesthetic appeal.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
        {garments.map((garment) => (
          <motion.div
            key={garment.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group cursor-pointer"
          >
            <div className="aspect-[3/4] bg-zinc-100 mb-6 overflow-hidden relative">
              <img
                src={garment.image}
                alt={garment.name}
                className="w-full h-full object-contain p-4 transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteGarment(garment); }}
                  className="absolute top-4 right-4 bg-white/80 hover:bg-red-50 hover:text-red-500 text-zinc-400 p-2 rounded-full transition-all"
                  title="Delete Garment"
                >
                  <Trash2 size={16} />
                </button>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); onAddToDeck(garment); }}
                    className="bg-white text-zinc-900 px-6 py-3 text-xs uppercase tracking-widest font-bold hover:bg-zinc-900 hover:text-white transition-colors"
                  >
                    {currentDeck ? 'Add to Deck' : 'Select Deck'}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onSelectGarment(garment); }}
                    className="bg-zinc-900 text-white px-6 py-3 text-xs uppercase tracking-widest font-bold hover:bg-zinc-800 transition-colors"
                  >
                    Mockup Studio
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-serif text-xl mb-1">{garment.name}</h3>
                <p className="text-zinc-400 text-xs uppercase tracking-widest">{garment.category}</p>
              </div>
              <p className="font-medium">${garment.price}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {garments.length === 0 && (
        <div className="py-32 text-center border-2 border-dashed border-zinc-100 rounded-3xl">
          <ImageIcon className="mx-auto text-zinc-200 mb-4" size={48} />
          <p className="text-zinc-400 font-serif italic">No garments found in this category.</p>
        </div>
      )}
    </div>
  );
}

function AdminView({ onGarmentAdded }: { onGarmentAdded: () => void }) {
  const [image, setImage] = useState<string>('');

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
          setImage(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const data = {
      name: formData.get('name'),
      description: formData.get('description'),
      price: parseFloat(formData.get('price') as string),
      category: formData.get('category'),
      gender: formData.get('gender'),
      type: formData.get('type'),
      image: image
    };

    const res = await fetch('/api/garments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      alert('Garment added successfully!');
      onGarmentAdded();
      setImage('');
      form.reset();
    } else {
      const errText = await res.text();
      alert(`Failed to add garment: ${res.status} ${errText}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h2 className="editorial-title mb-12">Garment Management</h2>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-8">
          <div className="aspect-[3/4] bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group">
            {image ? (
              <>
                <img src={image} className="w-full h-full object-contain p-4" />
                <button
                  type="button"
                  onClick={() => setImage('')}
                  className="absolute top-4 right-4 bg-white/80 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={16} />
                </button>
              </>
            ) : (
              <label className="cursor-pointer text-center p-8">
                <Upload className="mx-auto text-zinc-300 mb-4" size={32} />
                <span className="text-sm text-zinc-500 font-medium">Upload Garment Photo</span>
                <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
              </label>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-2 block">Garment Name</label>
            <input name="name" required className="w-full border-b border-zinc-200 py-2 focus:border-zinc-900 outline-none transition-colors" defaultValue="Camo Lightweight Puffer" placeholder="e.g. Camo Lightweight Puffer" />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-2 block">Description</label>
            <textarea name="description" rows={3} className="w-full border-b border-zinc-200 py-2 focus:border-zinc-900 outline-none transition-colors resize-none" defaultValue="A high-performance lightweight puffer jacket with a modern camo print. Perfect for transitional weather and outdoor activities." placeholder="Garment details..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-2 block">Price (USD)</label>
              <input name="price" type="number" step="0.01" required className="w-full border-b border-zinc-200 py-2 focus:border-zinc-900 outline-none transition-colors" defaultValue="219.00" placeholder="219.00" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-2 block">Category</label>
              <select name="category" className="w-full border-b border-zinc-200 py-2 focus:border-zinc-900 outline-none transition-colors bg-transparent">
                <option>Athleisure</option>
                <option>Executive</option>
                <option>Auto-Industry</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-2 block">Gender</label>
              <select name="gender" className="w-full border-b border-zinc-200 py-2 focus:border-zinc-900 outline-none transition-colors bg-transparent">
                <option>Male</option>
                <option>Female</option>
                <option>Accessories</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-2 block">Type</label>
              <select name="type" className="w-full border-b border-zinc-200 py-2 focus:border-zinc-900 outline-none transition-colors bg-transparent">
                <option>Tops</option>
                <option>Bottom</option>
                <option>Headwear</option>
                <option>Bags</option>
                <option>Tumblers</option>
                <option>Other</option>
              </select>
            </div>
          </div>

          <button type="submit" className="w-full bg-zinc-900 text-white py-4 text-xs uppercase tracking-widest font-bold hover:bg-zinc-800 transition-colors mt-8">
            Add to Catalog
          </button>
        </div>
      </form>
    </div>
  );
}

function CustomersView({ customers, onAddCustomer, onSelectCustomer, onDeleteCustomer, onViewDeck, onCreateDeck }: {
  customers: Customer[],
  onAddCustomer: (e: React.FormEvent<HTMLFormElement>) => void,
  onSelectCustomer: (c: Customer) => void,
  onDeleteCustomer: (c: Customer) => void,
  onViewDeck: (d: Deck) => void,
  onCreateDeck: (customerId: number) => void
}) {
  const [selectedCustId, setSelectedCustId] = useState<number | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);

  useEffect(() => {
    if (selectedCustId) {
      fetch(`/api/customers/${selectedCustId}/decks`)
        .then(res => res.json())
        .then(setDecks);
    }
  }, [selectedCustId]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
        <div className="lg:col-span-1">
          <h2 className="editorial-title mb-8">Clients</h2>
          <form onSubmit={onAddCustomer} className="space-y-6 mb-12 p-6 bg-zinc-50 rounded-2xl">
            <h3 className="text-xs uppercase tracking-widest font-bold mb-4">New Customer</h3>
            <input name="name" required placeholder="Contact Name" className="w-full bg-transparent border-b border-zinc-200 py-2 outline-none focus:border-zinc-900" />
            <input name="company" required placeholder="Company Name" className="w-full bg-transparent border-b border-zinc-200 py-2 outline-none focus:border-zinc-900" />
            <button type="submit" className="w-full bg-zinc-900 text-white py-3 text-[10px] uppercase tracking-widest font-bold">Add Client</button>
          </form>

          <div className="space-y-2">
            {customers.map(c => (
              <div key={c.id} className="relative group/card">
                <button
                  onClick={() => { setSelectedCustId(c.id); onSelectCustomer(c); }}
                  className={`w-full text-left p-4 rounded-xl transition-all flex items-center justify-between group-hover/card:pr-12 ${selectedCustId === c.id ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-50'}`}
                >
                  <div>
                    <p className="font-serif text-lg">{c.company}</p>
                    <p className={`text-xs ${selectedCustId === c.id ? 'text-zinc-400' : 'text-zinc-500'}`}>{c.name}</p>
                  </div>
                  <ChevronRight size={16} className={selectedCustId === c.id ? 'text-white' : 'text-zinc-300'} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteCustomer(c);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-zinc-400 opacity-0 group-hover/card:opacity-100 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
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
              <div className="flex items-center justify-between mb-12">
                <h2 className="editorial-title">Presentation Decks</h2>
                <button
                  onClick={() => {
                    if (selectedCustId !== null) {
                      onCreateDeck(selectedCustId);
                    } else {
                      alert('Please select a client first.');
                    }
                  }}
                  className="flex items-center gap-2 bg-zinc-900 text-white px-6 py-3 rounded-full text-xs uppercase tracking-widest font-bold hover:bg-zinc-800 transition-colors shadow-lg active:scale-95"
                >
                  <Plus size={16} /> New Deck
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {decks.map(d => (
                  <div
                    key={d.id}
                    className="group border border-zinc-100 rounded-3xl p-8 hover:border-zinc-900 transition-colors cursor-pointer"
                    onClick={() => onViewDeck(d)}
                  >
                    <div className="flex items-center justify-between mb-8">
                      <div className="p-3 bg-zinc-50 rounded-2xl group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                        <Presentation size={24} />
                      </div>
                      <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Presentation</p>
                    </div>
                    <h3 className="font-serif text-2xl mb-2">{d.name}</h3>
                    <p className="text-zinc-500 text-sm">Curated garment selection for client review.</p>
                  </div>
                ))}
                {decks.length === 0 && (
                  <div className="col-span-full py-24 text-center border-2 border-dashed border-zinc-100 rounded-3xl">
                    <Layout className="mx-auto text-zinc-200 mb-4" size={48} />
                    <p className="text-zinc-400 font-serif italic">No decks created for this client yet.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-24">
              <Users className="text-zinc-100 mb-6" size={80} />
              <h3 className="font-serif text-3xl text-zinc-300 mb-2">Select a Client</h3>
              <p className="text-zinc-400">Choose a client from the list to manage their presentation decks.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DeckPresentationView({ deck, onBack, onGarmentClick, onPresent, onRemoveItem }: {
  deck: Deck,
  onBack: () => void,
  onGarmentClick: (g: Garment, item: DeckItem) => void,
  onPresent: () => void,
  onRemoveItem: (itemId: number) => void
}) {
  const [items, setItems] = useState<DeckItem[]>(deck.items || []);
  const [displayMode, setDisplayMode] = useState<'presentation' | 'grid'>('presentation');
  const [editingItem, setEditingItem] = useState<DeckItem | null>(null);

  const fetchItems = () => {
    fetch(`/api/decks/${deck.id}`)
      .then(res => res.json())
      .then(data => setItems(data.items));
  };

  useEffect(() => {
    fetchItems();
  }, [deck.id]);

  const handleMockupEdit = (item: DeckItem) => {
    onGarmentClick({
      id: item.garment_id,
      name: item.garment_name!,
      description: item.garment_description!,
      price: item.garment_price!,
      image: item.original_image!,
      category: 'Athleisure', // Fallback
      gender: 'Male',
      type: 'Tops'
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
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50/50">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-zinc-900 transition-colors mb-12">
          <ArrowLeft size={16} /> Back to Clients
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 font-bold">Presentation Deck</p>
            <h2 className="editorial-title">{deck.name}</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 mr-4 bg-white border border-zinc-200 p-1 rounded-full shadow-sm">
              <button
                onClick={() => setDisplayMode('presentation')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all text-[10px] uppercase tracking-widest font-bold ${displayMode === 'presentation' ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:text-zinc-600'}`}
              >
                <List size={14} /> Presentation
              </button>
              <button
                onClick={() => setDisplayMode('grid')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all text-[10px] uppercase tracking-widest font-bold ${displayMode === 'grid' ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:text-zinc-600'}`}
              >
                <Grid size={14} /> Grid
              </button>
            </div>
            <button className="bg-white border border-zinc-200 px-8 py-4 rounded-full text-xs uppercase tracking-widest font-bold hover:border-zinc-900 transition-colors">
              Share Link
            </button>
            <button
              onClick={() => onPresent()}
              className="bg-zinc-900 text-white px-8 py-4 rounded-full text-xs uppercase tracking-widest font-bold hover:bg-zinc-800 transition-colors"
            >
              Present View
            </button>
          </div>
        </div>

        {displayMode === 'presentation' ? (
          <div className="grid grid-cols-1 gap-32">
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`flex flex-col ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} gap-16 items-center`}
              >
                <div className="flex-1 w-full">
                  <div className="aspect-[4/5] bg-white shadow-2xl rounded-[2rem] overflow-hidden relative group">
                    <img
                      src={item.mock_image}
                      alt={item.garment_name}
                      className="w-full h-full object-contain p-8"
                    />
                    <div className="absolute top-8 right-8 flex flex-col gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                      <button
                        onClick={() => handleMockupEdit(item)}
                        className="bg-white/90 backdrop-blur p-4 rounded-full shadow-lg hover:bg-zinc-900 hover:text-white transition-colors"
                        title="Edit Mockup"
                      >
                        <Wand2 size={20} />
                      </button>
                      <button
                        onClick={() => setEditingItem(item)}
                        className="bg-white/90 backdrop-blur p-4 rounded-full shadow-lg hover:bg-zinc-900 hover:text-white transition-colors"
                        title="Edit Details"
                      >
                        <Edit2 size={20} />
                      </button>
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="bg-white/90 backdrop-blur p-4 rounded-full shadow-lg hover:bg-red-500 hover:text-white transition-colors"
                        title="Remove from Deck"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex-1 space-y-8 max-w-lg">
                  <div className="space-y-4">
                    <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">Item {index + 1}</p>
                    <h3 className="font-serif text-5xl leading-tight">{item.custom_name || item.garment_name}</h3>
                    <p className="text-zinc-500 text-lg leading-relaxed">
                      {item.custom_description || item.garment_description}
                    </p>
                  </div>
                  <div className="pt-8 border-t border-zinc-200 flex items-center justify-between">
                    <p className="text-2xl font-medium">${item.custom_price || item.garment_price}</p>
                    <div className="flex gap-2">
                      {(item.custom_sizes || 'XS,S,M,L,XL').split(',').map(size => (
                        <span key={size} className="px-3 h-10 border border-zinc-200 rounded-full flex items-center justify-center text-[10px] font-bold text-zinc-900">
                          {size}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="group"
              >
                <div className="aspect-[3/4] bg-white rounded-2xl overflow-hidden relative mb-4 shadow-sm border border-zinc-100">
                  <img
                    src={item.mock_image}
                    className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleMockupEdit(item)}
                        className="bg-white text-zinc-900 p-3 rounded-full shadow-lg hover:bg-zinc-900 hover:text-white transition-colors"
                        title="Edit Mockup"
                      >
                        <Wand2 size={18} />
                      </button>
                      <button
                        onClick={() => setEditingItem(item)}
                        className="bg-white text-zinc-900 p-3 rounded-full shadow-lg hover:bg-zinc-900 hover:text-white transition-colors"
                        title="Edit Details"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="bg-white text-zinc-900 p-3 rounded-full shadow-lg hover:bg-red-500 hover:text-white transition-colors"
                        title="Remove from Deck"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
                <h4 className="font-serif text-lg truncate">{item.custom_name || item.garment_name}</h4>
                <p className="text-zinc-400 text-xs uppercase tracking-widest font-bold">${item.custom_price || item.garment_price}</p>
              </motion.div>
            ))}
            {items.length === 0 && (
              <div className="col-span-full py-24 text-center border-2 border-dashed border-zinc-100 rounded-3xl">
                <p className="text-zinc-400 font-serif italic">This deck is empty. Add some garments from the catalog!</p>
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {editingItem && (
          <EditItemModal
            item={editingItem}
            onClose={() => setEditingItem(null)}
            onSave={(details) => handleSaveDetails(editingItem.id, details)}
          />
        )}
      </AnimatePresence>
    </div>
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-8 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-1">Client Customization</p>
            <h3 className="font-serif text-2xl">Edit Item Details</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-50 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="aspect-[3/4] bg-zinc-50 rounded-2xl overflow-hidden border border-zinc-100 flex items-center justify-center p-4">
                <img src={item.mock_image} className="w-full h-full object-contain" />
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Display Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-zinc-50 border-none rounded-xl p-4 text-sm outline-none focus:ring-2 ring-zinc-900 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Price ($)</label>
                <input
                  type="number"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="w-full bg-zinc-50 border-none rounded-xl p-4 text-sm outline-none focus:ring-2 ring-zinc-900 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Size Spread (comma separated)</label>
                <input
                  value={sizes}
                  onChange={e => setSizes(e.target.value)}
                  className="w-full bg-zinc-50 border-none rounded-xl p-4 text-sm outline-none focus:ring-2 ring-zinc-900 transition-all"
                  placeholder="XS, S, M, L, XL"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-zinc-50 border-none rounded-xl p-4 text-sm outline-none focus:ring-2 ring-zinc-900 transition-all resize-none"
              rows={4}
            />
          </div>
        </div>

        <div className="p-8 border-t border-zinc-100 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 bg-zinc-50 text-zinc-900 py-4 rounded-full text-xs uppercase tracking-widest font-bold hover:bg-zinc-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave({
              custom_name: name,
              custom_description: description,
              custom_price: parseFloat(price),
              custom_sizes: sizes
            })}
            className="flex-1 bg-zinc-900 text-white py-4 rounded-full text-xs uppercase tracking-widest font-bold hover:bg-zinc-800 transition-colors"
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
  onSave: (img: string) => void
}) {
  const [logo, setLogo] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string>('');
  const [prompt, setPrompt] = useState('Place the logo realistically on the garment with a high-quality finish.');
  const [logoScale, setLogoScale] = useState(1);
  const [logoRotation, setLogoRotation] = useState(0);
  const [containerRef, bounds] = useMeasure();

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useMotionValue(0);

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

  const handleGenerate = async () => {
    if (!logo) {
      alert('Please upload a customer logo first');
      return;
    }
    setIsGenerating(true);

    // Calculate relative position for the AI
    // x and y are offsets from the center (50%, 50%)
    const relX = ((x.get() + bounds.width / 2) / bounds.width) * 100;
    const relY = ((y.get() + bounds.height / 2) / bounds.height) * 100;

    const placementContext = `The user has placed the logo at approximately ${relX.toFixed(0)}% from the left and ${relY.toFixed(0)}% from the top of the image. Scale is ${logoScale.toFixed(1)}x and rotation is ${logoRotation.toFixed(0)} degrees.`;

    try {
      const mockup = await generateMockup(garment.image, logo, `${placementContext} ${prompt}`);
      setResultImage(mockup);
    } catch (err) {
      console.error(err);
      alert('Failed to generate mockup. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveCurrentView = async () => {
    if (!logo) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const garmentImg = new Image();
    garmentImg.crossOrigin = "anonymous";
    garmentImg.src = garment.image;

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
    // The logo is in a 128x128 box (w-32 h-32) with object-contain in the UI
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

    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-zinc-900 transition-colors mb-12">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        <div className="space-y-8">
          <div
            ref={containerRef}
            className="aspect-[3/4] bg-zinc-50 rounded-3xl overflow-hidden shadow-2xl relative border border-zinc-100 cursor-crosshair"
          >
            <img src={resultImage || garment.image} className="w-full h-full object-contain pointer-events-none" />

            {!resultImage && logo && (
              <motion.div
                drag
                dragMomentum={false}
                dragElastic={0}
                dragConstraints={containerRef}
                style={{ x, y, scale: logoScale, rotate }}
                className="absolute top-1/2 left-1/2 w-32 h-32 -ml-16 -mt-16 flex items-center justify-center cursor-move group z-10"
              >
                <div className="relative w-full h-full border-2 border-zinc-900/0 group-hover:border-zinc-900/50 transition-colors">
                  <img src={logo} className="w-full h-full object-contain drop-shadow-xl pointer-events-none" />

                  {/* Rotation Handle */}
                  <div
                    className="absolute -top-12 left-1/2 -translate-x-1/2 w-8 h-8 bg-white border border-zinc-200 rounded-full flex items-center justify-center cursor-alias opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
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
                    <RotateCw size={14} className="text-zinc-900" />
                  </div>

                  {/* Scale Handle */}
                  <div
                    className="absolute -bottom-2 -right-2 w-4 h-4 bg-zinc-900 border-2 border-white rounded-sm cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
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

                <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[8px] px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest pointer-events-none whitespace-nowrap shadow-xl">
                  Drag to Position • Use Handles to Transform
                </div>
              </motion.div>
            )}

            {isGenerating && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center p-12 text-center z-50">
                <div className="w-16 h-16 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin mb-6"></div>
                <h3 className="font-serif text-2xl mb-2">Creating Realistic Mockup</h3>
                <p className="text-zinc-500 text-sm">Our AI is meticulously placing the logo and adjusting lighting for a perfect result...</p>
              </div>
            )}
          </div>

          {!resultImage && logo && (
            <div className="flex items-center gap-6 bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Scale</span>
                  <span className="text-[10px] font-mono text-zinc-900">{(logoScale * 100).toFixed(0)}%</span>
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

              <div className="w-px h-12 bg-zinc-200" />

              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Rotation</span>
                  <span className="text-[10px] font-mono text-zinc-900">{logoRotation.toFixed(0)}°</span>
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

        <div className="space-y-12">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 font-bold">Mockup Studio</p>
            <h2 className="editorial-title mb-4">Interactive Placement</h2>
            <p className="text-zinc-500 leading-relaxed">
              Drag the logo to your desired position and adjust the scale.
              Our AI will then "bake" it into the garment, matching perspective and lighting perfectly.
            </p>
          </div>

          <div className="space-y-8">
            <section>
              <h3 className="text-xs uppercase tracking-widest font-bold mb-4">1. Customer Logo</h3>
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-2xl flex items-center justify-center overflow-hidden">
                  {logo ? (
                    <img src={logo} className="w-full h-full object-contain p-2" />
                  ) : (
                    <ImageIcon className="text-zinc-200" size={24} />
                  )}
                </div>
                <label className="bg-white border border-zinc-200 px-6 py-3 rounded-full text-[10px] uppercase tracking-widest font-bold cursor-pointer hover:border-zinc-900 transition-colors">
                  Upload Logo
                  <input type="file" className="hidden" onChange={handleLogoUpload} accept="image/*" />
                </label>
              </div>
            </section>

            <section>
              <h3 className="text-xs uppercase tracking-widest font-bold mb-4">2. Describe the Finish</h3>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full bg-zinc-50 border-none rounded-2xl p-4 text-sm outline-none focus:ring-2 ring-zinc-900 transition-all resize-none"
                rows={3}
                placeholder="e.g. High-quality silver embroidery, screen printed with a vintage fade..."
              />
            </section>

            <div className="pt-8 border-t border-zinc-100 flex flex-col gap-4">
              <div className="flex gap-4">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !logo}
                  className="flex-1 bg-zinc-900 text-white py-4 rounded-full text-xs uppercase tracking-widest font-bold hover:bg-zinc-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Sparkles size={16} /> {isGenerating ? 'Generating...' : (resultImage ? 'Re-bake Mockup' : 'Bake Mockup')}
                </button>
                {!resultImage && logo && (
                  <button
                    onClick={handleSaveCurrentView}
                    className="flex-1 bg-white border border-zinc-900 text-zinc-900 py-4 rounded-full text-xs uppercase tracking-widest font-bold hover:bg-zinc-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Save size={16} /> Quick Save
                  </button>
                )}
              </div>

              {resultImage && (
                <button
                  onClick={() => onSave(resultImage)}
                  className="w-full bg-emerald-600 text-white py-4 rounded-full text-xs uppercase tracking-widest font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-2"
                >
                  <Save size={16} /> Save Baked Mockup to Deck
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeckSelectorModal({ decks, garment, onClose, onSelect }: {
  decks: (Deck & { customer_name: string })[],
  garment: Garment,
  onClose: () => void,
  onSelect: (deck: Deck) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-8 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-1">Add to Deck</p>
            <h3 className="font-serif text-2xl">Select Destination</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-50 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 bg-zinc-50 flex items-center gap-4">
          <div className="w-16 h-16 bg-white rounded-xl overflow-hidden border border-zinc-100 flex-shrink-0">
            <img src={garment.image} className="w-full h-full object-contain p-1" />
          </div>
          <div>
            <p className="font-medium text-sm">{garment.name}</p>
            <p className="text-xs text-zinc-500">${garment.price}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-2">
          {decks.map(deck => (
            <button
              key={deck.id}
              onClick={() => onSelect(deck)}
              className="w-full text-left p-4 rounded-2xl hover:bg-zinc-50 transition-colors border border-transparent hover:border-zinc-100 flex items-center justify-between group"
            >
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-0.5">{deck.customer_name}</p>
                <p className="font-serif text-lg">{deck.name}</p>
              </div>
              <Plus size={16} className="text-zinc-300 group-hover:text-zinc-900 transition-colors" />
            </button>
          ))}
          {decks.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-zinc-400 font-serif italic text-sm">No decks found. Create one in the Customers tab.</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
function PresentationMode({ deck, onClose }: { deck: Deck, onClose: () => void }) {
  const [items, setItems] = useState<DeckItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

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
      className="fixed inset-0 bg-white z-[100] flex flex-col"
    >
      <div className="flex items-center justify-between p-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center text-white font-serif">
            W
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Presentation Mode</p>
            <h3 className="font-serif text-xl">{deck.name}</h3>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-4 hover:bg-zinc-50 rounded-full transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center relative px-20">
        <button
          onClick={prev}
          className="absolute left-8 p-4 hover:bg-zinc-50 rounded-full transition-colors"
        >
          <ArrowLeft size={32} />
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col md:flex-row items-center gap-20 max-w-6xl w-full"
          >
            <div className="flex-1 aspect-[3/4] rounded-[2.5rem] overflow-hidden shadow-2xl bg-zinc-50 flex items-center justify-center p-12">
              <img
                src={currentItem.mock_image}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex-1 space-y-8">
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-widest font-bold text-zinc-400">Item {currentIndex + 1} of {items.length}</p>
                <h2 className="font-serif text-7xl leading-tight">{currentItem.custom_name || currentItem.garment_name}</h2>
                <p className="text-zinc-500 text-xl leading-relaxed">
                  {currentItem.custom_description || currentItem.garment_description}
                </p>
              </div>
              <div className="pt-12 border-t border-zinc-100 flex items-center justify-between">
                <p className="text-4xl font-medium">${currentItem.custom_price || currentItem.garment_price}</p>
                <div className="flex gap-3">
                  {(currentItem.custom_sizes || 'XS,S,M,L,XL').split(',').map(size => (
                    <span key={size} className="w-12 h-12 border border-zinc-200 rounded-full flex items-center justify-center text-xs font-bold text-zinc-400">
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
          className="absolute right-8 p-4 hover:bg-zinc-50 rounded-full transition-colors"
        >
          <ChevronRight size={32} />
        </button>
      </div>

      <div className="p-8 flex justify-center gap-2">
        {items.map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-500 ${i === currentIndex ? 'w-12 bg-zinc-900' : 'w-2 bg-zinc-200'}`}
          />
        ))}
      </div>
    </motion.div>
  );
}

function NewDeckModal({ onClose, onConfirm }: { onClose: () => void, onConfirm: (name: string) => void }) {
  const [name, setName] = useState('');

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
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-8 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-1">New Presentation</p>
            <h3 className="font-serif text-2xl">Create Deck</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-50 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-2 block">Deck Name</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Spring 2026 Collection"
              className="w-full border-b border-zinc-200 py-3 text-lg font-serif outline-none focus:border-zinc-900 transition-colors"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 text-xs uppercase tracking-widest font-bold text-zinc-400 hover:text-zinc-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 bg-zinc-900 text-white py-4 rounded-full text-xs uppercase tracking-widest font-bold hover:bg-zinc-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Deck
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
