import SlidingCategoryTrack from './SlidingCategoryTrack.jsx';

export default function SectionCategoryBar({ dark, selectedKey, children, stretch = false, style }) {
  return <SlidingCategoryTrack dark={dark} selectedKey={selectedKey} className="section-category-bar" data-stretch={stretch} style={{
    display: 'flex', alignItems: 'center', gap: 2, padding: 3, height: 40, minHeight: 40,
    boxSizing: 'border-box', borderRadius: 9999, background: dark ? '#2D2D31' : '#F1F5F9',
    overflowX: 'auto', WebkitOverflowScrolling: 'touch', ...style,
  }}>
    <style>{`
      .section-category-bar > button { display: inline-flex; align-items: center; justify-content: center; height: 34px; min-height: 34px; box-sizing: border-box; padding: 0 16px !important; font-family: inherit; font-size: 13px !important; font-weight: 700 !important; line-height: 20px; white-space: nowrap; flex-shrink: 0; }
      .section-category-bar[data-stretch="true"] > button { flex: 1; min-width: 0; padding: 0 8px !important; }
      .section-category-subtitle { min-height: 20px; }
      @media (max-width: 420px) { .section-category-subtitle { min-height: 40px; } }
    `}</style>
    {children}
  </SlidingCategoryTrack>;
}
