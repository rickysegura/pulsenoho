'use client';

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, addDoc, serverTimestamp, doc, setDoc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Button } from './ui/button';
import { Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function StatusUpdateForm({ venueId, onSubmit, className }) {
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(3);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { currentUser } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser || !venueId) return;
    
    setSubmitting(true);
    
    try {
      // Add feedback document
      const feedbackData = {
        userId: currentUser.uid,
        rating: Number(rating),
        comment: comment || '',
        timestamp: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, `venues/${venueId}/feedbacks`), feedbackData);
      
      // Update user points
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, {
        points: increment(1)
      }, { merge: true });
      
      toast.success('Vibe posted! +1 point');
      
      // Reset form
      setComment('');
      setShowForm(false);
      
      // Notify parent component if needed
      if (typeof onSubmit === 'function') {
        onSubmit(rating, comment);
      }
    } catch (error) {
      console.error('Error submitting vibe:', error);
      toast.error(`Failed to post vibe: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentUser) {
    return (
      <Button disabled className="opacity-50 cursor-not-allowed">
        <Lock className="h-3.5 w-3.5 mr-1" />
        Add Vibe
      </Button>
    );
  }

  return (
    <div className={className}>
      <Button 
        onClick={() => setShowForm(!showForm)}
        className={showForm ? "bg-gray-700 hover:bg-gray-600" : ""}
      >
        {showForm ? 'Cancel' : 'Add Vibe'}
      </Button>
      
      {showForm && (
        <div className="mt-3 p-3 rounded-lg bg-gray-800/70 border border-white/10">
          <form onSubmit={handleSubmit}>
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
  );
}