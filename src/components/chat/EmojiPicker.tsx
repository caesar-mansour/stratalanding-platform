'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const emojiCategories = {
  'Smileys': ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥'],
  'Gestures': ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '🦾', '🦿'],
  'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝'],
  'Objects': ['💼', '📁', '📂', '📄', '📊', '📈', '📉', '📋', '📌', '📍', '📎', '🔗', '📐', '📏', '✂️', '🔒', '🔓', '🔑', '💡', '📧', '📨', '📩', '📤', '📥', '💻', '🖥️', '📱', '☎️'],
  'Symbols': ['✅', '❌', '⭕', '❗', '❓', '💯', '🔥', '⚡', '💫', '✨', '🎉', '🎊', '🏆', '🥇', '🥈', '🥉', '⏰', '⌛', '📅', '🔔', '🔕'],
};

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function EmojiPicker({ onSelect, isOpen, onClose }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState<keyof typeof emojiCategories>('Smileys');

  const handleSelect = (emoji: string) => {
    onSelect(emoji);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full mb-2 left-0 bg-white rounded-xl shadow-xl border border-[var(--border)] z-50 w-80"
          >
            {/* Category Tabs */}
            <div className="flex border-b border-[var(--border)] overflow-x-auto scrollbar-hide">
              {Object.keys(emojiCategories).map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category as keyof typeof emojiCategories)}
                  className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                    activeCategory === category
                      ? 'text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Emoji Grid */}
            <div className="p-3 h-48 overflow-y-auto">
              <div className="grid grid-cols-8 gap-1">
                {emojiCategories[activeCategory].map((emoji, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelect(emoji)}
                    className="w-8 h-8 flex items-center justify-center text-xl hover:bg-gray-100 rounded transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
