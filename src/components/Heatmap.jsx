// src/components/Heatmap.js - Simplified
'use client';

import { useState, useEffect } from 'react';
import { GoogleMap, HeatmapLayer, Marker } from '@react-google-maps/api';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

const mapContainerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '8px',
};

const center = {
  lat: 34.1722, // North Hollywood center
  lng: -118.3789,
};

const mapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d4d4d4' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
];

export default function Heatmap({ isLoaded }) {
  const { currentUser } = useAuth();
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !currentUser) {
      setVenues([]);
      setLoading(false);
      return;
    }

    // Simple one-time fetch of venues without feedback
    const fetchVenues = async () => {
      try {
        const venuesRef = collection(db, 'venues');
        const snapshot = await getDocs(venuesRef);
        
        const venueData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          weight: 1 // Default weight for all venues
        }));
        
        setVenues(venueData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching venues:', error);
        setLoading(false);
      }
    };

    fetchVenues();
  }, [isLoaded, currentUser]);

  if (!isLoaded) {
    return <p className="text-gray-400 text-center">Loading map...</p>;
  }

  if (loading) {
    return <p className="text-gray-400 text-center">Loading venues...</p>;
  }

  // Create heatmap data points from venues
  const heatmapData = venues.map(venue => ({
    location: new google.maps.LatLng(venue.lat, venue.lng),
    weight: venue.weight || 1
  }));

  return (
    <div className="relative bg-white/10 backdrop-blur-lg rounded-lg">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={13}
        options={{
          styles: mapStyles,
          disableDefaultUI: true,
          zoomControl: true,
        }}
      >
        <HeatmapLayer
          data={heatmapData}
          options={{
            radius: 30,
            opacity: 0.7,
            gradient: [
              'rgba(0, 255, 255, 0)',
              'rgba(0, 255, 255, 0.3)',
              'rgba(0, 191, 255, 0.5)',
              'rgba(0, 127, 255, 0.7)',
              'rgba(0, 63, 255, 0.9)',
              'rgba(255, 0, 255, 1)',
            ],
          }}
        />
        {venues.map((venue) => (
          <Marker
            key={venue.id}
            position={{ lat: venue.lat, lng: venue.lng }}
            label={{
              text: venue.name || 'Unnamed Venue',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 'bold',
              className: 'heatmap-label',
            }}
          />
        ))}
      </GoogleMap>
    </div>
  );
}