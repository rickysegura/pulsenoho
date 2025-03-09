// src/app/admin/page.js
'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Trash2 } from 'lucide-react';

export default function AdminDashboard() {
  const { currentUser, isAdmin } = useAuth();
  const [venues, setVenues] = useState([]);
  const [newVenue, setNewVenue] = useState({ name: '', type: '', lat: '', lng: '' });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!currentUser) {
      router.push('/signup');
      return;
    }
    if (!isAdmin) {
      router.push('/');
      return;
    }

    const unsubscribe = onSnapshot(collection(db, 'venues'), (snapshot) => {
      const venueData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVenues(venueData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching venues:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, isAdmin, router]);

  const handleAddVenue = async (e) => {
    e.preventDefault();
    if (!newVenue.name || !newVenue.type || !newVenue.lat || !newVenue.lng) return;

    try {
      await addDoc(collection(db, 'venues'), {
        name: newVenue.name,
        type: newVenue.type,
        lat: parseFloat(newVenue.lat),
        lng: parseFloat(newVenue.lng),
      });
      setNewVenue({ name: '', type: '', lat: '', lng: '' });
    } catch (error) {
      console.error('Error adding venue:', error);
    }
  };

  const handleRemoveVenue = async (venueId) => {
    try {
      await deleteDoc(doc(db, 'venues', venueId));
    } catch (error) {
      console.error('Error removing venue:', error);
    }
  };

  if (loading) {
    return <p className="text-gray-400 text-center">Loading admin dashboard...</p>;
  }

  if (!currentUser || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4">
      <Card className="w-full max-w-3xl bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-white">Admin Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add Venue Form */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Add New Venue</h3>
            <form onSubmit={handleAddVenue} className="space-y-4">
              <Input
                value={newVenue.name}
                onChange={(e) => setNewVenue({ ...newVenue, name: e.target.value })}
                placeholder="Venue Name"
                className="bg-white/10 border-white/20 text-white"
              />
              <Input
                value={newVenue.type}
                onChange={(e) => setNewVenue({ ...newVenue, type: e.target.value })}
                placeholder="Type (e.g., Bar, Club)"
                className="bg-white/10 border-white/20 text-white"
              />
              <div className="flex gap-2">
                <Input
                  value={newVenue.lat}
                  onChange={(e) => setNewVenue({ ...newVenue, lat: e.target.value })}
                  placeholder="Latitude"
                  type="number"
                  step="any"
                  className="bg-white/10 border-white/20 text-white"
                />
                <Input
                  value={newVenue.lng}
                  onChange={(e) => setNewVenue({ ...newVenue, lng: e.target.value })}
                  placeholder="Longitude"
                  type="number"
                  step="any"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <Button type="submit" className="w-full bg-white/20 text-white hover:bg-white/30">
                Add Venue
              </Button>
            </form>
          </div>

          {/* Venue List */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Manage Venues</h3>
            {venues.length === 0 ? (
              <p className="text-gray-400">No venues yet.</p>
            ) : (
              <ul className="space-y-2">
                {venues.map((venue) => (
                  <li
                    key={venue.id}
                    className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/10"
                  >
                    <span>
                      {venue.name} ({venue.type}) - {venue.lat}, {venue.lng}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveVenue(venue.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Back to Home */}
          <Button
            onClick={() => router.push('/')}
            className="w-full bg-gray-700 text-white hover:bg-gray-600"
          >
            Back to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}