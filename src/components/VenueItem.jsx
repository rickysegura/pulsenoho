// Simplified VenueItem to fix duplicate keys and count issues
function VenueItem({ venue }) {
    const [showVibes, setShowVibes] = useState(false);
    const [vibes, setVibes] = useState([]);
    const [busynessScore, setBusynessScore] = useState('Loading...');
    const [vibeCount, setVibeCount] = useState(0);
    const { currentUser } = useAuth();
    const [submittedVibe, setSubmittedVibe] = useState(null);
    const [processingVibe, setProcessingVibe] = useState(false);
  
    // Handle new vibe submission
    const handleVibeSubmit = async (rating, comment) => {
      if (!venue?.id || !currentUser || processingVibe) return false;
      
      setProcessingVibe(true);
      
      try {
        // Create vibe data
        const feedbackData = {
          userId: currentUser.uid,
          rating: Number(rating),
          comment: comment.trim() || '',
          timestamp: serverTimestamp()
        };
        
        // Add document to Firestore
        const docRef = await addDoc(collection(db, `venues/${venue.id}/feedbacks`), feedbackData);
        
        // Update user points
        const userRef = doc(db, 'users', currentUser.uid);
        await setDoc(userRef, { points: increment(1) }, { merge: true });
        
        // Update local state for immediate UI feedback
        const newVibe = {
          id: `temp-${Date.now()}`, // Temporary unique ID
          ...feedbackData,
          timestamp: { seconds: Date.now() / 1000 }, // Local timestamp
          username: currentUser.email?.split('@')[0] || 'You',
          time: new Date().toLocaleTimeString(),
          justAdded: true
        };
        
        // Show vibes if hidden
        if (!showVibes) setShowVibes(true);
        
        // Increment count immediately
        setVibeCount(prev => prev + 1);
        
        // Set as submitted so it shows up immediately
        setSubmittedVibe(newVibe);
        
        toast.success('Vibe posted! +1 point');
        return true;
      } catch (error) {
        console.error('Error submitting vibe:', error);
        toast.error(`Failed to post vibe: ${error.message}`);
        return false;
      } finally {
        setProcessingVibe(false);
      }
    };
  
    // Fetch vibes from Firestore
    useEffect(() => {
      if (!venue?.id || !currentUser) return;
      
      console.log(`Setting up feedback listener for venue ${venue.id}`);
      const feedbacksRef = collection(db, `venues/${venue.id}/feedbacks`);
      
      const unsubscribe = onSnapshot(
        feedbacksRef,
        snapshot => {
          // Update vibe count directly from snapshot
          setVibeCount(snapshot.docs.length);
          console.log(`Venue ${venue.id} has ${snapshot.docs.length} vibes`);
          
          // Only process details if vibes are shown
          if (showVibes) {
            // Extract all vibes from snapshot
            const firestoreVibes = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            // Process vibes without user data first for speed
            processVibes(firestoreVibes);
          }
        },
        error => {
          console.error(`Error in feedback listener for venue ${venue.id}:`, error);
          setBusynessScore('Error');
        }
      );
      
      return () => unsubscribe();
    }, [venue?.id, currentUser]);
    
    // Process vibe data when visible
    useEffect(() => {
      if (!venue?.id || !currentUser || !showVibes) return;
      
      // Function to fetch vibe details
      const fetchVibeDetails = async () => {
        try {
          // Get raw vibes first
          const q = query(
            collection(db, `venues/${venue.id}/feedbacks`),
            orderBy('timestamp', 'desc'),
            limit(5)
          );
          
          const snapshot = await getDocs(q);
          const feedbackData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // Process vibes
          processVibes(feedbackData);
        } catch (error) {
          console.error("Error fetching vibe details:", error);
        }
      };
      
      fetchVibeDetails();
    }, [venue?.id, currentUser, showVibes]);
    
    // Process vibes and add user data
    const processVibes = async (feedbackData) => {
      try {
        // Calculate busyness score
        if (feedbackData.length > 0) {
          const ratings = feedbackData.map(item => item.rating || 0);
          const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
          setBusynessScore(avg.toFixed(1));
        } else {
          setBusynessScore('No data');
        }
        
        // Process vibes and add user data
        const vibesWithUserInfo = await Promise.all(
          feedbackData
            .sort((a, b) => {
              if (!a.timestamp || !b.timestamp) return 0;
              const aTime = a.timestamp.seconds || 0;
              const bTime = b.timestamp.seconds || 0;
              return bTime - aTime; // Newest first
            })
            .slice(0, 5) // Only process 5 most recent
            .map(async (feedback) => {
              try {
                if (!feedback.userId) return { 
                  ...feedback, 
                  username: 'Anonymous',
                  time: formatTime(feedback.timestamp)
                };
                
                const userRef = doc(db, 'users', feedback.userId);
                const userSnap = await getDoc(userRef);
                const userData = userSnap.exists() ? userSnap.data() : {};
                
                return {
                  ...feedback,
                  username: userData.username || feedback.userId.slice(0, 6),
                  photoURL: userData.photoURL || '',
                  time: formatTime(feedback.timestamp)
                };
              } catch (err) {
                console.error("Error processing vibe:", err);
                return { 
                  ...feedback, 
                  username: 'User', 
                  time: formatTime(feedback.timestamp)
                };
              }
            })
        );
        
        // Create final list with unique IDs
        let finalVibes = [...vibesWithUserInfo];
        
        // Add submitted vibe if it's not in the list yet
        if (submittedVibe && !finalVibes.some(v => 
          v.userId === submittedVibe.userId && 
          v.comment === submittedVibe.comment &&
          v.rating === submittedVibe.rating)) {
          finalVibes.unshift(submittedVibe);
        } else if (submittedVibe) {
          // Found the submitted vibe in real data, clear it
          setSubmittedVibe(null);
        }
        
        // Ensure unique keys by adding index if needed
        finalVibes = finalVibes.map((vibe, index) => {
          if (!vibe.id) return { ...vibe, id: `missing-id-${index}` };
          return vibe;
        });
        
        setVibes(finalVibes);
      } catch (error) {
        console.error("Error processing vibes:", error);
      }
    };
    
    // Format timestamp for display
    const formatTime = (timestamp) => {
      if (!timestamp) return 'Unknown';
      if (timestamp.toDate) return timestamp.toDate().toLocaleTimeString();
      if (timestamp.seconds) {
        return new Date(timestamp.seconds * 1000).toLocaleTimeString();
      }
      return 'Unknown';
    };
  
    // Get color based on busyness
    const getVibeColor = (score) => {
      if (score === 'No data' || score === 'Loading...' || score === 'Error') 
        return 'bg-gray-600';
        
      const numScore = parseFloat(score);
      if (numScore <= 2) return 'bg-green-600'; // Quiet
      if (numScore <= 4) return 'bg-yellow-600'; // Moderate
      return 'bg-red-600'; // Busy
    };
  
    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-medium text-white">
              {venue.name} <span className="text-gray-400 text-sm">({venue.type})</span>
            </h3>
            <p className="text-gray-300 mt-1">
              Busyness:{' '}
              <Badge
                variant="outline"
                className={`text-white border-white/20 ${getVibeColor(busynessScore)}`}
              >
                {busynessScore}
              </Badge>{' '}
              <span className="text-sm">({vibeCount} vibes)</span>
            </p>
          </div>
          <StatusUpdateForm 
            venueId={venue.id} 
            onSubmit={handleVibeSubmit}
            isSubmitting={processingVibe}
          />
        </div>
        
        {/* Vibes dropdown */}
        <div className="mt-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-300 hover:text-white text-sm p-0 flex items-center gap-1"
            onClick={() => setShowVibes(!showVibes)}
          >
            <span>Recent Vibes {vibeCount > 0 ? `(${Math.min(vibeCount, 5)})` : ''}</span>
            {showVibes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          
          {showVibes && (
            <div className="mt-2 space-y-2 max-h-60 overflow-y-auto p-1 vibe-checks">
              {vibes.length > 0 ? (
                vibes.map((vibe, index) => (
                  <div
                    key={`${vibe.id}-${index}`} // Guarantee uniqueness with index
                    className={`flex items-start gap-2 p-2 rounded-lg border ${
                      vibe.justAdded 
                        ? 'bg-green-900/30 border-green-500/30 animate-pulse' 
                        : 'bg-gray-800/50 border-white/10'
                    }`}
                  >
                    {vibe.photoURL && (
                      <Image
                        src={vibe.photoURL}
                        alt={`${vibe.username}'s avatar`}
                        width={24}
                        height={24}
                        className="rounded-full border border-white/20"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-white text-xs">{vibe.username}</span>
                        <div className="flex items-center gap-2">
                          <Badge className={`${getVibeColor((vibe.rating || 0).toString())} text-white text-xs`}>
                            {vibe.rating || 0}/5
                          </Badge>
                          <span className="text-gray-400 text-xs">{vibe.time}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-300 break-words">
                        {vibe.comment || <em className="text-gray-500 text-xs">No comment</em>}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-sm text-center py-2">No vibes reported yet</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }