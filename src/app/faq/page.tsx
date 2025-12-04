'use client';

import { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { ChevronDown, Search, MessageCircle, Mail, HelpCircle, CreditCard, Shield, Zap, Users } from 'lucide-react';
import Link from 'next/link';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  faqs: FAQItem[];
}

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('general');
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (key: string) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(key)) {
      newOpenItems.delete(key);
    } else {
      newOpenItems.add(key);
    }
    setOpenItems(newOpenItems);
  };

  const faqCategories: FAQCategory[] = [
    {
      id: 'general',
      title: 'General',
      icon: HelpCircle,
      faqs: [
        {
          question: 'What is TaskFlow?',
          answer: 'TaskFlow is a modern project management platform designed to help teams collaborate in real-time, track progress effortlessly, and deliver projects faster. It offers features like Kanban boards, multiple views (Table, Calendar, Gantt), team collaboration, and smart notifications.',
        },
        {
          question: 'How do I get started with TaskFlow?',
          answer: 'Getting started is easy! Simply sign up for a free account, create your first board, and invite your team members. Our intuitive interface will guide you through creating columns, adding tasks, and customizing your workflow. You can start using TaskFlow in less than 2 minutes.',
        },
        {
          question: 'Is TaskFlow suitable for small teams?',
          answer: 'Absolutely! TaskFlow is designed to scale with your needs. Whether you\'re a solo entrepreneur, a small team of 5, or a large organization with hundreds of members, TaskFlow adapts to your workflow. Our free plan is perfect for small teams just getting started.',
        },
        {
          question: 'Can I use TaskFlow on mobile devices?',
          answer: 'Yes! TaskFlow is fully responsive and works great on mobile devices. You can access your boards, update tasks, and collaborate with your team from anywhere using your smartphone or tablet browser.',
        },
        {
          question: 'What makes TaskFlow different from other project management tools?',
          answer: 'TaskFlow combines real-time collaboration, enterprise-grade security, and an intuitive user interface. Our unique features include instant sync across all devices, row-level security policies, multiple board views, and smart notifications that keep everyone aligned without overwhelming them.',
        },
      ],
    },
    {
      id: 'pricing',
      title: 'Pricing & Plans',
      icon: CreditCard,
      faqs: [
        {
          question: 'Is there a free plan available?',
          answer: 'Yes! TaskFlow offers a generous free plan that includes unlimited boards, up to 10 team members, basic views (Kanban, Table), and core collaboration features. It\'s perfect for small teams or individuals getting started with project management.',
        },
        {
          question: 'What payment methods do you accept?',
          answer: 'We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and bank transfers for annual plans. Enterprise customers can also pay via invoice.',
        },
        {
          question: 'Can I upgrade or downgrade my plan at any time?',
          answer: 'Yes, you can change your plan at any time. When upgrading, you\'ll get immediate access to new features. When downgrading, changes take effect at the start of your next billing cycle. Any unused credit will be prorated.',
        },
        {
          question: 'Do you offer discounts for nonprofits or educational institutions?',
          answer: 'Yes! We offer 50% off for verified nonprofits and educational institutions. Contact our sales team with proof of your nonprofit or educational status to apply for the discount.',
        },
        {
          question: 'What happens if I exceed my plan limits?',
          answer: 'We\'ll notify you when you\'re approaching your plan limits. You can choose to upgrade to a higher plan or stay on your current plan with reduced functionality for new features. We never delete your data or lock you out.',
        },
      ],
    },
    {
      id: 'security',
      title: 'Security & Privacy',
      icon: Shield,
      faqs: [
        {
          question: 'How secure is my data on TaskFlow?',
          answer: 'TaskFlow uses enterprise-grade security measures including end-to-end encryption, row-level security policies, SOC 2 Type II compliance, and regular security audits. Your data is encrypted both in transit (TLS 1.3) and at rest (AES-256).',
        },
        {
          question: 'Where is my data stored?',
          answer: 'Your data is stored in secure data centers located in the United States (default), European Union, or Asia-Pacific, depending on your region selection. Enterprise customers can choose their preferred data residency location.',
        },
        {
          question: 'Who can access my boards and tasks?',
          answer: 'Only team members you explicitly invite can access your boards. TaskFlow uses role-based access control (RBAC) allowing you to set different permission levels (Owner, Admin, Member, Viewer) for each team member.',
        },
        {
          question: 'Do you sell my data to third parties?',
          answer: 'Never. Your data is yours. We do not sell, rent, or share your personal or business data with third parties for marketing purposes. We only use your data to provide and improve our services.',
        },
        {
          question: 'Can I export my data?',
          answer: 'Yes, you can export all your data at any time in multiple formats (JSON, CSV, PDF). We believe in data portability and make it easy for you to take your data with you if you ever decide to leave.',
        },
      ],
    },
    {
      id: 'features',
      title: 'Features',
      icon: Zap,
      faqs: [
        {
          question: 'What views does TaskFlow support?',
          answer: 'TaskFlow supports multiple views to suit different working styles: Kanban Board (visual task management), Table View (spreadsheet-like view), Calendar View (time-based planning), and Gantt Chart (timeline visualization). All views sync in real-time.',
        },
        {
          question: 'Can I create custom workflows?',
          answer: 'Yes! You can create custom columns and workflows that match your team\'s processes. Add, rename, reorder, or color-code columns to represent your unique workflow stages. Templates are also available for common workflows.',
        },
        {
          question: 'Does TaskFlow integrate with other tools?',
          answer: 'TaskFlow integrates with popular tools including Slack, Microsoft Teams, Google Drive, Dropbox, GitHub, Jira, and Zapier (for 1000+ app connections). We\'re constantly adding new integrations based on user feedback.',
        },
        {
          question: 'Can I set due dates and reminders?',
          answer: 'Absolutely! You can set due dates for any task and receive smart reminders via email, in-app notifications, or Slack/Teams. Customize reminder timing and frequency based on your preferences.',
        },
        {
          question: 'Is real-time collaboration supported?',
          answer: 'Yes! TaskFlow provides real-time collaboration where you can see updates instantly as team members make changes. You\'ll see who\'s currently viewing or editing a card, and all changes sync automatically across all devices.',
        },
      ],
    },
    {
      id: 'team',
      title: 'Team & Collaboration',
      icon: Users,
      faqs: [
        {
          question: 'How do I invite team members?',
          answer: 'You can invite team members by email from your board settings or team management page. They\'ll receive an invitation link to join your workspace. You can also generate shareable invite links for easier onboarding.',
        },
        {
          question: 'What are the different team roles?',
          answer: 'TaskFlow offers four role levels: Owner (full control, billing), Admin (manage members, board settings), Member (create/edit tasks), and Viewer (read-only access). You can customize permissions for each role.',
        },
        {
          question: 'Can I have multiple teams or workspaces?',
          answer: 'Yes! You can create multiple workspaces for different teams, projects, or clients. Each workspace has its own members, boards, and settings. Switch between workspaces easily from the navigation menu.',
        },
        {
          question: 'How do I communicate with my team within TaskFlow?',
          answer: 'TaskFlow offers built-in communication features including task comments, @mentions, activity feeds, and real-time presence indicators. For deeper conversations, integrate with Slack or Microsoft Teams.',
        },
        {
          question: 'Can external collaborators access my boards?',
          answer: 'Yes, you can invite external collaborators (clients, contractors, partners) with limited access to specific boards. Guest users have restricted permissions and don\'t count toward your team member limit on most plans.',
        },
      ],
    },
  ];

  // Filter FAQs based on search query
  const filteredCategories = faqCategories.map(category => ({
    ...category,
    faqs: category.faqs.filter(
      faq =>
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(category => category.faqs.length > 0 || searchQuery === '');

  const currentCategory = filteredCategories.find(c => c.id === activeCategory) || filteredCategories[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-950 dark:via-gray-900 dark:to-slate-900">
      <Navbar transparent />
      
      <main className="pt-24 sm:pt-32">
        {/* Hero Section */}
        <section className="pb-12 sm:pb-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                Frequently Asked Questions
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-8">
                Find answers to common questions about TaskFlow. Can't find what you're looking for? Contact our support team.
              </p>
              
              {/* Search Bar */}
              <div className="relative max-w-xl mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for answers..."
                  className="w-full pl-12 pr-4 py-4 border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none shadow-lg"
                />
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Content */}
        <section className="pb-16 sm:pb-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Category Sidebar */}
              <div className="lg:w-64 flex-shrink-0">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg border border-gray-100 dark:border-gray-700 sticky top-24">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 px-3">
                    Categories
                  </h3>
                  <nav className="space-y-1">
                    {faqCategories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => setActiveCategory(category.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                          activeCategory === category.id
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <category.icon className="w-5 h-5" />
                        <span className="font-medium">{category.title}</span>
                      </button>
                    ))}
                  </nav>
                </div>
              </div>

              {/* FAQ List */}
              <div className="flex-1">
                {currentCategory && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                        <currentCategory.icon className="w-5 h-5 text-white" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {currentCategory.title}
                      </h2>
                    </div>

                    {currentCategory.faqs.map((faq, index) => {
                      const itemKey = `${currentCategory.id}-${index}`;
                      const isOpen = openItems.has(itemKey);
                      
                      return (
                        <div
                          key={index}
                          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden"
                        >
                          <button
                            onClick={() => toggleItem(itemKey)}
                            className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                          >
                            <span className="text-lg font-semibold text-gray-900 dark:text-white pr-4">
                              {faq.question}
                            </span>
                            <ChevronDown
                              className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform ${
                                isOpen ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                          {isOpen && (
                            <div className="px-6 pb-6">
                              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                {faq.answer}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {currentCategory.faqs.length === 0 && (
                      <div className="text-center py-12">
                        <HelpCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          No results found
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          Try adjusting your search or browse other categories.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Still Need Help CTA */}
        <section className="pb-16 sm:pb-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
              </div>
              
              <div className="relative z-10">
                <MessageCircle className="w-12 h-12 text-white/80 mx-auto mb-4" />
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                  Still have questions?
                </h2>
                <p className="text-lg text-blue-100 mb-8 max-w-xl mx-auto">
                  Can't find the answer you're looking for? Our friendly support team is here to help.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 font-semibold rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <Mail className="w-5 h-5" />
                    Contact Support
                  </Link>
                  <button className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-colors border border-white/20">
                    <MessageCircle className="w-5 h-5" />
                    Start Live Chat
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
