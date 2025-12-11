'use client';

import { useState } from 'react';

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

export function ContactForm() {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      setStatus('success');
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
      });
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-action focus:border-transparent transition-all"
            placeholder="Your full name"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-action focus:border-transparent transition-all"
            placeholder="your.email@example.com"
          />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-sm font-semibold text-gray-900 mb-2">
            Phone <span className="text-gray-400 text-xs">(optional)</span>
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-action focus:border-transparent transition-all"
            placeholder="+61 400 000 000"
          />
        </div>

        {/* Subject */}
        <div>
          <label htmlFor="subject" className="block text-sm font-semibold text-gray-900 mb-2">
            Subject <span className="text-gray-400 text-xs">(optional)</span>
          </label>
          <select
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-action focus:border-transparent transition-all bg-white"
          >
            <option value="">Select a subject</option>
            <option value="General Inquiry">General Inquiry</option>
            <option value="Product Question">Product Question</option>
            <option value="Order Status">Order Status</option>
            <option value="Returns & Exchanges">Returns & Exchanges</option>
            <option value="Wholesale Inquiry">Wholesale Inquiry</option>
            <option value="Partnership Opportunity">Partnership Opportunity</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Message */}
        <div>
          <label htmlFor="message" className="block text-sm font-semibold text-gray-900 mb-2">
            Message <span className="text-red-500">*</span>
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            rows={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-action focus:border-transparent transition-all resize-none"
            placeholder="Tell us how we can help you..."
          />
        </div>

        {/* Status Messages */}
        {status === 'success' && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
            <p className="text-green-800 font-medium">✓ Message sent successfully!</p>
            <p className="text-green-600 text-sm mt-1">We'll get back to you as soon as possible.</p>
          </div>
        )}

        {status === 'error' && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-800 font-medium">✗ Failed to send message</p>
            <p className="text-red-600 text-sm mt-1">{errorMessage}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full bg-action text-white font-semibold text-lg py-4 px-6 rounded-full hover:bg-action-hover hover:-translate-y-0.5 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'loading' ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Sending...
            </span>
          ) : (
            'Send Message'
          )}
        </button>

        <p className="text-xs text-gray-500 text-center">
          By submitting this form, you agree to our privacy policy.
        </p>
      </form>
    </div>
  );
}

