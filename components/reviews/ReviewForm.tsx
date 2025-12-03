'use client';

import { useState } from 'react';
import { ReviewStars } from './ReviewStars';

interface ReviewFormProps {
  productId: string;
  productName: string;
  onSubmit?: (data: any) => void;
}

export function ReviewForm({ productId, productName, onSubmit }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const reviewData = {
      productId,
      rating,
      title,
      content,
      authorName,
      authorEmail,
    };

    try {
      // TODO: Submit to your API
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewData),
      });

      if (response.ok) {
        setSubmitted(true);
        onSubmit?.(reviewData);
      }
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <h3 className="text-xl font-semibold text-green-800 mb-2">
          Thank you for your review!
        </h3>
        <p className="text-green-700">
          Your review has been submitted and will be published after moderation.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6">
      <h3 className="text-2xl font-bold mb-6">Write a Review</h3>
      <p className="text-gray-600 mb-6">for {productName}</p>

      {/* Rating */}
      <div className="mb-6">
        <label className="block font-semibold mb-2">
          Rating <span className="text-red-500">*</span>
        </label>
        <ReviewStars
          rating={rating}
          size="lg"
          interactive
          onRatingChange={setRating}
        />
      </div>

      {/* Title */}
      <div className="mb-4">
        <label htmlFor="title" className="block font-semibold mb-2">
          Review Title
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="Summarize your experience"
          required
        />
      </div>

      {/* Content */}
      <div className="mb-4">
        <label htmlFor="content" className="block font-semibold mb-2">
          Review
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          className="w-full border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="What did you like or dislike?"
          required
        />
      </div>

      {/* Author Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label htmlFor="name" className="block font-semibold mb-2">
            Name
          </label>
          <input
            type="text"
            id="name"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            className="w-full border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
            required
          />
        </div>
        <div>
          <label htmlFor="email" className="block font-semibold mb-2">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={authorEmail}
            onChange={(e) => setAuthorEmail(e.target.value)}
            className="w-full border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
            required
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || rating === 0}
        className="w-full bg-black text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  );
}

