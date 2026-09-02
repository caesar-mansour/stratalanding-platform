'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePortalData } from '../PortalDataContext';
import Link from 'next/link';
import { EmojiPicker, ChatSettings } from '@/components/chat';
import { isChatUnlocked } from '@/lib/chat-access';
import { GradientText, NumberTicker, LiveDot, PortalButton } from '@/app/portal/components/portal-ui';

interface Attachment {
  url: string;
  type: 'image' | 'video';
  name: string;
}

interface Message {
  id: string;
  project_id: string;
  sender_type: 'client' | 'admin' | 'ai';
  message: string;
  created_at: string;
  attachments?: Attachment[];
}

interface ChatSettingsState {
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  showTimestamps: boolean;
}

const defaultSettings: ChatSettingsState = {
  soundEnabled: true,
  notificationsEnabled: true,
  showTimestamps: true,
};

const packageRevisions: Record<string, number | 'unlimited'> = {
  starter: 6,
  growth: 'unlimited',
  scale: 'unlimited',
};

export default function RevisionsPage() {
  // Get data from context (already loaded by layout - INSTANT)
  const { projects } = usePortalData();
  const project = projects[0];

  // Derive values from context data (no API needed)
  const projectId = project?.id || null;
  const projectStatus = project?.status || '';
  const chatUnlocked = isChatUnlocked(project as { status?: string; source?: string | null; preview_approved_at?: string | null });
  const revisionRounds = project ? packageRevisions[project.package] || 6 : 6;
  const isUnlimited = revisionRounds === 'unlimited';

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editText, setEditText] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<ChatSettingsState>(defaultSettings);
  const [adminStatus, setAdminStatus] = useState<'online' | 'busy' | 'offline'>('offline');
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submittingRevision, setSubmittingRevision] = useState(false);
  const [aiStreaming, setAiStreaming] = useState(false);
  const [aiStreamText, setAiStreamText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastMessageCountRef = useRef(0);
  const isAtBottom = useRef(true);

  // Handler for scroll events on the messages container
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    isAtBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
  };

  // Load settings from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('chatSettings');
      if (saved) {
        setSettings({ ...defaultSettings, ...JSON.parse(saved) });
      }
    } catch {
      // Private mode or parse error — use defaults
    }
  }, []);

  const updateSettings = (newSettings: Partial<ChatSettingsState>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try { localStorage.setItem('chatSettings', JSON.stringify(updated)); } catch { /* private mode */ }
      return updated;
    });
  };

  const playNotificationSound = useCallback(() => {
    if (settings.soundEnabled) {
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

  // Only fetch messages (project data comes from context)
  const fetchMessages = useCallback(async (isInitialLoad = false) => {
    if (!projectId) return;
    try {
      const res = await fetch('/api/messages');
      if (res.ok) {
        const data = await res.json();
        const newMessages = data.messages || [];
        if (!isInitialLoad && lastMessageCountRef.current > 0 && newMessages.length > lastMessageCountRef.current) {
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage.sender_type === 'admin' || lastMessage.sender_type === 'ai') {
            playNotificationSound();
          }
        }
        lastMessageCountRef.current = newMessages.length;
        setMessages(newMessages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, playNotificationSound]);

  useEffect(() => {
    if (chatUnlocked && projectId) {
      fetchMessages(true);
    } else {
      setLoading(false);
    }

    // Defer admin status
    const adminStatusTimeout = setTimeout(() => {
      fetch('/api/admin/status')
        .then(res => res.ok ? res.json() : null)
        .then(data => data && setAdminStatus(data.status || 'offline'))
        .catch(() => {});
    }, 1000);

    let interval: NodeJS.Timeout;
    if (chatUnlocked && projectId) {
      interval = setInterval(() => {
        if (!document.hidden) fetchMessages();
      }, 10000);
    }

    const handleVisibilityChange = () => {
      if (!document.hidden && chatUnlocked && projectId) fetchMessages();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (interval) clearInterval(interval);
      clearTimeout(adminStatusTimeout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchMessages, chatUnlocked, projectId]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetch('/api/admin/status')
          .then(res => res.ok ? res.json() : null)
          .then(data => data && setAdminStatus(data.status || 'offline'))
          .catch(() => {});
      }
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Only auto-scroll if user was at the bottom
  useEffect(() => {
    if (isAtBottom.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, aiStreamText]);

  useEffect(() => {
    const handleClickOutside = () => setMenuOpenId(null);
    if (menuOpenId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [menuOpenId]);

  // Trigger AI response via streaming SSE
  const triggerAiResponse = useCallback(async (clientMessage: string, isChangeRequest = false, isMistakeReport = false, mistakeDetailsCaptured = false) => {
    if (!projectId) return;
    setAiStreaming(true);
    setAiStreamText('');
    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: clientMessage, projectId, isChangeRequest, isMistakeReport, mistakeDetailsCaptured }),
      });

      // Non-streaming response (escalation or rate limit)
      if (res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        if (data.message) {
          setMessages((prev) => [...prev, data.message]);
          lastMessageCountRef.current += 1;
          playNotificationSound();
        }
        setAiStreaming(false);
        setAiStreamText('');
        return;
      }

      // Streaming SSE response
      const reader = res.body?.getReader();
      if (!reader) { setAiStreaming(false); return; }

      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.content) {
              fullText += payload.content;
              setAiStreamText(fullText);
            }
            if (payload.done && payload.messageId) {
              // Stream complete — add the final saved message
              setMessages((prev) => [...prev, {
                id: payload.messageId,
                project_id: projectId,
                sender_type: 'ai' as const,
                message: fullText,
                created_at: payload.created_at || new Date().toISOString(),
              }]);
              lastMessageCountRef.current += 1;
              playNotificationSound();
            }
          } catch {
            // Skip malformed SSE lines
          }
        }
      }
    } catch (error) {
      console.error('AI chat error:', error);
    } finally {
      setAiStreaming(false);
      setAiStreamText('');
    }
  }, [projectId, playNotificationSound]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && pendingAttachments.length === 0) || !projectId || sending) {
      return;
    }
    const messageText = newMessage.trim();
    setSending(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          projectId,
          attachments: pendingAttachments.length > 0 ? pendingAttachments : null,
          aiEnabled: true,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [...prev, data.message]);
        setNewMessage('');
        setPendingAttachments([]);
        lastMessageCountRef.current += 1;

        // If a revision round was auto-created, add it to messages
        const wasChangeRequest = !!data.revisionRound;
        const wasMistakeReport = !!data.isMistakeReport;
        const wasMistakeDetailsCaptured = !!data.mistakeDetailsCaptured;
        if (data.revisionRound) {
          setMessages((prev) => [...prev, data.revisionRound]);
          lastMessageCountRef.current += 1;
        }

        // Trigger AI response after client message
        setTimeout(() => triggerAiResponse(messageText, wasChangeRequest, wasMistakeReport, wasMistakeDetailsCaptured), 800);
      } else {
        alert(`Failed to send: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleEditMessage = async () => {
    if (!editingMessage || !editText.trim()) return;
    try {
      const res = await fetch('/api/messages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: editingMessage.id, message: editText.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => prev.map((m) => (m.id === editingMessage.id ? data.message : m)));
        setEditingMessage(null);
        setEditText('');
      }
    } catch (error) {
      console.error('Error editing message:', error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Delete this message?')) return;
    try {
      const res = await fetch(`/api/messages?messageId=${messageId}`, { method: 'DELETE' });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        lastMessageCountRef.current -= 1;
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  // Handle quick reply — uses AI if enabled, otherwise falls back to auto-reply
  const handleQuickReply = async (reply: string) => {
    if (!projectId || sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: reply, projectId, aiEnabled: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [...prev, data.message]);
        lastMessageCountRef.current += 1;

        // If a revision round was auto-created, add it to messages
        const wasChangeRequest = !!data.revisionRound;
        const wasMistakeReport = !!data.isMistakeReport;
        const wasMistakeDetailsCaptured = !!data.mistakeDetailsCaptured;
        if (data.revisionRound) {
          setMessages((prev) => [...prev, data.revisionRound]);
          lastMessageCountRef.current += 1;
        }

        // Trigger AI response after quick reply
        setTimeout(() => triggerAiResponse(reply, wasChangeRequest, wasMistakeReport, wasMistakeDetailsCaptured), 800);
      } else {
        alert(`Failed to send: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !projectId) return;
    setUploading(true);
    const newAttachments: Attachment[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        alert(`${file.name} is not an image or video`);
        continue;
      }
      if (file.size > 50 * 1024 * 1024) {
        alert(`${file.name} is too large. Maximum size is 50MB`);
        continue;
      }
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('projectId', projectId);
        const res = await fetch('/api/chat-upload', { method: 'POST', body: formData });
        if (res.ok) {
          const data = await res.json();
          newAttachments.push({ url: data.url, type: data.type, name: data.name });
        } else {
          const error = await res.json();
          alert(`Failed to upload ${file.name}: ${error.error}`);
        }
      } catch (error) {
        console.error('Upload error:', error);
        alert(`Failed to upload ${file.name}`);
      }
    }
    if (newAttachments.length > 0) setPendingAttachments((prev) => [...prev, ...newAttachments]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePendingAttachment = (index: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Count revision rounds used by looking for revision round marker messages
  const REVISION_MARKER = '📋 Revision Round';
  const revisionRoundsUsed = messages.filter(
    (m) => m.sender_type === 'client' && m.message.startsWith(REVISION_MARKER)
  ).length;
  const hasRevisionsLeft = isUnlimited || revisionRoundsUsed < (revisionRounds as number);

  const handleUseRevisionRound = async () => {
    if (!projectId || submittingRevision) return;
    if (!isUnlimited && revisionRoundsUsed >= (revisionRounds as number)) return;

    const roundNumber = revisionRoundsUsed + 1;
    const confirmMsg = isUnlimited
      ? `Submit Revision Round ${roundNumber}? This will notify the team to review your latest feedback.`
      : `Submit Revision Round ${roundNumber} of ${revisionRounds}? This will notify the team to review your latest feedback.`;

    if (!confirm(confirmMsg)) return;

    setSubmittingRevision(true);
    try {
      const message = `📋 Revision Round ${roundNumber} Submitted\nPlease review my feedback above and implement the requested changes.`;
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, projectId }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [...prev, data.message]);
        lastMessageCountRef.current += 1;
      } else {
        alert(`Failed to submit: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error submitting revision round:', error);
      alert('Failed to submit revision round');
    } finally {
      setSubmittingRevision(false);
    }
  };

  const handleUndoRevision = async (markerId: string) => {
    if (!projectId) return;
    try {
      const res = await fetch('/api/messages/revert-revision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== markerId));
        lastMessageCountRef.current -= 1;
      }
    } catch (error) {
      console.error('Error reverting revision:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getDateLabel = (dateStr: string): string => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted">No project found.</p>
        <Link href="/portal" className="text-[var(--color-accent)] hover:underline mt-2 inline-block">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header - renders instantly */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight"><GradientText>Chat</GradientText></h1>
          <p className="text-text-muted mt-1">
            {isUnlimited ? (
              <>
                Unlimited revisions — <NumberTicker value={revisionRoundsUsed} format="number" /> round{revisionRoundsUsed !== 1 ? 's' : ''} used
              </>
            ) : (
              <>
                <NumberTicker value={revisionRoundsUsed} format="number" /> of <NumberTicker value={revisionRounds as number} format="number" /> revision rounds used
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {chatUnlocked && hasRevisionsLeft && (
            <PortalButton
              type="button"
              onClick={handleUseRevisionRound}
              disabled={submittingRevision}
              className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-accent)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              {submittingRevision ? 'Submitting...' : 'Use Revision Round'}
            </PortalButton>
          )}
          {chatUnlocked && (
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-[var(--color-background)] rounded-lg transition-colors"
              title="Chat Settings"
            >
              <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Locked State - renders instantly from context */}
      {!chatUnlocked && (
        <motion.div
          className="rounded-2xl border border-white/70 bg-white/70 backdrop-blur-md shadow-[0_1px_2px_-1px_rgba(11,27,58,0.08),0_12px_40px_-12px_rgba(11,27,58,0.20),inset_0_1px_0_0_rgba(255,255,255,0.7)] p-8 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-2"><GradientText>Chat Unlocks After Deposit</GradientText></h2>
          <p className="text-text-muted mb-4 max-w-md mx-auto">
            Once you pay your deposit, you&apos;ll have direct access to chat with us throughout your entire project.
          </p>
          {/* AUDIT 2026-08-12 (P2): this panel named the blocker and then stopped — a dead end.
              The client is told chat unlocks after the deposit, with no way to go and pay it.
              Give them the next action. */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <Link
              href="/portal/proposals"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold bg-[var(--color-accent)] text-white"
            >
              View your proposal &amp; pay the deposit
            </Link>
            <Link
              href="/portal/status"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold border border-[var(--color-accent)]/30 text-text-primary"
            >
              See project status
            </Link>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg text-sm text-text-muted">
            <span>Current status:</span>
            <span className="font-medium text-text-primary capitalize">{projectStatus.replace(/_/g, ' ')}</span>
          </div>
        </motion.div>
      )}

      {/* Chat Interface */}
      {chatUnlocked && (
        <>
          <div className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-md overflow-hidden shadow-[0_10px_40px_-14px_rgba(11,27,58,0.18)]">
            {/* Chat Header */}
            <div className="px-5 py-3.5 border-b border-border bg-gradient-to-r from-[#E0F5FB] to-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm ring-1 ring-border overflow-hidden">
                      <img src="/brand/stratalanding.png" alt="StrataLanding" className="w-7 h-7 object-contain" />
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${adminStatus === 'online' ? 'bg-emerald-500' : adminStatus === 'busy' ? 'bg-yellow-500' : 'bg-border'} border-2 border-[var(--color-surface)] rounded-full`}></span>
                  </div>
                  <div>
                    <h2 className="font-semibold text-text-primary"><GradientText>StrataLanding Team</GradientText></h2>
                    <p className="text-xs text-text-muted">
                      {adminStatus === 'online' ? <span className="inline-flex items-center gap-1.5 text-emerald-600"><LiveDot color="#059669" size={7} />Online</span> : adminStatus === 'busy' ? <span className="text-yellow-600">Busy</span> : <span className="text-gray-500">Offline</span>}
                    </p>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full"><NumberTicker value={messages.length} format="number" /> messages</span>
              </div>
            </div>

            {/* Messages Area */}
            <div className="h-96 overflow-y-auto p-6 space-y-4 bg-gray-50/50" onScroll={handleScroll}>
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-[var(--color-accent)] rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-[var(--color-accent)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">👋</span>
                  </div>
                  <h3 className="font-medium text-text-primary mb-1">Welcome to your chat!</h3>
                  <p className="text-text-muted text-sm">Send us a message to start a conversation about your project.</p>
                </div>
              ) : (
                <>
                <AnimatePresence initial={false}>
                  {messages.map((msg, index) => {
                    const prevMsg = index > 0 ? messages[index - 1] : null;
                    const showDateSeparator = !prevMsg || new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();

                    return (
                    <div key={msg.id}>
                    {showDateSeparator && (
                      <div className="flex items-center gap-3 py-3">
                        <div className="flex-1 h-px bg-border"></div>
                        <span className="text-xs text-text-muted whitespace-nowrap">{getDateLabel(msg.created_at)}</span>
                        <div className="flex-1 h-px bg-border"></div>
                      </div>
                    )}
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                      className={`flex gap-2 ${msg.sender_type === 'client' ? 'justify-end' : 'justify-start'} group`}
                    >
                      {msg.sender_type !== 'client' && (
                        <div className="flex-shrink-0 mt-1">
                          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm ring-1 ring-border overflow-hidden">
                            <img src="/brand/stratalanding.png" alt="StrataLanding" className="w-5 h-5 object-contain" />
                          </div>
                        </div>
                      )}
                      <div className="relative max-w-[80%]">
                        {/* AI message label */}
                        {msg.sender_type === 'ai' && (
                          <div className="flex items-center gap-1 mb-1">
                            <svg className="w-3 h-3 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            <span className="text-xs font-medium text-cyan-600">StrataLanding AI</span>
                          </div>
                        )}
                        <div className={`rounded-2xl px-4 py-3 shadow-[0_4px_16px_-8px_rgba(11,27,58,0.18)] ${
                          msg.sender_type === 'client'
                            ? 'bg-[var(--color-accent)] text-white rounded-br-md'
                            : msg.sender_type === 'ai'
                            ? 'bg-cyan-50 border border-cyan-200 text-text-primary rounded-bl-md'
                            : 'bg-white border border-border text-text-primary rounded-bl-md'
                        }`}>
                          {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                            <div className="mb-2 space-y-2">
                              {msg.attachments.map((attachment, i) => (
                                <div key={i} className="rounded-lg overflow-hidden">
                                  {attachment.type === 'image' ? (
                                    <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                                      <img src={attachment.url} alt={attachment.name} className="max-w-full max-h-60 rounded-lg cursor-pointer hover:opacity-90" />
                                    </a>
                                  ) : (
                                    <video src={attachment.url} controls className="max-w-full max-h-60 rounded-lg">Your browser does not support video playback.</video>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {msg.message && <p className="text-sm whitespace-pre-wrap">{msg.message}</p>}
                          <div className="flex items-center justify-between gap-2 mt-1">
                            {settings.showTimestamps && (
                              <p className={`text-xs ${msg.sender_type === 'client' ? 'text-white/70' : 'text-text-muted'}`}>{formatTime(msg.created_at)}</p>
                            )}
                            {/* Undo button for auto-created revision markers */}
                            {msg.sender_type === 'client' && msg.message.startsWith(REVISION_MARKER) && msg.message.includes('Automatically counted') && (
                              <button
                                onClick={() => handleUndoRevision(msg.id)}
                                className="text-xs text-white/70 hover:text-white flex items-center gap-1 transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2M3 10l4-4m-4 4l4 4" />
                                </svg>
                                Undo
                              </button>
                            )}
                            {msg.sender_type === 'client' && !(msg.message.startsWith(REVISION_MARKER) && msg.message.includes('Automatically counted')) && (
                              <div className="relative">
                                <button onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === msg.id ? null : msg.id); }} className="p-1 hover:bg-white/20 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                  <svg className="w-4 h-4 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                                  </svg>
                                </button>
                                {menuOpenId === msg.id && (
                                  <div className="absolute right-0 bottom-full mb-1 bg-white border border-border rounded-lg shadow-lg py-1 z-50 min-w-[100px]">
                                    <button onClick={() => { setEditingMessage(msg); setEditText(msg.message); setMenuOpenId(null); }} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-text-primary">
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                      Edit
                                    </button>
                                    <button onClick={() => { handleDeleteMessage(msg.id); setMenuOpenId(null); }} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 text-red-600 flex items-center gap-2">
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                    </div>
                    );
                  })}
                </AnimatePresence>

                {/* AI Streaming Indicator */}
                {aiStreaming && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="max-w-[80%]">
                      <div className="flex items-center gap-1 mb-1">
                        <svg className="w-3 h-3 text-cyan-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <span className="text-xs font-medium text-cyan-600">StrataLanding AI</span>
                      </div>
                      <div className="rounded-2xl px-4 py-3 shadow-[0_4px_16px_-8px_rgba(11,27,58,0.18)] bg-cyan-50 border border-cyan-200 text-text-primary rounded-bl-md">
                        {aiStreamText ? (
                          <p className="text-sm whitespace-pre-wrap">{aiStreamText}<span className="inline-block w-1.5 h-4 bg-cyan-500 ml-0.5 animate-pulse rounded-sm" /></p>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm text-text-muted">Thinking</span>
                            <span className="flex gap-1">
                              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input - instant */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-border bg-white">
              {pendingAttachments.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {pendingAttachments.map((attachment, index) => (
                    <div key={index} className="relative group">
                      {attachment.type === 'image' ? (
                        <img src={attachment.url} alt={attachment.name} className="w-20 h-20 object-cover rounded-lg border border-border" />
                      ) : (
                        <div className="w-20 h-20 bg-gray-100 rounded-lg border border-border flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </div>
                      )}
                      <button type="button" onClick={() => removePendingAttachment(index)} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <span className="text-xl">😊</span>
                  </button>
                  <EmojiPicker isOpen={showEmojiPicker} onClose={() => setShowEmojiPicker(false)} onSelect={handleEmojiSelect} />
                </div>
                <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={handleFileUpload} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50" title="Upload image or video">
                  {uploading ? (
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-[var(--color-accent)] rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  )}
                </button>
                <input ref={inputRef} type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type your message..." className="flex-1 px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] text-sm" disabled={sending} />
                <PortalButton
                  type="submit"
                  disabled={(!newMessage.trim() && pendingAttachments.length === 0) || sending}
                  className="p-3 bg-[var(--color-accent)] text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  )}
                </PortalButton>
              </div>
            </form>
          </div>

          {/* Quick Replies */}
          {messages.length === 0 && !loading && (
            <motion.div
              className="mt-4 flex flex-wrap gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <p className="w-full text-xs text-text-muted mb-1">Quick replies:</p>
              {["Hi! I'm excited to get started 👋", "I have some feedback on the design", "When can I expect the first draft?", "What files do you need from me?"].map((reply) => (
                <button key={reply} onClick={() => handleQuickReply(reply)} disabled={sending} className="px-3 py-1.5 text-sm border border-white/60 bg-white/70 backdrop-blur-md shadow-[0_4px_16px_-10px_rgba(11,27,58,0.18)] hover:bg-white text-gray-700 rounded-full transition-colors disabled:opacity-50">
                  {reply}
                </button>
              ))}
            </motion.div>
          )}

          {/* Info Card */}
          <motion.div
            className="mt-6 p-4 rounded-2xl border border-white/70 bg-white/70 backdrop-blur-md shadow-[0_1px_2px_-1px_rgba(11,27,58,0.08),0_12px_40px_-12px_rgba(11,27,58,0.20),inset_0_1px_0_0_rgba(255,255,255,0.7)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-[var(--color-accent)]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div className="text-sm text-text-muted">
                <p className="font-medium text-text-primary mb-1"><GradientText>How revisions work</GradientText></p>
                <p>Share your feedback here and we&apos;ll incorporate changes during your revision rounds. Be specific about what you&apos;d like changed for faster turnaround.</p>
                {isUnlimited && (
                  <p className="mt-2 text-xs">Unlimited revisions are valid for 30 days after launch. Any revision requests after that period will be quoted separately.</p>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editingMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setEditingMessage(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-text-primary mb-4">Edit Message</h3>
              <textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] text-sm resize-none" rows={4} autoFocus />
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setEditingMessage(null)} className="px-4 py-2 text-sm text-text-muted hover:text-text-primary">Cancel</button>
                <button onClick={handleEditMessage} disabled={!editText.trim()} className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg text-sm font-medium disabled:opacity-50">Save</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Settings Modal */}
      <ChatSettings isOpen={showSettings} onClose={() => setShowSettings(false)} settings={settings} updateSettings={updateSettings} playNotificationSound={playNotificationSound} />
    </div>
  );
}
