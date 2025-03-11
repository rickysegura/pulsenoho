'use client';

import { useState, useEffect } from 'react';
import { collection, doc, getDoc, getDocs, onSnapshot, addDoc, serverTimestamp, setDoc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ChevronDown, ChevronUp, Lock, MapPin, Users } from 'lucide-react';

/**
 * Unified Venue Management Component
 * Combines functionality from VenueList, VenueItem, and Venue components
 */
export default function VenueManager({ onVenueCountChange }) {
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

  // This function is now inside a component so it has access to currentUser via context
  const handleVibeSubmit = async (rating, comment, venueId) => {
    if (!venueId || !currentUser) return false;
    
    try {
      // Add feedback document
      const feedbackData = {
        userId: currentUser.uid,
        rating: Number(rating),
        comment: comment || '',
        timestamp: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, `venues/${venueId}/feedbacks`), feedbackData);
      
      // Update user points
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, {
        points: increment(1)
      }, { merge: true });
      
      toast.success('Vibe posted! +1 point');
      return true;
    } catch (error) {
      console.error('Error submitting vibe:', error);
      toast.error(`Failed to post vibe: ${error.message}`);
      return false;
    }
  };

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
            <VenueItem 
              key={venue.id} 
              venue={venue} 
              handleVibeSubmit={handleVibeSubmit} 
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

/**
 * VenueItem component - Displays an individual venue with status and vibes
 */
function VenueItem({ venue, handleVibeSubmit }) {
  const [showVibes, setShowVibes] = useState(false);
  const [vibes, setVibes] = useState([]);
  const [busynessScore, setBusynessScore] = useState('Loading...');
  const [vibeCount, setVibeCount] = useState(0);
  const { currentUser } = useAuth();
  const [lastVibe, setLastVibe] = useState(null);

  useEffect(() => {
    if (!venue?.id || !currentUser) return;

    // Listen for venue feedback
    const feedbacksRef = collection(db, `venues/${venue.id}/feedbacks`);
    const unsubscribe = onSnapshot(
      feedbacksRef,
      async (snapshot) => {
        try {
          // Get basic feedback data
          const feedbackData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          setVibeCount(feedbackData.length);
          
          // Calculate average score
          if (feedbackData.length > 0) {
            const ratings = feedbackData.map(item => item.rating || 0);
            const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
            setBusynessScore(avg.toFixed(1));
          } else {
            setBusynessScore('No data');
          }
          
          // Only load user data if vibes are being shown
          if (showVibes || lastVibe) {
            // Fetch user info for each feedback
            const vibesWithUserInfo = await Promise.all(
              feedbackData
                .sort((a, b) => {
                  if (!a.timestamp || !b.timestamp) return 0;
                  return b.timestamp.seconds - a.timestamp.seconds;
                })
                .slice(0, 5) // Show only latest 5 vibes
                .map(async (feedback) => {
                  try {
                    if (!feedback.userId) return { ...feedback, username: 'Anonymous' };
                    
                    // If this is the current user and we just added this vibe,
                    // use the cached data instead of fetching again
                    if (lastVibe && feedback.userId === currentUser.uid && 
                        feedback.comment === lastVibe.comment &&
                        feedback.rating === lastVibe.rating) {
                      return lastVibe;
                    }
                    
                    const userRef = doc(db, 'users', feedback.userId);
                    const userSnap = await getDoc(userRef);
                    const userData = userSnap.exists() ? userSnap.data() : {};
                    
                    return {
                      ...feedback,
                      username: userData.username || feedback.userId.slice(0, 6),
                      photoURL: userData.photoURL || '',
                      time: feedback.timestamp?.toDate ? 
                        feedback.timestamp.toDate().toLocaleTimeString() : 'Unknown'
                    };
                  } catch (err) {
                    console.error("Error fetching user data:", err);
                    return { ...feedback, username: 'User', time: 'Unknown' };
                  }
                })
            );
            
            setVibes(vibesWithUserInfo);
            
            // Clear last vibe flag once it's in the list
            if (lastVibe) {
              setLastVibe(null);
            }
          }
        } catch (error) {
          console.error("Error processing venue vibes:", error);
          setBusynessScore('Error');
        }
      }
    );

    return () => unsubscribe();
  }, [venue?.id, currentUser, showVibes, lastVibe]);

  const getVibeColor = (score) => {
    if (score === 'No data' || score === 'Loading...' || score === 'Error') 
      return 'bg-gray-600';
      
    const numScore = parseFloat(score);
    if (numScore <= 2) return 'bg-green-600'; // Quiet
    if (numScore <= 4) return 'bg-yellow-600'; // Moderate
    return 'bg-red-600'; // Busy
  };

  // Wrapper function for vibe submission
  const onSubmitVibe = async (rating, comment) => {
    return handleVibeSubmit(rating, comment, venue.id);
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 mb-4 transition-all hover:bg-white/10">
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
          onSubmit={onSubmitVibe}
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
          <span>Recent Vibes {vibeCount > 0 ? `(${Math.min(vibeCount, 5)})` : ''}</span>
          {showVibes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
        
        {showVibes && (
          <div className="mt-2 space-y-2 max-h-60 overflow-y-auto p-1 vibe-checks">
            {vibes.length > 0 ? (
              vibes.map((vibe) => (
                <div
                  key={vibe.id}
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
                        <Badge className={`${getVibeColor(vibe.rating?.toString() || '0')} text-white text-xs`}>
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

/**
 * Status Update Form - For submitting ratings and comments
 */
function StatusUpdateForm({ venueId, onSubmit }) {
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(3);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { currentUser } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    
    setSubmitting(true);
    try {
      const success = await onSubmit(rating, comment);
      if (success) {
        setComment('');
        setShowForm(false);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentUser) {
    return (
      <Button disabled className="opacity-50 cursor-not-allowed">
        <Lock className="h-3.5 w-3.5 mr-1" />
        Add Vibe
      </Button>
    );
  }

  return (
    <div>
      <Button 
        onClick={() => setShowForm(!showForm)}
        className={showForm ? "bg-gray-700 hover:bg-gray-600" : ""}
      >
        {showForm ? 'Cancel' : 'Add Vibe'}
      </Button>
      
      {showForm && (
        <div className="mt-3 p-3 rounded-lg bg-gray-800/70 border border-white/10">
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                How busy is it? (1-5)
              </label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(value => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      rating >= value 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {value}
                  </button>
                ))}
                <span className="ml-2 text-sm text-gray-400">
                  {rating === 1 ? 'Empty' : 
                   rating === 2 ? 'Quiet' : 
                   rating === 3 ? 'Moderate' : 
                   rating === 4 ? 'Busy' : 'Packed'}
                </span>
              </div>
            </div>
            
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Comment (optional)
              </label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                className="w-full p-2 rounded bg-gray-900/50 border border-gray-700 text-white text-sm"
                placeholder="Any notes about the vibe?"
                rows={2}
              />
            </div>
            
            <Button 
              type="submit" 
              disabled={submitting}
              className="w-full"
            >
              {submitting ? 'Submitting...' : 'Post Update'}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

/**
 * VenuePreviewCard - For logged-out users
 */
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

/**
 * LoginCTA - Call to action for non-logged in users
 */
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