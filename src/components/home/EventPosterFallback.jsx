export default function EventPosterFallback({ title, radius = 14, dark = false }) {
  return (
    <div aria-hidden="true" style={{
      width: '100%',
      height: '100%',
      boxSizing: 'border-box',
      background: dark ? '#232326' : '#111',
      border: dark ? '1px solid #3F3F46' : 'none',
      borderRadius: radius,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      color: '#fff',
      fontSize: 18,
      fontWeight: 800,
      lineHeight: 1.35,
      textAlign: 'center',
      overflow: 'hidden',
      overflowWrap: 'anywhere',
      filter: 'drop-shadow(0 3px 4px rgba(0,0,0,.12))',
    }}>
      {title}
    </div>
  );
}
