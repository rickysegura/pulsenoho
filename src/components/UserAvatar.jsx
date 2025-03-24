// src/components/UserAvatar.jsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function UserAvatar({ 
  user, 
  size = 'md', 
  className = '', 
  onClick = null 
}) {
  const [error, setError] = useState(false);
  
  // Handle user being either a full user object or just the basics
  const username = user?.username || 'User';
  const photoURL = user?.photoURL || null;
  
  // Reset error state if photoURL changes
  useEffect(() => {
    setError(false);
  }, [photoURL]);
  
  // Size mappings
  const sizeMap = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-24 h-24 text-2xl'
  };
  
  const sizeClass = sizeMap[size] || sizeMap.md;
  
  // If there's a photoURL and no error loading it, show the image
  if (photoURL && !error) {
    return (
      <div 
        className={`relative ${sizeClass} rounded-full overflow-hidden ${className} ${onClick ? 'cursor-pointer' : ''}`}
        onClick={onClick}
      >
        <Image
          src={photoURL}
          alt={username}
          layout="fill"
          objectFit="cover"
          onError={() => setError(true)}
          sizes={`(max-width: 768px) 100vw, ${parseInt(sizeClass) * 4}px`}
        />
      </div>
    );
  }
  
  // Otherwise show a placeholder with the first letter of username
  return (
    <div 
      className={`${sizeClass} bg-indigo-800 rounded-full flex items-center justify-center ${className} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <span className="font-bold text-white">
        {username.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}