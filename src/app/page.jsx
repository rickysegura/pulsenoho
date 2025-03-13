'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Link from 'next/link';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import Footer from '../components/Footer';
import { ArrowRight, MapPin, Clock, Star, Users, Shield } from 'lucide-react';

export default function LandingPage() {
  const { currentUser, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Handle hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Hero Section */}
      <section className="relative w-full px-4 py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/80 to-purple-900/80 z-0"></div>
        
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden z-0">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-indigo-600/20 rounded-full filter blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/20 rounded-full filter blur-3xl"></div>
        </div>
        
        <div className="container mx-auto relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white mb-6 drop-shadow-md">
              NoHo Live 🚦
            </h1>
            <p className="text-xl md:text-2xl text-gray-200 mb-8">
              Check the vibe before you arrive. Real-time busyness levels for North Hollywood venues.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              {currentUser ? (
                <Link href="/dashboard">
                  <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6">
                    Go to Dashboard <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6">
                      Log In
                    </Button>
                  </Link>
                  <Link href="/signup">
                    <Button size="lg" className="text-white border-white hover:bg-white/10 px-6">
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-gray-800/50">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-indigo-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="h-8 w-8 text-indigo-400" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Find Venues</h3>
                <p className="text-gray-300">
                  Discover the best spots in North Hollywood with our interactive map and venue listings.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-indigo-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-8 w-8 text-indigo-400" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Check Busyness</h3>
                <p className="text-gray-300">
                  See real-time busyness levels reported by the community. Never walk into a packed venue again!
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-indigo-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="h-8 w-8 text-indigo-400" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Share Vibes</h3>
                <p className="text-gray-300">
                  Help the community by reporting your experience. Earn points and build your profile.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="md:w-1/2">
              <h2 className="text-3xl font-bold mb-4">Join Our Community</h2>
              <p className="text-gray-300 mb-6">
                Connect with other NoHo locals, discover hidden gems, and share your favorite spots. 
                Our community-driven approach ensures you always have the most current information.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <Users className="h-5 w-5 text-indigo-400 mt-1 mr-3" />
                  <p className="text-gray-300">Share your experiences and help others find the perfect spot</p>
                </div>
                <div className="flex items-start">
                  <Shield className="h-5 w-5 text-indigo-400 mt-1 mr-3" />
                  <p className="text-gray-300">Earn points and build your reputation within the community</p>
                </div>
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-indigo-400 mt-1 mr-3" />
                  <p className="text-gray-300">Discover new venues with recommendations from locals</p>
                </div>
              </div>
              
              {!currentUser && (
                <div className="mt-8">
                  <Link href="/signup">
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                      Join Now
                    </Button>
                  </Link>
                </div>
              )}
            </div>
            
            <div className="md:w-1/2">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
                <div className="space-y-4">
                  {/* Simulated community vibes */}
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 bg-indigo-700 text-white rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold">A</span>
                      </div>
                      <div>
                        <div className="flex justify-between">
                          <p className="text-sm font-medium text-white">Alex</p>
                          <div className="bg-green-600 text-white text-xs rounded px-2 py-0.5">2/5</div>
                        </div>
                        <p className="text-sm text-gray-300 mt-1">Republic of Pie is quiet today! Perfect for getting some work done.</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 bg-purple-700 text-white rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold">M</span>
                      </div>
                      <div>
                        <div className="flex justify-between">
                          <p className="text-sm font-medium text-white">Mia</p>
                          <div className="bg-yellow-600 text-white text-xs rounded px-2 py-0.5">3/5</div>
                        </div>
                        <p className="text-sm text-gray-300 mt-1">Idle Hour is getting busy! Great atmosphere for happy hour.</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 bg-blue-700 text-white rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold">J</span>
                      </div>
                      <div>
                        <div className="flex justify-between">
                          <p className="text-sm font-medium text-white">Jason</p>
                          <div className="bg-red-600 text-white text-xs rounded px-2 py-0.5">5/5</div>
                        </div>
                        <p className="text-sm text-gray-300 mt-1">Federal Bar is packed tonight! Live music is amazing though.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Call to Action */}
      <section className="py-12 px-4 bg-gradient-to-r from-indigo-800 to-purple-800">
        <div className="container mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to explore NoHo?</h2>
          <p className="text-xl text-white/80 mb-6">Join NoHo Live and discover the best spots in town.</p>
          
          <div className="flex flex-wrap justify-center gap-4">
            {currentUser ? (
              <Link href="/dashboard">
                <Button size="lg" className="bg-white text-indigo-800 hover:bg-white/90 px-6">
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button size="lg" className="bg-white text-indigo-800 hover:bg-white/90 px-6">
                    Log In
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="lg" className="text-white border-white hover:bg-white/10 px-6">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}