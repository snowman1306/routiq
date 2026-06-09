import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Send, Sparkles, Loader2, MessageCircle, Leaf,
  Search, Sprout, Clock, Brain, AlertTriangle, Flame,
  TrendingDown, CalendarCheck, Moon, HeartPulse, Sunrise,
  ArrowRight, ChevronRight, Save
} from 'lucide-react';
import './Chat.css';

/* ── Icon mapping for insight cards (server sends iconName strings) ── */
const ICON_MAP = {
  flame: Flame,
  'alert-triangle': AlertTriangle,
  brain: Brain,
  'calendar-check': CalendarCheck,
  moon: Moon,
  'trending-down': TrendingDown,
  'heart-pulse': HeartPulse,
  sprout: Sprout,
  leaf: Leaf,
  sunrise: Sunrise,
};

function PlantPersonIcon({ size = 24, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 🌱 Large, Prominent Outlined Sprout */}
      {/* Left Leaf Outline */}
      <path d="M 50 35 C 50 10, 26 5, 24 18 C 22 31, 50 35, 50 35" />
      {/* Right Leaf Outline */}
      <path d="M 50 35 C 50 10, 74 5, 76 18 C 78 31, 50 35, 50 35" />
      {/* Stem */}
      <path d="M 50 44 L 50 35" />

      {/* 🟦 Outlined Modern Square Head (Squircle) */}
      <rect x="12" y="38" width="76" height="56" rx="12" />

      {/* 😊 Warm Minimalist Line Expression */}
      {/* Left Smiling Eye */}
      <path d="M 33 62 Q 38 56 43 62" />
      {/* Right Smiling Eye */}
      <path d="M 57 62 Q 62 56 67 62" />
      {/* Soft Warm Smile */}
      <path d="M 42 78 Q 50 85 58 78" />
    </svg>
  );
}

function LotusIcon({ size = 18, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M32 10c-6 6-10 15-10 21 0 0 7-4 10-4s10 4 10 4c0-6-4-15-10-21Z" fill="#E89EAD" />
      <path d="M20 24c-6 4-7 16-7 20 0 0 8-3 11-6 0 0 2-8-4-14Z" fill="#F2C0C0" />
      <path d="M44 24c6 4 7 16 7 20 0 0-8-3-11-6 0 0-2-8 4-14Z" fill="#F2C0C0" />
      <path d="M32 6c-8 8-12 20-12 20s9 0 12 0 12-1 12-1-4-11-12-19Z" fill="#D9698C" />
      <path d="M20 44c4 6 8 10 12 10s8-4 12-10H20Z" fill="#A55F8F" />
    </svg>
  );
}

function BirdIcon({ size = 18, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 34c10-14 28-18 38-12 0 0-4-2-8 4 0 0 10 0 12 8 0 0-4-2-6 2-2 4-10 12-24 12S10 46 10 46c4-2 6-6 2-12Z" fill="#7BAF6A" />
      <path d="M34 38c0 6-6 10-12 10s-10-4-10-10 4-10 10-10c6 0 12 4 12 10Z" fill="#A5D0A4" />
      <path d="M44 24c2 0 4 2 4 4s-2 4-4 4-4-2-4-4 2-4 4-4Z" fill="#F4E3A1" />
      <path d="M38 20c4-4 10-4 14 0-4-2-10-2-14 0Z" fill="#9BB27D" />
    </svg>
  );
}

function getInsightIcon(iconName) {
  const Icon = ICON_MAP[iconName] || Sparkles;
  return <Icon size={20} />;
}

/* ── Suggested first prompts (icon-only, no emojis) ─────────────── */
const SUGGESTED_PROMPTS = [
  { label: 'Why do I lose consistency?', Icon: Search },
  { label: 'What habit complements my routine?', Icon: Sprout },
  { label: 'When am I most productive?', Icon: Clock },
  { label: 'What patterns do you notice?', Icon: Brain },
  { label: 'Am I close to burnout?', Icon: AlertTriangle },
];

