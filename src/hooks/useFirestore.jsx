// src/hooks/useFirestore.js
import { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  Timestamp,
  getDoc,
  doc
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// Hook for getting a single document with real-time updates
export function useDocument(collectionName, docId, dependencies = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!docId || !collectionName) {
      setData(null);
      setLoading(false);
      return;
    }

    const docRef = doc(db, collectionName, docId);
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setData({ id: docSnap.id, ...docSnap.data() });
        } else {
          setData(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error(`Error in useDocument(${collectionName}/${docId}):`, err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName, docId, ...dependencies]);

  return { data, loading, error };
}

// Hook for getting a collection with real-time updates
export function useCollection(collectionName, queryConstraints = [], dependencies = []) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!collectionName) {
      setData([]);
      setLoading(false);
      return;
    }

    const collectionRef = collection(db, collectionName);
    const q = queryConstraints.length > 0 
      ? query(collectionRef, ...queryConstraints) 
      : collectionRef;

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setData(items);
        setLoading(false);
      },
      (err) => {
        console.error(`Error in useCollection(${collectionName}):`, err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName, JSON.stringify(queryConstraints), ...dependencies]);

  return { data, loading, error };
}

// Hook for recent feedback data (last hour)
export function useRecentFeedback(venueId, dependencies = []) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!venueId) {
      setData([]);
      setLoading(false);
      return;
    }

    const feedbacksRef = collection(db, `venues/${venueId}/feedbacks`);
    const oneHourAgo = Timestamp.fromDate(new Date(Date.now() - 60 * 60 * 1000));
    const q = query(feedbacksRef, where('timestamp', '>', oneHourAgo));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const feedbacks = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setData(feedbacks);
        setLoading(false);
      },
      (err) => {
        console.error(`Error in useRecentFeedback(${venueId}):`, err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [venueId, ...dependencies]);

  return { data, loading, error };
}

// Hook for getting user data with feedback joined
export function useFeedbackWithUserData(venueId, dependencies = []) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!venueId) {
      setData([]);
      setLoading(false);
      return;
    }

    const feedbacksRef = collection(db, `venues/${venueId}/feedbacks`);
    
    const unsubscribe = onSnapshot(
      feedbacksRef,
      async (snapshot) => {
        try {
          const feedbacksWithUserData = await Promise.all(
            snapshot.docs.map(async (docSnapshot) => {
              const feedbackData = docSnapshot.data();
              // Only fetch user data if userId exists
              if (feedbackData.userId) {
                try {
                  const userRef = doc(db, 'users', feedbackData.userId);
                  const userSnap = await getDoc(userRef);
                  const userData = userSnap.exists() ? userSnap.data() : {};
                  
                  return {
                    id: docSnapshot.id,
                    ...feedbackData,
                    username: userData.username || feedbackData.userId.slice(0, 6),
                    photoURL: userData.photoURL || '',
                    timestampFormatted: feedbackData.timestamp?.toDate 
                      ? feedbackData.timestamp.toDate().toLocaleTimeString() 
                      : 'N/A'
                  };
                } catch (err) {
                  console.error(`Error fetching user data for feedback:`, err);
                  return {
                    id: docSnapshot.id,
                    ...feedbackData,
                    username: feedbackData.userId.slice(0, 6),
                    photoURL: '',
                    timestampFormatted: feedbackData.timestamp?.toDate 
                      ? feedbackData.timestamp.toDate().toLocaleTimeString() 
                      : 'N/A'
                  };
                }
              } else {
                return {
                  id: docSnapshot.id,
                  ...feedbackData,
                  username: 'Anonymous',
                  photoURL: '',
                  timestampFormatted: feedbackData.timestamp?.toDate 
                    ? feedbackData.timestamp.toDate().toLocaleTimeString() 
                    : 'N/A'
                };
              }
            })
          );
          
          setData(feedbacksWithUserData);
          setLoading(false);
        } catch (err) {
          console.error(`Error processing feedbacks with user data:`, err);
          setError(err);
          setLoading(false);
        }
      },
      (err) => {
        console.error(`Error in useFeedbackWithUserData(${venueId}):`, err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [venueId, ...dependencies]);

  return { data, loading, error };
}