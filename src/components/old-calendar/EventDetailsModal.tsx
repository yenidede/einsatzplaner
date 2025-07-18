"use client";

import { motion } from "framer-motion";
import type { FC } from "react";
import type { SelectedEvent } from "./types";

interface EventDetailsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  eventData: SelectedEvent | null;
}

/**
 * Modal component for displaying event details
 */
export const EventDetailsModal: FC<EventDetailsModalProps> = ({
  isOpen,
  onOpenChange,
  eventData,
}) => {
  if (!isOpen || !eventData) return null;

  const handleClose = () => onOpenChange(false);

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-semibold">{eventData.title}</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
        <div className="space-y-2">
          <EventDetail label="Date" value={eventData.date} />
          <EventDetail
            label="Time"
            value={`${eventData.startTime} - ${eventData.endTime}`}
          />
          {eventData.organization && (
            <EventDetail label="Organization" value={eventData.organization} />
          )}
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Helper component for displaying event details
 */
const EventDetail: FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <p>
    <strong>{label}:</strong> {value}
  </p>
);