function Chat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [insights, setInsights] = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [plantCatalog, setPlantCatalog] = useState([]);
  const [plantCatalogLoading, setPlantCatalogLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const DRAFT_FIELDS = [
    { key: 'name', label: 'Habit name', type: 'text' },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'when_specifically', label: 'When specifically', type: 'text' },
    { key: 'what_motivating', label: "What's motivating me", type: 'textarea' },
    { key: 'what_hindering', label: "What's hindering me", type: 'textarea' },
    { key: 'whom_tell', label: 'Whom do I tell?', type: 'text' },
    { key: 'who_inspires', label: 'Who inspires me?', type: 'text' },
    { key: 'milestones', label: 'My milestones are', type: 'textarea' },
    { key: 'treat_myself', label: "I'm gonna treat myself with", type: 'textarea' },
    { key: 'current_goal', label: 'Current goal', type: 'textarea' },
    { key: 'current_reward', label: 'Current reward', type: 'textarea' },
    { key: 'habit_time', label: 'Habit time', type: 'text' },
    { key: 'selected_plant_type', label: 'Which flower do you want for the habit?', type: 'plant-select' }
  ];

  const unlockedPlantOptions = plantCatalog.filter((plant) => plant.unlocked);

  const parseHabitDraftMessage = (content) => {
    const normalizedContent = content.toLowerCase();
    if (!normalizedContent.includes('habit draft') && !normalizedContent.includes('habit name')) {
      return null;
    }

    const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const values = {};

    lines.forEach((line) => {
      const bulletMatch = line.match(/^-\s*\*\*(.+?)\*\*:\s*(.+)$/);
      const colonMatch = line.match(/^(?:-\s*)?([^:\*][^:]+?):\s*(.+)$/);
      if (bulletMatch) {
        values[bulletMatch[1].trim().toLowerCase()] = bulletMatch[2].trim();
      } else if (colonMatch) {
        values[colonMatch[1].trim().toLowerCase()] = colonMatch[2].trim();
      }
    });

    const normalized = {};
    const normalizeLabel = (label) => label
      .replace(/\s+/g, ' ')
      .replace(/\?/g, '')
      .toLowerCase();

    const labelMap = {
      'habit draft': 'name',
      'habit name': 'name',
      'description': 'description',
      'when specifically': 'when_specifically',
      'what motivating me': 'what_motivating',
      'what motivating': 'what_motivating',
      "what's motivating me": 'what_motivating',
      'what hindering me': 'what_hindering',
      'what hindering': 'what_hindering',
      "what's hindering me": 'what_hindering',
      'whom do i tell': 'whom_tell',
      'who inspires me': 'who_inspires',
      'who inspires': 'who_inspires',
      'my milestones are': 'milestones',
      'milestones': 'milestones',
      "i'm gonna treat myself with": 'treat_myself',
      'treat myself': 'treat_myself',
      'current goal': 'current_goal',
      'current reward': 'current_reward',
      'habit time': 'habit_time',
      'plant type': 'selected_plant_type',
      'selected plant type': 'selected_plant_type'
      ,
      'habit id': 'id'
    };

    Object.entries(values).forEach(([label, value]) => {
      const key = labelMap[normalizeLabel(label)];
      if (key) {
        normalized[key] = value;
      }
    });

    if (Object.keys(normalized).length === 0) {
      return null;
    }

    return {
      type: 'habit-draft',
      ...normalized
    };
  };

  const isHabitDraftMessage = (msg) => msg?.draft?.type === 'habit-draft';

  const updateDraftField = (index, field, value) => {
    setMessages((prev) => prev.map((msg, idx) => {
      if (idx !== index || !isHabitDraftMessage(msg)) return msg;
      return {
        ...msg,
        draft: {
          ...msg.draft,
          [field]: value
        }
      };
    }));
  };

  const toggleDraftExpand = (index, expand) => {
    setMessages((prev) => prev.map((msg, idx) => {
      if (idx !== index || !isHabitDraftMessage(msg)) return msg;
      return {
        ...msg,
        draft: {
          ...msg.draft,
          expanded: typeof expand === 'boolean' ? expand : !msg.draft.expanded
        }
      };
    }));
  };

  const saveHabitDraft = async (index) => {
    const draftMessage = messages[index];
    if (!draftMessage?.draft) return;
    try {
      // If the draft already has an id, update the existing habit; otherwise create via chat endpoint
      let savedHabit;
      if (draftMessage.draft.id) {
        const id = draftMessage.draft.id;
        // prepare body with allowed fields
        const body = { ...draftMessage.draft };
        delete body.type;
        delete body.saved;
        const res = await api.put(`/habits/${id}`, body);
        savedHabit = res.data;
        // dispatch update event
        try { window.dispatchEvent(new CustomEvent('habit:updated', { detail: savedHabit })); } catch (e) {}
      } else {
        const res = await api.post('/chat/habit-draft', { draft: draftMessage.draft });
        savedHabit = res.data.habit;
        // dispatch created event
        try { window.dispatchEvent(new CustomEvent('habit:created', { detail: savedHabit })); } catch (e) {}
      }
      setMessages((prev) => prev.map((msg, idx) => {
        if (idx !== index) return msg;
        return {
          ...msg,
          draft: {
            ...msg.draft,
            saved: true
          }
        };
      }));
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Habit **${savedHabit.name}** has been created and added to your tracker. You can continue editing it in the Habits page if you want to refine any details.`
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: err.response?.data?.error || 'I could not save the habit draft right now. Please try again.'
        }
      ]);
    }
  };

  useEffect(() => {
    fetchInsights();
    fetchPlantCatalog();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchInsights = async () => {
    try {
      const res = await api.get('/chat/insights');
      setInsights(res.data.insights || []);
    } catch (err) {
      console.error('Failed to fetch insights:', err);
    } finally {
      setInsightsLoading(false);
    }
  };

  const fetchPlantCatalog = async () => {
    try {
      const res = await api.get('/habits/plant-catalog');
      setPlantCatalog(res.data.catalog || []);
    } catch (err) {
      console.error('Failed to fetch plant catalog:', err);
    } finally {
      setPlantCatalogLoading(false);
    }
  };

  const sendMessage = async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed || isLoading) return;

    const userMessage = { role: 'user', content: trimmed };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await api.post('/chat', {
        message: trimmed,
        history: newMessages.slice(0, -1),
      });

      const assistantMessage = {
        role: 'assistant',
        content: res.data.reply,
      };
      const parsedDraft = parseHabitDraftMessage(res.data.reply);
      if (parsedDraft) {
        assistantMessage.draft = { ...parsedDraft, saved: false, expanded: true };
      }

      setMessages(prev => [
        ...prev,
        assistantMessage,
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content:
            err.response?.data?.reply ||
            'The Oracle is momentarily unreachable. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handlePromptClick = (prompt) => {
    sendMessage(prompt);
  };

  const getPriorityClass = (priority) => {
    if (priority === 'high') return 'insight-high';
    if (priority === 'medium') return 'insight-medium';
    return 'insight-low';
  };

  const getPersonalityIcon = () => {
    const tone = user?.coaching_personality || 'supportive';
    if (tone === 'strict') return <LotusIcon size={18} className="chat-heading-icon" />;
    if (tone === 'calm') return <BirdIcon size={18} className="chat-heading-icon" />;
    return <Leaf size={18} className="chat-heading-icon" />;
  };

  const renderMessageContent = (content) => {
    const lines = content.split('\n');

    return lines.map((line, i) => {
      const trimmed = line.trim();
      if (trimmed === '') {
        return <div key={i} className="chat-line-break" />;
      }

      const headingMatch = trimmed.match(/^#{1,3}\s*(.+)$/);
      if (headingMatch) {
        const heading = headingMatch[1].trim();
        return (
          <div key={i} className="chat-heading-with-icon">
            {getPersonalityIcon()}
            <span className="chat-heading">{heading}</span>
          </div>
        );
      }

      let processed = line
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>');

      if (processed.trimStart().startsWith('- ') || processed.trimStart().startsWith('• ')) {
        const text = processed.replace(/^[\s]*[-•]\s*/, '');
        return (
          <div key={i} className="chat-bullet">
            <span className="bullet-dot" />
            <span dangerouslySetInnerHTML={{ __html: text }} />
          </div>
        );
      }

      return (
        <p key={i} className="chat-paragraph" dangerouslySetInnerHTML={{ __html: processed }} />
      );
    });
  };

  const renderHabitDraftForm = (msg, index) => {
    const expanded = !!msg.draft.expanded;
    return (
      <div className={`habit-draft ${expanded ? 'expanded' : 'collapsed'}`}>
        <div className="habit-draft-header" onClick={() => toggleDraftExpand(index)}>
          <div className="habit-draft-preview">
            <strong className="habit-draft-title">{msg.draft.name || 'Habit draft'}</strong>
            <span className="habit-draft-sub">{msg.draft.description ? msg.draft.description.slice(0, 80) : 'Tap to review and edit'}</span>
          </div>
          <div className="habit-draft-actions">
            <button className="habit-draft-toggle" aria-label="toggle" onClick={(e) => { e.stopPropagation(); toggleDraftExpand(index); }}>
              {expanded ? <ChevronRight style={{ transform: 'rotate(90deg)' }} /> : <ChevronRight />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="habit-draft-body">
            {DRAFT_FIELDS.map(({ key, label, type }) => (
            <label key={key} className="habit-draft-field">
              <span className="habit-draft-label">{label}</span>
              {type === 'textarea' ? (
                <textarea
                  value={msg.draft[key] || ''}
                  onChange={(e) => updateDraftField(index, key, e.target.value)}
                  rows={3}
                />
              ) : type === 'plant-select' ? (
                plantCatalogLoading ? (
                  <div className="plant-selector-loading">Loading flower choices...</div>
                ) : unlockedPlantOptions.length === 0 ? (
                  <div className="plant-selector-empty">
                    No unlocked flowers available yet. Grow a habit to unlock your first bloom.
                  </div>
                ) : (
                  <>
                    <select
                      value={msg.draft[key] || ''}
                      onChange={(e) => updateDraftField(index, key, e.target.value)}
                      className="plant-select"
                    >
                      <option value="" disabled>
                        Select your unlocked flower
                      </option>
                      {unlockedPlantOptions.map((plant) => (
                        <option key={plant.id} value={plant.id}>
                          {plant.name} — {plant.description}
                        </option>
                      ))}
                    </select>
                    {!msg.draft[key] && (
                      <p className="field-note">Choose one unlocked flower to represent this habit.</p>
                    )}
                  </>
                )
              ) : (
                <input
                  type="text"
                  value={msg.draft[key] || ''}
                  onChange={(e) => updateDraftField(index, key, e.target.value)}
                />
              )}
            </label>
          ))}

            <div className="habit-draft-footer">
              <button
                className="habit-draft-save-btn"
                onClick={() => saveHabitDraft(index)}
                disabled={msg.draft.saved}
              >
                {msg.draft.saved ? (
                  'Saved to tracker'
                ) : (
                  <>
                    <Save size={14} style={{ marginRight: 8 }} />
                    Confirm & save to tracker
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="oracle-page page-shell">
      <div className="page-width">
        {/* ── Header ──────────────────────────────── */}
        <div className="oracle-header">
          <div className="oracle-brand-mark">
            <PlantPersonIcon size={36} />
          </div>
          <span className="oracle-kicker eyebrow">Personalized Intelligence</span>
          <h1 className="oracle-title">The Oracle</h1>
          <p className="oracle-subtitle">
            Your habits tell a story. The Oracle reads between the lines — surfacing patterns,
            sensing burnout, and guiding your next step with precision.
          </p>
        </div>

        {/* ── Insight Cards ───────────────────────── */}
        <div className="insights-section">
          <div className="insights-header">
            <Sparkles size={16} className="insights-icon" />
            <span className="insights-label eyebrow">Live Observations</span>
          </div>
          {insightsLoading ? (
            <div className="insights-loading">
              <Loader2 size={18} className="spin" />
              <span>Reading your patterns...</span>
            </div>
          ) : insights.length > 0 ? (
            <div className="insights-grid">
              {insights.map((insight, idx) => (
                <div
                  key={idx}
                  className={`insight-card glass-panel ${getPriorityClass(insight.priority)}`}
                  onClick={() => handlePromptClick(`Tell me more about: ${insight.title}`)}
                >
                  <div className="insight-card-header">
                    <div className="insight-icon-wrap">
                      {getInsightIcon(insight.iconName)}
                    </div>
                    <span className="insight-type eyebrow">{insight.type}</span>
                  </div>
                  <h3 className="insight-title">{insight.title}</h3>
                  <p className="insight-body">{insight.body}</p>
                  <div className="insight-cta">
                    <span>Explore</span>
                    <ArrowRight size={13} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="insights-empty glass-panel">
              <Leaf size={28} className="insights-empty-icon" />
              <p>Start logging habits to unlock personalized insights.</p>
            </div>
          )}
        </div>

        {/* ── Chat Section ────────────────────────── */}
        <div className="chat-section">
          <div className="chat-header-bar">
            <MessageCircle size={16} />
            <span className="eyebrow">Reflect with the Oracle</span>
          </div>

          <div className="chat-container glass-panel">
            <div className="chat-messages">
              {messages.length === 0 && (
                <div className="chat-empty-state">
                  <div className="chat-oracle-avatar-lg">
                    <PlantPersonIcon size={42} />
                  </div>
                  <h3>What would you like to reflect on?</h3>
                  <p className="chat-empty-desc">
                    The Oracle draws from your real habit data to give deeply personal guidance.
                    Not generic productivity tips.
                  </p>
                  <div className="suggested-prompts">
                    {SUGGESTED_PROMPTS.map((prompt, idx) => (
                      <button
                        key={idx}
                        className="prompt-pill"
                        onClick={() => handlePromptClick(prompt.label)}
                      >
                        <prompt.Icon size={14} className="prompt-pill-icon" />
                        <span>{prompt.label}</span>
                        <ChevronRight size={12} className="prompt-pill-arrow" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`chat-message ${msg.role === 'user' ? 'chat-user' : 'chat-oracle'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="chat-avatar oracle-avatar">
                      <PlantPersonIcon size={20} />
                    </div>
                  )}
                  <div className="chat-bubble">
                    {msg.role === 'user' ? (
                      <p>{msg.content}</p>
                    ) : msg.draft ? (
                      <div className="oracle-response">
                        {renderHabitDraftForm(msg, idx)}
                      </div>
                    ) : (
                      <div className="oracle-response">
                        {renderMessageContent(msg.content)}
                      </div>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="chat-avatar user-avatar" style={{ padding: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {user?.avatar ? (
                        <img src={user.avatar} alt="User Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        user?.username?.charAt(0)?.toUpperCase() || 'U'
                      )}
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="chat-message chat-oracle">
                  <div className="chat-avatar oracle-avatar">
                    <PlantPersonIcon size={20} />
                  </div>
                  <div className="chat-bubble typing-bubble">
                    <div className="typing-indicator">
                      <span /><span /><span />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area">
              <div className="chat-input-wrap">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={"e.g. \"Add evening reading with full details for my tracker\""}
                  rows={1}
                  disabled={isLoading}
                  id="oracle-input"
                />
                <button
                  className="send-btn"
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isLoading}
                  id="oracle-send"
                  aria-label="Send message"
                >
                  {isLoading ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
                </button>
              </div>
              <span className="chat-disclaimer">
                Responses are grounded in your real habits, growth vines, and logged patterns.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Chat;
