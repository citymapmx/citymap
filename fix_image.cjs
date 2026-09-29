const fs = require('fs');
let content = fs.readFileSync('src/components/ProgressiveImage.jsx', 'utf8');

const replacement = `import { useState } from 'react';
import { m } from "framer-motion";

const globalLoadedImages = new Set();

export default function ProgressiveImage({
  src,
  thumbSrc,
  alt,
  style = {},
  className = "",
  variants,
  transition,
  ...props
}) {
  const [isLoaded, setIsLoaded] = useState(() => globalLoadedImages.has(src));

  return (
    <m.div
      className={className}
      variants={variants}
      transition={transition}
      style={{
        position: 'relative',
        overflow: 'hidden',
        ...style
      }}
      {...props}
    >
      {/* Blurred Placeholder */}
      {!isLoaded && thumbSrc && (
        <img
          src={thumbSrc}
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: style.objectFit || 'cover',
            objectPosition: style.objectPosition || 'center',
            filter: 'blur(20px)',
            transform: 'scale(1.2)', // Prevent white edges from blur
            transition: 'opacity 0.6s ease-out',
            opacity: isLoaded ? 0 : 1,
          }}
        />
      )}
      
      {/* Actual High Res Image */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => {
          globalLoadedImages.add(src);
          setIsLoaded(true);
        }}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: style.objectFit || 'cover',
          objectPosition: style.objectPosition || 'center',
          opacity: isLoaded ? 1 : 0,
          transition: isLoaded ? 'none' : 'opacity 0.6s ease-out'
        }}
      />
    </m.div>
  );
}`;

content = content.replace(/import \{ useState \} from 'react';[\s\S]*?\n\}/, replacement);
fs.writeFileSync('src/components/ProgressiveImage.jsx', replacement);

console.log('Fixed ProgressiveImage!');
