// src/app/profile/[userId]/page.js
'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';

export default function UserProfile() {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { userId } = useParams();

  useEffect(() => {
    if (!currentUser) {
      router.push('/');
      return;
    }

    const fetchProfile = async () => {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        let favoriteVenueName = '';

        // Fetch venue name if favoriteVenueId exists
        if (data.favoriteVenueId) {
          const venueRef = doc(db, 'venues', data.favoriteVenueId);
          const venueSnap = await getDoc(venueRef);
          favoriteVenueName = venueSnap.exists() ? venueSnap.data().name : 'Unknown Venue';
        }

        setProfile({
          id: userId,
          username: data.username || 'Anonymous',
          photoURL: data.photoURL || '',
          bio: data.bio || '',
          favoriteVenueId: data.favoriteVenueId || '', // Keep ID for reference if needed
          favoriteVenueName, // Add venue name to profile
          points: data.points || 0,
          followers: data.followers || [],
        });
        setIsFollowing(data.followers?.includes(currentUser.uid) || false);
      } else {
        setProfile(null); // User not found
      }
      setLoading(false);
    };

    fetchProfile();
  }, [currentUser, userId, router]);

  const handleFollowToggle = async () => {
    if (!profile) return;

    try {
      const userRef = doc(db, 'users', userId);
      const currentUserRef = doc(db, 'users', currentUser.uid);

      if (isFollowing) {
        await updateDoc(userRef, {
          followers: arrayRemove(currentUser.uid),
        });
        await updateDoc(currentUserRef, {
          following: arrayRemove(userId),
        });
        setIsFollowing(false);
      } else {
        await updateDoc(userRef, {
          followers: arrayUnion(currentUser.uid),
        });
        await updateDoc(currentUserRef, {
          following: arrayUnion(userId),
        });
        setIsFollowing(true);
      }
      setProfile((prev) => ({
        ...prev,
        followers: isFollowing
          ? prev.followers.filter((id) => id !== currentUser.uid)
          : [...prev.followers, currentUser.uid],
      }));
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  if (loading) {
    return <p className="text-gray-400 text-center">Loading profile...</p>;
  }

  if (!currentUser || !profile) {
    return <p className="text-gray-400 text-center">Profile not found or access denied.</p>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-white">{profile.username}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile.photoURL && (
            <div className="flex justify-center">
              <Image
                src={profile.photoURL}
                alt={`${profile.username}'s avatar`}
                width={100}
                height={100}
                className="rounded-full border-2 border-white/20"
              />
            </div>
          )}
          <p className="text-gray-300 text-sm italic">{profile.bio || 'No bio yet'}</p>
          <p className="text-gray-300 text-sm">
            Points: <span className="text-white">{profile.points}</span>
          </p>
          {profile.favoriteVenueId && (
            <p className="text-gray-300 text-sm">
              Favorite Spot: <span className="text-white">{profile.favoriteVenueName}</span>
            </p>
          )}
          <p className="text-gray-300 text-sm">
            Followers: <span className="text-white">{profile.followers.length}</span>
          </p>
          {currentUser.uid !== userId && (
            <Button
              onClick={handleFollowToggle}
              className={`w-full ${isFollowing ? 'bg-gray-600 hover:bg-gray-700' : 'bg-white/20 hover:bg-white/30'}`}
            >
              {isFollowing ? 'Unfollow' : 'Follow'}
            </Button>
          )}
          <div>
            <Button
              onClick={() => router.push('/')}
              className="w-full bg-gray-700 text-white hover:bg-gray-600"
            >
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}