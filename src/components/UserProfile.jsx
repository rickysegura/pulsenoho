// src/components/UserProfile.js
'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import Link from 'next/link';
import Image from 'next/image';

export default function UserProfile() {
  const { currentUser } = useAuth();
  const [points, setPoints] = useState(0);
  const [username, setUsername] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [bio, setBio] = useState('');
  const [favoriteVenueId, setFavoriteVenueId] = useState('');
  const [favoriteVenueName, setFavoriteVenueName] = useState('');
  const [followers, setFollowers] = useState([]); // Add followers state
  const [following, setFollowing] = useState([]); // Add following state
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      setPoints(0);
      setUsername('');
      setPhotoURL('');
      setBio('');
      setFavoriteVenueId('');
      setFavoriteVenueName('');
      setFollowers([]);
      setFollowing([]);
      return;
    }

    const userRef = doc(db, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(userRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPoints(data.points || 0);
        setUsername(data.username || currentUser.email);
        setPhotoURL(data.photoURL || '');
        setBio(data.bio || '');
        setFavoriteVenueId(data.favoriteVenueId || '');
        setFollowers(data.followers || []); // Set followers
        setFollowing(data.following || []); // Set following
        setIsAdmin(data.isAdmin);

        // Fetch favorite venue name
        if (data.favoriteVenueId) {
          const venueRef = doc(db, 'venues', data.favoriteVenueId);
          const venueSnap = await getDoc(venueRef);
          setFavoriteVenueName(venueSnap.exists() ? venueSnap.data().name : 'Unknown Venue');
        } else {
          setFavoriteVenueName('');
        }
      } else {
        setPoints(0);
        setUsername(currentUser.email);
        setPhotoURL('');
        setBio('');
        setFavoriteVenueId('');
        setFavoriteVenueName('');
        setFollowers([]);
        setFollowing([]);
      }
    }, (error) => {
      console.error('Snapshot error in UserProfile:', error.message);
      if (error.code === 'permission-denied') {
        setPoints(0);
        setUsername(currentUser.email);
        setPhotoURL('');
        setBio('');
        setFavoriteVenueId('');
        setFavoriteVenueName('');
        setFollowers([]);
        setFollowing([]);
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
        {photoURL && (
          <div className="flex justify-center">
            <Image
              src={photoURL}
              alt={`${username}'s avatar`}
              width={80}
              height={80}
              className="rounded-full border-2 border-white/20"
            />
          </div>
        )}
        <div className="flex items-center space-x-2">
          <span className="text-gray-300">Points:</span>
          <Badge variant="secondary" className="bg-white/20 text-white">
            {points}
          </Badge>
        </div>
        {bio && (
          <p className="text-gray-300 text-sm italic">"{bio}"</p>
        )}
        {favoriteVenueName && (
          <p className="text-gray-300 text-sm">
            Favorite Spot: <span className="text-white">{favoriteVenueName}</span>
          </p>
        )}
        <p className="text-gray-300 text-sm">
          Followers: <span className="text-white">{followers.length}</span> | Following:{' '}
          <span className="text-white">{following.length}</span>
        </p>
        {isAdmin && (
          <Link href="/admin" className="text-gray-300 hover:text-white text-sm underline">
            Admin Dashboard
          </Link>
        )}
        <br />
        <Link href={`/profile/${currentUser.uid}`} className="text-gray-300 hover:text-white text-sm underline">
          View My Profile
        </Link>
        <br />
        <Link href="/settings" className="text-gray-300 hover:text-white text-sm underline">
          Edit Profile
        </Link>
      </CardContent>
    </Card>
  );
}