import React from 'react'
import './Sidebar.css'
import type { ResearchResponse } from '../utils/api'

export type ChatSession = {
  id: string
  topic: string
  createdAt: number
  result?: ResearchResponse
}

type SidebarProps = {
  sessions: ChatSession[]
  activeId: string | null
  onSelectSession: (session: ChatSession) => void
  onNewChat: () => void
  onDeleteSession: (id: string, e: React.MouseEvent) => void
  onClearAll: () => void
  isOpen: boolean
  onToggle: () => void
}

function formatTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHours = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSec < 60) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  activeId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onClearAll,
  isOpen,
  onToggle,
}) => {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="sidebar-backdrop" onClick={onToggle} aria-hidden="true" />}

      <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
        {/* Top: New Chat button */}
        <div className="sidebar-header">
          <div className="sidebar-title-row">
            <div className="sidebar-brand">
              <span className="sidebar-logo-dot" />
              <span>Research History</span>
            </div>
            <button
              type="button"
              className="sidebar-close-btn"
              onClick={onToggle}
              title="Close sidebar"
              aria-label="Close sidebar"
            >
              ✕
            </button>
          </div>

          <button
            type="button"
            className="new-chat-btn"
            onClick={onNewChat}
            title="Start new research"
          >
            <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
              <path d="M10 3a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H4a1 1 0 1 1 0-2h5V4a1 1 0 0 1 1-1z" />
            </svg>
            <span>+ New Chat</span>
          </button>
        </div>

        {/* Middle: Chat list */}
        <div className="sidebar-content">
          <div className="sidebar-section-label">
            <span>Recent Chats</span>
            <span className="count-pill">{sessions.length}</span>
          </div>

          {sessions.length === 0 ? (
            <div className="empty-history">
              <p>No research chats yet.</p>
              <small>Your research questions and final reports will appear here.</small>
            </div>
          ) : (
            <ul className="chat-list">
              {sessions.map((session) => (
                <li
                  key={session.id}
                  className={`chat-item ${session.id === activeId ? 'active' : ''}`}
                  onClick={() => onSelectSession(session)}
                >
                  <div className="chat-icon">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <div className="chat-info">
                    <div className="chat-title" title={session.topic}>
                      {session.topic}
                    </div>
                    <div className="chat-time">{formatTime(session.createdAt)}</div>
                  </div>
                  <button
                    type="button"
                    className="delete-chat-btn"
                    onClick={(e) => onDeleteSession(session.id, e)}
                    title="Delete chat"
                    aria-label="Delete chat"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Bottom: All Chats info & Clear All */}
        <div className="sidebar-footer">
          <div className="all-chats-row">
            <span className="all-chats-text">All Chats ({sessions.length})</span>
            {sessions.length > 0 && (
              <button
                type="button"
                className="clear-all-btn"
                onClick={onClearAll}
                title="Clear all research history"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="system-status">
            <span className="status-indicator" />
            <span>AI Multi-Agent Active</span>
          </div>
        </div>
      </aside>
    </>
  )
}
