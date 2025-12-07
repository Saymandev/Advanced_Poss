'use client';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useCreateFeedbackMutation } from '@/lib/api/endpoints/systemFeedbackApi';
import { FeedbackType } from '@/lib/api/endpoints/systemFeedbackApi';
import { StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);

  const [createFeedback, { isLoading }] = useCreateFeedbackMutation();

  const categoryOptions = ['ui', 'performance', 'features', 'support', 'pricing', 'other'];

  const handleCategoryToggle = (category: string) => {
    setCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please provide a rating');
      return;
    }

    if (!message.trim()) {
      toast.error('Please provide your feedback message');
      return;
    }

    try {
      await createFeedback({
        type: FeedbackType.REVIEW,
        rating,
        title: title.trim() || undefined,
        message: message.trim(),
        categories: categories.length > 0 ? categories : undefined,
        isAnonymous,
        isPublic,
      }).unwrap();

      toast.success('Thank you for your feedback!');
      
      // Reset form
      setRating(0);
      setTitle('');
      setMessage('');
      setIsAnonymous(false);
      setIsPublic(true);
      setCategories([]);
      
      // Store in localStorage that user has submitted feedback (to prevent showing again soon)
      localStorage.setItem('feedbackSubmitted', new Date().toISOString());
      
      onClose();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to submit feedback. Please try again.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Your Feedback"
      size="lg"
    >
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            How would you rate your experience? *
          </label>
          <div className="flex items-center space-x-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="focus:outline-none"
              >
                {(hoveredRating >= star || (!hoveredRating && rating >= star)) ? (
                  <StarIconSolid className="w-8 h-8 text-yellow-400" />
                ) : (
                  <StarIcon className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                )}
              </button>
            ))}
            {rating > 0 && (
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                {rating} {rating === 1 ? 'star' : 'stars'}
              </span>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Title (Optional)
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Brief summary of your feedback"
            maxLength={200}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Your Feedback *
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us about your experience with Advanced POS..."
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            maxLength={2000}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {message.length}/2000 characters
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Categories (Optional)
          </label>
          <div className="flex flex-wrap gap-2">
            {categoryOptions.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => handleCategoryToggle(category)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  categories.includes(category)
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Submit anonymously
            </span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Allow this feedback to be shown as a testimonial (if rating is 4+ stars)
            </span>
          </label>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || rating === 0 || !message.trim()}
          >
            {isLoading ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

