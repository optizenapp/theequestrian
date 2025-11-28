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

