import { create } from 'zustand';

// Calculate the total price of a cart item including its selected options
export const calculateItemTotal = (product, selectedOptions, quantity) => {
  let basePrice = Number(product.price) || 0;
  let optionsExtra = 0;
  
  if (selectedOptions && Array.isArray(selectedOptions)) {
    selectedOptions.forEach(opt => {
      // opt can be a single value object or an array of values (for multiple)
      const values = Array.isArray(opt.value) ? opt.value : [opt.value];
      values.forEach(v => {
        if (v && v.extra_price) {
          optionsExtra += Number(v.extra_price);
        }
      });
    });
  }
  
  return (basePrice + optionsExtra) * quantity;
};

export const useCart = create((set, get) => ({
  businessId: null, // To track which business the cart belongs to
  items: [],
  isOpen: false,

  setIsOpen: (isOpen) => set({ isOpen }),

  // Add an item to the cart
  addItem: (product, selectedOptions, specialInstructions, quantity, businessId) => {
    const currentBusiness = get().businessId;
    
    // If adding from a different business, clear the cart first
    if (currentBusiness && currentBusiness !== businessId && get().items.length > 0) {
      if (!window.confirm("Tienes artículos de otro negocio en tu carrito. ¿Deseas vaciarlo y empezar un nuevo pedido aquí?")) {
        return false;
      }
      set({ items: [], businessId: null });
    }

    const qtyToAdd = quantity || 1;
    const newItems = [];
    
    for (let i = 0; i < qtyToAdd; i++) {
      newItems.push({
        id: Math.random().toString(36).substring(2, 10) + Date.now().toString(36) + i,
        product,
        selectedOptions: selectedOptions || [],
        specialInstructions: specialInstructions || "",
        quantity: 1, // ALWAYS add as individual items with quantity 1
        unitTotal: calculateItemTotal(product, selectedOptions, 1)
      });
    }

    set((state) => ({
      businessId,
      items: [...state.items, ...newItems]
    }));
    return true;
  },

  // Remove an item
  removeItem: (itemId) => set((state) => {
    const newItems = state.items.filter(i => i.id !== itemId);
    return {
      items: newItems,
      businessId: newItems.length === 0 ? null : state.businessId
    };
  }),

  // Update quantity of an item
  updateQuantity: (itemId, newQuantity) => set((state) => {
    if (newQuantity <= 0) {
      const newItems = state.items.filter(i => i.id !== itemId);
      return { items: newItems, businessId: newItems.length === 0 ? null : state.businessId };
    }
    
    return {
      items: state.items.map(i => i.id === itemId ? { ...i, quantity: newQuantity } : i)
    };
  }),

  // Update special instructions for an item
  updateNotes: (itemId, notes) => set((state) => ({
    items: state.items.map(i => i.id === itemId ? { ...i, specialInstructions: notes } : i)
  })),

  // Clear cart
  clearCart: () => set({ items: [], businessId: null, isOpen: false }),

  // Get total sum
  getCartTotal: () => {
    const { items } = get();
    return items.reduce((sum, item) => sum + (item.unitTotal * item.quantity), 0);
  }
}));
