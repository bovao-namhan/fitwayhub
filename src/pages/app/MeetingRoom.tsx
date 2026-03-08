import React, { useCallback, useEffect, useRef, useState } from "react";
import { getApiBase } from "@/lib/api";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Clock,
  Download,
  FileText,
  MessageSquare,
  Mic,
  MicOff,
  NotebookPen,
  Paperclip,
  Phone,
  PhoneOff,
  Play,
  Save,
  Square,
  Upload,
  Video as VideoIcon,
  VideoOff,
} from "lucide-react";

interface MeetingPresence {
  coach_online: boolean;
  user_online: boolean;
  coach_last_seen: number | null;
  user_last_seen: number | null;
  ttl_ms: number;
}

interface MeetingData {
  id: number;
  coach_id: number;
  user_id: number;
  title: string;
  room_id: string;
  status: "scheduled" | "active" | "ended";
  scheduled_at: string;
  started_at: string;
  ended_at: string;
  notes: string;
  coach_name: string;
  coach_avatar: string;
  user_name: string;
  user_avatar: string;
  presence?: MeetingPresence;
}

interface MeetingFile {
  id: number;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  uploader_name: string;
  created_at: string;
}

interface ChatMsg {
  user_name: string;
  userId: string;
  text: string;
  timestamp: number;
  user_avatar?: string;
}

