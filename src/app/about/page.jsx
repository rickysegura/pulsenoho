import Link from 'next/link';
import { Github, Mail, ArrowLeft, Code, MapPin, Coffee, Users } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import Footer from '../../components/Footer';

export default function About() {
    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Hero Section */}
            <section className="relative w-full px-4 py-16 md:py-24 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/80 to-purple-900/80 z-0"></div>
                
                {/* Decorative elements */}
                <div className="absolute inset-0 overflow-hidden z-0">
                    <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-indigo-600/20 rounded-full filter blur-3xl"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/20 rounded-full filter blur-3xl"></div>
                </div>
            
                <div className="container mx-auto relative z-10">
                    <Link href="/" className="text-gray-300 hover:text-white inline-flex items-center mb-8">
                        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Home
                    </Link>
                    
                    <div className="max-w-3xl mx-auto text-center">
                        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">About PulseNoHo</h1>
                        <p className="text-xl text-gray-300 mb-8">Discover the vibe of North Hollywood, one venue at a time</p>
                    </div>
                </div>
            </section>
            
            {/* Project Description */}
            <section className="py-12 px-4 relative">
                <div className="container mx-auto max-w-4xl">
                    <Card className="bg-white/5 backdrop-blur-sm border-white/10 mb-12">
                        <CardContent className="p-8">
                            <h2 className="text-2xl font-semibold mb-6 flex items-center">
                                <MapPin className="h-6 w-6 mr-2 text-indigo-400" /> 
                                About The Project
                            </h2>
                            
                            <div className="space-y-4 text-gray-300">
                                <p>
                                    PulseNoHo is a community-driven platform designed to help people discover the real-time vibe of venues in North Hollywood. Whether you're looking for a quiet coffee shop to work from, a lively bar for Friday night, or a moderate-energy restaurant for a dinner date, PulseNoHo provides real-time insights from the community.
                                </p>
                                
                                <p>
                                    Users can check in at their favorite spots, rate the current energy level, and leave feedback for others. This creates a living, breathing map of NoHo's social scene that updates in real-time, helping everyone find exactly the kind of atmosphere they're looking for.
                                </p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                                    <div className="bg-white/10 p-4 rounded-lg text-center">
                                        <Coffee className="h-8 w-8 mx-auto mb-2 text-indigo-400" />
                                        <h3 className="font-medium mb-1">Discover Venues</h3>
                                        <p className="text-sm text-gray-400">Find the perfect spot based on real-time energy levels</p>
                                    </div>
                                    
                                    <div className="bg-white/10 p-4 rounded-lg text-center">
                                        <Users className="h-8 w-8 mx-auto mb-2 text-indigo-400" />
                                        <h3 className="font-medium mb-1">Community Driven</h3>
                                        <p className="text-sm text-gray-400">Feedback and ratings from real visitors, not algorithms</p>
                                    </div>
                                    
                                    <div className="bg-white/10 p-4 rounded-lg text-center">
                                        <MapPin className="h-8 w-8 mx-auto mb-2 text-indigo-400" />
                                        <h3 className="font-medium mb-1">Local Focus</h3>
                                        <p className="text-sm text-gray-400">Built specifically for the North Hollywood area</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    {/* Developer Section */}
                    <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                        <CardContent className="p-8">
                            <h2 className="text-2xl font-semibold mb-6 flex items-center">
                                <Code className="h-6 w-6 mr-2 text-indigo-400" /> 
                                About The Developer
                            </h2>
                            
                            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                                <div className="w-32 h-32 bg-indigo-800 rounded-full flex items-center justify-center">
                                    <span className="text-4xl font-bold text-white">JD</span>
                                </div>
                                
                                <div className="flex-1 space-y-4 text-gray-300">
                                    <p>
                                        Hi there! I'm a passionate web developer and NoHo local who wanted to create something meaningful for our community. PulseNoHo was born from countless experiences of walking into venues with unexpected energy levels – sometimes wanting quiet when it was busy, or seeking vibrant energy when it was dead.
                                    </p>
                                    
                                    <p>
                                        Built with Next.js and Firebase, this project combines my love for web development with my appreciation for North Hollywood's diverse social landscape. The tech stack includes React for the frontend, Firestore for the database, and Firebase Authentication for user management.
                                    </p>
                                    
                                    <div className="pt-4 flex flex-col sm:flex-row gap-3">
                                        <Button className="bg-indigo-600 hover:bg-indigo-700">
                                            <Github className="h-4 w-4 mr-2" />
                                            <a href="https://github.com/yourusername" target="_blank" rel="noopener noreferrer">
                                                GitHub
                                            </a>
                                        </Button>
                                        
                                        <Button className="bg-white/10 hover:bg-white/20">
                                            <Mail className="h-4 w-4 mr-2" />
                                            <a href="mailto:your.email@example.com">
                                                Contact Me
                                            </a>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </section>
            
            {/* Footer */}
            <div className="mt-12">
                <Footer />
            </div>
        </div>
    );
}