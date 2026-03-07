import { getApiBase } from "@/lib/api";
import { getSocketBase } from "@/lib/api";
import { useState, useEffect, useRef, useMemo } from "react";
import React from "react";
import { io, Socket } from "socket.io-client";
import {
  Search, Send, Paperclip, X, Users, Image as ImageIcon,
  ArrowLeft, Phone, Video, SmilePlus, CheckCheck, Hash
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";

/* ---------- types ---------- */
interface UserContact {
  id: number; name: string; avatar: string; role: string; is_premium: number;
  online?: boolean;
}
interface ChatChallenge {
  id: number; title: string; description: string; participant_count: number;
}
interface Message {
  id: number; sender_id: number; receiver_id: number | null; challenge_id: number | null;
  content: string; media_url: string | null; created_at: string;
  sender_name: string; sender_avatar: string;
}

/* ---------- helpers ---------- */
const fmt = (iso: string) => {
  const d = new Date(iso);
  const h = d.getHours(); const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${ampm}`;
};

const dateSeparator = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined });
};

const STATUS_COLORS: Record<string, string> = {
  coach: "#C8FF00", admin: "#FF6B6B", user: "#6CB4EE",
};

const avatarFallback = (name: string) => {
  const parts = name.split(" ");
  return parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2);
};

/* Keyframes injected once */
const STYLE_ID = "chat-keyframes";
if (typeof document !== "undefined" && !document.getElementById(STYLE_ID)) {
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes chatSlideUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  `;
  document.head.appendChild(style);
}

/* ========================================================= */
export default function Chat() {
  const { user, token } = useAuth();
  const { t } = useI18n();
  const canUseChallengeChat = user?.role === "admin";

  /* state */
  const [contacts, setContacts] = useState<UserContact[]>([]);
  const [challenges, setChallenges] = useState<ChatChallenge[]>([]);
  const [selectedContact, setSelectedContact] = useState<UserContact | null>(null);
  const [selectedChallenge, setSelectedChallenge] = useState<ChatChallenge | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"contacts" | "challenges">("contacts");
  const [searchQuery, setSearchQuery] = useState("");
  const [sending, setSending] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState("");
  const [onlineUserIds, setOnlineUserIds] = useState<number[]>([]);
  const onlineSetRef = useRef<Set<number>>(new Set());
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* responsive */
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", h); return () => window.removeEventListener("resize", h);
  }, []);

  /* fetch contacts + challenges */
  useEffect(() => {
    fetchContacts();
    if (canUseChallengeChat) fetchChallenges();
    else setChallenges([]);
  }, [token, canUseChallengeChat]);

  useEffect(() => {
    if (!token) return;

    const socket = io(getSocketBase(), {
      transports: ["websocket", "polling"],
      auth: { token },
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on("presence:update", (payload: any) => {
      const ids = Array.isArray(payload?.onlineUserIds) ? payload.onlineUserIds.map((x: any) => Number(x)) : [];
      setOnlineUserIds(ids);
      onlineSetRef.current = new Set(ids);
    });

    socket.on("connect", () => {
      socket.emit("presence:ping");
    });

    const syncPresence = async () => {
      try {
        await fetch(getApiBase() + "/api/chat/presence/ping", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        const r = await fetch(getApiBase() + "/api/chat/presence", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await r.json();
        const ids = Array.isArray(d?.onlineUserIds) ? d.onlineUserIds.map((x: any) => Number(x)) : [];
        setOnlineUserIds(ids);
        onlineSetRef.current = new Set(ids);
      } catch {}
    };

    syncPresence();
    const id = setInterval(syncPresence, 10000);
    return () => {
      clearInterval(id);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  useEffect(() => {
    setContacts((prev) => prev.map((c) => ({ ...c, online: onlineSetRef.current.has(Number(c.id)) })));
  }, [onlineUserIds]);

  useEffect(() => {
    if (!canUseChallengeChat && activeTab === "challenges") {
      setActiveTab("contacts");
      setSelectedChallenge(null);
    }
  }, [activeTab, canUseChallengeChat]);

  /* poll messages */
  useEffect(() => {
    if (selectedContact) {
      setSelectedChallenge(null);
      fetchMessages(selectedContact.id);
      const i = setInterval(() => fetchMessages(selectedContact.id), 3000);
      return () => clearInterval(i);
    } else if (selectedChallenge && canUseChallengeChat) {
      setSelectedContact(null);
      fetchChallengeMessages(selectedChallenge.id);
      const i = setInterval(() => fetchChallengeMessages(selectedChallenge.id), 3000);
      return () => clearInterval(i);
    }
  }, [selectedContact, selectedChallenge, token, canUseChallengeChat]);

  /* auto-scroll */
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  /* file preview */
  useEffect(() => {
    if (!selectedFile) { setFilePreview(null); return; }
    if (selectedFile.type.startsWith("image/")) {
      const url = URL.createObjectURL(selectedFile);
      setFilePreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setFilePreview(null);
  }, [selectedFile]);

  /* ---- API calls (fixed unwrapping) ---- */
  const fetchContacts = async () => {
    try {
      const r = await fetch(getApiBase() + "/api/chat/users", { headers: { Authorization: `Bearer ${token}` } });
      const data = await r.json();
      const list: UserContact[] = Array.isArray(data) ? data : Array.isArray(data?.users) ? data.users : [];
      const safeList = list.filter((c) => c.role !== "admin");
      setContacts(safeList.map((c) => ({ ...c, online: onlineSetRef.current.has(Number(c.id)) || Boolean((c as any).online) })));
    } catch { setContacts([]); }
  };

  const fetchChallenges = async () => {
    try {
      const r = await fetch(getApiBase() + "/api/community/challenges", { headers: { Authorization: `Bearer ${token}` } });
      const data = await r.json();
      setChallenges(Array.isArray(data) ? data : Array.isArray(data?.challenges) ? data.challenges : []);
    } catch { setChallenges([]); }
  };

  const fetchMessages = async (id: number) => {
    try {
      const r = await fetch(getApiBase() + `/api/chat/messages/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await r.json();
      setMessages(Array.isArray(data) ? data : Array.isArray(data?.messages) ? data.messages : []);
    } catch { setMessages([]); }
  };

  const fetchChallengeMessages = async (id: number) => {
    try {
      const r = await fetch(getApiBase() + `/api/chat/challenge/${id}/messages`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await r.json();
      setMessages(Array.isArray(data) ? data : Array.isArray(data?.messages) ? data.messages : []);
    } catch { setMessages([]); }
  };

  const sendMsg = async () => {
    if ((!newMessage.trim() && !selectedFile) || sending) return;
    setSending(true);
    try {
      let response: Response;
      if (selectedFile) {
        const fd = new FormData();
        fd.append("file", selectedFile);
        if (newMessage.trim()) fd.append("content", newMessage);
        if (selectedContact) fd.append("receiverId", selectedContact.id.toString());
        if (selectedChallenge && canUseChallengeChat) fd.append("challengeId", selectedChallenge.id.toString());
        response = await fetch(getApiBase() + "/api/chat/send-media", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
        setSelectedFile(null);
      } else {
        const body: any = { content: newMessage };
        if (selectedContact) body.receiverId = selectedContact.id;
        if (selectedChallenge && canUseChallengeChat) body.challengeId = selectedChallenge.id;
        response = await fetch(getApiBase() + "/api/chat/send", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
      }
      if (response.status === 403) {
        const d = await response.json().catch(() => ({}));
        setSubscriptionError(d.message || "You must subscribe to this coach before chatting.");
        return;
      }
      setSubscriptionError("");
      setNewMessage("");
      if (selectedContact) fetchMessages(selectedContact.id);
      else if (selectedChallenge && canUseChallengeChat) fetchChallengeMessages(selectedChallenge.id);
    } catch {} finally { setSending(false); }
  };

  /* ---- derived ---- */
  const filteredContacts = contacts.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredChallenges = challenges.filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()));

  /* Group messages: attach flags for grouping & date separators */
  const groupedMessages = useMemo(() => {
    return messages.map((m, i) => {
      const prev = i > 0 ? messages[i - 1] : null;
      const sameSender = prev ? prev.sender_id === m.sender_id : false;
      const sameDay = prev ? new Date(prev.created_at).toDateString() === new Date(m.created_at).toDateString() : false;
      const closeTime = prev ? (new Date(m.created_at).getTime() - new Date(prev.created_at).getTime()) < 120000 : false;
      const grouped = sameSender && sameDay && closeTime;
      const showDate = !sameDay || i === 0;
      return { ...m, grouped, showDate };
    });
  }, [messages]);

  const showSidebar = !isMobile || !(selectedContact || selectedChallenge);
  const showChatArea = !isMobile || !!(selectedContact || selectedChallenge);

  /* ---- CSS vars ---- */
  const cv = {
    bg: "var(--bg-card)", border: "var(--border)", surface: "var(--bg-surface)",
    accent: "var(--accent)", textPrimary: "var(--text-primary)", textSecondary: "var(--text-secondary)",
    textMuted: "var(--text-muted)", accentDim: "var(--accent-dim)",
  };

  /* ============================================================ */
  return (
    <div style={{
      height: "calc(100dvh - 120px)", display: "flex", gap: 0, overflow: "hidden",
      maxWidth: 960, margin: "0 auto", fontFamily: "'Outfit', sans-serif",
    }}>

      {/* ====== SIDEBAR ====== */}
      {showSidebar && (
        <div style={{
          width: isMobile ? "100%" : 320, flexShrink: 0, backgroundColor: cv.bg,
          borderRadius: isMobile ? 0 : 18, border: `1px solid ${cv.border}`,
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{ padding: "18px 18px 4px" }}>
            <h2 style={{
              fontSize: 22, fontWeight: 700, fontFamily: "'Chakra Petch', sans-serif",
              color: cv.textPrimary, margin: 0, letterSpacing: "-0.3px",
            }}>Messages</h2>
          </div>

          {/* Tabs */}
          <div style={{ padding: "10px 14px 6px" }}>
            <div style={{
              display: "flex", gap: 4, backgroundColor: cv.surface, padding: 3, borderRadius: 12,
            }}>
              {(["contacts", ...(canUseChallengeChat ? ["challenges"] : [])] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  flex: 1, padding: "8px 0", borderRadius: 10, fontSize: 12.5, fontWeight: 600,
                  border: "none", cursor: "pointer", transition: "all 0.2s",
                  backgroundColor: activeTab === tab ? cv.accent : "transparent",
                  color: activeTab === tab ? "#0A0A0B" : cv.textSecondary,
                  fontFamily: "'Chakra Petch', sans-serif",
                }}>
                  {tab === "contacts" ? "Direct" : "Groups"}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div style={{ padding: "6px 14px 12px" }}>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{
                position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: cv.textMuted,
              }} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations…"
                style={{
                  width: "100%", backgroundColor: cv.surface, border: `1px solid ${cv.border}`,
                  borderRadius: 12, padding: "9px 12px 9px 34px", fontSize: 13,
                  color: cv.textPrimary, fontFamily: "'Outfit', sans-serif", outline: "none",
                }}
              />
            </div>
          </div>

          {/* Contact / Challenge List */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 8px" }}>
            {activeTab === "contacts" && (
              filteredContacts.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: cv.textMuted }}>
                  <Users size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                  <p style={{ fontSize: 13 }}>No contacts found</p>
                </div>
              ) : filteredContacts.map((ct) => {
                const sel = selectedContact?.id === ct.id;
                return (
                  <button key={ct.id} onClick={() => { setSelectedContact(ct); inputRef.current?.focus(); }} style={{
                    display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 10px",
                    borderRadius: 14, border: "none", cursor: "pointer", marginBottom: 2, textAlign: "left",
                    transition: "all 0.15s",
                    backgroundColor: sel ? cv.accentDim : "transparent",
                  }}>
                    {/* Avatar + online dot */}
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      {ct.avatar ? (
                        <img src={ct.avatar} alt="" style={{
                          width: 44, height: 44, borderRadius: "50%",
                          border: sel ? `2px solid ${cv.accent}` : `1px solid ${cv.border}`,
                          objectFit: "cover",
                        }} />
                      ) : (
                        <div style={{
                          width: 44, height: 44, borderRadius: "50%",
                          backgroundColor: cv.accentDim, display: "flex", alignItems: "center", justifyContent: "center",
                          fontWeight: 700, fontSize: 14, color: cv.accent, textTransform: "uppercase",
                        }}>{avatarFallback(ct.name)}</div>
                      )}
                      {ct.online && (
                        <div style={{
                          position: "absolute", bottom: 1, right: 1, width: 10, height: 10,
                          borderRadius: "50%", backgroundColor: "#34D399", border: "2px solid var(--bg-card)",
                        }} />
                      )}
                    </div>
                    {/* Name + role */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{
                          fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          color: sel ? cv.accent : cv.textPrimary,
                        }}>{ct.name}</span>
                        {ct.is_premium === 1 && (
                          <span style={{
                            fontSize: 9, padding: "1px 5px", borderRadius: 4,
                            backgroundColor: "rgba(200,255,0,0.15)", color: cv.accent, fontWeight: 700,
                          }}>PRO</span>
                        )}
                      </div>
                      <p style={{
                        fontSize: 11.5, color: cv.textMuted, marginTop: 2,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        <span style={{
                          display: "inline-block", width: 6, height: 6, borderRadius: "50%",
                          backgroundColor: STATUS_COLORS[ct.role] || "#999", marginRight: 5, verticalAlign: "middle",
                        }} />
                        {ct.role}
                      </p>
                    </div>
                    {/* Unread indicator */}
                    {ct.online && !sel && (
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%", backgroundColor: cv.accent, flexShrink: 0,
                      }} />
                    )}
                  </button>
                );
              })
            )}

            {canUseChallengeChat && activeTab === "challenges" && (
              filteredChallenges.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: cv.textMuted }}>
                  <Hash size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                  <p style={{ fontSize: 13 }}>No group chats</p>
                </div>
              ) : filteredChallenges.map((ch) => {
                const sel = selectedChallenge?.id === ch.id;
                return (
                  <button key={ch.id} onClick={() => setSelectedChallenge(ch)} style={{
                    display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 10px",
                    borderRadius: 14, border: "none", cursor: "pointer", marginBottom: 2, textAlign: "left",
                    transition: "all 0.15s",
                    backgroundColor: sel ? cv.accentDim : "transparent",
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 14, backgroundColor: cv.accentDim,
                      border: sel ? `2px solid ${cv.accent}` : `1px solid rgba(200,255,0,0.15)`,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <Users size={18} color={cv.accent} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{
                        fontSize: 14, fontWeight: 600, display: "block",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        color: sel ? cv.accent : cv.textPrimary,
                      }}>{ch.title}</span>
                      <p style={{ fontSize: 11.5, color: cv.textMuted, marginTop: 2 }}>
                        {ch.participant_count} members
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ====== CHAT AREA ====== */}
      {showChatArea && (selectedContact || selectedChallenge) && (
        <div style={{
          flex: 1, display: "flex", flexDirection: "column", backgroundColor: cv.bg,
          borderRadius: isMobile ? 0 : 18, border: `1px solid ${cv.border}`,
          overflow: "hidden", marginLeft: isMobile ? 0 : 12,
        }}>
          {/* ---- Header ---- */}
          <div style={{
            padding: "12px 18px", borderBottom: `1px solid ${cv.border}`,
            display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
            background: `linear-gradient(180deg, rgba(200,255,0,0.03) 0%, transparent 100%)`,
          }}>
            {isMobile && (
              <button onClick={() => { setSelectedContact(null); setSelectedChallenge(null); }} style={{
                background: "none", border: "none", cursor: "pointer", color: cv.textSecondary,
                padding: 4, marginRight: 2, display: "flex", alignItems: "center",
              }}>
                <ArrowLeft size={20} />
              </button>
            )}

            {selectedContact && (
              <div style={{ position: "relative", flexShrink: 0 }}>
                <img src={selectedContact.avatar} alt="" style={{
                  width: 40, height: 40, borderRadius: "50%", border: `2px solid ${cv.accent}`, objectFit: "cover",
                }} />
                {selectedContact.online && (
                  <div style={{
                    position: "absolute", bottom: 0, right: 0, width: 10, height: 10,
                    borderRadius: "50%", backgroundColor: "#34D399", border: "2px solid var(--bg-card)",
                  }} />
                )}
              </div>
            )}
            {selectedChallenge && (
              <div style={{
                width: 40, height: 40, borderRadius: 12, backgroundColor: cv.accentDim,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                border: `1px solid rgba(200,255,0,0.2)`,
              }}>
                <Users size={18} color={cv.accent} />
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 700, margin: 0, fontFamily: "'Chakra Petch', sans-serif" }}>
                {selectedContact?.name ?? selectedChallenge?.title}
              </p>
              {selectedContact && (
                <p style={{ fontSize: 11.5, margin: 0, marginTop: 1, color: selectedContact.online ? "#34D399" : cv.textMuted }}>
                  {selectedContact.online ? "Online" : "Offline"}
                </p>
              )}
              {selectedChallenge && (
                <p style={{ fontSize: 11.5, margin: 0, marginTop: 1, color: cv.textMuted }}>
                  {selectedChallenge.participant_count} members
                </p>
              )}
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              {[Phone, Video].map((Icon, idx) => (
                <button key={idx} style={{
                  width: 34, height: 34, borderRadius: 10, backgroundColor: cv.surface,
                  border: `1px solid ${cv.border}`, cursor: "pointer", display: "flex",
                  alignItems: "center", justifyContent: "center", color: cv.textSecondary,
                  transition: "all 0.15s",
                }}>
                  <Icon size={15} />
                </button>
              ))}
            </div>
          </div>

          {/* ---- Messages ---- */}
          <div style={{
            flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column",
            background: `radial-gradient(ellipse at 50% 0%, rgba(200,255,0,0.02), transparent 60%)`,
          }}>
            {groupedMessages.length === 0 ? (
              <div style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 10, opacity: 0.6,
              }}>
                <div style={{
                  width: 64, height: 64, borderRadius: "50%", backgroundColor: cv.surface,
                  border: `1px solid ${cv.border}`, display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Send size={24} color={cv.textMuted} />
                </div>
                <p style={{ fontSize: 14, color: cv.textMuted, textAlign: "center" }}>
                  No messages yet.<br />
                  <span style={{ fontSize: 12.5 }}>Say hello! 👋</span>
                </p>
              </div>
            ) : (
              groupedMessages.map((m) => {
                const isMe = m.sender_id === Number(user?.id);
                return (
                  <React.Fragment key={m.id}>
                    {/* Date separator */}
                    {m.showDate && (
                      <div style={{
                        display: "flex", alignItems: "center", gap: 12, margin: "16px 0 10px",
                      }}>
                        <div style={{ flex: 1, height: 1, backgroundColor: cv.border }} />
                        <span style={{
                          fontSize: 10.5, color: cv.textMuted, fontWeight: 600, textTransform: "uppercase",
                          letterSpacing: "0.5px", flexShrink: 0,
                        }}>{dateSeparator(m.created_at)}</span>
                        <div style={{ flex: 1, height: 1, backgroundColor: cv.border }} />
                      </div>
                    )}

                    {/* Message row */}
                    <div style={{
                      display: "flex", flexDirection: isMe ? "row-reverse" : "row",
                      alignItems: "flex-end", gap: 8,
                      marginTop: m.grouped ? 2 : 10,
                      animation: "chatSlideUp 0.2s ease",
                    }}>
                      {/* Avatar (only if not grouped) */}
                      {!isMe ? (
                        m.grouped ? (
                          <div style={{ width: 30, flexShrink: 0 }} />
                        ) : (
                          m.sender_avatar ? (
                            <img src={m.sender_avatar} alt="" style={{
                              width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                              border: `1px solid ${cv.border}`, objectFit: "cover",
                            }} />
                          ) : (
                            <div style={{
                              width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                              backgroundColor: cv.accentDim, display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 10, fontWeight: 700, color: cv.accent,
                            }}>{avatarFallback(m.sender_name)}</div>
                          )
                        )
                      ) : null}

                      {/* Bubble */}
                      <div style={{ maxWidth: "70%", display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                        {/* Sender name for group chats */}
                        {!isMe && !m.grouped && selectedChallenge && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, marginBottom: 3, paddingLeft: 4,
                            color: STATUS_COLORS[contacts.find(cx => cx.id === m.sender_id)?.role ?? "user"] || cv.accent,
                          }}>{m.sender_name}</span>
                        )}

                        <div style={{
                          padding: m.media_url ? "4px" : "9px 14px",
                          borderRadius: isMe
                            ? (m.grouped ? "16px 16px 4px 16px" : "16px 16px 4px 16px")
                            : (m.grouped ? "16px 16px 16px 4px" : "4px 16px 16px 16px"),
                          backgroundColor: isMe ? cv.accent : cv.surface,
                          color: isMe ? "#0A0A0B" : cv.textPrimary,
                          border: isMe ? "none" : `1px solid ${cv.border}`,
                          fontSize: 14, lineHeight: 1.55, wordBreak: "break-word",
                          position: "relative",
                          boxShadow: isMe ? "0 1px 4px rgba(200,255,0,0.15)" : "0 1px 3px rgba(0,0,0,0.1)",
                        }}>
                          {m.media_url && (
                            <img src={m.media_url} alt="media" style={{
                              maxWidth: "100%", maxHeight: 220, borderRadius: m.content ? "12px 12px 4px 4px" : 12,
                              display: "block",
                            }} />
                          )}
                          {m.content && (
                            <span style={{ display: "block", padding: m.media_url ? "6px 10px 4px" : 0 }}>{m.content}</span>
                          )}

                          {/* Timestamp + read indicator */}
                          <span style={{
                            display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 3,
                            marginTop: 3, opacity: 0.55,
                          }}>
                            <span style={{ fontSize: 9.5 }}>{fmt(m.created_at)}</span>
                            {isMe && <CheckCheck size={11} />}
                          </span>
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ---- File preview bar ---- */}
          {selectedFile && (
            <div style={{
              padding: "8px 16px", borderTop: `1px solid ${cv.border}`, display: "flex", alignItems: "center", gap: 10,
              backgroundColor: cv.surface,
            }}>
              {filePreview ? (
                <img src={filePreview} alt="preview" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }} />
              ) : (
                <div style={{
                  width: 48, height: 48, borderRadius: 8, backgroundColor: cv.accentDim,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Paperclip size={18} color={cv.accent} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12.5, fontWeight: 600, color: cv.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
                  {selectedFile.name}
                </p>
                <p style={{ fontSize: 11, color: cv.textMuted, margin: 0, marginTop: 2 }}>
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button onClick={() => setSelectedFile(null)} style={{
                width: 28, height: 28, borderRadius: 8, backgroundColor: "rgba(255,100,100,0.15)",
                border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <X size={14} color="#FF6B6B" />
              </button>
            </div>
          )}

          {/* ---- Subscription Error Banner ---- */}
          {subscriptionError && (
            <div style={{ padding: "10px 16px", backgroundColor: "rgba(255,68,68,0.06)", borderTop: `1px solid rgba(255,68,68,0.2)`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <p style={{ fontSize: 12, color: "var(--red, #FF4444)", margin: 0, flex: 1 }}>🔒 {subscriptionError}</p>
              <a href="/app/coaching" style={{ fontSize: 11, fontWeight: 600, color: "var(--accent, #C8FF00)", textDecoration: "none", whiteSpace: "nowrap", padding: "4px 10px", borderRadius: 6, background: "var(--accent-dim, rgba(200,255,0,0.1))", border: "1px solid rgba(200,255,0,0.2)" }}>Subscribe</a>
            </div>
          )}

          {/* ---- Input ---- */}
          <div style={{
            padding: "10px 14px", borderTop: `1px solid ${cv.border}`,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <input type="file" ref={fileInputRef} accept="image/*,video/*,.pdf,.doc,.docx" onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)} style={{ display: "none" }} />

            <button onClick={() => fileInputRef.current?.click()} style={{
              width: 38, height: 38, borderRadius: 12, backgroundColor: cv.surface,
              border: `1px solid ${cv.border}`, cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center", flexShrink: 0, color: cv.textMuted,
              transition: "all 0.15s",
            }}>
              <Paperclip size={16} />
            </button>

            <div style={{ flex: 1, position: "relative" }}>
              <input
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
                placeholder={t("type_message") || "Type a message…"}
                style={{
                  width: "100%", backgroundColor: cv.surface, border: `1px solid ${cv.border}`,
                  borderRadius: 14, padding: "10px 44px 10px 14px", fontSize: 14,
                  color: cv.textPrimary, fontFamily: "'Outfit', sans-serif", outline: "none",
                }}
              />
              <button style={{
                position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer", color: cv.textMuted, padding: 4,
              }}>
                <SmilePlus size={18} />
              </button>
            </div>

            <button onClick={sendMsg} disabled={sending} style={{
              width: 38, height: 38, borderRadius: 12,
              backgroundColor: (newMessage.trim() || selectedFile) ? cv.accent : cv.surface,
              border: (newMessage.trim() || selectedFile) ? "none" : `1px solid ${cv.border}`,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              transition: "all 0.2s", opacity: sending ? 0.6 : 1,
            }}>
              <Send size={16} color={(newMessage.trim() || selectedFile) ? "#0A0A0B" : cv.textMuted} />
            </button>
          </div>
        </div>
      )}

      {/* ====== EMPTY STATE (desktop) ====== */}
      {!isMobile && !(selectedContact || selectedChallenge) && (
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: 14, marginLeft: 12,
          background: `radial-gradient(ellipse at 50% 40%, rgba(200,255,0,0.04), transparent 70%)`,
          borderRadius: 18, border: `1px solid ${cv.border}`,
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%", backgroundColor: cv.bg,
            border: `2px solid ${cv.border}`, display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
          }}>
            <Send size={28} color={cv.accent} style={{ transform: "rotate(-15deg)" }} />
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{
              fontSize: 17, fontWeight: 700, color: cv.textPrimary, margin: 0,
              fontFamily: "'Chakra Petch', sans-serif",
            }}>Start a Conversation</p>
            <p style={{ fontSize: 13, color: cv.textMuted, margin: "6px 0 0", lineHeight: 1.5 }}>
              Select a contact or group<br />to start chatting
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
