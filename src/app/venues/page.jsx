'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, getDocs, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { ChevronLeft, MapPin, Clock, CalendarDays, Star, Users } from 'lucide-react';
import Footer from '../../components/Footer';

// Get color for busyness level - moved outside of components so it's available to all
const getVibeColor = (score) => {
  if (!score || score === 0) return 'bg-gray-600';
  
  const numScore = parseFloat(score);
  if (numScore <= 2) return 'bg-green-600'; // Quiet
  if (numScore <= 4) return 'bg-yellow-600'; // Moderate
  return 'bg-red-600'; // Busy
};

export default function VenuesPage() {
  const { currentUser } = useAuth();
  const [venues, setVenues] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [userContributions, setUserContributions] = useState([]);
  const [userFavorites, setUserFavorites] = useState([]);

  useEffect(() => {
    if (!currentUser) {
      // Redirect non-authenticated users or show limited content
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch all venues
        const venuesRef = collection(db, 'venues');
        const venueSnapshot = await getDocs(venuesRef);
        
        const venueData = venueSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setVenues(venueData);
        
        // Set up listeners for each venue to get feedback data
        const unsubscribers = venueData.map(venue => {
          const feedbacksRef = collection(db, `venues/${venue.id}/feedbacks`);
          return onSnapshot(feedbacksRef, async (feedbackSnapshot) => {
            const feedbacks = feedbackSnapshot.docs.map(doc => ({
              id: doc.id,
              venueId: venue.id,
              venueName: venue.name,
              ...doc.data()
            }));
            
            // Update user contributions
            const userVibes = feedbacks.filter(
              feedback => feedback.userId === currentUser.uid
            );
            
            if (userVibes.length > 0) {
              setUserContributions(prev => {
                const existing = prev.filter(item => item.venueId !== venue.id);
                return [...existing, ...userVibes];
              });
            }
            
            // Calculate busyness score
            if (feedbacks.length > 0) {
              const ratings = feedbacks.map(item => item.rating || 0);
              const avgScore = ratings.reduce((a, b) => a + b, 0) / ratings.length;
              
              setVenues(prev => 
                prev.map(v => {
                  if (v.id === venue.id) {
                    return {
                      ...v,
                      busynessScore: avgScore,
                      vibeCount: feedbacks.length
                    };
                  }
                  return v;
                })
              );
            }
          });
        });
        
        // Fetch user favorites 
        const userRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.favorites && Array.isArray(userData.favorites)) {
            setUserFavorites(userData.favorites);
          }
        }
        
        setLoading(false);
        
        return () => {
          unsubscribers.forEach(unsub => {
            if (typeof unsub === 'function') {
              unsub();
            }
          });
        };
      } catch (error) {
        console.error('Error fetching venue data:', error);
        setLoading(false);
      }
    };
    
    fetchData();
  }, [currentUser]);

  // Filter venues based on active tab
  const filteredVenues = () => {
    if (activeTab === 'all') return venues;
    if (activeTab === 'favorites') return venues.filter(venue => userFavorites.includes(venue.id));
    if (activeTab === 'contributed') {
      const contributedIds = [...new Set(userContributions.map(contrib => contrib.venueId))];
      return venues.filter(venue => contributedIds.includes(venue.id));
    }
    return venues;
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col">
        <div className="flex-1 container mx-auto px-4 py-8">
          <div className="flex items-center mb-6">
            <Link href="/" className="mr-3">
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Venues</h1>
          </div>
          
          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <h2 className="text-xl font-semibold mb-4">Login Required</h2>
              <p className="text-gray-400 mb-6 text-center max-w-md">
                Please sign in to view detailed venue information and share your experiences with the community.
              </p>
              <div className="flex gap-3">
                <Link href="/login">
                  <Button className="bg-indigo-600 hover:bg-indigo-700">Log In</Button>
                </Link>
                <Link href="/signup">
                  <Button variant="outline">Sign Up</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Link href="/dashboard" className="mr-3">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Venues</h1>
        </div>
        
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="bg-white/5">
            <TabsTrigger value="all" className="data-[state=active]:bg-indigo-600">All Venues</TabsTrigger>
            <TabsTrigger value="favorites" className="data-[state=active]:bg-indigo-600">My Favorites</TabsTrigger>
            <TabsTrigger value="contributed" className="data-[state=active]:bg-indigo-600">My Contributions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loading ? (
                Array(6).fill(0).map((_, i) => (
                  <Card key={i} className="bg-white/5 backdrop-blur-sm border-white/10 h-44 animate-pulse">
                    <CardContent className="p-0"></CardContent>
                  </Card>
                ))
              ) : (
                filteredVenues().map(venue => (
                  <VenueCard 
                    key={venue.id} 
                    venue={venue} 
                    isFavorite={userFavorites.includes(venue.id)} 
                  />
                ))
              )}
            </div>
            
            {!loading && filteredVenues().length === 0 && (
              <div className="text-center py-12 border border-dashed border-white/10 rounded-lg bg-white/5">
                <p className="text-gray-400">No venues found in this category.</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="favorites" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <Card key={i} className="bg-white/5 backdrop-blur-sm border-white/10 h-44 animate-pulse">
                    <CardContent className="p-0"></CardContent>
                  </Card>
                ))
              ) : (
                filteredVenues().map(venue => (
                  <VenueCard 
                    key={venue.id} 
                    venue={venue}
                    isFavorite={true}
                  />
                ))
              )}
            </div>
            
            {!loading && filteredVenues().length === 0 && (
              <div className="text-center py-12 border border-dashed border-white/10 rounded-lg bg-white/5">
                <Star className="h-6 w-6 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-400 mb-2">You haven't added any favorites yet.</p>
                <p className="text-gray-500 text-sm">Browse the "All Venues" tab and mark your favorite spots.</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="contributed" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <Card key={i} className="bg-white/5 backdrop-blur-sm border-white/10 h-44 animate-pulse">
                    <CardContent className="p-0"></CardContent>
                  </Card>
                ))
              ) : (
                filteredVenues().map(venue => (
                  <VenueCard 
                    key={venue.id} 
                    venue={venue}
                    isFavorite={userFavorites.includes(venue.id)}
                    showContributions={true}
                    contributions={userContributions.filter(c => c.venueId === venue.id)}
                  />
                ))
              )}
            </div>
            
            {!loading && filteredVenues().length === 0 && (
              <div className="text-center py-12 border border-dashed border-white/10 rounded-lg bg-white/5">
                <Users className="h-6 w-6 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-400 mb-2">You haven't contributed to any venues yet.</p>
                <p className="text-gray-500 text-sm">Head back to the home page to add vibes to venues.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}

function VenueCard({ venue, isFavorite, showContributions, contributions }) {
  return (
    <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-colors">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-white text-lg">{venue.name}</h3>
            <p className="text-gray-400 text-sm">{venue.type}</p>
          </div>
          {isFavorite && (
            <Badge className="bg-indigo-600/50 text-white border-0">
              <Star className="h-3 w-3 mr-1 fill-current" /> Favorite
            </Badge>
          )}
        </div>
        
        <div className="mt-3 flex items-center">
          <MapPin className="h-4 w-4 text-gray-400 mr-1" />
          <span className="text-gray-300 text-sm">{venue.address || 'North Hollywood, CA'}</span>
        </div>
        
        {venue.busynessScore > 0 ? (
          <div className="mt-3 flex items-center gap-2">
            <Badge
              className={`text-white border-white/20 ${getVibeColor(venue.busynessScore)}`}
            >
              {venue.busynessScore.toFixed(1)}/5
            </Badge>
            <span className="text-gray-300 text-sm">
              ({venue.vibeCount || 0} vibes)
            </span>
          </div>
        ) : (
          <div className="mt-3">
            <Badge variant="outline" className="text-gray-400 border-gray-600">
              No vibes yet
            </Badge>
          </div>
        )}
        
        {showContributions && contributions?.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <h4 className="text-sm font-medium text-white mb-2 flex items-center">
              <Users className="h-3 w-3 mr-1" /> Your Contributions:
            </h4>
            
            {contributions.slice(0, 2).map(contrib => (
              <div key={contrib.id} className="mb-2 last:mb-0 bg-white/5 p-2 rounded-md">
                <div className="flex justify-between text-xs">
                  <Badge className={getVibeColor(contrib.rating)}>
                    {contrib.rating}/5
                  </Badge>
                  <span className="text-gray-400 flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {contrib.timestamp?.toDate ? contrib.timestamp.toDate().toLocaleDateString() : 'Unknown'}
                  </span>
                </div>
                {contrib.comment && (
                  <p className="mt-1 text-sm text-gray-300">{contrib.comment}</p>
                )}
              </div>
            ))}
            
            {contributions.length > 2 && (
              <p className="text-xs text-gray-400 mt-1">
                +{contributions.length - 2} more contributions
              </p>
            )}
          </div>
        )}
        
        <div className="mt-4">
          <Link href={`/venues/${venue.id}`}>
            <Button className="w-full" variant="secondary">View Details</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}