import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-cyan-500 px-4 py-24 text-center text-white md:py-32">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative mx-auto max-w-3xl">
          <h1 className="mb-6 text-4xl font-bold leading-tight md:text-6xl">
            Practice Languages<br />
            <span className="text-cyan-300">with Real People</span>
          </h1>
          <p className="mb-10 text-lg text-indigo-100 md:text-xl">
            Connect with native speakers worldwide through live video calls, instant messaging,
            and language exchange. Book sessions, get corrections, and track your progress.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register">
              <Button size="lg" className="bg-white text-indigo-700 hover:bg-indigo-50 shadow-xl">
                Get Started Free
              </Button>
            </Link>
            <Link href="/discover">
              <Button size="lg" variant="ghost" className="border border-white/30 text-white hover:bg-white/10">
                Browse Users
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-slate-200 bg-white py-12">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-4 md:grid-cols-4">
          {[
            { value: '20+', label: 'Languages' },
            { value: 'Live', label: 'Video Calls' },
            { value: 'Free', label: 'to Start' },
            { value: 'AI', label: 'Corrections' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-bold text-indigo-600">{stat.value}</div>
              <div className="text-sm text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-50 px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-4 text-center text-3xl font-bold">Everything You Need</h2>
          <p className="mb-12 text-center text-slate-500">
            One platform for every kind of language practice
          </p>
          <div className="grid gap-8 md:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-4 text-3xl">{f.icon}</div>
                <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
                <p className="text-sm text-slate-500">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-indigo-600 px-4 py-16 text-center text-white">
        <h2 className="mb-4 text-3xl font-bold">Ready to Start Speaking?</h2>
        <p className="mb-8 text-indigo-200">
          Join thousands of learners practicing with native speakers every day.
        </p>
        <Link href="/register">
          <Button size="lg" className="bg-white text-indigo-700 hover:bg-indigo-50">
            Create Your Free Account
          </Button>
        </Link>
      </section>
    </div>
  );
}

const features = [
  {
    icon: '📹',
    title: 'Live Video Calls',
    description: 'Face-to-face conversations with native speakers. Use one-time room codes for quick practice sessions.',
  },
  {
    icon: '💬',
    title: 'Instant Messaging',
    description: 'Real-time text chat with built-in translation and in-message correction tools.',
  },
  {
    icon: '📅',
    title: 'Book Meetings',
    description: 'Schedule recurring sessions with your favorite language partners at times that work for both of you.',
  },
  {
    icon: '🌍',
    title: 'Discover Nearby',
    description: 'Find language partners near you for in-person meetups, or connect with people across the globe.',
  },
  {
    icon: '✍️',
    title: 'Instant Corrections',
    description: 'Tap any message to correct it inline. Native speakers fix your mistakes and explain the changes.',
  },
  {
    icon: '📊',
    title: 'Track Progress',
    description: 'See your learning journey: sessions completed, words learned, partners rated, and milestones reached.',
  },
];
