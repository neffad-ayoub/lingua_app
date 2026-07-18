'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

const LANGUAGES = [
  { value: 'en', label: '🇬🇧 English' },
  { value: 'es', label: '🇪🇸 Spanish' },
  { value: 'fr', label: '🇫🇷 French' },
  { value: 'de', label: '🇩🇪 German' },
  { value: 'it', label: '🇮🇹 Italian' },
  { value: 'pt', label: '🇵🇹 Portuguese' },
  { value: 'zh', label: '🇨🇳 Chinese' },
  { value: 'ja', label: '🇯🇵 Japanese' },
  { value: 'ko', label: '🇰🇷 Korean' },
  { value: 'ar', label: '🇸🇦 Arabic' },
  { value: 'hi', label: '🇮🇳 Hindi' },
  { value: 'ru', label: '🇷🇺 Russian' },
  { value: 'nl', label: '🇳🇱 Dutch' },
  { value: 'sv', label: '🇸🇪 Swedish' },
  { value: 'tr', label: '🇹🇷 Turkish' },
  { value: 'pl', label: '🇵🇱 Polish' },
  { value: 'th', label: '🇹🇭 Thai' },
  { value: 'vi', label: '🇻🇳 Vietnamese' },
  { value: 'id', label: '🇮🇩 Indonesian' },
  { value: 'uk', label: '🇺🇦 Ukrainian' },
];

const LEVELS = [
  { value: 'A1', label: 'A1 — Beginner' },
  { value: 'A2', label: 'A2 — Elementary' },
  { value: 'B1', label: 'B1 — Intermediate' },
  { value: 'B2', label: 'B2 — Upper-Intermediate' },
  { value: 'C1', label: 'C1 — Advanced' },
  { value: 'C2', label: 'C2 — Proficient' },
  { value: 'NATIVE', label: 'Native Speaker' },
];

type Step = 1 | 2 | 3;

export default function RegisterPage() {
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nativeLang, setNativeLang] = useState('');
  const [learnLangs, setLearnLangs] = useState<string[]>([]);
  const [proficiency, setProficiency] = useState('B1');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddLearnLang = (lang: string) => {
    if (lang && !learnLangs.includes(lang)) {
      setLearnLangs([...learnLangs, lang]);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, nativeLang, learnLangs, proficiency }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Registration failed');
        setLoading(false);
        return;
      }

      const result = await signIn('credentials', {
        email: email.toLowerCase().trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Account created but sign-in failed. Please log in.');
        setLoading(false);
      } else {
        setLoading(false);
        window.location.href = '/discover';
      }
    } catch {
      setError('Connection error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold">Create Your Account</h1>
        <p className="mb-8 text-sm text-slate-500">
          Step {step} of 3
        </p>

        {/* Progress bar */}
        <div className="mb-8 flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full ${
                s <= step ? 'bg-indigo-600' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <Input
              label="Full Name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Password"
              type="password"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button onClick={() => setStep(2)} className="w-full">
              Next
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <Select
              label="Your Native Language"
              value={nativeLang}
              onChange={(e) => setNativeLang(e.target.value)}
              options={[{ value: '', label: 'Select language...' }, ...LANGUAGES]}
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Languages You Want to Learn
              </label>
              <Select
                value=""
                onChange={(e) => handleAddLearnLang(e.target.value)}
                options={[{ value: '', label: 'Add a language...' }, ...LANGUAGES]}
              />
              {learnLangs.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {learnLangs.map((lang) => {
                    const langInfo = LANGUAGES.find((l) => l.value === lang);
                    return (
                      <span
                        key={lang}
                        className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700"
                      >
                        {langInfo?.label}
                        <button
                          onClick={() => setLearnLangs(learnLangs.filter((l) => l !== lang))}
                          className="ml-1 hover:text-indigo-900"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            <Select
              label="Your Proficiency Level"
              value={proficiency}
              onChange={(e) => setProficiency(e.target.value)}
              options={LEVELS}
            />
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">
                Back
              </Button>
              <Button onClick={() => setStep(3)} className="flex-1">
                Next
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div className="rounded-lg bg-slate-50 p-4">
              <h3 className="font-medium">Your Profile Summary</h3>
              {error && (
                <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 border border-red-200">
                  {error}
                </div>
              )}
              <dl className="mt-2 space-y-1 text-sm text-slate-600">
                <div className="flex justify-between">
                  <dt>Name:</dt><dd>{name || 'Not set'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Email:</dt><dd>{email || 'Not set'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Native:</dt>
                  <dd>{LANGUAGES.find((l) => l.value === nativeLang)?.label || 'Not set'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Learning:</dt>
                  <dd>{learnLangs.map((l) => LANGUAGES.find((x) => x.value === l)?.label).join(', ') || 'None'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Level:</dt>
                  <dd>{LEVELS.find((l) => l.value === proficiency)?.label}</dd>
                </div>
              </dl>
            </div>
            <Button onClick={handleSubmit} className="w-full" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
            <Button variant="ghost" onClick={() => setStep(2)} className="w-full">
              Back
            </Button>
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link href="/login" className="text-indigo-600 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
