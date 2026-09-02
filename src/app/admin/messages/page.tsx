'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EmojiPicker, CannedResponses } from '@/components/chat';
import { Reveal, Pressable, Pulse, LiveDot } from '@/app/admin/_components/motion';
import { confirmDialog } from '@/app/admin/_components/ConfirmDialog';

interface Attachment {
  url: string;
  type: 'image' | 'video';
  name: string;
}

interface Message {
  id: string;
  project_id: string;
  sender_type: 'client' | 'admin';
  message: string;
  created_at: string;
  attachments?: Attachment[];
}

interface ProjectWithMessages {
  id: string;
  status: string;
  package: string;
  launched_at: string | null;
  clients: {
    id: string;
    name: string;
    email: string;
  };
  brief_submissions: {
    company_name: string;
  }[];
  messages: Message[];
  hasUnread: boolean;
  messageCount: number;
}

const REVISION_MARKER = '\u{1F4CB} Revision Round'; // Keep emoji in marker for DB compatibility — display uses icon below
const packageRevisions: Record<string, number | 'unlimited'> = {
  starter: 6,
  growth: 'unlimited',
  scale: 'unlimited',
};

function getRevisionInfo(project: ProjectWithMessages) {
  const total = packageRevisions[project.package] || 6;
  const isUnlimited = total === 'unlimited';
  const used = project.messages.filter(
    (m) => m.sender_type === 'client' && m.message.startsWith(REVISION_MARKER)
  ).length;
  const remaining = isUnlimited ? Infinity : (total as number) - used;

  // Check 30-day unlimited expiry
  let expired = false;
  if (isUnlimited && project.launched_at) {
    const launchDate = new Date(project.launched_at);
    const now = new Date();
    const daysSinceLaunch = (now.getTime() - launchDate.getTime()) / (1000 * 60 * 60 * 24);
    expired = daysSinceLaunch > 30;
  }

  return { total, isUnlimited, used, remaining, expired };
}

