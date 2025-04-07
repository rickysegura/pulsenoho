// src/components/social/SocialFeed.jsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, limit, onSnapshot, doc, getDoc, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { addSnapshot } from '../lib/snapshotManager';
import { toast } from 'react-hot-toast';
import PostForm from './PostForm';
import Post from './Post';

export default function SocialFeed() {
  const { currentUser } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userDetails, setUserDetails] = useState({});
  const [viewMode, setViewMode] = useState('all'); // 'all', 'following', 'popular'
  
  // Load posts
  useEffect(() => {
    if (!currentUser) return;
    
    const loadPostsBasedOnViewMode = () => {
      let postsQuery;
      
      if (viewMode === 'following' && currentUser) {
        // First fetch current user to get following list
        const fetchFollowingPosts = async () => {
          try {
            const userRef = doc(db, 'users', currentUser.uid);
            const userSnap = await getDoc(userRef);
            const userFollowing = userSnap.exists() ? userSnap.data().following || [] : [];
            
            // Include the current user in the list of users to fetch posts from
            const usersToFetch = [...userFollowing, currentUser.uid];
            
            if (usersToFetch.length === 0) {
              setPosts([]);
              setLoading(false);
              return;
            }
            
            // Query posts from users the current user is following and the user's own posts
            postsQuery = query(
              collection(db, 'posts'),
              where('userId', 'in', usersToFetch),
              orderBy('timestamp', 'desc'),
              limit(20)
            );
            
            subscribeToQuery(postsQuery);
          } catch (error) {
            console.error('Error fetching following posts:', error);
            setLoading(false);
            toast.error('Failed to load posts');
          }
        };
        
        fetchFollowingPosts();
        return;
      } else if (viewMode === 'popular') {
        // Get posts with most likes
        postsQuery = query(
          collection(db, 'posts'),
          orderBy('likeCount', 'desc'),
          limit(20)
        );
      } else {
        // Default: all posts sorted by timestamp
        postsQuery = query(
          collection(db, 'posts'),
          orderBy('timestamp', 'desc'),
          limit(20)
        );
      }
      
      subscribeToQuery(postsQuery);
    };
    
    // Helper function to subscribe to a posts query
    const subscribeToQuery = (postsQuery) => {
      const unsubscribe = onSnapshot(postsQuery, async (snapshot) => {
        try {
          const fetchedPosts = await Promise.all(
            snapshot.docs.map(async (postDoc) => {
              const postData = postDoc.data();
              
              // Fetch user details if not already in state
              if (!userDetails[postData.userId]) {
                await fetchUserDetails(postData.userId);
              }
              
              // Fetch comments for this post
              const commentsQuery = query(
                collection(db, `posts/${postDoc.id}/comments`),
                orderBy('timestamp', 'asc')
              );
              
              const commentsSnapshot = await getDocs(commentsQuery);
              const comments = await Promise.all(
                commentsSnapshot.docs.map(async (commentDoc) => {
                  const commentData = commentDoc.data();
                  
                  // Fetch user details for comment if not already in state
                  if (!userDetails[commentData.userId]) {
                    await fetchUserDetails(commentData.userId);
                  }
                  
                  // Fetch replies to this comment
                  const repliesQuery = query(
                    collection(db, `posts/${postDoc.id}/comments/${commentDoc.id}/replies`),
                    orderBy('timestamp', 'asc')
                  );
                  
                  const repliesSnapshot = await getDocs(repliesQuery);
                  const replies = await Promise.all(
                    repliesSnapshot.docs.map(async (replyDoc) => {
                      const replyData = replyDoc.data();
                      
                      // Fetch user details for reply if not already in state
                      if (!userDetails[replyData.userId]) {
                        await fetchUserDetails(replyData.userId);
                      }
                      
                      return {
                        id: replyDoc.id,
                        ...replyData,
                        formattedTime: replyData.timestamp?.toDate().toLocaleString() || 'Just now'
                      };
                    })
                  );
                  
                  return {
                    id: commentDoc.id,
                    ...commentData,
                    replies,
                    formattedTime: commentData.timestamp?.toDate().toLocaleString() || 'Just now'
                  };
                })
              );
              
              return {
                id: postDoc.id,
                ...postData,
                comments,
                formattedTime: postData.timestamp?.toDate().toLocaleString() || 'Just now',
                liked: postData.likes?.includes(currentUser.uid) || false,
                likeCount: postData.likes?.length || 0
              };
            })
          );
          
          setPosts(fetchedPosts);
          setLoading(false);
        } catch (error) {
          console.error('Error processing posts:', error);
          setLoading(false);
        }
      });
      
      addSnapshot(unsubscribe);
    };
    
    loadPostsBasedOnViewMode();
  }, [currentUser, viewMode, userDetails]);
  
  // Helper function to fetch and store user details
  const fetchUserDetails = async (userId) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        setUserDetails(prev => ({
          ...prev,
          [userId]: {
            username: userData.username || 'User',
            photoURL: userData.photoURL || '',
            points: userData.points || 0,
            isCurrentUserFollowing: userData.followers?.includes(currentUser.uid) || false
          }
        }));
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  // Re-fetch a user's details when we need to update username
  const refreshUserDetails = async (userId) => {
    await fetchUserDetails(userId);
  };

  return (
    <Card className="bg-white/5 backdrop-blur-sm border-white/10">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-white">Recent Activity</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* New Post Form */}
        <PostForm refreshUserDetails={refreshUserDetails} />
        
        {/* View Mode Tabs */}
        <div className="flex space-x-2">
          <Button
            onClick={() => setViewMode('all')}
            size="sm"
            className={viewMode === 'all' ? 'bg-indigo-600 hover:bg-indigo-700' : 'border-white/20 text-white'}
          >
            All
          </Button>
          <Button
            onClick={() => setViewMode('following')}
            size="sm"
            className={viewMode === 'following' ? 'bg-indigo-600 hover:bg-indigo-700' : 'border-white/20 text-white'}
          >
            Following
          </Button>
          <Button
            onClick={() => setViewMode('popular')}
            size="sm"
            className={viewMode === 'popular' ? 'bg-indigo-600 hover:bg-indigo-700' : 'border-white/20 text-white'}
          >
            Popular
          </Button>
        </div>
        
        {/* Posts Feed */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white/5 rounded-lg p-4 animate-pulse">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/10 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/10 rounded w-1/4"></div>
                    <div className="h-3 bg-white/10 rounded w-1/6"></div>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="h-4 bg-white/10 rounded w-full"></div>
                  <div className="h-4 bg-white/10 rounded w-4/5"></div>
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-white/10 rounded-lg">
            <p className="text-gray-400 mb-2">
              {viewMode === 'following' 
                ? "You're not following anyone yet, or they haven't posted anything." 
                : "No posts yet. Be the first to share!"}
            </p>
            {viewMode === 'following' && (
              <Button 
                onClick={() => setViewMode('all')}
                className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Discover People
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <Post 
                key={post.id} 
                post={post} 
                currentUser={currentUser} 
                userDetails={userDetails}
                refreshUserDetails={refreshUserDetails}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}