// src/components/UserProfile.js
'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import Link from 'next/link';

export default function UserProfile() {
  const { currentUser } = useAuth();
  const [points, setPoints] = useState(0);
  const [username, setUsername] = useState('');

  useEffect(() => {
    if (!currentUser) {
      setPoints(0);
      setUsername('');
      return;
    }

    const userRef = doc(db, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPoints(data.points || 0);
        setUsername(data.username || currentUser.email); // Fallback to email
      } else {
        setPoints(0);
        setUsername(currentUser.email);
      }
    }, (error) => {
      console.error('Snapshot error in UserProfile:', error.message);
      if (error.code === 'permission-denied') {
        setPoints(0);
        setUsername(currentUser.email);
      }
    });

    return () => unsubscribe();
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
          Welcome, {username}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <span className="text-gray-300">Points:</span>
          <Badge variant="secondary" className="bg-white/20 text-white">
            {points}
          </Badge>
        </div>
        <Link href="/settings" className="text-gray-300 hover:text-white text-sm underline">
          Edit Settings
        </Link>
      </CardContent>
    </Card>
  );
}