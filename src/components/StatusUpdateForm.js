"use client";

import { useState } from 'react';
import { collection, query, where, getDocs, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export default function StatusUpdateForm({ venueId }) {
  const [rating, setRating] = useState(null);
  const currentUser = auth.currentUser;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating || !currentUser || !venueId) return;

    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const feedbacksRef = collection(db, `venues/${venueId}/feedbacks`);
      const q = query(
        feedbacksRef,
        where('userId', '==', currentUser.uid),
        where('timestamp', '>', oneHourAgo)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Update existing feedback
        const existingDoc = querySnapshot.docs[0];
        await setDoc(existingDoc.ref, {
          rating: Number(rating),
          timestamp: serverTimestamp(),
        }, { merge: true });
      } else {
        // Add new feedback
        await addDoc(feedbacksRef, {
          userId: currentUser.uid,
          rating: Number(rating),
          timestamp: serverTimestamp(),
        });
      }
      setRating(null); // Reset form
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Busyness (1 = Quiet, 5 = Very Busy):
        <input
          type="number"
          min="1"
          max="5"
          value={rating || ''}
          onChange={(e) => setRating(e.target.value)}
        />
      </label>
      <button type="submit">Submit</button>
    </form>
  );
}