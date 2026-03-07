import { getApiBase } from "@/lib/api";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Video, Calendar, Clock, Users, Plus, X, FileText, ArrowRight,
  Trash2, CalendarClock, MoreHorizontal, Search, Filter
} from "lucide-react";

interface Meeting {
  id: number; coach_id: number; user_id: number; title: string; room_id: string;
  status: string; scheduled_at: string; started_at: string; ended_at: string;
  coach_name: string; coach_avatar: string; user_name: string; user_avatar: string;
  file_count: number;
}

export default function Meetings() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => { const h = () => setIsMobile(window.innerWidth < 768); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<number | null>(null);
  const [meetingTitle, setMeetingTitle] = useState("Coaching Session");
  const [scheduledAt, setScheduledAt] = useState("");
  const [createMsg, setCreateMsg] = useState("");
  const [creating, setCreating] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<"all" | "scheduled" | "active" | "ended">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Context menu
  const [contextMenu, setContextMenu] = useState<{ meetingId: string; x: number; y: number } | null>(null);

  // Reschedule modal
  const [rescheduleRoom, setRescheduleRoom] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleMsg, setRescheduleMsg] = useState("");

  // Delete confirm
  const [deleteRoom, setDeleteRoom] = useState<string | null>(null);
  const [deleteMsg, setDeleteMsg] = useState("");

  const api = (path: string, opts?: RequestInit) =>
    fetch(getApiBase() + path, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts?.headers || {}) } });

  const loadMeetings = () => {
    api("/api/meetings").then(r => r.json()).then(d => setMeetings(d.meetings || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMeetings();
    if (user?.role === 'coach') {
      api("/api/coach/users").then(r => r.json()).then(d => setAthletes(d.users || [])).catch(() => {});
    } else {
      api("/api/coaching/coaches").then(r => r.json()).then(async (d) => {
        const coachList = d.coaches || [];
        const subscribed: any[] = [];
        for (const c of coachList) {
          try {
            const r2 = await fetch(getApiBase() + `/api/payments/coach-subscription-status/${c.id}`, { headers: { Authorization: `Bearer ${token}` } });
            const d2 = await r2.json();
            if (d2.subscribed) subscribed.push(c);
          } catch {}
        }
        setCoaches(subscribed);
      }).catch(() => {});
    }
  }, []);

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [contextMenu]);

  const createMeeting = async () => {
    if (!selectedParticipant) { setCreateMsg("Select a participant"); return; }
    setCreating(true);
    try {
      const r = await api("/api/meetings", { method: "POST", body: JSON.stringify({ participantId: selectedParticipant, title: meetingTitle, scheduledAt: scheduledAt || null }) });
      const d = await r.json();
      if (r.ok && d.meeting) {
        setCreateMsg("✅ Meeting created!");
        setTimeout(() => {
          setShowCreate(false); setCreateMsg("");
          const base = user?.role === 'coach' ? '/coach' : '/app';
          navigate(`${base}/meeting/${d.meeting.roomId}`);
        }, 800);
      } else { setCreateMsg(d.message || "Failed to create meeting"); }
    } catch { setCreateMsg("❌ Failed to create meeting"); }
    finally { setCreating(false); }
  };

  const rescheduleMeeting = async () => {
    if (!rescheduleRoom || !rescheduleDate) { setRescheduleMsg("Pick a date & time"); return; }
    try {
      const r = await api(`/api/meetings/${rescheduleRoom}/reschedule`, { method: "PATCH", body: JSON.stringify({ scheduledAt: rescheduleDate }) });
      const d = await r.json();
      if (r.ok) {
        setMeetings(prev => prev.map(m => m.room_id === rescheduleRoom ? { ...m, scheduled_at: rescheduleDate } : m));
        setRescheduleMsg("✅ Rescheduled!");
        setTimeout(() => { setRescheduleRoom(null); setRescheduleMsg(""); setRescheduleDate(""); }, 800);
      } else setRescheduleMsg(d.message || "Failed");
    } catch { setRescheduleMsg("❌ Failed to reschedule"); }
  };

  const deleteMeeting = async () => {
    if (!deleteRoom) return;
    try {
      const r = await api(`/api/meetings/${deleteRoom}`, { method: "DELETE" });
      const d = await r.json();
      if (r.ok) {
        setMeetings(prev => prev.filter(m => m.room_id !== deleteRoom));
        setDeleteRoom(null); setDeleteMsg("");
      } else setDeleteMsg(d.message || "Failed to delete");
    } catch { setDeleteMsg("❌ Failed to delete meeting"); }
  };

  const participants = user?.role === 'coach' ? athletes : coaches;

  const filteredMeetings = meetings.filter(m => {
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const partner = user?.id === m.coach_id ? m.user_name : m.coach_name;
      if (!m.title.toLowerCase().includes(q) && !partner?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const statusTabs: { key: typeof statusFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: meetings.length },
    { key: "scheduled", label: "Scheduled", count: meetings.filter(m => m.status === 'scheduled').length },
    { key: "active", label: "Live", count: meetings.filter(m => m.status === 'active').length },
    { key: "ended", label: "Ended", count: meetings.filter(m => m.status === 'ended').length },
  ];

  const statusColors: Record<string, { bg: string; color: string; label: string }> = {
    scheduled: { bg: "rgba(59,130,246,0.1)", color: "var(--blue)", label: "⏰ Scheduled" },
    active: { bg: "rgba(200,255,0,0.1)", color: "var(--accent)", label: "🟢 Live" },
    ended: { bg: "var(--bg-surface)", color: "var(--text-muted)", label: "⚫ Ended" },
  };

  const formatMeetingDuration = (m: Meeting) => {
    if (!m.started_at || !m.ended_at) return null;
    const diff = Math.floor((new Date(m.ended_at).getTime() - new Date(m.started_at).getTime()) / 1000);
    const h = Math.floor(diff / 3600), min = Math.floor((diff % 3600) / 60);
    return h > 0 ? `${h}h ${min}m` : `${min}m`;
  };

  return (
    <div style={{ padding: isMobile ? "16px 12px 40px" : "24px 20px 40px", maxWidth: 800, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: "clamp(20px, 4vw, 28px)", fontWeight: 700 }}>Coaching Meetings</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Video calls, file sharing & session notes</p>
        </div>
        <button onClick={() => { setShowCreate(true); setCreateMsg(""); setMeetingTitle("Coaching Session"); setScheduledAt(""); setSelectedParticipant(null); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 20px", borderRadius: 11, backgroundColor: "var(--accent)", color: "#0A0A0B", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer" }}>
          <Plus size={16} /> New Meeting
        </button>
      </div>

      {/* Filters bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        {/* Status tabs */}
        <div style={{ display: "flex", gap: 4, backgroundColor: "var(--bg-surface)", borderRadius: 10, padding: 3, border: "1px solid var(--border)" }}>
          {statusTabs.map(t => (
            <button key={t.key} onClick={() => setStatusFilter(t.key)} style={{ padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, backgroundColor: statusFilter === t.key ? "var(--accent)" : "transparent", color: statusFilter === t.key ? "#0A0A0B" : "var(--text-muted)", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 4 }}>
              {t.label}
              {t.count > 0 && <span style={{ fontSize: 9, opacity: 0.7 }}>({t.count})</span>}
            </button>
          ))}
        </div>
        {/* Search */}
        <div style={{ flex: 1, minWidth: 160, position: "relative" }}>
          <Search size={14} style={{ position: "absolute", insetInlineStart: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search meetings..." className="input-base" style={{ paddingInlineStart: 30, fontSize: 12, height: 36 }} />
        </div>
      </div>

      {/* Meeting list */}
      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>Loading meetings...</div>
      ) : meetings.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16 }}>
          <Video size={44} strokeWidth={1} color="var(--text-muted)" style={{ margin: "0 auto 14px" }} />
          <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 17, fontWeight: 700, marginBottom: 6 }}>No meetings yet</p>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>Schedule a meeting with your {user?.role === 'coach' ? 'athletes' : 'coach'} to get started</p>
          <button onClick={() => setShowCreate(true)} style={{ padding: "11px 24px", borderRadius: 10, background: "var(--accent)", border: "none", color: "#0A0A0B", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Create First Meeting</button>
        </div>
      ) : filteredMeetings.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No meetings match your filters</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filteredMeetings.map(m => {
            const partner = user?.id === m.coach_id ? { name: m.user_name, avatar: m.user_avatar } : { name: m.coach_name, avatar: m.coach_avatar };
            const st = statusColors[m.status] || statusColors.scheduled;
            const duration = formatMeetingDuration(m);
            const base = user?.role === 'coach' ? '/coach' : '/app';
            return (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", backgroundColor: "var(--bg-card)", border: `1px solid ${m.status === 'active' ? "rgba(200,255,0,0.3)" : "var(--border)"}`, borderRadius: 14, transition: "border-color 0.15s", position: "relative" }}>
                <div onClick={() => navigate(`${base}/meeting/${m.room_id}`)} style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, cursor: "pointer", minWidth: 0 }}>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <img src={partner.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${partner.name}`} alt="" style={{ width: 48, height: 48, borderRadius: "50%", backgroundColor: "var(--bg-surface)" }} />
                    {m.status === 'active' && <div style={{ position: "absolute", bottom: 0, insetInlineEnd: 0, width: 14, height: 14, borderRadius: "50%", backgroundColor: "var(--accent)", border: "2px solid var(--bg-card)" }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <h4 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.title}</h4>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: st.bg, color: st.color, fontWeight: 600, flexShrink: 0 }}>{st.label}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: "var(--text-muted)", flexWrap: "wrap" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Users size={11} /> {partner.name || "Participant"}</span>
                      {m.scheduled_at && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar size={11} /> {new Date(m.scheduled_at).toLocaleDateString()}</span>}
                      {m.scheduled_at && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={11} /> {new Date(m.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                      {duration && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={11} /> {duration}</span>}
                      {m.file_count > 0 && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><FileText size={11} /> {m.file_count} file{m.file_count !== 1 ? "s" : ""}</span>}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  {m.status === 'active' && (
                    <button onClick={() => navigate(`${base}/meeting/${m.room_id}`)} style={{ padding: "7px 14px", borderRadius: 8, backgroundColor: "var(--accent)", border: "none", color: "#0A0A0B", fontSize: 11, fontWeight: 700, fontFamily: "'Chakra Petch', sans-serif", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                      <Video size={12} /> Join
                    </button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); setContextMenu(contextMenu?.meetingId === m.room_id ? null : { meetingId: m.room_id, x: e.clientX, y: e.clientY }); }} style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border)", backgroundColor: "var(--bg-surface)", cursor: "pointer", color: "var(--text-muted)" }}>
                    <MoreHorizontal size={14} />
                  </button>
                </div>

                {/* Context menu */}
                {contextMenu?.meetingId === m.room_id && (
                  <div style={{ position: "absolute", top: 52, insetInlineEnd: 16, zIndex: 50, backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 4, boxShadow: "0 8px 30px rgba(0,0,0,0.3)", minWidth: 160 }}>
                    <button onClick={() => { navigate(`${base}/meeting/${m.room_id}`); setContextMenu(null); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 6, border: "none", background: "none", color: "var(--text-primary)", cursor: "pointer", width: "100%", fontSize: 12, textAlign: "start" }}>
                      <Video size={13} /> Open Meeting
                    </button>
                    {m.status === 'scheduled' && (
                      <button onClick={() => { setRescheduleRoom(m.room_id); setRescheduleDate(m.scheduled_at ? new Date(m.scheduled_at).toISOString().slice(0, 16) : ""); setRescheduleMsg(""); setContextMenu(null); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 6, border: "none", background: "none", color: "var(--text-primary)", cursor: "pointer", width: "100%", fontSize: 12, textAlign: "start" }}>
                        <CalendarClock size={13} /> Reschedule
                      </button>
                    )}
                    {m.status !== 'active' && (
                      <button onClick={() => { setDeleteRoom(m.room_id); setDeleteMsg(""); setContextMenu(null); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 6, border: "none", background: "none", color: "var(--red)", cursor: "pointer", width: "100%", fontSize: 12, textAlign: "start" }}>
                        <Trash2 size={13} /> Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create Meeting Modal ──────────────────────────────────────── */}
      {showCreate && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backgroundColor: "rgba(0,0,0,0.7)" }}>
          <div style={{ width: "100%", maxWidth: 460, backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 20, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 16, fontWeight: 700 }}>New Meeting</h3>
              <button onClick={() => setShowCreate(false)} style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}><X size={15} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>Meeting Title</label>
                <input value={meetingTitle} onChange={e => setMeetingTitle(e.target.value)} className="input-base" placeholder="e.g. Weekly Check-in" />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
                  {user?.role === 'coach' ? 'Select Athlete' : 'Select Coach'}
                </label>
                {participants.length === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--text-muted)", padding: "12px 14px", background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)" }}>
                    {user?.role === 'coach' ? 'No subscribed athletes found' : 'No active coaching subscriptions'}
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto" }}>
                    {participants.map((p: any) => (
                      <button key={p.id} onClick={() => setSelectedParticipant(p.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, border: `2px solid ${selectedParticipant === p.id ? "var(--accent)" : "var(--border)"}`, background: selectedParticipant === p.id ? "var(--accent-dim)" : "var(--bg-card)", cursor: "pointer", textAlign: "start" }}>
                        <img src={p.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.email}`} alt="" style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: "var(--bg-surface)" }} />
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: selectedParticipant === p.id ? "var(--accent)" : "var(--text-primary)" }}>{p.name}</p>
                          <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{p.email}</p>
                        </div>
                        {selectedParticipant === p.id && <span style={{ marginInlineStart: "auto", color: "var(--accent)" }}>✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>Schedule (Optional)</label>
                <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="input-base" />
              </div>
              {createMsg && <div style={{ padding: "10px 14px", backgroundColor: createMsg.startsWith("✅") ? "var(--accent-dim)" : "rgba(255,68,68,0.08)", border: `1px solid ${createMsg.startsWith("✅") ? "var(--accent)" : "var(--red)"}`, borderRadius: 9, fontSize: 13, color: createMsg.startsWith("✅") ? "var(--accent)" : "var(--red)" }}>{createMsg}</div>}
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button onClick={() => setShowCreate(false)} style={{ flex: 1, padding: "11px", borderRadius: 10, backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 14 }}>Cancel</button>
                <button onClick={createMeeting} disabled={creating || !selectedParticipant} style={{ flex: 2, padding: "11px", borderRadius: 10, backgroundColor: "var(--accent)", color: "#0A0A0B", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 14, border: "none", cursor: creating || !selectedParticipant ? "not-allowed" : "pointer", opacity: creating || !selectedParticipant ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <Video size={15} /> {creating ? "Creating…" : "Create Meeting"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Reschedule Modal ──────────────────────────────────────────── */}
      {rescheduleRoom && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backgroundColor: "rgba(0,0,0,0.7)" }}>
          <div style={{ width: "100%", maxWidth: 400, backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 18, padding: 24, textAlign: "center" }}>
            <CalendarClock size={32} color="var(--blue)" style={{ margin: "0 auto 12px" }} />
            <h3 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Reschedule Meeting</h3>
            <input type="datetime-local" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} className="input-base" style={{ marginBottom: 12 }} />
            {rescheduleMsg && <div style={{ padding: "8px 12px", marginBottom: 12, borderRadius: 8, fontSize: 12, backgroundColor: rescheduleMsg.startsWith("✅") ? "var(--accent-dim)" : "rgba(255,68,68,0.08)", color: rescheduleMsg.startsWith("✅") ? "var(--accent)" : "var(--red)", border: `1px solid ${rescheduleMsg.startsWith("✅") ? "var(--accent)" : "var(--red)"}` }}>{rescheduleMsg}</div>}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setRescheduleRoom(null); setRescheduleMsg(""); }} style={{ flex: 1, padding: 11, borderRadius: 10, backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 14 }}>Cancel</button>
              <button onClick={rescheduleMeeting} disabled={!rescheduleDate} style={{ flex: 1, padding: 11, borderRadius: 10, backgroundColor: "var(--blue)", border: "none", color: "#fff", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 14, cursor: !rescheduleDate ? "not-allowed" : "pointer", opacity: !rescheduleDate ? 0.6 : 1 }}>Reschedule</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ──────────────────────────────────────── */}
      {deleteRoom && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backgroundColor: "rgba(0,0,0,0.7)" }}>
          <div style={{ width: "100%", maxWidth: 380, backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 18, padding: 24, textAlign: "center" }}>
            <Trash2 size={32} color="#EF4444" style={{ margin: "0 auto 12px" }} />
            <h3 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Delete Meeting?</h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>This will permanently remove the meeting, all shared files and chat messages.</p>
            {deleteMsg && <div style={{ padding: "8px 12px", marginBottom: 12, borderRadius: 8, fontSize: 12, backgroundColor: "rgba(255,68,68,0.08)", color: "var(--red)", border: "1px solid var(--red)" }}>{deleteMsg}</div>}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setDeleteRoom(null); setDeleteMsg(""); }} style={{ flex: 1, padding: 11, borderRadius: 10, backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 14 }}>Cancel</button>
              <button onClick={deleteMeeting} style={{ flex: 1, padding: 11, borderRadius: 10, backgroundColor: "#EF4444", border: "none", color: "#fff", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}