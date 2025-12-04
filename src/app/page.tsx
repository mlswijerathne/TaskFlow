'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Zap, 
  Shield, 
  Users, 
  Loader2, 
  CheckCircle2, 
  ArrowRight,
  BarChart3,
  Bell,
  Layers,
  Star,
  ChevronRight,
  Calendar,
  Clock
} from 'lucide-react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-950 dark:via-gray-900 dark:to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-900 rounded-full animate-pulse"></div>
            <Loader2 className="w-10 h-10 animate-spin text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading TaskFlow...</p>
        </div>
      </div>
    );
  }

  const howItWorks = [
    {
      step: '01',
      title: 'Create Your Board',
      description: 'Set up your project board in seconds. Choose from templates or start from scratch.',
    },
    {
      step: '02',
      title: 'Invite Your Team',
      description: 'Add team members via email and assign roles with flexible permissions.',
    },
    {
      step: '03',
      title: 'Organize Tasks',
      description: 'Create tasks, set priorities, add labels, and organize your workflow.',
    },
    {
      step: '04',
      title: 'Track Progress',
      description: 'Monitor progress in real-time with multiple views and analytics.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-950 dark:via-gray-900 dark:to-slate-900">
      <Navbar transparent />

      {/* Hero Section */}
      <main>
        <section className="pt-32 sm:pt-40 pb-20 sm:pb-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-4xl mx-auto">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-700 dark:text-blue-300 text-sm font-medium mb-8 animate-fade-in">
                <Star className="w-4 h-4 fill-current" />
                <span>Trusted by 10,000+ teams worldwide</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
                Organize Your Work,
                <span className="block mt-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Amplify Your Productivity
                </span>
              </h1>
              
              <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
                TaskFlow is the modern project management platform that helps teams collaborate in real-time, 
                track progress effortlessly, and deliver projects faster than ever before.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                <Link
                  href="/auth"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-lg font-semibold rounded-xl transition-all duration-200 shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 group"
                >
                  Get Started Free
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              {/* Trust indicators */}
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span>Free forever plan</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span>Setup in 2 minutes</span>
                </div>
              </div>
            </div>

            {/* Hero Image/Preview */}
            <div className="mt-16 sm:mt-20 relative">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-transparent to-transparent dark:from-gray-950 z-10 pointer-events-none"></div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-2xl shadow-gray-200/50 dark:shadow-black/50 border border-gray-200 dark:border-gray-700 overflow-hidden mx-auto max-w-5xl">
                <div className="bg-gray-100 dark:bg-gray-900 px-4 py-3 flex items-center gap-2 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <div className="flex-1 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1 bg-white dark:bg-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-400">
                      <Layers className="w-4 h-4 text-blue-600" />
                      TaskFlow Dashboard
                    </div>
                  </div>
                </div>
                <div className="p-6 sm:p-8">
                  <div className="grid grid-cols-3 gap-4 sm:gap-6">
                    {/* To Do Column */}
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                        <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm sm:text-base">To Do</span>
                        <span className="ml-auto text-xs text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">3</span>
                      </div>
                      <div className="space-y-3">
                        {['Design system update', 'API integration', 'User testing'].map((task, i) => (
                          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-gray-700">
                            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium">{task}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* In Progress Column */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm sm:text-base">In Progress</span>
                        <span className="ml-auto text-xs text-blue-600 bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded-full">2</span>
                      </div>
                      <div className="space-y-3">
                        {['Homepage redesign', 'Mobile app'].map((task, i) => (
                          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-blue-100 dark:border-blue-800">
                            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium">{task}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Done Column */}
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm sm:text-base">Done</span>
                        <span className="ml-auto text-xs text-green-600 bg-green-100 dark:bg-green-900 px-2 py-0.5 rounded-full">4</span>
                      </div>
                      <div className="space-y-3">
                        {['Brand guidelines', 'Security audit'].map((task, i) => (
                          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-green-100 dark:border-green-800">
                            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium">{task}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 sm:py-32 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Everything you need to manage projects
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Powerful features designed to help your team stay organized and deliver results faster.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {/* Feature 1 */}
              <div className="group bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/50 rounded-2xl p-6 sm:p-8 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-transform duration-300">
                  <Zap className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  Real-time Collaboration
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  See changes instantly as your team updates tasks. No refresh needed—everything syncs automatically across all devices.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="group bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/50 rounded-2xl p-6 sm:p-8 border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-green-500/25 group-hover:scale-110 transition-transform duration-300">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  Enterprise-grade Security
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Your data is protected with row-level security policies. Only authorized team members can access sensitive information.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="group bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/50 rounded-2xl p-6 sm:p-8 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-500/25 group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  Team Management
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Invite team members, assign roles, and manage permissions. Keep everyone aligned and accountable.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="group bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/50 rounded-2xl p-6 sm:p-8 border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-orange-500/25 group-hover:scale-110 transition-transform duration-300">
                  <Bell className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  Smart Notifications
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Never miss a deadline with intelligent reminders. Get notified about important updates and due dates.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="group bg-white dark:bg-gray-800 rounded-2xl p-6 sm:p-8 border border-gray-200 dark:border-gray-700 hover:border-pink-300 dark:hover:border-pink-700 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-pink-500/25 group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  Progress Analytics
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Track project progress with visual analytics. Understand bottlenecks and optimize your workflow.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="group bg-white dark:bg-gray-800 rounded-2xl p-6 sm:p-8 border border-gray-200 dark:border-gray-700 hover:border-cyan-300 dark:hover:border-cyan-700 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-cyan-500/25 group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  Multiple Views
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Switch between Kanban, Table, Calendar, and Gantt views. See your work the way that works best for you.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-20 sm:py-32 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-700 dark:text-blue-300 text-sm font-medium mb-4">
                <Clock className="w-4 h-4" />
                <span>Get Started in Minutes</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                How TaskFlow Works
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Get up and running in just a few simple steps. No complex setup required.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {howItWorks.map((step, index) => (
                <div key={index} className="relative">
                  {index < howItWorks.length - 1 && (
                    <div className="hidden lg:block absolute top-14 left-full w-full h-0.5 bg-gradient-to-r from-blue-300 to-transparent dark:from-blue-700 -translate-x-1/2 z-0"></div>
                  )}
                  <div className="relative z-10 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl text-white text-xl font-bold mb-6 shadow-lg shadow-blue-500/25">
                      {step.step}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 sm:py-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-3xl p-8 sm:p-12 lg:p-16 text-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
              </div>
              
              <div className="relative z-10">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                  Ready to get started?
                </h2>
                <p className="text-lg sm:text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
                  Start organizing your projects today with TaskFlow.
                </p>
                <Link
                  href="/auth"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 text-lg font-semibold rounded-xl hover:bg-gray-100 transition-all duration-200 shadow-xl hover:shadow-2xl hover:scale-105 group"
                >
                  Get Started Free
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
