import { getApiBase } from "@/lib/api";
import { useState, useRef, useEffect } from "react";
import { Send, Search, Mic, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";

interface Message { id: number; sender_id: number; receiver_id: number; content: string; media_url?: string | null; created_at: string; }
interface ChatUser { id: number; name: string; email: string; avatar: string; role: string; online?: boolean; }

const isAudioUrl = (url: string) => /\.(webm|ogg|mp3|wav|m4a|aac|opus)$/i.test(url) || url.includes('voice-');

export default function CoachChat() {
  const { user, token } = useAuth();
  const { t } = useI18n();
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [activeUser, setActiveUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [onlineUserIds, setOnlineUserIds] = useState<number[]>([]);
  const onlineSetRef = useRef<Set<number>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const api = (path: string, opts?: RequestInit) =>
    fetch(getApiBase() + path, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts?.headers || {}) } });

  useEffect(() => {
    api("/api/chat/users")
      .then(r => r.json())
      .then(d => {
        const list = (d.users || []).filter((u: ChatUser) => u.role !== "admin");
        setChatUsers(list.map((u: ChatUser) => ({ ...u, online: onlineSetRef.current.has(Number(u.id)) || Boolean((u as any).online) })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!token) return;

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
    const id = setInterval(syncPresence, 5000);
    return () => {
      clearInterval(id);
    };
  }, [token]);

  useEffect(() => {
    setChatUsers(prev => prev.map(u => ({ ...u, online: onlineSetRef.current.has(Number(u.id)) })));
  }, [onlineUserIds]);

  useEffect(() => {
    if (!activeUser) return;
    const load = () => api(`/api/chat/messages/${activeUser.id}`).then(r => r.json()).then(d => setMessages(d.messages || [])).catch(() => {});
    load();
    pollRef.current = setInterval(load, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeUser]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const sendMsg = async () => {
    if (!input.trim() || !activeUser) return;
    const text = input.trim();
    setInput("");
    try {
      await api("/api/chat/send", { method: "POST", body: JSON.stringify({ receiverId: activeUser.id, content: text }) });
      const r = await api(`/api/chat/messages/${activeUser.id}`);
      if (r.ok) { const d = await r.json(); setMessages(d.messages || []); }
    } catch {}
  };

  /* voice recording */
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Log stream tracks to verify we're getting real audio
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        console.error('No audio tracks detected');
        return;
      }
      
      // Verify audio is actually flowing
      const audioTrack = audioTracks[0];
      console.log('Audio track obtained:', {
        label: audioTrack.label,
        enabled: audioTrack.enabled,
        readyState: audioTrack.readyState,
      });

      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg', 'audio/mp4', 'audio/aac'];
      const supported = mimeTypes.find(m => MediaRecorder.isTypeSupported(m));
      const mediaRecorder = supported ? new MediaRecorder(stream, { mimeType: supported }) : new MediaRecorder(stream);
      
      console.log('MediaRecorder created with mime:', mediaRecorder.mimeType);
      
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        console.log('Data available, chunk size:', e.data.size);
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      
      mediaRecorder.onstop = async () => {
        console.log('Recording stopped, total chunks:', audioChunksRef.current.length);
        stream.getTracks().forEach(t => t.stop());
        
        const mime = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mime });
        
        console.log('Blob created with size:', blob.size, 'mime:', mime);
        
        // Reduced threshold to 100 bytes for shorter recordings
        if (blob.size < 100 || !activeUser) {
          if (blob.size < 100) console.warn('Recording too small:', blob.size, 'bytes');
          return;
        }
        
        const ext = mime.includes('mp4') || mime.includes('aac') ? 'mp4' : mime.includes('ogg') ? 'ogg' : 'webm';
        const fd = new FormData();
        fd.append('file', blob, `voice-${Date.now()}.${ext}`);
        fd.append('receiverId', activeUser.id.toString());
        try {
          await fetch(getApiBase() + '/api/chat/send-voice', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
          const r2 = await api(`/api/chat/messages/${activeUser.id}`);
          if (r2.ok) { const d2 = await r2.json(); setMessages(d2.messages || []); }
        } catch (e) {
          console.error('Voice send error:', e);
        }
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => setRecordingDuration(d => d + 1), 1000);
      
      console.log('Recording started');
    } catch (err) {
      console.error('Recording error:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
    setIsRecording(false);
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
    setIsRecording(false);
    setRecordingDuration(0);
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
  };

  const formatRecTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const filtered = chatUsers.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const showList = !isMobile || !activeUser;
  const showConvo = !isMobile || !!activeUser;

  return (
    <div style={{ display: "flex", gap: 0, height: "calc(100dvh - 120px)", backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: isMobile ? 0 : 16, overflow: "hidden" }}>
      <div style={{ width: showList ? (isMobile ? "100%" : 280) : 0, borderInlineEnd: isMobile ? "none" : "1px solid var(--border)", display: showList ? "flex" : "none", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "16px", borderBottom: "1px solid var(--border)" }}>
          <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, fontWeight: 700, marginBottom: 10 }}>{t("messages")}</p>
          <div style={{ position: "relative" }}>
            <Search size={13} style={{ position: "absolute", insetInlineStart: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input className="input-base" value={search} onChange={e => setSearch(e.target.value)} placeholder={t("search_placeholder")} style={{ paddingInlineStart: 30, padding: "7px 10px 7px 30px", fontSize: 12 }} />
          </div>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading ? (
            <p style={{ padding: 20, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>{t("coach_chat_loading")}</p>
          ) : filtered.length === 0 ? (
            <p style={{ padding: 20, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>{t("coach_chat_no_users")}</p>
          ) : filtered.map(u => (
            <button key={u.id} onClick={() => setActiveUser(u)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderBottom: "1px solid var(--border)", background: activeUser?.id === u.id ? "var(--accent-dim)" : "none", border: "none", cursor: "pointer", textAlign: "start", borderInlineStart: activeUser?.id === u.id ? "3px solid var(--blue)" : "3px solid transparent", transition: "all 0.15s" }}>
              <img src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`} alt={u.name} style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: "var(--bg-surface)" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</p>
                <p style={{ fontSize: 11, color: u.online ? "var(--accent)" : "var(--text-muted)", marginTop: 2, textTransform: "capitalize" }}>
                  {u.online ? `● ${t("coach_chat_online")}` : `● ${t("coach_chat_offline")}`}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {showConvo && !!activeUser && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
            {isMobile && <button onClick={() => setActiveUser(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4, marginInlineEnd: 4 }}>←</button>}
            <img src={activeUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeUser.email}`} alt={activeUser.name} style={{ width: 38, height: 38, borderRadius: "50%", backgroundColor: "var(--bg-surface)" }} />
            <div>
              <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, fontWeight: 700 }}>{activeUser.name}</p>
              <p style={{ fontSize: 11, color: activeUser.online ? "var(--accent)" : "var(--text-muted)" }}>
                {activeUser.online ? `● ${t("coach_chat_online")}` : `● ${t("coach_chat_offline")}`}
              </p>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.length === 0 && <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13, paddingTop: 40 }}>{t("coach_chat_no_messages")}</p>}
            {messages.map(msg => {
              const isMe = msg.sender_id === user?.id;
              return (
                <div key={msg.id} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "70%", padding: "10px 14px", borderRadius: isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px", backgroundColor: isMe ? "var(--blue)" : "var(--bg-surface)", border: isMe ? "none" : "1px solid var(--border)", color: isMe ? "#fff" : "var(--text-primary)" }}>
                    {msg.media_url && isAudioUrl(msg.media_url) ? (
                      <div style={{ minWidth: 180 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <Mic size={13} color={isMe ? "#fff" : "var(--accent)"} />
                          <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.7 }}>{t('voice_note')}</span>
                        </div>
                        <audio controls preload="metadata" style={{ width: "100%", height: 28, borderRadius: 6 }}
                          src={msg.media_url.startsWith('http') ? msg.media_url : getApiBase() + msg.media_url} />
                      </div>
                    ) : msg.media_url ? (
                      <img src={msg.media_url.startsWith('http') ? msg.media_url : getApiBase() + msg.media_url} alt="media" style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 10, display: "block", marginBottom: msg.content ? 6 : 0 }} />
                    ) : null}
                    {msg.content && <p style={{ fontSize: 13, lineHeight: 1.5 }}>{msg.content}</p>}
                    <p style={{ fontSize: 10, opacity: 0.7, marginTop: 4, textAlign: isMe ? "end" : "start" }}>{formatTime(msg.created_at)}</p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          <div style={{ padding: "14px 16px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, alignItems: "flex-end" }}>
            {isRecording ? (
              <>
                <button onClick={cancelRecording} style={{ width: 42, height: 42, borderRadius: 11, backgroundColor: "rgba(255,68,68,0.12)", border: "1px solid rgba(255,68,68,0.3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                  <X size={16} color="#FF6B6B" />
                </button>
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", backgroundColor: "rgba(255,68,68,0.06)", borderRadius: 11, border: "1px solid rgba(255,68,68,0.15)" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#FF4444" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#FF6B6B" }}>{t('recording_label')} {formatRecTime(recordingDuration)}</span>
                </div>
                <button onClick={stopRecording} style={{ width: 42, height: 42, borderRadius: 11, backgroundColor: "var(--blue)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                  <Send size={16} color="#fff" />
                </button>
              </>
            ) : (
              <>
                <input className="input-base" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMsg()} placeholder={t("coach_chat_type_message")} style={{ flex: 1, padding: "10px 14px", fontSize: 13 }} />
                {!input.trim() ? (
                  <button onClick={startRecording} style={{ width: 42, height: 42, borderRadius: 11, backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                    <Mic size={16} color="var(--text-muted)" />
                  </button>
                ) : (
                  <button onClick={sendMsg} style={{ width: 42, height: 42, borderRadius: 11, backgroundColor: "var(--blue)", border: `1px solid var(--blue)`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                    <Send size={16} color="#fff" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {!isMobile && !activeUser && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", flexDirection: "column", gap: 10 }}>
          <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 15 }}>{t("coach_chat_select_conversation")}</p>
          <p style={{ fontSize: 13 }}>{t("coach_chat_choose_user")}</p>
        </div>
      )}
    </div>
  );
}
