import { getApiBase } from "@/lib/api";
import { useState, useEffect, useRef, useCallback } from "react";
import React from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Heart, MessageCircle, Image as ImageIcon, Plus, Trophy, Calendar, X, Users, Megaphone,
  ExternalLink, UserPlus, UserCheck, Send, Hash, TrendingUp, Trash2, Share2, Eye, EyeOff,
  ChevronDown, Clock, Flame, Award, Target, Sparkles
} from "lucide-react";

/* ───── Interfaces ───── */
interface Post {
  id: number; user_id: number; content: string; media_url: string | null; hashtags: string | null;
  likes: number; created_at: string; user_name: string; user_avatar: string; user_role: string;
  isLiked?: boolean; is_hidden?: number; comments?: Comment[]; comment_count?: number;
  is_announcement?: number; is_pinned?: number;
}
interface Comment {
  id: number; post_id: number; user_id: number; content: string; created_at: string;
  user_name: string; user_avatar: string;
}
interface Challenge {
  id: number; title: string; description: string; image_url: string | null;
  start_date: string; end_date: string; participant_count: number;
  creator_name: string; creator_avatar: string; is_joined?: number;
}
interface SponsoredAd {
  id: number; title: string; description: string; image_url?: string; video_url?: string;
  media_type?: string; coach_name: string; coach_avatar?: string; coach_id?: number;
  cta: string; objective?: string; specialty: string;
}
interface TrendingTag { tag: string; count: number; }

