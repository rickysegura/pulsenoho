'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { doc, getDoc, collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, setDoc, increment, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { toast } from 'react-hot-toast';
import { ChevronLeft, MapPin, Clock, Star, StarOff, Users, Calendar, ExternalLink, Phone, Globe, Tag } from 'lucide-react';
import Footer from '../../../components/Footer';
import { addSnapshot, removeSnapshot } from '../../../lib/snapshotManager';

// Get color for busyness level
const getVibeColor = (score) => {
  if (!score || score === 0) return 'bg-gray-600';
  
  const numScore = parseFloat(score);
  if (numScore <= 2) return 'bg-green-600'; // Quiet
  if (numScore <= 4) return 'bg-yellow-600'; // Moderate
  return 'bg-red-600'; // Busy
};

// Get label for busyness level
const getBusynessLabel = (score) => {
  if (!score || score === 0) return 'No Data';
  
  const numScore = parseFloat(score);
  if (numScore <= 2) return 'Quiet';
  if (numScore <= 4) return 'Moderate';
  return 'Busy';
};

export default function VenueDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const { currentUser } = useAuth();
  const [venue, setVenue] = useState(null);
  const [vibes, setVibes] = useState([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingFavorite, setLoadingFavorite] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(3);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const fetchVenueData = async () => {
      try {
        // Get venue data
        const venueRef = doc(db, 'venues', id);
        const venueSnap = await getDoc(venueRef);
        
        if (!venueSnap.exists()) {
          // Venue doesn't exist
          toast.error('Venue not found');
          router.push('/venues');
          return;
        }
        
        const venueData = {
          id: venueSnap.id,
          ...venueSnap.data()
        };
        
        setVenue(venueData);
        
        // Set up listener for feedback data
        const feedbacksRef = collection(db, `venues/${id}/feedbacks`);
        const feedbackQuery = query(feedbacksRef, orderBy('timestamp', 'desc'));
        
        const unsubscribe = onSnapshot(feedbackQuery, async (snapshot) => {
          // Get feedback data
          const feedbackData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // Calculate busyness score
          if (feedbackData.length > 0) {
            const ratings = feedbackData.map(item => item.rating || 0);
            const avgScore = ratings.reduce((a, b) => a + b, 0) / ratings.length;
            
            setVenue(prev => ({
              ...prev,
              busynessScore: avgScore,
              vibeCount: feedbackData.length
            }));
          }
          
          // Fetch user info for each feedback
          const vibesWithUserInfo = await Promise.all(
            feedbackData.map(async (feedback) => {
              try {
                if (!feedback.userId) return { ...feedback, username: 'Anonymous' };
                
                const userRef = doc(db, 'users', feedback.userId);
                const userSnap = await getDoc(userRef);
                const userData = userSnap.exists() ? userSnap.data() : {};
                
                // Format timestamp
                let formattedTime = 'Unknown';
                if (feedback.timestamp?.toDate) {
                  const date = feedback.timestamp.toDate();
                  formattedTime = date.toLocaleString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                }
                
                return {
                  ...feedback,
                  username: userData.username || feedback.userId.slice(0, 6),
                  photoURL: userData.photoURL || '',
                  formattedTime,
                  isCurrentUser: feedback.userId === currentUser.uid
                };
              } catch (err) {
                console.error("Error fetching user data:", err);
                return { ...feedback, username: 'User', formattedTime: 'Unknown' };
              }
            })
          );
          
          setVibes(vibesWithUserInfo);
        }, 
        (error) => {
          // Handle errors, especially permission errors when logging out
          console.error('Feedback listener error:', error);
          if (error.code === 'permission-denied' && !currentUser) {
            // No need to handle cleanup here as it will be done in the return
          }
        });
        
        // Register the unsubscribe function with the snapshot manager
        addSnapshot(unsubscribe);
        
        // Check if venue is in user's favorites
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setIsFavorite(userData.favorites?.includes(id) || false);
        }
        
        setLoading(false);
        
        return () => {
          if (typeof unsubscribe === 'function') {
            removeSnapshot(unsubscribe);
            unsubscribe();
          }
        };
      } catch (error) {
        console.error('Error fetching venue data:', error);
        toast.error('Error loading venue data');
        setLoading(false);
      }
    };
    
    fetchVenueData();
  }, [id, currentUser, router]);

  const toggleFavorite = async () => {
    if (!currentUser || !venue) return;
    
    setLoadingFavorite(true);
    
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      
      await setDoc(userRef, {
        favorites: isFavorite ? arrayRemove(id) : arrayUnion(id)
      }, { merge: true });
      
      setIsFavorite(!isFavorite);
      toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites');
    } catch (error) {
      console.error('Error updating favorites:', error);
      toast.error('Failed to update favorites');
    } finally {
      setLoadingFavorite(false);
    }
  };

  const handleVibeSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser || !id) return;
    
    setSubmitting(true);
    
    try {
      // Add feedback document
      const feedbackData = {
        userId: currentUser.uid,
        rating: Number(rating),
        comment: comment || '',
        timestamp: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, `venues/${id}/feedbacks`), feedbackData);
      
      // Update user points
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, {
        points: increment(1)
      }, { merge: true });
      
      toast.success('Vibe posted! +1 point');
      
      // Reset form
      setComment('');
      setShowForm(false);
    } catch (error) {
      console.error('Error submitting vibe:', error);
      toast.error(`Failed to post vibe: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col">
        <div className="flex-1 container mx-auto px-4 py-8">
          <div className="flex items-center mb-6">
            <Link href="/venues" className="mr-3">
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Venue Details</h1>
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
          <Link href="/venues" className="mr-3">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Venue Details</h1>
        </div>
        
        {loading ? (
          <div className="space-y-4">
            <div className="h-40 bg-white/5 rounded-lg animate-pulse"></div>
            <div className="h-72 bg-white/5 rounded-lg animate-pulse"></div>
          </div>
        ) : venue ? (
          <div className="space-y-6">
            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{venue.name}</h2>
                    <p className="text-gray-400">{venue.type}</p>
                    
                    <div className="mt-4 flex items-center">
                      <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="text-gray-300">
                        {venue.address || 'North Hollywood, CA'}
                      </span>
                    </div>
                    
                    {venue.phone && (
                      <div className="mt-2 flex items-center">
                        <Phone className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="text-gray-300">{venue.phone}</span>
                      </div>
                    )}
                    
                    {venue.website && (
                      <div className="mt-2 flex items-center">
                        <Globe className="h-4 w-4 text-gray-400 mr-1" />
                        <a href={venue.website} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 flex items-center">
                          Website <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </div>
                    )}
                    
                    {venue.tags && venue.tags.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {venue.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-gray-300 border-gray-600">
                            <Tag className="h-3 w-3 mr-1" /> {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-start md:items-end gap-3">
                    <div className="flex items-center gap-2">
                      <Badge
                        className={`${getVibeColor(venue.busynessScore)} text-white px-3 py-1`}
                      >
                        {getBusynessLabel(venue.busynessScore)}
                      </Badge>
                      <span className="text-gray-300">
                        {venue.busynessScore > 0 
                          ? venue.busynessScore.toFixed(1) + '/5' 
                          : 'No rating'}
                      </span>
                    </div>
                    
                    <p className="text-gray-400 flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      {venue.vibeCount || 0} vibes reported
                    </p>
                    
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant={isFavorite ? "default" : "outline"}
                        size="sm"
                        className={isFavorite ? "bg-indigo-600 hover:bg-indigo-700" : ""}
                        onClick={toggleFavorite}
                        disabled={loadingFavorite}
                      >
                        {isFavorite ? (
                          <>
                            <StarOff className="h-4 w-4 mr-1" />
                            Remove Favorite
                          </>
                        ) : (
                          <>
                            <Star className="h-4 w-4 mr-1" />
                            Add to Favorites
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                
                {venue.description && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium text-white mb-2">About</h3>
                    <p className="text-gray-300">{venue.description}</p>
                  </div>
                )}
                
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-white mb-3">Add Your Vibe</h3>
                  <div>
                    <Button 
                      onClick={() => setShowForm(!showForm)}
                      className={showForm ? "bg-gray-700 hover:bg-gray-600" : ""}
                    >
                      {showForm ? 'Cancel' : 'Add Vibe'}
                    </Button>
                    
                    {showForm && (
                      <div className="mt-3 p-3 rounded-lg bg-gray-800/70 border border-white/10">
                        <form onSubmit={handleVibeSubmit}>
                          <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                              How busy is it? (1-5)
                            </label>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map(value => (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() => setRating(value)}
                                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                                    rating >= value 
                                      ? 'bg-indigo-600 text-white' 
                                      : 'bg-gray-700 text-gray-400'
                                  }`}
                                >
                                  {value}
                                </button>
                              ))}
                              <span className="ml-2 text-sm text-gray-400">
                                {rating === 1 ? 'Empty' : 
                                rating === 2 ? 'Quiet' : 
                                rating === 3 ? 'Moderate' : 
                                rating === 4 ? 'Busy' : 'Packed'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                              Comment (optional)
                            </label>
                            <textarea
                              value={comment}
                              onChange={e => setComment(e.target.value)}
                              className="w-full p-2 rounded bg-gray-900/50 border border-gray-700 text-white text-sm"
                              placeholder="Any notes about the vibe?"
                              rows={2}
                            />
                          </div>
                          
                          <Button 
                            type="submit" 
                            disabled={submitting}
                            className="w-full"
                          >
                            {submitting ? 'Submitting...' : 'Post Update'}
                          </Button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-white">Community Vibes</CardTitle>
              </CardHeader>
              <CardContent>
                {vibes.length > 0 ? (
                  <div className="space-y-4">
                    {vibes.map((vibe) => (
                      <div 
                        key={vibe.id}
                        className={`p-4 rounded-lg border ${
                          vibe.isCurrentUser 
                            ? 'bg-indigo-900/30 border-indigo-500/30' 
                            : 'bg-white/5 border-white/10'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-8 w-8 bg-indigo-700 text-white rounded-full flex items-center justify-center flex-shrink-0">
                            {vibe.photoURL ? (
                              <Image 
                                src={vibe.photoURL} 
                                alt={vibe.username}
                                width={32}
                                height={32}
                                className="rounded-full"
                              />
                            ) : (
                              <span className="text-sm font-semibold">
                                {vibe.username.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-semibold text-white text-sm flex items-center">
                                {vibe.username}
                                {vibe.isCurrentUser && (
                                  <Badge className="ml-2 bg-indigo-600/50 text-white text-xs">You</Badge>
                                )}
                              </span>
                              <div className="flex items-center gap-2">
                                <Badge className={`${getVibeColor(vibe.rating)} text-white text-xs`}>
                                  {vibe.rating || 0}/5
                                </Badge>
                              </div>
                            </div>
                            
                            <p className="text-gray-300 break-words">
                              {vibe.comment || <em className="text-gray-500 text-sm">No comment</em>}
                            </p>
                            
                            <div className="mt-2 text-xs text-gray-400 flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {vibe.formattedTime}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border border-dashed border-white/10 rounded-lg">
                    <Users className="h-8 w-8 mx-auto mb-3 text-gray-400" />
                    <p className="text-gray-400 mb-2">No vibes reported yet.</p>
                    <p className="text-gray-500 text-sm">Be the first to share your experience!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <h2 className="text-xl font-semibold mb-4">Venue Not Found</h2>
              <p className="text-gray-400 mb-6 text-center">
                The venue you're looking for doesn't exist or has been removed.
              </p>
              <Link href="/venues">
                <Button>View All Venues</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
      <Footer />
    </div>
  );
}