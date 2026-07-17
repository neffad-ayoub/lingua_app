'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';

interface Post {
  id: string;
  author: {
    name: string | null;
    image: string | null;
  };
  content: string;
  language: { code: string; name: string; flag: string } | null;
  createdAt: string;
  comments: { id: string; content: string; author: { name: string | null } }[];
}

export default function FeedPage() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [postLang, setPostLang] = useState('en');
  const [loading, setLoading] = useState(true);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/posts')
      .then((r) => r.json())
      .then((data) => {
        setPosts(data.posts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handlePost = async () => {
    if (!newPost.trim() || !session?.user?.id) return;

    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: newPost,
        authorId: session.user.id,
        languageId: postLang || null,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setPosts([data.post, ...posts]);
      setNewPost('');
    }
  };

  const handleLike = async (postId: string) => {
    // Optimistic UI — toggle locally
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p } : p))
    );
  };

  const handleComment = useCallback(async (postId: string) => {
    const content = commentInputs[postId]?.trim();
    if (!content || !session?.user?.id) return;
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, content, authorId: session.user.id }),
    });
    if (res.ok) {
      const data = await res.json();
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, comments: [...p.comments, data.comment] } : p))
      );
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    }
  }, [commentInputs, session]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Community Feed</h1>
      <p className="mb-8 text-slate-500">
        Write in your target language and get corrections from native speakers
      </p>

      {/* New post */}
      {session?.user && (
        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <Avatar name={session.user.name || 'You'} size="md" />
            <div className="flex-1">
              <textarea
                placeholder="Write something in your target language..."
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
              />
              <div className="mt-2 flex items-center justify-between">
                <Select
                  value={postLang}
                  onChange={(e) => setPostLang(e.target.value)}
                  options={[
                    { value: 'en', label: '🇬🇧 English' },
                    { value: 'es', label: '🇪🇸 Spanish' },
                    { value: 'fr', label: '🇫🇷 French' },
                    { value: 'de', label: '🇩🇪 German' },
                    { value: 'ja', label: '🇯🇵 Japanese' },
                    { value: 'zh', label: '🇨🇳 Chinese' },
                    { value: 'ko', label: '🇰🇷 Korean' },
                    { value: 'ar', label: '🇸🇦 Arabic' },
                  ]}
                />
                <Button size="sm" onClick={handlePost} disabled={!newPost.trim()}>
                  Post
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Posts */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">Loading posts...</div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm animate-fade-in"
            >
              <div className="flex items-center gap-3 mb-3">
                <Avatar name={post.author.name || 'User'} size="md" />
                <div>
                  <h3 className="text-sm font-semibold">{post.author.name}</h3>
                  <p className="text-xs text-slate-500">
                    {post.language?.flag} {post.language?.name} ·{' '}
                    {new Date(post.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <p className="mb-4 text-sm leading-relaxed">{post.content}</p>

              <div className="flex items-center gap-4 border-t border-slate-100 pt-3">
                <button
                  onClick={() => handleLike(post.id)}
                  className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-400 transition-colors"
                >
                  🤍
                </button>
                {post.language && (
                  <Badge variant="info" className="ml-auto">
                    {post.language.name}
                  </Badge>
                )}
              </div>

              {/* Comments */}
              {post.comments.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                  {post.comments.map((c) => (
                    <div key={c.id} className="flex items-start gap-2 text-xs text-slate-600">
                      <span className="font-medium">{c.author.name}:</span>
                      <span>{c.content}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 flex gap-2">
                <input
                  placeholder="Suggest a correction or comment..."
                  value={commentInputs[post.id] || ''}
                  onChange={(e) => setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))}
                  className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
                />
                <Button size="sm" variant="ghost" onClick={() => handleComment(post.id)} disabled={!commentInputs[post.id]?.trim()}>Comment</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className="py-16 text-center text-slate-400">
          <p className="text-4xl">📝</p>
          <p className="mt-2">No posts yet. Be the first!</p>
        </div>
      )}
    </div>
  );
}
