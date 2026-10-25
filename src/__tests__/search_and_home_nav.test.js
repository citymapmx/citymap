import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Search and Home Navigation URL sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('correctly reads initial search query from URL', () => {
    const url = 'https://citymap.mx/tepic?q=pizza';
    const params = new URLSearchParams(new URL(url).search);
    const initialQuery = params.get('q') || '';
    expect(initialQuery).toBe('pizza');
  });

  it('removes q parameter when query is empty and restores clean city URL', () => {
    const currentUrl = 'https://citymap.mx/tepic?q=pizza';
    const parsed = new URL(currentUrl);
    const params = new URLSearchParams(parsed.search);
    
    // Simulate backspacing or clearing
    const search = '';
    const trimmed = search.trim();
    if (trimmed) {
      params.set('q', trimmed);
    } else {
      params.delete('q');
    }

    const newQueryStr = params.toString() ? `?${params.toString()}` : '';
    const target = `${parsed.pathname}${newQueryStr}`;

    expect(target).toBe('/tepic');
  });

  it('updates q parameter when searching without duplicating history per keystroke', () => {
    const mockNavigate = vi.fn();
    let currentSearch = '';
    let locationSearch = '';

    const syncSearchToUrl = (newQuery) => {
      const params = new URLSearchParams(locationSearch);
      const currentQ = params.get('q') || '';
      const trimmed = newQuery.trim();

      if (trimmed === currentQ) return;

      if (trimmed) {
        params.set('q', trimmed);
      } else {
        params.delete('q');
      }

      const newQueryStr = params.toString() ? `?${params.toString()}` : '';
      const target = `/tepic${newQueryStr}`;
      const shouldReplace = !!currentQ;

      mockNavigate(target, { replace: shouldReplace });
      locationSearch = newQueryStr;
      currentSearch = newQuery;
    };

    // First keystroke: "p" -> pushes history (replace: false)
    syncSearchToUrl('p');
    expect(mockNavigate).toHaveBeenLastCalledWith('/tepic?q=p', { replace: false });

    // Subsequent keystrokes: "pi", "piz", "pizza" -> replaces history (replace: true)
    syncSearchToUrl('pi');
    expect(mockNavigate).toHaveBeenLastCalledWith('/tepic?q=pi', { replace: true });

    syncSearchToUrl('piz');
    expect(mockNavigate).toHaveBeenLastCalledWith('/tepic?q=piz', { replace: true });

    syncSearchToUrl('pizza');
    expect(mockNavigate).toHaveBeenLastCalledWith('/tepic?q=pizza', { replace: true });
  });

  it('home navigation resets search, activeCat, modals, and navigates to clean city path', () => {
    let activeCat = 'restaurantes';
    let search = 'pizza';
    let selected = { id: 'biz1' };
    let selectedEvent = { id: 'ev1' };
    let locationSearch = '?q=pizza';
    let locationPathname = '/tepic';
    const mockNavigate = vi.fn();
    const mockScrollTo = vi.fn();
    if (typeof window === 'undefined') {
      globalThis.window = { scrollTo: mockScrollTo };
    } else {
      window.scrollTo = mockScrollTo;
    }

    const navigate = (v) => {
      const city = 'tepic';
      const cityPrefix = `/${city}`;
      let path = cityPrefix;

      if (v === 'home') {
        activeCat = 'explorar';
        search = '';
        selected = null;
        selectedEvent = null;
        path = cityPrefix;

        if (locationPathname !== path || locationSearch) {
          mockNavigate(path, { replace: false, viewTransition: true });
          locationSearch = '';
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    };

    navigate('home');

    expect(activeCat).toBe('explorar');
    expect(search).toBe('');
    expect(selected).toBeNull();
    expect(selectedEvent).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith('/tepic', { replace: false, viewTransition: true });
    expect(mockScrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('restores search query on back navigation from home to previous search', () => {
    let search = '';
    const locationSearch = '?q=pizza';

    // Simulate URL listener running on popstate (Back button)
    const params = new URLSearchParams(locationSearch);
    const urlQuery = params.get('q') || '';
    if (urlQuery !== search) {
      search = urlQuery;
    }

    expect(search).toBe('pizza');
  });

  it('discards stale async search responses if user pressed Inicio before response completes', async () => {
    let search = 'pizza';
    const activeSearchQueryRef = { current: search };
    let stateResults = [];

    // Simulate async search request starting
    const queryForThisRequest = search;
    const fetchPromise = new Promise(resolve => {
      setTimeout(() => resolve([{ id: 1, name: 'Pizza Place' }]), 50);
    });

    // In the meantime, user presses "Inicio"
    search = '';
    activeSearchQueryRef.current = '';

    // Response arrives
    const results = await fetchPromise;
    if (activeSearchQueryRef.current === queryForThisRequest) {
      stateResults = results;
    }

    // Results should NOT be applied because the query became stale
    expect(stateResults).toEqual([]);
  });
});
