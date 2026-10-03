import { create } from 'zustand';
import { Product, ToastMessage } from '../types';

interface AppStore {
  // Wishlist
  wishlist: string[];
  isWishlistOpen: boolean;
  toggleWishlist: (productId: string) => void;
  setWishlistOpen: (isOpen: boolean) => void;

  // Compare
  compareList: Product[];
  isCompareOpen: boolean;
  addToCompare: (product: Product) => boolean;
  removeFromCompare: (productId: string) => void;
  clearCompare: () => void;
  setCompareOpen: (isOpen: boolean) => void;

  // Quickview Modal
  quickviewProduct: Product | null;
  openQuickview: (product: Product) => void;
  closeQuickview: () => void;

  // Quote Builder
  quoteItems: Product[];
  isQuoteModalOpen: boolean;
  addToQuote: (product: Product) => void;
  removeFromQuote: (productId: string) => void;
  clearQuote: () => void;
  setQuoteModalOpen: (isOpen: boolean) => void;

  // Search Overlay
  isSearchOpen: boolean;
  searchQuery: string;
  setSearchOpen: (isOpen: boolean) => void;
  setSearchQuery: (query: string) => void;

  // Toast Notifications
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useStore = create<AppStore>((set, get) => ({
  // Wishlist
  wishlist: ['prod-01', 'prod-03'],
  isWishlistOpen: false,
  toggleWishlist: (productId: string) => {
    const current = get().wishlist;
    const exists = current.includes(productId);
    const updated = exists ? current.filter((id) => id !== productId) : [...current, productId];
    set({ wishlist: updated });
    get().addToast({
      type: exists ? 'info' : 'success',
      title: exists ? 'Removed from Wishlist' : 'Added to Wishlist',
      message: exists ? 'Item was removed from your saved list.' : 'Item saved to your wishlist.'
    });
  },
  setWishlistOpen: (isOpen: boolean) => set({ isWishlistOpen: isOpen }),

  // Compare (Max 4 products)
  compareList: [],
  isCompareOpen: false,
  addToCompare: (product: Product) => {
    const current = get().compareList;
    if (current.some((p) => p.id === product.id)) {
      get().removeFromCompare(product.id);
      return false;
    }
    if (current.length >= 4) {
      get().addToast({
        type: 'warning',
        title: 'Compare Limit Reached',
        message: 'You can compare a maximum of 4 products simultaneously.'
      });
      return false;
    }
    set({ compareList: [...current, product] });
    get().addToast({
      type: 'success',
      title: 'Added to Comparison',
      message: `${product.model} is ready for technical specification comparison.`
    });
    return true;
  },
  removeFromCompare: (productId: string) => {
    set({ compareList: get().compareList.filter((p) => p.id !== productId) });
    get().addToast({
      type: 'info',
      title: 'Removed from Comparison'
    });
  },
  clearCompare: () => set({ compareList: [] }),
  setCompareOpen: (isOpen: boolean) => set({ isCompareOpen: isOpen }),

  // Quickview
  quickviewProduct: null,
  openQuickview: (product: Product) => set({ quickviewProduct: product }),
  closeQuickview: () => set({ quickviewProduct: null }),

  // Quote Builder
  quoteItems: [],
  isQuoteModalOpen: false,
  addToQuote: (product: Product) => {
    const current = get().quoteItems;
    if (!current.some((p) => p.id === product.id)) {
      set({ quoteItems: [...current, product] });
      get().addToast({
        type: 'success',
        title: 'Added to BOM Quote',
        message: `${product.model} added to your Bill of Materials.`
      });
    } else {
      get().addToast({
        type: 'info',
        title: 'Already in Quote',
        message: `${product.model} is already listed in your quote request.`
      });
    }
  },
  removeFromQuote: (productId: string) => {
    set({ quoteItems: get().quoteItems.filter((p) => p.id !== productId) });
  },
  clearQuote: () => set({ quoteItems: [] }),
  setQuoteModalOpen: (isOpen: boolean) => set({ isQuoteModalOpen: isOpen }),

  // Search
  isSearchOpen: false,
  searchQuery: '',
  setSearchOpen: (isOpen: boolean) => set({ isSearchOpen: isOpen }),
  setSearchQuery: (query: string) => set({ searchQuery: query }),

  // Toasts
  toasts: [],
  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newToast: ToastMessage = { ...toast, id };
    set({ toasts: [...get().toasts, newToast] });
    setTimeout(() => {
      get().removeToast(id);
    }, 4500);
  },
  removeToast: (id: string) => {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  }
}));