export default function MeetingRoom() {
  const { roomId } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState<MeetingData | null>(null);
  const [files, setFiles] = useState<MeetingFile[]>([]);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sidePanel, setSidePanel] = useState<"chat" | "files" | "notes" | null>("chat");
  const [chatInput, setChatInput] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [notesDirty, setNotesDirty] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const notesSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Call state ──
  const [callState, setCallState] = useState<"idle" | "calling" | "ringing" | "connected">("idle");
  const [callMode, setCallMode] = useState<"video" | "audio" | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [incomingOffer, setIncomingOffer] = useState<{ sdp: string; mode: "video" | "audio" } | null>(null);
  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const callStartRef = useRef<number>(0);

  const api = useCallback(
    (path: string, opts?: RequestInit) =>
      fetch(getApiBase() + path, {
        ...opts,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(opts?.headers || {}),
        },
      }),
    [token]
  );

  const navigateBack = () => navigate(user?.role === "coach" ? "/coach/meetings" : "/app/meetings");

  const refreshMeeting = useCallback(async () => {
    if (!roomId) return;
    const res = await api(`/api/meetings/${roomId}`);
    if (!res.ok) throw new Error("fetch_failed");
    const data = await res.json();
    const nextMeeting: MeetingData | null = data.meeting || null;
    const nextFiles: MeetingFile[] = data.files || [];
    const nextMessages: ChatMsg[] = (data.messages || []).map((m: any) => ({
      user_name: m.user_name,
      userId: String(m.user_id),
      text: m.message,
      timestamp: new Date(m.created_at).getTime(),
      user_avatar: m.user_avatar,
    }));

    setMeeting(nextMeeting);
    setFiles(nextFiles);
    setMessages((prev) => {
      if (sidePanel !== "chat" && nextMessages.length > prev.length) {
        setUnreadCount((c) => c + (nextMessages.length - prev.length));
      }
      return nextMessages;
    });

    if (!notesDirty) {
      setNotes(nextMeeting?.notes || "");
    }
  }, [api, roomId, notesDirty, sidePanel]);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        await refreshMeeting();
        if (alive) setError("");
      } catch {
        if (alive) setError("Meeting not found or you don't have access.");
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    const pollId = setInterval(() => {
      refreshMeeting().catch(() => {});
    }, 3000);

    const heartbeatId = setInterval(() => {
      if (!roomId) return;
      api(`/api/meetings/${roomId}/heartbeat`, { method: "POST" }).catch(() => {});
    }, 10000);

    return () => {
      alive = false;
      clearInterval(pollId);
      clearInterval(heartbeatId);
    };
  }, [roomId, api, refreshMeeting]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── WebRTC Calling ──────────────────────────────────────────────────────────
  const RTC_CONFIG: RTCConfiguration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  const sendSignal = useCallback(
    (type: string, data: any) => {
      if (!roomId) return;
      api(`/api/meetings/${roomId}/signal`, {
        method: "POST",
        body: JSON.stringify({ type, data }),
      }).catch(() => {});
    },
    [api, roomId]
  );

  const cleanupCall = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    pendingCandidatesRef.current = [];
    setCallState("idle");
    setCallMode(null);
    setIsMuted(false);
    setIsCameraOff(false);
    setIncomingOffer(null);
    setCallDuration(0);
    callStartRef.current = 0;
  }, []);

  const createPC = useCallback(() => {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal("ice-candidate", e.candidate.toJSON());
    };
    pc.ontrack = (e) => {
      if (remoteVideoRef.current && e.streams[0]) {
        remoteVideoRef.current.srcObject = e.streams[0];
      }
    };
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "connected") {
        setCallState("connected");
        callStartRef.current = Date.now();
      }
      if (["disconnected", "failed", "closed"].includes(pc.iceConnectionState)) {
        cleanupCall();
      }
    };
    pcRef.current = pc;
    return pc;
  }, [sendSignal, cleanupCall]);

  const startCall = useCallback(
    async (mode: "video" | "audio") => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: mode === "video",
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        const pc = createPC();
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        setCallState("calling");
        setCallMode(mode);
        sendSignal("offer", { sdp: offer.sdp, type: offer.type, mode });
      } catch (err) {
        console.error("Failed to start call:", err);
        cleanupCall();
      }
    },
    [createPC, sendSignal, cleanupCall]
  );

  const acceptCall = useCallback(async () => {
    if (!incomingOffer) return;
    try {
      const mode = incomingOffer.mode;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: mode === "video",
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const pc = createPC();
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: incomingOffer.sdp }));
      for (const c of pendingCandidatesRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
      }
      pendingCandidatesRef.current = [];
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      setCallState("connected");
      setCallMode(mode);
      setIncomingOffer(null);
      callStartRef.current = Date.now();
      sendSignal("answer", { sdp: answer.sdp, type: answer.type });
    } catch (err) {
      console.error("Failed to accept call:", err);
      cleanupCall();
    }
  }, [incomingOffer, createPC, sendSignal, cleanupCall]);

  const rejectCall = useCallback(() => {
    sendSignal("hang-up", {});
    setIncomingOffer(null);
    setCallState("idle");
  }, [sendSignal]);

  const hangUp = useCallback(() => {
    sendSignal("hang-up", {});
    cleanupCall();
  }, [sendSignal, cleanupCall]);

  const toggleMute = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const toggleCamera = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOff(!videoTrack.enabled);
    }
  };

  // ── Signal polling ──
  useEffect(() => {
    if (!roomId || !meeting) return;
    let alive = true;
    const poll = async () => {
      try {
        const res = await api(`/api/meetings/${roomId}/signals`);
        if (!res.ok || !alive) return;
        const { signals } = await res.json();
        for (const sig of signals || []) {
          switch (sig.type) {
            case "offer":
              if (callState === "idle") {
                setIncomingOffer({ sdp: sig.data.sdp, mode: sig.data.mode || "video" });
                setCallState("ringing");
              }
              break;
            case "answer": {
              const pc = pcRef.current;
              if (pc && pc.signalingState === "have-local-offer") {
                await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: sig.data.sdp }));
                for (const c of pendingCandidatesRef.current) {
                  await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
                }
                pendingCandidatesRef.current = [];
              }
              break;
            }
            case "ice-candidate": {
              const pc = pcRef.current;
              if (pc && pc.remoteDescription) {
                await pc.addIceCandidate(new RTCIceCandidate(sig.data)).catch(() => {});
              } else {
                pendingCandidatesRef.current.push(sig.data);
              }
              break;
            }
            case "hang-up":
              cleanupCall();
              break;
          }
        }
      } catch {}
    };
    const id = setInterval(poll, 1000);
    return () => { alive = false; clearInterval(id); };
  }, [roomId, api, meeting, callState, cleanupCall]);

  // Call duration timer
  useEffect(() => {
    if (callState !== "connected" || !callStartRef.current) return;
    const id = setInterval(() => setCallDuration(Math.floor((Date.now() - callStartRef.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, [callState]);

  // Auto hang-up if meeting is ended
  useEffect(() => {
    if (meeting?.status === "ended" && callState !== "idle") hangUp();
  }, [meeting?.status, callState, hangUp]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pcRef.current) {
        sendSignal("hang-up", {});
        pcRef.current.close();
        pcRef.current = null;
      }
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [sendSignal]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const partnerName = meeting ? (user?.id === meeting.coach_id ? meeting.user_name : meeting.coach_name) : "";
  const partnerAvatar = meeting ? (user?.id === meeting.coach_id ? meeting.user_avatar : meeting.coach_avatar) : "";
  const partnerOnline =
    !!meeting?.presence &&
    (user?.id === meeting.coach_id ? meeting.presence.user_online : meeting.presence.coach_online);

  const startSession = async () => {
    if (!roomId) return;
    await api(`/api/meetings/${roomId}/start`, { method: "PATCH" }).catch(() => {});
    await refreshMeeting().catch(() => {});
  };

  const endSession = async () => {
    if (!roomId) return;
    await api(`/api/meetings/${roomId}/end`, { method: "PATCH" }).catch(() => {});
    setShowEndConfirm(false);
    await refreshMeeting().catch(() => {});
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !roomId) return;
    const text = chatInput.trim();
    setChatInput("");
    await api(`/api/meetings/${roomId}/messages`, {
      method: "POST",
      body: JSON.stringify({ message: text }),
    }).catch(() => {});
    await refreshMeeting().catch(() => {});
  };

  const saveNotes = useCallback(
    async (value: string) => {
      if (!roomId) return;
      setNotesSaving(true);
      await api(`/api/meetings/${roomId}/notes`, {
        method: "PATCH",
        body: JSON.stringify({ notes: value }),
      })
        .then(() => {
          setNotesSaved(true);
          setNotesDirty(false);
          setTimeout(() => setNotesSaved(false), 1800);
        })
        .catch(() => {})
        .finally(() => setNotesSaving(false));
    },
    [api, roomId]
  );

  const handleNotesChange = (value: string) => {
    setNotes(value);
    setNotesDirty(true);
    setNotesSaved(false);
    if (notesSaveTimeoutRef.current) clearTimeout(notesSaveTimeoutRef.current);
    notesSaveTimeoutRef.current = setTimeout(() => {
      saveNotes(value);
    }, 1200);
  };

  const uploadFile = async (file: File) => {
    if (!file || !roomId) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(getApiBase() + `/api/meetings/${roomId}/files`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (r.ok) await refreshMeeting();
    } catch {
      // ignore upload failures in UI
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    if (type?.includes("pdf")) return "📄";
    if (type?.includes("word") || type?.includes("document")) return "📝";
    if (type?.includes("presentation") || type?.includes("powerpoint")) return "📊";
    if (type?.includes("image")) return "🖼️";
    if (type?.includes("spreadsheet") || type?.includes("excel")) return "📈";
    return "📎";
  };

  if (loading) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", backgroundColor: "#0A0A0B" }}>Loading meeting...</div>;
  }

  if (error || !meeting) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, color: "var(--text-muted)", backgroundColor: "#0A0A0B" }}>
        <AlertCircle size={40} strokeWidth={1.5} />
        <p style={{ fontSize: 16 }}>{error || "Meeting not found"}</p>
        <button onClick={navigateBack} style={{ padding: "10px 24px", borderRadius: 10, background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 14 }}>Go Back</button>
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#0A0A0B", color: "var(--text-primary)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", backgroundColor: "var(--bg-card)", borderBottom: "1px solid var(--border)", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <button onClick={navigateBack} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center" }}><ArrowLeft size={20} /></button>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meeting.title}</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--text-muted)", flexWrap: "wrap" }}>
              <span>with {partnerName}</span>
              <span>·</span>
              <span>{meeting.status === "active" ? "🟢 Session Active" : meeting.status === "ended" ? "⚫ Session Ended" : "⏰ Scheduled"}</span>
              <span style={{ color: partnerOnline ? "var(--accent)" : "var(--text-muted)" }}>● {partnerOnline ? "Online" : "Offline"}</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button onClick={() => { setSidePanel("chat"); setUnreadCount(0); }} style={{ padding: "7px 10px", borderRadius: 8, background: sidePanel === "chat" ? "var(--accent-dim)" : "var(--bg-surface)", border: "1px solid var(--border)", color: sidePanel === "chat" ? "var(--accent)" : "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600 }}>
            <MessageSquare size={13} /> Chat{unreadCount > 0 ? ` (${unreadCount})` : ""}
          </button>
          <button onClick={() => setSidePanel("files")} style={{ padding: "7px 10px", borderRadius: 8, background: sidePanel === "files" ? "var(--accent-dim)" : "var(--bg-surface)", border: "1px solid var(--border)", color: sidePanel === "files" ? "var(--accent)" : "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600 }}>
            <Paperclip size={13} /> Files ({files.length})
          </button>
          <button onClick={() => setSidePanel("notes")} style={{ padding: "7px 10px", borderRadius: 8, background: sidePanel === "notes" ? "var(--accent-dim)" : "var(--bg-surface)", border: "1px solid var(--border)", color: sidePanel === "notes" ? "var(--accent)" : "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600 }}>
            <NotebookPen size={13} /> Notes
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div style={{ flex: 1, position: "relative", backgroundColor: callState !== "idle" && callState !== "ringing" ? "#000" : "transparent", overflow: "hidden" }}>
          {/* Remote video / audio playback */}
          <video ref={remoteVideoRef} autoPlay playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", display: callState !== "idle" && callState !== "ringing" ? "block" : "none" }} />
          {/* Local video PIP */}
          <video ref={localVideoRef} autoPlay playsInline muted style={{ position: "absolute", bottom: 80, right: 16, width: 160, height: 120, borderRadius: 12, objectFit: "cover", border: "2px solid rgba(255,255,255,0.2)", backgroundColor: "#111", display: callState !== "idle" && callState !== "ringing" && callMode === "video" ? "block" : "none", zIndex: 10 }} />

          {/* Idle / Ringing: meeting info + call buttons */}
          {(callState === "idle" || callState === "ringing") && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: 20, gap: 16 }}>
              <img src={partnerAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${partnerName}`} alt="" style={{ width: 96, height: 96, borderRadius: "50%", border: "2px solid var(--accent)" }} />
              <h2 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 22, fontWeight: 700, textAlign: "center" }}>{meeting.title}</h2>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", textAlign: "center", maxWidth: 620 }}>
                Coaching session workspace with voice &amp; video calling.
              </p>
              {meeting.scheduled_at && (
                <p style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                  <Clock size={13} /> {new Date(meeting.scheduled_at).toLocaleString()}
                </p>
              )}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                {meeting.status !== "active" && meeting.status !== "ended" && (
                  <button onClick={startSession} style={{ padding: "12px 20px", borderRadius: 12, backgroundColor: "var(--accent)", color: "#0A0A0B", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <Play size={16} /> Start Session
                  </button>
                )}
                {meeting.status === "active" && callState === "idle" && (
                  <>
                    <button onClick={() => startCall("audio")} style={{ padding: "12px 20px", borderRadius: 12, backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--accent)", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <Phone size={16} /> Voice Call
                    </button>
                    <button onClick={() => startCall("video")} style={{ padding: "12px 20px", borderRadius: 12, backgroundColor: "var(--accent)", color: "#0A0A0B", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <VideoIcon size={16} /> Video Call
                    </button>
                    <button onClick={() => setShowEndConfirm(true)} style={{ padding: "12px 20px", borderRadius: 12, backgroundColor: "#EF4444", color: "#fff", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <Square size={16} /> End Session
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Calling: waiting for answer */}
          {callState === "calling" && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 5 }}>
              <img src={partnerAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${partnerName}`} alt="" style={{ width: 96, height: 96, borderRadius: "50%", border: "2px solid var(--accent)", marginBottom: 16 }} />
              <p style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Chakra Petch', sans-serif", color: "#fff" }}>Calling {partnerName}...</p>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>Waiting for answer</p>
            </div>
          )}

          {/* Connected audio-only: show avatar */}
          {callState === "connected" && callMode === "audio" && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 5 }}>
              <img src={partnerAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${partnerName}`} alt="" style={{ width: 96, height: 96, borderRadius: "50%", border: "2px solid var(--accent)", marginBottom: 12 }} />
              <p style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Chakra Petch', sans-serif", color: "#fff" }}>{partnerName}</p>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>Voice Call</p>
            </div>
          )}

          {/* Call duration */}
          {callState === "connected" && (
            <div style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", backgroundColor: "rgba(0,0,0,0.6)", padding: "4px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, color: "#fff", zIndex: 15 }}>
              {formatDuration(callDuration)}
            </div>
          )}

          {/* Call controls bar */}
          {callState !== "idle" && callState !== "ringing" && (
            <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 12, zIndex: 20 }}>
              <button onClick={toggleMute} title={isMuted ? "Unmute" : "Mute"} style={{ width: 48, height: 48, borderRadius: "50%", backgroundColor: isMuted ? "#EF4444" : "rgba(255,255,255,0.15)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              {callMode === "video" && (
                <button onClick={toggleCamera} title={isCameraOff ? "Turn camera on" : "Turn camera off"} style={{ width: 48, height: 48, borderRadius: "50%", backgroundColor: isCameraOff ? "#EF4444" : "rgba(255,255,255,0.15)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {isCameraOff ? <VideoOff size={20} /> : <VideoIcon size={20} />}
                </button>
              )}
              <button onClick={hangUp} title="End call" style={{ width: 48, height: 48, borderRadius: "50%", backgroundColor: "#EF4444", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <PhoneOff size={20} />
              </button>
            </div>
          )}
        </div>

        {sidePanel && (
          <div style={{ width: 360, maxWidth: "85vw", borderInlineStart: "1px solid var(--border)", display: "flex", flexDirection: "column", backgroundColor: "var(--bg-card)", flexShrink: 0 }}>
            {sidePanel === "chat" && (
              <>
                <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", fontFamily: "'Chakra Petch', sans-serif", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                  <MessageSquare size={14} /> Meeting Chat
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  {messages.length === 0 && <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 12, padding: 30 }}>No messages yet.</p>}
                  {messages.map((m, i) => {
                    const isMe = m.userId === String(user?.id);
                    return (
                      <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                        <span style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>{isMe ? "You" : m.user_name}</span>
                        <div style={{ padding: "8px 12px", borderRadius: isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px", maxWidth: "88%", fontSize: 13, lineHeight: 1.5, backgroundColor: isMe ? "var(--accent-dim)" : "var(--bg-surface)", border: "1px solid var(--border)", wordBreak: "break-word" }}>
                          {m.text}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>
                <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
                  <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendChatMessage()} placeholder="Type a message..." className="input-base" style={{ flex: 1, fontSize: 13 }} />
                  <button onClick={sendChatMessage} disabled={!chatInput.trim()} style={{ padding: "8px 12px", borderRadius: 8, background: chatInput.trim() ? "var(--accent)" : "var(--bg-surface)", border: "none", color: chatInput.trim() ? "#0A0A0B" : "var(--text-muted)", cursor: chatInput.trim() ? "pointer" : "default" }}>
                    Send
                  </button>
                </div>
              </>
            )}

            {sidePanel === "files" && (
              <>
                <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", fontFamily: "'Chakra Petch', sans-serif", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Paperclip size={14} /> Shared Files</div>
                  <label style={{ padding: "5px 11px", borderRadius: 7, background: "var(--accent-dim)", border: "1px solid rgba(200,255,0,0.25)", color: "var(--accent)", cursor: uploading ? "wait" : "pointer", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                    <Upload size={12} /> {uploading ? "Uploading..." : "Upload"}
                    <input ref={fileInputRef} type="file" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }} style={{ display: "none" }} disabled={uploading} />
                  </label>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  {files.length === 0 ? (
                    <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                      <FileText size={36} strokeWidth={1} style={{ margin: "0 auto 12px" }} />
                      <p style={{ fontSize: 13, fontWeight: 600 }}>No files shared yet</p>
                    </div>
                  ) : files.map((f) => (
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
              </>
            )}

            {sidePanel === "notes" && (
              <>
                <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", fontFamily: "'Chakra Petch', sans-serif", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}><NotebookPen size={14} /> Session Notes</div>
                  <span style={{ fontSize: 10, color: notesSaved ? "var(--accent)" : notesSaving ? "var(--text-muted)" : "transparent", display: "flex", alignItems: "center", gap: 4 }}>
                    {notesSaving ? "Saving..." : notesSaved ? <><Check size={10} /> Saved</> : ""}
                  </span>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 12 }}>
                  <textarea value={notes} onChange={(e) => handleNotesChange(e.target.value)} placeholder={"Write session notes..."} style={{ flex: 1, padding: 14, borderRadius: 12, border: "1px solid var(--border)", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", fontSize: 13, lineHeight: 1.7, resize: "none", fontFamily: "inherit", outline: "none" }} />
                  <button onClick={() => saveNotes(notes)} style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-secondary)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <Save size={13} /> Save now
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {showEndConfirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.7)", padding: 20 }}>
          <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, maxWidth: 360, width: "100%", textAlign: "center" }}>
            <h3 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>End this session?</h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>The meeting will be marked as ended for both participants.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowEndConfirm(false)} style={{ flex: 1, padding: 11, borderRadius: 10, backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 14 }}>Cancel</button>
              <button onClick={endSession} style={{ flex: 1, padding: 11, borderRadius: 10, backgroundColor: "#EF4444", border: "none", color: "#fff", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>End</button>
            </div>
          </div>
        </div>
      )}

      {/* Incoming call overlay */}
      {incomingOffer && callState === "ringing" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.85)", padding: 20 }}>
          <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 20, padding: 32, maxWidth: 340, width: "100%", textAlign: "center" }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", border: "3px solid var(--accent)", overflow: "hidden", margin: "0 auto 16px" }}>
              <img src={partnerAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${partnerName}`} alt="" style={{ width: "100%", height: "100%" }} />
            </div>
            <h3 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{partnerName}</h3>
            <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 24 }}>
              Incoming {incomingOffer.mode === "video" ? "Video" : "Voice"} Call
            </p>
            <div style={{ display: "flex", gap: 20, justifyContent: "center" }}>
              <button onClick={rejectCall} title="Decline" style={{ width: 56, height: 56, borderRadius: "50%", backgroundColor: "#EF4444", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <PhoneOff size={24} />
              </button>
              <button onClick={acceptCall} title="Accept" style={{ width: 56, height: 56, borderRadius: "50%", backgroundColor: "#22C55E", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Phone size={24} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
