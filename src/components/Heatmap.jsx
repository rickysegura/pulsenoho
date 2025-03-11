// src/components/Heatmap.jsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { GoogleMap, HeatmapLayer, Marker, InfoWindow } from '@react-google-maps/api';
import { collection, getDocs, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Users, Info, Clock } from 'lucide-react';
import Link from 'next/link';

const mapContainerStyle = {
  width: '100%',
  height: '500px', // Increased height for better visibility
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

// Mock data for non-authenticated users
const mockVenues = [
  { 
    id: 'mock1', 
    name: 'Republic of Pie', 
    type: 'Coffee Shop',
    lat: 34.1672,
    lng: -118.3769,
    busynessScore: 0,
    weight: 0.5,
    vibeCount: 0
  },
  { 
    id: 'mock2', 
    name: 'Federal Bar', 
    type: 'Bar & Restaurant',
    lat: 34.1722,
    lng: -118.3739,
    busynessScore: 0,
    weight: 0.5,
    vibeCount: 0
  },
  { 
    id: 'mock3', 
    name: 'Idle Hour', 
    type: 'Bar',
    lat: 34.1749,
    lng: -118.3789,
    busynessScore: 0,
    weight: 0.5,
    vibeCount: 0
  },
  {
    id: 'mock4',
    name: 'NoHo Arts District',
    type: 'Entertainment',
    lat: 34.1680,
    lng: -118.3765,
    busynessScore: 0,
    weight: 0.5,
    vibeCount: 0
  },
  {
    id: 'mock5',
    name: 'The Palm Coffee Bar',
    type: 'Coffee Shop',
    lat: 34.1717,
    lng: -118.3754,
    busynessScore: 0,
    weight: 0.5,
    vibeCount: 0
  }
];

export default function Heatmap({ isLoaded }) {
  const { currentUser } = useAuth();
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [recentVibes, setRecentVibes] = useState({});
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  
  // Reset selected venue when auth state changes
  useEffect(() => {
    // Clear any selected venue on auth state change
    setSelectedVenue(null);
    setRecentVibes({});
  }, [currentUser]);

  // Fetch venues with real-time busyness data
  useEffect(() => {
    if (!isLoaded) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    const unsubscribers = [];
    
    const fetchVenues = async () => {
      try {
        // For non-logged in users, use mock data
        if (!currentUser) {
          if (isMounted) {
            setVenues(mockVenues);
            setLoading(false);
          }
          return;
        }
        
        // For logged-in users, fetch real data
        const venuesRef = collection(db, 'venues');
        const snapshot = await getDocs(venuesRef);
        
        if (!isMounted) return;
        
        const venueData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          busynessScore: 0,
          weight: 0.5,
          vibeCount: 0
        }));

        setVenues(venueData);
        
        // For each venue, set up a real-time listener for feedback
        venueData.forEach(venue => {
          try {
            const feedbacksRef = collection(db, `venues/${venue.id}/feedbacks`);
            const unsubscribe = onSnapshot(
              feedbacksRef,
              (snapshot) => {
                try {
                  if (!isMounted) return;
                  
                  // Get basic feedback data
                  const feedbackData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                  }));
                  
                  // Calculate average score
                  let avgScore = 0;
                  if (feedbackData.length > 0) {
                    const ratings = feedbackData.map(item => item.rating || 0);
                    avgScore = ratings.reduce((a, b) => a + b, 0) / ratings.length;
                  }
                  
                  // Update venue with busyness data
                  setVenues(currentVenues => 
                    currentVenues.map(v => {
                      if (v.id === venue.id) {
                        return {
                          ...v,
                          busynessScore: avgScore,
                          weight: avgScore > 0 ? avgScore : 0.5,
                          vibeCount: feedbackData.length
                        };
                      }
                      return v;
                    })
                  );
                } catch (error) {
                  console.error("Error processing venue vibes:", error);
                }
              },
              (error) => {
                // Handle error in the listener
                console.error(`Error in venue feedback listener: ${error.message}`);
              }
            );
            
            // Store the unsubscribe function for cleanup
            if (typeof unsubscribe === 'function') {
              unsubscribers.push(unsubscribe);
            }
          } catch (error) {
            console.error(`Error setting up listener for venue ${venue.id}:`, error);
          }
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching venues:', error);
        // On error, fall back to mock data
        if (isMounted) {
          setVenues(mockVenues);
          setLoading(false);
        }
      }
    };

    fetchVenues();
    
    return () => {
      isMounted = false;
      // Safely clean up all listeners
      unsubscribers.forEach(unsub => {
        try {
          if (typeof unsub === 'function') unsub();
        } catch (e) {
          console.error('Error unsubscribing:', e);
        }
      });
    };
  }, [isLoaded, currentUser]);

  // Fetch recent vibes for a venue when selected
  useEffect(() => {
    // If no venue is selected or user isn't logged in, don't attempt to fetch data
    if (!selectedVenue || !currentUser) return;
    
    // Skip Firestore calls for mock venues
    if (selectedVenue.id.startsWith('mock')) return;
    
    let unsubscribe = null;
    
    const fetchRecentVibes = async () => {
      try {
        const feedbacksRef = collection(db, `venues/${selectedVenue.id}/feedbacks`);
        const recentQuery = query(feedbacksRef, orderBy('timestamp', 'desc'), limit(3));
        
        unsubscribe = onSnapshot(recentQuery, async (snapshot) => {
          const vibeData = await Promise.all(
            snapshot.docs.map(async (doc) => {
              const data = doc.data();
              
              // Format the timestamp
              let formattedTime = 'Unknown time';
              if (data.timestamp?.toDate) {
                const date = data.timestamp.toDate();
                formattedTime = date.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true 
                });
              }
              
              return {
                id: doc.id,
                ...data,
                formattedTime
              };
            })
          );
          
          setRecentVibes(prev => ({
            ...prev,
            [selectedVenue.id]: vibeData
          }));
        }, 
        (error) => {
          console.error(`Error in recent vibes listener: ${error.message}`);
          // Clear any existing data to prevent stale data display
          setRecentVibes(prev => ({...prev, [selectedVenue.id]: []}));
        });
      } catch (error) {
        console.error('Error fetching vibes:', error);
      }
    };
    
    fetchRecentVibes();
    
    // Clean up function
    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        try {
          unsubscribe();
        } catch (e) {
          console.error('Error unsubscribing from vibes listener:', e);
        }
      }
    };
  }, [selectedVenue, currentUser]);

  // Get color for busyness level
  const getVibeColor = (score) => {
    if (!score || score === 0) return 'bg-gray-600';
    
    const numScore = parseFloat(score);
    if (numScore <= 2) return 'bg-green-600'; // Quiet
    if (numScore <= 4) return 'bg-yellow-600'; // Moderate
    return 'bg-red-600'; // Busy
  };

  // Get label for busyness level
  const getBusynessLabel = (score) => {
    if (!score || score === 0) return 'No Data';
    
    const numScore = parseFloat(score);
    if (numScore <= 2) return 'Quiet';
    if (numScore <= 4) return 'Moderate';
    return 'Busy';
  };

  // Create heatmap data points from venues with weights based on busyness
  const heatmapData = useMemo(() => {
    if (!venues.length) return [];
    
    return venues.map(venue => {
      // Make sure we have valid lat/lng values
      if (typeof venue.lat !== 'number' || typeof venue.lng !== 'number') {
        console.warn(`Invalid coordinates for venue: ${venue.name}`);
        return null;
      }
      
      return {
        location: new google.maps.LatLng(venue.lat, venue.lng),
        weight: venue.busynessScore > 0 ? venue.busynessScore : 0.5
      };
    }).filter(Boolean); // Remove any null values
  }, [venues]);

  // Custom marker icon based on busyness
  const getMarkerIcon = (busynessScore) => {
    if (!busynessScore || busynessScore === 0) {
      return {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: '#888888',
        fillOpacity: 0.6,
        strokeWeight: 0,
        scale: 8
      };
    }
    
    let color;
    if (busynessScore <= 2) color = '#4ade80'; // green
    else if (busynessScore <= 4) color = '#f59e0b'; // yellow/amber
    else color = '#ef4444'; // red
    
    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: color,
      fillOpacity: 0.7,
      strokeWeight: 1,
      strokeColor: 'white',
      scale: 8 + (busynessScore * 1) // Size increases with busyness
    };
  };

  if (!isLoaded) {
    return <p className="text-gray-400 text-center">Loading map...</p>;
  }

  if (loading) {
    return <p className="text-gray-400 text-center">Loading venues...</p>;
  }

  return (
    <div className="relative bg-white/5 backdrop-blur-lg rounded-lg p-1">
      {!currentUser && (
        <div className="absolute top-4 left-4 z-10 max-w-xs bg-black/80 p-3 rounded-lg border border-white/10">
          <p className="text-white text-sm mb-2">
            Sign in to see real-time venue busyness data
          </p>
          <div className="flex gap-2">
            <Link href="/login">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">Log In</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" variant="outline" className="text-white">Sign Up</Button>
            </Link>
          </div>
        </div>
      )}
      
      {isInfoExpanded && (
        <div className="absolute bottom-4 right-4 z-10 bg-black/80 p-3 rounded-lg border border-white/10 max-w-xs">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-white font-medium">Map Legend</h3>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-6 w-6 p-0" 
              onClick={() => setIsInfoExpanded(false)}
            >
              ×
            </Button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-600"></div>
              <span className="text-white text-xs">Quiet (1-2)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-600"></div>
              <span className="text-white text-xs">Moderate (3-4)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-600"></div>
              <span className="text-white text-xs">Busy (5)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-600"></div>
              <span className="text-white text-xs">No Data</span>
            </div>
          </div>
        </div>
      )}
      
      {!isInfoExpanded && (
        <Button 
          size="sm" 
          variant="ghost" 
          className="absolute bottom-4 right-4 z-10 bg-black/50 text-white"
          onClick={() => setIsInfoExpanded(true)}
        >
          <Info className="h-4 w-4 mr-1" />
          Legend
        </Button>
      )}

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={14}
        options={{
          styles: mapStyles,
          disableDefaultUI: true,
          zoomControl: true,
          maxZoom: 18,
          minZoom: 12
        }}
        onClick={() => setSelectedVenue(null)}
      >
        {heatmapData.length > 0 && (
          <HeatmapLayer
            data={heatmapData}
            options={{
              radius: 35,
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
        )}
        
        {venues.map((venue) => (
          <Marker
            key={venue.id}
            position={{ lat: venue.lat, lng: venue.lng }}
            icon={getMarkerIcon(venue.busynessScore)}
            onClick={() => setSelectedVenue(venue)}
          />
        ))}
        
        {selectedVenue && (
          <InfoWindow
            position={{ lat: selectedVenue.lat, lng: selectedVenue.lng }}
            onCloseClick={() => setSelectedVenue(null)}
          >
            <div className="p-1 min-w-40 max-w-64">
              <h3 className="font-bold text-gray-900">{selectedVenue.name}</h3>
              <p className="text-sm text-gray-600">{selectedVenue.type}</p>
              
              <div className="mt-2 flex items-center gap-2">
                <Badge
                  className={`text-white text-xs ${getVibeColor(selectedVenue.busynessScore)}`}
                >
                  {getBusynessLabel(selectedVenue.busynessScore)}
                </Badge>
                <span className="text-sm text-gray-600">
                  {selectedVenue.busynessScore > 0 
                    ? selectedVenue.busynessScore.toFixed(1) + '/5' 
                    : 'No rating'}
                </span>
                <span className="text-xs text-gray-500">
                  ({selectedVenue.vibeCount || 0} vibes)
                </span>
              </div>
              
              {currentUser && recentVibes[selectedVenue.id]?.length > 0 && !selectedVenue.id.startsWith('mock') && (
                <div className="mt-2 border-t border-gray-200 pt-2">
                  <p className="text-xs font-medium text-gray-700 flex items-center">
                    <Users className="h-3 w-3 mr-1" />
                    Recent Updates:
                  </p>
                  <div className="space-y-2 mt-1">
                    {recentVibes[selectedVenue.id].map(vibe => (
                      <div key={vibe.id} className="text-xs border-l-2 pl-2 border-indigo-300">
                        <div className="flex justify-between">
                          <Badge
                            className={`text-white text-xs ${getVibeColor(vibe.rating)}`}
                          >
                            {vibe.rating}/5
                          </Badge>
                          <span className="text-gray-500 flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {vibe.formattedTime}
                          </span>
                        </div>
                        {vibe.comment && (
                          <p className="mt-1 text-gray-700">{vibe.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {currentUser ? (
                <Link href="/venues" className="block">
                  <Button 
                    size="sm" 
                    className="w-full mt-2 text-xs"
                  >
                    View Full Details
                  </Button>
                </Link>
              ) : (
                <Link href="/login" className="block">
                  <Button 
                    size="sm" 
                    className="w-full mt-2 text-xs"
                  >
                    Log In to See Details
                  </Button>
                </Link>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}