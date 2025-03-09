// src/components/Heatmap.js
'use client';

import { useState, useEffect } from 'react';
import { GoogleMap, HeatmapLayer, Marker } from '@react-google-maps/api';
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
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
  const [heatmapData, setHeatmapData] = useState([]);

  useEffect(() => {
    if (!isLoaded || !currentUser) {
      setHeatmapData([]);
      return;
    }

    let venueData = [];
    const feedbackUnsubscribers = []; // Store feedback listener unsubscribers

    const unsubscribeVenues = onSnapshot(
      collection(db, 'venues'),
      (snapshot) => {
        venueData = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || 'Unnamed Venue',
            lat: data.lat,
            lng: data.lng,
            feedbackCount: 0,
          };
        });

        // Clear previous feedback listeners
        feedbackUnsubscribers.forEach((unsub) => unsub());
        feedbackUnsubscribers.length = 0;

        // Set initial heatmap data
        setHeatmapData(
          venueData.map((v) => ({
            location: new google.maps.LatLng(v.lat, v.lng),
            weight: 1,
            name: v.name,
          }))
        );

        // Update feedback counts
        venueData.forEach((venue) => {
          const feedbacksRef = collection(db, `venues/${venue.id}/feedbacks`);
          const oneHourAgo = Timestamp.fromDate(new Date(Date.now() - 60 * 60 * 1000));
          const q = query(feedbacksRef, where('timestamp', '>', oneHourAgo));

          const unsubscribeFeedback = onSnapshot(
            q,
            (feedbackSnapshot) => {
              const feedbackCount = feedbackSnapshot.docs.length;
              venue.feedbackCount = feedbackCount;
              setHeatmapData(
                venueData.map((v) => ({
                  location: new google.maps.LatLng(v.lat, v.lng),
                  weight: v.feedbackCount > 0 ? v.feedbackCount * 5 : 1,
                  name: v.name,
                }))
              );
            },
            (error) => {
              console.error(`Error fetching feedbacks for ${venue.id}:`, error);
            }
          );

          feedbackUnsubscribers.push(unsubscribeFeedback);
        });
      },
      (error) => {
        console.error('Error fetching venues:', error);
      }
    );

    return () => {
      unsubscribeVenues();
      feedbackUnsubscribers.forEach((unsub) => unsub());
    };
  }, [isLoaded, currentUser]); // Add currentUser to dependencies

  if (!isLoaded) {
    return <p className="text-gray-400 text-center">Loading vibe heatmap...</p>;
  }

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
        {heatmapData.map((point, index) => (
          <Marker
            key={index}
            position={{ lat: point.location.lat(), lng: point.location.lng() }}
            label={{
              text: point.name || 'Unknown',
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