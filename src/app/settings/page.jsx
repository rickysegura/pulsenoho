// src/app/settings/page.js
'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useRouter } from 'next/navigation';

export default function Settings() {
  const { currentUser } = useAuth();
  const [username, setUsername] = useState('');
  const [photo, setPhoto] = useState(null);
  const [bio, setBio] = useState('');
  const [favoriteVenueId, setFavoriteVenueId] = useState('');
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (!currentUser) {
      router.push('/');
      return;
    }

    const fetchUserData = async () => {
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        setUsername(data.username || '');
        setBio(data.bio || '');
        setFavoriteVenueId(data.favoriteVenueId || '');
      }

      const venuesSnapshot = await getDocs(collection(db, 'venues'));
      const venueList = venuesSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
      }));
      setVenues(venueList);

      setLoading(false);
    };

    fetchUserData();
  }, [currentUser, router]);

  const handlePhotoChange = (e) => {
    if (e.target.files[0]) {
      setPhoto(e.target.files[0]);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setMessage('Username cannot be empty');
      return;
    }

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const updates = {
        username: username.trim(),
        bio: bio.trim(),
        favoriteVenueId,
      };

      if (photo) {
        const storageRef = ref(storage, `avatars/${currentUser.uid}`);
        await uploadBytes(storageRef, photo);
        const photoURL = await getDownloadURL(storageRef);
        updates.photoURL = photoURL;
      }

      await setDoc(userRef, updates, { merge: true });
      setMessage('Profile saved successfully!');
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage('Failed to save profile');
    }
  };

  if (loading) {
    return <p className="text-gray-400 text-center">Loading...</p>;
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-white">Edit Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-gray-300 text-sm block mb-1">Username</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="bg-white/10 border-white/20 text-white w-full"
              />
            </div>
            <div>
              <label className="text-gray-300 text-sm block mb-1">Profile Picture</label>
              <Input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="bg-white/10 border-white/20 text-white w-full"
              />
            </div>
            <div>
              <label className="text-gray-300 text-sm block mb-1">Bio</label>
              <Input
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself"
                className="bg-white/10 border-white/20 text-white w-full"
                maxLength={100}
              />
            </div>
            <div>
              <label className="text-gray-300 text-sm block mb-1">Favorite Venue</label>
              <Select value={favoriteVenueId} onValueChange={setFavoriteVenueId}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white w-full">
                  <SelectValue placeholder="Select a venue" />
                </SelectTrigger>
                <SelectContent>
                  {venues.map((venue) => (
                    <SelectItem key={venue.id} value={venue.id}>
                      {venue.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="submit"
              className="bg-white/20 text-white hover:bg-white/30 w-full"
            >
              Save
            </Button>
            {message && (
              <p className={`text-sm ${message.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
                {message}
              </p>
            )}
          </form>
          <Button
            onClick={() => router.push('/')}
            className="bg-gray-700 text-white hover:bg-gray-600 w-full"
          >
            Back to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}