'use client';

import { useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import AuthComponent from '../../components/AuthComponent';
import Footer from '../../components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import Link from 'next/link';
import Image from 'next/image';
import { MapContext } from '../ClientLayout';
import { MapPin, Users, ArrowRight, Shield } from 'lucide-react';
import { addSnapshot } from '../../lib/snapshotManager';
import SocialFeed from '../../components/SocialFeed';
import Navbar from '@/components/Navbar';
import UserAvatar from '../../components/UserAvatar';

export default function Dashboard() {
  const router = useRouter();
  const { isMapLoaded } = useContext(MapContext);
  const [venueCount, setVenueCount] = useState(0);
  const { currentUser, loading: authLoading } = useAuth();
  const [showMap, setShowMap] = useState(false);
  
  // User profile state
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
  const [profileLoading, setProfileLoading] = useState(true);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, authLoading, router]);

  // Only show map when Google Maps is loaded and auth state is determined
  useEffect(() => {
    if (isMapLoaded && !authLoading && currentUser) {
      setShowMap(true);
    }
  }, [isMapLoaded, authLoading, currentUser]);

  // Load user profile data
  useEffect(() => {
    if (!currentUser) {
      setProfileLoading(false);
      return;
    }
    
    const userRef = doc(db, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(
      userRef, 
      async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          
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
        
        setProfileLoading(false);
      },
      (error) => {
        console.error('Error in UserProfile snapshot:', error);
        setProfileLoading(false);
      }
    );

    // Register with snapshot manager instead of manually cleaning up
    addSnapshot(unsubscribe);
  }, [currentUser]);

  const handleVenueCountChange = (count) => {
    setVenueCount(count);
  };

  if (authLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-t-4 border-indigo-500 border-solid rounded-full animate-spin"></div>
        <p className="mt-4 text-xl">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Top Navigation */}
      <Navbar />
      
      {/* Hero Section with Heatmap */}
      <div className="relative w-full px-4 mt-6">
        {showMap ? (
          <div className="relative w-full py-6">
            <div className="w-full h-64 bg-gradient-to-b from-indigo-900 to-gray-900 rounded-lg flex items-center justify-center border border-white/10">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-white">View Live Venue Map</h2>
                <p className="text-gray-400 mt-2">See real-time busyness levels across North Hollywood</p>
                <Link href="/map">
                  <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700">
                    <MapPin className="h-4 w-4 mr-2" /> Open Map
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full h-64 bg-gradient-to-b from-indigo-900 to-gray-900 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="animate-pulse">
                <h2 className="text-xl font-semibold text-white/80">Loading map...</h2>
                <p className="text-gray-400">Please wait while we fetch venue data</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="w-full mx-auto flex flex-col md:flex-row gap-6 px-4 mt-6 mb-6">
        <main className="flex-1">
          {/* Social Feed Component */}
          <SocialFeed />
        </main>
        
        <aside className="w-full md:w-80 flex flex-col gap-6">
          {/* Profile Card - Hide on mobile since we have mobile menu */}
          <Card className="bg-white/5 backdrop-blur-sm border-white/10 hidden md:block">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-white">Your Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profileLoading ? (
                <div className="h-20 bg-white/5 animate-pulse rounded-lg"></div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <UserAvatar 
                      user={userData} 
                      size="lg" 
                      className="border-2 border-white/20" 
                    />
                    
                    <div>
                      <h3 className="font-medium text-white text-lg">{userData.username}</h3>
                      <div className="flex items-center">
                        <Badge className="bg-indigo-600 text-white">
                          {userData.points} points
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {userData.bio && (
                    <p className="text-gray-300 text-sm italic">"{userData.bio}"</p>
                  )}
                  
                  {userData.favoriteVenueName && (
                    <p className="text-gray-300 text-sm">
                      Favorite Spot: <span className="text-white">{userData.favoriteVenueName}</span>
                    </p>
                  )}
                  
                  <p className="text-gray-300 text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>Followers: <span className="text-white">{userData.followers.length}</span> | Following: <span className="text-white">{userData.following.length}</span></span>
                  </p>
                  
                  <div className="pt-2 space-y-2">
                    <Link href={`/profile/${currentUser.uid}`}>
                      <Button 
                        variant="outline" 
                        className="w-full bg-white/5 hover:bg-white/10 border-white/10 text-white"
                      >
                        View Full Profile
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          {/* Additional Info Card */}
          <Card className="bg-white/5 backdrop-blur-sm border-white/10 hidden md:block">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-white">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AuthComponent />
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}