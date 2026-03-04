'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import type { AIAgentResponse } from '@/lib/aiAgent'
import { listSchedules, getScheduleLogs, pauseSchedule, resumeSchedule, cronToHuman } from '@/lib/scheduler'
import type { Schedule, ExecutionLog } from '@/lib/scheduler'
import { FiPlay, FiSend, FiClock, FiChevronDown, FiChevronRight, FiExternalLink, FiAlertCircle, FiInfo, FiMinusCircle, FiRefreshCw, FiCalendar, FiMail, FiCheck, FiX, FiPause, FiActivity } from 'react-icons/fi'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MANAGER_AGENT_ID = '6999b01f7c1a227d082a458c'
const DIGEST_AGENT_ID = '6999b044a8fd90224a4a08dc'
const MANAGER_SCHEDULE_ID = '6999b04d399dfadeac37ef67'
const DIGEST_SCHEDULE_ID = '6999b04e399dfadeac37ef68'

const AGENTS_INFO = [
  { id: '6999b00ab6bf78a0c22a59bb', name: 'AI News Research Agent', role: 'Searches for the latest AI news using Perplexity' },
  { id: '6999b00a264b5dcfd14cfa9c', name: 'KPMG Strategic Analyst Agent', role: 'Categorizes news from KPMG perspective' },
  { id: MANAGER_AGENT_ID, name: 'AI News Intelligence Coordinator', role: 'Orchestrates research and analysis workflow' },
  { id: DIGEST_AGENT_ID, name: 'Daily Digest & Email Agent', role: 'Compiles digest and sends via Gmail' },
]

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

const THEME_VARS: React.CSSProperties & Record<string, string> = {
  '--background': '0 0% 98%',
  '--foreground': '0 0% 8%',
  '--card': '0 0% 100%',
  '--card-foreground': '0 0% 8%',
  '--primary': '0 0% 8%',
  '--primary-foreground': '0 0% 98%',
  '--accent': '0 80% 45%',
  '--muted': '0 0% 92%',
  '--muted-foreground': '0 0% 40%',
  '--border': '0 0% 85%',
} as React.CSSProperties & Record<string, string>

// ---------------------------------------------------------------------------
// TypeScript Interfaces
// ---------------------------------------------------------------------------

interface NewsItem {
  title: string
  summary: string
  source: string
  source_url: string
  reasoning: string
  recommended_action?: string
}

interface CategorizedNews {
  act_on: NewsItem[]
  know_about: NewsItem[]
  ignore: NewsItem[]
}

interface DigestData {
  categorized_news: CategorizedNews
  executive_summary: string
  scan_timestamp: string
  total_items: number
  email_status?: string
  date: string
}

interface EmailResult {
  digest_content: string
  email_status: string
  recipient: string
  subject_line: string
  items_included: number
  sent_timestamp: string
}

// ---------------------------------------------------------------------------
// Sample Data
// ---------------------------------------------------------------------------

const SAMPLE_DIGEST: DigestData = {
  categorized_news: {
    act_on: [
      {
        title: 'EU AI Act Enforcement Begins for High-Risk Systems',
        summary: 'The European Union has officially commenced enforcement of AI Act provisions covering high-risk AI systems in healthcare, finance, and critical infrastructure. Companies must demonstrate compliance by Q3 2026 or face penalties up to 7% of global revenue.',
        source: 'Reuters',
        source_url: 'https://reuters.com/technology/eu-ai-act',
        reasoning: 'Direct regulatory impact on KPMG advisory services and client compliance needs across all EU operations. Immediate revenue opportunity in AI governance consulting.',
        recommended_action: 'Launch EU AI Act compliance readiness assessment service. Brief all sector leads on the enforcement timeline and mobilize the AI governance practice to develop client-ready frameworks within 30 days.',
      },
      {
        title: 'OpenAI Launches Enterprise API with SOC 2 Type II Certification',
        summary: 'OpenAI has released a new enterprise-grade API tier with SOC 2 Type II certification, data residency options, and guaranteed SLAs. Early adopters include JPMorgan, Deloitte, and Siemens.',
        source: 'TechCrunch',
        source_url: 'https://techcrunch.com/openai-enterprise-api',
        reasoning: 'Competitor Deloitte is an early adopter. This removes a key barrier for KPMG clients considering GPT-based solutions. Must evaluate for internal use and client recommendations.',
        recommended_action: 'Schedule evaluation with KPMG Digital and procurement. Prepare competitive analysis on Big Four AI platform adoption. Consider pilot program for audit automation.',
      },
    ],
    know_about: [
      {
        title: 'Google DeepMind Achieves Breakthrough in Protein-Drug Interaction Modeling',
        summary: 'DeepMind published research showing a new AI model can predict protein-drug interactions with 94% accuracy, potentially reducing drug discovery timelines by 40%. Pharma companies are scrambling to integrate the technology.',
        source: 'Nature',
        source_url: 'https://nature.com/articles/deepmind-protein',
        reasoning: 'Relevant to KPMG Life Sciences practice. While not requiring immediate action, this signals accelerating AI adoption in pharma that will drive consulting demand in 6-12 months.',
      },
      {
        title: 'Anthropic Raises $5B Series E at $75B Valuation',
        summary: 'Anthropic closed a massive funding round led by Google and Spark Capital, valuing the company at $75 billion. The funds will accelerate development of Claude-based enterprise solutions and safety research.',
        source: 'Bloomberg',
        source_url: 'https://bloomberg.com/anthropic-funding',
        reasoning: 'Market signal confirming enterprise AI investment remains robust. Relevant context for advising clients on AI vendor landscape and technology strategy.',
      },
      {
        title: 'India Releases Draft AI Governance Framework',
        summary: 'India\'s Ministry of Electronics and IT published a draft AI governance framework emphasizing responsible AI development, data localization, and sector-specific guidelines for BFSI and healthcare.',
        source: 'Economic Times',
        source_url: 'https://economictimes.com/ai-governance-india',
        reasoning: 'Important for KPMG India operations and clients with Indian operations. Signals upcoming regulatory environment that will require compliance advisory.',
      },
    ],
    ignore: [
      {
        title: 'AI-Generated Art Wins Photography Award, Sparking Debate',
        summary: 'An AI-generated image won a major photography competition, reigniting debates about creativity, copyright, and the role of AI in arts.',
        source: 'The Guardian',
        source_url: 'https://theguardian.com/ai-art-award',
        reasoning: 'Cultural interest only. No direct impact on KPMG services, client needs, or strategic positioning.',
      },
      {
        title: 'New AI Chatbot Goes Viral on Social Media',
        summary: 'A consumer-facing AI chatbot gained 10 million users in its first week, featuring novel personality modes and entertainment features.',
        source: 'The Verge',
        source_url: 'https://theverge.com/ai-chatbot-viral',
        reasoning: 'Consumer product with no enterprise relevance. No impact on KPMG advisory or technology strategy.',
      },
    ],
  },
  executive_summary: 'Today\'s AI landscape shows significant regulatory momentum with the EU AI Act enforcement beginning and India releasing its governance draft. For KPMG, the immediate priority is the EU AI Act compliance opportunity, which creates a substantial advisory revenue stream. OpenAI\'s enterprise API launch with competitor early adoption requires urgent evaluation. The life sciences AI breakthrough and Anthropic\'s massive funding round signal sustained enterprise AI investment that will drive consulting demand throughout 2026.',
  scan_timestamp: '2026-02-21T07:30:00+05:30',
  total_items: 7,
  date: 'Friday, February 21, 2026',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseAgentResult(result: AIAgentResponse | null | undefined): Record<string, any> | null {
  if (!result?.response?.result) return null
  const raw = result.response.result
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return { text: raw }
    }
  }
  return raw as Record<string, any>
}

