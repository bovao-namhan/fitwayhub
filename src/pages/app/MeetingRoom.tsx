import React from "react";
import { getApiBase } from "@/lib/api";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Upload, Send, FileText,
  Download, MessageSquare, Paperclip, Clock, ArrowLeft, Monitor,
  MonitorOff, Maximize, Minimize, NotebookPen,
  AlertCircle, Check, MicOff as MicOffIcon
} from "lucide-react";
import { io, Socket } from "socket.io-client";

interface MeetingData {
  id: number; coach_id: number; user_id: number; title: string; room_id: string;
  status: string; scheduled_at: string; started_at: string; ended_at: string; notes: string;
  coach_name: string; coach_avatar: string; user_name: string; user_avatar: string;
}
interface MeetingFile { id: number; file_name: string; file_url: string; file_type: string; file_size: number; uploader_name: string; created_at: string; }
interface ChatMsg { user_name: string; userId: string; text: string; timestamp: number; user_avatar?: string; }

export default function MeetingRoom() {
  const { roomId } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState<MeetingData | null>(null);
  const [files, setFiles] = useState<MeetingFile[]>([]);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Media state
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [peerConnected, setPeerConnected] = useState(false);
  const [peerAudio, setPeerAudio] = useState(true);
  const [peerVideo, setPeerVideo] = useState(false);

  // Screen sharing
  const [screenSharing, setScreenSharing] = useState(false);
  const [peerScreenSharing, setPeerScreenSharing] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Chat & files
  const [chatInput, setChatInput] = useState("");
  const [sidePanel, setSidePanel] = useState<"chat" | "files" | "notes" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [peerTyping, setPeerTyping] = useState<string | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Notes
  const [notes, setNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const notesSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Call timer
  const [callDuration, setCallDuration] = useState(0);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag & drop
  const [dragOver, setDragOver] = useState(false);

  // Local video pip dragging
  const [pipPos, setPipPos] = useState({ x: 0, y: 0 });
  const pipDragging = useRef(false);
  const pipStartPos = useRef({ x: 0, y: 0, cx: 0, cy: 0 });

  // Confirm end call
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const peerSocketIdRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const api = useCallback((path: string, opts?: RequestInit) =>
    fetch(getApiBase() + path, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts?.headers || {}) } }), [token]);

  // ── Fetch meeting data ────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;
    api(`/api/meetings/${roomId}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => {
        setMeeting(d.meeting);
        setNotes(d.meeting?.notes || "");
        setFiles(d.files || []);
        setMessages((d.messages || []).map((m: any) => ({ user_name: m.user_name, userId: String(m.user_id), text: m.message, timestamp: new Date(m.created_at).getTime(), user_avatar: m.user_avatar })));
      })
      .catch(() => setError("Meeting not found or you don't have access."))
      .finally(() => setLoading(false));
  }, [roomId, api]);

  // ── Socket.io connection ──────────────────────────────────────────────────
  useEffect(() => {
    if (!meeting || !user || !roomId) return;

    const socket = io(getApiBase(), { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-room', roomId, String(user.id), user.name);
    });

    socket.on('user-joined', async ({ socketId }: { socketId: string; userId: string; userName: string }) => {
      peerSocketIdRef.current = socketId;
      setPeerConnected(true);
      try { new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=").play().catch(() => {}); } catch {}
      if (inCall && localStreamRef.current) {
        await createAndSendOffer(socketId);
      }
    });

    socket.on('offer', async ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
      peerSocketIdRef.current = from;
      setPeerConnected(true);
      if (!localStreamRef.current) {
        await startLocalMedia();
      }
      await handleOffer(from, offer);
    });

    socket.on('answer', async ({ answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socket.on('ice-candidate', async ({ candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      if (peerConnectionRef.current && candidate) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    socket.on('peer-audio-toggled', ({ enabled }: { enabled: boolean }) => setPeerAudio(enabled));
    socket.on('peer-video-toggled', ({ enabled }: { enabled: boolean }) => setPeerVideo(enabled));
    socket.on('peer-screen-sharing', ({ sharing }: { sharing: boolean }) => setPeerScreenSharing(sharing));

    socket.on('meeting-chat', (msg: ChatMsg) => {
      setMessages(prev => [...prev, msg]);
      if (sidePanel !== "chat") setUnreadCount(c => c + 1);
    });

    socket.on('file-shared', (file: MeetingFile) => {
      setFiles(prev => [file, ...prev]);
    });

    socket.on('peer-typing', ({ userName }: { userName: string }) => {
      setPeerTyping(userName);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setPeerTyping(null), 2500);
    });

    socket.on('notes-updated', (incomingNotes: string) => setNotes(incomingNotes));

    socket.on('user-left', () => {
      setPeerConnected(false);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      if (peerConnectionRef.current) { peerConnectionRef.current.close(); peerConnectionRef.current = null; }
    });

    return () => {
      socket.disconnect();
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
      if (screenStreamRef.current) screenStreamRef.current.getTracks().forEach(t => t.stop());
      if (peerConnectionRef.current) peerConnectionRef.current.close();
    };
  }, [meeting, user, roomId]);

  // Auto-scroll chat
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, sidePanel]);

  // Call timer
  useEffect(() => {
    if (inCall) {
      setCallDuration(0);
      callTimerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    }
    return () => { if (callTimerRef.current) clearInterval(callTimerRef.current); };
  }, [inCall]);

  // Fullscreen change listener
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // ── WebRTC helpers ────────────────────────────────────────────────────────
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });
    pc.onicecandidate = (event) => {
      if (event.candidate && peerSocketIdRef.current) {
        socketRef.current?.emit('ice-candidate', { to: peerSocketIdRef.current, candidate: event.candidate });
      }
    };
    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) remoteVideoRef.current.srcObject = event.streams[0];
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') setPeerConnected(false);
    };
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));
    }
    peerConnectionRef.current = pc;
    return pc;
  }, []);

  const startLocalMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: videoEnabled });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        setVideoEnabled(false);
        return stream;
      } catch { return null; }
    }
  };

  const createAndSendOffer = async (targetSocketId: string) => {
    const pc = createPeerConnection();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socketRef.current?.emit('offer', { to: targetSocketId, offer });
  };

  const handleOffer = async (from: string, offer: RTCSessionDescriptionInit) => {
    const pc = createPeerConnection();
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socketRef.current?.emit('answer', { to: from, answer });
    setInCall(true);
  };

  // ── Call controls ─────────────────────────────────────────────────────────
  const startCall = async () => {
    await startLocalMedia();
    setInCall(true);
    api(`/api/meetings/${roomId}/start`, { method: 'PATCH' }).catch(() => {});
    if (peerSocketIdRef.current) await createAndSendOffer(peerSocketIdRef.current);
  };

  const endCall = () => {
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
    if (screenStreamRef.current) { screenStreamRef.current.getTracks().forEach(t => t.stop()); screenStreamRef.current = null; setScreenSharing(false); }
    if (peerConnectionRef.current) { peerConnectionRef.current.close(); peerConnectionRef.current = null; }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setInCall(false); setPeerConnected(false); setShowEndConfirm(false);
    api(`/api/meetings/${roomId}/end`, { method: 'PATCH' }).catch(() => {});
  };

  const toggleAudio = () => {
    if (!localStreamRef.current) return;
    const t = localStreamRef.current.getAudioTracks()[0];
    if (t) { t.enabled = !t.enabled; setAudioEnabled(t.enabled); socketRef.current?.emit('toggle-audio', roomId, t.enabled); }
  };

  const toggleVideo = async () => {
    if (!localStreamRef.current) return;
    if (videoEnabled) {
      const t = localStreamRef.current.getVideoTracks()[0];
      if (t) { t.stop(); localStreamRef.current.removeTrack(t); }
      setVideoEnabled(false);
      socketRef.current?.emit('toggle-video', roomId, false);
    } else {
      try {
        const vs = await navigator.mediaDevices.getUserMedia({ video: true });
        const vt = vs.getVideoTracks()[0];
        localStreamRef.current.addTrack(vt);
        if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
        if (peerConnectionRef.current) {
          const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
          if (sender) await sender.replaceTrack(vt); else peerConnectionRef.current.addTrack(vt, localStreamRef.current);
        }
        setVideoEnabled(true);
        socketRef.current?.emit('toggle-video', roomId, true);
      } catch {}
    }
  };

  // ── Screen sharing ────────────────────────────────────────────────────────
  const toggleScreenShare = async () => {
    if (screenSharing) {
      if (screenStreamRef.current) { screenStreamRef.current.getTracks().forEach(t => t.stop()); screenStreamRef.current = null; }
      if (peerConnectionRef.current && localStreamRef.current) {
        const vt = localStreamRef.current.getVideoTracks()[0];
        const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender && vt) await sender.replaceTrack(vt);
      }
      setScreenSharing(false);
      socketRef.current?.emit('screen-sharing', roomId, false);
    } else {
      try {
        const ss = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        screenStreamRef.current = ss;
        const st = ss.getVideoTracks()[0];
        if (peerConnectionRef.current) {
          const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
          if (sender) await sender.replaceTrack(st); else peerConnectionRef.current.addTrack(st, ss);
        }
        st.onended = () => {
          setScreenSharing(false);
          socketRef.current?.emit('screen-sharing', roomId, false);
          screenStreamRef.current = null;
          if (peerConnectionRef.current && localStreamRef.current) {
            const ct = localStreamRef.current.getVideoTracks()[0];
            const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
            if (sender && ct) sender.replaceTrack(ct);
          }
        };
        setScreenSharing(true);
        socketRef.current?.emit('screen-sharing', roomId, true);
      } catch {}
    }
  };

  // ── Fullscreen ────────────────────────────────────────────────────────────
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) document.exitFullscreen(); else containerRef.current.requestFullscreen();
  };

  // ── Chat ──────────────────────────────────────────────────────────────────
  const sendChatMessage = () => {
    if (!chatInput.trim() || !roomId || !user) return;
    socketRef.current?.emit('meeting-chat', roomId, { userId: String(user.id), userName: user.name, text: chatInput.trim() });
    api(`/api/meetings/${roomId}/messages`, { method: 'POST', body: JSON.stringify({ message: chatInput.trim() }) }).catch(() => {});
    setChatInput("");
  };

  const handleChatInputChange = (val: string) => {
    setChatInput(val);
    if (roomId && user) socketRef.current?.emit('typing', roomId, user.name);
  };

  // ── Notes with auto-save ──────────────────────────────────────────────────
  const handleNotesChange = (val: string) => {
    setNotes(val);
    setNotesSaved(false);
    socketRef.current?.emit('notes-updated', roomId, val);
    if (notesSaveTimeoutRef.current) clearTimeout(notesSaveTimeoutRef.current);
    notesSaveTimeoutRef.current = setTimeout(() => {
      setNotesSaving(true);
      api(`/api/meetings/${roomId}/notes`, { method: 'PATCH', body: JSON.stringify({ notes: val }) })
        .then(() => { setNotesSaved(true); setTimeout(() => setNotesSaved(false), 2000); })
        .catch(() => {})
        .finally(() => setNotesSaving(false));
    }, 1200);
  };

  // ── File upload (with drag & drop) ────────────────────────────────────────
  const uploadFile = async (file: File) => {
    if (!file || !roomId) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch(getApiBase() + `/api/meetings/${roomId}/files`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      if (r.ok) {
        const d = await r.json();
        if (d.file) { setFiles(prev => [d.file, ...prev]); socketRef.current?.emit('file-shared', roomId, d.file); }
      }
    } catch {}
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) uploadFile(f); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) { uploadFile(f); setSidePanel("files"); } };

  // ── PIP drag ──────────────────────────────────────────────────────────────
  const onPipMouseDown = (e: React.MouseEvent) => {
    pipDragging.current = true;
    pipStartPos.current = { x: e.clientX, y: e.clientY, cx: pipPos.x, cy: pipPos.y };
    const onMove = (ev: MouseEvent) => { if (!pipDragging.current) return; setPipPos({ x: pipStartPos.current.cx + (ev.clientX - pipStartPos.current.x), y: pipStartPos.current.cy + (ev.clientY - pipStartPos.current.y) }); };
    const onUp = () => { pipDragging.current = false; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getFileIcon = (type: string) => {
    if (type?.includes('pdf')) return '📄';
    if (type?.includes('word') || type?.includes('document')) return '📝';
    if (type?.includes('presentation') || type?.includes('powerpoint')) return '📊';
    if (type?.includes('image')) return '🖼️';
    if (type?.includes('spreadsheet') || type?.includes('excel')) return '📈';
    return '📎';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDuration = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
  };

  const formatChatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const partnerName = meeting ? (user?.id === meeting.coach_id ? meeting.user_name : meeting.coach_name) : '';
  const partnerAvatar = meeting ? (user?.id === meeting.coach_id ? meeting.user_avatar : meeting.coach_avatar) : '';
  const navigateBack = () => navigate(user?.role === 'coach' ? '/coach/meetings' : '/app/meetings');

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", backgroundColor: "#0A0A0B" }}>Loading meeting...</div>;
  if (error || !meeting) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, color: "var(--text-muted)", backgroundColor: "#0A0A0B" }}>
      <AlertCircle size={40} strokeWidth={1.5} />
      <p style={{ fontSize: 16 }}>{error || "Meeting not found"}</p>
      <button onClick={navigateBack} style={{ padding: "10px 24px", borderRadius: 10, background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 14 }}>Go Back</button>
    </div>
  );

  return (
    <div ref={containerRef} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
      style={{ height: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#0A0A0B", color: "var(--text-primary)", overflow: "hidden", position: "relative" }}>

      {/* Drag overlay */}
      {dragOver && (
        <div style={{ position: "absolute", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(200,255,0,0.06)", border: "3px dashed var(--accent)", pointerEvents: "none" }}>
          <div style={{ textAlign: "center" }}>
            <Upload size={48} color="var(--accent)" strokeWidth={1.5} />
            <p style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Chakra Petch', sans-serif", color: "var(--accent)", marginTop: 12 }}>Drop file to share</p>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>PDF, Word, PPT, Images & more</p>
          </div>
        </div>
      )}

      {/* ── Top bar ────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", backgroundColor: "var(--bg-card)", borderBottom: "1px solid var(--border)", flexShrink: 0, gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <button onClick={navigateBack} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center", flexShrink: 0 }}><ArrowLeft size={20} /></button>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meeting.title}</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--text-muted)", flexWrap: "wrap" }}>
              <span>with {partnerName}</span>
              <span>·</span>
              <span>{meeting.status === 'active' ? '🟢 Live' : meeting.status === 'ended' ? '⚫ Ended' : '⏰ Scheduled'}</span>
              {inCall && <span style={{ color: "var(--accent)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>⏱ {formatDuration(callDuration)}</span>}
              {peerScreenSharing && <span style={{ color: "#60A5FA", fontWeight: 600 }}>🖥 Screen shared</span>}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
          <button onClick={() => setSidePanel(sidePanel === "notes" ? null : "notes")} style={{ padding: "7px 10px", borderRadius: 8, background: sidePanel === "notes" ? "var(--accent-dim)" : "var(--bg-surface)", border: `1px solid ${sidePanel === "notes" ? "rgba(200,255,0,0.3)" : "var(--border)"}`, color: sidePanel === "notes" ? "var(--accent)" : "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600 }}>
            <NotebookPen size={13} /> <span className="hide-mobile">Notes</span>
          </button>
          <button onClick={() => { setSidePanel(sidePanel === "chat" ? null : "chat"); if (sidePanel !== "chat") setUnreadCount(0); }} style={{ position: "relative", padding: "7px 10px", borderRadius: 8, background: sidePanel === "chat" ? "var(--accent-dim)" : "var(--bg-surface)", border: `1px solid ${sidePanel === "chat" ? "rgba(200,255,0,0.3)" : "var(--border)"}`, color: sidePanel === "chat" ? "var(--accent)" : "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600 }}>
            <MessageSquare size={13} /> <span className="hide-mobile">Chat</span>
            {unreadCount > 0 && <span style={{ position: "absolute", top: -5, right: -5, width: 18, height: 18, borderRadius: "50%", background: "var(--red)", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{unreadCount > 9 ? "9+" : unreadCount}</span>}
          </button>
          <button onClick={() => setSidePanel(sidePanel === "files" ? null : "files")} style={{ padding: "7px 10px", borderRadius: 8, background: sidePanel === "files" ? "var(--accent-dim)" : "var(--bg-surface)", border: `1px solid ${sidePanel === "files" ? "rgba(200,255,0,0.3)" : "var(--border)"}`, color: sidePanel === "files" ? "var(--accent)" : "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600 }}>
            <Paperclip size={13} /> <span className="hide-mobile">Files{files.length > 0 ? ` (${files.length})` : ""}</span>
          </button>
          <button onClick={toggleFullscreen} style={{ padding: "7px 10px", borderRadius: 8, background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center" }}>
            {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
          </button>
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Video area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", padding: 16, minWidth: 0 }}>
          {inCall ? (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              {/* Remote video */}
              <div style={{ width: "100%", height: "100%", position: "relative", borderRadius: 16, overflow: "hidden", backgroundColor: "#111", border: "1px solid var(--border)" }}>
                <video ref={remoteVideoRef} autoPlay playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                {!peerConnected && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.8)" }}>
                    <div style={{ width: 88, height: 88, borderRadius: "50%", border: "3px solid var(--border)", overflow: "hidden", marginBottom: 12 }}>
                      <img src={partnerAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${partnerName}`} alt="" style={{ width: "100%", height: "100%" }} />
                    </div>
                    <p style={{ fontSize: 16, fontWeight: 600 }}>{partnerName}</p>
                    <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Waiting to join...</p>
                    <div style={{ marginTop: 16, display: "flex", gap: 4 }}>
                      {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "var(--accent)", opacity: 0.3, animation: `bounce 1.4s ${i * 0.16}s infinite ease-in-out` }} />)}
                    </div>
                  </div>
                )}
                {peerConnected && !peerVideo && !peerScreenSharing && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.6)" }}>
                    <img src={partnerAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${partnerName}`} alt="" style={{ width: 80, height: 80, borderRadius: "50%", marginBottom: 10 }} />
                    <p style={{ fontSize: 15, fontWeight: 600 }}>{partnerName}</p>
                    <div style={{ display: "flex", gap: 8, marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}>
                      {!peerAudio && <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--red)" }}><MicOff size={12} /> Muted</span>}
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><VideoOff size={12} /> Camera off</span>
                    </div>
                  </div>
                )}
                {/* Audio waveform indicator */}
                {peerConnected && peerAudio && !peerVideo && !peerScreenSharing && (
                  <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 3, alignItems: "flex-end", height: 20 }}>
                    {[0,1,2,3,4].map(i => <div key={i} style={{ width: 3, backgroundColor: "var(--accent)", borderRadius: 2, animation: `audioWave 1s ${i * 0.15}s infinite ease-in-out`, height: 8 }} />)}
                  </div>
                )}
              </div>

              {/* Local PIP (draggable) */}
              <div onMouseDown={onPipMouseDown} style={{ position: "absolute", bottom: 90 - pipPos.y, right: 24 - pipPos.x, width: 170, height: 128, borderRadius: 14, overflow: "hidden", border: `2px solid ${screenSharing ? "#60A5FA" : "var(--accent)"}`, boxShadow: "0 4px 24px rgba(0,0,0,0.6)", cursor: "grab", zIndex: 10 }}>
                <video ref={localVideoRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
                {!videoEnabled && !screenSharing && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#1a1a1a" }}>
                    <img src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} alt="" style={{ width: 48, height: 48, borderRadius: "50%" }} />
                  </div>
                )}
                {screenSharing && <div style={{ position: "absolute", top: 4, left: 4, padding: "2px 6px", borderRadius: 4, backgroundColor: "rgba(96,165,250,0.9)", fontSize: 9, fontWeight: 700, color: "#fff" }}>Screen</div>}
                {!audioEnabled && <span style={{ position: "absolute", bottom: 4, right: 4, width: 18, height: 18, borderRadius: "50%", backgroundColor: "var(--red)", display: "flex", alignItems: "center", justifyContent: "center" }}><MicOff size={10} color="#fff" /></span>}
              </div>
            </div>
          ) : (
            /* Pre-call lobby */
            <div style={{ textAlign: "center", maxWidth: 440, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
                <img src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} alt="" style={{ width: 80, height: 80, borderRadius: "50%", border: "3px solid var(--accent)", zIndex: 1 }} />
                <img src={partnerAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${partnerName}`} alt="" style={{ width: 80, height: 80, borderRadius: "50%", border: "3px solid #60A5FA", marginLeft: -18 }} />
              </div>
              <h2 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 24, fontWeight: 700, marginBottom: 8 }}>{meeting.title}</h2>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 6 }}>Session with <strong>{partnerName}</strong></p>
              {meeting.scheduled_at && (
                <p style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 8 }}>
                  <Clock size={13} /> {new Date(meeting.scheduled_at).toLocaleString()}
                </p>
              )}
              {meeting.status === 'ended' && (
                <div style={{ padding: "10px 16px", borderRadius: 10, backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", marginBottom: 16, fontSize: 13, color: "var(--text-muted)" }}>
                  This meeting has ended{meeting.ended_at ? ` · ${new Date(meeting.ended_at).toLocaleString()}` : ""}
                </div>
              )}
              {/* Pre-call media settings */}
              <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 20, marginBottom: 24 }}>
                <button onClick={() => setAudioEnabled(!audioEnabled)} style={{ width: 52, height: 52, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border)", cursor: "pointer", backgroundColor: audioEnabled ? "var(--bg-surface)" : "rgba(239,68,68,0.15)", color: audioEnabled ? "var(--text-primary)" : "var(--red)", transition: "all 0.15s" }}>
                  {audioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                </button>
                <button onClick={() => setVideoEnabled(!videoEnabled)} style={{ width: 52, height: 52, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border)", cursor: "pointer", backgroundColor: videoEnabled ? "var(--bg-surface)" : "rgba(239,68,68,0.15)", color: videoEnabled ? "var(--text-primary)" : "var(--red)", transition: "all 0.15s" }}>
                  {videoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
                </button>
              </div>
              {meeting.status !== 'ended' && (
                <button onClick={startCall} style={{ padding: "14px 40px", borderRadius: 14, backgroundColor: "var(--accent)", color: "#0A0A0B", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <Video size={18} /> Join Call
                </button>
              )}
              {peerConnected && <p style={{ fontSize: 12, color: "var(--accent)", marginTop: 14, fontWeight: 600 }}>● {partnerName} is in the room</p>}
            </div>
          )}
        </div>

        {/* ── Side panel ─────────────────────────────────────────────── */}
        {sidePanel && (
          <div style={{ width: 360, maxWidth: "85vw", borderLeft: "1px solid var(--border)", display: "flex", flexDirection: "column", backgroundColor: "var(--bg-card)", flexShrink: 0 }}>
            {/* Chat */}
            {sidePanel === "chat" && (<>
              <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", fontFamily: "'Chakra Petch', sans-serif", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                <MessageSquare size={14} /> Meeting Chat
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                {messages.length === 0 && <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 12, padding: 30 }}>No messages yet. Start the conversation!</p>}
                {messages.map((m, i) => {
                  const isMe = m.userId === String(user?.id);
                  const showTime = i === 0 || (m.timestamp - messages[i - 1].timestamp > 300000);
                  return (
                    <React.Fragment key={i}>
                      {showTime && <div style={{ textAlign: "center", fontSize: 9, color: "var(--text-muted)", padding: "6px 0", fontWeight: 600, letterSpacing: "0.04em" }}>{formatChatTime(m.timestamp)}</div>}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                        <span style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2, display: "flex", alignItems: "center", gap: 4 }}>
                          {!isMe && m.user_avatar && <img src={m.user_avatar} alt="" style={{ width: 14, height: 14, borderRadius: "50%" }} />}
                          {isMe ? "You" : m.user_name}
                        </span>
                        <div style={{ padding: "8px 12px", borderRadius: isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px", maxWidth: "88%", fontSize: 13, lineHeight: 1.5, backgroundColor: isMe ? "var(--accent-dim)" : "var(--bg-surface)", border: `1px solid ${isMe ? "rgba(200,255,0,0.2)" : "var(--border)"}`, color: "var(--text-primary)", wordBreak: "break-word" }}>
                          {m.text}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
                {peerTyping && <div style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic", paddingLeft: 4 }}>{peerTyping} is typing...</div>}
                <div ref={chatEndRef} />
              </div>
              <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
                <input value={chatInput} onChange={e => handleChatInputChange(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChatMessage()} placeholder="Type a message…" className="input-base" style={{ flex: 1, fontSize: 13 }} />
                <button onClick={sendChatMessage} disabled={!chatInput.trim()} style={{ padding: "8px 12px", borderRadius: 8, background: chatInput.trim() ? "var(--accent)" : "var(--bg-surface)", border: "none", color: chatInput.trim() ? "#0A0A0B" : "var(--text-muted)", cursor: chatInput.trim() ? "pointer" : "default", display: "flex", alignItems: "center", transition: "all 0.15s" }}>
                  <Send size={14} />
                </button>
              </div>
            </>)}

            {/* Files */}
            {sidePanel === "files" && (<>
              <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", fontFamily: "'Chakra Petch', sans-serif", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Paperclip size={14} /> Shared Files</div>
                <label style={{ padding: "5px 11px", borderRadius: 7, background: "var(--accent-dim)", border: "1px solid rgba(200,255,0,0.25)", color: "var(--accent)", cursor: uploading ? "wait" : "pointer", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                  <Upload size={12} /> {uploading ? "Uploading…" : "Upload"}
                  <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt,.csv,.zip,.rar" onChange={handleFileUpload} style={{ display: "none" }} disabled={uploading} />
                </label>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                {files.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                    <FileText size={36} strokeWidth={1} style={{ margin: "0 auto 12px" }} />
                    <p style={{ fontSize: 13, fontWeight: 600 }}>No files shared yet</p>
                    <p style={{ fontSize: 11, marginTop: 4 }}>Upload or drag & drop files anywhere</p>
                  </div>
                ) : files.map(f => (
                  <a key={f.id} href={getApiBase() + f.file_url} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", textDecoration: "none", color: "var(--text-primary)" }}>
                    <span style={{ fontSize: 24, flexShrink: 0 }}>{getFileIcon(f.file_type)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.file_name}</p>
                      <p style={{ fontSize: 10, color: "var(--text-muted)" }}>{f.uploader_name} · {formatFileSize(f.file_size)}</p>
                    </div>
                    <Download size={14} color="var(--accent)" style={{ flexShrink: 0 }} />
                  </a>
                ))}
              </div>
            </>)}

            {/* Notes */}
            {sidePanel === "notes" && (<>
              <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", fontFamily: "'Chakra Petch', sans-serif", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><NotebookPen size={14} /> Session Notes</div>
                <span style={{ fontSize: 10, color: notesSaved ? "var(--accent)" : notesSaving ? "var(--text-muted)" : "transparent", display: "flex", alignItems: "center", gap: 4, transition: "all 0.3s" }}>
                  {notesSaving ? "Saving..." : notesSaved ? <><Check size={10} /> Saved</> : ""}
                </span>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 12 }}>
                <textarea value={notes} onChange={e => handleNotesChange(e.target.value)}
                  placeholder={"Take notes during the session...\n\n• Workout plan\n• Progress updates\n• Medical observations\n• Next steps"}
                  style={{ flex: 1, padding: 14, borderRadius: 12, border: "1px solid var(--border)", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", fontSize: 13, lineHeight: 1.7, resize: "none", fontFamily: "inherit", outline: "none" }}
                  onFocus={e => (e.target.style.borderColor = "rgba(200,255,0,0.4)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border)")}
                />
                <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 8, textAlign: "center" }}>
                  Notes are shared in real-time and auto-saved
                </p>
              </div>
            </>)}
          </div>
        )}
      </div>

      {/* ── Call controls ─────────────────────────────────────────────── */}
      {inCall && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "12px 20px", backgroundColor: "var(--bg-card)", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
          <button onClick={toggleAudio} title={audioEnabled ? "Mute" : "Unmute"} style={{ width: 48, height: 48, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer", backgroundColor: audioEnabled ? "var(--bg-surface)" : "var(--red)", color: audioEnabled ? "var(--text-primary)" : "#fff", transition: "all 0.15s" }}>
            {audioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
          </button>
          <button onClick={toggleVideo} title={videoEnabled ? "Camera off" : "Camera on"} style={{ width: 48, height: 48, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer", backgroundColor: videoEnabled ? "var(--bg-surface)" : "var(--red)", color: videoEnabled ? "var(--text-primary)" : "#fff", transition: "all 0.15s" }}>
            {videoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
          </button>
          <button onClick={toggleScreenShare} title={screenSharing ? "Stop sharing" : "Share screen"} style={{ width: 48, height: 48, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer", backgroundColor: screenSharing ? "#60A5FA" : "var(--bg-surface)", color: screenSharing ? "#fff" : "var(--text-primary)", transition: "all 0.15s" }}>
            {screenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
          </button>
          <div style={{ width: 1, height: 28, backgroundColor: "var(--border)", margin: "0 4px" }} />
          <button onClick={() => setShowEndConfirm(true)} title="End call" style={{ width: 56, height: 48, borderRadius: 24, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer", backgroundColor: "#EF4444", color: "#fff", transition: "all 0.15s" }}>
            <PhoneOff size={22} />
          </button>
        </div>
      )}

      {/* End call confirm */}
      {showEndConfirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.7)", padding: 20 }}>
          <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, maxWidth: 360, width: "100%", textAlign: "center" }}>
            <PhoneOff size={36} color="#EF4444" style={{ margin: "0 auto 12px" }} />
            <h3 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>End this call?</h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>The meeting will be marked as ended for both participants.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowEndConfirm(false)} style={{ flex: 1, padding: 11, borderRadius: 10, backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 14 }}>Cancel</button>
              <button onClick={endCall} style={{ flex: 1, padding: 11, borderRadius: 10, backgroundColor: "#EF4444", border: "none", color: "#fff", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>End Call</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
        @keyframes audioWave { 0%, 100% { height: 4px; } 50% { height: 18px; } }
        @media (max-width: 600px) { .hide-mobile { display: none !important; } }
      `}</style>
    </div>
  );
}