import React, { useState, useEffect, useRef } from 'react';
import useMeasure from 'react-use-measure';
import {
  Menu, X, ChevronRight, Plus, Upload, Image as ImageIcon,
  Users, Layout, Presentation, Trash2, Save, Wand2, ArrowLeft, ArrowRight,
  Search, ShoppingBag, Maximize2, Minimize2, Sparkles, RotateCw, Camera,
  Grid, List, Edit2, ArrowUp, ArrowDown, Info, GripHorizontal, Download, ChevronDown, ChevronUp, Palette, PlusCircle, MinusCircle, Eraser
, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue } from 'motion/react';
import { generateMockup, generateModelScene, generateColorVariation, convertColorToHex, generateRotatedGarment, uploadImageToStorage, removeImageBackground , analyzeMarketPricing } from './services/geminiService';



function MarketPricingAnalyzer({ itemDetails, initialAnalysis, onAnalysisUpdate }: { itemDetails: any, initialAnalysis?: any[] | null, onAnalysisUpdate?: (data: any[] | null) => void }) {
  const [marketAnalysis, setMarketAnalysis] = useState<Array<{ brand: string, name: string, msrp: string, link: string, summary: string }> | null>(initialAnalysis || null);
  const [analyzingMarket, setAnalyzingMarket] = useState(false);

  const handleAnalyzeMarket = async () => {
    setAnalyzingMarket(true);
    setMarketAnalysis(null);
    try {
      const result = await analyzeMarketPricing(itemDetails);
      setMarketAnalysis(result);
      if (onAnalysisUpdate) onAnalysisUpdate(result);
    } catch (e) {
      alert("Failed to analyze market. Please try again.");
    } finally {
      setAnalyzingMarket(false);
    }
  };

  return (
    <div className="bg-white border border-zinc-100 rounded-xl p-5 shadow-[0_2px_4px_rgba(0,0,0,0.02)] mt-6">
      <div className="flex items-center justify-between mb-4 border-b border-zinc-100 pb-3">
         <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-900 m-0 leading-none">AI Market Pricing</label>
         <button 
           type="button" 
           onClick={handleAnalyzeMarket} 
           disabled={analyzingMarket}
           className="px-3 py-1.5 bg-zinc-900 text-white text-[10px] uppercase tracking-wider font-bold rounded-lg hover:bg-zinc-800 disabled:opacity-50 transition-colors flex items-center gap-2"
           title="Scan top luxury brands for comparable MSRP"
         >
           {analyzingMarket ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles size={12} />}
           {analyzingMarket ? 'Scanning...' : 'Analyze Market'}
         </button>
      </div>
      
      {marketAnalysis ? (
        <div className="space-y-3">
          {marketAnalysis.map((ma, idx) => (
            <div key={idx} className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-sm flex flex-col gap-1.5 group">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0 flex-1 flex flex-wrap items-baseline gap-x-2">
                  <span className="font-bold text-zinc-900 truncate">{ma.brand}</span>
                  <span className="text-zinc-400 text-xs">|</span>
                  <span className="text-zinc-700 font-medium text-xs truncate">{ma.name}</span>
                </div>
                <span className="font-bold text-emerald-600 shrink-0 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">{ma.msrp}</span>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed mt-1">{ma.summary}</p>
                 <a href={`https://www.google.com/search?q=${encodeURIComponent(ma.brand + ' ' + ma.name + ' garment price')}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-zinc-400 hover:text-zinc-600 font-medium self-start uppercase tracking-wider flex items-center gap-1 mt-1 transition-colors">
                   View Comparable Product <ExternalLink size={10} className="ml-0.5" />
                 </a>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 px-4 bg-zinc-50 rounded-lg border border-dashed border-zinc-200">
          <Sparkles className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
          <p className="text-xs text-zinc-500 leading-relaxed max-w-[250px] mx-auto">
            Use AI to scan current luxury & premium markets (Vuori, Lululemon, G-Star) for top comparable items to establish realistic MSRP benchmarking.
          </p>
        </div>
      )}
    </div>
  );
}

function HoverTooltip({ content }: { content: string }) {
  return (
    <div className="relative inline-flex items-center ml-2 group -mt-1">
      <Info size={14} className="text-zinc-400 hover:text-zinc-600 transition-colors cursor-help" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-zinc-900 border border-zinc-700 text-white text-[10px] leading-relaxed p-3 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] text-center pointer-events-none normal-case font-normal tracking-normal">
        {content}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-900" />
      </div>
    </div>
  );
}

const formatFabric = (str: string) => {
  if (!str) return '';
  return str.trim().split(/\s+/).map(w => {
    return w.split('-').map(part => part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : '').join('-');
  }).join(' ');
};

export type Category = 'Athleisure' | 'Executive' | 'Auto-Industry' | 'Golf' | 'Streetwear' | 'Swimwear' | 'Elevated Basics';
export type Gender = 'Male' | 'Female' | 'Accessories';
export type GarmentType = 'Tops' | 'Bottom' | 'Headwear' | 'Bags' | 'Tumblers' | 'Other' | 'T-Shirt' | 'Hoodie' | 'Polo' | 'Pants' | 'Outerwear' | 'Swim' | 'Quarter Zip' | 'Long Sleeve';

export interface Garment {
  id: number;
  name: string;
  description: string;
  price: number;
  category: Category;
  categories?: Category[];
  gender: Gender;
  type: GarmentType;
  types?: GarmentType[];
  image: string;
  images?: string[];
  supplier_link?: string;
  fabric_details?: string;
  fabric_finish?: string;
  care_instructions?: string;
  fit?: 'Slim' | 'Regular' | 'Loose' | 'Oversize' | '';
  fabric_weight_gsm?: string;
  decoration_method?: string;
  sizes?: string[];
  available_colors?: string;
  wholesale_price?: number;
  cost_price?: number;
  msrp?: number;
  market_analysis?: any[] | null;
  moq?: number;
  turn_time?: string;
  mockup_status?: 'New Mock Needed' | 'Working' | 'Final Mock Uploaded';
  created_at?: string;
  updated_at?: string;
}

export interface BrandColor {
  hex: string;
  pantone: string;
  image?: string;
}

export interface Customer {
  id: number;
  name: string;
  company: string;
  colors?: BrandColor[];
  color1?: string;
  color2?: string;
  color3?: string;
  pantone1?: string;
  pantone2?: string;
  pantone3?: string;
}

export const getCustomerColors = (c: Customer): BrandColor[] => {
  if (c.colors && c.colors.length > 0) return c.colors;
  const legacy: BrandColor[] = [];
  if (c.color1 || c.pantone1) legacy.push({ hex: c.color1 || '#f4f4f5', pantone: c.pantone1 || '' });
  if (c.color2 || c.pantone2) legacy.push({ hex: c.color2 || '#f4f4f5', pantone: c.pantone2 || '' });
  if (c.color3 || c.pantone3) legacy.push({ hex: c.color3 || '#f4f4f5', pantone: c.pantone3 || '' });
  
  while (legacy.length < 3) {
    legacy.push({ hex: '#f4f4f5', pantone: '' });
  }
  return legacy;
};

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
  cover_images?: string[];
  show_pricing?: boolean;
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
  market_analysis?: any[] | null;
  custom_sizes?: string;
  variations?: string[];
  order_index?: number;
  mockup_status?: 'New Mock Needed' | 'Working' | 'Final Mock Uploaded' | null;
  category?: string;
  categories?: Category[];
  gender?: string;
  type?: string;
  types?: GarmentType[];
  supplier_link?: string | null;
  fabric_details?: string | null;
  fabric_finish?: string | null;
  care_instructions?: string | null;
  fit?: 'Slim' | 'Regular' | 'Loose' | 'Oversize' | '' | null;
  fabric_weight_gsm?: string | null;
  decoration_method?: string | null;
  sizes?: string[] | null;
  available_colors?: string | null;
  custom_colors?: string[];
  wholesale_price?: number | null;
  cost_price?: number | null;
  msrp?: number | null;
  moq?: number | null;
  turn_time?: string | null;
  custom_msrp?: number | null;
  custom_wholesale_price?: number | null;
  custom_cost_price?: number | null;
}

type View = 'catalog' | 'admin' | 'customers' | 'deck-view' | 'mockup-studio' | 'presentation' | 'shared-presentation';

const compressImageIfNeeded = async (base64Str: string): Promise<string> => {
  if (!base64Str.startsWith('data:image/')) return base64Str;

  // Now that Firebase Storage proxying completely bypasses Vercel and goes direct to Cloud Storage
  // from the client via REST, we no longer need to destructively downscale the image on the client side. 
  // We simply pipe the raw full-resolution image straight to the backend for storage.
  return await uploadImageToStorage(base64Str, 'mockups');
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window !== 'undefined') {
      const authData = localStorage.getItem('wovn-auth');
      if (authData) {
        try {
          const { timestamp } = JSON.parse(authData);
          if (Date.now() - timestamp < 4 * 60 * 60 * 1000) {
            return true;
          } else {
            localStorage.removeItem('wovn-auth');
          }
        } catch (e) {
          // Fallback if old 'true' string is still in storage
          if (authData === 'true') {
            localStorage.setItem('wovn-auth', JSON.stringify({ timestamp: Date.now() }));
            return true;
          }
        }
      }
    }
    return false;
  });
  const [passwordInput, setPasswordInput] = useState('');

  const [view, setView] = useState<View>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('deck')) {
        return 'shared-presentation';
      }
      const saved = localStorage.getItem('lastView');
      // Gracefully downgrade deeply nested views missing volatile state on refresh
      if (saved === 'mockup-studio') {
        return localStorage.getItem('lastDeckId') ? 'deck-view' : 'catalog';
      }
      if (saved) {
        return saved as View;
      }
    }
    return 'catalog';
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && view !== 'shared-presentation') {
      localStorage.setItem('lastView', view);
    }
  }, [view]);


  const [selectedCategory, setSelectedCategory] = useState<Category | ''>('Athleisure');
  const [selectedGender, setSelectedGender] = useState<Gender | ''>('');
  const [selectedType, setSelectedType] = useState<GarmentType | ''>('');

  const [garments, setGarments] = useState<Garment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [currentDeck, setCurrentDeck] = useState<Deck | null>(null);
  const [selectedGarment, setSelectedGarment] = useState<Garment | null>(null);
  const [selectedDeckItem, setSelectedDeckItem] = useState<DeckItem | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && currentDeck?.id) {
      localStorage.setItem('lastDeckId', currentDeck.id.toString());
    }
  }, [currentDeck?.id]);

  useEffect(() => {
    if ((view === 'deck-view' || view === 'presentation') && !currentDeck) {
      const savedId = localStorage.getItem('lastDeckId');
      if (savedId) {
        fetch(`/api/decks/${savedId}`)
          .then(res => res.json())
          .then(deck => {
            if (deck && deck.id) setCurrentDeck(deck);
            else setView('catalog');
          })
          .catch(() => setView('catalog'));
      } else {
        setView('catalog');
      }
    }
  }, [view]);

  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [isDeckSelectorOpen, setIsDeckSelectorOpen] = useState(false);
  const [isNewDeckModalOpen, setIsNewDeckModalOpen] = useState(false);
  const [garmentToAddToDeck, setGarmentToAddToDeck] = useState<Garment | null>(null);
  const [garmentToEdit, setGarmentToEdit] = useState<Garment | null>(null);
  const [pendingMockupImage, setPendingMockupImage] = useState<string | null>(null);
  const [showPricing, setShowPricing] = useState(true);
  const [allDecks, setAllDecks] = useState<(Deck & { customer_name: string })[]>([]);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [backgroundTask, setBackgroundTask] = useState<{ message: string; subMessage?: string } | null>(null);
  const [isGeneratingGlobalColors, setIsGeneratingGlobalColors] = useState(false);

  useEffect(() => {
    if (currentDeck) {
      const params = new URLSearchParams(window.location.search);
      const pricingParam = params.get('pricing');
      if (pricingParam === 'off') {
        setShowPricing(false);
      } else if (pricingParam === 'on') {
        setShowPricing(true);
      } else {
        setShowPricing(currentDeck.show_pricing !== false);
      }
    }
  }, [currentDeck?.id, currentDeck?.show_pricing]);

  useEffect(() => {
    fetchGarments();
  }, [selectedCategory, selectedGender, selectedType]);

  useEffect(() => {
    fetchCustomers();

    const params = new URLSearchParams(window.location.search);
    const sharedDeckId = params.get('deck');

    const loadFirstDeckFallback = () => {
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
    };

    if (sharedDeckId) {
      if (!currentDeck) {
        fetch(`/api/decks/${sharedDeckId}`)
          .then(res => res.json())
          .then(deck => {
            if (deck && deck.id) {
              setCurrentDeck(deck);
              setView('shared-presentation');
            }
          })
          .catch(err => console.error("Could not load shared deck:", err));
      }
    } else {
      const savedId = localStorage.getItem('lastDeckId');
      if (savedId) {
        fetch(`/api/decks/${savedId}`)
          .then(res => {
            if (res.ok) return res.json();
            throw new Error();
          })
          .then(deck => {
            if (deck && deck.id) setCurrentDeck(deck);
            else throw new Error();
          })
          .catch(() => loadFirstDeckFallback());
      } else {
        loadFirstDeckFallback();
      }
    }
  }, []);

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

  const handleUpdateCustomer = async (id: number, updates: Partial<Customer>) => {
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
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

  const handleGlobalGenerateColors = async (customerId: number, colorsToGen: string[]) => {
    setIsGeneratingGlobalColors(true);
    setBackgroundTask({ message: 'Initializing color variations...' });
    try {
      const decksRes = await fetch(`/api/customers/${customerId}/decks`);
      const customerDecks = await decksRes.json();

      let totalItems = 0;
      let processedItems = 0;

      const decksData = [];
      for (const deck of customerDecks) {
        const res = await fetch(`/api/decks/${deck.id}`);
        const deckData = await res.json();
        decksData.push(deckData);
        totalItems += (deckData.items?.length || 0) * colorsToGen.length;
      }

      if (totalItems === 0) {
        setBackgroundTask(null);
        setIsGeneratingGlobalColors(false);
        return;
      }

      for (const deckData of decksData) {
        const items = deckData.items || [];
        for (const item of items) {
          const newVariations = [...(item.variations || [])];
          let changed = false;

          for (const hex of colorsToGen) {
            setBackgroundTask({
              message: `Generating Colors (${processedItems + 1}/${totalItems})`,
              subMessage: `Baking ${hex} variation for ${item.garment_name || 'an item'}...`
            });

            try {
              const newImage = await generateColorVariation(item.mock_image, hex);
              const compressed = await compressImageIfNeeded(newImage);
              newVariations.push(compressed);
              changed = true;
            } catch (err) {
              console.error("Failed to generate for color", hex, err);
            }
            processedItems++;
          }

          if (changed) {
            await fetch(`/api/deck-items/${item.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ variations: newVariations })
            });
          }
        }
      }
      setBackgroundTask({ message: 'Color variations complete!', subMessage: 'Changes saved to library.' });
      const timer = setTimeout(() => setBackgroundTask(null), 4000);
      return () => clearTimeout(timer);
    } catch (err) {
      console.error(err);
      setBackgroundTask({ message: 'Error during generation', subMessage: 'Please check console.' });
      setTimeout(() => setBackgroundTask(null), 4000);
    } finally {
      setIsGeneratingGlobalColors(false);
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

  const handleCreateDeck = async (customerId: number, name: string, rawCoverImages: string[] = []) => {
    if (!name || name.trim() === '') return;

    try {
      const coverImages = await Promise.all(rawCoverImages.map(img => compressImageIfNeeded(img)));
      const res = await fetch('/api/decks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: customerId, name: name.trim(), cover_images: coverImages })
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
      alert('Please select a client and deck first in the"Customers" tab.');
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
          order_index: currentDeck?.items?.length || 0,
          variations: garment.images || []
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

  if (!isAuthenticated && view !== 'shared-presentation') {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-xl w-full max-w-sm text-center">
          <img src="/wovn-logo.png" alt="WOVN" className="h-6 mx-auto mb-8 object-contain" />
          <h2 className="font-serif text-2xl mb-2">Team Access</h2>
          <p className="text-zinc-500 text-sm mb-8 leading-relaxed">Enter the team passcode to access the catalog dashboard.</p>
          <form onSubmit={(e) => {
            e.preventDefault();
            // Defaulting to "Wovn1!" for easy testing, override in Vercel if wanted.
            // @ts-ignore
            const correctPass = import.meta.env.VITE_APP_PASSWORD || 'Wovn1!';
            if (passwordInput === correctPass) {
              setIsAuthenticated(true);
              localStorage.setItem('wovn-auth', JSON.stringify({ timestamp: Date.now() }));
            } else {
              alert('Incorrect passcode');
            }
          }}>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Passcode"
              className="w-full bg-zinc-50 border-none rounded-xl p-4 text-center mb-4 focus:ring-2 ring-zinc-900 outline-none transition-all tracking-widest text-lg"
              autoFocus
            />
            <button
              type="submit"
              className="w-full bg-zinc-900 text-white py-4 rounded-xl text-xs uppercase tracking-widest font-bold hover:bg-zinc-800 transition-colors"
            >
              Enter
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      {view !== 'shared-presentation' && (
        <header className="border-b border-zinc-100 sticky top-0 bg-white/80 backdrop-blur-md z-50">
          <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 -ml-2">
                {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <div className="hidden md:flex items-center gap-6">
                <button
                  onClick={() => setView('catalog')}
                  className={`nav-link ${view === 'catalog' ? 'text-zinc-900' : ''}`}
                >
                  Collection
                </button>
                <button
                  onClick={() => setView('customers')}
                  className={`nav-link ${view === 'customers' ? 'text-zinc-900' : ''}`}
                >
                  Customers
                </button>
              </div>
            </div>

            <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-center">
              <img src="/wovn-logo.png" alt="WOVN DESIGN STUDIO" className="h-10 md:h-12 object-contain" />
            </div>

            <div className="flex items-center gap-4">
              {currentDeck && (
                <button 
                  onClick={() => setView('deck-view')}
                  className="hidden lg:flex items-center gap-2 px-4 py-2 bg-zinc-50 hover:bg-zinc-100 transition-colors cursor-pointer rounded-full border border-zinc-100"
                >
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">Active Deck:</span>
                  <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-900">{currentDeck.name}</span>
                </button>
              )}

              <div className="flex items-center gap-2">
                {isSearchOpen || globalSearchQuery ? (
                  <div className="flex items-center gap-2 border border-zinc-200 rounded-full px-4 py-2 bg-white flex-1 max-w-[200px] md:max-w-xs transition-all duration-300">
                    <Search size={14} className="text-zinc-400" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Search catalog..."
                      value={globalSearchQuery}
                      onChange={(e) => {
                        setGlobalSearchQuery(e.target.value);
                        if (view !== 'catalog') setView('catalog');
                      }}
                      onBlur={(e) => {
                        if (!e.target.value) setIsSearchOpen(false);
                      }}
                      className="bg-transparent border-none outline-none text-xs w-28 md:w-48 transition-all text-zinc-900 placeholder:text-zinc-400 font-medium"
                    />
                    {globalSearchQuery && (
                      <button onMouseDown={(e) => { e.preventDefault(); setGlobalSearchQuery(''); setIsSearchOpen(false); }}>
                        <X size={14} className="text-zinc-400 hover:text-zinc-900" />
                      </button>
                    )}
                  </div>
                ) : (
                  <button onClick={() => setIsSearchOpen(true)} className="p-2 hover:bg-zinc-50 rounded-full transition-colors">
                    <Search size={20} className="text-zinc-400" />
                  </button>
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
                    {['Athleisure', 'Executive', 'Auto-Industry', 'Golf', 'Streetwear', 'Swimwear', 'Elevated Basics'].map((cat) => (
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
                  <h3 className="text-[10px] uppercase tracking-widest text-zinc-400 mb-6 font-bold">Gender</h3>
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
                  <h3 className="text-[10px] uppercase tracking-widest text-zinc-400 mb-6 font-bold">Type</h3>
                  <div className="flex flex-col gap-4">
                    {['Tops', 'Bottom', 'Headwear', 'Bags', 'Tumblers', 'Other', 'T-Shirt', 'Hoodie', 'Polo', 'Pants', 'Outerwear', 'Swim', 'Quarter Zip', 'Long Sleeve'].map((t) => (
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

      <AnimatePresence>
        {backgroundTask && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-6 right-6 bg-zinc-950 text-zinc-50 px-6 py-4 rounded-2xl shadow-2xl z-[120] flex items-center gap-4 border border-zinc-800"
          >
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <div>
              <p className="font-bold text-sm">{backgroundTask.message}</p>
              {backgroundTask.subMessage && <p className="text-xs opacity-70 mt-0.5">{backgroundTask.subMessage}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1">
        {view === 'catalog' && (
          <CatalogView
            garments={garments.filter(g => 
              !globalSearchQuery || 
              g.name.toLowerCase().includes(globalSearchQuery.toLowerCase()) || 
              (g.category && g.category.toLowerCase().includes(globalSearchQuery.toLowerCase())) ||
              (g.description && g.description.toLowerCase().includes(globalSearchQuery.toLowerCase()))
            )}
            category={selectedCategory}
            gender={selectedGender}
            type={selectedType}
            currentDeck={currentDeck}
            onSelectGarment={(g) => { setSelectedGarment(g); setSelectedDeckItem(null); setView('mockup-studio'); }}
            onAddToDeck={(g) => { setGarmentToAddToDeck(g); setIsDeckSelectorOpen(true); }}
            onDeleteGarment={handleDeleteGarment}
            onAddGarment={() => { setGarmentToEdit(null); setView('admin'); }}
            onEditGarment={(g) => { setGarmentToEdit(g); setView('admin'); }}
          />
        )}
        {view === 'admin' && <AdminView onGarmentAdded={fetchGarments} initialEditingGarment={garmentToEdit} onClearEdit={() => setGarmentToEdit(null)} />}
        {view === 'customers' && (
          <CustomersView
            customers={customers}
            onAddCustomer={handleCreateCustomer}
            onSelectCustomer={(c) => { setSelectedCustomer(c); }}
            onDeleteCustomer={handleDeleteCustomer}
            onViewDeck={(d) => { setCurrentDeck(d); setView('deck-view'); }}
            onCreateDeck={() => setIsNewDeckModalOpen(true)}
            onUpdateCustomer={handleUpdateCustomer}
            onGenerateColors={handleGlobalGenerateColors}
            isGeneratingColors={isGeneratingGlobalColors}
          />
        )}
        {view === 'deck-view' && currentDeck && (
          <DeckPresentationView
            deck={currentDeck}
            customer={customers.find(c => c.id === currentDeck.customer_id) || null}
            showPricing={showPricing}
            setShowPricing={(newPricing) => {
              setShowPricing(newPricing);
              setCurrentDeck(prev => prev ? { ...prev, show_pricing: newPricing } : null);
              fetch(`/api/decks/${currentDeck.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ show_pricing: newPricing })
              }).catch(err => console.error(err));
            }}
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
            deckItem={selectedDeckItem}
            customer={currentDeck ? customers.find(c => c.id === currentDeck.customer_id) : null}
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
            onConfirm={(name, coverImages) => handleCreateDeck(selectedCustomer.id, name, coverImages)}
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

function CatalogView({ garments, category, gender, type, currentDeck, onSelectGarment, onAddToDeck, onDeleteGarment, onAddGarment, onEditGarment }: {
  garments: Garment[],
  category: string,
  gender: string,
  type: string,
  currentDeck: Deck | null,
  onSelectGarment: (g: Garment) => void,
  onAddToDeck: (g: Garment) => void,
  onDeleteGarment: (g: Garment) => void,
  onAddGarment: () => void,
  onEditGarment: (g: Garment) => void
}) {
  const [viewingGarment, setViewingGarment] = useState<Garment | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [sortOrder, setSortOrder] = useState<"default" | "asc" | "desc">("default");
  const [expandedSection, setExpandedSection] = useState<string | null>('fabric');

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
          <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 font-bold">
            {[category, gender].filter(Boolean).join(' /') || 'All Garments'}
          </p>
          <h2 className="editorial-title">{type || 'Collection'}</h2>
        </div>
        <div className="flex flex-col md:items-end gap-4">
          <p className="text-zinc-500 max-w-md text-sm leading-relaxed md:text-right">
            Our curated collection of high-performance garments designed for the modern professional.
            Each piece is selected for its quality, durability, and aesthetic appeal.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={onAddGarment}
              className="bg-zinc-900 text-white px-4 py-2 rounded-full text-[10px] uppercase font-bold tracking-widest hover:bg-zinc-800 transition-colors shadow-sm whitespace-nowrap"
            >
              + Garment Library
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">Sort By</span>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="bg-transparent border-b border-zinc-200 py-1 text-sm font-medium focus:outline-none focus:border-zinc-900 cursor-pointer text-zinc-700"
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
            <div className="aspect-[3/4] bg-white mb-6 overflow-hidden relative">
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
                </div>
              </div>
            </div>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-serif text-xl mb-1">{garment.name}</h3>
                <p className="text-zinc-400 text-xs uppercase tracking-widest">{garment.categories?.join(', ') || garment.category}</p>
              </div>
              <p className="font-medium">${garment.msrp || garment.price}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {garments.length === 0 && (
        <div className="py-32 text-center border-2 border-dashed border-zinc-100 rounded-3xl">
          <ImageIcon className="mx-auto text-zinc-200 mb-4" size={48} />
          <p className="text-zinc-400 font-serif italic">No garments found matching your filters.</p>
        </div>
      )}

      <AnimatePresence>
        {viewingGarment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4 md:p-6"
            onClick={() => setViewingGarment(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="md:w-1/2 bg-white flex flex-col p-6 md:p-12 min-h-[30vh] md:min-h-[40vh]">
                <div className="flex-1 mb-6 relative min-h-[300px]">
                  <img src={viewingGarment.images && viewingGarment.images.length > 0 ? viewingGarment.images[activeImageIndex] : viewingGarment.image} alt={viewingGarment.name} className="absolute inset-0 w-full h-full object-contain" />
                </div>
                {viewingGarment.images && viewingGarment.images.length > 1 && (
                  <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
                    {viewingGarment.images.map((img, i) => (
                      <button key={i} onClick={() => setActiveImageIndex(i)} className={`flex-shrink-0 w-20 h-24 rounded-lg overflow-hidden border-2 transition-all ${activeImageIndex === i ? 'border-zinc-900 border-2' : 'border-zinc-200 hover:border-zinc-400'}`}>
                        <img src={img} className="w-full h-full object-cover bg-zinc-50" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="md:w-1/2 p-6 md:p-12 flex flex-col max-h-[60vh] md:max-h-[90vh] overflow-y-auto">
                <div className="flex justify-end mb-2 md:mb-4">
                  <button onClick={() => setViewingGarment(null)} className="p-2 hover:bg-zinc-50 rounded-full transition-colors">
                    <X size={24} />
                  </button>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-2 md:mb-3">{viewingGarment.categories?.join(', ') || viewingGarment.category} / {viewingGarment.types?.join(', ') || viewingGarment.type} / {viewingGarment.gender}</p>
                  <h2 className="font-serif text-3xl md:text-5xl mb-4 md:mb-6 leading-tight">{viewingGarment.name}</h2>
                  <div className="flex items-center gap-6 mb-8 pb-8 border-b border-zinc-100">
                    <div>
                      <span className="block text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-1">MSRP</span>
                      <span className="font-serif text-2xl">${viewingGarment.msrp?.toFixed(2) || viewingGarment.price.toFixed(2)}</span>
                    </div>
                    {(viewingGarment.wholesale_price ?? 0) > 0 && (
                      <div>
                        <span className="block text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-1">Wholesale</span>
                        <span className="font-serif text-2xl text-zinc-500">${viewingGarment.wholesale_price.toFixed(2)}</span>
                      </div>
                    )}
                    {(viewingGarment.cost_price ?? 0) > 0 && (
                      <div>
                        <span className="block text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-1">Cost</span>
                        <span className="font-serif text-2xl text-zinc-300">${viewingGarment.cost_price.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {viewingGarment.supplier_link && (
                    <a href={viewingGarment.supplier_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold text-zinc-500 hover:text-zinc-900 transition-colors mb-8 border border-zinc-200 hover:border-zinc-900 px-4 py-2 rounded-full">
                      Procurement Source ↗
                    </a>
                  )}

                  {/* At a Glance Specs */}
                  {(viewingGarment.moq || viewingGarment.turn_time || viewingGarment.fabric_weight_gsm) && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 bg-zinc-50 rounded-2xl p-6">
                      {viewingGarment.moq && (
                        <div>
                          <span className="block text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-1">MOQ</span>
                          <span className="text-sm font-medium text-zinc-900">{viewingGarment.moq} Units</span>
                        </div>
                      )}
                      {viewingGarment.turn_time && (
                        <div>
                          <span className="block text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-1">Turn Time</span>
                          <span className="text-sm font-medium text-zinc-900">{viewingGarment.turn_time}</span>
                        </div>
                      )}

                      {viewingGarment.fabric_weight_gsm && (
                        <div>
                          <span className="block text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-1">Weight</span>
                          <span className="text-sm font-medium text-zinc-900">{viewingGarment.fabric_weight_gsm}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Collapsible Sections */}
                  <div className="mb-10 border-t border-zinc-100">
                    {(viewingGarment.fabric_details || viewingGarment.fabric_finish) && (
                      <div className="border-b border-zinc-100">
                        <button 
                          onClick={() => setExpandedSection(expandedSection === 'fabric' ? null : 'fabric')}
                          className="w-full flex items-center justify-between py-5 text-xs uppercase tracking-widest font-bold text-zinc-900 hover:text-zinc-500 transition-colors"
                        >
                          <span>Fabric & Finish</span>
                          {expandedSection === 'fabric' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <AnimatePresence>
                          {expandedSection === 'fabric' && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="pb-6 text-sm text-zinc-500 leading-relaxed space-y-4">
                                {viewingGarment.fabric_details && <div><strong className="text-zinc-900 block mb-1">Material</strong>{viewingGarment.fabric_details}</div>}
                                {viewingGarment.fabric_finish && <div><strong className="text-zinc-900 block mb-1">Finish</strong>{viewingGarment.fabric_finish}</div>}
                                {viewingGarment.fit && <div><strong className="text-zinc-900 block mb-1">Fit</strong>{viewingGarment.fit}</div>}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {viewingGarment.care_instructions && (
                      <div className="border-b border-zinc-100">
                        <button 
                          onClick={() => setExpandedSection(expandedSection === 'care' ? null : 'care')}
                          className="w-full flex items-center justify-between py-5 text-xs uppercase tracking-widest font-bold text-zinc-900 hover:text-zinc-500 transition-colors"
                        >
                          <span>Care Instructions</span>
                          {expandedSection === 'care' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <AnimatePresence>
                          {expandedSection === 'care' && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="pb-6 text-sm text-zinc-500 leading-relaxed">
                                {viewingGarment.care_instructions}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {(viewingGarment.decoration_method || viewingGarment.available_colors) && (
                      <div className="border-b border-zinc-100">
                        <button 
                          onClick={() => setExpandedSection(expandedSection === 'customization' ? null : 'customization')}
                          className="w-full flex items-center justify-between py-5 text-xs uppercase tracking-widest font-bold text-zinc-900 hover:text-zinc-500 transition-colors"
                        >
                          <span>Customization</span>
                          {expandedSection === 'customization' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <AnimatePresence>
                          {expandedSection === 'customization' && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="pb-6 text-sm text-zinc-500 leading-relaxed space-y-4">
                                {viewingGarment.decoration_method && <div><strong className="text-zinc-900 block mb-1">Decoration Methods</strong>{viewingGarment.decoration_method}</div>}
                                {viewingGarment.available_colors && <div><strong className="text-zinc-900 block mb-1">Available Colors</strong>{viewingGarment.available_colors}</div>}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {viewingGarment.sizes && viewingGarment.sizes.length > 0 && (
                      <div className="border-b border-zinc-100">
                        <button 
                          onClick={() => setExpandedSection(expandedSection === 'sizing' ? null : 'sizing')}
                          className="w-full flex items-center justify-between py-5 text-xs uppercase tracking-widest font-bold text-zinc-900 hover:text-zinc-500 transition-colors"
                        >
                          <span>Sizing</span>
                          {expandedSection === 'sizing' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <AnimatePresence>
                          {expandedSection === 'sizing' && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="pb-6 text-sm text-zinc-500 leading-relaxed">
                                <div className="flex flex-wrap gap-2">
                                  {viewingGarment.sizes.map(size => (
                                    <span key={size} className="px-3 py-1 bg-zinc-100 rounded text-xs font-bold text-zinc-700 uppercase tracking-wider">{size}</span>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {viewingGarment.description && (
                      <div className="border-b border-zinc-100">
                        <button 
                          onClick={() => setExpandedSection(expandedSection === 'notes' ? null : 'notes')}
                          className="w-full flex items-center justify-between py-5 text-xs uppercase tracking-widest font-bold text-zinc-900 hover:text-zinc-500 transition-colors"
                        >
                          <span>Notes</span>
                          {expandedSection === 'notes' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <AnimatePresence>
                          {expandedSection === 'notes' && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="pb-6 text-sm text-zinc-500 leading-relaxed">
                                {viewingGarment.description}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-4">
                    <button
                      onClick={() => {
                        onEditGarment(viewingGarment);
                        setViewingGarment(null);
                      }}
                      className="w-full bg-white text-zinc-900 border border-zinc-200 px-8 py-5 text-sm uppercase tracking-widest font-bold hover:bg-zinc-50 transition-colors rounded-full shadow-sm"
                    >
                      Edit Garment
                    </button>
                    <button
                      onClick={() => {
                        onAddToDeck(viewingGarment);
                        setViewingGarment(null);
                      }}
                      className="w-full bg-zinc-900 text-white px-8 py-5 text-sm uppercase tracking-widest font-bold hover:bg-zinc-800 transition-colors rounded-full shadow-lg"
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

function AdminView({ onGarmentAdded, initialEditingGarment, onClearEdit }: { onGarmentAdded: () => void, initialEditingGarment?: Garment | null, onClearEdit?: () => void }) {
  const [images, setImages] = useState<string[]>([]);
  const [existingGarments, setExistingGarments] = useState<Garment[]>([]);
  const [editingGarment, setEditingGarment] = useState<Garment | null>(null);
  const [marketAnalysis, setMarketAnalysis] = useState<any[] | null>(null);
  const [fabricCompositions, setFabricCompositions] = useState<{ id: string, percentage: string, fabric: string }[]>([{ id: Math.random().toString(), percentage: '100', fabric: 'Cotton' }]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [librarySortBy, setLibrarySortBy] = useState<'default' | 'recent' | 'category' | 'gender' | 'type'>('default');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterGender, setFilterGender] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredAndSortedGarments = [...existingGarments]
    .filter(g => {
      if (searchQuery && (!g.name || !g.name.toLowerCase().includes(searchQuery.toLowerCase()))) return false;
      if (filterCategory && g.category !== filterCategory && !(g.categories && g.categories.includes(filterCategory as any))) return false;
      if (filterGender && g.gender !== filterGender) return false;
      if (filterType && g.type !== filterType && !(g.types && g.types.includes(filterType as any))) return false;
      return true;
    })
    .sort((a, b) => {
      if (librarySortBy === 'recent') {
        const timeA = new Date(a.updated_at || a.created_at || '1970-01-01').getTime();
        const timeB = new Date(b.updated_at || b.created_at || '1970-01-01').getTime();
        return timeB - timeA;
      }
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

  useEffect(() => {
    if (initialEditingGarment) {
      handleEditClick(initialEditingGarment);
      setIsModalOpen(true);
    }
  }, [initialEditingGarment]);

  const handleEditClick = (g: Garment) => {
    setEditingGarment(g);
    setImages(g.images && g.images.length > 0 ? g.images : [g.image]);
    
    let parsedComp: { id: string, percentage: string, fabric: string }[] = [];
    if (g.fabric_details) {
      const parts = g.fabric_details.split(',').map(s => s.trim()).filter(Boolean);
      for (const p of parts) {
        const match = p.match(/^(\d+(?:\.\d+)?)\s*%\s*(.+)$/);
        if (match) {
           parsedComp.push({ id: Math.random().toString(), percentage: match[1], fabric: formatFabric(match[2]) });
        } else {
           parsedComp.push({ id: Math.random().toString(), percentage: '', fabric: formatFabric(p) });
        }
      }
    }
    if (parsedComp.length === 0) {
       parsedComp.push({ id: Math.random().toString(), percentage: '100', fabric: 'Cotton' });
    }
    setFabricCompositions(parsedComp);
  };

  const handleCancelEdit = () => {
    setEditingGarment(null);
    setImages([]);
    setFabricCompositions([{ id: Math.random().toString(), percentage: '100', fabric: 'Cotton' }]);
    setIsModalOpen(false);
    if (onClearEdit) onClearEdit();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const compressed = await compressImageIfNeeded(reader.result as string);
          setImages(prev => [...prev, compressed]);
        } catch (err) {
          console.error("Failed to upload image", err);
          alert("Failed to upload image");
        }
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
      fabric_details: fabricCompositions.map(c => [c.percentage ? `${c.percentage}%` : '', c.fabric].filter(Boolean).join(' ')).join(', '),
      fabric_finish: formData.get('fabric_finish'),
      care_instructions: formData.get('care_instructions'),
      fit: formData.get('fit'),
      fabric_weight_gsm: formData.get('fabric_weight_gsm'),
      decoration_method: formData.getAll('decoration_method').join(', '),
      sizes: formData.getAll('sizes'),
      available_colors: formData.get('available_colors'),
      cost_price: parseFloat(formData.get('cost_price') as string) || 0,
      wholesale_price: parseFloat(formData.get('wholesale_price') as string) || 0,
      msrp: parseFloat(formData.get('msrp') as string) || 0,
      moq: parseInt(formData.get('moq') as string, 10),
      turn_time: formData.get('turn_time'),
      categories: formData.getAll('categories'),
      category: formData.getAll('categories')[0] || 'Athleisure',
      gender: formData.get('gender'),
      types: formData.getAll('types'),
      type: formData.getAll('types')[0] || 'Tops',
      supplier_link: formData.get('supplier_link'),
      mockup_status: formData.get('mockup_status'),
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
        setIsModalOpen(false);
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
        setIsModalOpen(false);
      } else {
        const errText = await res.text();
        alert(`Failed to add garment: ${res.status} ${errText}`);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="flex justify-between items-end mb-8 md:mb-12">
        <div>
          <h2 className="editorial-title">Garment Library</h2>
          <p className="text-zinc-500 text-sm mt-2 font-medium">Manage the catalog of base garments and styles.</p>
        </div>
        <button 
          onClick={() => {
            setEditingGarment(null);
            setImages([]);
            setFabricCompositions([{ id: Math.random().toString(), percentage: '100', fabric: 'Cotton' }]);
            setIsModalOpen(true);
          }}
          className="bg-zinc-900 text-white px-6 py-3 text-[10px] md:text-xs uppercase tracking-widest font-bold hover:bg-zinc-800 transition-colors rounded-full flex items-center gap-2 shadow-sm"
        >
          <Plus size={16} /> New Garment
        </button>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-8">
        <div className="relative w-full md:w-auto md:min-w-[280px] shrink-0">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Search Garment Library..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:bg-white focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 outline-none transition-all placeholder:text-zinc-400"
          />
        </div>
        <div className="flex flex-wrap gap-3 text-[10px] uppercase font-bold text-zinc-500 w-full md:w-auto flex-1">
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="bg-transparent border-b border-zinc-200 py-2 flex-1 focus:outline-none focus:border-zinc-900 cursor-pointer min-w-[120px]">
            <option value="">All Categories</option>
            <option value="Athleisure">Athleisure</option>
            <option value="Executive">Executive</option>
            <option value="Auto-Industry">Auto-Industry</option>
            <option value="Golf">Golf</option>
            <option value="Streetwear">Streetwear</option>
            <option value="Swimwear">Swimwear</option>
            <option value="Elevated Basics">Elevated Basics</option>
          </select>
          <select value={filterGender} onChange={e => setFilterGender(e.target.value)} className="bg-transparent border-b border-zinc-200 py-2 flex-1 focus:outline-none focus:border-zinc-900 cursor-pointer min-w-[120px]">
            <option value="">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Accessories">Accessories</option>
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-transparent border-b border-zinc-200 py-2 flex-1 focus:outline-none focus:border-zinc-900 cursor-pointer min-w-[120px]">
            <option value="">All Types</option>
            <option value="Tops">Tops</option>
            <option value="Bottom">Bottom</option>
            <option value="Headwear">Headwear</option>
            <option value="Bags">Bags</option>
            <option value="Tumblers">Tumblers</option>
            <option value="Other">Other</option>
            <option value="T-Shirt">T-Shirt</option>
            <option value="Hoodie">Hoodie</option>
            <option value="Polo">Polo</option>
            <option value="Pants">Pants</option>
            <option value="Outerwear">Outerwear</option>
            <option value="Swim">Swim</option>
            <option value="Quarter Zip">Quarter Zip</option>
            <option value="Long Sleeve">Long Sleeve</option>
          </select>
          <select
            value={librarySortBy}
            onChange={(e) => setLibrarySortBy(e.target.value as any)}
            className="bg-transparent border-b border-zinc-200 py-2 flex-1 focus:outline-none focus:border-zinc-900 cursor-pointer text-zinc-500 min-w-[120px]"
          >
            <option value="default">Sort: Default</option>
            <option value="recent">Sort: Recently Edited</option>
            <option value="category">Sort: Category</option>
            <option value="gender">Sort: Gender</option>
            <option value="type">Sort: Type</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
        {filteredAndSortedGarments.map(g => (
          <div key={g.id} onClick={() => { handleEditClick(g); setIsModalOpen(true); }} className="group cursor-pointer">
            <div className="aspect-[3/4] bg-white border border-zinc-100 rounded-2xl mb-3 overflow-hidden relative shadow-sm hover:shadow-md transition-all">
              <img src={g.image} alt={g.name} className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500" />
              {/* Mockup Status Indicator */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                <div className={`w-3 h-3 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.15)] ${g.mockup_status === 'New Mock Needed' ? 'bg-red-500 animate-pulse' : g.mockup_status === 'Working' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} title={g.mockup_status || "Final Mock Uploaded"} />
              </div>

              <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center border border-black/5 text-zinc-400 hover:text-zinc-900 shadow-sm z-10">
                <Edit2 size={14} />
              </div>
            </div>
            <h3 className="font-serif text-sm md:text-md leading-tight mb-1 truncate pr-2" title={g.name}>{g.name}</h3>
            <p className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold truncate">{g.categories?.join(', ') || g.category}</p>
          </div>
        ))}

        {filteredAndSortedGarments.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-zinc-100 rounded-3xl">
            <ImageIcon className="mx-auto text-zinc-200 mb-4" size={48} />
            <p className="text-zinc-400 font-serif italic mb-4">No garments found matching filters.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4 md:p-6 overflow-y-auto pt-safe pb-safe outline-none"
          >
             <motion.div
               initial={{ scale: 0.98, opacity: 0, y: 15 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.98, opacity: 0, y: 15 }}
               transition={{ type: "spring", stiffness: 350, damping: 30 }}
               onClick={e => e.stopPropagation()}
               className="bg-[#fafafa] w-full max-w-[1400px] xl:max-w-[90vw] rounded-2xl shadow-xl flex flex-col max-h-[90vh] md:max-h-[95vh] outline-none relative"
             >
               <div className="flex items-center justify-between px-6 md:px-8 py-4 bg-white rounded-t-2xl border-b border-zinc-100 shrink-0 sticky top-0 z-20">
                 <h2 className="font-serif text-xl md:text-2xl">{editingGarment ? 'Edit Item Specs' : 'New Garment'}</h2>
                 <button type="button" onClick={handleCancelEdit} className="p-2 hover:bg-zinc-50 rounded-full transition-colors text-zinc-400 hover:text-zinc-900">
                   <X size={20} />
                 </button>
               </div>

               <form id="garment-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 md:p-8 shrink min-h-0 custom-scrollbar">
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 w-full max-w-none mx-auto">
                   
                   {/* LEFT COLUMN: Imagery */}
                   <div className="lg:col-span-1 flex flex-col gap-6">
                      <div className="bg-white border border-zinc-100 rounded-xl p-5 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
                        <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-900 mb-4 block border-b border-zinc-100 pb-3">Item Imagery</label>
                        <div className="space-y-4">
                          {images.map((img, i) => (
                            <div key={i} className={`bg-zinc-50 border-2 ${i === 0 ? 'border-zinc-200' : 'border-zinc-100'} rounded-lg flex flex-col items-center justify-center relative overflow-hidden group ${i === 0 ? 'aspect-[3/4]' : 'aspect-square w-1/2'}`}>
                              <img src={img} className="w-full h-full object-contain p-2" />
                              <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <a
                                  href={img}
                                  download={`mockup-${i}.jpg`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Download Image"
                                  className="bg-white/90 p-1.5 rounded-full border border-black/5 text-zinc-500 hover:text-zinc-900 shadow-sm flex items-center justify-center cursor-pointer"
                                >
                                  <Download size={14} />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveImage(i)}
                                  title="Remove Image"
                                  className="bg-white/90 p-1.5 rounded-full border border-black/5 flex items-center justify-center shadow-sm"
                                >
                                  <Trash2 size={14} className="text-red-500" />
                                </button>
                              </div>
                              {i === 0 ? (
                                <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-zinc-900/90 backdrop-blur-sm text-white text-[8px] font-bold px-2 py-1 rounded-md uppercase tracking-widest shadow-sm">
                                  <ImageIcon size={10} /> Main Mockup
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleSetMainImage(i)}
                                  className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm border border-black/10 text-zinc-900 text-[8px] font-bold px-2 py-1 rounded-md uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-white shadow-sm"
                                >
                                  Make Main
                                </button>
                              )}
                            </div>
                          ))}

                          <label className="flex items-center justify-center gap-2 w-full py-4 bg-transparent border-2 border-dashed border-zinc-200 rounded-lg cursor-pointer hover:bg-zinc-50 hover:border-zinc-300 transition-colors">
                            <Upload size={16} className="text-zinc-400" />
                            <span className="text-xs uppercase tracking-widest font-bold text-zinc-500">Upload Media</span>
                            <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
                          </label>
                        </div>
                      </div>
                      
                      <MarketPricingAnalyzer 
                        itemDetails={{
                          name: editingGarment?.name,
                          type: editingGarment?.type,
                          category: editingGarment?.category,
                          details: editingGarment?.description,
                          fabric_details: typeof fabricCompositions === 'string' ? fabricCompositions : fabricCompositions.map(c => `${c.percentage}% ${c.fabric}`).join(', ')
                        }} 
                        initialAnalysis={marketAnalysis}
                        onAnalysisUpdate={setMarketAnalysis}
                      />
                   </div>

                   {/* RIGHT COLUMN: Details */}
                   <div className="lg:col-span-2 space-y-6">
                      
                      {/* CARD 1: Core Details */}
                      <div className="bg-white border border-zinc-100 rounded-xl p-5 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
                        <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-900 mb-5 block border-b border-zinc-100 pb-3">Core Details</label>
                        <div className="space-y-5">
                          <div>
                            <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 block">Item Name</label>
                            <input name="name" required className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-400 outline-none transition-all" defaultValue={editingGarment?.name || ""} placeholder="e.g. Camo Lightweight Puffer" />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 block">Supplier Link</label>
                              <input name="supplier_link" type="url" className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-400 outline-none transition-all" defaultValue={editingGarment?.supplier_link || ""} placeholder="https://supplier.com/item" />
                            </div>
                            <div>
                              <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 block">Garment Supplier Fit</label>
                              <select name="fit" className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-400 outline-none transition-all" defaultValue={editingGarment?.fit || "Regular"}>
                                <option value="Slim">Slim Fit</option>
                                <option value="Regular">Regular Fit</option>
                                <option value="Loose">Loose Fit</option>
                                <option value="Oversize">Oversized</option>
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                              <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 block">Mockup Status</label>
                              <select name="mockup_status" className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-400 outline-none transition-all" defaultValue={editingGarment?.mockup_status || "Final Mock Uploaded"}>
                                <option value="New Mock Needed">New Mock Needed</option>
                                <option value="Working">Working</option>
                                <option value="Final Mock Uploaded">Final Mock Uploaded</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 block">MOQ</label>
                              <input name="moq" type="number" className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-400 outline-none transition-all" defaultValue={editingGarment?.moq || ""} placeholder="e.g. 50" />
                            </div>
                            <div>
                              <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 block">Turn Time</label>
                              <input name="turn_time" type="text" className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-400 outline-none transition-all" defaultValue={editingGarment?.turn_time || ""} placeholder="e.g. 4-6 Weeks" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* CARD 2: Fabric & Options */}
                      <div className="bg-white border border-zinc-100 rounded-xl p-5 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
                        <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-900 mb-5 block border-b border-zinc-100 pb-3">Fabric & Finish</label>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                              <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 flex items-center justify-between">
                                <span>Fabric Composition</span>
                                <button type="button" onClick={() => setFabricCompositions(prev => [...prev, { id: Math.random().toString(), percentage: '', fabric: '' }])} className="text-zinc-500 hover:text-zinc-900 transition-colors flex items-center gap-1"><PlusCircle size={12} /> Add</button>
                              </label>
                              <div className="space-y-2">
                                {fabricCompositions.map((comp, idx) => (
                                  <div key={comp.id} className="flex gap-2 items-center">
                                    <div className="relative w-24 shrink-0">
                                      <input 
                                        type="number" 
                                        value={comp.percentage} 
                                        onChange={e => {
                                          const newComps = [...fabricCompositions];
                                          newComps[idx].percentage = e.target.value;
                                          setFabricCompositions(newComps);
                                        }} 
                                        placeholder="%" 
                                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg pr-6 pl-3 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-400 outline-none transition-all" 
                                      />
                                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 font-medium text-xs">%</span>
                                    </div>
                                    <select 
                                      value={comp.fabric || 'Cotton'} 
                                      onChange={e => {
                                        const val = e.target.value;
                                        if (val === '_add_custom_') {
                                          const custom = window.prompt("Enter new custom fabric:");
                                          if (custom && custom.trim() !== '') {
                                            const formatted = formatFabric(custom);
                                            const newComps = [...fabricCompositions];
                                            newComps[idx].fabric = formatted;
                                            setFabricCompositions(newComps);
                                          } else {
                                            const newComps = [...fabricCompositions];
                                            newComps[idx].fabric = comp.fabric || 'Cotton';
                                            setFabricCompositions(newComps);
                                          }
                                        } else {
                                          const newComps = [...fabricCompositions];
                                          newComps[idx].fabric = val;
                                          setFabricCompositions(newComps);
                                        }
                                      }}
                                      className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-400 outline-none transition-all min-w-0" 
                                    >
                                      {Array.from(new Set([
                                        "Cotton", "Organic Cotton", "Ring-Spun Cotton", "Combed Ring-Spun Cotton", 
                                        "Polyester", "Recycled Polyester", "Spandex", "Elastane", "Rayon", 
                                        "Viscose", "Nylon", "Silk", "Wool", "Linen", "Bamboo", "Modal", 
                                        "Acrylic", "Fleece", "French Terry", "Twill", "Canvas",
                                        ...fabricCompositions.map(c => c.fabric).filter(Boolean)
                                      ])).map(fab => (
                                        <option key={fab} value={fab}>{fab}</option>
                                      ))}
                                      <option disabled>──────────</option>
                                      <option value="_add_custom_">+ Add Fabric...</option>
                                    </select>
                                    {fabricCompositions.length > 1 && (
                                      <button 
                                        type="button" 
                                        onClick={() => setFabricCompositions(prev => prev.filter((_, i) => i !== idx))}
                                        className="p-1 text-zinc-400 hover:text-red-500 transition-colors shrink-0 outline-none"
                                      >
                                        <MinusCircle size={16} />
                                      </button>
                                    )}
                                  </div>
                                ))}

                              </div>
                            </div>
                            <div>
                              <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 block">Fabric Finish</label>
                              <textarea name="fabric_finish" rows={2} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-400 outline-none transition-all resize-none" defaultValue={editingGarment?.fabric_finish || ""} placeholder="e.g. Enzyme wash" />
                            </div>
                          </div>
                          <div>
                            <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 block">Care Instructions</label>
                            <textarea name="care_instructions" rows={2} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-400 outline-none transition-all resize-none" defaultValue={editingGarment?.care_instructions || ""} placeholder="e.g. Machine wash cold, tumble dry low" />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 block">Fabric Weight (GSM)</label>
                              <input name="fabric_weight_gsm" type="text" className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-400 outline-none transition-all" defaultValue={editingGarment?.fabric_weight_gsm || ""} placeholder="e.g. 250 GSM" />
                            </div>
                            <div>
                              <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 block">Colors (CSV)</label>
                              <input name="available_colors" type="text" className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-400 outline-none transition-all" defaultValue={editingGarment?.available_colors || ""} placeholder="Black, Navy, White" />
                            </div>
                          </div>
                          <div>
                            <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-2 block">Decoration Methods</label>
                            <div className="flex flex-wrap gap-2">
                              {['DTF', 'Vinyl', 'Heat Patch', 'Sew on Patch', 'Embroidery', 'Screen Print', 'Laser Engraving'].map(method => (
                                <label key={method} className="relative cursor-pointer">
                                  <input type="checkbox" name="decoration_method" value={method} defaultChecked={editingGarment?.decoration_method?.includes(method)} className="peer sr-only" />
                                  <span className="inline-block px-3 py-1.5 text-xs font-medium text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-md transition-all hover:bg-zinc-100 peer-checked:bg-zinc-900 peer-checked:text-white peer-checked:border-zinc-900">
                                    {method}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* CARD 3: Classifications */}
                      <div className="bg-white border border-zinc-100 rounded-xl p-5 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
                        <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-900 mb-5 block border-b border-zinc-100 pb-3">Classification Matrix</label>
                        <div className="space-y-6">
                            <div>
                              <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-2 block">Available Sizes</label>
                              <div className="flex flex-wrap gap-2">
                                {['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', 'OSFA'].map(size => (
                                  <label key={size} className="relative cursor-pointer">
                                    <input type="checkbox" name="sizes" value={size} defaultChecked={editingGarment?.sizes?.includes(size)} className="peer sr-only" />
                                    <span className="inline-block px-3 py-1.5 text-xs font-medium text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-md transition-all hover:bg-zinc-100 peer-checked:bg-zinc-900 peer-checked:text-white peer-checked:border-zinc-900 min-w-[3rem] text-center">
                                      {size}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-2 block">Categories</label>
                                <div className="flex flex-wrap gap-2">
                                  {['Athleisure', 'Executive', 'Auto-Industry', 'Golf', 'Streetwear', 'Swimwear', 'Elevated Basics'].map(cat => (
                                    <label key={cat} className="relative cursor-pointer">
                                      <input type="checkbox" name="categories" value={cat} defaultChecked={editingGarment?.categories?.includes(cat as any) || (!editingGarment?.categories?.length && editingGarment?.category === cat)} className="peer sr-only" />
                                      <span className="inline-block px-3 py-1.5 text-[10px] font-bold uppercase text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-full transition-all hover:bg-zinc-100 peer-checked:bg-zinc-900 peer-checked:text-white peer-checked:border-zinc-900">
                                        {cat}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-2 block">Garment Type</label>
                                <div className="flex flex-wrap gap-2">
                                  {['Tops', 'Bottom', 'Headwear', 'Bags', 'Tumblers', 'Other', 'T-Shirt', 'Hoodie', 'Polo', 'Pants', 'Outerwear', 'Swim', 'Quarter Zip', 'Long Sleeve'].map(t => (
                                    <label key={t} className="relative cursor-pointer">
                                      <input type="checkbox" name="types" value={t} defaultChecked={editingGarment?.types?.includes(t as any) || (!editingGarment?.types?.length && editingGarment?.type === t)} className="peer sr-only" />
                                      <span className="inline-block px-3 py-1.5 text-[10px] font-bold uppercase text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-full transition-all hover:bg-zinc-100 peer-checked:bg-zinc-900 peer-checked:text-white peer-checked:border-zinc-900">
                                        {t}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div>
                                <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-2 block">Target Gender</label>
                                <div className="flex flex-wrap gap-2">
                                  {['Male', 'Female', 'Accessories'].map(gen => (
                                    <label key={gen} className="relative cursor-pointer">
                                      <input type="radio" name="gender" value={gen} defaultChecked={editingGarment?.gender === gen || (!editingGarment && gen === 'Male')} className="peer sr-only" />
                                      <span className="inline-block px-3 py-1.5 text-[10px] font-bold uppercase text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-full transition-all hover:bg-zinc-100 peer-checked:bg-zinc-900 peer-checked:text-white peer-checked:border-zinc-900">
                                        {gen}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                            </div>
                        </div>
                      </div>

                      {/* CARD 4: Pricing */}
                      <div className="bg-white border border-zinc-100 rounded-xl p-5 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
                        <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-900 mb-5 block border-b border-zinc-100 pb-3 flex items-center gap-2">Pricing Strategy</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 block">Cost (USD)</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-medium">$</span>
                              <input name="cost_price" type="number" step="0.01" className="w-full bg-zinc-50 border border-zinc-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-400 outline-none transition-all font-medium" defaultValue={editingGarment?.cost_price || ""} placeholder="65.00" />
                            </div>
                          </div>
                          <div>
                            <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 block">Wholesale Price (USD)</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-medium">$</span>
                              <input name="wholesale_price" type="number" step="0.01" className="w-full bg-zinc-50 border border-zinc-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-400 outline-none transition-all font-medium" defaultValue={editingGarment?.wholesale_price || ""} placeholder="105.00" />
                            </div>
                          </div>
                          <div>
                            <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 block">MSRP (USD)</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-medium">$</span>
                              <input name="msrp" type="number" step="0.01" required className="w-full bg-zinc-50 border border-zinc-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-400 outline-none transition-all font-medium" defaultValue={editingGarment?.msrp || editingGarment?.price || ""} placeholder="219.00" />
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 p-3 bg-zinc-50 rounded-lg flex items-start gap-2 border border-zinc-100">
                          <Info size={14} className="text-zinc-400 shrink-0 mt-0.5" />
                          <p className="text-[10px] text-zinc-500 leading-relaxed">Ensure prices are accurate and reflect final agreed-upon rates for complete decoration and fulfillment packages per unit.</p>
                        </div>
                      </div>

                   </div>
                 </div>
               </form>

               {/* Modal Footer */}
               <div className="flex items-center justify-between px-6 md:px-10 py-4 bg-white rounded-b-2xl border-t border-zinc-100 shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.02)] sticky bottom-0 z-20">
                 {editingGarment ? (
                   <button type="button" onClick={async () => {
                     if (confirm("Are you sure you want to delete this garment? This action cannot be undone.")) {
                       try {
                         const res = await fetch(`/api/garments/${editingGarment.id}`, { method: 'DELETE' });
                         if (res.ok) {
                           onGarmentAdded();
                           fetchExisting();
                           handleCancelEdit();
                         }
                       } catch (err) { console.error(err); }
                     }
                   }} className="text-[10px] uppercase font-bold tracking-widest text-red-500 hover:text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5">
                     <Trash2 size={12} /> Delete Record
                   </button>
                 ) : (
                   <div />
                 )}
                 <div className="flex gap-4 items-center">
                   <button type="button" onClick={handleCancelEdit} className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 hover:text-zinc-900 transition-colors hidden sm:block">
                     Cancel
                   </button>
                   <button type="submit" form="garment-form" className="bg-zinc-900 text-white px-8 py-3 text-[10px] md:text-xs uppercase tracking-widest font-bold hover:bg-zinc-800 transition-colors rounded-full shadow-md">
                     Save Specifications
                   </button>
                 </div>
               </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CustomersView({ customers, onAddCustomer, onSelectCustomer, onDeleteCustomer, onViewDeck, onCreateDeck, onUpdateCustomer, onGenerateColors, isGeneratingColors }: {
  customers: Customer[],
  onAddCustomer: (e: React.FormEvent<HTMLFormElement>) => void,
  onSelectCustomer: (c: Customer) => void,
  onDeleteCustomer: (c: Customer) => void,
  onViewDeck: (d: Deck) => void,
  onCreateDeck: (customerId: number) => void,
  onUpdateCustomer: (id: number, updates: Partial<Customer>) => void,
  onGenerateColors: (customerId: number, colorsToGen: string[]) => void,
  isGeneratingColors: boolean
}) {
  const [selectedCustId, setSelectedCustId] = useState<number | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [assets, setAssets] = useState<CustomerAsset[]>([]);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [isUploadingAsset, setIsUploadingAsset] = useState(false);
  const [recoloringAssetId, setRecoloringAssetId] = useState<string | null>(null);
  const [resolvingPantone, setResolvingPantone] = useState<Record<number, boolean>>({});
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

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

  const handleRecolorAsset = async (assetImageUrl: string, hexColor: string) => {
    if (!selectedCustId) return;
    setIsUploadingAsset(true);
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = assetImageUrl.startsWith('http') ? `/api/cors-proxy?url=${encodeURIComponent(assetImageUrl)}` : assetImageUrl; // Handled proxy or generic depending on server setup... wait, let's just assume Firebase works with Anonymous.

        // Standard anonymous fallback
        img.src = assetImageUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No canvas context');

      ctx.drawImage(img, 0, 0);
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = hexColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const recoloredDataUrl = canvas.toDataURL('image/png');

      const res = await fetch(`/api/customers/${selectedCustId}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: recoloredDataUrl })
      });
      if (res.ok) {
        const newAsset = await res.json();
        setAssets(prev => [...prev, newAsset]);
      }
    } catch (err) {
      alert('Failed to recolor asset. Ensure image origin accepts CORS requests.');
    } finally {
      setIsUploadingAsset(false);
    }
  };

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

  const handleRenameDeck = async (newName: string, rawCoverImages: string[] = []) => {
    if (!editingDeck) return;
    try {
      const coverImages = await Promise.all(rawCoverImages.map(img => compressImageIfNeeded(img)));
      const res = await fetch(`/api/decks/${editingDeck.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, cover_images: coverImages })
      });
      if (res.ok) {
        setDecks(prev => prev.map(d => d.id === editingDeck.id ? { ...d, name: newName, cover_images: coverImages } : d));
        setEditingDeck(null);
      } else {
        alert('Failed to rename deck');
      }
    } catch {
      alert('Network error. Please try again.');
    }
  };

  const handleGenerateColors = () => {
    if (!selectedCustId) return;
    const cust = customers.find(c => c.id === selectedCustId);
    if (!cust) return;

    const currentColors = getCustomerColors(cust);
    const colorsToGen = currentColors.map(c => c.hex).filter(hex => hex && hex !== '#f4f4f5');
    if (colorsToGen.length === 0) {
      alert("Please set at least one brand color first.");
      return;
    }

    onGenerateColors(selectedCustId, colorsToGen);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-16">
        <div className="lg:col-span-1">
          <h2 className="editorial-title mb-8">Clients</h2>
          <form onSubmit={onAddCustomer} className="space-y-6 mb-12 p-6 bg-zinc-50 rounded-2xl">
            <h3 className="text-xs uppercase tracking-widest font-bold mb-4">New Customer</h3>
            <input name="name" placeholder="Contact Name (Optional)" className="w-full bg-transparent border-b border-zinc-200 py-2 outline-none focus:border-zinc-900" />
            <input name="company" required placeholder="Company Name" className="w-full bg-transparent border-b border-zinc-200 py-2 outline-none focus:border-zinc-900" />
            <button type="submit" className="w-full bg-zinc-900 text-white py-3 text-[10px] uppercase tracking-widest font-bold">Add Client</button>
          </form>

          <div className="space-y-2">
            {[...customers].sort((a, b) => a.company.localeCompare(b.company)).map(c => (
              <div key={c.id} className="relative group/card">
                <button
                  onClick={() => { setSelectedCustId(c.id); onSelectCustomer(c); }}
                  className={`w-full text-left p-4 rounded-xl transition-all flex items-center justify-between group-hover/card:pr-12 ${selectedCustId === c.id ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-50'}`}
                >
                  <div>
                    <p className="font-serif text-lg">{c.company}</p>
                    <p className={`text-xs ${selectedCustId === c.id ? 'text-zinc-400' : 'text-zinc-500'}`}>{c.name || <span className="italic opacity-50">No contact name</span>}</p>
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
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="editorial-title">{customers.find(c => c.id === selectedCustId)?.company}</h2>
                    <button
                      onClick={() => setEditingCustomer(customers.find(c => c.id === selectedCustId) || null)}
                      className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-full transition-colors"
                      title="Edit Client Profile"
                    >
                      <Edit2 size={24} />
                    </button>
                  </div>
                  <p className="text-zinc-500 mt-2 text-lg">
                    Contact: {customers.find(c => c.id === selectedCustId)?.name ? <span className="font-medium text-zinc-900">{customers.find(c => c.id === selectedCustId)?.name}</span> : <span className="italic text-zinc-400">Not provided</span>}
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
                  className="flex items-center gap-2 bg-zinc-900 text-white px-6 py-3 rounded-full text-xs uppercase tracking-widest font-bold hover:bg-zinc-800 transition-colors shadow-lg active:scale-95"
                >
                  <Plus size={16} /> New Deck
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {decks.map(d => (
                  <div
                    key={d.id}
                    className="group border border-zinc-100 rounded-[2rem] p-6 md:p-8 hover:border-zinc-900 transition-colors cursor-pointer"
                    onClick={() => onViewDeck(d)}
                  >
                    <div className="flex items-center justify-between mb-6 md:mb-8">
                      <div className="p-3 bg-zinc-50 rounded-2xl group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                        <Presentation size={24} />
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Presentation</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingDeck(d);
                          }}
                          className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                          title="Rename Presentation"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
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

              <div className="mt-16 sm:mt-24 pt-12 border-t border-zinc-100">
                <div className="mb-14">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="editorial-title text-2xl">Palette</h3>
                    <button
                      onClick={() => {
                        const c = customers.find(cust => cust.id === selectedCustId);
                        if (!c) return;
                        const newColors = [...getCustomerColors(c), { hex: '#f4f4f5', pantone: '' }];
                        onUpdateCustomer(c.id, { colors: newColors });
                      }}
                      className="flex items-center gap-1 bg-white border border-zinc-200 text-zinc-900 px-3 py-1.5 rounded-full text-xs uppercase tracking-widest font-bold hover:bg-zinc-50 transition-colors shadow-sm"
                    >
                      <Plus size={14} /> Add Color
                    </button>
                  </div>
                  <p className="text-zinc-500 text-sm mb-6">Select brand colors and patterns for {customers.find(c => c.id === selectedCustId)?.company}. Drag to reorder.</p>
                  <div className="flex gap-6 flex-wrap">
                    {getCustomerColors(customers.find(c => c.id === selectedCustId)!).map((colorObj, i) => {
                      let colorVal = colorObj.hex;
                      if (colorVal !== '#f4f4f5' && !colorVal.startsWith('#')) {
                        colorVal = '#' + colorVal; // Fallback for old corrupt data
                      }
                      const pantoneVal = colorObj.pantone;
                      const currentColors = getCustomerColors(customers.find(c => c.id === selectedCustId)!);

                      return (
                        <div 
                           key={i} 
                           draggable
                           onDragStart={(e) => {
                             setDraggedIdx(i);
                             e.dataTransfer.setData('text/plain', i.toString());
                           }}
                           onDragOver={(e) => e.preventDefault()}
                           onDrop={(e) => {
                             e.preventDefault();
                             if (draggedIdx === null || draggedIdx === i) return;
                             const c = customers.find(cust => cust.id === selectedCustId);
                             if (!c) return;
                             const newColors = [...getCustomerColors(c)];
                             const [moved] = newColors.splice(draggedIdx, 1);
                             newColors.splice(i, 0, moved);
                             setDraggedIdx(null);
                             onUpdateCustomer(c.id, { colors: newColors });
                           }}
                           className={`flex flex-col gap-3 group bg-white p-4 border border-zinc-100 rounded-2xl w-40 hover:border-zinc-300 transition-all shadow-sm cursor-grab active:cursor-grabbing ${draggedIdx === i ? 'opacity-50 scale-95' : ''}`}
                        >
                          <div className="flex justify-between items-center px-1 mb-[-4px]">
                            <GripHorizontal size={14} className="text-zinc-300 group-hover:text-zinc-500 transition-colors" />
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <label className="text-zinc-300 hover:text-zinc-900 transition-colors cursor-pointer" title="Upload Pattern Image">
                                <ImageIcon size={12} />
                                <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = async () => {
                                      const base64Str = reader.result as string;
                                      try {
                                        const compressed = await compressImageIfNeeded(base64Str);
                                        const c = customers.find(cust => cust.id === selectedCustId);
                                        if (!c) return;
                                        const newColors = [...getCustomerColors(c)];
                                        newColors[i] = { ...newColors[i], image: compressed };
                                        onUpdateCustomer(c.id, { colors: newColors });
                                      } catch (err) { }
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }} />
                              </label>
                              {colorObj.image && (
                                <button
                                  onClick={() => {
                                    const c = customers.find(cust => cust.id === selectedCustId);
                                    if (!c) return;
                                    const newColors = [...getCustomerColors(c)];
                                    newColors[i] = { ...newColors[i], image: undefined };
                                    onUpdateCustomer(c.id, { colors: newColors });
                                  }}
                                  className="text-zinc-300 hover:text-red-500 transition-colors"
                                  title="Remove Pattern Image"
                                >
                                  <MinusCircle size={12} />
                                </button>
                              )}
                              {currentColors.length > 1 && (
                                <button 
                                  onClick={() => {
                                    const c = customers.find(cust => cust.id === selectedCustId);
                                    if (!c) return;
                                    const newColors = currentColors.filter((_, idx) => idx !== i);
                                    onUpdateCustomer(c.id, { colors: newColors });
                                  }}
                                  className="text-zinc-300 hover:text-red-500 transition-colors"
                                  title="Remove Color"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                          <label className="w-full h-20 rounded-xl overflow-hidden cursor-pointer border-2 border-zinc-200 shadow-sm transition-all hover:scale-105 hover:border-zinc-900 relative flex items-center justify-center bg-checkerboard mx-auto">
                            {!colorObj.image && (
                              <input
                                type="color"
                                value={colorVal}
                                onChange={(e) => {
                                  const c = customers.find(cust => cust.id === selectedCustId);
                                  if (!c) return;
                                  const newColors = [...getCustomerColors(c)];
                                  newColors[i] = { ...newColors[i], hex: e.target.value };
                                  onUpdateCustomer(c.id, { colors: newColors });
                                }}
                                className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer opacity-0"
                              />
                            )}
                            <div className="absolute inset-0 pointer-events-none" style={{ 
                              backgroundColor: !colorObj.image && colorVal !== '#f4f4f5' ? colorVal : 'transparent',
                              backgroundImage: colorObj.image ? `url(${colorObj.image})` : 'none',
                              backgroundSize: 'cover',
                              backgroundPosition: 'center'
                            }} />
                          </label>
                          <div className="flex flex-col gap-2 mt-1">
                            <div>
                              <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-400 mb-1 block">Hex Code</label>
                              <input
                                type="text"
                                value={colorVal === '#f4f4f5' ? '' : colorVal.toUpperCase()}
                                onChange={(e) => {
                                  let val = e.target.value.trim();
                                  if (val && !val.startsWith('#')) val = '#' + val;
                                  const c = customers.find(cust => cust.id === selectedCustId);
                                  if (!c) return;
                                  const newColors = [...getCustomerColors(c)];
                                  newColors[i] = { ...newColors[i], hex: val };
                                  onUpdateCustomer(c.id, { colors: newColors });
                                }}
                                placeholder="#HEX"
                                className="w-full bg-transparent border-b border-zinc-200 py-1 text-xs outline-none focus:border-zinc-900 font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-400 mb-1 flex items-center gap-2">
                                Pantone
                                {resolvingPantone[i] && <div className="w-2 h-2 border border-zinc-400 border-t-transparent rounded-full animate-spin" />}
                              </label>
                              <input
                                type="text"
                                value={pantoneVal}
                                onChange={(e) => {
                                  const c = customers.find(cust => cust.id === selectedCustId);
                                  if (!c) return;
                                  const newColors = [...getCustomerColors(c)];
                                  newColors[i] = { ...newColors[i], pantone: e.target.value };
                                  onUpdateCustomer(c.id, { colors: newColors });
                                }}
                                onBlur={async () => {
                                  if (pantoneVal && pantoneVal.trim().length > 2) {
                                    setResolvingPantone(prev => ({ ...prev, [i]: true }));
                                    const hex = await convertColorToHex(pantoneVal);
                                    if (hex) {
                                      const c = customers.find(cust => cust.id === selectedCustId);
                                      if (c) {
                                        const newColors = [...getCustomerColors(c)];
                                        newColors[i] = { ...newColors[i], hex };
                                        onUpdateCustomer(c.id, { colors: newColors });
                                      }
                                    }
                                    setResolvingPantone(prev => ({ ...prev, [i]: false }));
                                  }
                                }}
                                placeholder="PMS..."
                                className="w-full bg-transparent border-b border-zinc-200 py-1 text-xs outline-none focus:border-zinc-900 font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-12 border-t border-zinc-100 flex items-center justify-between mb-8">
                  <div>
                    <h3 className="editorial-title text-2xl">Asset Vault</h3>
                    <p className="text-zinc-500 text-sm mt-1">Stored logos and assets for {customers.find(c => c.id === selectedCustId)?.company}.</p>
                  </div>
                  <label className={`flex items-center gap-2 px-6 py-3 rounded-full text-xs uppercase tracking-widest font-bold transition-all shadow-sm ${isUploadingAsset ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed' : 'bg-white border border-zinc-200 text-zinc-900 hover:border-zinc-900 cursor-pointer'}`}>
                    {isUploadingAsset ? <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" /> : <Upload size={16} />}
                    {isUploadingAsset ? 'Uploading' : 'Upload Asset'}
                    <input type="file" className="hidden" accept="image/*" onChange={handleUploadAsset} disabled={isUploadingAsset} />
                  </label>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {assets.map(asset => (
                    <div key={asset.id} className="aspect-square bg-checkerboard border border-zinc-100 rounded-2xl flex flex-col items-center justify-center relative overflow-visible group hover:border-zinc-300 transition-colors">
                      <img src={asset.image} className="w-full h-full object-contain p-4 transition-transform group-hover:scale-105" />

                      <div className="absolute top-2 left-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all z-20">
                        <div className="relative">
                          <button
                            onClick={(e) => { e.stopPropagation(); setRecoloringAssetId(recoloringAssetId === asset.id ? null : asset.id); }}
                            className="p-2 bg-white/90 backdrop-blur shadow-sm rounded-full text-zinc-400 hover:text-zinc-900 transition-all pointer-events-auto"
                            title="Recolor Asset"
                          >
                            <Palette size={14} />
                          </button>
                          {recoloringAssetId === asset.id && (
                            <div className="absolute top-full mt-2 left-0 w-[140px] bg-white p-3 rounded-xl shadow-xl border border-zinc-100 grid grid-cols-4 gap-2 z-50">
                              <p className="col-span-4 text-[9px] uppercase tracking-widest font-bold text-zinc-400 mb-1">Recolor</p>
                              {getCustomerColors(customers.find(c => c.id === selectedCustId)!).map(fc => (
                                <button
                                  key={fc.hex}
                                  onClick={(e) => { e.stopPropagation(); handleRecolorAsset(asset.image, fc.hex); setRecoloringAssetId(null); }}
                                  className="w-full aspect-square rounded shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] hover:scale-110 hover:shadow-md transition-all border border-black/5"
                                  style={{ backgroundColor: fc.hex }}
                                  title={`Recolor to ${fc.hex}`}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteAsset(asset.id); }}
                        className="absolute top-2 right-2 p-2 bg-white/90 backdrop-blur shadow-sm rounded-full text-zinc-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all pointer-events-auto z-20"
                        title="Remove Asset"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {assets.length === 0 && !isUploadingAsset && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-zinc-100 rounded-2xl bg-zinc-50/50">
                      <ImageIcon className="mx-auto text-zinc-300 mb-3" size={32} />
                      <p className="text-zinc-400 font-serif italic text-sm">No assets uploaded to the vault yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-zinc-100 rounded-[2rem] bg-zinc-50/50">
              <Users className="text-zinc-300 mb-6" size={48} />
              <h3 className="editorial-title text-3xl mb-2 text-zinc-400">Select a Client</h3>
              <p className="text-zinc-500 font-serif italic">Choose a client from the list to view their decks and assets.</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {editingCustomer && (
          <EditCustomerModal
            customer={editingCustomer}
            onClose={() => setEditingCustomer(null)}
            onSave={(updates) => {
              onUpdateCustomer(editingCustomer.id, updates);
              setEditingCustomer(null);
            }}
          />
        )}
        {editingDeck && (
          <DeckModal
            initialName={editingDeck.name}
            initialCoverImages={editingDeck.cover_images}
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
  onSave: (updates: Partial<Customer>) => void
}) {
  const [name, setName] = useState(customer.name || '');
  const [company, setCompany] = useState(customer.company || '');

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
        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 md:p-8 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-1">Client Profile</p>
            <h3 className="font-serif text-2xl">Edit Client</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-50 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Company Name</label>
            <input
              value={company}
              onChange={e => setCompany(e.target.value)}
              className="w-full bg-zinc-50 border-none rounded-xl p-4 text-sm outline-none focus:ring-2 ring-zinc-900 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Contact Name (Optional)</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-zinc-50 border-none rounded-xl p-4 text-sm outline-none focus:ring-2 ring-zinc-900 transition-all"
              placeholder="Add contact name later..."
            />
          </div>
        </div>

        <div className="p-6 md:p-8 border-t border-zinc-100 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 bg-zinc-50 text-zinc-900 py-4 rounded-full text-xs uppercase tracking-widest font-bold hover:bg-zinc-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave({ name, company })}
            className="flex-1 bg-zinc-900 text-white py-4 rounded-full text-xs uppercase tracking-widest font-bold hover:bg-zinc-800 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function DeckPresentationView({ deck, customer, onBack, onGarmentClick, onPresent, onRemoveItem, showPricing, setShowPricing }: {
  deck: Deck,
  customer: Customer | null,
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
  const [draggedItemId, setDraggedItemId] = useState<number | null>(null);
  const [isGarmentSelectorOpen, setIsGarmentSelectorOpen] = useState(false);
  const [libraryGarments, setLibraryGarments] = useState<Garment[]>([]);
  const [expandedSelectorGarmentId, setExpandedSelectorGarmentId] = useState<number | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterGender, setFilterGender] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lineSheetMode, setLineSheetMode] = useState<'individual' | 'combo' | null>(null);

  const fetchItems = () => {
    fetch(`/api/decks/${deck.id}`)
      .then(res => res.json())
      .then(data => setItems(data.items));
  };

  useEffect(() => {
    fetchItems();
  }, [deck.id]);

  useEffect(() => {
    if (isGarmentSelectorOpen && libraryGarments.length === 0) {
      fetch('/api/garments').then(res => res.json()).then(setLibraryGarments);
    }
  }, [isGarmentSelectorOpen]);

  const toggleGarmentInDeck = async (garment: Garment) => {
    const existingItem = items.find(i => i.garment_id === garment.id);
    if (existingItem) {
      // Remove it
      await fetch(`/api/deck-items/${existingItem.id}`, { method: 'DELETE' });
      setItems(prev => prev.filter(i => i.id !== existingItem.id));
    } else {
      // Add it
      // Deduplicate variations by URL base path to prevent dynamic Firebase token mismatches creating phantom duplicates
      const uniqueVariations: string[] = [];
      const seenBases = new Set<string>();
      
      const mainBase = garment.image?.split('?')[0];
      if (mainBase) seenBases.add(mainBase);

      for (const img of (garment.images || [])) {
        if (!img) continue;
        const base = img.split('?')[0];
        if (!seenBases.has(base)) {
          seenBases.add(base);
          uniqueVariations.push(img);
        }
      }

      const res = await fetch(`/api/decks/${deck.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          garment_id: garment.id,
          mock_image: garment.image,
          order_index: items.length,
          variations: uniqueVariations
        })
      });
      if (res.ok) {
        fetchItems(); // refresh to get the new item with ID
      }
    }
  };

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

  const handleDragStart = (e: React.DragEvent, id: number) => {
    if (sortBy !== 'default') return;
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = 'move';
    // Hide the drag image ghost slightly or just let default
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (sortBy !== 'default') return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    if (sortBy !== 'default' || draggedItemId === null || draggedItemId === targetId) {
      setDraggedItemId(null);
      return;
    }

    const sourceIdx = items.findIndex(i => i.id === draggedItemId);
    const targetIdx = items.findIndex(i => i.id === targetId);

    if (sourceIdx < 0 || targetIdx < 0) {
      setDraggedItemId(null);
      return;
    }

    const newItems = [...items];
    const [movedItem] = newItems.splice(sourceIdx, 1);
    newItems.splice(targetIdx, 0, movedItem);

    newItems.forEach((item, idx) => item.order_index = idx);
    setItems(newItems);
    setDraggedItemId(null);

    await fetch(`/api/decks/${deck.id}/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: newItems.map(i => ({ id: i.id, order_index: i.order_index })) })
    });
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
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

  const [erasingBgItem, setErasingBgItem] = useState<DeckItem | null>(null);

  const handleRemoveBackgroundClick = (e: React.MouseEvent, item: DeckItem) => {
    e.stopPropagation();
    setErasingBgItem(item);
  };

  const handleSaveErasedImage = async (finalUrl: string) => {
    if (!erasingBgItem) return;
    const item = erasingBgItem;
    const currentUrl = activeVariations[item.id] || item.mock_image;

    try {
      let updatedMockImage = item.mock_image;
      let updatedVariations = item.variations ? [...item.variations] : [];

      if (currentUrl === item.mock_image) {
        updatedMockImage = finalUrl;
      } else {
        const idx = updatedVariations.indexOf(currentUrl);
        if (idx >= 0) {
          updatedVariations[idx] = finalUrl;
        } else {
          updatedVariations.push(finalUrl);
        }
      }

      const res = await fetch(`/api/deck-items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mock_image: updatedMockImage,
          variations: updatedVariations
        })
      });

      if (res.ok) {
        // Apply changes directly to React state
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, mock_image: updatedMockImage, variations: updatedVariations } : i));
        setActiveVariations(prev => ({ ...prev, [item.id]: finalUrl }));
      } else {
        alert('Failed to update image on the server.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while updating image.');
    } finally {
      setErasingBgItem(null);
    }
  };

  const handleDownloadItem = async (e: React.MouseEvent, item: DeckItem) => {
    e.stopPropagation();
    const url = activeVariations[item.id] || item.mock_image;
    const name = item.custom_name || item.garment_name || 'deck-item';
    try {
      if (url.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = url;
        link.download = `${name.replace(/\\s+/g, '_')}.png`;
        link.click();
      } else {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${name.replace(/\\s+/g, '_')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }
    } catch (err) {
      console.error('Failed to download image:', err);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${name.replace(/\\s+/g, '_')}.png`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
        {isGarmentSelectorOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4 md:p-6"
            onClick={() => setIsGarmentSelectorOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-8 border-b border-zinc-100 flex flex-col md:flex-row justify-between items-start md:items-center bg-zinc-50/50 gap-4">
                <div>
                  <h2 className="font-serif text-3xl mb-1">Garment Library</h2>
                  <p className="text-zinc-500 text-sm">Select items to add or remove them from <strong>{deck.name}</strong></p>
                </div>
                <button onClick={() => setIsGarmentSelectorOpen(false)} className="p-3 bg-white hover:bg-zinc-100 rounded-full transition-colors shadow-sm self-end md:self-auto">
                  <X size={24} />
                </button>
              </div>

              <div className="px-8 py-4 border-b border-zinc-100 bg-white flex flex-col md:flex-row items-start md:items-center gap-4 shrink-0">
                <div className="relative w-full md:w-auto md:min-w-[240px] shrink-0">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                    <Search size={16} />
                  </div>
                  <input
                    type="text"
                    placeholder="Search Garments..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs focus:bg-white focus:border-zinc-400 outline-none transition-all placeholder:text-zinc-400"
                  />
                </div>
                <div className="flex flex-wrap gap-2 text-[10px] uppercase font-bold text-zinc-500 w-full md:w-auto flex-1">
                  <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="bg-transparent border-b border-zinc-200 py-2 flex-1 focus:outline-none focus:border-zinc-900 cursor-pointer min-w-[100px]">
                    <option value="">All Categories</option>
                    <option value="Athleisure">Athleisure</option>
                    <option value="Executive">Executive</option>
                    <option value="Auto-Industry">Auto-Industry</option>
                    <option value="Golf">Golf</option>
                    <option value="Streetwear">Streetwear</option>
                    <option value="Swimwear">Swimwear</option>
                    <option value="Elevated Basics">Elevated Basics</option>
                  </select>
                  <select value={filterGender} onChange={e => setFilterGender(e.target.value)} className="bg-transparent border-b border-zinc-200 py-2 flex-1 focus:outline-none focus:border-zinc-900 cursor-pointer min-w-[100px]">
                    <option value="">All Genders</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Accessories">Accessories</option>
                  </select>
                  <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-transparent border-b border-zinc-200 py-2 flex-1 focus:outline-none focus:border-zinc-900 cursor-pointer min-w-[100px]">
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
              
              <div className="p-8 overflow-y-auto bg-zinc-50 flex-1 hide-scrollbar">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {libraryGarments.filter(g => {
                    if (searchQuery && (!g.name || !g.name.toLowerCase().includes(searchQuery.toLowerCase()))) return false;
                    if (filterCategory && g.category !== filterCategory && !(g.categories && g.categories.includes(filterCategory as any))) return false;
                    if (filterGender && g.gender !== filterGender) return false;
                    if (filterType && g.type !== filterType && !(g.types && g.types.includes(filterType as any))) return false;
                    return true;
                  }).map((garment, idx) => {
                    const isInDeck = items.some(i => i.garment_id === garment.id);
                    const isExpanded = expandedSelectorGarmentId === garment.id;
                    // Determine safe side to expand: expand left if in last column of a 4/3 col layout
                    const isRightEdge = (idx + 1) % 4 === 0 || ((idx + 1) % 3 === 0 && window.innerWidth < 1024);
                    
                    return (
                      <div key={garment.id} className="relative z-0">
                        {/* Main Garment Card */}
                        <div 
                          onClick={() => toggleGarmentInDeck(garment)}
                          className={`bg-white rounded-2xl cursor-pointer transition-all duration-300 relative border-2 overflow-hidden ${isInDeck ? 'border-emerald-500 shadow-md ring-4 ring-emerald-500/20' : 'border-transparent hover:border-zinc-300 hover:shadow-lg'}`}
                        >
                          {/* Expansion Toggle Button */}
                          <div 
                            className={`absolute top-3 left-3 z-20 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center cursor-pointer shadow-sm border border-zinc-200 hover:bg-zinc-900 hover:text-white transition-all duration-300 text-zinc-400 opacity-0 group-hover:opacity-100 ${isExpanded ? 'opacity-100 bg-zinc-900 text-white !border-zinc-900 rotate-180' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedSelectorGarmentId(isExpanded ? null : garment.id);
                            }}
                          >
                            <ChevronRight size={16} />
                          </div>

                          <div className="aspect-[4/5] p-6 relative group">
                            <img src={garment.image} alt={garment.name} className="w-full h-full object-contain mix-blend-multiply" />
                            <div className={`absolute inset-0 bg-black/5 transition-opacity ${isInDeck ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`} />
                          </div>
                          <div className="p-5 border-t border-zinc-100 bg-white group hover:bg-zinc-50 transition-colors">
                            <h3 className="font-serif text-lg leading-tight mb-1 line-clamp-1">{garment.name}</h3>
                            <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">{garment.category}</p>
                          </div>
                          
                          {/* Status indicators */}
                          <div className="absolute top-3 right-3 z-10 group cursor-pointer block">
                            {isInDeck ? (
                              <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg backdrop-blur-md">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                              </div>
                            ) : (
                              <div className="w-8 h-8 bg-white/80 border border-zinc-200 rounded-full flex items-center justify-center text-zinc-400 opacity-0 transition-opacity hover:bg-zinc-900 hover:text-white hover:border-zinc-900 group-hover:opacity-100 shadow-sm backdrop-blur-md">
                                <Plus size={16} />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Expanding Details Popover */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ width: 0, opacity: 0 }}
                              animate={{ width: 280, opacity: 1 }}
                              exit={{ width: 0, opacity: 0 }}
                              className={`absolute top-0 bottom-0 ${isRightEdge ? 'right-[105%]' : 'left-[105%]'} bg-white rounded-2xl shadow-2xl border border-zinc-200 z-[60] overflow-hidden`}
                            >
                              <div className="w-[280px] p-6 h-full flex flex-col hide-scrollbar overflow-y-auto">
                                <div className="flex justify-between items-start mb-6">
                                  <h4 className="font-serif text-xl">{garment.name}</h4>
                                  <button onClick={() => setExpandedSelectorGarmentId(null)} className="p-1 hover:bg-zinc-100 rounded-full text-zinc-400 flex-shrink-0">
                                    <X size={16} />
                                  </button>
                                </div>
                                <div className="space-y-4 flex-1">
                                  {(garment.msrp !== undefined || garment.price !== undefined) && (
                                    <div>
                                      <strong className="block text-[9px] uppercase tracking-widest font-bold text-zinc-400 mb-0.5">MSRP</strong>
                                      <span className="text-sm font-medium text-zinc-900">${garment.msrp?.toFixed(2) || garment.price.toFixed(2)}</span>
                                    </div>
                                  )}
                                  {garment.fabric_details && (
                                    <div>
                                      <strong className="block text-[9px] uppercase tracking-widest font-bold text-zinc-400 mb-0.5">Fabric</strong>
                                      <span className="text-xs text-zinc-700 leading-relaxed">{garment.fabric_details}</span>
                                    </div>
                                  )}
                                  {garment.fit && (
                                    <div>
                                      <strong className="block text-[9px] uppercase tracking-widest font-bold text-zinc-400 mb-0.5">Fit</strong>
                                      <span className="text-xs text-zinc-700">{garment.fit}</span>
                                    </div>
                                  )}
                                  {garment.sizes && garment.sizes.length > 0 && (
                                    <div>
                                      <strong className="block text-[9px] uppercase tracking-widest font-bold text-zinc-400 mb-1">Sizes</strong>
                                      <div className="flex flex-wrap gap-1">
                                        {garment.sizes.map(s => <span key={s} className="px-1.5 py-0.5 bg-zinc-100 rounded text-[9px] uppercase font-bold text-zinc-600">{s}</span>)}
                                      </div>
                                    </div>
                                  )}
                                  {garment.turn_time && (
                                    <div>
                                      <strong className="block text-[9px] uppercase tracking-widest font-bold text-zinc-400 mb-0.5">Turn Time</strong>
                                      <span className="text-xs text-zinc-700">{garment.turn_time}</span>
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={() => toggleGarmentInDeck(garment)}
                                  className={`mt-6 w-full py-3 rounded-lg text-xs uppercase tracking-widest font-bold transition-colors ${isInDeck ? 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200' : 'bg-zinc-900 text-white hover:bg-zinc-800'}`}
                                >
                                  {isInDeck ? 'Remove from Deck' : 'Add to Deck'}
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
                {libraryGarments.length === 0 && (
                  <div className="text-center py-20 text-zinc-400 italic font-serif">Loading library...</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-zinc-900 transition-colors mb-8 md:mb-12">
          <ArrowLeft size={16} /> Back to Clients
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 md:mb-20 gap-6 md:gap-8">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 font-bold">Presentation Deck</p>
            <h2 className="editorial-title">{deck.name}</h2>
          </div>
          <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between w-full gap-4 mt-8">
            
            {/* View Controls Group */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 bg-white border border-zinc-200 px-4 py-2 rounded-full shadow-sm">
                <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">Sort By:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-[10px] uppercase tracking-widest font-bold focus:outline-none cursor-pointer text-zinc-900 min-w-[110px]"
                >
                  <option value="default">Custom Order</option>
                  <option value="category">Category</option>
                  <option value="gender">Gender</option>
                  <option value="type">Type</option>
                </select>
              </div>

              <div className="flex items-center gap-1 bg-white border border-zinc-200 p-1.5 rounded-full shadow-sm">
                <button
                  onClick={() => setShowPricing(!showPricing)}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full transition-all text-[10px] uppercase tracking-widest font-bold ${showPricing ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'}`}
                >
                  {showPricing ? 'Pricing On' : 'Pricing Off'}
                </button>
              </div>

              <div className="flex items-center gap-1 bg-white border border-zinc-200 p-1.5 rounded-full shadow-sm">
                <button
                  onClick={() => setDisplayMode('presentation')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full transition-all text-[10px] uppercase tracking-widest font-bold ${displayMode === 'presentation' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'}`}
                >
                  <List size={14} /> List
                </button>
                <button
                  onClick={() => setDisplayMode('grid')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full transition-all text-[10px] uppercase tracking-widest font-bold ${displayMode === 'grid' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'}`}
                >
                  <Grid size={14} /> Grid
                </button>
              </div>
            </div>

            {/* Action Buttons Group */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsGarmentSelectorOpen(true)}
                className="bg-white border border-zinc-200 px-5 py-2.5 rounded-full text-[10px] uppercase tracking-widest font-bold text-zinc-600 hover:text-zinc-900 hover:border-zinc-400 transition-colors flex items-center gap-2 shadow-sm"
              >
                <Plus size={14} /> Add Library Item
              </button>
              <label className="bg-white border border-zinc-200 px-5 py-2.5 rounded-full text-[10px] uppercase tracking-widest font-bold text-zinc-600 hover:text-zinc-900 hover:border-zinc-400 transition-colors cursor-pointer flex items-center gap-2 shadow-sm">
                <Upload size={14} /> Custom Item
                <input type="file" className="hidden" accept="image/*" onChange={handleUploadExternal} />
              </label>
              
              <button
                onClick={async () => {
                  try {
                    // @ts-ignore
                    const baseDomain = import.meta.env.VITE_CUSTOM_DOMAIN || window.location.origin;
                    const url = `${baseDomain}${window.location.pathname}?deck=${deck.id}&pricing=${showPricing ? 'on' : 'off'}`;
                    const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);

                    if (!response.ok) throw new Error('Shortening failed');

                    const shortUrl = await response.text();
                    await navigator.clipboard.writeText(shortUrl);
                    alert('Anonymous share link copied to clipboard!');
                  } catch (err) {
                    // Fallback
                    // @ts-ignore
                    const baseDomain = import.meta.env.VITE_CUSTOM_DOMAIN || window.location.origin;
                    const url = `${baseDomain}${window.location.pathname}?deck=${deck.id}&pricing=${showPricing ? 'on' : 'off'}`;
                    navigator.clipboard.writeText(url).then(() => {
                      alert('Share link copied to clipboard! (Fallback original URL)');
                    }).catch(() => {
                      alert('Failed to copy link. Please manually copy:' + url);
                    });
                  }
                }}
                className="bg-zinc-900 text-white px-6 py-2.5 rounded-full text-[10px] uppercase tracking-widest font-bold hover:bg-zinc-800 transition-colors shadow-sm"
              >
                Share Link
              </button>
              
              <div className="relative group hidden sm:block">
                <button
                  className="bg-white border text-zinc-900 border-zinc-200 px-6 py-2.5 rounded-full text-[10px] uppercase tracking-widest font-bold hover:bg-zinc-50 transition-colors shadow-sm flex items-center gap-2"
                >
                  <List size={14} /> Line Sheets
                </button>
                <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-zinc-100 shadow-xl rounded-xl z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all flex flex-col p-2">
                  <button onClick={() => setLineSheetMode('individual')} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-widest text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 rounded-lg">Individual (1 per page)</button>
                  <button onClick={() => setLineSheetMode('combo')} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-widest text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 rounded-lg">Combo (4 per page)</button>
                </div>
              </div>
              <button
                onClick={() => onPresent()}
                className="bg-zinc-900 text-white px-6 py-2.5 rounded-full text-[10px] uppercase tracking-widest font-bold hover:bg-zinc-800 transition-colors flex items-center gap-2 shadow-sm"
              >
                <Presentation size={14} /> Present View
              </button>
            </div>
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
                  <div className="aspect-[4/5] bg-white shadow-2xl rounded-[2rem] overflow-hidden relative group">
                    <img
                      src={activeVariations[item.id] || item.mock_image}
                      alt={item.garment_name}
                      onClick={() => setZoomedImage(activeVariations[item.id] || item.mock_image)}
                      className="w-full h-full object-contain p-4 md:p-8 cursor-zoom-in"
                    />
                    <div className="absolute top-4 right-4 md:top-8 md:right-8 flex flex-col gap-2 md:gap-3 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all transform md:translate-x-4 group-hover:translate-x-0 pointer-events-none">
                      <button
                        onClick={() => handleMockupEdit(item)}
                        className="bg-white/90 backdrop-blur p-3 md:p-4 rounded-full shadow-lg hover:bg-zinc-900 hover:text-white transition-colors pointer-events-auto"
                        title="Edit Mockup"
                      >
                        <Wand2 size={20} />
                      </button>
                      <button
                        onClick={() => setGeneratingSceneForItem(item)}
                        className="bg-white/90 backdrop-blur p-3 md:p-4 rounded-full shadow-lg hover:bg-zinc-900 hover:text-white transition-colors pointer-events-auto"
                        title="Generate Scene"
                      >
                        <Camera size={20} />
                      </button>
                      <button
                        onClick={() => setEditingItem(item)}
                        className="bg-white/90 backdrop-blur p-4 rounded-full shadow-lg hover:bg-zinc-900 hover:text-white transition-colors pointer-events-auto"
                        title="Edit Details"
                      >
                        <Edit2 size={20} />
                      </button>
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="bg-white/90 backdrop-blur p-4 rounded-full shadow-lg hover:bg-red-500 hover:text-white transition-colors pointer-events-auto"
                        title="Remove from Deck"
                      >
                        <Trash2 size={20} />
                      </button>
                      <button
                        onClick={(e) => handleDownloadItem(e, item)}
                        className="bg-white/90 backdrop-blur p-4 rounded-full shadow-lg hover:bg-zinc-900 hover:text-white transition-colors pointer-events-auto"
                        title="Download as PNG"
                      >
                        <Download size={20} />
                      </button>

                      {sortBy === 'default' && (
                        <>
                          {index > 0 && (
                            <button
                              onClick={() => handleMoveItem(item.id, 'up')}
                              className="bg-white/90 backdrop-blur p-4 rounded-full shadow-lg hover:bg-zinc-900 hover:text-white transition-colors pointer-events-auto"
                              title="Move Up"
                            >
                              <ArrowUp size={20} />
                            </button>
                          )}
                          {index < displayedItems.length - 1 && (
                            <button
                              onClick={() => handleMoveItem(item.id, 'down')}
                              className="bg-white/90 backdrop-blur p-4 rounded-full shadow-lg hover:bg-zinc-900 hover:text-white transition-colors pointer-events-auto"
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
                    <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">Item {index + 1}</p>
                    <h3 className="font-serif text-3xl md:text-5xl leading-tight">{item.custom_name || item.garment_name}</h3>
                    <p className="text-zinc-500 text-base md:text-lg leading-relaxed">
                      {item.custom_description || item.garment_description}
                    </p>
                  </div>
                  <div className="pt-8 border-t border-zinc-200 flex items-center justify-between">
                    {showPricing ? <p className="text-2xl font-medium">${item.custom_price || item.garment_price}</p> : <div />}
                    <div className="flex flex-wrap gap-2">
                      {((Array.isArray(item.custom_sizes) ? item.custom_sizes.join(',') : item.custom_sizes) || (Array.isArray(item.sizes) ? item.sizes.join(',') : item.sizes) || 'XS,S,M,L,XL').split(',').map((size: string, idx: number) => (
                        <span key={idx} className="px-3 h-10 border border-zinc-200 rounded-full flex items-center justify-center text-[10px] font-bold text-zinc-900">
                          {size.trim()}
                        </span>
                      ))}
                    </div>
                  </div>

                  {Array.from(new Set([item.mock_image, ...(item.variations || [])])).length > 1 && (
                    <div className="pt-8 border-t border-zinc-200">
                      <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-4">View Variation</p>
                      <div className="flex gap-2 lg:gap-3 flex-wrap">
                        {Array.from(new Set([item.mock_image, ...(item.variations || [])])).map((v, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActiveVariations(prev => ({ ...prev, [item.id]: v }))}
                            className={`w-16 h-16 rounded-xl border-2 overflow-hidden transition-all p-1 bg-white ${(!activeVariations[item.id] && v === item.mock_image) || activeVariations[item.id] === v ? 'border-zinc-900 shadow-sm scale-105' : 'border-zinc-200 hover:border-zinc-400'}`}
                          >
                            <img src={v} className="w-full h-full object-contain" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Collapsible Sections */}
                  <div className="pt-8 border-t border-zinc-200">
                    {(item.fabric_details || item.fabric_finish) && (
                      <div className="border-b border-zinc-100">
                        <button 
                          onClick={() => setExpandedSection(expandedSection === `${item.id}-fabric` ? null : `${item.id}-fabric`)}
                          className="w-full flex items-center justify-between py-5 text-xs uppercase tracking-widest font-bold text-zinc-900 hover:text-zinc-500 transition-colors"
                        >
                          <span>Fabric & Finish</span>
                          {expandedSection === `${item.id}-fabric` ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <AnimatePresence>
                          {expandedSection === `${item.id}-fabric` && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="pb-6 text-sm text-zinc-500 leading-relaxed space-y-4">
                                {item.fabric_details && <div><strong className="text-zinc-900 block mb-1">Material</strong>{item.fabric_details}</div>}
                                {item.fabric_finish && <div><strong className="text-zinc-900 block mb-1">Finish</strong>{item.fabric_finish}</div>}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {item.care_instructions && (
                      <div className="border-b border-zinc-100">
                        <button 
                          onClick={() => setExpandedSection(expandedSection === `${item.id}-care` ? null : `${item.id}-care`)}
                          className="w-full flex items-center justify-between py-5 text-xs uppercase tracking-widest font-bold text-zinc-900 hover:text-zinc-500 transition-colors"
                        >
                          <span>Care Instructions</span>
                          {expandedSection === `${item.id}-care` ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <AnimatePresence>
                          {expandedSection === `${item.id}-care` && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="pb-6 text-sm text-zinc-500 leading-relaxed">
                                {item.care_instructions}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {(item.decoration_method || item.available_colors) && (
                      <div className="border-b border-zinc-100">
                        <button 
                          onClick={() => setExpandedSection(expandedSection === `${item.id}-customization` ? null : `${item.id}-customization`)}
                          className="w-full flex items-center justify-between py-5 text-xs uppercase tracking-widest font-bold text-zinc-900 hover:text-zinc-500 transition-colors"
                        >
                          <span>Customization Options</span>
                          {expandedSection === `${item.id}-customization` ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <AnimatePresence>
                          {expandedSection === `${item.id}-customization` && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="pb-6 text-sm text-zinc-500 leading-relaxed grid grid-cols-2 gap-6">
                                {item.decoration_method && <div><strong className="text-zinc-900 block mb-1">Techniques</strong>{item.decoration_method}</div>}
                                {item.available_colors && <div><strong className="text-zinc-900 block mb-1">Available Thread/Ink Colors</strong>{item.available_colors}</div>}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {item.turn_time && (
                      <div className="border-b border-zinc-100">
                        <button 
                          onClick={() => setExpandedSection(expandedSection === `${item.id}-production` ? null : `${item.id}-production`)}
                          className="w-full flex items-center justify-between py-5 text-xs uppercase tracking-widest font-bold text-zinc-900 hover:text-zinc-500 transition-colors"
                        >
                          <span>Production Details</span>
                          {expandedSection === `${item.id}-production` ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <AnimatePresence>
                          {expandedSection === `${item.id}-production` && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="pb-6 text-sm text-zinc-500 leading-relaxed">
                                <div><strong className="text-zinc-900 block mb-1">Estimated Turnaround</strong>{item.turn_time}</div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>

                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
            {displayedItems.map((item, index) => (
              <motion.div
                layout
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05, layout: { type: "spring", stiffness: 300, damping: 30 } }}
                className={`group relative rounded-2xl transition-all duration-300 ${draggedItemId === item.id ? 'opacity-50 scale-95' : ''}`}
              >
                <div className="aspect-[3/4] bg-white rounded-2xl overflow-hidden relative mb-4 shadow-sm border border-zinc-100 transition-all group-hover:border-zinc-300">

                  <img
                    src={activeVariations[item.id] || item.mock_image}
                    onClick={() => setZoomedImage(activeVariations[item.id] || item.mock_image)}
                    className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105 cursor-zoom-in"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors opacity-0 group-hover:opacity-100 pointer-events-none">
                    {sortBy === 'default' && (
                      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-auto">
                        <button onClick={() => handleMoveItem(item.id, 'up')} className="bg-white/90 text-zinc-900 p-2 rounded-full shadow hover:bg-white hover:scale-110 transition-all" title="Move Left"><ArrowLeft size={16} /></button>
                        <button onClick={() => handleMoveItem(item.id, 'down')} className="bg-white/90 text-zinc-900 p-2 rounded-full shadow hover:bg-white hover:scale-110 transition-all" title="Move Right"><ArrowRight size={16} /></button>
                      </div>
                    )}
                    <div className="absolute top-1/2 right-4 -translate-y-1/2 flex flex-col gap-2 pointer-events-auto">
                      <button
                        onClick={() => handleMockupEdit(item)}
                        className="bg-white text-zinc-900 p-3 rounded-full shadow hover:bg-zinc-900 hover:text-white transition-colors"
                        title="Edit Mockup"
                      >
                        <Wand2 size={18} />
                      </button>
                      <button
                        onClick={(e) => handleRemoveBackgroundClick(e, item)}
                        className="bg-white text-zinc-900 p-3 rounded-full shadow hover:bg-emerald-500 hover:text-white transition-colors"
                        title="Manual Eraser"
                      >
                        <Eraser size={18} />
                      </button>
                      <button
                        onClick={() => setEditingItem(item)}
                        className="bg-white text-zinc-900 p-3 rounded-full shadow hover:bg-zinc-900 hover:text-white transition-colors"
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
                      <button
                        onClick={(e) => handleDownloadItem(e, item)}
                        className="bg-white text-zinc-900 p-3 rounded-full shadow-lg hover:bg-zinc-900 hover:text-white transition-colors"
                        title="Download as PNG"
                      >
                        <Download size={18} />
                      </button>

                    </div>
                  </div>
                </div>

                {Array.from(new Set([item.mock_image, ...(item.variations || [])])).length > 1 && (
                  <div className="flex gap-1.5 mb-3 px-1 overflow-x-auto hide-scrollbar">
                    {Array.from(new Set([item.mock_image, ...(item.variations || [])])).map((v, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveVariations(prev => ({ ...prev, [item.id]: v }))}
                        className={`w-8 h-8 rounded border overflow-hidden p-0.5 transition-all flex-shrink-0 ${(!activeVariations[item.id] && v === item.mock_image) || activeVariations[item.id] === v ? 'border-zinc-900 shadow-sm' : 'border-zinc-200 hover:border-zinc-400'}`}
                      >
                        <img src={v} className="w-full h-full object-contain" />
                      </button>
                    ))}
                  </div>
                )}

                <h4 className="font-serif text-lg truncate">{item.custom_name || item.garment_name}</h4>
                <div className="flex items-center justify-between mt-1">
                  {showPricing ? <p className="text-zinc-400 text-xs uppercase tracking-widest font-bold">${item.custom_price || item.garment_price}</p> : <div />}
                  {item.supplier_link && (
                    <a href={item.supplier_link} target="_blank" rel="noopener noreferrer" className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 hover:text-zinc-900 border-b border-transparent hover:border-zinc-900 transition-colors" onClick={(e) => e.stopPropagation()}>
                      Link
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
            {items.length === 0 && (
              <div className="col-span-full py-24 text-center border-2 border-dashed border-zinc-100 rounded-3xl">
                <p className="text-zinc-400 font-serif italic">This deck is empty. Add some garments from the catalog!</p>
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
            customer={customer}
            onClose={() => setEditingItem(null)}
            onSave={(details) => handleSaveDetails(editingItem.id, details)}
          />
        )}
        {erasingBgItem && (
          <BackgroundEraserModal
            item={erasingBgItem}
            currentUrl={activeVariations[erasingBgItem.id] || erasingBgItem.mock_image}
            onClose={() => setErasingBgItem(null)}
            onSave={handleSaveErasedImage}
          />
        )}
        {zoomedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-[120] flex items-center justify-center p-4 md:p-12 cursor-zoom-out"
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

        {/* LINE SHEET MODAL (PRINT VIEW) */}
        <AnimatePresence>
          {lineSheetMode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-zinc-100 z-[200] overflow-y-auto print:bg-white print:overflow-visible"
            >
              <div className="sticky top-0 bg-white border-b border-zinc-200 px-4 md:px-8 py-4 flex justify-between items-center z-10 print:hidden shadow-sm">
                <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-900">
                  {lineSheetMode === 'combo' ? 'Combo' : 'Individual'} Line Sheet
                </h2>
                <div className="flex items-center gap-2 md:gap-4">
                  <button onClick={() => { setTimeout(() => window.print(), 100); }} className="bg-zinc-900 text-white px-4 md:px-6 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-800 transition-colors">
                    <Download size={14} /> Save to PDF
                  </button>
                  <button onClick={() => setLineSheetMode(null)} className="p-2 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-900 transition-colors">
                    <X size={20}/>
                  </button>
                </div>
              </div>

              <div className="p-4 md:p-8 print:p-0 flex flex-col gap-8 print:gap-0 items-center">
                {lineSheetMode === 'individual' ? (
                  Array.from(displayedItems).map((item, idx) => (
                    <div key={`ls-${item.id}-${idx}`} className="w-full max-w-[8.5in] aspect-[8.5/11] print:w-[8.5in] print:h-[11in] bg-white shadow-xl print:shadow-none print:break-inside-avoid print:break-after-page p-8 md:p-16 flex flex-col relative shrink-0">
                      <div className="flex justify-between items-start mb-8 md:mb-12">
                        <div>
                          <h1 className="editorial-title text-3xl md:text-4xl mb-2 text-zinc-900">{deck.name}</h1>
                          {customer && <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">{customer.company}</p>}
                        </div>
                        {showPricing && item.price !== undefined && (
                          <div className="text-right">
                            <p className="font-serif text-2xl md:text-3xl">${item.price.toFixed(2)}</p>
                            <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Unit Price</p>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 flex flex-col items-center justify-center -mt-8 px-4">
                        <img src={activeVariations[item.id] || item.mock_image} className="w-full max-h-[4.5in] md:max-h-[5.5in] print:max-h-[4.5in] object-contain mb-6 md:mb-8 mix-blend-multiply" />
                        <div className="w-full text-center">
                          <h2 className="font-serif text-2xl md:text-3xl mb-3 text-zinc-900 leading-tight">{item.custom_name || item.garment_name}</h2>
                          {item.notes && <p className="text-sm text-zinc-500 max-w-2xl mx-auto italic mb-4 line-clamp-2">"{item.notes}"</p>}
                        </div>
                      </div>
                        <div className="mt-auto border-t border-zinc-200 pt-5 grid grid-cols-3 md:grid-cols-7 border-b gap-x-2 gap-y-4 w-full pb-5 text-left">
                          <div className="col-span-1">
                            <p className="text-[9px] uppercase tracking-widest font-bold text-zinc-400 mb-1">Sizes</p>
                            <p className="text-[10px] font-medium text-zinc-900 break-words">{((Array.isArray(item.custom_sizes) ? item.custom_sizes.join(', ') : item.custom_sizes) || (Array.isArray(item.sizes) ? item.sizes.join(', ') : item.sizes) || 'N/A')}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-[9px] uppercase tracking-widest font-bold text-zinc-400 mb-1">Fabric</p>
                            <p className="text-[10px] leading-relaxed font-medium text-zinc-900 pr-2 line-clamp-4 text-ellipsis overflow-hidden">{item.fabric_details || 'Premium blend'}</p>
                          </div>
                          <div className="col-span-1">
                            <p className="text-[9px] uppercase tracking-widest font-bold text-zinc-400 mb-1">MOQ</p>
                            <p className="text-[10px] font-medium text-zinc-900">{(item as any).custom_moq || (item as any).moq || 'TBD'}</p>
                          </div>
                          <div className="col-span-1">
                            <p className="text-[9px] uppercase tracking-widest font-bold text-zinc-400 mb-1">Wholesale</p>
                            <p className="text-[10px] font-medium text-zinc-900">${(item.custom_wholesale_price || item.wholesale_price || 0).toFixed(2)}</p>
                          </div>
                          <div className="col-span-1">
                            <p className="text-[9px] uppercase tracking-widest font-bold text-zinc-400 mb-1">Price (MSRP)</p>
                            <p className="text-[10px] font-medium text-zinc-900">${(item.custom_msrp || item.msrp || item.custom_price || item.garment_price || 0).toFixed(2)}</p>
                          </div>
                        <div className="col-span-1">
                          <p className="text-[9px] uppercase tracking-widest font-bold text-zinc-400 mb-1">Delivery</p>
                          <p className="text-[10px] font-medium text-zinc-900 break-words line-clamp-2 text-ellipsis overflow-hidden">{(item as any).custom_turn_time || item.turn_time || 'TBD'}</p>
                        </div>
                        <div className="col-span-full pt-3 mt-1 border-t border-zinc-100 flex items-center gap-4">
                          <p className="text-[9px] uppercase tracking-widest font-bold text-zinc-400 shrink-0">Colors</p>
                          <div className="flex flex-wrap gap-2">
                            {item.custom_colors && item.custom_colors.length > 0 ? (
                              item.custom_colors.map((c, i) => (
                                <div key={i} className="w-5 h-5 rounded-full border border-zinc-200 shadow-sm" style={c.startsWith("http") || c.startsWith("data:") ? { backgroundImage: `url(${c})`, backgroundSize: "cover", backgroundPosition: "center" } : { backgroundColor: c }} />
                              ))
                            ) : (
                              <span className="text-[10px] font-medium text-zinc-500 italic">As Shown</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="absolute bottom-6 md:bottom-8 left-8 md:left-16 right-8 md:right-16 flex justify-between items-center text-[8px] uppercase tracking-widest font-bold text-zinc-300">
                        <span>CONFIDENTIAL - WOVN GARMENT CATALOG</span>
                        <span>{new Date().toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  Array.from({ length: Math.ceil(displayedItems.length / 4) }).map((_, pageIdx) => {
                    const pageItems = displayedItems.slice(pageIdx * 4, pageIdx * 4 + 4);
                    return (
                      <div key={`ls-combo-${pageIdx}`} className="w-full max-w-[8.5in] aspect-[8.5/11] print:w-[8.5in] print:h-[11in] bg-white shadow-xl print:shadow-none print:break-inside-avoid print:break-after-page p-6 md:p-10 flex flex-col shrink-0 relative">
                        <div className="text-center mb-4 md:mb-5 print:mb-4 shrink-0">
                          <h1 className="editorial-title text-2xl md:text-3xl mb-1 md:mb-2 text-zinc-900">{deck.name}</h1>
                          <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">{customer?.company ? `${customer.company} - ` : ''}Page {pageIdx + 1}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-x-8 md:gap-x-10 gap-y-6 md:gap-y-6 print:gap-y-6 flex-1 content-start">
                          {pageItems.map((item, idx) => (
                            <div key={`combo-${item.id}-${idx}`} className="flex flex-col items-center">
                              <div className="w-full h-36 md:h-44 print:h-[1.75in] mb-2 md:mb-3 flex items-center justify-center shrink-0">
                                <img src={activeVariations[item.id] || item.mock_image} className="max-w-full max-h-full object-contain mix-blend-multiply" />
                              </div>
                              <div className="text-left w-full px-2">
                                <h3 className="font-serif text-[15px] md:text-lg leading-tight border-b border-zinc-200 pb-1 mb-1.5 text-zinc-900 truncate">{item.custom_name || item.garment_name}</h3>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 print:gap-y-1">
                                  <div>
                                    <p className="text-[8px] uppercase tracking-widest font-bold text-zinc-400 mb-0.5">Wholesale</p>
                                    <p className="text-[10px] font-bold text-zinc-900">${(item.custom_wholesale_price || item.wholesale_price || 0).toFixed(2)}</p>
                                  </div>
                                  <div>
                                    <p className="text-[8px] uppercase tracking-widest font-bold text-zinc-400 mb-0.5">Price (MSRP)</p>
                                    <p className="text-[10px] font-bold text-zinc-900">${(item.custom_msrp || item.msrp || item.custom_price || item.garment_price || 0).toFixed(2)}</p>
                                  </div>
                                  <div className="col-span-2">
                                    <p className="text-[8px] uppercase tracking-widest font-bold text-zinc-400 mb-0.5">Sizes</p>
                                    <p className="text-[10px] font-medium text-zinc-900 truncate">{((Array.isArray(item.custom_sizes) ? item.custom_sizes.join(', ') : item.custom_sizes) || (Array.isArray(item.sizes) ? item.sizes.join(', ') : item.sizes) || 'N/A')}</p>
                                  </div>
                                  <div className="col-span-2">
                                    <p className="text-[8px] uppercase tracking-widest font-bold text-zinc-400 mb-0.5">Fabric</p>
                                    <p className="text-[10px] font-medium text-zinc-900 line-clamp-2 print:line-clamp-2 text-ellipsis overflow-hidden">{item.fabric_details || 'Premium blend'}</p>
                                  </div>
                                  <div>
                                    <p className="text-[8px] uppercase tracking-widest font-bold text-zinc-400 mb-0.5">MOQ</p>
                                    <p className="text-[10px] font-medium text-zinc-900">{(item as any).custom_moq || (item as any).moq || 'TBD'}</p>
                                  </div>
                                  <div>
                                    <p className="text-[8px] uppercase tracking-widest font-bold text-zinc-400 mb-0.5">Delivery</p>
                                    <p className="text-[10px] font-medium text-zinc-900 truncate line-clamp-1 text-ellipsis overflow-hidden">{(item as any).custom_turn_time || item.turn_time || 'TBD'}</p>
                                  </div>
                                  <div className="col-span-2 mt-1 print:mt-0 flex items-center gap-2">
                                    <p className="text-[8px] uppercase tracking-widest font-bold text-zinc-400 shrink-0">Colors:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {item.custom_colors && item.custom_colors.length > 0 ? (
                                        item.custom_colors.map((c, i) => (
                                          <div key={i} className="w-3.5 h-3.5 rounded-full border border-zinc-200 shadow-sm" style={c.startsWith("http") || c.startsWith("data:") ? { backgroundImage: `url(${c})`, backgroundSize: "cover", backgroundPosition: "center" } : { backgroundColor: c }} />
                                        ))
                                      ) : (
                                        <span className="text-[9px] text-zinc-500 italic">As Shown</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="absolute bottom-5 left-10 right-10 flex justify-between items-center text-[7px] md:text-[8px] uppercase tracking-widest font-bold text-zinc-300">
                          <span>CONFIDENTIAL - WOVN GARMENT CATALOG</span>
                          <span>{new Date().toLocaleDateString()}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
    </div >
  );
}

function EditItemModal({ item, customer, onClose, onSave }: {
  item: DeckItem,
  customer?: Customer | null,
  onClose: () => void,
  onSave: (details: any) => void
}) {
  const [name, setName] = useState(item.custom_name || item.garment_name || '');
  const [description, setDescription] = useState(item.custom_description || item.garment_description || item.fabric_details || '');
  const [price, setPrice] = useState(item.custom_msrp?.toString() || item.custom_price?.toString() || item.msrp?.toString() || item.garment_price?.toString() || item.cost_price?.toString() || '');
  const [sizes, setSizes] = useState(item.custom_sizes || item.sizes || 'XS,S,M,L,XL');
  const [mockImage, setMockImage] = useState(item.mock_image);
  const [variations, setVariations] = useState<string[]>(Array.from(new Set(item.variations || [])).filter(v => v !== item.mock_image));
  const [generatingColor, setGeneratingColor] = useState<string | null>(null);

  const [mockupStatus, setMockupStatus] = useState<'New Mock Needed' | 'Working' | 'Final Mock Uploaded'>(
    (item.mockup_status as 'New Mock Needed' | 'Working' | 'Final Mock Uploaded') || 'Final Mock Uploaded'
  );

  const [fabricCompositions, setFabricCompositions] = useState<{ id: string, percentage: string, fabric: string }[]>(() => {
    let parsedComp: { id: string, percentage: string, fabric: string }[] = [];
    if (item.fabric_details) {
      const parts = item.fabric_details.split(',').map(s => s.trim()).filter(Boolean);
      for (const p of parts) {
        const match = p.match(/^(\d+(?:\.\d+)?)\s*%\s*(.+)$/);
        if (match) {
           parsedComp.push({ id: Math.random().toString(), percentage: match[1], fabric: formatFabric(match[2]) });
        } else {
           parsedComp.push({ id: Math.random().toString(), percentage: '', fabric: formatFabric(p) });
        }
      }
    }
    if (parsedComp.length === 0) {
       parsedComp.push({ id: Math.random().toString(), percentage: '100', fabric: 'Cotton' });
    }
    return parsedComp;
  });
  const [fabricFinish, setFabricFinish] = useState(item.fabric_finish || '');
  const [careInstructions, setCareInstructions] = useState(item.care_instructions || '');
  const [fit, setFit] = useState(item.fit || '');
  const [fabricWeightGsm, setFabricWeightGsm] = useState(item.fabric_weight_gsm || '');
  const [decorationMethod, setDecorationMethod] = useState(item.decoration_method || '');
  const [availableColors, setAvailableColors] = useState(item.available_colors || '');
  const [customColors, setCustomColors] = useState<string[]>(item.custom_colors || []);
  const [costPrice, setCostPrice] = useState(item.custom_cost_price?.toString() || item.cost_price?.toString() || '');
  const [wholesalePrice, setWholesalePrice] = useState(item.custom_wholesale_price?.toString() || item.wholesale_price?.toString() || '');
  const [moq, setMoq] = useState(item.moq?.toString() || '');
  const [turnTime, setTurnTime] = useState(item.turn_time || '');
  const [marketAnalysis, setMarketAnalysis] = useState<any[] | null>(item.market_analysis || null);

  const brandColors = customer ? getCustomerColors(customer).filter(c => c.image || (c.hex && c.hex !== '#f4f4f5')) : [];

  const handleGenerateVariationForColor = async (colorInfo: BrandColor) => {
    const key = colorInfo.image || colorInfo.hex;
    setGeneratingColor(key);
    try {
      const generated = await generateColorVariation(mockImage, key);
      const compressed = await compressImageIfNeeded(generated);
      setVariations(prev => [...prev, compressed]);
    } catch (err) {
      console.error(err);
      alert(`Failed to generate variation.`);
    } finally {
      setGeneratingColor(null);
    }
  };

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
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4 md:p-6 overflow-y-auto pt-safe pb-safe outline-none"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-[#fafafa] rounded-[2rem] shadow-2xl w-full max-w-[1400px] xl:max-w-[90vw] overflow-hidden flex flex-col max-h-[90vh] md:max-h-[95vh] relative"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 md:px-8 py-4 bg-white rounded-t-2xl border-b border-zinc-100 shrink-0 sticky top-0 z-20">
          <div>
            <p className="text-[9px] uppercase tracking-widest font-bold text-zinc-400 mb-0.5">Client Customization</p>
            <h2 className="font-serif text-xl md:text-2xl">Edit Item Details</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-zinc-50 rounded-full transition-colors text-zinc-400 hover:text-zinc-900">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 shrink min-h-0 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 w-full max-w-none mx-auto">
            
            {/* LEFT COLUMN */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              <div className="bg-white border border-zinc-100 rounded-xl p-5 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
                <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-900 mb-4 block border-b border-zinc-100 pb-3">Item Imagery</label>
                
                <div className="space-y-6">
                  <div className="aspect-[3/4] bg-zinc-50 rounded-lg overflow-hidden border-2 border-zinc-200 flex items-center justify-center p-4 relative group">
                    <img src={mockImage} className="w-full h-full object-contain" />
                    <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                      <div className="bg-white/90 text-zinc-900 px-4 py-2 rounded-full text-[10px] uppercase tracking-widest font-bold flex items-center gap-2 backdrop-blur-sm">
                        <Upload size={14} /> Replace
                      </div>
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageReplace} />
                    </label>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
                      <p className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 shrink-0 mt-1.5">Variations (Colors/Mockups)</p>
                      {brandColors.length > 0 && (
                        <div className="flex items-start gap-2.5 max-w-full">
                          <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-400 shrink-0 whitespace-nowrap mt-1.5">Auto-Bake:</span>
                          <div className="flex gap-1.5 flex-wrap">
                            {brandColors.map((c, i) => {
                              const key = c.image || c.hex;
                              return (
                              <button
                                key={key + i}
                                onClick={() => handleGenerateVariationForColor(c)}
                                disabled={generatingColor !== null}
                                className="w-7 h-7 rounded-full border border-zinc-200 hover:scale-110 transition-all flex items-center justify-center disabled:opacity-50 disabled:hover:scale-100 shadow-sm relative overflow-hidden group shrink-0"
                                style={{ 
                                  backgroundColor: c.image ? 'transparent' : c.hex,
                                  backgroundImage: c.image ? `url(${c.image})` : 'none',
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center'
                                }}
                                title={`Generate ${c.pantone || c.hex} variant`}
                              >
                                <span className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                {generatingColor === key && <div className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin mix-blend-difference absolute z-10" />}
                              </button>
                            )})}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <div className="w-12 h-12 border-2 border-zinc-900 rounded-lg overflow-hidden shrink-0 flex items-center justify-center relative group p-0.5">
                         <img src={mockImage} className="w-full h-full object-contain" />
                         <div className="absolute bottom-1 right-1">
                           <div className="w-2 h-2 bg-emerald-500 rounded-full border border-white" />
                         </div>
                      </div>
                      {variations.map((v, i) => (
                        <div key={i} className="w-12 h-12 border border-zinc-200 rounded-lg overflow-hidden shrink-0 relative group p-0.5">
                          <button
                            title="Set as Main Image"
                            onClick={() => {
                              setMockImage(v);
                              setVariations(variations.map((val, idx) => idx === i ? mockImage : val));
                            }}
                            className="w-full h-full block absolute inset-0 z-0 bg-transparent cursor-pointer"
                          />
                          <img src={v} className="w-full h-full object-contain pointer-events-none mix-blend-multiply" />
                          <div className="absolute inset-0 pointer-events-none bg-black/0 group-hover:bg-black/5 transition-colors" />
                          <button
                            title="Remove Variation"
                            onClick={(e) => {
                              e.stopPropagation();
                              setVariations(variations.filter((_, index) => index !== i));
                            }}
                            className="absolute top-0 right-0 p-1 bg-white/90 text-zinc-400 hover:text-red-500 hover:bg-white opacity-0 group-hover:opacity-100 transition-all rounded-bl-lg z-10 backdrop-blur-sm"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                      <label className="w-12 h-12 border-2 border-dashed border-zinc-200 rounded-lg flex items-center justify-center cursor-pointer hover:border-zinc-400 hover:bg-zinc-50 shrink-0 transition-colors text-zinc-400 hover:text-zinc-600" title="Add Variation">
                        <Plus size={14} />
                        <input type="file" className="hidden" accept="image/*" onChange={handleAddVariation} />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <MarketPricingAnalyzer 
                itemDetails={{
                  name: name,
                  type: item.category,
                  category: item.category,
                  details: description,
                  fabric_details: typeof fabricCompositions === 'string' ? fabricCompositions : fabricCompositions.map(c => `${c.percentage}% ${c.fabric}`).join(', ')
                }} 
                initialAnalysis={marketAnalysis}
                onAnalysisUpdate={setMarketAnalysis}
              />
            </div>

            {/* RIGHT COLUMN */}
            <div className="lg:col-span-2 space-y-6">
              
              <div className="bg-white border border-zinc-100 rounded-xl p-5 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
                <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-900 mb-5 block border-b border-zinc-100 pb-3">Core Details</label>
                <div className="space-y-5">
                  <div>
                    <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 block">Display Name</label>
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-400 outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 block">Mockup Status</label>
                      <select 
                        value={mockupStatus}
                        onChange={e => setMockupStatus(e.target.value as any)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-400 outline-none transition-all"
                      >
                        <option value="New Mock Needed">New Mock Needed</option>
                        <option value="Working">Working</option>
                        <option value="Final Mock Uploaded">Final Mock Uploaded</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 block">Price ($)</label>
                      <input
                        type="number"
                        value={price}
                        onChange={e => setPrice(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-400 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 block">Size Spread</label>
                      <input
                        value={sizes}
                        onChange={e => setSizes(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-400 outline-none transition-all"
                        placeholder="XS, S, M, L, XL"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-zinc-100 rounded-xl p-5 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
                <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-900 mb-5 block border-b border-zinc-100 pb-3">Material & Build</label>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 flex items-center justify-between">
                        <span>Fabric Composition</span>
                        <button type="button" onClick={() => setFabricCompositions(prev => [...prev, { id: Math.random().toString(), percentage: '', fabric: '' }])} className="text-zinc-500 hover:text-zinc-900 transition-colors flex items-center gap-1"><PlusCircle size={12} /> Add</button>
                      </label>
                      <div className="space-y-2">
                        {fabricCompositions.map((comp, idx) => (
                          <div key={comp.id} className="flex gap-2 items-center">
                            <div className="relative w-24 shrink-0">
                              <input
                                type="number"
                                value={comp.percentage}
                                onChange={e => {
                                  const newComps = [...fabricCompositions];
                                  newComps[idx].percentage = e.target.value;
                                  setFabricCompositions(newComps);
                                }} 
                                placeholder="%"
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg pr-6 pl-3 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-400 outline-none transition-all"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 font-medium text-xs">%</span>
                            </div>
                            <select
                              value={comp.fabric || 'Cotton'}
                              onChange={e => {
                                const val = e.target.value;
                                if (val === '_add_custom_') {
                                  const custom = window.prompt("Enter new custom fabric:");
                                  if (custom && custom.trim() !== '') {
                                    const formatted = formatFabric(custom);
                                    const newComps = [...fabricCompositions];
                                    newComps[idx].fabric = formatted;
                                    setFabricCompositions(newComps);
                                  } else {
                                    const newComps = [...fabricCompositions];
                                    newComps[idx].fabric = comp.fabric || 'Cotton';
                                    setFabricCompositions(newComps);
                                  }
                                } else {
                                  const newComps = [...fabricCompositions];
                                  newComps[idx].fabric = val;
                                  setFabricCompositions(newComps);
                                }
                              }}
                              className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-400 outline-none transition-all min-w-0"
                            >
                              {Array.from(new Set([
                                "Cotton", "Organic Cotton", "Ring-Spun Cotton", "Combed Ring-Spun Cotton",
                                "Polyester", "Recycled Polyester", "Spandex", "Elastane", "Rayon",
                                "Viscose", "Nylon", "Silk", "Wool", "Linen", "Bamboo", "Modal",
                                "Acrylic", "Fleece", "French Terry", "Twill", "Canvas",
                                ...fabricCompositions.map(c => c.fabric).filter(Boolean)
                              ])).map(fab => (
                                <option key={fab} value={fab}>{fab}</option>
                              ))}
                              <option disabled>──────────</option>
                              <option value="_add_custom_">+ Add Fabric...</option>
                            </select>
                            {fabricCompositions.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setFabricCompositions(prev => prev.filter((_, i) => i !== idx))}
                                className="p-1 text-zinc-400 hover:text-red-500 transition-colors shrink-0 outline-none"
                              >
                                <MinusCircle size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 block">Fabric Finish</label>
                      <input value={fabricFinish} onChange={e => setFabricFinish(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-400 outline-none transition-all" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 block">Fit / Cut</label>
                      <input value={fit} onChange={e => setFit(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-400 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 block">Fabric Weight (GSM)</label>
                      <input value={fabricWeightGsm} onChange={e => setFabricWeightGsm(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-400 outline-none transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 block">Care Instructions</label>
                    <input value={careInstructions} onChange={e => setCareInstructions(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-400 outline-none transition-all" />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-zinc-100 rounded-xl p-5 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
                <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-900 mb-5 block border-b border-zinc-100 pb-3">Customization & Production</label>
                <div className="space-y-4">
                  <div>
                    <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-2 block">Decorating Methods</label>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {['DTF', 'Vinyl', 'Heat Patch', 'Sew on Patch', 'Embroidery', 'Screen Print', 'Laser Engraving'].map(method => {
                        const isChecked = decorationMethod?.includes(method);
                        return (
                          <label key={method} className="relative cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="peer sr-only"
                              checked={isChecked}
                              onChange={(e) => {
                                const currentMethods = decorationMethod ? decorationMethod.split(', ').filter(Boolean) : [];
                                if (e.target.checked) {
                                  setDecorationMethod([...currentMethods, method].join(', '));
                                } else {
                                  setDecorationMethod(currentMethods.filter(m => m !== method).join(', '));
                                }
                              }}
                            />
                            <span className="inline-block px-3 py-1.5 text-xs font-medium text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-md transition-all hover:bg-zinc-100 peer-checked:bg-zinc-900 peer-checked:text-white peer-checked:border-zinc-900">
                              {method}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 block">Thread / Ink Colors</label>
                      <input value={availableColors} onChange={e => setAvailableColors(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-400 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 flex items-center justify-between">
                        <span>Line Sheet Colors</span>
                        <span className="font-normal text-zinc-400 normal-case">(Click to toggle)</span>
                      </label>
                      <div className="flex flex-wrap gap-2 pt-0.5">
                        {brandColors.map(bc => (
                          <button
                            key={bc.hex || bc.image}
                            type="button"
                            onClick={() => {
                              const val = bc.image || bc.hex;
                              if (val) {
                                if (customColors.includes(val)) {
                                  setCustomColors(customColors.filter(c => c !== val));
                                } else {
                                  setCustomColors([...customColors, val]);
                                }
                              }
                            }}
                            className={`w-6 h-6 rounded-full transition-all flex items-center justify-center ${(bc.image || bc.hex) && customColors.includes(bc.image || bc.hex || '') ? 'ring-2 ring-offset-2 ring-zinc-900 scale-110 shadow-sm' : 'border border-zinc-200 hover:scale-105 hover:border-zinc-400'}`}
                            style={{ backgroundColor: bc.hex || 'transparent', backgroundImage: bc.image ? `url(${bc.image})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}
                            title={bc.hex || "Brand Color"}
                          />
                        ))}
                        {customColors.filter(c => !brandColors.some(bc => (bc.image || bc.hex) && (bc.image || bc.hex)?.toLowerCase() === c.toLowerCase())).map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setCustomColors(customColors.filter(sc => sc !== c))}
                            className="w-6 h-6 rounded-full transition-all ring-2 ring-offset-2 ring-zinc-900 scale-110 shadow-sm"
                            style={c.startsWith("http") || c.startsWith("data:") ? { backgroundImage: `url(${c})`, backgroundSize: "cover", backgroundPosition: "center" } : { backgroundColor: c }}
                            title={`Remove ${c}`}
                          />
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const hex = window.prompt("Enter a HEX color code (e.g. #000000):");
                            if (hex && /^#[0-9A-Fa-f]{6}$/i.test(hex)) {
                              if (!customColors.includes(hex.toLowerCase())) {
                                setCustomColors([...customColors, hex.toLowerCase()]);
                              }
                            } else if (hex) {
                              alert("Invalid HEX code. Please format as #000000.");
                            }
                          }}
                          className="w-6 h-6 rounded-full border border-dashed border-zinc-300 flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:border-zinc-400 transition-colors bg-white shadow-sm"
                          title="Add custom hex color"
                        >
                          <PlusCircle size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 block">Turnaround Time</label>
                      <input value={turnTime} onChange={e => setTurnTime(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-400 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 block">MOQ</label>
                      <input type="number" value={moq} onChange={e => setMoq(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-400 outline-none transition-all" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-zinc-100 rounded-xl p-5 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
                <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-900 mb-5 block border-b border-zinc-100 pb-3">Backend Pricing</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 block">Cost Price ($)</label>
                    <input type="number" value={costPrice} onChange={e => setCostPrice(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-400 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 block">Wholesale Price ($)</label>
                    <input type="number" value={wholesalePrice} onChange={e => setWholesalePrice(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-400 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 block">MSRP ($)</label>
                    <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-400 outline-none transition-all" />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-zinc-100 rounded-xl p-5 shadow-[0_2px_4px_rgba(0,0,0,0.02)] hidden">
                <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-900 mb-5 block border-b border-zinc-100 pb-3">Item Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-400 outline-none transition-all resize-none"
                  rows={4}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 md:px-8 py-5 bg-white border-t border-zinc-100 flex gap-4 shrink-0 sm:justify-end">
          <button
            onClick={onClose}
            className="flex-1 sm:flex-none sm:w-32 bg-zinc-50 text-zinc-900 py-3 rounded-full text-[10px] uppercase tracking-widest font-bold hover:bg-zinc-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              try {
                await onSave({
                  custom_name: name,
                  custom_description: description,
                  custom_price: parseFloat(price) || null,
                  custom_sizes: sizes,
                  mock_image: mockImage,
                  variations: variations,
                  mockup_status: mockupStatus,
                  custom_fabric_details: fabricCompositions.map(c => [c.percentage ? `${c.percentage}%` : '', c.fabric].filter(Boolean).join(' ')).join(', '),
                  custom_fabric_finish: fabricFinish,
                  custom_care_instructions: careInstructions,
                  custom_fit: fit,
                  custom_fabric_weight_gsm: fabricWeightGsm,
                  custom_decoration_method: decorationMethod,
                  custom_available_colors: availableColors,
                  custom_colors: customColors,
                  custom_cost_price: parseFloat(costPrice) || null,
                  custom_wholesale_price: parseFloat(wholesalePrice) || null,
                  custom_msrp: parseFloat(price) || null,
                  custom_moq: parseInt(moq, 10) || null,
                  custom_turn_time: turnTime
                });
              } catch (err: any) {
                console.error(err);
                alert("Failed to save changes:" + (err.message || 'Unknown error'));
              }
            }}
            className="flex-1 sm:flex-none sm:min-w-[160px] bg-zinc-900 text-white py-3 rounded-full text-[10px] uppercase tracking-widest font-bold hover:bg-zinc-800 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function MockupStudio({ garment, deck, deckItem, customer, onBack, onSave }: {
  garment: Garment,
  deck: Deck | null,
  deckItem?: DeckItem | null,
  customer?: Customer | null,
  onBack: () => void,
  onSave: (img: string, isVariation?: boolean) => void
}) {
  const [activeGarmentImage, setActiveGarmentImage] = useState<string>(
    deckItem ? deckItem.mock_image : (garment.images && garment.images.length > 0 ? garment.images[0] : garment.image)
  );
  const [logo, setLogo] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState('CRITICAL: Perfectly preserve the text in the logo so it is flawless, sharp, and easy to read. Place the logo realistically, matching the angles and lighting of the fabric.');
  const [garmentColor, setGarmentColor] = useState('Original (No Change)');
  const [logoColor, setLogoColor] = useState('Original (No Change)');
  const [garmentView, setGarmentView] = useState('Front View (Default)');
  const [isRotating, setIsRotating] = useState(false);
  const [logoScale, setLogoScale] = useState(1);
  const [logoRotation, setLogoRotation] = useState(0);
  const [containerRef, bounds] = useMeasure();

  const brandColors = customer ? getCustomerColors(customer).map(c => c.hex).filter(h => h && h !== '#f4f4f5') : [];

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
    if (!logo) return activeGarmentImage;

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
    logoImg.crossOrigin = "anonymous";
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

  const handleRotateGarment = async () => {
    if (garmentView === 'Front View (Default)') return;
    setIsRotating(true);
    try {
      const newGarment = await generateRotatedGarment(activeGarmentImage, garmentView);
      setActiveGarmentImage(newGarment);
      setResultImage(''); // Reset any existing mockup
    } catch (err) {
      console.error(err);
      alert('Failed to rotate garment. Please try again.');
    } finally {
      setIsRotating(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);

    try {
      const compositeImage = await getCompositeImage();
      if (!compositeImage) throw new Error("Could not generate composite image");

      let prompt = customPrompt;
      if (!logo && prompt.includes('Perfectly preserve the text in the logo')) {
        prompt = prompt.replace('CRITICAL: Perfectly preserve the text in the logo so it is flawless, sharp, and easy to read. Place the logo realistically, matching the angles and lighting of the fabric.', 'Create a highly realistic garment mockup.');
      }
      if (garmentColor !== 'Original (No Change)') {
        prompt += ` Change the garment fabric color to ${garmentColor}, preserving all lighting and textures.`;
      }
      if (logoColor !== 'Original (No Change)' && logo) {
        prompt += ` Make the logo completely ${logoColor}.`;
      }

      const mockup = await generateMockup(activeGarmentImage, compositeImage, prompt, false, logo || null);
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
      <button onClick={onBack} className="flex-shrink-0 flex items-center gap-2 text-zinc-400 hover:text-zinc-900 transition-colors mb-4 md:mb-6 w-max">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-start overflow-hidden min-h-0 border-b border-transparent">
        <div className="h-full w-full flex flex-col items-center justify-start overflow-y-auto pb-12 relative px-1">
          <div
            ref={containerRef}
            className="aspect-[3/4] max-h-[80vh] lg:max-h-full w-full max-w-md lg:max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl relative border border-zinc-100 cursor-crosshair mx-auto"
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
                <div className="relative w-full h-full border-2 border-zinc-900 group-hover:border-zinc-900 transition-colors">
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

            {(isGenerating || isRotating) && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center p-12 text-center z-50">
                <div className="w-16 h-16 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin mb-6"></div>
                <h3 className="font-serif text-2xl mb-2">{isRotating ? 'Rotating Garment' : 'Creating Realistic Mockup'}</h3>
                <p className="text-zinc-500 text-sm">{isRotating ? 'Our AI is generating a professional view from the requested perspective...' : 'Our AI is meticulously placing the logo and adjusting lighting for a perfect result...'}</p>
              </div>
            )}
          </div>

          {!resultImage && logo && (
            <div className="flex items-center gap-6 bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 flex items-center">
                    Scale <HoverTooltip content="Precisely scale the flat logo before baking." />
                  </span>
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
                  <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 flex items-center">
                    Rotation <HoverTooltip content="Spin the flat logo to match the angle of the garment surface." />
                  </span>
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

        <div className="space-y-12 h-full overflow-y-auto pr-4 pb-32 pt-2">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 font-bold">Mockup Studio</p>
            <h2 className="editorial-title mb-4">Interactive Placement</h2>
            <p className="text-zinc-500 leading-relaxed">
              Drag the logo to your desired position and adjust the scale.
              Our AI will then"bake" it into the garment, matching perspective and lighting perfectly.
            </p>
          </div>

          <div className="space-y-8">
            {(garment.images && garment.images.length > 1) || (deckItem?.variations && deckItem.variations.length > 0) ? (
              <section>
                <h3 className="text-xs uppercase tracking-widest font-bold mb-4">Select Variation Starting Point</h3>
                <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
                  {deckItem ? (
                    <>
                      <button onClick={() => { setActiveGarmentImage(deckItem.mock_image); setResultImage(''); }} className={`flex-shrink-0 w-20 h-24 rounded-lg overflow-hidden border-2 transition-all ${activeGarmentImage === deckItem.mock_image ? 'border-zinc-900 border-2' : 'border-zinc-200 hover:border-zinc-400'}`}>
                        <img src={deckItem.mock_image} className="w-full h-full object-cover bg-zinc-50" />
                      </button>
                      {deckItem.variations?.map((img, i) => (
                        <button key={i} onClick={() => { setActiveGarmentImage(img); setResultImage(''); }} className={`flex-shrink-0 w-20 h-24 rounded-lg overflow-hidden border-2 transition-all ${activeGarmentImage === img ? 'border-zinc-900 border-2' : 'border-zinc-200 hover:border-zinc-400'}`}>
                          <img src={img} className="w-full h-full object-cover bg-zinc-50" />
                        </button>
                      ))}
                    </>
                  ) : (
                    garment.images?.map((img, i) => (
                      <button key={i} onClick={() => { setActiveGarmentImage(img); setResultImage(''); }} className={`flex-shrink-0 w-20 h-24 rounded-lg overflow-hidden border-2 transition-all ${activeGarmentImage === img ? 'border-zinc-900 border-2' : 'border-zinc-200 hover:border-zinc-400'}`}>
                        <img src={img} className="w-full h-full object-cover bg-zinc-50" />
                      </button>
                    ))
                  )}
                </div>
              </section>
            ) : null}

            <section>
              <h3 className="text-xs uppercase tracking-widest font-bold mb-4 flex items-center">
                1. Customer Logo <HoverTooltip content="Upload a high-quality graphic (transparent PNG works best) to overlay on the garment." />
              </h3>
              <div className="flex items-center gap-6 mb-6">
                <div className="w-24 h-24 bg-checkerboard border-2 border-dashed border-zinc-200 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0">
                  {logo ? (
                    <img src={logo} className="w-full h-full object-contain p-2" />
                  ) : (
                    <ImageIcon className="text-zinc-200" size={24} />
                  )}
                </div>
                <label className="bg-white border border-zinc-200 px-6 py-3 rounded-full text-[10px] uppercase tracking-widest font-bold cursor-pointer hover:border-zinc-900 transition-colors flex-shrink-0">
                  Upload Logo
                  <input type="file" className="hidden" onChange={handleLogoUpload} accept="image/*" />
                </label>
              </div>

              {vaultAssets.length > 0 && (
                <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100">
                  <h4 className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-3 flex items-center gap-2">
                    <Sparkles size={12} className="text-zinc-400" />
                    Or Select from Asset Vault <HoverTooltip content="Quickly re-use logos previously uploaded and saved to this customer's profile." />
                  </h4>
                  <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                    {vaultAssets.map(asset => (
                      <button
                        key={asset.id}
                        onClick={() => setLogo(asset.image)}
                        className={`flex-shrink-0 w-16 h-16 bg-checkerboard border-2 rounded-xl flex items-center justify-center p-2 transition-all ${logo === asset.image ? 'border-zinc-900 shadow-sm scale-105' : 'border-transparent hover:border-zinc-200'}`}
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
                2. Describe the Finish <HoverTooltip content="Optional details for the AI to follow (e.g.'Faded vintage screenprint' or'Thick 3D embroidery'). It will incorporate this lighting/texture." />
              </h3>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="w-full bg-zinc-50 border-none rounded-2xl p-4 text-sm outline-none focus:ring-2 ring-zinc-900 transition-all resize-none mb-6"
                rows={3}
                placeholder="e.g. High-quality silver embroidery, screen printed with a vintage fade..."
              />

              <h3 className="text-xs uppercase tracking-widest font-bold mb-4 mt-6 flex items-center">
                3. Garment View <HoverTooltip content="Allow the AI to regenerate the garment from a completely different camera perspective before placing the logo." />
              </h3>
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1 space-y-2 w-full">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Rotation / Perspective</label>
                  <select
                    value={garmentView}
                    onChange={(e) => setGarmentView(e.target.value)}
                    className="w-full bg-zinc-50 border-none rounded-xl p-4 text-sm outline-none focus:ring-2 ring-zinc-900 transition-all appearance-none cursor-pointer"
                  >
                    {[
                      'Front View (Default)', 'Back View', 'Left Side View', 'Right Side View', 'Slight Angle / Three-Quarter View'
                    ].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleRotateGarment}
                  disabled={isRotating || garmentView === 'Front View (Default)'}
                  className="bg-zinc-100 text-zinc-900 py-4 px-6 rounded-xl text-xs uppercase tracking-widest font-bold hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap h-[52px] w-full sm:w-auto"
                >
                  <RotateCw size={16} /> {isRotating ? 'Rotating...' : 'Rotate Garment'}
                </button>
              </div>
            </section>

            <div className="pt-8 border-t border-zinc-100 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="flex-1 bg-zinc-900 text-white py-4 rounded-full text-xs uppercase tracking-widest font-bold hover:bg-zinc-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Sparkles size={16} /> {isGenerating ? 'Generating...' : (resultImage ? 'Re-bake Mockup' : 'Bake Mockup')}
                </button>
                {resultImage && (
                  <button
                    onClick={() => setResultImage('')}
                    className="flex-1 bg-white border border-zinc-900 text-zinc-900 py-4 rounded-full text-xs uppercase tracking-widest font-bold hover:bg-zinc-50 transition-colors flex items-center justify-center gap-2 animate-in fade-in"
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
                        className="flex-1 bg-white border border-zinc-900 text-zinc-900 py-4 rounded-full text-xs uppercase tracking-widest font-bold hover:bg-zinc-50 transition-colors flex items-center justify-center gap-2 animate-in fade-in"
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
                        className="flex-1 bg-white border border-zinc-900 text-zinc-900 py-4 rounded-full text-xs uppercase tracking-widest font-bold hover:bg-zinc-50 transition-colors flex items-center justify-center gap-2 animate-in fade-in"
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
                    className="flex-1 bg-zinc-900 text-white py-4 rounded-full text-xs uppercase tracking-widest font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
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
        <div className="p-6 md:p-8 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-1">AI Model Generator</p>
            <h3 className="font-serif text-2xl">Create Lifestyle Scene</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-50 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <div className="space-y-4">
              <div className="aspect-[3/4] bg-white rounded-2xl overflow-hidden border border-zinc-100 flex items-center justify-center relative bg-checkerboard">
                <img src={resultImage || baseImage} className="w-full h-full object-contain p-2" />
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Describe Scene & Model</label>
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  className="w-full bg-zinc-50 border-none rounded-xl p-4 text-sm outline-none focus:ring-2 ring-zinc-900 transition-all resize-none"
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
                  className="w-full bg-zinc-900 text-white py-4 rounded-full text-xs uppercase tracking-widest font-bold hover:bg-zinc-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
  const [decksContainingGarment, setDecksContainingGarment] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (garment?.id) {
      fetch(`/api/garments/${garment.id}/decks`)
        .then(res => res.json())
        .then(ids => {
          if (Array.isArray(ids)) {
            setDecksContainingGarment(new Set(ids));
          }
        })
        .catch(err => console.error("Error fetching decks containing garment:", err));
    }
  }, [garment]);

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
        <div className="p-6 md:p-8 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-1">Add to Deck</p>
            <h3 className="font-serif text-2xl">Select Destination</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-50 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 bg-zinc-50 flex items-center gap-4 border-b border-zinc-100">
          <div className="w-16 h-16 bg-white rounded-xl overflow-hidden border border-zinc-100 flex-shrink-0">
            <img src={garment.image} className="w-full h-full object-contain p-1" />
          </div>
          <div>
            <p className="font-medium text-sm">{garment.name}</p>
            <p className="text-xs text-zinc-500">${garment.price}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {sortedCompanies.map(company => (
            <div key={company} className="border border-zinc-100 rounded-3xl overflow-hidden shadow-sm">
              <button
                onClick={() => setExpandedCompany(expandedCompany === company ? null : company)}
                className="w-full text-left p-6 bg-white hover:bg-zinc-50 transition-colors flex items-center justify-between"
              >
                <div className="flex flex-col">
                  <h4 className="font-serif text-2xl font-bold">{company}</h4>
                </div>
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-50">
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
                    <div className="p-4 space-y-2 border-t border-zinc-100">
                      {groupedDecks[company].map(deck => (
                        <button
                          key={deck.id}
                          onClick={() => onSelect(deck)}
                          className={`w-full text-left p-4 rounded-xl ${decksContainingGarment.has(deck.id) ? 'bg-zinc-50 border-zinc-200' : 'bg-white border-zinc-100'} hover:border-zinc-300 border shadow-sm transition-all flex items-center justify-between group`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-base font-medium text-zinc-600 group-hover:text-zinc-900 transition-colors">{deck.name}</span>
                            {decksContainingGarment.has(deck.id) && (
                              <span className="bg-emerald-100 text-emerald-700 text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                Added
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            {decksContainingGarment.has(deck.id) ? (
                              <>Add Again <ChevronRight size={12} /></>
                            ) : (
                              <>Select <ChevronRight size={12} /></>
                            )}
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
              <p className="text-zinc-400 font-serif italic text-sm">No decks found. Create one in the Customers tab.</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function ImageMagnifier({ src, isCoverSlide = false }: { src: string, isCoverSlide?: boolean }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    const { top, left, width, height } = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - left;
    const y = e.clientY - top;
    setCursorPosition({ x, y });
    setPosition({
      x: (x / width) * 100,
      y: (y / height) * 100
    });
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center cursor-crosshair">
      <img
        src={src}
        className={`w-full h-full ${isCoverSlide ? 'object-cover' : 'object-contain'} pointer-events-auto`}
        onMouseEnter={() => setShowMagnifier(true)}
        onMouseLeave={() => setShowMagnifier(false)}
        onMouseMove={handleMouseMove}
      />
      {showMagnifier && (
        <>
          <div
            className="fixed top-24 bottom-16 right-16 w-[45vw] max-w-3xl rounded-[2rem] shadow-2xl border-4 border-white z-50 overflow-hidden bg-white pointer-events-none hidden md:block animate-in fade-in zoom-in-95 duration-200"
          >
            <div
              className="w-full h-full"
              style={{
                backgroundImage: `url(${src})`,
                backgroundPosition: `${position.x}% ${position.y}%`,
                backgroundSize: '250%',
                backgroundRepeat: 'no-repeat'
              }}
            />
          </div>
          <div
            className="absolute pointer-events-none border-2 border-zinc-400/50 bg-white/10 mix-blend-difference"
            style={{
              width: '80px',
              height: '80px',
              top: `${cursorPosition.y - 40}px`,
              left: `${cursorPosition.x - 40}px`,
            }}
          />
        </>
      )}
    </div>
  );
}

function PresentationMode({ deck, onClose, showPricing, isSharedView = false }: { deck: Deck, onClose: () => void, showPricing: boolean, isSharedView?: boolean }) {
  const [items, setItems] = useState<DeckItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeVariations, setActiveVariations] = useState<Record<number, string>>({});
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/decks/${deck.id}`)
      .then(res => res.json())
      .then(data => {
        const fetchedItems = data.items || [];
        if (data.cover_images && data.cover_images.length > 0) {
          const coverItem = {
            id: -999, // fake id
            deck_id: deck.id,
            mock_image: data.cover_images[0],
            variations: data.cover_images.slice(1),
            custom_name: data.name,
            custom_description: `Welcome to the presentation for ${data.customer_name || 'this collection'}.`,
            custom_price: 0,
            isCoverSlide: true
          } as any;
          setItems([coverItem, ...fetchedItems]);
        } else {
          setItems(fetchedItems);
        }
      });

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
      className="fixed inset-0 bg-[#fafafa] z-[100] h-[100dvh] overflow-hidden"
    >
      <div className="fixed top-0 inset-x-0 flex items-start md:items-center justify-between px-4 md:px-8 py-3 md:py-4 border-b border-black/5 bg-white/70 backdrop-blur-xl z-50">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-1.5 md:gap-4 overflow-hidden">
          <img src="/wovn-logo.png" alt="WOVN" className="h-5 md:h-6 object-contain" />
          <div className="w-px h-8 bg-zinc-200 hidden md:block" />
          <div className="min-w-0">
            <p className="text-[8px] md:text-[10px] uppercase tracking-widest font-bold text-zinc-400 truncate">
              Presentation Mode {deck.customer_name ? `• ${deck.customer_name}` : ''}
            </p>
            <h3 className="font-serif text-lg md:text-xl truncate leading-tight">{deck.name}</h3>
          </div>
        </div>
        {!isSharedView && (
          <button
            onClick={onClose}
            className="p-2 md:p-3 hover:bg-black/5 rounded-full transition-colors shrink-0 ml-2"
          >
            <X size={20} className="md:w-6 md:h-6" />
          </button>
        )}
      </div>

      <div className="h-full flex items-start justify-center relative px-2 md:px-20 overflow-y-auto overflow-x-hidden pt-24 pb-32 md:pb-8 w-full scrolling-touch">
        <button
          onClick={prev}
          className="fixed md:absolute left-2 md:left-8 top-1/2 -translate-y-1/2 z-20 p-3 md:p-4 hover:bg-zinc-50 rounded-full transition-colors bg-white/80 backdrop-blur shadow-md md:shadow-none md:bg-transparent md:backdrop-blur-none"
        >
          <ArrowLeft size={20} className="md:w-8 md:h-8" />
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={`flex flex-col md:flex-row items-center gap-6 md:gap-20 ${currentItem.isCoverSlide ? 'max-w-[95vw] xl:max-w-[90vw] 2xl:max-w-[85vw]' : 'max-w-7xl'} w-full my-4 md:my-auto px-4 md:px-0`}
          >
            <div className={`flex flex-col ${currentItem.isCoverSlide ? 'flex-[1.5] w-full mx-auto' : 'flex-[1.2] lg:flex-[1.5] w-full max-w-md lg:max-w-2xl xl:max-w-3xl mx-auto'} gap-4`}>
              {(() => {
                const isActiveVariant = Boolean(activeVariations[currentItem.id] && activeVariations[currentItem.id] !== currentItem.mock_image);
                const containerClasses = currentItem.isCoverSlide 
                  ? 'w-full h-full aspect-[4/3] lg:aspect-[16/10] shrink p-0 max-h-[80vh] md:max-h-[85vh]' 
                  : `aspect-[4/5] md:aspect-[3/4] ${isActiveVariant ? 'p-0' : 'p-4 md:p-8'} w-full max-h-[60vh] md:max-h-[75vh]`;
                
                return (
                  <div className={`${containerClasses} mx-auto rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden shadow-xl md:shadow-2xl bg-white flex items-center justify-center relative border border-zinc-100 md:border-none`}>
                    <ImageMagnifier 
                      src={activeVariations[currentItem.id] || currentItem.mock_image} 
                      isCoverSlide={currentItem.isCoverSlide || isActiveVariant} 
                    />
                  </div>
                );
              })()}

              {currentItem.variations && currentItem.variations.length > 0 && (
                <div className="flex gap-2 lg:gap-3 flex-wrap justify-center">
                  <button
                    onClick={() => setActiveVariations(prev => ({ ...prev, [currentItem.id]: currentItem.mock_image }))}
                    className={`w-14 h-14 md:w-16 md:h-16 rounded-xl border-2 overflow-hidden transition-all p-1 bg-white ${(!activeVariations[currentItem.id] || activeVariations[currentItem.id] === currentItem.mock_image) ? 'border-zinc-900 shadow-sm scale-110' : 'border-zinc-200 hover:border-zinc-400 opacity-70 hover:opacity-100'}`}
                  >
                    <img src={currentItem.mock_image} className="w-full h-full object-contain" />
                  </button>
                  {currentItem.variations.map((v, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveVariations(prev => ({ ...prev, [currentItem.id]: v }))}
                      className={`w-14 h-14 md:w-16 md:h-16 rounded-xl border-2 overflow-hidden transition-all p-0 bg-white ${activeVariations[currentItem.id] === v ? 'border-zinc-900 shadow-sm scale-110' : 'border-zinc-200 hover:border-zinc-400 opacity-70 hover:opacity-100'}`}
                    >
                      <img src={v} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex-1 space-y-3 md:space-y-8 w-full mt-4 md:mt-0">
              <div className="space-y-2 md:space-y-4 text-center md:text-left">
                <p className="text-[10px] md:text-xs uppercase tracking-widest font-bold text-zinc-400">{currentItem.isCoverSlide ? 'Presentation Cover' : `Item ${currentIndex + (items[0]?.isCoverSlide ? 0 : 1)} of ${items[0]?.isCoverSlide ? items.length - 1 : items.length}`}</p>
                <h2 className={`font-serif leading-tight ${currentItem.isCoverSlide ? 'text-4xl md:text-6xl' : 'text-3xl md:text-7xl'}`}>{currentItem.custom_name || currentItem.garment_name}</h2>
                <p className="text-zinc-500 text-sm md:text-xl leading-relaxed">
                  {currentItem.custom_description || currentItem.garment_description}
                </p>
              </div>
              <div className="pt-6 md:pt-12 border-t border-zinc-100 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
                {showPricing && !currentItem.isCoverSlide && currentItem.custom_price !== 0 ? <p className="text-2xl md:text-4xl font-medium">${currentItem.custom_price || currentItem.garment_price}</p> : <div />}
                <div className="flex flex-wrap justify-center md:justify-start gap-1.5 md:gap-2 max-w-full">
                  {!currentItem.isCoverSlide && ((Array.isArray(currentItem.custom_sizes) ? currentItem.custom_sizes.join(',') : currentItem.custom_sizes) || (Array.isArray(currentItem.sizes) ? currentItem.sizes.join(',') : currentItem.sizes) || 'XS,S,M,L,XL').split(',').map((size: string, idx: number) => (
                    <span key={idx} className="w-8 h-8 md:w-12 md:h-12 border border-zinc-200 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold text-zinc-400">
                      {size.trim()}
                    </span>
                  ))}
                </div>
              </div>

              {!currentItem.isCoverSlide && (
                <div className="pt-6 md:pt-12 border-t border-zinc-100">
                  <div className="mb-10 w-full">
                    {(currentItem.fabric_details || currentItem.fabric_finish) && (
                      <div className="border-b border-zinc-100">
                        <button 
                          onClick={() => setExpandedSection(expandedSection === `${currentItem.id}-fabric` ? null : `${currentItem.id}-fabric`)}
                          className="w-full flex items-center justify-between py-5 text-[10px] md:text-xs uppercase tracking-widest font-bold text-zinc-900 hover:text-zinc-500 transition-colors"
                        >
                          <span>Fabric & Finish</span>
                          {expandedSection === `${currentItem.id}-fabric` ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <AnimatePresence>
                          {expandedSection === `${currentItem.id}-fabric` && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="pb-6 text-sm md:text-base text-zinc-500 leading-relaxed space-y-4">
                                {currentItem.fabric_details && <div><strong className="text-zinc-900 block mb-1">Material</strong>{currentItem.fabric_details}</div>}
                                {currentItem.fabric_finish && <div><strong className="text-zinc-900 block mb-1">Finish</strong>{currentItem.fabric_finish}</div>}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {currentItem.care_instructions && (
                      <div className="border-b border-zinc-100">
                        <button 
                          onClick={() => setExpandedSection(expandedSection === `${currentItem.id}-care` ? null : `${currentItem.id}-care`)}
                          className="w-full flex items-center justify-between py-5 text-[10px] md:text-xs uppercase tracking-widest font-bold text-zinc-900 hover:text-zinc-500 transition-colors"
                        >
                          <span>Care Instructions</span>
                          {expandedSection === `${currentItem.id}-care` ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <AnimatePresence>
                          {expandedSection === `${currentItem.id}-care` && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="pb-6 text-sm md:text-base text-zinc-500 leading-relaxed">
                                {currentItem.care_instructions}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {(currentItem.decoration_method || currentItem.available_colors) && (
                      <div className="border-b border-zinc-100">
                        <button 
                          onClick={() => setExpandedSection(expandedSection === `${currentItem.id}-customization` ? null : `${currentItem.id}-customization`)}
                          className="w-full flex items-center justify-between py-5 text-[10px] md:text-xs uppercase tracking-widest font-bold text-zinc-900 hover:text-zinc-500 transition-colors"
                        >
                          <span>Customization Options</span>
                          {expandedSection === `${currentItem.id}-customization` ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <AnimatePresence>
                          {expandedSection === `${currentItem.id}-customization` && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="pb-6 text-sm md:text-base text-zinc-500 leading-relaxed grid grid-cols-1 md:grid-cols-2 gap-6">
                                {currentItem.decoration_method && <div><strong className="text-zinc-900 block mb-1">Techniques</strong>{currentItem.decoration_method}</div>}
                                {currentItem.available_colors && <div><strong className="text-zinc-900 block mb-1">Available Thread/Ink Colors</strong>{currentItem.available_colors}</div>}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {currentItem.turn_time && (
                      <div className="border-b border-zinc-100">
                        <button 
                          onClick={() => setExpandedSection(expandedSection === `${currentItem.id}-production` ? null : `${currentItem.id}-production`)}
                          className="w-full flex items-center justify-between py-5 text-[10px] md:text-xs uppercase tracking-widest font-bold text-zinc-900 hover:text-zinc-500 transition-colors"
                        >
                          <span>Production Details</span>
                          {expandedSection === `${currentItem.id}-production` ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <AnimatePresence>
                          {expandedSection === `${currentItem.id}-production` && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="pb-6 text-sm md:text-base text-zinc-500 leading-relaxed">
                                <div><strong className="text-zinc-900 block mb-1">Estimated Turnaround</strong>{currentItem.turn_time}</div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        <button
          onClick={next}
          className="fixed md:absolute right-2 md:right-8 top-1/2 -translate-y-1/2 z-20 p-3 md:p-4 hover:bg-zinc-50 rounded-full transition-colors bg-white/80 backdrop-blur shadow-md md:shadow-none md:bg-transparent md:backdrop-blur-none"
        >
          <ChevronRight size={20} className="md:w-8 md:h-8" />
        </button>
      </div>

      <div className="flex-none p-4 md:p-8 flex flex-wrap justify-center gap-1 border-t border-zinc-100 md:border-none bg-white md:bg-transparent items-center shrink-0 w-full sticky bottom-0 z-30">
        {items.map((_, i) => (
          <div
            key={i}
            className={`h-1 !rounded-full transition-all duration-500 ${i === currentIndex ? 'w-6 md:w-12 bg-zinc-900' : 'w-1.5 md:w-2 bg-zinc-200'}`}
          />
        ))}
      </div>
    </motion.div>
  );
}

function DeckModal({ onClose, onConfirm, initialName = '', initialCoverImages = [] }: { onClose: () => void, onConfirm: (name: string, coverImages: string[]) => void, initialName?: string, initialCoverImages?: string[] }) {
  const [name, setName] = useState(initialName);
  const [coverImages, setCoverImages] = useState<string[]>(initialCoverImages);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onConfirm(name.trim(), coverImages);
    }
  };

  const handleUploadCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files as unknown as File[]).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setCoverImages(prev => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveCover = (index: number) => {
    setCoverImages(prev => prev.filter((_, i) => i !== index));
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
        <div className="p-6 md:p-8 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-1">{initialName ? 'Rename Presentation' : 'New Presentation'}</p>
            <h3 className="font-serif text-2xl">{initialName ? 'Rename Deck' : 'Create Deck'}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-50 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 max-h-[80vh] overflow-y-auto">
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

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 block">Cover Photos</label>
              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-full text-[10px] uppercase tracking-widest font-bold transition-colors cursor-pointer">
                <Upload size={12} /> Upload
                <input type="file" className="hidden" accept="image/*" multiple onChange={handleUploadCover} />
              </label>
            </div>
            <p className="text-xs text-zinc-500 mb-4">First image will be the primary presentation slide. Others will be shown as slide variants.</p>
            {coverImages.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {coverImages.map((img, i) => (
                  <div key={i} className="aspect-square relative rounded-xl overflow-hidden border border-zinc-200 bg-zinc-50 group">
                    <img src={img} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveCover(i)}
                      className="absolute top-1.5 right-1.5 p-1 bg-white/90 shadow-sm rounded-full text-zinc-500 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                    {i === 0 && (
                      <div className="absolute bottom-0 left-0 right-0 bg-zinc-900/60 backdrop-blur-sm p-1 text-center">
                        <p className="text-[8px] uppercase tracking-widest font-bold text-white">Primary</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-zinc-100">
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
              {initialName ? 'Save Changes' : 'Create Deck'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}


function BackgroundEraserModal({ item, currentUrl, onClose, onSave }: {
  item: DeckItem,
  currentUrl: string,
  onClose: () => void,
  onSave: (newUrl: string) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [tolerance, setTolerance] = useState(35);
  const [isProcessing, setIsProcessing] = useState(false);
  const [needsReset, setNeedsReset] = useState(0);
  const [lastClickPos, setLastClickPos] = useState<{x: number, y: number} | null>(null);

  const [isSpaceDown, setIsSpaceDown] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const stateRef = useRef({ zoom: 1, pan: { x: 0, y: 0 } });
  const [viewState, setViewState] = useState({ zoom: 1, pan: { x: 0, y: 0 } });

  // Keyboard listeners for spacebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsSpaceDown(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpaceDown(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Wheel listener for zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleNativeWheel = (e: WheelEvent) => {
      if (e.altKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.15 : 0.15;
        const current = stateRef.current;
        const newZoom = Math.max(0.2, Math.min(25, current.zoom * (1 + delta)));
        
        const rect = container.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        const lx = (e.clientX - cx - current.pan.x) / current.zoom;
        const ly = (e.clientY - cy - current.pan.y) / current.zoom;

        const newPanX = e.clientX - cx - lx * newZoom;
        const newPanY = e.clientY - cy - ly * newZoom;
        
        stateRef.current = { zoom: newZoom, pan: { x: newPanX, y: newPanY } };
        setViewState(stateRef.current);
      }
    };
    
    container.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleNativeWheel);
  }, []);

  // Main render loop for image drawing and erasure
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // If we have a click position, perform flood fill immediately after drawing base image
      if (lastClickPos) {
        const w = canvas.width;
        const h = canvas.height;
        const startX = lastClickPos.x;
        const startY = lastClickPos.y;
        
        if (startX >= 0 && startX < w && startY >= 0 && startY < h) {
          const imgData = ctx.getImageData(0, 0, w, h);
          const data = imgData.data;
          
          const startPos = (startY * w + startX) * 4;
          const startR = data[startPos];
          const startG = data[startPos+1];
          const startB = data[startPos+2];
          const startA = data[startPos+3];

          if (startA !== 0) {
            const scaledTolerance = (tolerance / 100) * 255;
            
            const match = (p: number) => {
              const a = data[p+3];
              if (a === 0) return false;
              const r = data[p];
              const g = data[p+1];
              const b = data[p+2];
              
              const diff = Math.max(Math.abs(r - startR), Math.abs(g - startG), Math.abs(b - startB));
              return diff <= scaledTolerance;
            };
            
            const maxStack = w * h * 2;
            const stack = new Uint32Array(maxStack);
            let stackPtr = 0;
            
            stack[stackPtr++] = startX;
            stack[stackPtr++] = startY;
            
            const visited = new Uint8Array(w * h);
            visited[startY * w + startX] = 1;
            
            while(stackPtr > 0) {
              const y = stack[--stackPtr];
              const x = stack[--stackPtr];
              
              const p = (y * w + x) * 4;
              if (match(p)) {
                data[p + 3] = 0;
                
                if (x > 0 && visited[y * w + (x - 1)] === 0) { 
                   visited[y * w + (x - 1)] = 1; 
                   stack[stackPtr++] = x - 1;
                   stack[stackPtr++] = y;
                }
                if (x < w - 1 && visited[y * w + (x + 1)] === 0) { 
                   visited[y * w + (x + 1)] = 1; 
                   stack[stackPtr++] = x + 1;
                   stack[stackPtr++] = y;
                }
                if (y > 0 && visited[(y - 1) * w + x] === 0) { 
                   visited[(y - 1) * w + x] = 1; 
                   stack[stackPtr++] = x;
                   stack[stackPtr++] = y - 1;
                }
                if (y < h - 1 && visited[(y + 1) * w + x] === 0) { 
                   visited[(y + 1) * w + x] = 1; 
                   stack[stackPtr++] = x;
                   stack[stackPtr++] = y + 1;
                }
              }
            }
            
            ctx.putImageData(imgData, 0, 0);
          }
        }
      }
    };
    img.src = currentUrl;
  }, [currentUrl, needsReset, tolerance, lastClickPos]);

  const handleCanvasClick = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // Calculate exact click coordinates within original image scale
    const startX = Math.floor(e.nativeEvent.offsetX * scaleX);
    const startY = Math.floor(e.nativeEvent.offsetY * scaleY);
    
    setLastClickPos({ x: startX, y: startY });
  };
  
  const handleSave = async () => {
    if (!canvasRef.current) return;
    setIsProcessing(true);
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      const finalUrl = await compressImageIfNeeded(dataUrl);
      onSave(finalUrl);
    } catch (err) {
      console.error(err);
      alert('Failed to save erased image');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="p-6 md:p-8 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h3 className="font-serif text-2xl">Manual Eraser</h3>
            <p className="text-zinc-500 text-sm mt-1">Click anywhere on the grey background to instantly wipe it out to pure transparency.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-50 rounded-full transition-colors"><X size={20} /></button>
        </div>
        
        <div 
          ref={containerRef}
          className="p-6 flex-1 overflow-hidden flex flex-col items-center justify-center border-y border-zinc-200 relative select-none" 
          style={{ 
            backgroundColor: '#e5e7eb',
            backgroundImage: 'linear-gradient(45deg, #9ca3af 25%, transparent 25%, transparent 75%, #9ca3af 75%, #9ca3af), linear-gradient(45deg, #9ca3af 25%, transparent 25%, transparent 75%, #9ca3af 75%, #9ca3af)',
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 10px 10px'
          }}
        >
          <div className="absolute top-4 left-4 bg-zinc-900/60 backdrop-blur text-white text-[9px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full pointer-events-none z-10 flex items-center gap-2">
            <span>Alt + Scroll to Zoom</span>
            <span className="w-1 h-1 rounded-full bg-white/30"></span>
            <span>Space + Drag to Pan</span>
          </div>

          <div 
            style={{ 
              transform: `translate(${viewState.pan.x}px, ${viewState.pan.y}px) scale(${viewState.zoom})`,
              display: 'flex' 
            }}
          >
            <canvas
              ref={canvasRef}
              onPointerDown={(e) => {
                if (isSpaceDown || e.button === 1 || e.button === 2) { 
                  e.preventDefault();
                  setIsDragging(true);
                  (e.target as HTMLElement).setPointerCapture(e.pointerId);
                } else if (e.button === 0) {
                  handleCanvasClick(e);
                }
              }}
              onPointerMove={(e) => {
                if (isDragging) {
                  stateRef.current.pan = { 
                    x: stateRef.current.pan.x + e.movementX, 
                    y: stateRef.current.pan.y + e.movementY 
                  };
                  setViewState({ ...stateRef.current });
                }
              }}
              onPointerUp={(e) => {
                if (isDragging) {
                  setIsDragging(false);
                  (e.target as HTMLElement).releasePointerCapture(e.pointerId);
                }
              }}
              onContextMenu={e => e.preventDefault()}
              className={`w-auto h-auto max-w-full max-h-[60vh] shadow-2xl bg-transparent ${isSpaceDown || isDragging ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}`}
              style={{ touchAction: 'none' }}
            />
          </div>
        </div>
        
        <div className="p-6 md:px-8 border-t border-zinc-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-6">
            <div>
              <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-400 mb-2 block">Detection Tolerance: {tolerance}</label>
              <input 
                type="range" 
                min="0" max="100" 
                value={tolerance} 
                onChange={(e) => setTolerance(Number(e.target.value))}
                className="w-32 md:w-48 accent-zinc-900"
              />
            </div>
            <button 
              onClick={() => {
                                  setNeedsReset(n => n + 1);
                  setLastClickPos(null);
                stateRef.current = { zoom: 1, pan: { x: 0, y: 0 } };
                setViewState(stateRef.current);
              }} 
              className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 hover:text-zinc-900 flex items-center gap-1.5 transition-colors pt-4"
            >
              <RotateCw size={12} /> Reset Image
            </button>
          </div>
          <div className="flex gap-4">
            <button onClick={onClose} className="px-6 py-3 rounded-full text-xs font-bold tracking-widest uppercase hover:bg-zinc-100 transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={isProcessing} className="px-6 py-3 bg-zinc-900 text-white rounded-full text-xs font-bold tracking-widest uppercase hover:bg-zinc-800 transition-colors disabled:opacity-50 flex items-center gap-2">
              {isProcessing && <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
              {isProcessing ? 'Saving...' : 'Save & Replace'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
