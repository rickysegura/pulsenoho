// src/app/page.js
'use client';

import { useState } from 'react';
import VenueList from '../components/VenueList';
import AuthComponent from '../components/AuthComponent';
import UserProfile from '../components/UserProfile';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs'; // Add Tabs from Shadcn

export default function Home() {
  const [sortMode, setSortMode] = useState('hot'); // Default sort mode

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col p-4">
      {/* Header */}
      <header className="w-full max-w-5xl mx-auto mb-6">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6 text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            NoHo Live
          </h1>
          <p className="text-lg text-gray-300 mt-2">
            Your vibe check for North Hollywood nights
          </p>
        </div>
      </header>

      <div className="w-full max-w-5xl mx-auto flex flex-col md:flex-row gap-6">
        {/* Main Feed */}
        <main className="flex-1">
          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-2xl font-semibold">
                  Venue Vibes
                </CardTitle>
                {/* Sort Tabs */}
                <Tabs value={sortMode} onValueChange={setSortMode}>
                  <TabsList className="bg-white/10">
                    <TabsTrigger value="hot" className="text-white">Hot</TabsTrigger>
                    <TabsTrigger value="new" className="text-white">New</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              <VenueList sortMode={sortMode} />
            </CardContent>
          </Card>
        </main>

        {/* Sidebar */}
        <aside className="w-full md:w-80 flex flex-col gap-6">
          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">
                Your Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UserProfile />
            </CardContent>
          </Card>
          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">
                Join the Party
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AuthComponent />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}