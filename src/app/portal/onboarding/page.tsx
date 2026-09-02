'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePortalData } from '../PortalDataContext';
import Link from 'next/link';
import {
  slideUp,
  slideUpDramatic,
  scaleUp,
  popIn,
  blurIn,
  heroText,
  heroWord,
  staggerContainerFast,
  spring,
} from '@/lib/motion';
import AnimatedLogo from '@/components/brand/AnimatedLogo';
import {
  GradientText,
  NumberTicker,
  MeterBar,
  AnimatedRing,
  SuccessCheck,
} from '../components/portal-ui';

const GLASS =
  'rounded-2xl border border-white/70 bg-white/70 backdrop-blur-md shadow-[0_1px_2px_-1px_rgba(11,27,58,0.08),0_12px_40px_-12px_rgba(11,27,58,0.20),inset_0_1px_0_0_rgba(255,255,255,0.7)]';

const TOPIC_LABELS = [
  'Brand Voice',
  'Unique Selling Proposition',
  'Competitors',
  'Ideal Customer',
  'Customer Journey',
  'Core Offerings',
  'Social Proof',
  'Design Preferences',
  'Call-to-Action',
  'Content & Assets',
];

const TOPIC_ICONS = [
  '\u{1F3A8}', '\u{1F48E}', '\u{1F3AF}', '\u{1F464}',
  '\u{1F6E4}\u{FE0F}', '\u{1F4E6}', '\u{2B50}', '\u{1F58C}\u{FE0F}',
  '\u{1F3C6}', '\u{1F4C1}',
];

type Phase = 'welcome' | 'generating' | 'answering' | 'submitting' | 'completed';

function generateConfetti() {
  const colors = ['#0891B2', '#06B6D4', '#22D3EE', '#10B981', '#34D399', '#F59E0B', '#FBBF24'];
  return Array.from({ length: 24 }, (_, i) => ({
    id: i,
    x: 10 + Math.random() * 80,
    color: colors[i % colors.length],
    delay: i * 0.04,
    rotation: -180 + Math.random() * 360,
    size: 4 + Math.random() * 6,
  }));
}

const LOADING_MESSAGES = [
  'Reading your brief',
  'Analyzing your industry',
  'Understanding your audience',
  'Studying your competitors',
  'Mapping your customer journey',
  'Crafting personalized questions',
  'Almost there',
];

