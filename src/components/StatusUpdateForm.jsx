// src/components/StatusUpdateForm.js - With callback support
'use client';

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Slider } from './ui/slider';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'react-hot-toast';

export default function StatusUpdateForm({ venueId, onSubmit }) {
  const [rating, setRating] = useState(3);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currentUser } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!rating || !currentUser || !venueId) {
      toast.error('Missing required information');
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      // If parent provided an onSubmit handler, use it
      if (typeof onSubmit === 'function') {
        const success = await onSubmit(rating, comment);
        if (success) {
          // Reset form only on success
          setComment('');
          setRating(3);
        }
      } else {
        // No handler provided - show error
        console.error('No onSubmit handler provided to StatusUpdateForm');
        toast.error('Cannot submit vibe - configuration error');
      }
    } catch (error) {
      console.error('Error in StatusUpdateForm:', error);
      toast.error(`Failed to post vibe: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-start space-y-2 w-full max-w-xs">
      <label className="text-white text-sm">
        Busyness (1 = Quiet, 5 = Busy)
      </label>
      <Slider
        min={1}
        max={5}
        step={1}
        value={[rating]}
        onValueChange={(value) => setRating(value[0])}
        className="w-32"
      />
      <Input
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="What's the vibe like?"
        className="bg-white/10 border-white/20 text-white w-full"
        maxLength={100}
      />
      <Button
        type="submit"
        className="bg-white/20 text-white hover:bg-white/30"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Posting...' : 'Post Vibe'}
      </Button>
    </form>
  );
}