/* ───── Time ago helper ───── */
const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export default function Community() {
  const { user, token } = useAuth();
  const isAdmin = user?.role === "admin";
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => { const h = () => setIsMobile(window.innerWidth < 768); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);

  /* ───── State ───── */
  const [activeTab, setActiveTab] = useState<"feed" | "challenges">("feed");
  const [posts, setPosts] = useState<Post[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [sponsoredAds, setSponsoredAds] = useState<SponsoredAd[]>([]);
  const [trendingTags, setTrendingTags] = useState<TrendingTag[]>([]);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [communityStats, setCommunityStats] = useState<any>(null);
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostHashtags, setNewPostHashtags] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [isCreatingChallenge, setIsCreatingChallenge] = useState(false);
  const [newChallenge, setNewChallenge] = useState({ title: "", description: "", startDate: "", endDate: "" });
  const [commentInputs, setCommentInputs] = useState<{ [k: number]: string }>({});
  const [showComments, setShowComments] = useState<{ [k: number]: boolean }>({});
  const [followedCoaches, setFollowedCoaches] = useState<Set<number>>(new Set());
  const [viewingCoachId, setViewingCoachId] = useState<number | null>(null);
  const [coachProfile, setCoachProfile] = useState<any>(null);
  const [coachPosts, setCoachPosts] = useState<Post[]>([]);
  const [likeAnimating, setLikeAnimating] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* ───── Data fetching ───── */
  const fetchPosts = useCallback(async (tag?: string | null) => {
    try {
      const url = tag ? `/api/community/posts?tag=${encodeURIComponent(tag.replace(/^#/, ""))}` : "/api/community/posts";
      const r = await fetch(getApiBase() + url, { headers: { Authorization: `Bearer ${token}` } });
      setPosts(await r.json());
    } catch {}
  }, [token]);

  const fetchChallenges = useCallback(async () => {
    try {
      const r = await fetch(getApiBase() + "/api/community/challenges", { headers: { Authorization: `Bearer ${token}` } });
      setChallenges(await r.json());
    } catch {}
  }, [token]);

  useEffect(() => {
    if (activeTab === "feed") fetchPosts(activeTag);
    else fetchChallenges();
  }, [activeTab, token, activeTag, fetchPosts, fetchChallenges]);

  useEffect(() => {
    fetch(getApiBase() + "/api/coach/ads/public/community", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => {
        const sAds = d.ads || [];
        setSponsoredAds(sAds);
        if (sAds.length > 0) {
          fetch(getApiBase() + "/api/coach/ads/impressions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ ids: sAds.map((a: any) => a.id) }) }).catch(() => {});
        }
      }).catch(() => {});
    fetch(getApiBase() + "/api/community/posts/trending-tags", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setTrendingTags(Array.isArray(d) ? d : [])).catch(() => {});
    if (isAdmin) {
      fetch(getApiBase() + "/api/community/stats", { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(d => setCommunityStats(d)).catch(() => {});
    }
  }, [token, isAdmin]);

  /* ───── Actions ───── */
  const createPost = async () => {
    if (!newPostContent.trim() && !selectedFile) return;
    setIsPosting(true);
    try {
      if (selectedFile) {
        const fd = new FormData();
        fd.append("media", selectedFile);
        fd.append("content", newPostContent);
        fd.append("hashtags", newPostHashtags);
        await fetch(getApiBase() + "/api/community/posts", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      } else {
        await fetch(getApiBase() + "/api/community/posts", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ content: newPostContent, hashtags: newPostHashtags }) });
      }
      setNewPostContent(""); setNewPostHashtags(""); setSelectedFile(null); setFilePreview(null); setShowComposer(false);
      fetchPosts(activeTag);
    } catch {}
    setIsPosting(false);
  };

  const deletePost = async (postId: number) => {
    if (!confirm(isAdmin ? "Hide this post from the community?" : "Delete this post permanently?")) return;
    try {
      await fetch(getApiBase() + `/api/community/posts/${postId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      fetchPosts(activeTag);
    } catch {}
  };

  const toggleLike = async (postId: number) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    setLikeAnimating(prev => new Set([...prev, postId]));
    setTimeout(() => setLikeAnimating(prev => { const s = new Set(prev); s.delete(postId); return s; }), 400);
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: p.isLiked ? p.likes - 1 : p.likes + 1, isLiked: !p.isLiked } : p));
    try {
      if (post.isLiked) {
        await fetch(getApiBase() + `/api/community/posts/${postId}/like`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      } else {
        await fetch(getApiBase() + `/api/community/posts/${postId}/like`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      }
    } catch {}
  };

  const addComment = async (postId: number) => {
    const content = commentInputs[postId];
    if (!content?.trim()) return;
    try {
      await fetch(getApiBase() + `/api/community/posts/${postId}/comments`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ content }) });
      setCommentInputs(prev => ({ ...prev, [postId]: "" }));
      fetchPosts(activeTag);
    } catch {}
  };

  const createChallenge = async () => {
    if (!newChallenge.title.trim()) return;
    try {
      await fetch(getApiBase() + "/api/community/challenges", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ title: newChallenge.title, description: newChallenge.description, startDate: newChallenge.startDate, endDate: newChallenge.endDate }) });
      setIsCreatingChallenge(false); setNewChallenge({ title: "", description: "", startDate: "", endDate: "" });
      fetchChallenges();
    } catch {}
  };

  const joinChallenge = async (id: number) => {
    try {
      await fetch(getApiBase() + `/api/community/challenges/${id}/join`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      fetchChallenges();
    } catch {}
  };

  const toggleFollowCoach = async (coachId: number) => {
    const isFollowing = followedCoaches.has(coachId);
    try {
      if (isFollowing) {
        await fetch(getApiBase() + `/api/coach/follow/${coachId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        setFollowedCoaches(prev => { const s = new Set(prev); s.delete(coachId); return s; });
      } else {
        await fetch(getApiBase() + `/api/coach/follow/${coachId}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
        setFollowedCoaches(prev => new Set([...prev, coachId]));
      }
    } catch {}
  };

  const viewCoachProfile = async (userId: number, userName: string, userAvatar: string) => {
    setViewingCoachId(userId);
    setCoachProfile({ name: userName, avatar: userAvatar });
    try {
      const fsRes = await fetch(getApiBase() + `/api/coach/follow/${userId}/status`, { headers: { Authorization: `Bearer ${token}` } });
      if (fsRes.ok) { const fd = await fsRes.json(); if (fd.following) setFollowedCoaches(prev => new Set([...prev, userId])); }
      const pRes = await fetch(getApiBase() + `/api/coach/profile/${userId}/posts`, { headers: { Authorization: `Bearer ${token}` } });
      if (pRes.ok) { const pd = await pRes.json(); setCoachPosts(pd.posts || []); }
      const sRes = await fetch(getApiBase() + `/api/coach/profile/${userId}/stats`, { headers: { Authorization: `Bearer ${token}` } });
      if (sRes.ok) { const sd = await sRes.json(); setCoachProfile((p: any) => ({ ...p, ...sd, name: userName, avatar: userAvatar })); }
    } catch {}
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (file) { const reader = new FileReader(); reader.onload = (ev) => setFilePreview(ev.target?.result as string); reader.readAsDataURL(file); }
    else setFilePreview(null);
  };

  const handleTagClick = (tag: string) => {
    const clean = tag.replace(/^#/, "");
    if (activeTag === clean) { setActiveTag(null); }
    else { setActiveTag(clean); setActiveTab("feed"); }
  };

  /* ───── Feed building ───── */
  const feedItems: { type: "post" | "ad"; data: any }[] = [];
  let adIdx = 0;
  if (sponsoredAds.length > 0) feedItems.push({ type: "ad", data: sponsoredAds[adIdx++] });
  posts.forEach((p, i) => {
    feedItems.push({ type: "post", data: p });
    if (adIdx < sponsoredAds.length && (i + 1) % 4 === 0) {
      feedItems.push({ type: "ad", data: sponsoredAds[adIdx++] });
    }
  });

  /* ───── Styles ───── */
  const inputStyle: React.CSSProperties = {
    backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12,
    padding: "10px 14px", width: "100%", fontSize: 13, color: "var(--text-primary)",
    fontFamily: "'Outfit', sans-serif", outline: "none", transition: "border-color 0.2s",
  };
  const cardStyle: React.CSSProperties = {
    backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20,
    overflow: "hidden", transition: "transform 0.2s, box-shadow 0.2s",
  };
  const pillBtn = (active: boolean, _color = "var(--accent)"): React.CSSProperties => ({
    padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, border: "none",
    cursor: "pointer", transition: "all 0.2s",
    backgroundColor: active ? _color : "var(--bg-surface)",
    color: active ? "#0A0A0B" : "var(--text-secondary)",
    fontFamily: active ? "'Chakra Petch', sans-serif" : "'Outfit', sans-serif",
  });

  /* ──────────────────────────── RENDER ──────────────────────────── */
  return (
    <div style={{ padding: isMobile ? "16px 10px 80px" : "24px 20px 80px", maxWidth: 680, margin: "0 auto" }}>

      {/* ── Header ── */}
      <div className="fade-up" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h1 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: "clamp(22px, 5vw, 28px)", fontWeight: 800, letterSpacing: "-0.02em" }}>
              Community
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
              Share your fitness journey
            </p>
          </div>
          <div style={{ display: "flex", gap: 6, backgroundColor: "var(--bg-surface)", padding: 4, borderRadius: 14, border: "1px solid var(--border)" }}>
            {(["feed", "challenges"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                padding: "8px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, border: "none",
                cursor: "pointer", transition: "all 0.2s",
                backgroundColor: activeTab === tab ? "var(--accent)" : "transparent",
                color: activeTab === tab ? "#0A0A0B" : "var(--text-secondary)",
                fontFamily: activeTab === tab ? "'Chakra Petch', sans-serif" : "inherit",
              }}>
                {tab === "feed" ? "Feed" : "Challenges"}
              </button>
            ))}
          </div>
        </div>

        {/* Admin stats bar */}
        {isAdmin && communityStats && (
          <div style={{
            display: "flex", gap: 8, flexWrap: "wrap", padding: "10px 14px", borderRadius: 12,
            background: "linear-gradient(135deg, rgba(200,255,0,0.06), rgba(59,139,255,0.06))",
            border: "1px solid rgba(200,255,0,0.15)",
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 4, marginRight: 8 }}>
              <Eye size={11} /> Admin
            </span>
            {[
              { v: communityStats.total_posts, l: "Posts" },
              { v: communityStats.total_likes, l: "Likes" },
              { v: communityStats.total_comments, l: "Comments" },
              { v: communityStats.total_challenges, l: "Challenges" },
              { v: communityStats.active_users, l: "Active" },
            ].map(s => (
              <span key={s.l} style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 3 }}>
                <strong style={{ color: "var(--text-primary)", fontFamily: "'Chakra Petch', sans-serif" }}>{s.v || 0}</strong> {s.l}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Trending Tags ── */}
      {trendingTags.length > 0 && activeTab === "feed" && (
        <div className="fade-up-1" style={{ marginBottom: 16, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <TrendingUp size={13} color="var(--accent)" style={{ flexShrink: 0 }} />
          {activeTag && (
            <button onClick={() => { setActiveTag(null); }} style={{ ...pillBtn(true), padding: "5px 10px", fontSize: 11 }}>
              All <X size={10} style={{ marginLeft: 2 }} />
            </button>
          )}
          {trendingTags.slice(0, 8).map(t => (
            <button key={t.tag} onClick={() => handleTagClick(t.tag)} style={{ ...pillBtn(activeTag === t.tag.replace(/^#/, "")), padding: "5px 12px", fontSize: 11 }}>
              {t.tag}
            </button>
          ))}
        </div>
      )}

      {/* ════════════════════ FEED TAB ════════════════════ */}
      {activeTab === "feed" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* ── Compose area ── */}
          <div className="fade-up-2" style={{ ...cardStyle, padding: showComposer ? "18px" : "12px 18px" }}>
            {!showComposer ? (
              <div
                onClick={() => { setShowComposer(true); setTimeout(() => textareaRef.current?.focus(), 100); }}
                style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
              >
                <img src={user?.avatar} alt="Me" style={{ width: 38, height: 38, borderRadius: "50%", border: "2px solid var(--border)", flexShrink: 0 }} />
                <div style={{ flex: 1, padding: "10px 16px", borderRadius: 24, backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", fontSize: 13, color: "var(--text-muted)" }}>
                  What's on your mind, {user?.name?.split(" ")[0] || "Athlete"}?
                </div>
                <ImageIcon size={18} color="var(--accent)" />
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                  <img src={user?.avatar} alt="Me" style={{ width: 38, height: 38, borderRadius: "50%", border: "2px solid var(--border)", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{user?.name}</p>
                    <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Posting to Community</p>
                  </div>
                  <button onClick={() => { setShowComposer(false); setSelectedFile(null); setFilePreview(null); }} style={{ width: 30, height: 30, borderRadius: 8, background: "var(--bg-surface)", border: "1px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                    <X size={14} />
                  </button>
                </div>
                <textarea
                  ref={textareaRef}
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="Share a workout win, milestone, or tip…"
                  rows={3}
                  style={{ ...inputStyle, resize: "none", borderRadius: 14, marginBottom: 10, fontSize: 14, lineHeight: 1.6 }}
                />
                {filePreview && (
                  <div style={{ position: "relative", marginBottom: 10, borderRadius: 14, overflow: "hidden", border: "1px solid var(--border)" }}>
                    <img src={filePreview} alt="Preview" style={{ width: "100%", maxHeight: 200, objectFit: "cover", display: "block" }} />
                    <button onClick={() => { setSelectedFile(null); setFilePreview(null); }} style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.6)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                      <X size={14} />
                    </button>
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
                    <Hash size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                    <input value={newPostHashtags} onChange={e => setNewPostHashtags(e.target.value)} placeholder="#fitness #progress" style={{ ...inputStyle, padding: "7px 10px", borderRadius: 10, fontSize: 12 }} />
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: "none" }} accept="image/*,video/*" />
                  <button onClick={() => fileInputRef.current?.click()} title="Add photo" style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: selectedFile ? "var(--accent)" : "var(--text-muted)", transition: "color 0.2s" }}>
                    <ImageIcon size={16} />
                  </button>
                  <button
                    onClick={createPost}
                    disabled={isPosting || (!newPostContent.trim() && !selectedFile)}
                    style={{
                      padding: "8px 20px", borderRadius: 10, border: "none", cursor: "pointer",
                      background: (!newPostContent.trim() && !selectedFile) ? "var(--bg-surface)" : "var(--accent)",
                      color: (!newPostContent.trim() && !selectedFile) ? "var(--text-muted)" : "#0A0A0B",
                      fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 13,
                      display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s",
                      opacity: isPosting ? 0.6 : 1,
                    }}
                  >
                    {isPosting ? "Posting…" : <><Send size={13} /> Post</>}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* ── Empty state ── */}
          {feedItems.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)" }}>
              <Sparkles size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
              <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, color: "var(--text-secondary)" }}>
                {activeTag ? `No posts found for #${activeTag}` : "No posts yet"}
              </p>
              <p style={{ fontSize: 13 }}>Be the first to share something!</p>
            </div>
          )}

          {/* ── Feed items ── */}
          {feedItems.map((item, idx) =>
            item.type === "ad"
              ? <div key={`ad-${item.data.id}-${idx}`}><SponsoredAdCard ad={item.data} token={token} /></div>
              : <div key={`post-${item.data.id}`}><PostCard
                  post={item.data}
                  user={user}
                  isAdmin={isAdmin}
                  token={token}
                  isLikeAnimating={likeAnimating.has(item.data.id)}
                  showComments={!!showComments[item.data.id]}
                  commentInput={commentInputs[item.data.id] || ""}
                  followedCoaches={followedCoaches}
                  onLike={() => toggleLike(item.data.id)}
                  onDelete={() => deletePost(item.data.id)}
                  onToggleComments={() => setShowComments(p => ({ ...p, [item.data.id]: !p[item.data.id] }))}
                  onCommentChange={(v) => setCommentInputs(p => ({ ...p, [item.data.id]: v }))}
                  onAddComment={() => addComment(item.data.id)}
                  onFollowCoach={(id) => toggleFollowCoach(id)}
                  onViewCoach={(id, name, avatar) => viewCoachProfile(id, name, avatar)}
                  onTagClick={handleTagClick}
                  idx={idx}
                /></div>
          )}
        </div>
      )}

      {/* ════════════════════ CHALLENGES TAB ════════════════════ */}
      {activeTab === "challenges" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <button
            onClick={() => setIsCreatingChallenge(true)}
            className="fade-up-1"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 14,
              borderRadius: 16, cursor: "pointer", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700,
              fontSize: 14, border: "2px dashed rgba(200,255,0,0.3)", color: "var(--accent)",
              background: "linear-gradient(135deg, rgba(200,255,0,0.04), rgba(200,255,0,0.08))",
              transition: "all 0.2s",
            }}
          >
            <Plus size={18} /> Start a Challenge
          </button>

          {challenges.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)" }}>
              <Trophy size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
              <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, color: "var(--text-secondary)" }}>No challenges yet</p>
              <p style={{ fontSize: 13 }}>Create the first one and challenge the community!</p>
            </div>
          )}

          {challenges.map((ch, idx) => {
            const now = Date.now();
            const start = new Date(ch.start_date).getTime();
            const end = new Date(ch.end_date).getTime();
            const isActive = now >= start && now <= end;
            const isUpcoming = now < start;
            const isEnded = now > end;
            const progress = isActive ? Math.min(100, Math.round(((now - start) / (end - start)) * 100)) : isEnded ? 100 : 0;

            return (
              <div key={ch.id} className={`fade-up-${Math.min(idx + 1, 4)}`} style={{ ...cardStyle, position: "relative" }}>
                <div style={{
                  position: "absolute", top: 12, right: 12, zIndex: 2, padding: "3px 10px", borderRadius: 20,
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
                  fontFamily: "'Chakra Petch', sans-serif",
                  backgroundColor: isActive ? "rgba(200,255,0,0.9)" : isUpcoming ? "rgba(59,139,255,0.9)" : "rgba(255,100,100,0.8)",
                  color: isActive ? "#0A0A0B" : "#fff",
                }}>
                  {isActive ? "ACTIVE" : isUpcoming ? "UPCOMING" : "ENDED"}
                </div>
                {ch.image_url && (
                  <div style={{ height: 140, overflow: "hidden", position: "relative" }}>
                    <img src={ch.image_url} alt={ch.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 40%, rgba(0,0,0,0.6))" }} />
                  </div>
                )}
                <div style={{ padding: "16px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: isActive ? "rgba(200,255,0,0.12)" : "rgba(59,139,255,0.1)" }}>
                      {isActive ? <Flame size={18} color="var(--accent)" /> : isUpcoming ? <Target size={18} color="var(--blue)" /> : <Award size={18} color="var(--text-muted)" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 15, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ch.title}</h3>
                      <p style={{ fontSize: 11, color: "var(--text-muted)" }}>by {ch.creator_name}</p>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 12 }}>
                    {ch.description && ch.description.length > 120 ? ch.description.slice(0, 120) + "…" : ch.description}
                  </p>

                  {(isActive || isEnded) && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>
                        <span>{new Date(ch.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        <span>{progress}%</span>
                        <span>{new Date(ch.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 2, backgroundColor: "var(--bg-surface)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${progress}%`, borderRadius: 2, backgroundColor: isActive ? "var(--accent)" : "var(--text-muted)", transition: "width 0.5s ease" }} />
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", gap: 14, fontSize: 12, color: "var(--text-muted)" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Users size={13} /> {ch.participant_count}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar size={13} /> {new Date(ch.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    </div>
                    {!isEnded && (
                      <button
                        onClick={() => joinChallenge(ch.id)}
                        disabled={!!ch.is_joined}
                        style={{
                          padding: "8px 18px", borderRadius: 10, fontFamily: "'Chakra Petch', sans-serif",
                          fontWeight: 700, fontSize: 12, border: "none", cursor: ch.is_joined ? "default" : "pointer",
                          backgroundColor: ch.is_joined ? "rgba(200,255,0,0.1)" : "var(--accent)",
                          color: ch.is_joined ? "var(--accent)" : "#0A0A0B",
                          transition: "all 0.2s", display: "flex", alignItems: "center", gap: 5,
                        }}
                      >
                        {ch.is_joined ? <><UserCheck size={13} /> Joined</> : "Join Challenge"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ════════════════ CREATE CHALLENGE MODAL ════════════════ */}
      {isCreatingChallenge && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsCreatingChallenge(false); }}>
          <div style={{ width: "100%", maxWidth: 440, backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 24, padding: "24px", maxHeight: "90dvh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Trophy size={18} color="var(--accent)" />
                <h4 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 17, fontWeight: 700 }}>New Challenge</h4>
              </div>
              <button onClick={() => setIsCreatingChallenge(false)} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
                <X size={15} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { key: "title", label: "Challenge Title", type: "text", ph: "30-Day Step Challenge" },
                { key: "description", label: "Description", type: "textarea", ph: "What's the goal? Rules? Prizes?" },
                { key: "startDate", label: "Start Date", type: "date", ph: "" },
                { key: "endDate", label: "End Date", type: "date", ph: "" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>{f.label}</label>
                  {f.type === "textarea" ? (
                    <textarea rows={3} value={(newChallenge as any)[f.key]} onChange={e => setNewChallenge(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.ph} style={{ ...inputStyle, resize: "none", borderRadius: 14 }} />
                  ) : (
                    <input type={f.type} value={(newChallenge as any)[f.key]} onChange={e => setNewChallenge(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.ph} style={{ ...inputStyle, borderRadius: 14 }} />
                  )}
                </div>
              ))}
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button onClick={() => setIsCreatingChallenge(false)} style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 14, fontWeight: 500 }}>
                  Cancel
                </button>
                <button onClick={createChallenge} style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: "var(--accent)", color: "#0A0A0B", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer" }}>
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ COACH PROFILE MODAL ════════════════ */}
      {viewingCoachId !== null && coachProfile && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) { setViewingCoachId(null); setCoachProfile(null); setCoachPosts([]); } }}>
          <div style={{ width: "100%", maxWidth: 600, backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "24px 24px 0 0", padding: "24px", maxHeight: "85dvh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 17, fontWeight: 700 }}>Coach Profile</h3>
              <button onClick={() => { setViewingCoachId(null); setCoachProfile(null); setCoachPosts([]); }} style={{ width: 32, height: 32, borderRadius: 10, background: "var(--bg-surface)", border: "1px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                <X size={15} />
              </button>
            </div>
            <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 20 }}>
              <img src={coachProfile.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${viewingCoachId}`} alt={coachProfile.name} style={{ width: 64, height: 64, borderRadius: "50%", border: "3px solid var(--blue)" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 17, fontWeight: 700, marginBottom: 6 }}>{coachProfile.name}</h4>
                <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--text-muted)", flexWrap: "wrap" }}>
                  {coachProfile.followers !== undefined && <span>👥 {coachProfile.followers}</span>}
                  {coachProfile.posts !== undefined && <span>📝 {coachProfile.posts}</span>}
                  {coachProfile.athletes !== undefined && <span>🏋️ {coachProfile.athletes}</span>}
                  {coachProfile.avgRating !== undefined && <span>⭐ {coachProfile.avgRating}</span>}
                </div>
              </div>
              <button onClick={() => toggleFollowCoach(viewingCoachId)} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 24,
                fontWeight: 700, fontSize: 13, cursor: "pointer",
                border: `2px solid ${followedCoaches.has(viewingCoachId) ? "var(--accent)" : "var(--blue)"}`,
                background: followedCoaches.has(viewingCoachId) ? "rgba(200,255,0,0.1)" : "rgba(59,139,255,0.1)",
                color: followedCoaches.has(viewingCoachId) ? "var(--accent)" : "var(--blue)",
                fontFamily: "'Chakra Petch', sans-serif",
              }}>
                {followedCoaches.has(viewingCoachId) ? <><UserCheck size={14} /> Following</> : <><UserPlus size={14} /> Follow</>}
              </button>
            </div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Posts</p>
            {coachPosts.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: 32 }}>No posts yet</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {coachPosts.map(post => (
                  <div key={post.id} style={{ backgroundColor: "var(--bg-surface)", borderRadius: 14, overflow: "hidden", border: "1px solid var(--border)" }}>
                    {post.media_url && <img src={post.media_url} alt="Post" style={{ width: "100%", maxHeight: 200, objectFit: "cover" }} />}
                    <div style={{ padding: "12px 14px" }}>
                      <p style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6, marginBottom: 6 }}>{post.content}</p>
                      {post.hashtags && <p style={{ fontSize: 11, color: "var(--accent)" }}>{post.hashtags}</p>}
                      <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
                        <span>❤️ {post.likes}</span>
                        <span>{timeAgo(post.created_at)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ════════════════════════════════════════════════════════════ */

function SponsoredAdCard({ ad, token }: { ad: SponsoredAd; token: string | null }) {
  return (
    <div style={{
      backgroundColor: "var(--bg-card)", border: "1px solid rgba(59,139,255,0.25)", borderRadius: 20,
      overflow: "hidden", position: "relative",
    }}>
      <div style={{
        position: "absolute", top: 10, right: 10, zIndex: 2, backgroundColor: "rgba(59,139,255,0.85)",
        borderRadius: 20, padding: "3px 10px", fontSize: 10, fontWeight: 700, color: "#fff",
        fontFamily: "'Chakra Petch', sans-serif", letterSpacing: "0.06em",
      }}>
        SPONSORED
      </div>
      {ad.media_type === "video" && ad.video_url ? (
        <video src={ad.video_url} controls style={{ width: "100%", maxHeight: 280, display: "block", backgroundColor: "#000" }} />
      ) : ad.image_url ? (
        <img src={ad.image_url} alt={ad.title} style={{ width: "100%", maxHeight: 280, objectFit: "cover", display: "block" }} />
      ) : null}
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <img src={ad.coach_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${ad.coach_name}`} alt={ad.coach_name} style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: "var(--bg-surface)", border: "2px solid rgba(59,139,255,0.2)" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Chakra Petch', sans-serif" }}>{ad.title}</p>
            <p style={{ fontSize: 12, color: "var(--blue)" }}>{ad.coach_name} · {ad.specialty}</p>
          </div>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65, marginBottom: 12 }}>{ad.description}</p>
        <a
          href={`/app/coaching?coach=${ad.coach_id}`}
          onClick={() => fetch(getApiBase() + `/api/coach/ads/${ad.id}/click`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {})}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 16px",
            borderRadius: 12, backgroundColor: "var(--blue)", color: "#fff", fontSize: 13, fontWeight: 700,
            fontFamily: "'Chakra Petch', sans-serif", textDecoration: "none", transition: "opacity 0.2s",
          }}
        >
          {ad.cta || "Learn More"} <ExternalLink size={13} />
        </a>
      </div>
    </div>
  );
}

interface PostCardProps {
  post: Post; user: any; isAdmin: boolean; token: string | null;
  isLikeAnimating: boolean; showComments: boolean; commentInput: string;
  followedCoaches: Set<number>;
  onLike: () => void; onDelete: () => void; onToggleComments: () => void;
  onCommentChange: (v: string) => void; onAddComment: () => void;
  onFollowCoach: (id: number) => void;
  onViewCoach: (id: number, name: string, avatar: string) => void;
  onTagClick: (tag: string) => void;
  idx: number;
}

function PostCard({
  post, user, isAdmin, token, isLikeAnimating, showComments, commentInput,
  followedCoaches, onLike, onDelete, onToggleComments, onCommentChange, onAddComment,
  onFollowCoach, onViewCoach, onTagClick, idx,
}: PostCardProps) {
  const canDelete = post.user_id === user?.id || isAdmin;
  const isCoach = post.user_role === "coach";
  const isHidden = post.is_hidden === 1;

  const renderHashtags = (tags: string) => {
    const parts = tags.match(/#[\w\u0600-\u06FF]+/g) || [];
    return parts.map((t, i) => (
      <button key={i} onClick={() => onTagClick(t)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 12, color: "var(--accent)", fontWeight: 600, marginRight: 6 }}>
        {t}
      </button>
    ));
  };

  return (
    <div className={`fade-up-${Math.min((idx % 5) + 1, 4)}`} style={{
      backgroundColor: "var(--bg-card)", border: `1px solid ${post.is_announcement ? "rgba(59,139,255,0.3)" : "var(--border)"}`, borderRadius: 20,
      overflow: "hidden", opacity: isHidden ? 0.5 : 1, transition: "opacity 0.3s",
    }}>
      <div style={{ padding: "16px 18px 10px" }}>
        {/* Pinned / Announcement banner */}
        {(post.is_pinned || post.is_announcement) ? (
          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
            {post.is_pinned ? <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 20, background: "rgba(200,255,0,0.1)", color: "var(--accent)", fontWeight: 700, border: "1px solid rgba(200,255,0,0.25)" }}>📌 Pinned</span> : null}
            {post.is_announcement ? <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 20, background: "rgba(59,139,255,0.1)", color: "var(--blue)", fontWeight: 700, border: "1px solid rgba(59,139,255,0.25)" }}>📢 Announcement</span> : null}
          </div>
        ) : null}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <img
            src={post.user_avatar} alt={post.user_name}
            style={{
              width: 40, height: 40, borderRadius: "50%", cursor: isCoach ? "pointer" : "default",
              border: isCoach ? "2px solid var(--blue)" : "2px solid var(--border)",
              transition: "transform 0.2s",
            }}
            onClick={() => { if (isCoach) onViewCoach(post.user_id, post.user_name, post.user_avatar); }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <p
                style={{ fontSize: 14, fontWeight: 700, cursor: isCoach ? "pointer" : "default", color: isCoach ? "var(--blue)" : "var(--text-primary)", fontFamily: "'Chakra Petch', sans-serif" }}
                onClick={() => { if (isCoach) onViewCoach(post.user_id, post.user_name, post.user_avatar); }}
              >
                {post.user_name}
              </p>
              {isCoach && (
                <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 20, backgroundColor: "rgba(59,139,255,0.1)", color: "var(--blue)", border: "1px solid rgba(59,139,255,0.15)", fontWeight: 700, letterSpacing: "0.04em" }}>COACH</span>
              )}
              {isHidden && (
                <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 20, backgroundColor: "rgba(255,100,100,0.1)", color: "#f66", fontWeight: 700 }}>HIDDEN</span>
              )}
            </div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
              <Clock size={10} /> {timeAgo(post.created_at)}
            </p>
          </div>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {isCoach && post.user_id !== user?.id && (
              <button onClick={() => onFollowCoach(post.user_id)} style={{
                display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 20,
                fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
                border: `1px solid ${followedCoaches.has(post.user_id) ? "var(--accent)" : "var(--border)"}`,
                background: followedCoaches.has(post.user_id) ? "rgba(200,255,0,0.1)" : "var(--bg-surface)",
                color: followedCoaches.has(post.user_id) ? "var(--accent)" : "var(--text-secondary)",
              }}>
                {followedCoaches.has(post.user_id) ? <><UserCheck size={11} /></> : <><UserPlus size={11} /> Follow</>}
              </button>
            )}
            {canDelete && (
              <button onClick={onDelete} title={isAdmin && post.user_id !== user?.id ? "Hide post" : "Delete post"} style={{
                width: 30, height: 30, borderRadius: 8, background: "none", border: "none",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--text-muted)", transition: "color 0.2s",
              }}>
                {isAdmin && post.user_id !== user?.id ? <EyeOff size={14} /> : <Trash2 size={14} />}
              </button>
            )}
          </div>
        </div>

        <p style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.7, marginBottom: 6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {post.content}
        </p>
        {post.hashtags && (
          <div style={{ display: "flex", flexWrap: "wrap", marginBottom: 4 }}>
            {renderHashtags(post.hashtags)}
          </div>
        )}
      </div>

      {post.media_url && (
        <div style={{ overflow: "hidden" }}>
          <img src={post.media_url} alt="Post media" style={{ width: "100%", maxHeight: 400, objectFit: "cover", display: "block" }} />
        </div>
      )}

      <div style={{ padding: "8px 18px 10px", display: "flex", gap: 4 }}>
        <button onClick={onLike} style={{
          display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600,
          color: post.isLiked ? "#f44" : "var(--text-secondary)",
          background: "none", border: "none", cursor: "pointer", padding: "8px 12px",
          borderRadius: 10, transition: "background-color 0.15s",
        }}>
          <Heart
            size={18}
            style={{
              fill: post.isLiked ? "#f44" : "none",
              transition: "transform 0.3s",
              transform: isLikeAnimating ? "scale(1.3)" : "scale(1)",
            }}
          />
          {post.likes > 0 && post.likes}
        </button>
        <button onClick={onToggleComments} style={{
          display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600,
          color: showComments ? "var(--blue)" : "var(--text-secondary)",
          background: "none", border: "none", cursor: "pointer", padding: "8px 12px",
          borderRadius: 10, transition: "background-color 0.15s",
        }}>
          <MessageCircle size={18} style={{ fill: showComments ? "rgba(59,139,255,0.15)" : "none" }} />
          {(post.comments?.length || post.comment_count || 0) > 0 && (post.comments?.length || post.comment_count || 0)}
        </button>
      </div>

      {showComments && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "12px 18px 14px" }}>
          {(post.comments || []).map(c => (
            <div key={c.id} style={{ display: "flex", gap: 10, padding: "8px 0" }}>
              <img src={c.user_avatar} alt={c.user_name} style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, border: "1px solid var(--border)" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{c.user_name}</span>
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{timeAgo(c.created_at)}</span>
                </div>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, wordBreak: "break-word" }}>{c.content}</p>
              </div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
            <img src={user?.avatar} alt="Me" style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, border: "1px solid var(--border)" }} />
            <input
              value={commentInput}
              onChange={e => onCommentChange(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") onAddComment(); }}
              placeholder="Write a comment…"
              style={{
                flex: 1, backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)",
                borderRadius: 24, padding: "8px 14px", fontSize: 13, color: "var(--text-primary)",
                fontFamily: "'Outfit', sans-serif", outline: "none",
              }}
            />
            <button onClick={onAddComment} disabled={!commentInput.trim()} style={{
              width: 34, height: 34, borderRadius: "50%", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              backgroundColor: commentInput.trim() ? "var(--accent)" : "var(--bg-surface)",
              color: commentInput.trim() ? "#0A0A0B" : "var(--text-muted)",
              transition: "all 0.2s",
            }}>
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
