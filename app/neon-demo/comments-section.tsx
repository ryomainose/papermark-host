'use client';

import { useState, useEffect } from 'react';

export default function CommentsSection() {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/neon-comments');
      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }
      const data = await response.json();
      setComments(data.comments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-md border">
        <p className="text-gray-600">Loading comments...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-md border border-red-200">
        <p className="text-red-800">Error loading comments: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {comments.length === 0 ? (
        <p className="text-gray-500 italic">No comments yet. Be the first to comment!</p>
      ) : (
        comments.map((comment: any) => (
          <div key={comment.id} className="p-4 bg-gray-50 rounded-md border">
            <p className="text-gray-800">{comment.comment}</p>
            <p className="text-xs text-gray-500 mt-2">
              {new Date(comment.created_at).toLocaleString()}
            </p>
          </div>
        ))
      )}
    </div>
  );
}