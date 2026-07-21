import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

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
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <motion.div
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
      
      {/* Actual High Res Image */}
      <motion.img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 1 : 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: style.objectFit || 'cover',
          objectPosition: style.objectPosition || 'center',
        }}
      />
    </motion.div>
  );
}