function GeneratingScreen() {
  const [activeStep, setActiveStep] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setActiveStep(prev => (prev < 9 ? prev + 1 : prev));
    }, 500);
    const msgInterval = setInterval(() => {
      setMsgIndex(prev => (prev < LOADING_MESSAGES.length - 1 ? prev + 1 : prev));
    }, 700);
    return () => { clearInterval(stepInterval); clearInterval(msgInterval); };
  }, []);

  return (
    <motion.div
      key="generating"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`${GLASS} p-8 md:p-12`}
    >
      {/* Logo pulse */}
      <div className="flex justify-center mb-8">
        <AnimatedLogo size={48} />
      </div>

      {/* Rotating status message */}
      <div className="text-center mb-8 h-12">
        <AnimatePresence mode="wait">
          <motion.p
            key={msgIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="text-lg font-semibold"
          >
            <GradientText>{LOADING_MESSAGES[msgIndex]}</GradientText>
            <span className="sl-cursor-blink text-text-primary">...</span>
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Topic pills lighting up one by one */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {TOPIC_LABELS.map((label, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: i <= activeStep ? 1 : 0.3,
              scale: i <= activeStep ? 1 : 0.95,
            }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors duration-300 ${
              i < activeStep
                ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]/30 text-[var(--color-accent)]'
                : i === activeStep
                  ? 'bg-[var(--color-accent)]/5 border-[var(--color-accent)]/20 text-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/20'
                  : 'bg-gray-50 border-gray-100 text-text-muted'
            }`}
          >
            <span>{TOPIC_ICONS[i]}</span>
            <span className="truncate">{label}</span>
            {i < activeStep && (
              <motion.svg
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-3 h-3 text-[var(--color-accent)] ml-auto flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </motion.svg>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

export default function OnboardingPage() {
  const { projects, brief } = usePortalData();
  const project = projects[0];

  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [answer, setAnswer] = useState('');
  const [phase, setPhase] = useState<Phase>('welcome');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);

  // Word-by-word reveal
  const [displayedText, setDisplayedText] = useState('');
  const [isRevealing, setIsRevealing] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isCompleted = sessionStatus === 'completed';
  const confettiPieces = useMemo(() => generateConfetti(), []);

  // Fetch existing session on mount
  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch('/api/onboarding');
        if (res.ok) {
          const data = await res.json();
          if (data.session) {
            setSessionStatus(data.session.status);
            setCurrentQuestion(data.session.current_question);
            setSessionStarted(true);

            // Load pre-generated questions
            if (data.questions?.length > 0) {
              setQuestions(data.questions);
            }

            // Count answered questions
            const clientAnswers = (data.messages || []).filter(
              (m: { role: string; question_number: number | null }) =>
                m.role === 'client' && m.question_number !== null
            );
            setAnsweredCount(clientAnswers.length);

            if (data.session.status === 'completed') {
              setPhase('completed');
            } else if (data.questions?.length > 0) {
              // Resume — show current question instantly
              const qIdx = Math.min(data.session.current_question, 10) - 1;
              setDisplayedText(data.questions[qIdx] || '');
              setPhase('answering');
            }
          }
        }
      } catch (error) {
        console.error('Error fetching onboarding:', error);
      } finally {
        setLoading(false);
      }
    }
    if (project) fetchSession();
    else setLoading(false);
  }, [project]);

  // Word-by-word reveal when question changes
  useEffect(() => {
    if (questions.length === 0 || phase !== 'answering') return;
    const fullText = questions[currentQuestion - 1];
    if (!fullText || displayedText === fullText) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setDisplayedText(fullText);
      setIsRevealing(false);
      return;
    }

    const words = fullText.split(' ');
    let wordIndex = 0;
    setIsRevealing(true);
    setDisplayedText('');

    const interval = setInterval(() => {
      wordIndex++;
      setDisplayedText(words.slice(0, wordIndex).join(' '));
      if (wordIndex >= words.length) {
        clearInterval(interval);
        setIsRevealing(false);
      }
    }, 25);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion, questions, phase]);

  // Auto-focus textarea after reveal completes
  useEffect(() => {
    if (phase === 'answering' && !isRevealing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [phase, isRevealing]);

  // Start session — generates all 10 questions at once
  const handleStartSession = useCallback(async () => {
    setSessionStarted(true);
    setPhase('generating');

    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startSession: true }),
      });
      const data = await res.json();

      if (data.questions?.length > 0) {
        setQuestions(data.questions);
        setCurrentQuestion(1);
        setPhase('answering');
      }
    } catch (error) {
      console.error('Start session error:', error);
      setPhase('welcome');
      setSessionStarted(false);
    }
  }, []);

  // Submit answer — instant navigation to next question
  const handleSubmitAnswer = useCallback(async () => {
    if (!answer.trim() || phase === 'submitting') return;

    const answerText = answer.trim();
    setSaveError(null);
    setPhase('submitting');

    // AUDIT 2026-08-12 (P1 U-02): answers used to be fire-and-forget —
    // `fetch(...).catch(console.error)` while the UI advanced regardless. A dropped connection, a
    // 500, or an expired session silently discarded the answer AND moved the client on, so someone
    // could type all ten answers and have the server keep none of them. On the last question it
    // even set 'completed' locally, so the client saw "you're done" against an empty interview.
    // The save is now awaited and a failure keeps the answer on screen so it can be retried.
    let saved = false;
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: answerText }),
      });
      saved = res.ok;
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSaveError(data.error || 'We could not save that answer. Please try again.');
      }
    } catch {
      setSaveError('Connection lost. Your answer is still here — please try again.');
    }

    if (!saved) {
      setPhase('answering'); // keep `answer` intact so nothing the client typed is lost
      return;
    }

    setAnswer('');
    setAnsweredCount(prev => prev + 1);

    if (currentQuestion >= 10) {
      // Brief pause for visual transition, then complete
      await new Promise(r => setTimeout(r, 600));
      setSessionStatus('completed');
      setPhase('completed');
    } else {
      setDisplayedText(''); // reset for new question reveal
      setCurrentQuestion(prev => prev + 1);
      setPhase('answering');
    }
  }, [answer, currentQuestion, phase]);

  // Guards
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

  if (!brief) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-text-primary mb-2">Brief Required</h2>
        <p className="text-text-muted mb-4">Please submit your project brief first.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto min-h-[55vh] flex flex-col justify-center">
      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-10 h-10 border-2 border-gray-200 border-t-[var(--color-accent)] rounded-full animate-spin" />
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ─── WELCOME SCREEN ─── */}
        {!loading && !sessionStarted && !isCompleted && (
          <motion.div
            key="welcome"
            variants={slideUpDramatic}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`${GLASS} p-8 md:p-12`}
          >
            <motion.div
              className="mx-auto mb-8 flex justify-center"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={spring.bouncy}
            >
              <AnimatedLogo size={56} />
            </motion.div>

            <motion.div variants={heroText} initial="hidden" animate="visible" className="text-center mb-3">
              {['Let\u2019s', 'Get', 'to', 'Know', 'Your', 'Business'].map((word, i) => (
                <motion.span
                  key={i}
                  variants={heroWord}
                  className="inline-block text-2xl md:text-3xl font-bold mr-2"
                >
                  <GradientText>{word}</GradientText>
                </motion.span>
              ))}
            </motion.div>

            <motion.p
              variants={blurIn}
              initial="hidden"
              animate="visible"
              className="text-center text-text-muted mb-8 max-w-md mx-auto"
            >
              10 quick questions to deeply understand your brand, customers, and goals.
            </motion.p>

            <motion.div
              variants={staggerContainerFast}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-10"
            >
              {TOPIC_LABELS.map((label, i) => (
                <motion.div
                  key={label}
                  variants={popIn}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-xs text-text-muted font-medium"
                >
                  <span>{TOPIC_ICONS[i]}</span>
                  <span className="truncate">{label}</span>
                </motion.div>
              ))}
            </motion.div>

            <div className="text-center">
              <motion.button
                onClick={handleStartSession}
                className="btn-shine px-10 py-4 bg-[var(--color-accent)] text-white rounded-xl text-base font-semibold shadow-lg shadow-[var(--color-accent)]/25 flex items-center gap-3 mx-auto"
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, ...spring.bouncy }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Begin Interview
              </motion.button>
              <motion.p
                className="text-xs text-text-muted mt-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                Takes about 5 minutes
              </motion.p>
            </div>
          </motion.div>
        )}

        {/* ─── GENERATING QUESTIONS ─── */}
        {!loading && phase === 'generating' && (
          <GeneratingScreen />
        )}

        {/* ─── QUESTION FLOW ─── */}
        {!loading && sessionStarted && phase !== 'generating' && !isCompleted && (
          <motion.div
            key="flow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Step Indicator */}
            <div className="mb-2">
              <div className="flex items-center gap-4 mb-3">
                <AnimatedRing
                  value={Math.min(currentQuestion, 10)}
                  max={10}
                  size={48}
                  stroke={5}
                  label={
                    <span className="text-[11px] font-bold text-text-primary">
                      <NumberTicker value={Math.min(currentQuestion, 10)} format="number" />
                    </span>
                  }
                />
                <div className="flex-1 flex gap-1">
                  {Array.from({ length: 10 }, (_, i) => (
                    <motion.div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                        i < answeredCount
                          ? 'bg-[var(--color-accent)]'
                          : i === answeredCount
                            ? 'bg-[var(--color-accent)]/50'
                            : 'bg-gray-200'
                      }`}
                      initial={{ scaleX: 0, opacity: 0 }}
                      animate={{ scaleX: 1, opacity: 1 }}
                      transition={{ delay: i * 0.03, duration: 0.3 }}
                      style={{ transformOrigin: 'left' }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-medium text-text-muted">
                  Question <NumberTicker value={Math.min(currentQuestion, 10)} format="number" /> of 10
                </span>
                <span className="text-xs font-medium text-[var(--color-accent)]">
                  {TOPIC_LABELS[Math.min(currentQuestion, 10) - 1]}
                </span>
              </div>
            </div>

            {/* Question Card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`q-${currentQuestion}`}
                initial={{ opacity: 0, x: 80, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -80, scale: 0.96 }}
                transition={spring.bouncy}
                className={`${GLASS} overflow-hidden`}
              >
                <div className="h-1 bg-gradient-to-r from-[var(--color-accent)] via-cyan-400 to-teal-400" />

                <div className="p-6 md:p-10">
                  {/* Topic badge */}
                  <div className="flex items-center gap-2 mb-6">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-sm font-semibold">
                      <span className="text-base">{TOPIC_ICONS[Math.min(currentQuestion, 10) - 1]}</span>
                      Q{Math.min(currentQuestion, 10)}
                    </span>
                    <span className="text-sm text-text-muted">
                      {TOPIC_LABELS[Math.min(currentQuestion, 10) - 1]}
                    </span>
                  </div>

                  {/* Question text with word reveal */}
                  <div className="min-h-[80px] mb-8">
                    <p className="text-lg md:text-xl font-medium text-text-primary leading-relaxed">
                      {displayedText}
                      {isRevealing && (
                        <span className="inline-block w-0.5 h-5 bg-[var(--color-accent)] ml-1 animate-pulse rounded-sm align-text-bottom" />
                      )}
                    </p>
                  </div>

                  {/* Answer area */}
                  <motion.div
                    variants={slideUp}
                    initial="hidden"
                    animate="visible"
                  >
                    <div className="border-t border-gray-100 pt-6">
                      <label className="block text-sm font-medium text-text-muted mb-2">
                        Your answer
                      </label>
                      <textarea
                        ref={textareaRef}
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        onKeyDown={(e) => {
                          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                            e.preventDefault();
                            handleSubmitAnswer();
                          }
                        }}
                        placeholder="Share your thoughts..."
                        className="w-full min-h-[120px] p-4 border border-border bg-white/60 backdrop-blur-sm rounded-xl text-base text-text-primary placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] resize-y transition-colors"
                        disabled={phase === 'submitting'}
                      />

                      <div className="flex items-center justify-between mt-4">
                        <span className="text-xs text-text-muted">
                          {answer.length > 0
                            ? `${answer.length} chars \u00B7 Ctrl+Enter to continue`
                            : 'Ctrl+Enter to continue'}
                        </span>
                        <motion.button
                          onClick={handleSubmitAnswer}
                          disabled={!answer.trim() || phase === 'submitting'}
                          className="px-6 py-2.5 bg-[var(--color-accent)] text-white rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-md shadow-[var(--color-accent)]/20"
                          whileHover={answer.trim() ? { scale: 1.03 } : {}}
                          whileTap={answer.trim() ? { scale: 0.97 } : {}}
                        >
                          {phase === 'submitting' ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Finishing
                            </>
                          ) : (
                            <>
                              {currentQuestion >= 10 ? 'Finish' : 'Continue'}
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                              </svg>
                            </>
                          )}
                        </motion.button>
                      </div>

                      {/* AUDIT 2026-08-12 (P1 U-02): tell the client when a save failed, with
                          aria-live so a screen reader announces it. Previously the failure was
                          invisible and the answer was silently discarded. */}
                      {saveError && (
                        <p
                          role="alert"
                          aria-live="assertive"
                          className="mt-3 text-sm text-red-600"
                        >
                          {saveError}
                        </p>
                      )}
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}

        {/* ─── COMPLETION SCREEN ─── */}
        {!loading && isCompleted && (
          <motion.div
            key="complete"
            variants={slideUpDramatic}
            initial="hidden"
            animate="visible"
            className={`${GLASS} p-8 md:p-12 text-center relative overflow-hidden`}
          >
            {/* Confetti */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {confettiPieces.map((piece) => (
                <motion.div
                  key={piece.id}
                  className="absolute rounded-full"
                  style={{
                    backgroundColor: piece.color,
                    left: `${piece.x}%`,
                    bottom: '0%',
                    width: piece.size,
                    height: piece.size,
                  }}
                  initial={{ opacity: 1, y: 0, scale: 1 }}
                  animate={{ opacity: 0, y: -500, scale: 0, rotate: piece.rotation }}
                  transition={{ duration: 1.8 + Math.random() * 0.5, delay: piece.delay, ease: 'easeOut' }}
                />
              ))}
            </div>

            <motion.div
              variants={scaleUp}
              initial="hidden"
              animate="visible"
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-50 ring-4 ring-emerald-100 flex items-center justify-center"
            >
              <SuccessCheck show size={40} color="#10B981" />
            </motion.div>

            <motion.h2
              className="text-2xl md:text-3xl font-bold mb-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <GradientText>Interview Complete!</GradientText>
            </motion.h2>

            <motion.p
              className="text-text-muted mb-8 max-w-md mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Our team now has everything needed to craft a landing page that truly represents your brand.
            </motion.p>

            <motion.div
              className="mb-8 max-w-xs mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <MeterBar percentage={100} color="#10B981" height={6} delay={0.7} shimmer />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="relative z-10"
            >
              <Link
                href="/portal"
                className="inline-flex items-center gap-2 px-8 py-3 bg-[var(--color-accent)] text-white rounded-xl text-sm font-semibold shadow-lg shadow-[var(--color-accent)]/25 hover:bg-[var(--color-accent)]/90 transition-colors"
              >
                Go to Dashboard
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </motion.div>

            <motion.p
              className="text-xs text-text-muted mt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              Our team will review your answers and reach out if we need anything.
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
