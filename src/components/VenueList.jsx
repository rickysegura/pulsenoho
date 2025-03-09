// src/components/VenueList.js
'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import StatusUpdateForm from './StatusUpdateForm';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Image from 'next/image';
import '../app/globals.css';

function VenueItem({ venue }) {
  const [busynessScore, setBusynessScore] = useState('Calculating...');
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [historicalScore, setHistoricalScore] = useState(null);
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) {
      setBusynessScore('Log in to see vibes');
      setFeedbackCount(0);
      setHistoricalScore(null);
      setComments([]);
      return;
    }

    const feedbacksRef = collection(db, `venues/${venue.id}/feedbacks`);
    const oneHourAgo = Timestamp.fromDate(new Date(Date.now() - 60 * 60 * 1000));
    const qRecent = query(feedbacksRef, where('timestamp', '>', oneHourAgo));

    const unsubscribeRecent = onSnapshot(
      qRecent,
      (snapshot) => {
        const ratings = snapshot.docs.map((doc) => doc.data().rating);
        setFeedbackCount(ratings.length);
        if (ratings.length > 0) {
          const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
          setBusynessScore(avg.toFixed(1));
        } else {
          setBusynessScore('No recent data');
        }
      },
      (error) => console.error('Recent feedback error:', error)
    );

    const qAll = query(feedbacksRef);
    const unsubscribeAll = onSnapshot(
      qAll,
      async (snapshot) => {
        const allRatings = snapshot.docs.map((doc) => doc.data().rating);
        const feedbackData = snapshot.docs.map((doc) => doc.data());

        const commentsWithUsernames = await Promise.all(
          feedbackData.map(async (feedback) => {
            const userRef = doc(db, 'users', feedback.userId);
            const userSnap = await getDoc(userRef);
            const userData = userSnap.exists() ? userSnap.data() : {};
            return {
              username: userData.username || feedback.userId.slice(0, 6),
              photoURL: userData.photoURL || '',
              comment: feedback.comment || 'No comment',
              timestamp: feedback.timestamp && feedback.timestamp.toDate()
                ? feedback.timestamp.toDate().toLocaleTimeString()
                : 'N/A',
            };
          })
        );

        if (allRatings.length > 0) {
          setHistoricalScore((allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(1));
        }
        setComments(commentsWithUsernames);
      },
      (error) => console.error('Historical feedback error:', error)
    );

    return () => {
      unsubscribeRecent();
      unsubscribeAll();
    };
  }, [venue.id, currentUser]); // Add currentUser to dependencies

  const getBusynessColor = (score) => {
    if (score === 'No recent data' || score === 'Log in to see vibes') return 'bg-gray-600';
    const numScore = parseFloat(score);
    if (numScore <= 2) return 'bg-green-600'; // Chill
    if (numScore <= 4) return 'bg-yellow-600'; // Moderate
    return 'bg-red-600'; // Packed
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 mb-4 transition-all hover:bg-white/10">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-medium text-white">
            {venue.name} <span className="text-gray-400 text-sm">({venue.type})</span>
          </h3>
          <p className="text-gray-300 mt-1">
            Now:{' '}
            <Badge
              variant="outline"
              className={`text-white border-white/20 ${getBusynessColor(busynessScore)}`}
            >
              {busynessScore}
            </Badge>{' '}
            <span className="text-sm">({feedbackCount} recent vibe{feedbackCount !== 1 ? 's' : ''})</span>
          </p>
          <p className="text-gray-400 text-sm mt-1">
            All-Time Avg: <span className="text-white">{historicalScore || 'N/A'}</span>
          </p>
        </div>
        {currentUser && <StatusUpdateForm venueId={venue.id} />}
      </div>
      <div className="mt-4">
        <Button
          variant="ghost"
          className="text-gray-300 hover:text-white text-sm p-0 flex items-center gap-1"
          onClick={() => setShowComments(!showComments)}
        >
          <span>Vibe Checks ({comments.length})</span>
          {showComments ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
        {showComments && (
          <div className="mt-2 space-y-3">
            {comments.length > 0 ? (
              comments.map((c, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-2 bg-gray-800/50 rounded-lg border border-white/10"
                >
                  {c.photoURL && (
                    <Image
                      src={c.photoURL}
                      alt={`${c.username}'s avatar`}
                      width={24}
                      height={24}
                      className="rounded-full border border-white/20"
                    />
                  )}
                  <div className="flex-1">
                    <p className="text-gray-300 text-sm">
                      <span className="font-semibold text-white">{c.username}</span>{' '}
                      <span className="text-gray-400">at {c.timestamp}</span>
                    </p>
                    <p className="text-white text-sm break-words">{c.comment}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-sm">No vibe checks yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function VenueList({ onVenueCountChange }) {
  const { currentUser } = useAuth();
  const [venues, setVenues] = useState([]);

  useEffect(() => {
    if (!currentUser) {
      setVenues([]);
      if (onVenueCountChange) onVenueCountChange(0);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'venues'),
      (snapshot) => {
        const venueData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setVenues(venueData);
        if (onVenueCountChange) onVenueCountChange(venueData.length);
      },
      (error) => console.error('Venue list error:', error)
    );

    return () => unsubscribe();
  }, [currentUser, onVenueCountChange]); // Add currentUser to dependencies

  return (
    <Card className="bg-transparent border-none">
      <CardContent className="p-0 space-y-4">
        {venues.length === 0 ? (
          <p className="text-gray-400">
            {currentUser ? 'No venues yet—check back soon!' : 'Log in to see venues.'}
          </p>
        ) : (
          venues.map((venue) => <VenueItem key={venue.id} venue={venue} />)
        )}
      </CardContent>
    </Card>
  );
}