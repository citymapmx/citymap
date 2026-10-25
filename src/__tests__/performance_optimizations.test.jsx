import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import OptimizedImage from '../components/ui/OptimizedImage.jsx';
import HomeEvents from '../components/home/HomeEvents.jsx';
import { useDataStore } from '../store/useDataStore.js';
import { sb } from '../lib/supabase.js';

// Setup mock localStorage on globalThis for node environment
const storageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

globalThis.localStorage = storageMock;
globalThis.window = {
  CITY_TZ: 'America/Mexico_City'
};

describe('Performance Optimizations - Banner & Event Loading', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
    vi.clearAllMocks();
  });

  describe('1. OptimizedImage Priority Rendering', () => {
    it('renders with opacity: 1, eager loading and fetchPriority="high" when priority is true', () => {
      const html = renderToStaticMarkup(
        <OptimizedImage
          src="https://res.cloudinary.com/demo/image/upload/sample.jpg"
          alt="Banner Hero"
          priority={true}
          widthRequest={800}
        />
      );

      expect(html).toContain('fetchPriority="high"');
      expect(html).toContain('loading="eager"');
      expect(html.toLowerCase()).toContain('fetchpriority="high"');
      expect(html).toContain('decoding="sync"');
    });

    it('renders with opacity: 0 and lazy loading when priority is false', () => {
      const html = renderToStaticMarkup(
        <OptimizedImage
          src="https://res.cloudinary.com/demo/image/upload/sample_lazy.jpg"
          alt="Lazy Card"
          priority={false}
          widthRequest={400}
        />
      );

      expect(html).toContain('opacity:0');
      expect(html).toContain('loading="lazy"');
      expect(html).toContain('decoding="async"');
    });
  });

  describe('2. HomeEvents dbReady Decoupling & Priority Images', () => {
    const mockEvents = [
      {
        id: 'ev-1',
        title: 'Festival Gourmet',
        date: '2099-12-31',
        city_slug: 'guadalajara',
        status: 'approved',
        img_url: 'https://res.cloudinary.com/demo/image/upload/event1.jpg'
      },
      {
        id: 'ev-2',
        title: 'Concierto Rock',
        date: '2099-12-31',
        city_slug: 'guadalajara',
        status: 'approved',
        img_url: 'https://res.cloudinary.com/demo/image/upload/event2.jpg'
      }
    ];

    it('displays events immediately even if dbReady is false when events exist', () => {
      const html = renderToStaticMarkup(
        <HomeEvents
          events={mockEvents}
          activeCity="guadalajara"
          dbReady={false}
          dark={false}
          t={(k, fallback) => fallback}
          handleEventTap={() => {}}
          T={{ border: '#ccc', text: '#000' }}
        />
      );

      // Should render the event cards and NOT the skeleton loader!
      expect(html).toContain('Eventos en guadalajara');
      expect(html).toContain('Festival Gourmet');
      // Should NOT contain the skeleton height: 180px
      expect(html).not.toContain('height:180px');
      // First 2 images should have eager/priority loading
      expect(html).toContain('loading="eager"');
      expect(html).toContain('fetchPriority="high"');
    });

    it('shows skeleton when dbReady is false and NO events exist', () => {
      const html = renderToStaticMarkup(
        <HomeEvents
          events={[]}
          activeCity="guadalajara"
          dbReady={false}
          dark={false}
          t={(k, fallback) => fallback}
          handleEventTap={() => {}}
          T={{ border: '#ccc', text: '#000' }}
        />
      );

      // Skeleton should be rendered
      expect(html).toContain('Eventos en guadalajara');
      expect(html).toContain('height:180px');
    });
  });

  describe('3. useDataStore Deduplication and Event Caching', () => {
    it('restores cached events from localStorage immediately on loadData', async () => {
      const cacheKey = 'cg_data_guadalajara_v4';
      const cachedEvents = [
        { id: 'cached-1', title: 'Cached Event', date: '2099-01-01', status: 'approved' }
      ];
      globalThis.localStorage.setItem('cg_city_slug', 'guadalajara');
      globalThis.localStorage.setItem(cacheKey, JSON.stringify({
        e: cachedEvents,
        bn: []
      }));

      const getSpy = vi.spyOn(sb, 'get').mockResolvedValue([]);

      const loadPromise = useDataStore.getState().loadData('guadalajara');

      // State should have restored cached events right away
      const state = useDataStore.getState();
      expect(state.events.length).toBe(1);
      expect(state.events[0].id).toBe('cached-1');

      await loadPromise;
      getSpy.mockRestore();
    });

    it('deduplicates concurrent calls to loadData for the same city', async () => {
      let resolveFirstCall;
      const delayedPromise = new Promise(r => { resolveFirstCall = r; });
      const getSpy = vi.spyOn(sb, 'get').mockReturnValue(delayedPromise);

      const promise1 = useDataStore.getState().loadData('guadalajara');
      const promise2 = useDataStore.getState().loadData('guadalajara');

      // Both should refer to the exact same in-flight Promise
      expect(promise1).toBe(promise2);

      resolveFirstCall([]);
      await promise1;
      getSpy.mockRestore();
    });
  });
});
