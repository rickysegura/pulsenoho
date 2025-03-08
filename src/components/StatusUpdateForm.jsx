// src/components/StatusUpdateForm.js
'use client';

import { useState } from 'react';
import { collection, query, where, getDocs, setDoc, addDoc, doc, updateDoc, getDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Slider } from './ui/slider';
import { Button } from './ui/button';
import { Input } from './ui/input';

export default function StatusUpdateForm({ venueId }) {
  const [rating, setRating] = useState(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const currentUser = auth.currentUser;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating || !currentUser || !venueId) {
      console.log('Missing data:', { rating, currentUser, venueId });
      return;
    }

    try {
      console.log('Submitting feedback for venue:', venueId, 'by user:', currentUser.uid);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const feedbacksRef = collection(db, `venues/${venueId}/feedbacks`);
      const q = query(
        feedbacksRef,
        where('userId', '==', currentUser.uid),
        where('timestamp', '>', oneHourAgo)
      );
      const querySnapshot = await getDocs(q);
      console.log('Existing feedbacks in last hour:', querySnapshot.docs.length);

      const feedbackData = {
        userId: currentUser.uid,
        rating: Number(rating),
        comment: comment.trim(),
        timestamp: serverTimestamp(),
      };

      if (!querySnapshot.empty) {
        const existingDoc = querySnapshot.docs[0];
        await setDoc(existingDoc.ref, feedbackData, { merge: true });
        console.log('Updated existing feedback successfully');
      } else {
        await addDoc(feedbacksRef, feedbackData);
        console.log('Added new feedback successfully');
      }

      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      console.log('User document exists:', userSnap.exists(), 'Current points:', userSnap.data()?.points);
      if (!userSnap.exists()) {
        await setDoc(userRef, { points: 0 });
        console.log('Created user document with points: 0');
      } else if (typeof userSnap.data().points !== 'number') {
        await setDoc(userRef, { points: 0 }, { merge: true });
        console.log('Reset points to 0 due to invalid type');
      }
      console.log('Attempting to increment points');
      await updateDoc(userRef, { points: increment(1) });
      console.log('User points incremented successfully');
      const updatedSnap = await getDoc(userRef);
      console.log('Points after increment:', updatedSnap.data().points);

      setRating(null);
      setComment('');
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 2000);
    } catch (error) {
      console.error('Error submitting feedback or incrementing points:', error.message, 'Code:', error.code);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-start space-y-2 w-full">
      <label className="text-white text-sm">
        Busyness (1 = Quiet, 5 = Busy)
      </label>
      <Slider
        min={1}
        max={5}
        step={1}
        value={[rating || 1]}
        onValueChange={(value) => setRating(value[0])}
        className="w-32"
      />
      <Input
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="What’s the vibe like?"
        className="bg-white/10 border-white/20 text-white w-full"
      />
      <Button
        type="submit"
        className="bg-white/20 text-white hover:bg-white/30"
      >
        Post Vibe
      </Button>
      {submitted && (
        <p className="text-green-400 text-sm">Vibe posted! +1 point</p>
      )}
    </form>
  );
}