import { getApiBase } from "@/lib/api";
import { Dumbbell, Lock, PlayCircle, Clock, Crown, X, Search, Filter, Video, ExternalLink, ListVideo, Clapperboard, ChevronLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "@/context/I18nContext";

interface WorkoutVideo {
  id: number;
  title: string;
  description: string;
  url: string;
  duration: string;
  category: string;
  is_premium: number;
  thumbnail: string;
  created_at: string;
  is_short?: number;
}

interface Playlist {
  id: number;
  title: string;
  description: string;
  thumbnail: string;
  creator_name: string;
  video_count: number;
}

const categoryColors: Record<string, string> = {
  "HIIT": "var(--red)",
  "Strength": "var(--blue)",
  "Cardio": "var(--accent)",
  "Yoga": "var(--cyan)",
  "Mobility": "var(--amber)",
  "General": "var(--text-secondary)",
};

export default function Workouts() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => { const h = () => setIsMobile(window.innerWidth < 768); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  const [videos, setVideos] = useState<WorkoutVideo[]>([]);
  const [allVideos, setAllVideos] = useState<WorkoutVideo[]>([]);
  const [shorties, setShorties] = useState<WorkoutVideo[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistVideos, setPlaylistVideos] = useState<WorkoutVideo[]>([]);
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [myPlan, setMyPlan] = useState<any>(null);
  const [view, setView] = useState<"videos" | "playlists" | "shorties" | "my-plan">("videos");
  const [playing, setPlaying] = useState<WorkoutVideo | null>(null);
  const [pointsMsg, setPointsMsg] = useState<string>("");

  // Anti-cheat state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasSeeked, setHasSeeked] = useState(false);
  const [hasSpeedChanged, setHasSpeedChanged] = useState(false);
  const [watchProgress, setWatchProgress] = useState(0);
  const lastTimeRef = useRef(0);

  const closePlayer = useCallback(() => {
    setPlaying(null);
    setHasSeeked(false);
    setHasSpeedChanged(false);
    setWatchProgress(0);
    lastTimeRef.current = 0;
  }, []);

  const handleVideoEnded = useCallback(async (video: WorkoutVideo) => {
    const vid = videoRef.current;
    if (!vid) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(getApiBase() + `/api/workouts/videos/${video.id}/watched`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          watchedDuration: vid.duration,
          videoDuration: vid.duration,
          seeked: hasSeeked,
          speedChanged: hasSpeedChanged,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.points > 0) {
          setPointsMsg("🎉 +2 points for watching!");
          setTimeout(() => setPointsMsg(""), 3000);
        }
      }
    } catch {}
  }, [hasSeeked, hasSpeedChanged]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setLoading(true);

    Promise.all([
      fetch(getApiBase() + "/api/workouts/videos", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(getApiBase() + "/api/workouts/playlists", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(getApiBase() + "/api/workouts/shorties", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(getApiBase() + "/api/workouts/my-plan", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([vData, pData, sData, planData]) => {
      setAllVideos(vData.videos || []);
      setVideos(vData.videos || []);
      setPlaylists(pData.playlists || []);
      setShorties(sData.videos || []);
      setMyPlan(planData || null);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let filtered = allVideos;
    if (catFilter !== "All") filtered = filtered.filter(v => v.category === catFilter);
    if (search.trim()) filtered = filtered.filter(v => v.title.toLowerCase().includes(search.toLowerCase()) || v.description?.toLowerCase().includes(search.toLowerCase()));
    setVideos(filtered);
  }, [search, catFilter, allVideos]);

  const loadPlaylistVideos = async (pl: Playlist) => {
    setActivePlaylist(pl);
    const token = localStorage.getItem("token");
    try {
      const r = await fetch(getApiBase() + `/api/workouts/playlists/${pl.id}/videos`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      setPlaylistVideos(d.videos || []);
    } catch { setPlaylistVideos([]); }
  };

  const categories = ["All", ...Array.from(new Set(allVideos.map(v => v.category).filter(Boolean)))];

  const getVideoEmbedUrl = (url: string): string | null => {
    if (!url) return null;
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    if (url.match(/\.(mp4|webm|ogg)$/i)) return url;
    return null;
  };

  const isDirectVideo = (url: string) => url?.match(/\.(mp4|webm|ogg)$/i);

  const renderVideoCard = (video: WorkoutVideo, isShort = false) => {
    const isPremiumLocked = Boolean(video.is_premium) && !user?.isPremium;
    const catColor = categoryColors[video.category] || "var(--text-secondary)";
    return (
      <div key={video.id} style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ position: "relative", height: isShort ? 220 : 160, backgroundColor: "var(--bg-surface)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {video.thumbnail ? (
            <img src={video.thumbnail} alt={video.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, var(--bg-card) 0%, var(--bg-surface) 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {isShort ? <Clapperboard size={40} color="var(--text-muted)" /> : <Video size={40} color="var(--text-muted)" />}
            </div>
          )}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(10,10,11,0.7) 0%, transparent 50%)" }} />
          {Boolean(video.is_premium) && (
            <div style={{ position: "absolute", top: 10, insetInlineEnd: 10, display: "flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, backgroundColor: "rgba(255,179,64,0.2)", border: "1px solid rgba(255,179,64,0.4)", color: "var(--amber)", fontSize: 11, fontWeight: 700 }}>
              <Crown size={11} /> PREMIUM
            </div>
          )}
          {isShort && (
            <div style={{ position: "absolute", top: 10, insetInlineStart: 10, padding: "3px 10px", borderRadius: 20, backgroundColor: "rgba(200,255,0,0.15)", border: "1px solid rgba(200,255,0,0.3)", color: "var(--accent)", fontSize: 10, fontWeight: 700 }}>
              SHORT
            </div>
          )}
          {video.duration && (
            <div style={{ position: "absolute", bottom: 10, insetInlineStart: 12, display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "rgba(255,255,255,0.8)" }}>
              <Clock size={11} /> {video.duration}
            </div>
          )}
        </div>
        <div style={{ padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
            <h3 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>{video.title}</h3>
            {video.category && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, backgroundColor: "var(--bg-surface)", border: `1px solid ${catColor}30`, color: catColor, whiteSpace: "nowrap", flexShrink: 0 }}>{video.category}</span>}
          </div>
          {video.description && <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 12 }}>{video.description}</p>}
          <button onClick={() => {
            if (isPremiumLocked) { alert("This video requires a Premium subscription."); return; }
            setPlaying(video);
            setHasSeeked(false);
            setHasSpeedChanged(false);
            setWatchProgress(0);
            lastTimeRef.current = 0;
          }}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px", borderRadius: 10, border: "none", cursor: isPremiumLocked ? "not-allowed" : "pointer", backgroundColor: isPremiumLocked ? "var(--bg-surface)" : "var(--accent)", color: isPremiumLocked ? "var(--text-muted)" : "#0A0A0B", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 13, opacity: isPremiumLocked ? 0.6 : 1, transition: "opacity 0.15s" }}>
            {isPremiumLocked ? <><Lock size={14} /> Premium Only</> : <><PlayCircle size={14} /> Watch Now</>}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: isMobile ? "16px 12px 40px" : "24px 20px 40px", maxWidth: 960, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 4 }}>Training</p>
          <h1 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: "clamp(20px, 4vw, 28px)", fontWeight: 700 }}>Workouts</h1>
        </div>
        <div style={{ display: "flex", gap: 6, backgroundColor: "var(--bg-surface)", padding: 4, borderRadius: 12, border: "1px solid var(--border)", flexWrap: "wrap" }}>
          {(["videos", "playlists", "shorties", "my-plan"] as const).map(v => (
            <button key={v} onClick={() => { setView(v); setActivePlaylist(null); }} style={{ padding: "7px 14px", borderRadius: 9, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", backgroundColor: view === v ? "var(--accent)" : "transparent", color: view === v ? "#0A0A0B" : "var(--text-secondary)", fontFamily: "'Chakra Petch', sans-serif", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 4 }}>
              {v === "videos" && <Video size={12} />}
              {v === "playlists" && <ListVideo size={12} />}
              {v === "shorties" && <Clapperboard size={12} />}
              {v === "my-plan" && <Dumbbell size={12} />}
              {v === "videos" ? "Videos" : v === "playlists" ? "Playlists" : v === "shorties" ? "Shorties" : "My Plan"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Videos Tab ── */}
      {view === "videos" && (
        <>
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <Search size={14} style={{ position: "absolute", insetInlineStart: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search videos..." style={{ width: "100%", paddingInlineStart: 36, paddingInlineEnd: 12, paddingTop: 10, paddingBottom: 10, backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 13, color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif", outline: "none" }} />
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {categories.map(cat => (
                <button key={cat} onClick={() => setCatFilter(cat)} style={{ padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: catFilter === cat ? 700 : 400, cursor: "pointer", border: `1px solid ${catFilter === cat ? "var(--accent)" : "var(--border)"}`, background: catFilter === cat ? "var(--accent-dim)" : "transparent", color: catFilter === cat ? "var(--accent)" : "var(--text-muted)", transition: "all 0.15s" }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>⟳</div><p>Loading videos...</p>
            </div>
          ) : videos.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16 }}>
              <Video size={48} color="var(--text-muted)" style={{ marginBottom: 16 }} />
              <h2 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                {allVideos.length === 0 ? "No Videos Yet" : "No videos match your search"}
              </h2>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 360, margin: "0 auto", lineHeight: 1.6 }}>
                {allVideos.length === 0 ? "Your coach or admin hasn't uploaded any workout videos yet." : "Try adjusting your search or category filter."}
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {videos.map(v => renderVideoCard(v))}
            </div>
          )}
        </>
      )}

      {/* ── Playlists Tab ── */}
      {view === "playlists" && !activePlaylist && (
        <>
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}><p>Loading playlists...</p></div>
          ) : playlists.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16 }}>
              <ListVideo size={48} color="var(--text-muted)" style={{ marginBottom: 16 }} />
              <h2 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No Playlists Yet</h2>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 360, margin: "0 auto", lineHeight: 1.6 }}>Playlists will appear here when created by coaches or admins.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {playlists.map(pl => (
                <div key={pl.id} onClick={() => loadPlaylistVideos(pl)} style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", cursor: "pointer", transition: "border-color 0.2s, transform 0.2s" }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.transform = "translateY(-3px)"; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "translateY(0)"; }}>
                  <div style={{ height: 140, backgroundColor: "var(--bg-surface)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                    {pl.thumbnail ? (
                      <img src={pl.thumbnail} alt={pl.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, var(--accent-dim) 0%, var(--bg-surface) 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <ListVideo size={40} color="var(--accent)" />
                      </div>
                    )}
                    <div style={{ position: "absolute", bottom: 10, insetInlineEnd: 12, padding: "3px 10px", borderRadius: 20, backgroundColor: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 11, fontWeight: 600 }}>
                      {pl.video_count} video{pl.video_count !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <div style={{ padding: "14px 16px" }}>
                    <h3 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{pl.title}</h3>
                    {pl.description && <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 6 }}>{pl.description}</p>}
                    {pl.creator_name && <p style={{ fontSize: 11, color: "var(--text-muted)" }}>By {pl.creator_name}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Playlist Videos View ── */}
      {view === "playlists" && activePlaylist && (
        <>
          <button onClick={() => setActivePlaylist(null)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, border: "1px solid var(--border)", backgroundColor: "var(--bg-surface)", cursor: "pointer", color: "var(--text-secondary)", fontSize: 13, fontFamily: "'Chakra Petch', sans-serif", fontWeight: 600, marginBottom: 16 }}>
            <ChevronLeft size={14} /> Back to Playlists
          </button>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{activePlaylist.title}</h2>
            {activePlaylist.description && <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{activePlaylist.description}</p>}
          </div>
          {playlistVideos.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16 }}>
              <p style={{ color: "var(--text-muted)" }}>No videos in this playlist yet.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {playlistVideos.map(v => renderVideoCard(v))}
            </div>
          )}
        </>
      )}

      {/* ── Shorties Tab ── */}
      {view === "shorties" && (
        <>
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}><p>Loading shorties...</p></div>
          ) : shorties.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16 }}>
              <Clapperboard size={48} color="var(--text-muted)" style={{ marginBottom: 16 }} />
              <h2 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No Shorties Yet</h2>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 360, margin: "0 auto", lineHeight: 1.6 }}>Quick workout clips under 2 minutes will appear here.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
              {shorties.map(v => renderVideoCard(v, true))}
            </div>
          )}
        </>
      )}

      {/* ── My Plan Tab ── */}
      {view === "my-plan" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {!myPlan ? (
            <div style={{ textAlign: "center", padding: "60px 20px", backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16 }}>
              <Dumbbell size={48} color="var(--text-muted)" style={{ marginBottom: 16 }} />
              <h2 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No Plan Assigned Yet</h2>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 360, margin: "0 auto", lineHeight: 1.6 }}>
                Your coach hasn't assigned a plan yet. Book a coaching session to get your personalized workout and nutrition plan.
              </p>
              <Link to="/app/coaching" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 20, padding: "10px 22px", borderRadius: 9, backgroundColor: "var(--accent)", color: "#0A0A0B", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
                Find a Coach
              </Link>
            </div>
          ) : (
            <>
              {myPlan.workout && (
                <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 24px" }}>
                  <h3 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{myPlan.workout.title}</h3>
                  {myPlan.workout.description && <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14 }}>{myPlan.workout.description}</p>}
                  {(myPlan.workout.sessions || []).map((s: any, i: number) => (
                    <div key={i} style={{ padding: "12px 14px", backgroundColor: "var(--bg-surface)", borderRadius: 10, marginBottom: 8 }}>
                      <p style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</p>
                      {(s.exercises || []).map((ex: any, j: number) => (
                        <p key={j} style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{ex.name} — {ex.sets}×{ex.reps}</p>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              {myPlan.nutrition && (
                <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 24px" }}>
                  <h3 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Nutrition Plan</h3>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fit, minmax(120px,1fr))", gap: 10, marginBottom: 14 }}>
                    {[
                      { label: "Calories", val: myPlan.nutrition.dailyCalories, unit: "kcal", color: "var(--accent)" },
                      { label: "Protein", val: myPlan.nutrition.protein, unit: "g", color: "var(--blue)" },
                      { label: "Carbs", val: myPlan.nutrition.carbs, unit: "g", color: "var(--amber)" },
                      { label: "Fat", val: myPlan.nutrition.fat, unit: "g", color: "var(--red)" },
                    ].map(m => (
                      <div key={m.label} style={{ backgroundColor: "var(--bg-surface)", borderRadius: 10, padding: "12px", textAlign: "center" }}>
                        <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 20, fontWeight: 700, color: m.color }}>{m.val}</p>
                        <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{m.label} ({m.unit})</p>
                      </div>
                    ))}
                  </div>
                  {myPlan.nutrition.notes && <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{myPlan.nutrition.notes}</p>}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Points Toast */}
      {pointsMsg && (
        <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", zIndex: 9999, padding: "12px 20px", borderRadius: 12, background: "var(--accent)", color: "#0A0A0B", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.3)", animation: "fadeIn 0.3s ease" }}>
          {pointsMsg}
        </div>
      )}

      {/* ── Video Player Modal with Anti-Cheat ── */}
      {playing && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, backgroundColor: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={closePlayer}>
          <div style={{ width: "100%", maxWidth: 800, backgroundColor: "var(--bg-surface)", borderRadius: 16, overflow: "hidden", border: "1px solid var(--border)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
              <h3 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 15, fontWeight: 700 }}>{playing.title}</h3>
              <button onClick={closePlayer} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
                <X size={15} />
              </button>
            </div>
            <div style={{ position: "relative", paddingBottom: playing.is_short ? "177.78%" : "56.25%", height: 0, backgroundColor: "#000", maxHeight: playing.is_short ? "80vh" : undefined }}>
              {getVideoEmbedUrl(playing.url) ? (
                isDirectVideo(playing.url) ? (
                  <video
                    ref={videoRef}
                    src={getVideoEmbedUrl(playing.url)!}
                    controls
                    autoPlay
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }}
                    onSeeking={() => setHasSeeked(true)}
                    onRateChange={(e) => {
                      if ((e.target as HTMLVideoElement).playbackRate !== 1) setHasSpeedChanged(true);
                    }}
                    onTimeUpdate={(e) => {
                      const vid = e.target as HTMLVideoElement;
                      if (vid.duration) setWatchProgress((vid.currentTime / vid.duration) * 100);
                    }}
                    onEnded={() => handleVideoEnded(playing)}
                  />
                ) : (
                  <iframe src={getVideoEmbedUrl(playing.url)!} allow="autoplay; fullscreen" allowFullScreen style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }} />
                )
              ) : (
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                  <Video size={40} color="var(--text-muted)" />
                  <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Cannot embed this video.</p>
                  <a href={playing.url} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 9, backgroundColor: "var(--accent)", color: "#0A0A0B", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
                    <ExternalLink size={13} /> Open Video
                  </a>
                </div>
              )}
            </div>
            {/* Anti-cheat status bar for direct videos */}
            {isDirectVideo(playing.url) && (
              <div style={{ padding: "10px 18px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, fontSize: 11 }}>
                <div style={{ flex: 1, height: 4, backgroundColor: "var(--bg-primary)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${watchProgress}%`, backgroundColor: hasSeeked || hasSpeedChanged ? "var(--red)" : "var(--accent)", transition: "width 0.3s" }} />
                </div>
                <span style={{ color: hasSeeked || hasSpeedChanged ? "var(--red)" : "var(--accent)", fontWeight: 600, whiteSpace: "nowrap" }}>
                  {hasSeeked ? "⚠ Seeked" : hasSpeedChanged ? "⚠ Speed changed" : watchProgress >= 99 ? "✓ Complete" : `${Math.round(watchProgress)}%`}
                </span>
              </div>
            )}
            {playing.description && (
              <div style={{ padding: "14px 18px" }}>
                <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{playing.description}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
