// src/components/VenueList.js
'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import StatusUpdateForm from './StatusUpdateForm';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

function VenueItem({ venue }) {
  const [busynessScore, setBusynessScore] = useState('Calculating...');
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [historicalScore, setHistoricalScore] = useState(null);
  const [comments, setComments] = useState([]);
  const { currentUser } = useAuth();

  useEffect(() => {
    const feedbacksRef = collection(db, `venues/${venue.id}/feedbacks`);
    const oneHourAgo = Timestamp.fromDate(new Date(Date.now() - 60 * 60 * 1000));
    const qRecent = query(feedbacksRef, where('timestamp', '>', oneHourAgo));

    const unsubscribeRecent = onSnapshot(qRecent, (snapshot) => {
      const ratings = snapshot.docs.map(doc => doc.data().rating);
      setFeedbackCount(ratings.length);
      if (ratings.length > 0) {
        setBusynessScore((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1));
      } else {
        setBusynessScore('No recent data (last hour)');
      }
    }, (error) => console.error('Recent feedback error:', error));

    const qAll = query(feedbacksRef);
    const unsubscribeAll = onSnapshot(qAll, (snapshot) => {
      const allRatings = snapshot.docs.map(doc => doc.data().rating);
      const allComments = snapshot.docs.map(doc => {
        const timestamp = doc.data().timestamp;
        return {
          userId: doc.data().userId,
          comment: doc.data().comment || 'No comment',
          timestamp: timestamp && timestamp.toDate ? timestamp.toDate().toLocaleTimeString() : 'N/A',
        };
      });
      if (allRatings.length > 0) {
        setHistoricalScore((allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(1));
      }
      setComments(allComments);
    }, (error) => console.error('Historical feedback error:', error));

    return () => {
      unsubscribeRecent();
      unsubscribeAll();
    };
  }, [venue.id]);

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 mb-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-medium text-white">
            {venue.name} ({venue.type})
          </h3>
          <p className="text-gray-300">
            Now:{' '}
            <Badge variant="outline" className="text-white border-white/20">
              {busynessScore}
            </Badge>{' '}
            ({feedbackCount} recent vibe{feedbackCount !== 1 ? 's' : ''})
          </p>
          <p className="text-gray-400 text-sm">
            All-Time Avg: {historicalScore || 'N/A'}
          </p>
        </div>
        {currentUser && <StatusUpdateForm venueId={venue.id} />}
      </div>
      <div className="mt-4">
        <h4 className="text-sm font-semibold text-gray-300">Vibe Checks</h4>
        {comments.length > 0 ? (
          <ul className="space-y-2 mt-2">
            {comments.map((c, index) => (
              <li key={index} className="text-gray-400 text-sm">
                <span className="text-gray-300">User {c.userId.slice(0, 6)}...</span> at {c.timestamp}: {c.comment}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400 text-sm mt-2">No vibe checks yet.</p>
        )}
      </div>
    </div>
  );
}

export default function VenueList({ sortMode }) {
  const [venues, setVenues] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'venues'), (snapshot) => {
      let venueData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (sortMode === 'hot') {
        venueData.sort((a, b) => (b.feedbackCount || 0) - (a.feedbackCount || 0));
      } else if (sortMode === 'new') {
        venueData.sort((a, b) => b.id.localeCompare(a.id));
      }
      setVenues(venueData);
    });
    return () => unsubscribe();
  }, [sortMode]);

  return (
    <Card className="bg-transparent border-none">
      <CardContent className="p-0 space-y-4">
        {venues.length === 0 ? (
          <p className="text-gray-400">No venues yet—check back soon!</p>
        ) : (
          venues.map(venue => <VenueItem key={venue.id} venue={venue} />)
        )}
      </CardContent>
    </Card>
  );
}