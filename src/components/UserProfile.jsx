// src/components/UserProfile.js - Fixed points update
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
  const [userData, setUserData] = useState({
    points: 0,
    username: '',
    photoURL: '',
    bio: '',
    favoriteVenueId: '',
    favoriteVenueName: '',
    followers: [],
    following: [],
    isAdmin: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setUserData({
        points: 0,
        username: '',
        photoURL: '',
        bio: '',
        favoriteVenueId: '',
        favoriteVenueName: '',
        followers: [],
        following: [],
        isAdmin: false
      });
      setLoading(false);
      return;
    }

    console.log("Setting up user listener for:", currentUser.uid);
    
    const userRef = doc(db, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(
      userRef, 
      async (docSnap) => {
        console.log("User data updated:", docSnap.exists());
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log("User points from DB:", data.points);
          
          // Start with data from document
          const newUserData = {
            points: data.points || 0,
            username: data.username || currentUser.email?.split('@')[0] || 'User',
            photoURL: data.photoURL || '',
            bio: data.bio || '',
            favoriteVenueId: data.favoriteVenueId || '',
            followers: data.followers || [],
            following: data.following || [],
            isAdmin: !!data.isAdmin,
            favoriteVenueName: ''
          };

          // Fetch favorite venue name if ID exists
          if (data.favoriteVenueId) {
            try {
              const venueRef = doc(db, 'venues', data.favoriteVenueId);
              const venueSnap = await getDoc(venueRef);
              if (venueSnap.exists()) {
                newUserData.favoriteVenueName = venueSnap.data().name || 'Unknown Venue';
              }
            } catch (error) {
              console.error("Error fetching venue:", error);
            }
          }
          
          setUserData(newUserData);
        } else {
          console.log("User document doesn't exist");
          // Reset to defaults if document doesn't exist
          setUserData({
            points: 0,
            username: currentUser.email?.split('@')[0] || 'User',
            photoURL: '',
            bio: '',
            favoriteVenueId: '',
            favoriteVenueName: '',
            followers: [],
            following: [],
            isAdmin: false
          });
        }
        
        setLoading(false);
      },
      (error) => {
        console.error('Error in UserProfile snapshot:', error);
        setLoading(false);
      }
    );

    return () => {
      console.log("Unsubscribing from user listener");
      unsubscribe();
    };
  }, [currentUser]);

  if (loading) {
    return (
      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-white">
            Loading Profile...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-20 bg-white/5 animate-pulse rounded-lg"></div>
        </CardContent>
      </Card>
    );
  }

  if (!currentUser) {
    return (
      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardContent className="p-6">
          <p className="text-gray-400 text-center">Please log in to view your profile</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/10 backdrop-blur-lg border-white/20">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-white">
          Welcome, {userData.username}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {userData.photoURL && (
          <div className="flex justify-center">
            <Image
              src={userData.photoURL}
              alt={`${userData.username}'s avatar`}
              width={80}
              height={80}
              className="rounded-full border-2 border-white/20"
            />
          </div>
        )}
        <div className="flex items-center space-x-2">
          <span className="text-gray-300">Points:</span>
          <Badge variant="secondary" className="bg-white/20 text-white">
            {userData.points}
          </Badge>
        </div>
        {userData.bio && (
          <p className="text-gray-300 text-sm italic">"{userData.bio}"</p>
        )}
        {userData.favoriteVenueName && (
          <p className="text-gray-300 text-sm">
            Favorite Spot: <span className="text-white">{userData.favoriteVenueName}</span>
          </p>
        )}
        <p className="text-gray-300 text-sm">
          Followers: <span className="text-white">{userData.followers.length}</span> | Following:{' '}
          <span className="text-white">{userData.following.length}</span>
        </p>
        {userData.isAdmin && (
          <Link href="/admin" className="text-gray-300 hover:text-white text-sm underline">
            Admin Dashboard
          </Link>
        )}
        <div className="pt-2 flex flex-col gap-2">
          <Link href={`/profile/${currentUser.uid}`} className="text-gray-300 hover:text-white text-sm underline">
            View My Profile
          </Link>
          <Link href="/settings" className="text-gray-300 hover:text-white text-sm underline">
            Edit Profile
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}