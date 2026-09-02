'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CannedResponsesProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (response: string) => void;
}

interface CannedResponse {
  id: string;
  title: string;
  message: string;
  category: 'greeting' | 'update' | 'feedback' | 'closing';
}

const defaultResponses: CannedResponse[] = [
  // Greetings
  {
    id: 'g1',
    title: 'Welcome',
    message: "Hi! Thanks for reaching out. How can I help you today?",
    category: 'greeting',
  },
  {
    id: 'g2',
    title: 'Getting started',
    message: "Great to have you on board! I've received your brief and I'm excited to work on your project. I'll review everything and get back to you shortly with any questions.",
    category: 'greeting',
  },
  // Updates
  {
    id: 'u1',
    title: 'Design started',
    message: "Just wanted to let you know I've started working on your design. You can expect the first draft within the next few days. I'll keep you posted!",
    category: 'update',
  },
  {
    id: 'u2',
    title: 'First draft ready',
    message: "Great news! The first draft of your landing page is ready for review. Please take a look and let me know your thoughts. Feel free to share any feedback or revisions you'd like.",
    category: 'update',
  },
  {
    id: 'u3',
    title: 'Revisions in progress',
    message: "Thanks for the feedback! I'm working on the revisions now. I'll have an updated version ready for you soon.",
    category: 'update',
  },
  {
    id: 'u4',
    title: 'Project complete',
    message: "Your project is now complete! All revisions have been incorporated. Once you've reviewed everything and are happy with the result, we can proceed with the final payment and launch.",
    category: 'update',
  },
  // Feedback requests
  {
    id: 'f1',
    title: 'Need clarification',
    message: "Thanks for the input! Could you clarify what you mean by that? I want to make sure I understand your vision correctly.",
    category: 'feedback',
  },
  {
    id: 'f2',
    title: 'Request assets',
    message: "To continue with your project, I'll need some assets from you. Could you please upload your logo, brand colors, and any images you'd like to use? You can add them in the Uploads section of your portal.",
    category: 'feedback',
  },
  // Closing
  {
    id: 'c1',
    title: 'Thank you',
    message: "Thank you! Let me know if you have any other questions. I'm here to help!",
    category: 'closing',
  },
  {
    id: 'c2',
    title: 'Project launched',
    message: "Congratulations! Your landing page is now live. It was a pleasure working with you. If you need any future updates or have another project in mind, don't hesitate to reach out. Wishing you great success!",
    category: 'closing',
  },
];

const categoryLabels: Record<string, string> = {
  greeting: 'Greetings',
  update: 'Status Updates',
  feedback: 'Feedback & Requests',
  closing: 'Closing Messages',
};

const categoryColors: Record<string, string> = {
  greeting: 'bg-green-100 text-green-700',
  update: 'bg-blue-100 text-blue-700',
  feedback: 'bg-yellow-100 text-yellow-700',
  closing: 'bg-purple-100 text-purple-700',
};

export default function CannedResponses({ isOpen, onClose, onSelect }: CannedResponsesProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredResponses = defaultResponses.filter((response) => {
    const matchesCategory = !selectedCategory || response.category === selectedCategory;
    const matchesSearch = !searchQuery ||
      response.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      response.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = ['greeting', 'update', 'feedback', 'closing'];

  const handleSelect = (response: CannedResponse) => {
    onSelect(response.message);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-[var(--border)] bg-gradient-to-r from-[#E8F0F8] to-white">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--color-accent)]/10 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">Quick Replies</h2>
                    <p className="text-sm text-[var(--text-muted)]">Select a template to insert</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] text-sm"
                />
              </div>
            </div>

            {/* Category Filters */}
            <div className="p-3 border-b border-[var(--border)] flex gap-2 overflow-x-auto">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                  !selectedCategory
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                    selectedCategory === category
                      ? 'bg-[var(--color-accent)] text-white'
                      : `${categoryColors[category]} hover:opacity-80`
                  }`}
                >
                  {categoryLabels[category]}
                </button>
              ))}
            </div>

            {/* Response List */}
            <div className="p-3 max-h-[50vh] overflow-y-auto space-y-2">
              {filteredResponses.length === 0 ? (
                <div className="text-center py-8 text-[var(--text-muted)]">
                  <p>No templates found</p>
                </div>
              ) : (
                filteredResponses.map((response) => (
                  <motion.button
                    key={response.id}
                    onClick={() => handleSelect(response)}
                    className="w-full text-left p-4 bg-gray-50 hover:bg-[var(--color-accent)]/5 rounded-xl transition-all border border-transparent hover:border-[var(--color-accent)]/20 group"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-[var(--text-primary)] group-hover:text-[var(--color-accent)]">
                        {response.title}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColors[response.category]}`}>
                        {categoryLabels[response.category]}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-muted)] line-clamp-2">
                      {response.message}
                    </p>
                  </motion.button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-[var(--border)] bg-gray-50 text-center">
              <p className="text-xs text-[var(--text-muted)]">
                Click a template to insert it into your message
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