export default function AdminMessagesPage() {
  const [projects, setProjects] = useState<ProjectWithMessages[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectWithMessages | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editText, setEditText] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [revisionAction, setRevisionAction] = useState(false);
  const [showCannedResponses, setShowCannedResponses] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [adminStatus, setAdminStatus] = useState<'visible' | 'busy' | 'hidden'>('visible');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastMessageCountsRef = useRef<Record<string, number>>({});
  const selectedProjectRef = useRef<ProjectWithMessages | null>(null);

  // Keep ref in sync with state (avoids dependency loop in fetchProjects)
  useEffect(() => {
    selectedProjectRef.current = selectedProject;
  }, [selectedProject]);

  // Load sound setting
  useEffect(() => {
    const saved = localStorage.getItem('adminChatSoundEnabled');
    if (saved !== null) {
      setSoundEnabled(saved === 'true');
    }
  }, []);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (soundEnabled) {
      try {
        const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 600;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
      } catch {
        // Audio not available
      }
    }
  }, [soundEnabled]);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/messages');
      if (res.ok) {
        const data = await res.json();
        const newProjects = data.projects || [];

        // Check for new client messages
        newProjects.forEach((project: ProjectWithMessages) => {
          const clientMessages = project.messages.filter((m) => m.sender_type === 'client').length;
          const lastCount = lastMessageCountsRef.current[project.id] || 0;

          if (lastCount > 0 && clientMessages > lastCount) {
            playNotificationSound();
          }

          lastMessageCountsRef.current[project.id] = clientMessages;
        });

        setProjects(newProjects);
        const current = selectedProjectRef.current;
        if (current) {
          const updated = newProjects.find((p: ProjectWithMessages) => p.id === current.id);
          if (updated && updated.messages.length !== current.messages.length) {
            setSelectedProject(updated);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  }, [playNotificationSound]);

  useEffect(() => {
    fetchProjects();
    // COST (Neon): poll every 20s and ONLY while the tab is visible. A hidden tab no longer
    // re-queries the database, so leaving this page open in the background lets Neon sleep.
    const interval = setInterval(() => {
      if (!document.hidden) fetchProjects();
    }, 20000);
    return () => clearInterval(interval);
  }, [fetchProjects]);

  // Send admin heartbeat to update online status
  useEffect(() => {
    const sendHeartbeat = async () => {
      try {
        const res = await fetch('/api/admin/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.adminStatus) {
            setAdminStatus(data.adminStatus);
          }
        }
      } catch (error) {
        console.error('Error sending heartbeat:', error);
      }
    };

    sendHeartbeat();
    // COST (Neon): every 2 min, and skip when the tab is hidden — a hidden tab means you're away,
    // so there's no point writing an "online" heartbeat (and no point keeping the DB awake).
    const interval = setInterval(() => {
      if (!document.hidden) sendHeartbeat();
    }, 120000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedProject) {
      scrollToBottom();
    }
  }, [selectedProject?.messages]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setMenuOpenId(null);
    if (menuOpenId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [menuOpenId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && pendingAttachments.length === 0) || !selectedProject || sending) return;

    setSending(true);
    try {
      const res = await fetch('/api/admin/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: newMessage.trim(),
          projectId: selectedProject.id,
          attachments: pendingAttachments.length > 0 ? pendingAttachments : null,
        }),
      });

      if (res.ok) {
        setNewMessage('');
        setPendingAttachments([]);
        await fetchProjects();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleEditMessage = async () => {
    if (!editingMessage || !editText.trim()) return;

    try {
      const res = await fetch('/api/admin/messages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: editingMessage.id, message: editText.trim() }),
      });

      if (res.ok) {
        setEditingMessage(null);
        setEditText('');
        await fetchProjects();
      }
    } catch (error) {
      console.error('Error editing message:', error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!(await confirmDialog({ title: 'Delete this message?', message: 'This cannot be undone.', confirmLabel: 'Delete', tone: 'danger' })).confirmed) return;

    try {
      const res = await fetch(`/api/admin/messages?messageId=${messageId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchProjects();
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedProject) return;

    setUploading(true);
    const newAttachments: Attachment[] = [];

    for (const file of Array.from(files)) {
      // Validate file type
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        alert(`${file.name} is not an image or video`);
        continue;
      }

      // Validate file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        alert(`${file.name} is too large. Maximum size is 50MB`);
        continue;
      }

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('projectId', selectedProject.id);
        formData.append('userType', 'admin');

        const res = await fetch('/api/chat-upload', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          newAttachments.push({
            url: data.url,
            type: data.type,
            name: data.name,
          });
        } else {
          const error = await res.json();
          alert(`Failed to upload ${file.name}: ${error.error}`);
        }
      } catch (error) {
        console.error('Upload error:', error);
        alert(`Failed to upload ${file.name}`);
      }
    }

    if (newAttachments.length > 0) {
      setPendingAttachments((prev) => [...prev, ...newAttachments]);
    }

    setUploading(false);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePendingAttachment = (index: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem('adminChatSoundEnabled', String(newValue));
    if (newValue) {
      playNotificationSound();
    }
  };

  const cycleStatus = async () => {
    const nextStatus = adminStatus === 'visible' ? 'busy' : adminStatus === 'busy' ? 'hidden' : 'visible';
    try {
      const res = await fetch('/api/admin/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        setAdminStatus(data.adminStatus);
      }
    } catch (error) {
      console.error('Error changing status:', error);
    }
  };

  const handleRevisionAction = async (action: 'revert' | 'give') => {
    if (!selectedProject || revisionAction) return;
    setRevisionAction(true);
    try {
      const res = await fetch('/api/admin/revisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProject.id, action }),
      });
      if (res.ok) {
        await fetchProjects();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update revision');
      }
    } catch (error) {
      console.error('Error updating revision:', error);
    } finally {
      setRevisionAction(false);
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

  const getClientName = (project: ProjectWithMessages) => {
    const companyName = project.brief_submissions?.[0]?.company_name;
    return companyName || project.clients?.name || project.clients?.email || 'Unknown';
  };

  const totalUnread = projects.filter((p) => p.hasUnread).length;

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center justify-between"
        >
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-text-primary">Messages</h1>
              {totalUnread > 0 && (
                <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                  {totalUnread} unread
                </span>
              )}
            </div>
            <p className="text-text-muted mt-1">
              Chat with clients who have paid their deposit
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Status Toggle */}
            <button
              onClick={cycleStatus}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                adminStatus === 'visible' ? 'bg-green-100 text-green-700' :
                adminStatus === 'busy' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-500'
              }`}
              title="Click to change status"
            >
              <span className={`w-2 h-2 rounded-full ${
                adminStatus === 'visible' ? 'bg-green-500' :
                adminStatus === 'busy' ? 'bg-yellow-500' :
                'bg-gray-400'
              }`}></span>
              <span className="text-sm font-medium capitalize">{adminStatus}</span>
            </button>

            {/* Sound Toggle */}
            <button
              onClick={toggleSound}
              className={`p-2 rounded-lg transition-colors ${
                soundEnabled ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]' : 'bg-gray-100 text-gray-400'
              }`}
              title={soundEnabled ? 'Sound on' : 'Sound off'}
            >
              {soundEnabled ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              )}
            </button>
          </div>
        </motion.div>

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-64 bg-gray-100 rounded-lg"></div>
          </div>
        ) : projects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-xl border border-border p-12 text-center"
          >
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">No Active Chats</h2>
            <p className="text-text-muted">
              Clients who have paid their deposit will appear here.
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-14rem)]">
            {/* Project List */}
            <Reveal className="bg-white rounded-xl border border-border overflow-hidden flex flex-col h-full">
              <div className="px-4 py-3 border-b border-border bg-gray-50 shrink-0">
                <h2 className="font-semibold text-text-primary">Clients ({projects.length})</h2>
              </div>
              <div className="divide-y divide-border overflow-y-auto flex-1">
                {projects.map((project) => (
                  <motion.button
                    key={project.id}
                    onClick={() => setSelectedProject(project)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                      selectedProject?.id === project.id ? 'bg-[var(--color-accent)]/5' : ''
                    }`}
                    whileHover={{ x: 2 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-primary truncate">
                          {getClientName(project)}
                        </p>
                        <p className="text-xs text-text-muted">
                          {project.messageCount} messages · {project.status.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs mt-0.5">
                          {(() => {
                            const rev = getRevisionInfo(project);
                            if (rev.isUnlimited) {
                              return (
                                <span className={rev.expired ? 'text-red-500' : 'text-purple-500'}>
                                  {rev.expired ? 'Unlimited expired' : `${rev.used} rounds (unlimited)`}
                                </span>
                              );
                            }
                            const remaining = rev.remaining as number;
                            return (
                              <span className={remaining <= 0 ? 'text-red-500' : remaining <= 2 ? 'text-amber-500' : 'text-emerald-500'}>
                                {remaining}/{rev.total} revisions left
                              </span>
                            );
                          })()}
                        </p>
                      </div>
                      {project.hasUnread && (
                        <span className="flex-shrink-0 ml-2">
                          <Pulse active color="#ef4444">
                            <LiveDot color="#ef4444" size={10} />
                          </Pulse>
                        </span>
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
            </Reveal>

            {/* Chat Area */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-border overflow-hidden flex flex-col min-h-0">
              {selectedProject ? (
                <>
                  {/* Chat Header */}
                  <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-[#E8F0F8] to-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 bg-[var(--color-accent)] rounded-full flex items-center justify-center text-white font-bold">
                            {getClientName(selectedProject).charAt(0).toUpperCase()}
                          </div>
                          {selectedProject.hasUnread && (
                            <span className="absolute -top-0.5 -right-0.5">
                              <Pulse active color="#ef4444">
                                <LiveDot color="#ef4444" size={10} />
                              </Pulse>
                            </span>
                          )}
                        </div>
                        <div>
                          <h2 className="font-semibold text-text-primary">
                            {getClientName(selectedProject)}
                          </h2>
                          <p className="text-xs text-text-muted">
                            {selectedProject.clients?.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Revision rounds info */}
                        {(() => {
                          const rev = getRevisionInfo(selectedProject);
                          if (rev.isUnlimited) {
                            return (
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                rev.expired
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-purple-100 text-purple-700'
                              }`}>
                                {rev.expired
                                  ? `Unlimited expired (${rev.used} used)`
                                  : `${rev.used} rounds used (unlimited)`
                                }
                              </span>
                            );
                          }
                          const remaining = rev.remaining as number;
                          return (
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              remaining <= 0
                                ? 'bg-red-100 text-red-700'
                                : remaining <= 2
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {remaining <= 0
                                ? `0 of ${rev.total} revisions left`
                                : `${remaining} of ${rev.total} revisions left`
                              }
                            </span>
                          );
                        })()}
                        {/* Revision Controls */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleRevisionAction('revert')}
                            disabled={revisionAction || getRevisionInfo(selectedProject).used === 0}
                            className="text-xs px-2 py-1 rounded-full bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            title="Remove last revision round"
                          >
                            - Revert
                          </button>
                          <button
                            onClick={() => handleRevisionAction('give')}
                            disabled={revisionAction}
                            className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            title="Grant a revision round"
                          >
                            + Give
                          </button>
                        </div>
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                          {selectedProject.messages.length} messages
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          selectedProject.status === 'launched'
                            ? 'bg-green-100 text-green-700'
                            : selectedProject.status === 'paid_in_full'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {selectedProject.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
                    {selectedProject.messages.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <span className="text-3xl">💬</span>
                        </div>
                        <p className="text-text-muted">No messages yet. Start the conversation!</p>
                      </div>
                    ) : (
                      <AnimatePresence>
                        {selectedProject.messages.map((msg, index) => {
                          const prevMsg = index > 0 ? selectedProject.messages[index - 1] : null;
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
                            initial={index >= selectedProject.messages.length - 5 ? { opacity: 0, y: 10 } : false}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index >= selectedProject.messages.length - 5 ? (index - (selectedProject.messages.length - 5)) * 0.02 : 0 }}
                            className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'} group`}
                          >
                            <div className="relative max-w-[80%]">
                              <div
                                className={`rounded-2xl px-4 py-3 ${
                                  msg.sender_type === 'admin'
                                    ? 'bg-[var(--color-accent)] text-white rounded-br-md'
                                    : 'bg-white border border-border text-text-primary rounded-bl-md'
                                }`}
                              >
                                {/* Attachments */}
                                {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                                  <div className="mb-2 space-y-2">
                                    {msg.attachments.map((attachment, i) => (
                                      <div key={i} className="rounded-lg overflow-hidden">
                                        {attachment.type === 'image' ? (
                                          <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                                            <img
                                              src={attachment.url}
                                              alt={attachment.name}
                                              className="max-w-full max-h-60 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                            />
                                          </a>
                                        ) : (
                                          <video
                                            src={attachment.url}
                                            controls
                                            className="max-w-full max-h-60 rounded-lg"
                                          >
                                            Your browser does not support video playback.
                                          </video>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {msg.message && <p className="text-sm whitespace-pre-wrap">{msg.message}</p>}
                                <div className="flex items-center justify-between gap-2 mt-1">
                                  <p
                                    className={`text-xs ${
                                      msg.sender_type === 'admin' ? 'text-white/70' : 'text-text-muted'
                                    }`}
                                  >
                                    {formatTime(msg.created_at)}
                                  </p>
                                  {/* Message Actions */}
                                  <div className="relative">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setMenuOpenId(menuOpenId === msg.id ? null : msg.id);
                                      }}
                                      className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                                        msg.sender_type === 'admin' ? 'hover:bg-white/20' : 'hover:bg-gray-100'
                                      }`}
                                    >
                                      <svg className={`w-4 h-4 ${msg.sender_type === 'admin' ? 'text-white/70' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                                      </svg>
                                    </button>
                                    {menuOpenId === msg.id && (
                                      <div className="absolute right-0 bottom-full mb-1 bg-white border border-border rounded-lg shadow-lg py-1 z-50 min-w-[100px]">
                                        <button
                                          onClick={() => {
                                            setEditingMessage(msg);
                                            setEditText(msg.message);
                                            setMenuOpenId(null);
                                          }}
                                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-900"
                                        >
                                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                          </svg>
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => {
                                            handleDeleteMessage(msg.id);
                                            setMenuOpenId(null);
                                          }}
                                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 text-red-600 flex items-center gap-2"
                                        >
                                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                          Delete
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                          </div>
                          );
                        })}
                      </AnimatePresence>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <form onSubmit={handleSendMessage} className="p-4 border-t border-border bg-white">
                    {/* Pending Attachments Preview */}
                    {pendingAttachments.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {pendingAttachments.map((attachment, index) => (
                          <div key={index} className="relative group">
                            {attachment.type === 'image' ? (
                              <img
                                src={attachment.url}
                                alt={attachment.name}
                                className="w-20 h-20 object-cover rounded-lg border border-border"
                              />
                            ) : (
                              <div className="w-20 h-20 bg-gray-100 rounded-lg border border-border flex items-center justify-center">
                                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => removePendingAttachment(index)}
                              className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {/* Emoji Button */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <span className="text-xl">😊</span>
                        </button>
                        <EmojiPicker
                          isOpen={showEmojiPicker}
                          onClose={() => setShowEmojiPicker(false)}
                          onSelect={handleEmojiSelect}
                        />
                      </div>

                      {/* File Upload Button */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                        title="Upload image or video"
                      >
                        {uploading ? (
                          <div className="w-5 h-5 border-2 border-gray-300 border-t-[var(--color-accent)] rounded-full animate-spin" />
                        ) : (
                          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>

                      {/* Quick Replies Button */}
                      <button
                        type="button"
                        onClick={() => setShowCannedResponses(true)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Quick replies"
                      >
                        <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                      </button>

                      <input
                        ref={inputRef}
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your response..."
                        className="flex-1 px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] text-sm"
                        disabled={sending}
                      />
                      <Pressable
                        type="submit"
                        disabled={(!newMessage.trim() && pendingAttachments.length === 0) || sending}
                        className="p-3 bg-[var(--color-accent)] text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        ariaLabel="Send message"
                      >
                        {sending ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        )}
                      </Pressable>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex-1 min-h-0 flex items-center justify-center text-text-muted">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                      </svg>
                    </div>
                    <p className="font-medium text-text-primary">Select a client</p>
                    <p className="text-sm">Choose a conversation from the list</p>
                  </div>
                </div>
              )}
            </div>
          </div>
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
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-xl p-6 w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Message</h3>
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] text-sm resize-none"
                  rows={4}
                  autoFocus
                />
                <div className="flex justify-end gap-3 mt-4">
                  <button
                    onClick={() => setEditingMessage(null)}
                    className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEditMessage}
                    disabled={!editText.trim()}
                    className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Canned Responses Modal */}
        <CannedResponses
          isOpen={showCannedResponses}
          onClose={() => setShowCannedResponses(false)}
          onSelect={(response) => {
            setNewMessage(response);
            inputRef.current?.focus();
          }}
        />
      </div>
    </>
  );
}
