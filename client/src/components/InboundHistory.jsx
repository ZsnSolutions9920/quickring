import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import { useSocket } from '../contexts/SocketContext';
import { parsePhone } from '../utils/phoneFormat';

const PAGE_SIZE = 10;

export default function InboundHistory() {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const { socket } = useSocket();

  const fetchHistory = useCallback((p = page) => {
    api.getInboundHistory(p, PAGE_SIZE)
      .then((data) => {
        setCalls(data.calls);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      })
      .catch((err) => console.error('Failed to fetch inbound history:', err))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => {
    setLoading(true);
    fetchHistory(page);
  }, [page, fetchHistory]);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchHistory(page);
    socket.on('call:logged', refresh);
    socket.on('call:updated', refresh);
    return () => {
      socket.off('call:logged', refresh);
      socket.off('call:updated', refresh);
    };
  }, [socket, fetchHistory, page]);

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString();
  };

  const statusBadge = (status) => {
    const colors = {
      completed: 'badge-success',
      initiated: 'badge-info',
      ringing: 'badge-info',
      'no-answer': 'badge-warn',
      busy: 'badge-warn',
      failed: 'badge-error',
      canceled: 'badge-error',
      voicemail: 'badge-warn',
    };
    return colors[status] || 'badge-info';
  };

  if (loading && calls.length === 0) {
    return (
      <div className="history-container">
        <div className="history-loading">Loading inbound call history...</div>
      </div>
    );
  }

  return (
    <div className="history-container">
      <div className="history-header">
        <h2>Inbound Calls</h2>
        <span className="history-count">{total} calls</span>
      </div>

      {calls.length === 0 ? (
        <div className="history-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="17 7 7 17" />
            <polyline points="17 17 7 17 7 7" />
          </svg>
          <p>No inbound calls yet.</p>
        </div>
      ) : (
        <>
          <div className="history-list">
            {calls.map((call) => {
              const phone = parsePhone(call.phone_number);
              return (
                <div key={call.id} className="history-item">
                  <div className="history-item-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="17 7 7 17" />
                      <polyline points="17 17 7 17 7 7" />
                    </svg>
                  </div>
                  <div className="history-item-info">
                    <span className="history-number">{phone.flag} {phone.formatted}</span>
                    <span className="history-time">{formatTime(call.started_at)}</span>
                  </div>
                  <div className="history-item-meta">
                    <span className={`badge ${statusBadge(call.status)}`}>
                      {call.status}
                      <span
                        className="dev-delete-call"
                        onDoubleClick={() => {
                          api.deleteCall(call.call_sid).catch((err) => console.error('Failed to delete call:', err));
                        }}
                      />
                    </span>
                    <span className="history-duration">{formatDuration(call.duration)}</span>
                    {call.status === 'completed' && call.duration > 0 && (
                      <a
                        href={api.getRecordingUrl(call.call_sid)}
                        download={`${call.call_sid}.mp3`}
                        title="Download recording"
                        className="recording-download-btn"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="pagination-btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Prev
              </button>
              <span className="pagination-info">
                Page {page} of {totalPages}
              </span>
              <button
                className="pagination-btn"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
