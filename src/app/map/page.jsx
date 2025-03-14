'use client';

import { useState, useContext } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { useAuth } from '../../contexts/AuthContext';
import { MapContext } from '../ClientLayout';
import Heatmap from '../../components/Heatmap';
import Footer from '../../components/Footer';

export default function HeatmapPage() {
  const router = useRouter();
  const { isMapLoaded } = useContext(MapContext);
  const { currentUser, loading: authLoading } = useAuth();
  const [showMap, setShowMap] = useState(false);

  // Only show map when Google Maps is loaded and auth state is determined
  useState(() => {
    if (isMapLoaded && !authLoading) {
      setShowMap(true);
    }
  }, [isMapLoaded, authLoading]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Link href="/dashboard" className="mr-3">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Live Venue Map</h1>
        </div>

        <Card className="bg-white/5 backdrop-blur-sm border-white/10 p-4 mb-6">
          <p className="text-gray-300">
            This map shows real-time busyness levels for venues in North Hollywood. 
            Click on a venue marker to see more details and recent updates.
          </p>
        </Card>

        {/* Heatmap */}
        <div className="w-full">
          {showMap ? (
            <Heatmap isLoaded={isMapLoaded} />
          ) : (
            <div className="w-full h-96 bg-gradient-to-b from-indigo-900 to-gray-900 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="animate-pulse">
                  <h2 className="text-xl font-semibold text-white/80">Loading map...</h2>
                  <p className="text-gray-400">Please wait while we fetch venue data</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-center">
          <Link href="/venues">
            <Button className="text-white bg-gray-700 border-white/20 hover:bg-white/10">
              View All Venues
            </Button>
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}