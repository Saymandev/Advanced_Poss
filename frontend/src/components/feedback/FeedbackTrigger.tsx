'use client';

import { FeedbackModal } from './FeedbackModal';
import { useAppSelector } from '@/lib/store';
import { UserRole } from '@/lib/enums/user-role.enum';
import { useEffect, useState } from 'react';

const FEEDBACK_COOLDOWN_DAYS = 30; // Show feedback modal once every 30 days
const SHOW_CHANCE = 0.1; // 10% chance to show on each page load

export function FeedbackTrigger() {
  const { user } = useAppSelector((state) => state.auth);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Only show for company owners
    if (!user || user.role !== UserRole.OWNER) {
      return;
    }

    // Check if user has already submitted feedback recently
    const lastFeedbackDate = localStorage.getItem('feedbackSubmitted');
    if (lastFeedbackDate) {
      const lastDate = new Date(lastFeedbackDate);
      const daysSince = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < FEEDBACK_COOLDOWN_DAYS) {
        return; // Don't show if submitted within cooldown period
      }
    }

    // Check if user has dismissed the modal for this session
    const dismissedThisSession = sessionStorage.getItem('feedbackDismissed');
    if (dismissedThisSession) {
      return;
    }

    // Random chance to show (10% probability)
    const shouldShow = Math.random() < SHOW_CHANCE;
    if (!shouldShow) {
      return;
    }

    // Delay showing the modal by 5-10 seconds after page load
    const delay = 5000 + Math.random() * 5000;
    const timer = setTimeout(() => {
      setShowModal(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [user]);

  const handleClose = () => {
    setShowModal(false);
    // Mark as dismissed for this session
    sessionStorage.setItem('feedbackDismissed', 'true');
  };

  if (!user || user.role !== UserRole.OWNER) {
    return null;
  }

  return <FeedbackModal isOpen={showModal} onClose={handleClose} />;
}

