// src/components/social/CommentForm.jsx
'use client';

import { useState } from 'react';
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'react-hot-toast';
import { Send } from 'lucide-react';

export default function CommentForm({ 
  postId, 
  commentId = null,
  currentUser, 
  refreshUserDetails,
  onCommentSubmitted,
  placeholder = "Add a comment..."
}) {
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const handleCommentSubmit = async () => {
    if (!commentText.trim() || submitting) return;
    
    setSubmitting(true);
    
    try {
      console.log(`Attempting to add ${commentId ? 'reply' : 'comment'} to post ${postId}`);
      
      // Only store userId, not username
      const comment = {
        text: commentText.trim(),
        userId: currentUser.uid,
        timestamp: serverTimestamp()
      };
      
      // If commentId is provided, add a reply to the comment instead of a new comment
      let commentRef;
      if (commentId) {
        // This is a reply to a comment
        commentRef = await addDoc(
          collection(db, `posts/${postId}/comments/${commentId}/replies`), 
          comment
        );
        console.log('Reply added successfully');
      } else {
        // This is a new comment on the post
        commentRef = await addDoc(collection(db, `posts/${postId}/comments`), comment);
        console.log('Comment added successfully');
        
        // Only update post comment count for top-level comments, not replies
        const postRef = doc(db, 'posts', postId);
        await updateDoc(postRef, {
          commentCount: increment(1) // Use increment for atomic operation
        });
        console.log('Post comment count updated successfully');
      }
      
      // Get post creator to add points (if commenting on someone else's post)
      const postRef = doc(db, 'posts', postId);
      const postSnap = await getDoc(postRef);
      
      if (postSnap.exists() && postSnap.data().userId !== currentUser.uid) {
        const creatorRef = doc(db, 'users', postSnap.data().userId);
        try {
          await updateDoc(creatorRef, {
            points: increment(1) // Use increment here too for atomic operation
          });
          console.log('Creator points updated successfully');
        } catch (pointsError) {
          console.error('Error updating creator points (but comment was successful):', pointsError);
          // Don't show toast error for this - the comment itself was successful
        }
      }
      
      // Add a point to the commenter
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          points: increment(1) // Use increment here too for atomic operation
        });
        console.log('Commenter points updated successfully');
        
        // Make sure we have latest user details
        refreshUserDetails(currentUser.uid);
      } catch (pointsError) {
        console.error('Error updating commenter points (but comment was successful):', pointsError);
        // Don't show toast error for this - the comment itself was successful
      }
      
      setCommentText('');
      onCommentSubmitted && onCommentSubmitted();
      toast.success(`${commentId ? 'Reply' : 'Comment'} added! +1 point`);
    } catch (error) {
      console.error(`Error in handleCommentSubmit for ${commentId ? 'reply' : 'comment'}:`, error);
      toast.error(`Failed to add ${commentId ? 'reply' : 'comment'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex space-x-2">
      <Input
        value={commentText}
        onChange={(e) => setCommentText(e.target.value)}
        placeholder={placeholder}
        className="bg-white/10 border-white/20 text-white flex-1"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleCommentSubmit();
          }
        }}
      />
      <Button 
        onClick={handleCommentSubmit}
        className="bg-indigo-600 hover:bg-indigo-700"
        disabled={!commentText.trim() || submitting}
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}