function formatDateEditorial(date?: Date): string {
  if (!date || isNaN(date.getTime())) return ''
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

function formatTimestamp(ts: string | null | undefined): string {
  if (!ts) return 'N/A'
  try {
    const d = new Date(ts)
    if (isNaN(d.getTime())) return ts
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ts
  }
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-3 mb-1 font-serif">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-base mt-3 mb-1 font-serif">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-lg mt-4 mb-2 font-serif">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm leading-relaxed">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-sm leading-relaxed">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm leading-relaxed">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part
  )
}

// ---------------------------------------------------------------------------
// ErrorBoundary
// ---------------------------------------------------------------------------

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(0 0% 98%)', color: 'hsl(0 0% 8%)' }}>
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2 font-serif">Something went wrong</h2>
            <p className="text-sm mb-4" style={{ color: 'hsl(0 0% 40%)' }}>{this.state.error}</p>
            <button onClick={() => this.setState({ hasError: false, error: '' })} className="px-4 py-2 text-sm rounded-none" style={{ background: 'hsl(0 0% 8%)', color: 'hsl(0 0% 98%)' }}>
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ---------------------------------------------------------------------------
// Sub-components (defined as functions above the default export)
// ---------------------------------------------------------------------------

function SkeletonLoader() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-5 rounded-none w-3/4" style={{ background: 'hsl(0 0% 92%)' }} />
      <div className="h-4 rounded-none w-full" style={{ background: 'hsl(0 0% 92%)' }} />
      <div className="h-4 rounded-none w-5/6" style={{ background: 'hsl(0 0% 92%)' }} />
      <div className="space-y-4 mt-8">
        {[1, 2, 3].map(n => (
          <div key={n} className="p-6 border" style={{ borderColor: 'hsl(0 0% 85%)' }}>
            <div className="h-5 rounded-none w-2/3 mb-3" style={{ background: 'hsl(0 0% 92%)' }} />
            <div className="h-4 rounded-none w-full mb-2" style={{ background: 'hsl(0 0% 92%)' }} />
            <div className="h-4 rounded-none w-4/5" style={{ background: 'hsl(0 0% 92%)' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="border p-4 mb-6 flex items-start gap-3" style={{ borderColor: 'hsl(0 80% 45%)', background: 'hsl(0 80% 97%)' }}>
      <FiAlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'hsl(0 80% 45%)' }} />
      <div className="flex-1">
        <p className="text-sm font-medium" style={{ color: 'hsl(0 80% 35%)' }}>Error</p>
        <p className="text-sm mt-1" style={{ color: 'hsl(0 80% 40%)' }}>{message}</p>
      </div>
      <button onClick={onDismiss} className="flex-shrink-0 p-1 hover:opacity-70 transition-opacity" aria-label="Dismiss">
        <FiX className="w-4 h-4" style={{ color: 'hsl(0 80% 45%)' }} />
      </button>
    </div>
  )
}

function NewsItemCard({ item, tier }: { item: NewsItem; tier: 'act_on' | 'know_about' | 'ignore' }) {
  const borderLeft = tier === 'act_on'
    ? 'hsl(0 80% 45%)'
    : tier === 'know_about'
    ? 'hsl(0 0% 30%)'
    : 'hsl(0 0% 75%)'

  return (
    <div className="border p-5 mb-4 transition-all duration-200" style={{ borderColor: 'hsl(0 0% 85%)', borderLeftWidth: '3px', borderLeftColor: borderLeft }}>
      <h4 className="font-serif font-bold text-base tracking-tight mb-2" style={{ color: 'hsl(0 0% 8%)' }}>
        {item?.title ?? 'Untitled'}
      </h4>
      <p className="text-sm leading-relaxed mb-3" style={{ color: 'hsl(0 0% 25%)' }}>
        {item?.summary ?? ''}
      </p>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-mono uppercase tracking-wide" style={{ color: 'hsl(0 0% 40%)' }}>
          {item?.source ?? 'Unknown source'}
        </span>
        {item?.source_url && (
          <>
            <span style={{ color: 'hsl(0 0% 75%)' }}>|</span>
            <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1 hover:underline" style={{ color: 'hsl(0 0% 30%)' }}>
              Read source <FiExternalLink className="w-3 h-3" />
            </a>
          </>
        )}
      </div>
      {item?.reasoning && (
        <div className="border-t pt-3 mt-3" style={{ borderColor: 'hsl(0 0% 90%)' }}>
          <p className="text-xs uppercase tracking-wider font-semibold mb-1" style={{ color: 'hsl(0 0% 50%)' }}>Strategic Reasoning</p>
          <p className="text-sm leading-relaxed" style={{ color: 'hsl(0 0% 35%)' }}>{item.reasoning}</p>
        </div>
      )}
      {tier === 'act_on' && item?.recommended_action && (
        <div className="mt-3 p-3 border" style={{ borderColor: 'hsl(0 80% 80%)', background: 'hsl(0 80% 97%)' }}>
          <p className="text-xs uppercase tracking-wider font-semibold mb-1" style={{ color: 'hsl(0 80% 45%)' }}>Recommended Action</p>
          <p className="text-sm leading-relaxed" style={{ color: 'hsl(0 80% 30%)' }}>{item.recommended_action}</p>
        </div>
      )}
    </div>
  )
}

function CategorySection({
  title,
  icon,
  items,
  tier,
  expanded,
  onToggle,
  accentColor,
}: {
  title: string
  icon: React.ReactNode
  items: NewsItem[]
  tier: 'act_on' | 'know_about' | 'ignore'
  expanded: boolean
  onToggle: () => void
  accentColor: string
}) {
  const safeItems = Array.isArray(items) ? items : []
  return (
    <div className="mb-6">
      <button onClick={onToggle} className="w-full flex items-center gap-3 pb-3 border-b group transition-all duration-200" style={{ borderColor: 'hsl(0 0% 85%)' }}>
        {expanded ? <FiChevronDown className="w-4 h-4" style={{ color: accentColor }} /> : <FiChevronRight className="w-4 h-4" style={{ color: accentColor }} />}
        <span style={{ color: accentColor }}>{icon}</span>
        <span className="font-serif font-bold text-lg tracking-tight" style={{ color: accentColor }}>{title}</span>
        <span className="ml-2 text-xs font-mono px-2 py-0.5 border" style={{ borderColor: accentColor, color: accentColor }}>
          {safeItems.length}
        </span>
      </button>
      {expanded && (
        <div className="mt-4">
          {safeItems.length === 0 ? (
            <p className="text-sm italic py-4" style={{ color: 'hsl(0 0% 60%)' }}>No items in this category.</p>
          ) : (
            safeItems.map((item, idx) => <NewsItemCard key={idx} item={item} tier={tier} />)
          )}
        </div>
      )}
    </div>
  )
}

function ScheduleCard({
  schedule,
  logs,
  isTogglingId,
  onToggle,
  onFetchLogs,
  logsExpanded,
  onToggleLogs,
}: {
  schedule: Schedule
  logs: ExecutionLog[]
  isTogglingId: string | null
  onToggle: (s: Schedule) => void
  onFetchLogs: (id: string) => void
  logsExpanded: boolean
  onToggleLogs: () => void
}) {
  const isToggling = isTogglingId === schedule.id

  const nameMap: Record<string, string> = {
    [MANAGER_SCHEDULE_ID]: 'AI News Intelligence Coordinator',
    [DIGEST_SCHEDULE_ID]: 'Daily Digest & Email Agent',
  }

  return (
    <div className="border p-5" style={{ borderColor: 'hsl(0 0% 85%)', background: 'hsl(0 0% 100%)' }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-serif font-bold text-sm tracking-tight" style={{ color: 'hsl(0 0% 8%)' }}>
            {nameMap[schedule.id] ?? schedule.agent_id}
          </h4>
          <p className="text-xs font-mono mt-1" style={{ color: 'hsl(0 0% 40%)' }}>
            {schedule?.cron_expression ? cronToHuman(schedule.cron_expression) : 'No schedule'}
            {schedule?.timezone ? ` (${schedule.timezone})` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono px-2 py-0.5 border ${schedule.is_active ? '' : ''}`} style={{ borderColor: schedule.is_active ? 'hsl(140 60% 40%)' : 'hsl(0 0% 75%)', color: schedule.is_active ? 'hsl(140 60% 30%)' : 'hsl(0 0% 50%)', background: schedule.is_active ? 'hsl(140 60% 95%)' : 'hsl(0 0% 96%)' }}>
            {schedule.is_active ? 'Active' : 'Paused'}
          </span>
          <button
            onClick={() => onToggle(schedule)}
            disabled={isToggling}
            className="p-1.5 border transition-all duration-200 hover:opacity-70 disabled:opacity-40"
            style={{ borderColor: 'hsl(0 0% 85%)' }}
            title={schedule.is_active ? 'Pause Schedule' : 'Resume Schedule'}
          >
            {isToggling ? (
              <FiRefreshCw className="w-3.5 h-3.5 animate-spin" style={{ color: 'hsl(0 0% 40%)' }} />
            ) : schedule.is_active ? (
              <FiPause className="w-3.5 h-3.5" style={{ color: 'hsl(0 0% 40%)' }} />
            ) : (
              <FiPlay className="w-3.5 h-3.5" style={{ color: 'hsl(0 0% 40%)' }} />
            )}
          </button>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs" style={{ color: 'hsl(0 0% 50%)' }}>
        <span className="flex items-center gap-1">
          <FiClock className="w-3 h-3" />
          Next: {schedule?.next_run_time ? formatTimestamp(schedule.next_run_time) : 'N/A'}
        </span>
        {schedule?.last_run_at && (
          <span className="flex items-center gap-1">
            <FiActivity className="w-3 h-3" />
            Last: {formatTimestamp(schedule.last_run_at)}
          </span>
        )}
      </div>

      <div className="mt-3 border-t pt-3" style={{ borderColor: 'hsl(0 0% 92%)' }}>
        <button
          onClick={() => {
            onToggleLogs()
            if (!logsExpanded) onFetchLogs(schedule.id)
          }}
          className="text-xs flex items-center gap-1 hover:underline transition-all duration-200"
          style={{ color: 'hsl(0 0% 40%)' }}
        >
          {logsExpanded ? <FiChevronDown className="w-3 h-3" /> : <FiChevronRight className="w-3 h-3" />}
          Execution History
        </button>
        {logsExpanded && (
          <div className="mt-2 space-y-1">
            {Array.isArray(logs) && logs.length > 0 ? (
              logs.slice(0, 5).map((log, i) => (
                <div key={log?.id ?? i} className="flex items-center gap-2 text-xs py-1 border-b" style={{ borderColor: 'hsl(0 0% 95%)' }}>
                  {log?.success ? (
                    <FiCheck className="w-3 h-3" style={{ color: 'hsl(140 60% 40%)' }} />
                  ) : (
                    <FiX className="w-3 h-3" style={{ color: 'hsl(0 80% 45%)' }} />
                  )}
                  <span className="font-mono" style={{ color: 'hsl(0 0% 50%)' }}>
                    {log?.executed_at ? formatTimestamp(log.executed_at) : 'N/A'}
                  </span>
                  {log?.error_message && (
                    <span className="truncate" style={{ color: 'hsl(0 80% 45%)' }}>{log.error_message}</span>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs py-2 italic" style={{ color: 'hsl(0 0% 60%)' }}>No execution logs found.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function AgentStatusBar({ agents, activeAgentId }: { agents: typeof AGENTS_INFO; activeAgentId: string | null }) {
  return (
    <div className="border p-5 mt-8" style={{ borderColor: 'hsl(0 0% 85%)', background: 'hsl(0 0% 100%)' }}>
      <h3 className="font-serif font-bold text-sm tracking-tight mb-3 uppercase" style={{ color: 'hsl(0 0% 40%)' }}>Agent Pipeline</h3>
      <div className="space-y-2">
        {agents.map(agent => (
          <div key={agent.id} className="flex items-center gap-3 py-1.5">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: activeAgentId === agent.id ? 'hsl(140 60% 45%)' : 'hsl(0 0% 80%)' }} />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold" style={{ color: 'hsl(0 0% 20%)' }}>{agent.name}</span>
              <span className="text-xs ml-2" style={{ color: 'hsl(0 0% 55%)' }}>{agent.role}</span>
            </div>
            {activeAgentId === agent.id && (
              <span className="text-xs font-mono px-2 py-0.5 border flex items-center gap-1" style={{ borderColor: 'hsl(140 60% 40%)', color: 'hsl(140 60% 30%)', background: 'hsl(140 60% 95%)' }}>
                <FiActivity className="w-3 h-3 animate-pulse" /> Running
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyState({ onRunNow, isScanning }: { onRunNow: () => void; isScanning: boolean }) {
  return (
    <div className="py-20 text-center">
      <FiCalendar className="w-12 h-12 mx-auto mb-6" style={{ color: 'hsl(0 0% 75%)' }} />
      <h2 className="font-serif font-bold text-2xl tracking-tight mb-3" style={{ color: 'hsl(0 0% 8%)' }}>
        No digest available yet
      </h2>
      <p className="text-sm leading-relaxed max-w-md mx-auto mb-8" style={{ color: 'hsl(0 0% 40%)' }}>
        Your first AI news digest will arrive tomorrow at 8 AM IST.
        Click below to generate one immediately.
      </p>
      <button
        onClick={onRunNow}
        disabled={isScanning}
        className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-all duration-200 rounded-none border disabled:opacity-50"
        style={{ background: 'hsl(0 0% 8%)', color: 'hsl(0 0% 98%)', borderColor: 'hsl(0 0% 8%)' }}
      >
        {isScanning ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : <FiPlay className="w-4 h-4" />}
        {isScanning ? 'Scanning...' : 'Run Intelligence Scan Now'}
      </button>
    </div>
  )
}

function EmailStatusSection({ emailResult, digestContent }: { emailResult: EmailResult | null; digestContent: string | null }) {
  if (!emailResult && !digestContent) return null

  return (
    <div className="border p-5 mt-6" style={{ borderColor: 'hsl(0 0% 85%)', background: 'hsl(0 0% 100%)' }}>
      <h3 className="font-serif font-bold text-sm tracking-tight mb-3 uppercase flex items-center gap-2" style={{ color: 'hsl(0 0% 40%)' }}>
        <FiMail className="w-4 h-4" /> Email Delivery Status
      </h3>
      {emailResult && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 border" style={{
              borderColor: emailResult.email_status?.toLowerCase() === 'sent' || emailResult.email_status?.toLowerCase()?.includes('success') ? 'hsl(140 60% 40%)' : 'hsl(0 80% 45%)',
              color: emailResult.email_status?.toLowerCase() === 'sent' || emailResult.email_status?.toLowerCase()?.includes('success') ? 'hsl(140 60% 30%)' : 'hsl(0 80% 40%)',
              background: emailResult.email_status?.toLowerCase() === 'sent' || emailResult.email_status?.toLowerCase()?.includes('success') ? 'hsl(140 60% 95%)' : 'hsl(0 80% 97%)',
            }}>
              {emailResult.email_status?.toLowerCase() === 'sent' || emailResult.email_status?.toLowerCase()?.includes('success') ? <FiCheck className="w-3 h-3 inline mr-1" /> : <FiX className="w-3 h-3 inline mr-1" />}
              {emailResult.email_status ?? 'Unknown'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-2 text-xs" style={{ color: 'hsl(0 0% 40%)' }}>
            <span>Recipient</span>
            <span className="font-mono">{emailResult.recipient ?? 'N/A'}</span>
            <span>Subject</span>
            <span className="font-mono">{emailResult.subject_line ?? 'N/A'}</span>
            <span>Items Included</span>
            <span className="font-mono">{emailResult.items_included ?? 0}</span>
            <span>Sent At</span>
            <span className="font-mono">{emailResult.sent_timestamp ? formatTimestamp(emailResult.sent_timestamp) : 'N/A'}</span>
          </div>
          {emailResult.digest_content && (
            <details className="mt-3">
              <summary className="text-xs cursor-pointer hover:underline" style={{ color: 'hsl(0 0% 40%)' }}>View digest content</summary>
              <div className="mt-2 p-4 border text-sm leading-relaxed" style={{ borderColor: 'hsl(0 0% 90%)', background: 'hsl(0 0% 98%)' }}>
                {renderMarkdown(emailResult.digest_content)}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Default Export
// ---------------------------------------------------------------------------

export default function Page() {
  // Core state
  const [currentDigest, setCurrentDigest] = useState<DigestData | null>(null)
  const [historicalDigests, setHistoricalDigests] = useState<DigestData[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sent' | 'failed'>('idle')
  const [emailResult, setEmailResult] = useState<EmailResult | null>(null)
  const [lastScanTime, setLastScanTime] = useState<string | null>(null)

  // Section collapse state
  const [actOnExpanded, setActOnExpanded] = useState(true)
  const [knowAboutExpanded, setKnowAboutExpanded] = useState(true)
  const [ignoreExpanded, setIgnoreExpanded] = useState(false)
  const [expandedHistorical, setExpandedHistorical] = useState<Set<number>>(new Set())

  // Schedule state
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [scheduleLogs, setScheduleLogs] = useState<Record<string, ExecutionLog[]>>({})
  const [schedulesLoading, setSchedulesLoading] = useState(false)
  const [isTogglingId, setIsTogglingId] = useState<string | null>(null)
  const [expandedScheduleLogs, setExpandedScheduleLogs] = useState<Set<string>>(new Set())

  // UI state
  const [error, setError] = useState<string | null>(null)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [showSampleData, setShowSampleData] = useState(false)
  const [todayDate, setTodayDate] = useState('')
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date()
    return now.toISOString().split('T')[0] // YYYY-MM-DD
  })

  // Initialize date on client side only
  useEffect(() => {
    setTodayDate(formatDateEditorial(new Date()))
  }, [])

  // Auto-dismiss errors after 10 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 10000)
      return () => clearTimeout(timer)
    }
  }, [error])

  // Load schedules on mount
  const loadSchedules = useCallback(async () => {
    setSchedulesLoading(true)
    try {
      const result = await listSchedules()
      if (result.success) {
        const relevant = result.schedules.filter(
          s => s.id === MANAGER_SCHEDULE_ID || s.id === DIGEST_SCHEDULE_ID
        )
        setSchedules(relevant.length > 0 ? relevant : result.schedules.slice(0, 4))
      }
    } catch (e) {
      // Silently handle schedule fetch errors
    }
    setSchedulesLoading(false)
  }, [])

  useEffect(() => {
    loadSchedules()
  }, [loadSchedules])

  // Fetch execution logs for a schedule
  const fetchLogs = useCallback(async (scheduleId: string) => {
    try {
      const result = await getScheduleLogs(scheduleId, { limit: 5 })
      if (result.success) {
        setScheduleLogs(prev => ({ ...prev, [scheduleId]: result.executions }))
      }
    } catch {
      // Silently handle
    }
  }, [])

  // Toggle schedule pause/resume
  const handleToggleSchedule = useCallback(async (schedule: Schedule) => {
    setIsTogglingId(schedule.id)
    try {
      if (schedule.is_active) {
        await pauseSchedule(schedule.id)
      } else {
        await resumeSchedule(schedule.id)
      }
      await loadSchedules()
    } catch (e) {
      setError('Failed to toggle schedule status.')
    }
    setIsTogglingId(null)
  }, [loadSchedules])

  // Run the intelligence scan
  const handleRunNow = useCallback(async () => {
    setIsScanning(true)
    setError(null)
    setActiveAgentId(MANAGER_AGENT_ID)

    // Build date-aware prompt so the model searches for the correct date
    const scanDate = new Date(selectedDate + 'T00:00:00')
    const formattedScanDate = formatDateEditorial(scanDate)
    const isoDate = selectedDate // YYYY-MM-DD

    try {
      const result = await callAIAgent(
        `Run the AI news intelligence scan for the date: ${formattedScanDate} (${isoDate}). Today's date is ${isoDate}. Search for the latest AI news published on or around ${formattedScanDate}. Do NOT use older dates from your training data — focus strictly on news from ${isoDate}. Categorize each item from KPMG's perspective into Act On, Know About, or Ignore tiers, and provide the complete categorized output with executive summary.`,
        MANAGER_AGENT_ID
      )

      if (result.success) {
        const data = parseAgentResult(result)
        if (data) {
          const digest: DigestData = {
            categorized_news: {
              act_on: Array.isArray(data?.categorized_news?.act_on) ? data.categorized_news.act_on : [],
              know_about: Array.isArray(data?.categorized_news?.know_about) ? data.categorized_news.know_about : [],
              ignore: Array.isArray(data?.categorized_news?.ignore) ? data.categorized_news.ignore : [],
            },
            executive_summary: data?.executive_summary ?? '',
            scan_timestamp: data?.scan_timestamp ?? new Date().toISOString(),
            total_items: data?.total_items ?? 0,
            date: formattedScanDate,
          }
          setCurrentDigest(digest)
          setLastScanTime(digest.scan_timestamp)
          setHistoricalDigests(prev => [digest, ...prev])
          setEmailStatus('idle')
          setEmailResult(null)
        } else {
          setError('Received an empty response from the intelligence coordinator.')
        }
      } else {
        setError(result.error ?? result.response?.message ?? 'Failed to run intelligence scan.')
      }
    } catch (e) {
      setError('An unexpected error occurred while running the scan.')
    }

    setActiveAgentId(null)
    setIsScanning(false)
  }, [selectedDate])

  // Send digest email
  const handleSendDigest = useCallback(async () => {
    const digest = showSampleData ? SAMPLE_DIGEST : currentDigest
    if (!digest) {
      setError('No digest data available. Run a scan first.')
      return
    }

    setIsSendingEmail(true)
    setError(null)
    setActiveAgentId(DIGEST_AGENT_ID)

    const actOnItems = Array.isArray(digest?.categorized_news?.act_on) ? digest.categorized_news.act_on : []
    const knowItems = Array.isArray(digest?.categorized_news?.know_about) ? digest.categorized_news.know_about : []
    const ignoreItems = Array.isArray(digest?.categorized_news?.ignore) ? digest.categorized_news.ignore : []

    const message = `Compile and send the daily AI news intelligence digest email. Here is today's categorized news data:

EXECUTIVE SUMMARY:
${digest?.executive_summary ?? 'No summary available.'}

ACT ON (${actOnItems.length} items):
${actOnItems.map((item, i) => `${i + 1}. ${item?.title ?? 'Untitled'}: ${item?.summary ?? ''} [Source: ${item?.source ?? 'Unknown'}] Recommended Action: ${item?.recommended_action ?? 'N/A'}`).join('\n')}

KNOW ABOUT (${knowItems.length} items):
${knowItems.map((item, i) => `${i + 1}. ${item?.title ?? 'Untitled'}: ${item?.summary ?? ''} [Source: ${item?.source ?? 'Unknown'}]`).join('\n')}

IGNORE (${ignoreItems.length} items):
${ignoreItems.map((item, i) => `${i + 1}. ${item?.title ?? 'Untitled'}: ${item?.summary ?? ''}`).join('\n')}

Total items: ${digest?.total_items ?? (actOnItems.length + knowItems.length + ignoreItems.length)}
Please format this as a professional executive digest email and send it.`

    try {
      const result = await callAIAgent(message, DIGEST_AGENT_ID)

      if (result.success) {
        const data = parseAgentResult(result)
        if (data) {
          const er: EmailResult = {
            digest_content: data?.digest_content ?? '',
            email_status: data?.email_status ?? 'unknown',
            recipient: data?.recipient ?? '',
            subject_line: data?.subject_line ?? '',
            items_included: data?.items_included ?? 0,
            sent_timestamp: data?.sent_timestamp ?? new Date().toISOString(),
          }
          setEmailResult(er)
          const statusLower = (er.email_status ?? '').toLowerCase()
          setEmailStatus(statusLower === 'sent' || statusLower.includes('success') ? 'sent' : 'failed')
        } else {
          setEmailStatus('failed')
          setError('Empty response from digest agent.')
        }
      } else {
        setEmailStatus('failed')
        setError(result.error ?? 'Failed to send digest email.')
      }
    } catch (e) {
      setEmailStatus('failed')
      setError('An unexpected error occurred while sending the digest.')
    }

    setActiveAgentId(null)
    setIsSendingEmail(false)
  }, [currentDigest, showSampleData])

  // Toggle historical digest
  const toggleHistorical = useCallback((index: number) => {
    setExpandedHistorical(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [])

  // Determine which digest to display
  const displayDigest = showSampleData ? SAMPLE_DIGEST : currentDigest

  return (
    <ErrorBoundary>
      <div style={THEME_VARS} className="min-h-screen font-sans" >
        <div className="min-h-screen" style={{ background: 'hsl(0 0% 98%)', color: 'hsl(0 0% 8%)' }}>
          {/* Max-width container */}
          <div className="max-w-4xl mx-auto px-6 py-10">

            {/* Error Banner */}
            {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

            {/* ---- HEADER ---- */}
            <header className="mb-12">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="font-serif font-bold text-4xl tracking-tight leading-tight" style={{ color: 'hsl(0 0% 8%)', letterSpacing: '-0.02em' }}>
                    KPMG AI News
                  </h1>
                  <h1 className="font-serif font-bold text-4xl tracking-tight leading-tight" style={{ color: 'hsl(0 0% 8%)', letterSpacing: '-0.02em' }}>
                    Intelligence Digest
                  </h1>
                  {todayDate && (
                    <p className="text-sm font-mono mt-2 uppercase tracking-wider" style={{ color: 'hsl(0 0% 40%)' }}>
                      {todayDate}
                    </p>
                  )}
                </div>

                {/* Sample Data Toggle */}
                <div className="flex items-center gap-2 pt-2">
                  <span className="text-xs" style={{ color: 'hsl(0 0% 50%)' }}>Sample Data</span>
                  <button
                    onClick={() => setShowSampleData(prev => !prev)}
                    className="relative w-10 h-5 border transition-all duration-200"
                    style={{
                      borderColor: 'hsl(0 0% 75%)',
                      background: showSampleData ? 'hsl(0 0% 8%)' : 'hsl(0 0% 92%)',
                    }}
                    aria-label="Toggle sample data"
                  >
                    <div
                      className="absolute top-0.5 w-3.5 h-3.5 transition-all duration-200"
                      style={{
                        left: showSampleData ? '22px' : '2px',
                        background: showSampleData ? 'hsl(0 0% 98%)' : 'hsl(0 0% 60%)',
                      }}
                    />
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="border-b-2 mb-6" style={{ borderColor: 'hsl(0 0% 8%)' }} />

              {/* Action bar */}
              <div className="flex flex-wrap items-center gap-4">
                {/* Date Picker */}
                <div className="flex items-center gap-2">
                  <label htmlFor="scan-date" className="text-xs font-mono uppercase tracking-wider" style={{ color: 'hsl(0 0% 40%)' }}>
                    Scan Date
                  </label>
                  <div className="relative">
                    <FiCalendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'hsl(0 0% 40%)' }} />
                    <input
                      id="scan-date"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="pl-8 pr-3 py-2.5 text-sm font-mono border rounded-none appearance-none"
                      style={{
                        borderColor: 'hsl(0 0% 75%)',
                        background: 'hsl(0 0% 100%)',
                        color: 'hsl(0 0% 8%)',
                      }}
                    />
                  </div>
                </div>

                <button
                  onClick={handleRunNow}
                  disabled={isScanning}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-all duration-200 rounded-none border disabled:opacity-50"
                  style={{ background: 'hsl(0 0% 8%)', color: 'hsl(0 0% 98%)', borderColor: 'hsl(0 0% 8%)' }}
                >
                  {isScanning ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : <FiPlay className="w-4 h-4" />}
                  {isScanning ? 'Scanning...' : 'Run Now'}
                </button>
                <button
                  onClick={handleSendDigest}
                  disabled={isSendingEmail || (!displayDigest && !showSampleData)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-all duration-200 rounded-none border disabled:opacity-50"
                  style={{ background: 'hsl(0 0% 100%)', color: 'hsl(0 0% 8%)', borderColor: 'hsl(0 0% 8%)' }}
                >
                  {isSendingEmail ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : <FiSend className="w-4 h-4" />}
                  {isSendingEmail ? 'Sending...' : 'Send Digest Now'}
                </button>

                {/* Status indicators */}
                <div className="flex items-center gap-4 ml-auto text-xs" style={{ color: 'hsl(0 0% 50%)' }}>
                  {lastScanTime && (
                    <span className="flex items-center gap-1 font-mono">
                      <FiClock className="w-3 h-3" /> Last scan: {formatTimestamp(lastScanTime)}
                    </span>
                  )}
                  {emailStatus !== 'idle' && (
                    <span className="flex items-center gap-1 font-mono px-2 py-0.5 border" style={{
                      borderColor: emailStatus === 'sent' ? 'hsl(140 60% 40%)' : 'hsl(0 80% 45%)',
                      color: emailStatus === 'sent' ? 'hsl(140 60% 30%)' : 'hsl(0 80% 40%)',
                      background: emailStatus === 'sent' ? 'hsl(140 60% 95%)' : 'hsl(0 80% 97%)',
                    }}>
                      {emailStatus === 'sent' ? <FiCheck className="w-3 h-3" /> : <FiX className="w-3 h-3" />}
                      Email {emailStatus === 'sent' ? 'Sent' : 'Failed'}
                    </span>
                  )}
                </div>
              </div>
            </header>

            {/* ---- MAIN CONTENT ---- */}
            {isScanning ? (
              <section className="mb-12">
                <h2 className="font-serif font-bold text-xl tracking-tight mb-6" style={{ color: 'hsl(0 0% 8%)', letterSpacing: '-0.02em' }}>
                  Scanning AI News Sources...
                </h2>
                <SkeletonLoader />
              </section>
            ) : displayDigest ? (
              <section className="mb-12">
                {/* Executive Summary */}
                {displayDigest?.executive_summary && (
                  <div className="mb-8">
                    <h2 className="font-serif font-bold text-xs tracking-widest uppercase mb-3" style={{ color: 'hsl(0 0% 40%)' }}>
                      Executive Summary
                    </h2>
                    <div className="border-l-2 pl-6 py-2" style={{ borderColor: 'hsl(0 0% 8%)' }}>
                      <p className="text-base leading-relaxed font-serif" style={{ color: 'hsl(0 0% 15%)', lineHeight: '1.8' }}>
                        {displayDigest.executive_summary}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 mt-4 text-xs font-mono" style={{ color: 'hsl(0 0% 55%)' }}>
                      <span>{displayDigest?.total_items ?? 0} items analyzed</span>
                      <span>|</span>
                      <span>{displayDigest?.scan_timestamp ? formatTimestamp(displayDigest.scan_timestamp) : ''}</span>
                    </div>
                  </div>
                )}

                {/* Separator */}
                <div className="border-b mb-8" style={{ borderColor: 'hsl(0 0% 85%)' }} />

                {/* Act On */}
                <CategorySection
                  title="Act On"
                  icon={<FiAlertCircle className="w-5 h-5" />}
                  items={displayDigest?.categorized_news?.act_on ?? []}
                  tier="act_on"
                  expanded={actOnExpanded}
                  onToggle={() => setActOnExpanded(p => !p)}
                  accentColor="hsl(0 80% 45%)"
                />

                {/* Know About */}
                <CategorySection
                  title="Know About"
                  icon={<FiInfo className="w-5 h-5" />}
                  items={displayDigest?.categorized_news?.know_about ?? []}
                  tier="know_about"
                  expanded={knowAboutExpanded}
                  onToggle={() => setKnowAboutExpanded(p => !p)}
                  accentColor="hsl(0 0% 25%)"
                />

                {/* Ignore */}
                <CategorySection
                  title="Ignore"
                  icon={<FiMinusCircle className="w-5 h-5" />}
                  items={displayDigest?.categorized_news?.ignore ?? []}
                  tier="ignore"
                  expanded={ignoreExpanded}
                  onToggle={() => setIgnoreExpanded(p => !p)}
                  accentColor="hsl(0 0% 65%)"
                />
              </section>
            ) : (
              <EmptyState onRunNow={handleRunNow} isScanning={isScanning} />
            )}

            {/* Email Status */}
            <EmailStatusSection emailResult={emailResult} digestContent={emailResult?.digest_content ?? null} />

            {/* ---- SCHEDULE MANAGEMENT ---- */}
            <section className="mt-12 mb-12">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif font-bold text-lg tracking-tight" style={{ color: 'hsl(0 0% 8%)', letterSpacing: '-0.02em' }}>
                  Automated Schedules
                </h2>
                <button
                  onClick={loadSchedules}
                  disabled={schedulesLoading}
                  className="text-xs flex items-center gap-1 hover:underline transition-all duration-200"
                  style={{ color: 'hsl(0 0% 40%)' }}
                >
                  <FiRefreshCw className={`w-3 h-3 ${schedulesLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
              <div className="border-b mb-6" style={{ borderColor: 'hsl(0 0% 85%)' }} />

              {schedulesLoading && schedules.length === 0 ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-24 border" style={{ background: 'hsl(0 0% 96%)', borderColor: 'hsl(0 0% 90%)' }} />
                  <div className="h-24 border" style={{ background: 'hsl(0 0% 96%)', borderColor: 'hsl(0 0% 90%)' }} />
                </div>
              ) : schedules.length > 0 ? (
                <div className="space-y-4">
                  {schedules.map(schedule => (
                    <ScheduleCard
                      key={schedule.id}
                      schedule={schedule}
                      logs={scheduleLogs[schedule.id] ?? []}
                      isTogglingId={isTogglingId}
                      onToggle={handleToggleSchedule}
                      onFetchLogs={fetchLogs}
                      logsExpanded={expandedScheduleLogs.has(schedule.id)}
                      onToggleLogs={() => {
                        setExpandedScheduleLogs(prev => {
                          const next = new Set(prev)
                          if (next.has(schedule.id)) {
                            next.delete(schedule.id)
                          } else {
                            next.add(schedule.id)
                          }
                          return next
                        })
                      }}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm italic py-4" style={{ color: 'hsl(0 0% 55%)' }}>
                  No schedules found. Schedules are configured to run daily scans at 7:30 AM and 8:00 AM IST.
                </p>
              )}
            </section>

            {/* ---- HISTORICAL DIGESTS ---- */}
            {historicalDigests.length > 1 && (
              <section className="mt-12 mb-12">
                <h2 className="font-serif font-bold text-lg tracking-tight mb-4" style={{ color: 'hsl(0 0% 8%)', letterSpacing: '-0.02em' }}>
                  Previous Scans
                </h2>
                <div className="border-b mb-6" style={{ borderColor: 'hsl(0 0% 85%)' }} />
                <div className="space-y-3">
                  {historicalDigests.slice(1).map((digest, idx) => {
                    const isExpanded = expandedHistorical.has(idx)
                    const actOnCount = Array.isArray(digest?.categorized_news?.act_on) ? digest.categorized_news.act_on.length : 0
                    const knowCount = Array.isArray(digest?.categorized_news?.know_about) ? digest.categorized_news.know_about.length : 0
                    const ignoreCount = Array.isArray(digest?.categorized_news?.ignore) ? digest.categorized_news.ignore.length : 0

                    return (
                      <div key={idx} className="border" style={{ borderColor: 'hsl(0 0% 85%)', background: 'hsl(0 0% 100%)' }}>
                        <button
                          onClick={() => toggleHistorical(idx)}
                          className="w-full p-4 flex items-center gap-3 text-left transition-all duration-200"
                        >
                          {isExpanded ? <FiChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: 'hsl(0 0% 40%)' }} /> : <FiChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'hsl(0 0% 40%)' }} />}
                          <span className="font-serif font-bold text-sm" style={{ color: 'hsl(0 0% 8%)' }}>{digest?.date ?? 'Unknown date'}</span>
                          <span className="text-xs font-mono ml-auto" style={{ color: 'hsl(0 0% 50%)' }}>
                            {digest?.total_items ?? 0} items
                          </span>
                          <div className="flex gap-2 ml-3">
                            <span className="text-xs font-mono px-1.5 py-0.5 border" style={{ borderColor: 'hsl(0 80% 75%)', color: 'hsl(0 80% 45%)' }}>{actOnCount}</span>
                            <span className="text-xs font-mono px-1.5 py-0.5 border" style={{ borderColor: 'hsl(0 0% 60%)', color: 'hsl(0 0% 40%)' }}>{knowCount}</span>
                            <span className="text-xs font-mono px-1.5 py-0.5 border" style={{ borderColor: 'hsl(0 0% 80%)', color: 'hsl(0 0% 60%)' }}>{ignoreCount}</span>
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-0">
                            <div className="border-t pt-4" style={{ borderColor: 'hsl(0 0% 90%)' }}>
                              {digest?.executive_summary && (
                                <p className="text-sm leading-relaxed mb-4" style={{ color: 'hsl(0 0% 30%)' }}>
                                  {digest.executive_summary}
                                </p>
                              )}
                              {Array.isArray(digest?.categorized_news?.act_on) && digest.categorized_news.act_on.length > 0 && (
                                <div className="mb-3">
                                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'hsl(0 80% 45%)' }}>Act On</p>
                                  {digest.categorized_news.act_on.map((item, i) => (
                                    <p key={i} className="text-sm mb-1 pl-3 border-l-2" style={{ borderColor: 'hsl(0 80% 45%)', color: 'hsl(0 0% 25%)' }}>
                                      <strong>{item?.title ?? 'Untitled'}</strong> - {item?.summary ?? ''}
                                    </p>
                                  ))}
                                </div>
                              )}
                              {Array.isArray(digest?.categorized_news?.know_about) && digest.categorized_news.know_about.length > 0 && (
                                <div className="mb-3">
                                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'hsl(0 0% 30%)' }}>Know About</p>
                                  {digest.categorized_news.know_about.map((item, i) => (
                                    <p key={i} className="text-sm mb-1 pl-3 border-l-2" style={{ borderColor: 'hsl(0 0% 50%)', color: 'hsl(0 0% 35%)' }}>
                                      <strong>{item?.title ?? 'Untitled'}</strong> - {item?.summary ?? ''}
                                    </p>
                                  ))}
                                </div>
                              )}
                              {Array.isArray(digest?.categorized_news?.ignore) && digest.categorized_news.ignore.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'hsl(0 0% 60%)' }}>Ignore</p>
                                  {digest.categorized_news.ignore.map((item, i) => (
                                    <p key={i} className="text-sm mb-1 pl-3 border-l-2" style={{ borderColor: 'hsl(0 0% 80%)', color: 'hsl(0 0% 50%)' }}>
                                      <strong>{item?.title ?? 'Untitled'}</strong> - {item?.summary ?? ''}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* ---- AGENT STATUS ---- */}
            <AgentStatusBar agents={AGENTS_INFO} activeAgentId={activeAgentId} />

            {/* Footer */}
            <footer className="mt-12 pt-6 border-t text-center" style={{ borderColor: 'hsl(0 0% 85%)' }}>
              <p className="text-xs font-mono" style={{ color: 'hsl(0 0% 60%)' }}>
                KPMG AI News Intelligence Digest — Powered by Lyzr Agent Studio
              </p>
            </footer>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}
