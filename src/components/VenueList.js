"use client";

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import StatusUpdateForm from './StatusUpdateForm';

function VenueItem({ venue }) {
  const [busynessScore, setBusynessScore] = useState('Calculating...');
  const [feedbackCount, setFeedbackCount] = useState(0);

  useEffect(() => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const feedbacksRef = collection(db, `venues/${venue.id}/feedbacks`);
    const q = query(feedbacksRef, where('timestamp', '>', oneHourAgo));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ratings = snapshot.docs.map(doc => doc.data().rating);
      setFeedbackCount(ratings.length);
      if (ratings.length > 0) {
        const average = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        setBusynessScore(average.toFixed(1));
      } else {
        setBusynessScore('No recent data');
      }
    });

    return () => unsubscribe();
  }, [venue.id]);

  return (
    <div>
      <h3>{venue.name}</h3>
      <p>Busyness: {busynessScore} (based on {feedbackCount} recent feedback{feedbackCount !== 1 ? 's' : ''})</p>
      <StatusUpdateForm venueId={venue.id} />
    </div>
  );
}

export default function VenueList() {
  const [venues, setVenues] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'venues'), (snapshot) => {
      const venueData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVenues(venueData);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div>
      {venues.map(venue => <VenueItem key={venue.id} venue={venue} />)}
    </div>
  );
}