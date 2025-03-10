// src/app/ClientLayout.js
'use client';

import { useState, useEffect } from 'react';
import { LoadScript } from '@react-google-maps/api';
import { createContext } from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import ToastProvider from '../components/ToastProvider';
import './globals.css';

export const MapContext = createContext({ isMapLoaded: false });

export default function ClientLayout({ children }) {
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  const handleMapLoad = () => {
    console.log('Google Maps API loaded globally');
    setIsMapLoaded(true);
  };

  return (
    <LoadScript
      googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
      libraries={['visualization']}
      onLoad={handleMapLoad}
    >
      <AuthProvider>
        <MapContext.Provider value={{ isMapLoaded }}>
          <ToastProvider />
          {children}
        </MapContext.Provider>
      </AuthProvider>
    </LoadScript>
  );
}