// src/components/VenueItem.jsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { collection, doc, getDoc, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import StatusUpdateForm from './StatusUpdateForm';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function VenueItem({ venue }) {
  const [showVibes, setShowVibes] = useState(false);
  const { currentUser } = useAuth();
  const [vibes, setVibes] = useState([]);
  const [busynessScore, setBusynessScore] = useState('Loading...');
  const [vibeCount, setVibeCount] = useState(0);
  
  // Get color based on busyness score
  const getVibeColor = (score) => {
    if (score === 'No data' || score === 'Loading...' || score === 'Error') 
      return 'bg-gray-600';
      
    const numScore = parseFloat(score);
    if (numScore <= 2) return 'bg-green-600'; // Quiet
    if (numScore <= 4) return 'bg-yellow-600'; // Moderate
    return 'bg-red-600'; // Busy
  };

  // Handle submitting a new vibe
  const handleVibeSubmit = async (rating, comment) => {
    // Implementation using your existing code patterns
    return true;
  };

  // Load venue data when component mounts
  useEffect(() => {
    if (!venue?.id || !currentUser) return;

    // Listen for venue feedback
    const feedbacksRef = collection(db, `venues/${venue.id}/feedbacks`);
    const unsubscribe = onSnapshot(
      feedbacksRef,
      (snapshot) => {
        // Get basic feedback counts
        const feedbackCount = snapshot.docs.length;
        setVibeCount(feedbackCount);
        
        // Calculate average score
        if (feedbackCount > 0) {
          const ratings = snapshot.docs.map(doc => doc.data().rating || 0);
          const avg = ratings.reduce((a, b) => a + b, 0) / feedbackCount;
          setBusynessScore(avg.toFixed(1));
        } else {
          setBusynessScore('No data');
        }
      },
      (error) => {
        console.error(`Error in feedback listener:`, error);
        setBusynessScore('Error');
      }
    );

    return () => unsubscribe();
  }, [venue?.id, currentUser]);

  // Load detailed vibes when dropdown is opened
  useEffect(() => {
    if (!showVibes || !venue?.id || !currentUser) return;

    const loadVibes = async () => {
      try {
        const q = query(
          collection(db, `venues/${venue.id}/feedbacks`),
          orderBy('timestamp', 'desc'),
          limit(5)
        );
        
        const unsubscribe = onSnapshot(q, async (snapshot) => {
          const vibesWithUser = await Promise.all(
            snapshot.docs.map(async (doc) => {
              const data = doc.data();
              let userData = {};
              
              // Get user data if available
              if (data.userId) {
                try {
                  const userSnap = await getDoc(doc(db, 'users', data.userId));
                  if (userSnap.exists()) userData = userSnap.data();
                } catch (err) {
                  console.error("Error fetching user data:", err);
                }
              }
              
              return {
                id: doc.id,
                ...data,
                username: userData.username || data.userId?.slice(0, 6) || 'Anonymous',
                photoURL: userData.photoURL || '',
                time: data.timestamp?.toDate().toLocaleTimeString() || 'Unknown'
              };
            })
          );
          
          setVibes(vibesWithUser);
        });
        
        return () => unsubscribe();
      } catch (error) {
        console.error("Error loading vibes:", error);
      }
    };
    
    loadVibes();
  }, [showVibes, venue?.id, currentUser]);

  return (
    <Card className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 mb-4 transition-all hover:bg-white/10">
      <CardContent className="p-4">
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
                    className="flex items-start gap-2 p-2 rounded-lg border bg-gray-800/50 border-white/10"
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
      </CardContent>
    </Card>
  );
}