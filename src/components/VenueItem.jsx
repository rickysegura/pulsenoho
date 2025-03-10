// src/components/VenueList.js
'use client';

import { useState, useEffect } from 'react';
import { collection, doc, getDoc, getDocs, onSnapshot, addDoc, serverTimestamp, setDoc, increment, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import StatusUpdateForm from './StatusUpdateForm';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ChevronDown, ChevronUp, Lock, MapPin, Users } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import '../app/globals.css';

// VenueItem component with fixed key generation
function VenueItem({ venue }) {
  const [showVibes, setShowVibes] = useState(false);
  const [vibes, setVibes] = useState([]);
  const [busynessScore, setBusynessScore] = useState('Loading...');
  const [vibeCount, setVibeCount] = useState(0);
  const { currentUser } = useAuth();
  const [submittedVibe, setSubmittedVibe] = useState(null);
  const [processingVibe, setProcessingVibe] = useState(false);

  // Handle new vibe submission
  const handleVibeSubmit = async (rating, comment) => {
    if (!venue?.id || !currentUser || processingVibe) return false;
    
    setProcessingVibe(true);
    
    try {
      // Create vibe data
      const feedbackData = {
        userId: currentUser.uid,
        rating: Number(rating),
        comment: comment.trim() || '',
        timestamp: serverTimestamp()
      };
      
      // Add document to Firestore
      const docRef = await addDoc(collection(db, `venues/${venue.id}/feedbacks`), feedbackData);
      
      // Update user points
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, { points: increment(1) }, { merge: true });
      
      // Update local state for immediate UI feedback
      const newVibe = {
        id: docRef.id,
        uniqueId: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
        ...feedbackData,
        timestamp: { seconds: Date.now() / 1000 }, // Local timestamp
        username: currentUser.email?.split('@')[0] || 'You',
        time: new Date().toLocaleTimeString(),
        justAdded: true
      };
      
      // Show vibes if hidden
      if (!showVibes) setShowVibes(true);
      
      // Increment count immediately
      setVibeCount(prev => prev + 1);
      
      // Set as submitted so it shows up immediately
      setSubmittedVibe(newVibe);
      
      toast.success('Vibe posted! +1 point');
      return true;
    } catch (error) {
      console.error('Error submitting vibe:', error);
      toast.error(`Failed to post vibe: ${error.message}`);
      return false;
    } finally {
      setProcessingVibe(false);
    }
  };

  // Format timestamp for display
  const formatTime = (timestamp) => {
    if (!timestamp) return 'Unknown';
    if (timestamp.toDate) return timestamp.toDate().toLocaleTimeString();
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleTimeString();
    }
    return 'Unknown';
  };

  // Fetch vibes from Firestore
  useEffect(() => {
    if (!venue?.id || !currentUser) return;
    
    console.log(`Setting up feedback listener for venue ${venue.id}`);
    const feedbacksRef = collection(db, `venues/${venue.id}/feedbacks`);
    
    const unsubscribe = onSnapshot(
      feedbacksRef,
      snapshot => {
        // Update vibe count directly from snapshot
        setVibeCount(snapshot.docs.length);
        console.log(`Venue ${venue.id} has ${snapshot.docs.length} vibes`);
        
        // Only process details if vibes are shown
        if (showVibes) {
          // Extract all vibes from snapshot
          const firestoreVibes = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // Process vibes without user data first for speed
          processVibes(firestoreVibes);
        }
      },
      error => {
        console.error(`Error in feedback listener for venue ${venue.id}:`, error);
        setBusynessScore('Error');
      }
    );
    
    return () => unsubscribe();
  }, [venue?.id, currentUser]);
  
  // Process vibe data when visible
  useEffect(() => {
    if (!venue?.id || !currentUser || !showVibes) return;
    
    // Function to fetch vibe details
    const fetchVibeDetails = async () => {
      try {
        // Get raw vibes first
        const q = query(
          collection(db, `venues/${venue.id}/feedbacks`),
          orderBy('timestamp', 'desc'),
          limit(5)
        );
        
        const snapshot = await getDocs(q);
        const feedbackData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Process vibes
        processVibes(feedbackData);
      } catch (error) {
        console.error("Error fetching vibe details:", error);
      }
    };
    
    fetchVibeDetails();
  }, [venue?.id, currentUser, showVibes]);
  
  // Process vibes and add user data
  const processVibes = async (feedbackData) => {
    try {
      // Calculate busyness score
      if (feedbackData.length > 0) {
        const ratings = feedbackData.map(item => item.rating || 0);
        const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        setBusynessScore(avg.toFixed(1));
      } else {
        setBusynessScore('No data');
      }
      
      // Ensure unique IDs by creating Map with IDs as keys
      const uniqueMap = new Map();
      
      // Add all feedback to map by ID
      feedbackData.forEach(item => {
        uniqueMap.set(item.id, item);
      });
      
      // Convert back to array
      const uniqueFeedback = Array.from(uniqueMap.values());
      
      // Process vibes and add user data
      const vibesWithUserInfo = await Promise.all(
        uniqueFeedback
          .sort((a, b) => {
            if (!a.timestamp || !b.timestamp) return 0;
            const aTime = a.timestamp.seconds || 0;
            const bTime = b.timestamp.seconds || 0;
            return bTime - aTime; // Newest first
          })
          .slice(0, 5) // Only process 5 most recent
          .map(async (feedback, index) => {
            try {
              // Add a random ID component to prevent duplicates
              const randomId = Math.random().toString(36).substring(2, 8);
              
              if (!feedback.userId) return { 
                ...feedback, 
                uniqueId: `${feedback.id || 'unknown'}-${randomId}-${index}`,
                username: 'Anonymous',
                time: formatTime(feedback.timestamp)
              };
              
              const userRef = doc(db, 'users', feedback.userId);
              const userSnap = await getDoc(userRef);
              const userData = userSnap.exists() ? userSnap.data() : {};
              
              return {
                ...feedback,
                uniqueId: `${feedback.id || 'unknown'}-${randomId}-${index}`,
                username: userData.username || feedback.userId.slice(0, 6),
                photoURL: userData.photoURL || '',
                time: formatTime(feedback.timestamp)
              };
            } catch (err) {
              console.error("Error processing vibe:", err);
              return { 
                ...feedback, 
                uniqueId: `error-${Math.random().toString(36).substring(2, 10)}-${index}`,
                username: 'User', 
                time: formatTime(feedback.timestamp)
              };
            }
          })
      );
      
      // Create final list
      let finalVibes = [...vibesWithUserInfo];
      
      // Add submitted vibe if it's not in the list yet
      if (submittedVibe) {
        const exists = finalVibes.some(v => 
          v.userId === submittedVibe.userId && 
          v.comment === submittedVibe.comment &&
          v.rating === submittedVibe.rating
        );
        
        if (!exists) {
          finalVibes.unshift({
            ...submittedVibe,
            uniqueId: `submitted-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`
          });
        } else {
          // Found the vibe in real data, clear submitted
          setSubmittedVibe(null);
        }
      }
      
      setVibes(finalVibes);
    } catch (error) {
      console.error("Error processing vibes:", error);
    }
  };

  // Get color based on busyness
  const getVibeColor = (score) => {
    if (score === 'No data' || score === 'Loading...' || score === 'Error') 
      return 'bg-gray-600';
      
    const numScore = parseFloat(score);
    if (numScore <= 2) return 'bg-green-600'; // Quiet
    if (numScore <= 4) return 'bg-yellow-600'; // Moderate
    return 'bg-red-600'; // Busy
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 mb-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-medium text-white">
            {venue.name} <span className="text-gray-400 text-sm">({venue.type})</span>
          </h3>
          <p className="text-gray-300 mt-1">
            Busyness:{' '}
            <Badge
              variant="outline"
              className={`text-white border-white/20 ${getVibeColor(busynessScore)}`}
            >
              {busynessScore}
            </Badge>{' '}
            <span className="text-sm">({vibeCount} vibes)</span>
          </p>
        </div>
        <StatusUpdateForm 
          venueId={venue.id} 
          onSubmit={handleVibeSubmit}
          isSubmitting={processingVibe}
        />
      </div>
      
      {/* Vibes dropdown */}
      <div className="mt-3">
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-300 hover:text-white text-sm p-0 flex items-center gap-1"
          onClick={() => setShowVibes(!showVibes)}
        >
          <span>Recent Vibes {vibeCount > 0 ? `(${vibeCount})` : ''}</span>
          {showVibes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
        
        {showVibes && (
          <div className="mt-2 space-y-2 max-h-60 overflow-y-auto p-1 vibe-checks">
            {vibes.length > 0 ? (
              vibes.map((vibe) => (
                <div
                  key={vibe.uniqueId || `fallback-${Math.random()}`} // THIS IS THE CRITICAL FIX
                  className={`flex items-start gap-2 p-2 rounded-lg border ${
                    vibe.justAdded 
                      ? 'bg-green-900/30 border-green-500/30 animate-pulse' 
                      : 'bg-gray-800/50 border-white/10'
                  }`}
                >
                  {vibe.photoURL && (
                    <Image
                      src={vibe.photoURL}
                      alt={`${vibe.username}'s avatar`}
                      width={24}
                      height={24}
                      className="rounded-full border border-white/20"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-white text-xs">{vibe.username}</span>
                      <div className="flex items-center gap-2">
                        <Badge className={`${getVibeColor((vibe.rating || 0).toString())} text-white text-xs`}>
                          {vibe.rating || 0}/5
                        </Badge>
                        <span className="text-gray-400 text-xs">{vibe.time}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 break-words">
                      {vibe.comment || <em className="text-gray-500 text-xs">No comment</em>}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-sm text-center py-2">No vibes reported yet</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Login CTA component for logged-out users
function LoginCTA() {
  return (
    <div className="rounded-lg overflow-hidden">
      <div className="relative h-48 bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
        <div className="relative z-10 text-center p-6">
          <h3 className="text-2xl font-bold text-white mb-3">Check The Vibe</h3>
          <p className="text-white/80 mb-4">
            Sign in to see real-time busyness levels and share your own venue vibes
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login">
              <Button className="bg-white text-indigo-700 hover:bg-white/90">
                Log In
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-800/50 backdrop-blur-sm p-5">
        <h4 className="text-white font-medium mb-3">NoHo Live Features:</h4>
        <ul className="space-y-2">
          <li className="flex items-center text-gray-300">
            <MapPin className="h-4 w-4 mr-2 text-green-400" />
            <span>See which spots are busy right now</span>
          </li>
          <li className="flex items-center text-gray-300">
            <Users className="h-4 w-4 mr-2 text-blue-400" />
            <span>Get venue recommendations from the community</span>
          </li>
          <li className="flex items-center text-gray-300">
            <Lock className="h-4 w-4 mr-2 text-purple-400" />
            <span>Earn points and build your profile</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

// Preview card showing limited venue info
function VenuePreviewCard({ venue, index }) {
  return (
    <div 
      className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 mb-4 transition-all hover:bg-white/10"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-white">
            {venue.name} <span className="text-gray-400 text-sm">({venue.type})</span>
          </h3>
          <p className="text-gray-300 mt-1">
            <Badge variant="outline" className="bg-gray-600 text-white border-white/20">
              Sign in to see vibe
            </Badge>
          </p>
        </div>
        <Button
          className="bg-white/20 text-white hover:bg-white/30 opacity-50 cursor-not-allowed"
          disabled={true}
        >
          <Lock className="h-3.5 w-3.5 mr-1" />
          Add Vibe
        </Button>
      </div>
    </div>
  );
}

// Main VenueList component
export default function VenueList({ onVenueCountChange }) {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  // Mock data for logged-out users to avoid permissions errors
  const mockVenues = [
    { id: 'mock1', name: 'Republic of Pie', type: 'Coffee Shop' },
    { id: 'mock2', name: 'Federal Bar', type: 'Bar & Restaurant' },
    { id: 'mock3', name: 'Idle Hour', type: 'Bar' },
  ];

  useEffect(() => {
    let isMounted = true;
    
    const fetchVenues = async () => {
      try {
        // For logged-out users, use mock data
        if (!currentUser) {
          if (isMounted) {
            setVenues(mockVenues);
            setLoading(false);
            if (typeof onVenueCountChange === 'function') {
              onVenueCountChange(mockVenues.length);
            }
          }
          return;
        }
        
        // For logged-in users, fetch real data
        const venuesRef = collection(db, 'venues');
        const snapshot = await getDocs(venuesRef);
        
        if (isMounted) {
          const venueData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          setVenues(venueData);
          setLoading(false);
          
          if (typeof onVenueCountChange === 'function') {
            onVenueCountChange(venueData.length);
          }
        }
      } catch (error) {
        console.error('Venue list error:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    fetchVenues();
    
    return () => {
      isMounted = false;
    };
  }, [currentUser, onVenueCountChange]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white/5 rounded-lg h-24 animate-pulse"></div>
        ))}
      </div>
    );
  }

  if (!currentUser) {
    // Logged-out experience with mock data
    return (
      <Card className="bg-transparent border-none">
        <CardContent className="p-0 space-y-6">
          <LoginCTA />
          
          <div className="space-y-1">
            <h3 className="text-lg font-medium text-white/80">Venue Previews</h3>
            <p className="text-sm text-gray-400 mb-4">
              Here's a sample of venues in North Hollywood
            </p>
          </div>
          
          {mockVenues.map((venue, index) => (
            <VenuePreviewCard key={venue.id} venue={venue} index={index} />
          ))}
          
          <div className="text-center py-2 border-t border-white/10">
            <p className="text-sm text-gray-400">
              More venues available after login
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Regular logged-in experience with VenueItem
  return (
    <Card className="bg-transparent border-none">
      <CardContent className="p-0 space-y-4">
        {venues.length === 0 ? (
          <p className="text-gray-400">No venues found. Check back soon!</p>
        ) : (
          venues.map((venue) => (
            <VenueItem key={venue.id} venue={venue} />
          ))
        )}
      </CardContent>
    </Card>
  );
}