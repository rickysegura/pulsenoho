// src/components/Heatmap.js
'use client';

import { useState, useEffect } from 'react';
import { GoogleMap, HeatmapLayer } from '@react-google-maps/api';
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

const mapContainerStyle = {
  width: '100%',
  height: '400px', // Fixed height, adjustable
  borderRadius: '8px', // Match glassmorphism rounding
};

const center = {
  lat: 34.1722, // North Hollywood center
  lng: -118.3789,
};

// Custom dark map style for nightlife vibe
const mapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] }, // Dark background
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d4d4d4' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
];

export default function Heatmap({ isLoaded }) {
  const [heatmapData, setHeatmapData] = useState([]);

  useEffect(() => {
    if (!isLoaded) return;

    const unsubscribeVenues = onSnapshot(collection(db, 'venues'), (snapshot) => {
      const venueData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        feedbackCount: 0,
      }));

      const unsubscribes = venueData.map(venue => {
        const feedbacksRef = collection(db, `venues/${venue.id}/feedbacks`);
        const oneHourAgo = Timestamp.fromDate(new Date(Date.now() - 60 * 60 * 1000));
        const q = query(feedbacksRef, where('timestamp', '>', oneHourAgo));

        return onSnapshot(q, (feedbackSnapshot) => {
          const feedbackCount = feedbackSnapshot.docs.length;
          const updatedHeatmapData = venueData.map(v => {
            if (v.id === venue.id) {
              v.feedbackCount = feedbackCount;
            }
            return {
              location: new google.maps.LatLng(v.lat, v.lng),
              weight: v.feedbackCount > 0 ? v.feedbackCount * 5 : 1, // Amplify weight
            };
          });
          setHeatmapData(updatedHeatmapData);
        }, (error) => {
          console.error(`Error fetching feedbacks for ${venue.id}:`, error);
        });
      });

      return () => {
        unsubscribeVenues();
        unsubscribes.forEach(unsub => unsub());
      };
    });
  }, [isLoaded]);

  if (!isLoaded) {
    return <p className="text-gray-400 text-center">Loading vibe heatmap...</p>;
  }

  return (
    <div className="relative bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-4">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={13}
        options={{
          styles: mapStyles, // Apply custom dark theme
          disableDefaultUI: true, // Remove default controls for cleaner look
          zoomControl: true, // Keep zoom for usability
        }}
      >
        <HeatmapLayer
          data={heatmapData}
          options={{
            radius: 30, // Larger radius for visibility
            opacity: 0.7,
            gradient: [
              'rgba(0, 255, 255, 0)', // Cyan gradient for vibe
              'rgba(0, 255, 255, 0.3)',
              'rgba(0, 191, 255, 0.5)',
              'rgba(0, 127, 255, 0.7)',
              'rgba(0, 63, 255, 0.9)',
              'rgba(255, 0, 255, 1)', // Purple peak
            ],
          }}
        />
      </GoogleMap>
      <div className="absolute top-2 right-2 bg-white/20 text-white text-xs px-2 py-1 rounded">
        Hotter = More Vibes
      </div>
    </div>
  );
}