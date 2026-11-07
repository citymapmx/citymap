export default function EventPosterFallback({ title, radius = 14 }) {
  return (
    <div aria-hidden="true" style={{
      width: '100%',
      height: '100%',
      boxSizing: 'border-box',
      background: '#111',
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
