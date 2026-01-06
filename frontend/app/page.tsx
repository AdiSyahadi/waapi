import Link from 'next/link'
import { ArrowRight, Check, Code, MessageSquare, Shield, Zap } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-8 w-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900">WhatsApp API</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <Link href="#features" className="text-gray-600 hover:text-gray-900 transition">
                Features
              </Link>
              <Link href="#pricing" className="text-gray-600 hover:text-gray-900 transition">
                Pricing
              </Link>
              <a href="http://72.62.125.132/docs" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900 transition">
                API Docs
              </a>
              <Link href="/login" className="text-gray-600 hover:text-gray-900 transition">
                Login
              </Link>
              <Link 
                href="/register" 
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
              >
                Get Started
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto animate-fade-in">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-sm font-medium mb-8">
              <Zap className="h-4 w-4 mr-2" />
              Now with Multi-Session Support
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              WhatsApp API for
              <span className="text-primary-600"> Modern Businesses</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
              Enterprise-grade WhatsApp Business API platform. Send messages, manage conversations, 
              and automate workflows with reliable infrastructure.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-lg font-semibold"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <a 
                href="http://72.62.125.132/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-gray-400 transition text-lg font-semibold"
              >
                <Code className="mr-2 h-5 w-5" />
                View API Documentation
              </a>
            </div>

            <p className="mt-6 text-sm text-gray-500">
              Free 14-day trial • No credit card required • Cancel anytime
            </p>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">99.9%</div>
              <div className="text-gray-600 mt-2">Uptime SLA</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">50M+</div>
              <div className="text-gray-600 mt-2">Messages Delivered</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">150+</div>
              <div className="text-gray-600 mt-2">Countries Supported</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything you need to build
            </h2>
            <p className="text-xl text-gray-600">
              Powerful features built for developers and businesses
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-white p-8 rounded-xl border border-gray-200 hover:shadow-lg transition"
              >
                <div className="h-12 w-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-gray-600">
              Choose the plan that fits your needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <div 
                key={index}
                className={`rounded-2xl p-8 ${
                  plan.featured 
                    ? 'bg-primary-600 text-white ring-4 ring-primary-600 ring-offset-4' 
                    : 'bg-white border-2 border-gray-200'
                }`}
              >
                <div className="text-center">
                  <h3 className={`text-2xl font-bold mb-2 ${plan.featured ? 'text-white' : 'text-gray-900'}`}>
                    {plan.name}
                  </h3>
                  <div className="mt-4 flex items-baseline justify-center">
                    <span className={`text-5xl font-bold ${plan.featured ? 'text-white' : 'text-gray-900'}`}>
                      ${plan.price}
                    </span>
                    <span className={`ml-2 ${plan.featured ? 'text-primary-100' : 'text-gray-600'}`}>
                      /month
                    </span>
                  </div>
                  <p className={`mt-4 ${plan.featured ? 'text-primary-100' : 'text-gray-600'}`}>
                    {plan.description}
                  </p>
                </div>

                <ul className="mt-8 space-y-4">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <Check className={`h-5 w-5 mr-3 flex-shrink-0 ${plan.featured ? 'text-primary-200' : 'text-primary-600'}`} />
                      <span className={plan.featured ? 'text-primary-50' : 'text-gray-600'}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/register"
                  className={`mt-8 block w-full text-center px-6 py-3 rounded-lg font-semibold transition ${
                    plan.featured
                      ? 'bg-white text-primary-600 hover:bg-gray-50'
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to get started?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Join thousands of businesses using our WhatsApp API platform
          </p>
          <Link
            href="/register"
            className="inline-flex items-center px-8 py-4 bg-white text-primary-600 rounded-lg hover:bg-gray-50 transition text-lg font-semibold"
          >
            Start Free Trial
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                <li><Link href="#features" className="hover:text-white transition">Features</Link></li>
                <li><Link href="#pricing" className="hover:text-white transition">Pricing</Link></li>
                <li><a href="http://72.62.125.132/docs" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">API Documentation</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                <li><Link href="/about" className="hover:text-white transition">About</Link></li>
                <li><Link href="/blog" className="hover:text-white transition">Blog</Link></li>
                <li><Link href="/contact" className="hover:text-white transition">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2">
                <li><Link href="/help" className="hover:text-white transition">Help Center</Link></li>
                <li><Link href="/status" className="hover:text-white transition">Status</Link></li>
                <li><Link href="/api" className="hover:text-white transition">API Reference</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><Link href="/privacy" className="hover:text-white transition">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition">Terms</Link></li>
                <li><Link href="/security" className="hover:text-white transition">Security</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-800 text-center">
            <p>&copy; 2025 WhatsApp API Platform. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

const features = [
  {
    icon: MessageSquare,
    title: 'Multi-Session Support',
    description: 'Manage multiple WhatsApp accounts simultaneously with isolated sessions and reliable connections.',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Send thousands of messages per second with our optimized infrastructure and message queuing.',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Bank-level encryption, 2FA authentication, and SOC 2 Type II compliance for your data.',
  },
  {
    icon: Code,
    title: 'Developer Friendly',
    description: 'RESTful API, comprehensive documentation, and SDKs for all major programming languages.',
  },
  {
    icon: MessageSquare,
    title: 'Rich Media Support',
    description: 'Send images, videos, documents, audio files, and interactive buttons with ease.',
  },
  {
    icon: Zap,
    title: 'Webhooks & Events',
    description: 'Real-time webhooks for message status, delivery receipts, and incoming messages.',
  },
]

const plans = [
  {
    name: 'Starter',
    price: 29,
    description: 'Perfect for small businesses',
    features: [
      '1 WhatsApp session',
      '1,000 messages/month',
      'Basic analytics',
      'Email support',
      'API access',
    ],
    featured: false,
  },
  {
    name: 'Professional',
    price: 99,
    description: 'For growing businesses',
    features: [
      '5 WhatsApp sessions',
      '10,000 messages/month',
      'Advanced analytics',
      'Priority support',
      'Webhooks included',
      'Custom integrations',
    ],
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 299,
    description: 'For large organizations',
    features: [
      'Unlimited sessions',
      'Unlimited messages',
      'Custom analytics',
      '24/7 phone support',
      'Dedicated account manager',
      'SLA guarantee',
      'White-label option',
    ],
    featured: false,
  },
]
