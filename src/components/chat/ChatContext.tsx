'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface ChatSettings {
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  showTimestamps: boolean;
}

interface ChatContextType {
  settings: ChatSettings;
  updateSettings: (newSettings: Partial<ChatSettings>) => void;
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  playNotificationSound: () => void;
}

const defaultSettings: ChatSettings = {
  soundEnabled: true,
  notificationsEnabled: true,
  showTimestamps: true,
};

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ChatSettings>(defaultSettings);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('chatSettings');
    if (saved) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(saved) });
      } catch {
        // Use defaults if parse fails
      }
    }
  }, []);

  // Save settings to localStorage
  const updateSettings = useCallback((newSettings: Partial<ChatSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('chatSettings', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (settings.soundEnabled) {
      // Create a simple beep sound using Web Audio API
      try {
        const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      } catch {
        // Audio not available
      }
    }
  }, [settings.soundEnabled]);

  return (
    <ChatContext.Provider
      value={{
        settings,
        updateSettings,
        unreadCount,
        setUnreadCount,
        playNotificationSound,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}
