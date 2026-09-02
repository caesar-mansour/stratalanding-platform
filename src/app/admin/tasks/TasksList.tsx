'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TaskWithContext, ProjectOption } from './page';
import { SpotlightCard, RevealGroup, RevealItem, NumberTicker, Pressable, SuccessCheck } from '@/app/admin/_components/motion';
import { toast } from '@/app/admin/_components/Toaster';
import { confirmDialog } from '@/app/admin/_components/ConfirmDialog';

type TaskStatus = 'pending' | 'in_progress' | 'completed';
type TaskPriority = 'low' | 'normal' | 'high';
type FilterTab = 'all' | TaskStatus;

const statusLabels: Record<TaskStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
};

const statusColors: Record<TaskStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
};

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-gray-100 text-gray-600',
  normal: 'bg-blue-50 text-blue-700',
  high: 'bg-red-100 text-red-700',
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, x: -20 },
};

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface TasksListProps {
  initialTasks: TaskWithContext[];
  projects: ProjectOption[];
}

export default function TasksList({ initialTasks, projects }: TasksListProps) {
  const [tasks, setTasks] = useState<TaskWithContext[]>(initialTasks);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newTask, setNewTask] = useState({
    projectId: '',
    title: '',
    description: '',
    priority: 'normal' as TaskPriority,
  });

  const filteredTasks = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

  const counts = {
    all: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };

  const updateTask = async (taskId: string, updates: { status?: TaskStatus; priority?: TaskPriority }) => {
    setUpdating(taskId);
    try {
      const res = await fetch('/api/admin/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, ...updates }),
      });
      if (res.ok) {
        setTasks(prev => prev.map(t =>
          t.id === taskId ? { ...t, ...updates } : t
        ));
        toast.success(updates.status === 'completed' ? 'Task completed' : 'Task updated');
      } else {
        throw new Error('Failed');
      }
    } catch (error) {
      console.error('Failed to update task:', error);
      toast.error('Could not update task', 'Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!(await confirmDialog({ title: 'Delete this task?', message: 'This cannot be undone.', confirmLabel: 'Delete', tone: 'danger' })).confirmed) return;
    try {
      const res = await fetch(`/api/admin/tasks?taskId=${taskId}`, { method: 'DELETE' });
      if (res.ok) {
        setTasks(prev => prev.filter(t => t.id !== taskId));
        toast.success('Task deleted');
      } else {
        throw new Error('Failed');
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast.error('Could not delete task', 'Please try again.');
    }
  };

  const createTaskHandler = async () => {
    if (!newTask.projectId || !newTask.title.trim()) {
      setCreateError('Project and title are required.');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/admin/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: newTask.projectId,
          title: newTask.title.trim(),
          description: newTask.description.trim(),
          priority: newTask.priority,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setCreateError(data.error || 'Failed to create task');
        toast.error('Could not create task', data.error || undefined);
        return;
      }
      const data = await res.json();
      // Build a TaskWithContext from the returned task + project info
      const project = projects.find(p => p.id === newTask.projectId);
      const newTaskWithContext: TaskWithContext = {
        ...data.task,
        project_package: project?.package || '',
        project_status: project?.status || '',
        client_name: project?.client_name || null,
        client_email: project?.client_email || '',
        company_name: project?.company_name || null,
      };
      setTasks(prev => [newTaskWithContext, ...prev]);
      setNewTask({ projectId: '', title: '', description: '', priority: 'normal' });
      setShowCreateForm(false);
      toast.success('Task created');
    } catch (error) {
      console.error('Failed to create task:', error);
      setCreateError('Network error. Please try again.');
      toast.error('Could not create task', 'Network error. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const filters: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <div>
      {/* Filter Tabs + Create Button */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-white border border-border text-text-muted hover:bg-gray-50'
            }`}
          >
            {f.label}
            <span className={`ml-1.5 text-xs tabular-nums ${filter === f.key ? 'text-white/70' : 'text-text-muted'}`}>
              <NumberTicker value={counts[f.key]} />
            </span>
          </button>
        ))}
        <div className="flex-1" />
        <Pressable
          onClick={() => { setShowCreateForm(!showCreateForm); setCreateError(null); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
            showCreateForm
              ? 'bg-gray-200 text-gray-700'
              : 'bg-[var(--color-accent)] text-white hover:opacity-90'
          }`}
        >
          {showCreateForm ? (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Task
            </>
          )}
        </Pressable>
      </div>

      {/* Create Task Form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mb-6"
          >
            <div className="bg-white rounded-xl border border-border p-5">
              <h3 className="font-medium text-text-primary mb-4">New Task</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Project Selector */}
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1.5">
                    Project <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newTask.projectId}
                    onChange={(e) => setNewTask(prev => ({ ...prev, projectId: e.target.value }))}
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
                  >
                    <option value="">Select a project...</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.company_name || p.client_name || p.client_email} — {p.package}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Priority */}
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1.5">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value as TaskPriority }))}
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              {/* Title */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-text-muted mb-1.5">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Update hero section copy"
                  maxLength={500}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
                />
              </div>
              {/* Description */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-text-muted mb-1.5">Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional details about the task..."
                  rows={3}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 resize-none"
                />
              </div>
              {/* Error */}
              {createError && (
                <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {createError}
                </div>
              )}
              {/* Submit */}
              <div className="flex justify-end">
                <Pressable
                  onClick={createTaskHandler}
                  disabled={creating}
                  className="px-5 py-2 bg-[var(--color-accent)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                >
                  {creating ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Creating...
                    </>
                  ) : (
                    'Create Task'
                  )}
                </Pressable>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h3 className="font-medium text-text-primary mb-1">
            {filter === 'all' ? 'No tasks yet' : `No ${statusLabels[filter as TaskStatus].toLowerCase()} tasks`}
          </h3>
          <p className="text-sm text-text-muted">
            Tasks are created automatically when clients request changes in chat.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredTasks.map((task, i) => (
              <motion.div
                key={task.id}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.2, delay: i * 0.03 }}
              >
                <SpotlightCard padded={false} className="rounded-xl border border-border overflow-hidden">
                {/* Task Header */}
                <div
                  className="px-5 py-4 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === task.id ? null : task.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {/* Priority Badge */}
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColors[task.priority]}`}>
                          {task.priority === 'high' ? '! High' : task.priority === 'low' ? 'Low' : 'Normal'}
                        </span>
                        {/* Status Badge */}
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[task.status]}`}>
                          {statusLabels[task.status]}
                        </span>
                        {/* Source Badge */}
                        {task.source === 'ai' && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-cyan-50 text-cyan-700">
                            AI
                          </span>
                        )}
                      </div>
                      <h3 className={`flex items-center gap-2 font-medium text-text-primary ${task.status === 'completed' ? 'line-through opacity-60' : ''}`}>
                        {task.status === 'completed' && <SuccessCheck show size={16} />}
                        <span>{task.title}</span>
                      </h3>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-text-muted">
                        <span>{task.client_name || task.client_email}</span>
                        {task.company_name && (
                          <>
                            <span>·</span>
                            <span>{task.company_name}</span>
                          </>
                        )}
                        <span>·</span>
                        <span>{timeAgo(task.created_at)}</span>
                      </div>
                    </div>

                    {/* Expand Arrow */}
                    <svg
                      className={`w-5 h-5 text-text-muted transition-transform flex-shrink-0 mt-1 ${expandedId === task.id ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Expanded Content */}
                <AnimatePresence>
                  {expandedId === task.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-4 border-t border-border pt-4">
                        {/* Full Description */}
                        {task.description && task.description !== task.title && (
                          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-text-primary whitespace-pre-wrap">{task.description}</p>
                          </div>
                        )}

                        {/* Actions Row */}
                        <div className="flex items-center gap-3 flex-wrap">
                          {/* Status Selector */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-text-muted">Status:</span>
                            <select
                              value={task.status}
                              onChange={(e) => updateTask(task.id, { status: e.target.value as TaskStatus })}
                              disabled={updating === task.id}
                              className="text-xs border border-border rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
                            >
                              <option value="pending">Pending</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                            </select>
                          </div>

                          {/* Priority Selector */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-text-muted">Priority:</span>
                            <select
                              value={task.priority}
                              onChange={(e) => updateTask(task.id, { priority: e.target.value as TaskPriority })}
                              disabled={updating === task.id}
                              className="text-xs border border-border rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
                            >
                              <option value="low">Low</option>
                              <option value="normal">Normal</option>
                              <option value="high">High</option>
                            </select>
                          </div>

                          <div className="flex-1" />

                          {/* Delete Button */}
                          <Pressable
                            onClick={() => deleteTask(task.id)}
                            className="text-xs text-red-500 hover:text-red-700 transition-colors flex items-center gap-1"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </Pressable>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                </SpotlightCard>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
