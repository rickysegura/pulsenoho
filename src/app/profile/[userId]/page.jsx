'use client';

import { useState, useEffect, useRef } from 'react';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs, orderBy, limit, increment } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import Link from 'next/link';
import { MessageSquare, User, Star, MapPin, Users, ArrowLeft, Calendar, Check, Heart, MessageCircle, Clock } from 'lucide-react';
import UserAvatar from '../../../components/UserAvatar';

export default function UserProfile() {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const [userPosts, setUserPosts] = useState([]);
  const [expandedPost, setExpandedPost] = useState(null);
  const [activeCommentPostId, setActiveCommentPostId] = useState(null);
  const router = useRouter();
  const { userId } = useParams();

  useEffect(() => {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    const fetchProfile = async () => {
      try {
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
            favoriteVenueId: data.favoriteVenueId || '',
            favoriteVenueName,
            points: data.points || 0,
            followers: data.followers || [],
            following: data.following || [],
            createdAt: data.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'Unknown'
          });
          
          setIsFollowing(data.followers?.includes(currentUser.uid) || false);
          
          // Fetch recent activity (latest vibes from this user)
          await fetchRecentActivity(userId);
          
          // Fetch user posts
          await fetchUserPosts(userId);
        } else {
          setProfile(null); // User not found
          toast.error('User profile not found');
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error('Error loading profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [currentUser, userId, router]);

  const fetchRecentActivity = async (userId) => {
    try {
      // Get all venues
      const venuesRef = collection(db, 'venues');
      const venuesSnap = await getDocs(venuesRef);
      const venues = venuesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Initialize array to collect user's feedbacks
      let allFeedbacks = [];
      
      // For each venue, check for feedbacks from this user
      for (const venue of venues) {
        const feedbacksRef = collection(db, `venues/${venue.id}/feedbacks`);
        const userFeedbacksQuery = query(feedbacksRef, where('userId', '==', userId));
        const feedbacksSnap = await getDocs(userFeedbacksQuery);
        
        if (!feedbacksSnap.empty) {
          const feedbacks = feedbacksSnap.docs.map(doc => ({
            id: doc.id,
            venueId: venue.id,
            venueName: venue.name,
            ...doc.data()
          }));
          
          allFeedbacks = [...allFeedbacks, ...feedbacks];
        }
      }
      
      // Sort by timestamp, newest first
      allFeedbacks.sort((a, b) => 
        b.timestamp?.toDate?.() - a.timestamp?.toDate?.() || 0
      );
      
      // Take only the most recent ones
      setRecentActivity(allFeedbacks.slice(0, 3));
    } catch (error) {
      console.error('Error fetching activity:', error);
    }
  };

  const fetchUserPosts = async (userId) => {
    try {
      // Query posts collection for posts by this user
      const postsRef = collection(db, 'posts');
      const q = query(
        postsRef, 
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(5)
      );
      
      const postsSnap = await getDocs(q);
      
      if (!postsSnap.empty) {
        const posts = [];
        
        // Process each post
        for (const postDoc of postsSnap.docs) {
          const postData = postDoc.data();
          
          // Fetch comments for this post
          const commentsQuery = query(
            collection(db, `posts/${postDoc.id}/comments`),
            orderBy('timestamp', 'asc'),
            limit(3) // Only get first 3 comments for preview
          );
          
          const commentsSnapshot = await getDocs(commentsQuery);
          const comments = commentsSnapshot.docs.map(commentDoc => ({
            id: commentDoc.id,
            ...commentDoc.data(),
            formattedTime: commentDoc.data().timestamp?.toDate().toLocaleString() || 'Just now'
          }));
          
          const post = {
            id: postDoc.id,
            ...postData,
            comments,
            formattedTime: postData.timestamp?.toDate?.() 
              ? new Date(postData.timestamp.toDate()).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'Just now',
            liked: postData.likes?.includes(currentUser.uid) || false,
            likeCount: postData.likes?.length || 0,
            commentCount: postData.commentCount || 0
          };
          
          posts.push(post);
        }
        
        setUserPosts(posts);
      } else {
        setUserPosts([]);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load posts');
    }
  };

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
        toast.success(`Unfollowed ${profile.username}`);
      } else {
        await updateDoc(userRef, {
          followers: arrayUnion(currentUser.uid),
        });
        await updateDoc(currentUserRef, {
          following: arrayUnion(userId),
        });
        setIsFollowing(true);
        toast.success(`Now following ${profile.username}`);
      }
      
      setProfile((prev) => ({
        ...prev,
        followers: isFollowing
          ? prev.followers.filter((id) => id !== currentUser.uid)
          : [...prev.followers, currentUser.uid],
      }));
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast.error('Failed to update follow status');
    }
  };

  const startDirectMessage = () => {
    if (!profile) return;
    
    // Generate a chat ID from both user IDs (sorted and joined to ensure consistency)
    const chatId = [currentUser.uid, userId].sort().join('_');
    
    // Navigate to the direct message page with this chat ID
    router.push(`/messages/${chatId}?recipient=${userId}&name=${profile.username}`);
  };

  // Handle post like
  const handleLikeToggle = async (postId, isLiked) => {
    try {
      const postRef = doc(db, 'posts', postId);
      
      if (isLiked) {
        // Unlike - Remove current user from likes array
        await updateDoc(postRef, {
          likes: arrayRemove(currentUser.uid),
          likeCount: increment(-1)
        });
      } else {
        // Like - Add current user to likes array
        await updateDoc(postRef, {
          likes: arrayUnion(currentUser.uid),
          likeCount: increment(1)
        });
        
        // If liking someone else's post, add a point to the post creator
        const postSnap = await getDoc(postRef);
        if (postSnap.exists() && postSnap.data().userId !== currentUser.uid) {
          const creatorRef = doc(db, 'users', postSnap.data().userId);
          await updateDoc(creatorRef, {
            points: increment(1)
          });
        }
      }
      
      // Update local state
      setUserPosts(prevPosts => 
        prevPosts.map(post => {
          if (post.id === postId) {
            return { 
              ...post, 
              liked: !isLiked,
              likeCount: isLiked ? post.likeCount - 1 : post.likeCount + 1
            };
          }
          return post;
        })
      );
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    }
  };

  const toggleCommentForm = (postId) => {
    setActiveCommentPostId(activeCommentPostId === postId ? null : postId);
  };

  const toggleExpandPost = (postId) => {
    setExpandedPost(expandedPost === postId ? null : postId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-t-4 border-indigo-500 border-solid rounded-full animate-spin"></div>
        <p className="mt-4 text-xl">Loading profile...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h2 className="text-xl font-semibold mb-4">Login Required</h2>
            <p className="text-gray-400 mb-6 text-center max-w-md">
              Please sign in to view user profiles
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
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h2 className="text-xl font-semibold mb-4">Profile Not Found</h2>
            <p className="text-gray-400 mb-6 text-center">
              The user profile you're looking for doesn't exist or has been removed.
            </p>
            <Link href="/dashboard">
              <Button>Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col p-4">
      <div className="container mx-auto max-w-2xl">
        <Link href="/dashboard" className="text-gray-300 hover:text-white inline-flex items-center mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
        </Link>
        
        {/* Profile Card */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 mb-6">
          <CardHeader className="pb-0">
            <div className="flex items-start justify-between">
              <CardTitle className="text-2xl font-semibold text-white">{profile.username}</CardTitle>
              <Badge className="bg-indigo-600/60 text-white">
                {profile.points} points
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="pt-4 space-y-6">
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
              <div className="flex flex-col items-center">
                <UserAvatar 
                  user={profile} 
                  size="xl" 
                  className="border-2 border-white/20"
                />
                
                <div className="flex items-center mt-2 text-sm text-gray-400">
                  <Calendar className="h-3 w-3 mr-1" />
                  Joined {profile.createdAt}
                </div>
              </div>
              
              <div className="flex-1 space-y-3">
                <p className="text-gray-200 text-sm">
                  {profile.bio || 'No bio yet'}
                </p>
                
                {profile.favoriteVenueName && (
                  <p className="text-gray-300 text-sm flex items-center">
                    <Star className="h-4 w-4 mr-1 text-yellow-500" />
                    Favorite Spot: <Link href={`/venues/${profile.favoriteVenueId}`} className="text-indigo-400 hover:text-indigo-300 ml-1">{profile.favoriteVenueName}</Link>
                  </p>
                )}
                
                <div className="flex gap-4">
                  <Link href={`/profile/${profile.id}/followers`} className="text-gray-300 text-sm flex flex-col items-center hover:text-indigo-300 transition-colors">
                    <span className="text-white font-bold">{profile.followers.length}</span>
                    <span>Followers</span>
                  </Link>
                  <Link href={`/profile/${profile.id}/following`} className="text-gray-300 text-sm flex flex-col items-center hover:text-indigo-300 transition-colors">
                    <span className="text-white font-bold">{profile.following.length}</span>
                    <span>Following</span>
                  </Link>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              {currentUser.uid !== userId && (
                <>
                  <Button
                    onClick={handleFollowToggle}
                    className={isFollowing ? "border-white/20 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white"}
                  >
                    {isFollowing ? (
                      <>
                        <Check className="h-4 w-4 mr-1" /> Following
                      </>
                    ) : (
                      <>
                        <Users className="h-4 w-4 mr-1" /> Follow
                      </>
                    )}
                  </Button>
                  
                  <Button onClick={startDirectMessage} className="bg-white/10 hover:bg-white/20 text-white">
                    <MessageSquare className="h-4 w-4 mr-1" /> Message
                  </Button>
                </>
              )}
              
              {currentUser.uid === userId && (
                <Link href="/settings" className="w-full">
                  <Button className="w-full">
                    <User className="h-4 w-4 mr-1" /> Edit Profile
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* User Posts Section */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 mb-6">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-white">
              {profile.username}'s Posts
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            {userPosts.length > 0 ? (
              <div className="space-y-4">
                {userPosts.map((post) => (
                  <div key={post.id} className="bg-white/5 p-4 rounded-lg border border-white/10">
                    {/* Post Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center">
                        <UserAvatar 
                          user={profile}
                          size="sm" 
                        />
                        <div className="ml-2">
                          <span className="font-medium text-white">{profile.username}</span>
                          <div className="text-xs text-gray-400 flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {post.formattedTime}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Post Content */}
                    <div className="mb-3">
                      {post.text && (
                        <p className="text-gray-200 whitespace-pre-wrap">
                          {expandedPost === post.id || post.text.length <= 250 
                            ? post.text 
                            : `${post.text.substring(0, 250)}...`}
                        </p>
                      )}
                      
                      {post.text && post.text.length > 250 && (
                        <button 
                          onClick={() => toggleExpandPost(post.id)}
                          className="text-indigo-400 hover:text-indigo-300 text-sm mt-1"
                        >
                          {expandedPost === post.id ? 'Show less' : 'Read more'}
                        </button>
                      )}
                      
                      {/* Post Image */}
                      {post.hasImage && post.imageURL && (
                        <div className="mt-3 rounded-lg overflow-hidden relative">
                          <img
                            src={post.imageURL}
                            alt="Post image"
                            className="w-full object-cover max-h-72"
                          />
                        </div>
                      )}
                    </div>
                    
                    {/* Post Actions */}
                    <div className="flex items-center space-x-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`hover:bg-white/10 flex items-center ${
                          post.liked ? 'text-red-500' : 'text-gray-400 hover:text-white'
                        }`}
                        onClick={() => handleLikeToggle(post.id, post.liked)}
                      >
                        <Heart className={`h-4 w-4 mr-1 ${post.liked ? 'fill-red-500' : ''}`} />
                        <span>{post.likeCount || 0}</span>
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`hover:bg-white/10 flex items-center ${
                          activeCommentPostId === post.id ? 'text-indigo-400' : 'text-gray-400 hover:text-white'
                        }`}
                        onClick={() => toggleCommentForm(post.id)}
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        <span>{post.commentCount || 0}</span>
                      </Button>
                    </div>
                    
                    {/* Preview Comments (if any) */}
                    {post.comments && post.comments.length > 0 && activeCommentPostId === post.id && (
                      <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
                        <h4 className="text-sm font-medium text-gray-300">Comments</h4>
                        
                        {post.comments.map((comment) => (
                          <div key={comment.id} className="flex space-x-2">
                            <UserAvatar 
                              user={{
                                username: comment.username,
                                photoURL: comment.photoURL || ''
                              }}
                              size="sm"
                              className="flex-shrink-0"
                            />
                            <div className="flex-1 bg-white/5 p-2 rounded-md">
                              <div className="flex justify-between items-center">
                                <Link href={`/profile/${comment.userId}`} className="text-sm font-medium text-white hover:underline">
                                  {comment.username}
                                </Link>
                                <span className="text-xs text-gray-400">
                                  {comment.formattedTime}
                                </span>
                              </div>
                              <p className="text-sm text-gray-300 mt-1">{comment.text}</p>
                            </div>
                          </div>
                        ))}
                        
                        {post.commentCount > post.comments.length && (
                          <Link href={`/posts/${post.id}`} className="block text-center text-indigo-400 hover:text-indigo-300 text-sm">
                            View all {post.commentCount} comments
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                
                {userPosts.length > 0 && (
                  <div className="mt-4 text-center">
                    <Link href={`/profile/${userId}/posts`}>
                      <Button variant="outline" className="w-full">View All Posts</Button>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-white/10 rounded-lg">
                <p className="text-gray-400">No posts yet.</p>
                {currentUser.uid === userId && (
                  <Link href="/dashboard">
                    <Button className="mt-3 bg-indigo-600 hover:bg-indigo-700">
                      Create Your First Post
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Recent Activity Section */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-white">Recent Activity</CardTitle>
          </CardHeader>
          
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="bg-white/5 p-3 rounded-lg border border-white/10">
                    <div className="flex justify-between items-start mb-1">
                      <Link href={`/venues/${activity.venueId}`} className="text-indigo-400 hover:text-indigo-300 font-medium">
                        {activity.venueName}
                      </Link>
                      <Badge className={`${getVibeColor(activity.rating)} text-white text-xs`}>
                        {activity.rating}/5
                      </Badge>
                    </div>
                    
                    <p className="text-gray-300 text-sm mb-1">
                      {activity.comment || <em className="text-gray-500">No comment</em>}
                    </p>
                    
                    <div className="text-xs text-gray-400 flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {activity.timestamp?.toDate 
                        ? activity.timestamp.toDate().toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) 
                        : 'Unknown time'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-white/10 rounded-lg">
                <p className="text-gray-400">No recent activity found.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Helper function to determine vibe color based on rating
function getVibeColor(score) {
  if (!score || score === 0) return 'bg-gray-600';
  
  const numScore = parseFloat(score);
  if (numScore <= 2) return 'bg-green-600'; // Quiet
  if (numScore <= 4) return 'bg-yellow-600'; // Moderate
  return 'bg-red-600'; // Busy
}