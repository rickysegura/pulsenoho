// src/components/UserProfile.js
'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'; // Shadcn/UI Card
import { Badge } from './ui/badge'; // Shadcn/UI Badge for points

export default function UserProfile() {
  const { currentUser } = useAuth();
  const [points, setPoints] = useState(0);

  useEffect(() => {
    if (currentUser) {
      // Set up real-time listener for user document
      const userRef = doc(db, 'users', currentUser.uid);
      const unsubscribe = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          setPoints(docSnap.data().points || 0);
        } else {
          setPoints(0); // Fallback if document doesn’t exist (shouldn’t happen with AuthContext fix)
        }
      }, (error) => {
        console.error('Error listening to user document:', error);
      });

      // Cleanup listener on unmount
      return () => unsubscribe();
    }
  }, [currentUser]);

  if (!currentUser) {
    return (
      <p className="text-gray-400 text-center">Please log in to view your profile.</p>
    );
  }

  return (
    <Card className="bg-white/10 backdrop-blur-lg border-white/20">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-white">
          Welcome, {currentUser.email}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
          <span className="text-gray-300">Points:</span>
          <Badge variant="secondary" className="bg-white/20 text-white">
            {points}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}