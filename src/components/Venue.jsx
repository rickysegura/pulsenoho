'use client';

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import StatusUpdateForm from './StatusUpdateForm';

export default function Venue({ venue }) {
  const [showForm, setShowForm] = useState(false);
  const { currentUser } = useAuth();

  return (
    <div style={{ border: '1px solid #ccc', padding: '10px', margin: '10px 0' }}>
      <h2>{venue.name}</h2>
      <p>Type: {venue.type}</p>
      <p>Status: {venue.current_status || 'Unknown'}</p>
      {currentUser && (
        <button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Hide Form' : 'Update Status'}
        </button>
      )}
      {showForm && <StatusUpdateForm venueId={venue.id} />}
    </div>
  );
}