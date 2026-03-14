import { getApiBase } from "@/lib/api";
import { useState, useEffect } from "react";
import WebsiteCMS from "@/pages/admin/WebsiteCMS";
import Chat from "@/pages/app/Chat";
import { Users, Dumbbell, DollarSign, Activity, TrendingUp, Trash2, Shield, UserCheck, Gift, Sun, Moon, Plus, X, Search, Video, Megaphone, Star, CheckCircle, Clock, CreditCard, Play, Lock, Unlock, Save, Eye, EyeOff, Edit3 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useI18n } from "@/context/I18nContext";
import { useLocation } from "react-router-dom";

interface AdminUser { id: number; name: string; email: string; role: string; is_premium: boolean; membership_paid?: boolean; coach_membership_active?: boolean; points: number; steps: number; step_goal?: number; height?: number; weight?: number; gender?: string; medical_history?: string; medical_file_url?: string; created_at: string; avatar: string; }
interface Gift { id: number; user_id: number; user_name: string; title: string; description: string; type: string; value: number; created_at: string; }
interface CoachAd { id: number; coach_id: number; coach_name: string; coach_email: string; coach_avatar: string; title: string; description: string; specialty: string; status: "active" | "pending" | "rejected" | "expired"; cta: string; highlight: string; impressions: number; clicks: number; created_at: string; admin_note?: string; paid_amount: number; paid_minutes: number; payment_status?: string; payment_proof?: string; payment_phone?: string; ad_type?: string; media_type?: string; objective?: string; image_url?: string; video_url?: string; duration_hours?: number; duration_days?: number; boost_start?: string; boost_end?: string; }
interface Payment { id: number; user_id: number; user_name: string; user_email: string; amount: number; plan: string; type: string; card_last4?: string; payment_method?: string; proof_url?: string; status: string; created_at: string; }
interface TrainingVideo { id: number; title: string; description: string; url: string; duration: string; duration_seconds: number; category: string; is_premium: boolean; thumbnail: string; created_at: string; coach_id?: number | null; }
interface AdPayment { amount: number; duration_minutes: number; payment_status: string; payment_proof?: string; paid_amount: number; paid_minutes: number; }

type Tab = "overview" | "users" | "coaches" | "payments" | "videos" | "ads" | "gifts" | "community" | "website" | "settings" | "subscriptions" | "withdrawals" | "chat";
const roleColor = (role: string) => role === "admin" ? "var(--red)" : role === "coach" ? "var(--cyan)" : role === "moderator" ? "var(--amber)" : "var(--text-secondary)";

export default function AdminDashboard() {
  const { token, user, updateUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { lang, setLang, t } = useI18n();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => { const h = () => setIsMobile(window.innerWidth < 768); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  const pathToTab = (p: string): Tab => {
    if (p.includes("/subscriptions")) return "subscriptions";
    if (p.includes("/withdrawals")) return "withdrawals";
    if (p.includes("/coaches")) return "coaches";
    if (p.includes("/payments")) return "payments";
    if (p.includes("/videos")) return "videos";
    if (p.includes("/ads")) return "ads";
    if (p.includes("/gifts")) return "gifts";
    if (p.includes("/settings")) return "settings";
    if (p.includes("/website")) return "website";
    if (p.includes("/chat")) return "chat";
    if (p.includes("/users")) return "users";
    if (p.includes("/community")) return "community";
    return "overview";
  };
  const [tab, setTab] = useState<Tab>(pathToTab(location.pathname));

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [ads, setAds] = useState<CoachAd[]>([]);
  const [videos, setVideos] = useState<TrainingVideo[]>([]);
  const [coaches, setCoaches] = useState<AdminUser[]>([]);
  const [addingCoaches, setAddingCoaches] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState({ totalUsers: 0, coaches: 0, premium: 0, revenue: 0 });

  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showUserEditModal, setShowUserEditModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [userEditSaving, setUserEditSaving] = useState(false);
  const [medicalUploading, setMedicalUploading] = useState(false);
  const [giftForm, setGiftForm] = useState({ user_id: 0, title: "", description: "", type: "points", value: 100 });
  const [videoForm, setVideoForm] = useState({ title: "", description: "", duration: "", category: "HIIT", is_premium: false, is_short: false, coach_id: "" });
  const [userEditForm, setUserEditForm] = useState<any>({
    id: "",
    name: "",
    email: "",
    password: "",
    role: "user",
    avatar: "",
    is_premium: false,
    points: 0,
    steps: 0,
    height: "",
    weight: "",
    gender: "",
    medical_history: "",
    medical_file_url: "",
    membership_paid: false,
    coach_membership_active: false,
    step_goal: 10000,
  });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoUploadProgress, setVideoUploadProgress] = useState<string>("");
  const [communityPosts, setCommunityPosts] = useState<any[]>([]);
  const [announcementContent, setAnnouncementContent] = useState("");
  const [announcementHashtags, setAnnouncementHashtags] = useState("");
  const [announcementPosting, setAnnouncementPosting] = useState(false);

  const [moderatorSearch, setModeratorSearch] = useState("");
  const [coachSubscriptions, setCoachSubscriptions] = useState<any[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<any[]>([]);

  const [paymentSettings, setPaymentSettings] = useState({
    paypal_user_client_id: "",
    paypal_user_secret: "",
    paypal_coach_client_id: "",
    paypal_coach_secret: "",
    ewallet_phone_vodafone: "",
    ewallet_phone_orange: "",
    ewallet_phone_we: "",
    paypal_mode: "sandbox" as "sandbox" | "live",
    coach_cut_percentage: "90",
    pm_orange_cash: "1",
    pm_vodafone_cash: "1",
    pm_we_pay: "1",
    pm_paypal: "1",
    pm_credit_card: "0",
    pm_google_pay: "1",
    pm_apple_pay: "1",
  });
  const [paymentSettingsSaving, setPaymentSettingsSaving] = useState(false);
  const [paymentSettingsMsg, setPaymentSettingsMsg] = useState("");
  const [showSecrets, setShowSecrets] = useState(false);

  // Server URL state
  const [serverUrl, setServerUrl] = useState(() => localStorage.getItem("fitway_server_url") || "");
  const [serverUrlSaving, setServerUrlSaving] = useState(false);
  const [serverUrlMsg, setServerUrlMsg] = useState("");
  const [serverUrlTesting, setServerUrlTesting] = useState(false);
  const [adminName, setAdminName] = useState("");

  useEffect(() => { fetchAll(); fetchPaymentSettings(); fetchServerUrl(); }, []);
  useEffect(() => { setTab(pathToTab(location.pathname)); }, [location.pathname]);
  useEffect(() => { setAdminName(user?.name || ""); }, [user?.name]);

  const api = (path: string, opts?: RequestInit & { rawBody?: boolean }) => {
    const hdrs: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (!(opts as any)?.rawBody) hdrs["Content-Type"] = "application/json";
    return fetch(getApiBase() + path, { ...opts, headers: { ...hdrs, ...(opts?.headers || {}) } });
  };

  const fetchServerUrl = async () => {
    try {
      const res = await api("/api/admin/server-url");
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          setServerUrl(data.url);
          localStorage.setItem("fitway_server_url", data.url);
        }
      }
    } catch {}
  };

  const saveServerUrl = async () => {
    setServerUrlSaving(true);
    setServerUrlMsg("");
    const clean = serverUrl.trim().replace(/\/+$/, "");
    // Save to localStorage immediately — this is the primary store
    if (clean) localStorage.setItem("fitway_server_url", clean);
    else localStorage.removeItem("fitway_server_url");
    setServerUrl(clean);
    // Optionally persist to the server DB (best-effort, don't block on it)
    try {
      const res = await Promise.race([
        api("/api/admin/server-url", { method: "PUT", body: JSON.stringify({ url: clean }) }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 4000)),
      ]);
      if (res.ok) {
        setServerUrlMsg("✅ Server URL saved (localStorage + server)!");
      } else {
        setServerUrlMsg("✅ Saved to localStorage. Server sync failed — will retry next time.");
      }
    } catch {
      setServerUrlMsg("✅ Saved to localStorage. Backend not reachable — that's OK.");
    } finally {
      setServerUrlSaving(false);
      setTimeout(() => setServerUrlMsg(""), 5000);
    }
  };

  const testServerUrl = async () => {
    setServerUrlTesting(true);
    setServerUrlMsg("");
    const base = serverUrl.trim().replace(/\/+$/, "") || "";
    try {
      const res = await fetch(`${base}/api/admin/ping`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        setServerUrlMsg(`✅ Connection OK — server responded at ${data.timestamp || "now"}`);
      } else {
        setServerUrlMsg("⚠️ Server reachable but returned an error status.");
      }
    } catch {
      setServerUrlMsg("❌ Cannot reach server at this URL.");
    } finally {
      setServerUrlTesting(false);
      setTimeout(() => setServerUrlMsg(""), 6000);
    }
  };

  const fetchPaymentSettings = async () => {
    try {
      const res = await api("/api/admin/payment-settings");
      if (res.ok) {
        const data = await res.json();
        const s = data.settings || {};
        setPaymentSettings(prev => ({ ...prev, ...s }));
      }
    } catch {}
  };

  const savePaymentSettings = async () => {
    setPaymentSettingsSaving(true);
    setPaymentSettingsMsg("");
    try {
      const res = await api("/api/admin/payment-settings", {
        method: "PUT",
        body: JSON.stringify(paymentSettings),
      });
      if (res.ok) {
        setPaymentSettingsMsg("✅ Payment settings saved successfully!");
      } else {
        setPaymentSettingsMsg("❌ Failed to save settings.");
      }
    } catch {
      setPaymentSettingsMsg("❌ Network error.");
    } finally {
      setPaymentSettingsSaving(false);
      setTimeout(() => setPaymentSettingsMsg(""), 4000);
    }
  };

  const fetchCommunityPosts = async () => {
    try { const r = await api("/api/admin/community/posts"); const d = await r.json(); setCommunityPosts(d.posts || []); } catch {}
  };
  const postAnnouncement = async () => {
    if (!announcementContent.trim()) return;
    setAnnouncementPosting(true);
    try {
      const res = await api("/api/admin/community/announcements", {
        method: "POST",
        body: JSON.stringify({ content: announcementContent.trim(), hashtags: announcementHashtags.trim() || null }),
      });
      if (res.ok) {
        showMsg("📢 Announcement posted!");
        setAnnouncementContent("");
        setAnnouncementHashtags("");
        fetchCommunityPosts();
      } else { showMsg("❌ Failed to post announcement"); }
    } catch { showMsg("❌ Network error"); }
    finally { setAnnouncementPosting(false); }
  };
  const togglePin = async (postId: number) => {
    try {
      const res = await api(`/api/admin/community/posts/${postId}/pin`, { method: "PATCH" });
      if (res.ok) { const d = await res.json(); showMsg(d.is_pinned ? "📌 Post pinned" : "Post unpinned"); fetchCommunityPosts(); }
    } catch { showMsg("❌ Failed to toggle pin"); }
  };


  const fetchAll = async () => {
    setLoading(true);
    try {
      const [usersRes, videosRes, adsRes, paymentsRes, giftsRes] = await Promise.all([
        api("/api/admin/users"),
        api("/api/admin/videos"),
        api("/api/admin/ads"),
        api("/api/admin/payments"),
        api("/api/admin/gifts"),
      ]);
      const usersData = await usersRes.json();
      if (usersData.users) {
        setUsers(usersData.users);
        setCoaches(usersData.users.filter((u: AdminUser) => u.role === "coach"));
        const revenue = 0; // calculated from payments below
        setStats({
          totalUsers: usersData.users.filter((u: AdminUser) => u.role === "user").length,
          coaches: usersData.users.filter((u: AdminUser) => u.role === "coach").length,
          premium: usersData.users.filter((u: AdminUser) => u.role === "user" && u.is_premium).length,
          revenue: 0,
        });
      }
      if (videosRes.ok) { const d = await videosRes.json(); setVideos(d.videos || []); }
      if (adsRes.ok) { const d = await adsRes.json(); setAds(d.ads || []); }
      if (paymentsRes.ok) {
        const d = await paymentsRes.json();
        const p = d.payments || [];
        setPayments(p);
        setStats(s => ({ ...s, revenue: p.filter((x: Payment) => x.status === "completed").reduce((sum: number, x: Payment) => sum + x.amount, 0) }));
      }
      if (giftsRes.ok) { const d = await giftsRes.json(); setGifts(d.gifts || []); }
      // Fetch coach subscriptions & withdrawals
      try {
        const [subsRes, wdRes] = await Promise.all([
          api("/api/payments/coach-subscriptions"),
          api("/api/payments/withdrawals"),
        ]);
        if (subsRes.ok) { const d = await subsRes.json(); setCoachSubscriptions(d.subscriptions || []); }
        if (wdRes.ok) { const d = await wdRes.json(); setWithdrawalRequests(d.withdrawals || []); }
      } catch {}
    } catch (err) { console.error("fetchAll error:", err); }
    finally { setLoading(false); }
  };

  const showMsg = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(""), 3000); };

  const saveAdminName = () => {
    const n = adminName.trim();
    if (!n) {
      showMsg("❌ Name is required");
      return;
    }
    updateUser({ name: n });
    showMsg("✅ Admin name updated");
  };

  const updateUserRole = async (userId: number, role: string) => {
    await api(`/api/admin/users/${userId}/role`, { method: "PATCH", body: JSON.stringify({ role }) });
    setUsers(u => u.map(x => x.id === userId ? { ...x, role } : x));
    setCoaches(users.filter(u => u.role === "coach" || (u.id === userId && role === "coach")));
    showMsg(`✅ Role updated to ${role}`);
  };

  const updatePremium = async (userId: number, isPremium: boolean) => {
    await api(`/api/admin/users/${userId}/premium`, { method: "PATCH", body: JSON.stringify({ is_premium: isPremium }) });
    setUsers(u => u.map(x => x.id === userId ? { ...x, is_premium: isPremium } : x));
    showMsg(`✅ Premium ${isPremium ? "granted" : "revoked"}`);
  };

  const addCoachProfiles = async () => {
    setAddingCoaches(true);
    try {
      const res = await api("/api/admin/generate-coach-profiles", { method: "POST", body: JSON.stringify({ count: 5 }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showMsg(`❌ ${data?.message || "Failed to add coaches"}`);
        return;
      }
      await fetchAll();
      showMsg(`✅ ${data?.message || "5 coaches added"}`);
    } catch {
      showMsg("❌ Failed to add coaches");
    } finally {
      setAddingCoaches(false);
    }
  };

  const deleteUser = async (userId: number) => {
    if (!confirm("Delete this user? This cannot be undone.")) return;
    await api(`/api/admin/users/${userId}`, { method: "DELETE" });
    setUsers(u => u.filter(x => x.id !== userId));
    showMsg("🗑️ User deleted");
  };

  const sendGift = async () => {
    if (!giftForm.user_id || !giftForm.title) return;
    try {
      const res = await api("/api/admin/gifts", { method: "POST", body: JSON.stringify(giftForm) });
      if (res.ok) {
        setShowGiftModal(false);
        setGiftForm({ user_id: 0, title: "", description: "", type: "points", value: 100 });
        showMsg("🎁 Gift sent!");
        fetchAll();
      }
    } catch { showMsg("❌ Failed to send gift"); }
  };

  const openEditUser = (u: AdminUser) => {
    setEditingUserId(u.id);
    setUserEditForm({
      id: u.id,
      name: u.name || "",
      email: u.email || "",
      password: "",
      role: u.role || "user",
      avatar: u.avatar || "",
      is_premium: !!u.is_premium,
      points: Number(u.points || 0),
      steps: Number(u.steps || 0),
      height: u.height ?? "",
      weight: u.weight ?? "",
      gender: u.gender || "",
      medical_history: (u as any).medical_history || "",
      medical_file_url: (u as any).medical_file_url || "",
      membership_paid: !!(u as any).membership_paid,
      coach_membership_active: !!(u as any).coach_membership_active,
      step_goal: Number((u as any).step_goal || 10000),
    });
    setShowUserEditModal(true);
  };

  const saveUserEdit = async () => {
    if (!editingUserId) return;
    setUserEditSaving(true);
    try {
      const payload = {
        ...userEditForm,
        id: Number(userEditForm.id),
        points: Number(userEditForm.points || 0),
        steps: Number(userEditForm.steps || 0),
        step_goal: Number(userEditForm.step_goal || 10000),
        height: userEditForm.height === "" ? null : Number(userEditForm.height),
        weight: userEditForm.weight === "" ? null : Number(userEditForm.weight),
      };
      const res = await api(`/api/admin/users/${editingUserId}`, { method: "PUT", body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showMsg(`❌ ${data?.message || "Failed to update user"}`);
        return;
      }
      showMsg("✅ User updated");
      setShowUserEditModal(false);
      setEditingUserId(null);
      await fetchAll();
    } catch {
      showMsg("❌ Failed to update user");
    } finally {
      setUserEditSaving(false);
    }
  };

  const uploadMedicalForUser = async (file: File) => {
    if (!editingUserId || !file) return;
    setMedicalUploading(true);
    try {
      const fd = new FormData();
      fd.append("medical", file);
      const res = await fetch(getApiBase() + `/api/admin/users/${editingUserId}/upload-medical`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d?.file_url) {
        showMsg(`❌ ${d?.message || "Upload failed"}`);
        return;
      }
      setUserEditForm((f: any) => ({ ...f, medical_file_url: d.file_url }));
      showMsg("✅ Medical file uploaded");
    } catch {
      showMsg("❌ Failed to upload medical file");
    } finally {
      setMedicalUploading(false);
    }
  };

  const addVideo = async () => {
    if (!videoForm.title || !videoFile) { showMsg("❌ Title and video file are required"); return; }
    try {
      setVideoUploadProgress("Uploading...");
      const formData = new FormData();
      formData.append("title", videoForm.title);
      formData.append("description", videoForm.description);
      formData.append("duration", videoForm.duration);
      formData.append("category", videoForm.category);
      formData.append("is_premium", videoForm.is_premium ? "1" : "0");
      formData.append("is_short", videoForm.is_short ? "1" : "0");
      if (videoForm.coach_id) formData.append("coach_id", videoForm.coach_id);
      formData.append("video", videoFile);
      if (thumbnailFile) formData.append("thumbnail", thumbnailFile);
      const res = await fetch(getApiBase() + "/api/admin/videos", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.video) {
        setVideos(v => [data.video, ...v]);
        setShowVideoModal(false);
        setVideoForm({ title: "", description: "", duration: "", category: "HIIT", is_premium: false, is_short: false, coach_id: "" });
        setVideoFile(null); setThumbnailFile(null);
        showMsg("🎬 Video uploaded!");
      } else { showMsg("❌ " + (data.message || "Failed to upload video")); }
    } catch { showMsg("❌ Failed to upload video"); }
    finally { setVideoUploadProgress(""); }
  };

  const deleteVideo = async (videoId: number) => {
    if (!confirm("Delete this video?")) return;
    await api(`/api/admin/videos/${videoId}`, { method: "DELETE" });
    setVideos(v => v.filter(x => x.id !== videoId));
    showMsg("🗑️ Video deleted");
  };

  const assignVideoCoach = async (videoId: number, coachId: string) => {
    try {
      await api(`/api/admin/videos/${videoId}`, { method: "PATCH", body: JSON.stringify({ coach_id: coachId ? Number(coachId) : null }) });
      setVideos(vs => vs.map(v => v.id === videoId ? { ...v, coach_id: coachId ? Number(coachId) : null } : v));
      showMsg("✅ Coach linked to video");
    } catch {
      showMsg("❌ Failed to update coach link");
    }
  };

  const updateAdStatus = async (id: number, status: CoachAd["status"]) => {
    try {
      const res = await api(`/api/admin/ads/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      if (res.ok) {
        setAds(a => a.map(x => x.id === id ? { ...x, status } : x));
        showMsg(`✅ Ad ${status}`);
      }
    } catch { showMsg("❌ Failed to update ad"); }
  };

  const deleteAd = async (id: number) => {
    await api(`/api/admin/ads/${id}`, { method: "DELETE" });
    setAds(a => a.filter(x => x.id !== id));
    showMsg("🗑️ Ad removed");
  };

  const filtered = users.filter(u => u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()));
  const tabDef: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" }, { id: "users", label: "Users" }, { id: "coaches", label: "Coaches" },
    { id: "payments", label: "Payments" }, { id: "subscriptions", label: "📋 Subscriptions" }, { id: "withdrawals", label: "💸 Withdrawals" },
    { id: "videos", label: "Videos" }, { id: "ads", label: "Coach Ads" },
    { id: "chat", label: "Chat" },
    { id: "gifts", label: "Gifts" }, { id: "community", label: "🛡 Community" },
    { id: "website", label: "🌐 Website & Config" }, { id: "settings", label: "Settings" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: "clamp(18px,4vw,24px)", fontWeight: 700 }}>Admin Dashboard</h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>{t("manage_platform")}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={toggleTheme} style={{ width: 36, height: 36, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-card)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--text-secondary)" }}>
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <div style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(255,68,68,0.1)", border: "1px solid var(--red)", fontSize: 12, color: "var(--red)", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
            <Shield size={12} /> Admin
          </div>
        </div>
      </div>

      <div style={{ overflowX: "auto", paddingBottom: 4 }}>
        <div style={{ display: "flex", gap: 4, backgroundColor: "var(--bg-surface)", borderRadius: 12, padding: 4, border: "1px solid var(--border)", width: "max-content", minWidth: "100%" }}>
          {tabDef.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "7px 14px", borderRadius: 9, border: "none", cursor: "pointer", background: tab === t.id ? "var(--bg-card)" : "none", color: tab === t.id ? "var(--text-primary)" : "var(--text-muted)", fontSize: 12, fontWeight: tab === t.id ? 600 : 400, fontFamily: "'Chakra Petch', sans-serif", boxShadow: tab === t.id ? "0 1px 4px var(--shadow)" : "none", whiteSpace: "nowrap", transition: "all 0.15s" }}>{t.label}{t.id === "ads" && ads.filter(a => a.status === "pending").length > 0 ? ` (${ads.filter(a => a.status === "pending").length})` : ""}</button>
          ))}
        </div>
      </div>

      {message && <div style={{ padding: "10px 16px", backgroundColor: "var(--accent-dim)", border: "1px solid var(--accent)", borderRadius: 10, fontSize: 13, color: "var(--accent)" }}>{message}</div>}

      {/* OVERVIEW */}
      {tab === "overview" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            {[
              { title: "Total Users", value: stats.totalUsers, icon: Users, color: "var(--blue)" },
              { title: "Coaches", value: stats.coaches, icon: UserCheck, color: "var(--cyan)" },
              { title: "Premium", value: stats.premium, icon: Activity, color: "var(--accent)" },
              { title: "Revenue", value: `${stats.revenue.toFixed(0)} EGP`, icon: DollarSign, color: "var(--amber)" },
            ].map(s => (
              <div key={s.title} style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 18 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.title}</p>
                  <s.icon size={16} color={s.color} />
                </div>
                <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>
          {/* Quick Actions: Fake Data */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={async () => {
                showMsg("⏳ Generating 20 fake accounts…");
                try { const r = await api("/api/admin/generate-fake-accounts", { method: "POST" }); const d = await r.json(); showMsg(`✅ ${d.message}`); fetchAll(); } catch { showMsg("❌ Failed to generate accounts"); }
              }}
              style={{ padding: "11px 20px", borderRadius: 10, backgroundColor: "rgba(59,139,255,0.1)", border: "1px solid rgba(59,139,255,0.3)", color: "var(--blue)", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
            >
              <Users size={15} /> Generate 20 Fake Accounts
            </button>
            <button
              onClick={async () => {
                showMsg("⏳ Generating 5 challenges…");
                try { const r = await api("/api/admin/generate-fake-challenges", { method: "POST" }); const d = await r.json(); showMsg(`✅ ${d.message}`); } catch { showMsg("❌ Failed to generate challenges"); }
              }}
              style={{ padding: "11px 20px", borderRadius: 10, backgroundColor: "rgba(255,170,0,0.1)", border: "1px solid rgba(255,170,0,0.3)", color: "var(--amber)", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
            >
              <Dumbbell size={15} /> Generate 5 Challenges
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, fontWeight: 700 }}>{t("recent_users")}</p>
                <TrendingUp size={16} color="var(--red)" />
              </div>
              {users.length === 0 ? <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{t("no_users_yet")}</p> : users.slice(0, 5).map((u, i) => (
                <div key={u.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < 4 ? "1px solid var(--border)" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <img src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`} alt={u.name} style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)" }} />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</p>
                      <p style={{ fontSize: 11, color: roleColor(u.role), marginTop: 1, textTransform: "capitalize" }}>{u.role}</p>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: u.is_premium ? "var(--accent)" : "var(--text-muted)" }}>{u.is_premium ? `⚡ ${t("premium")}` : t("free_label")}</span>
                </div>
              ))}
            </div>
            <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, fontWeight: 700 }}>{t("recent_payments")}</p>
                <CreditCard size={16} color="var(--accent)" />
              </div>
              {payments.length === 0 ? <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{t("no_payments_yet")}</p> : payments.slice(0, 5).map((p, i) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < 4 ? "1px solid var(--border)" : "none" }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>{p.user_name}</p>
                    <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{p.plan} · ****{p.card_last4}</p>
                  </div>
                  <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--accent)" }}>{p.amount.toFixed(0)} EGP</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* USERS */}
      {tab === "users" && (
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <Search size={14} style={{ position: "absolute", insetInlineStart: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input className="input-base" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." style={{ paddingInlineStart: 34, padding: "8px 12px 8px 34px" }} />
            </div>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {users.filter(u => u.role === "user").length} users · {users.filter(u => u.role === "admin").length} admins
            </span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
              <thead>
                <tr style={{ backgroundColor: "var(--bg-surface)" }}>
                  {["User", "Role", "Premium", "Coach Mbr", "Points", "Steps", "Actions"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "start", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid var(--border)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => (
                  <tr key={u.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <img src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`} alt={u.name} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</p>
                          <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <select value={u.role} onChange={e => updateUserRole(u.id, e.target.value)} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 7, padding: "4px 8px", fontSize: 12, color: roleColor(u.role), cursor: "pointer", outline: "none" }}>
                        <option value="user">User</option>
                        <option value="coach">Coach</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {u.role === "user" ? (
                        <button onClick={() => updatePremium(u.id, !u.is_premium)} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", border: `1px solid ${u.is_premium ? "var(--accent)" : "var(--border)"}`, background: u.is_premium ? "var(--accent-dim)" : "var(--bg-surface)", color: u.is_premium ? "var(--accent)" : "var(--text-muted)" }}>
                          {u.is_premium ? `⚡ ${t("premium")}` : t("free_label")}
                        </button>
                      ) : (
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {u.role === "coach" ? (
                        <button onClick={async () => { const paid = !(u as any).membership_paid; await api(`/api/admin/users/${u.id}/coach-membership`, { method: "PATCH", body: JSON.stringify({ membership_paid: paid }) }); fetchAll(); showMsg(paid ? t("coach_membership_activated") : t("coach_membership_revoked")); }} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", border: `1px solid ${(u as any).membership_paid ? "var(--cyan)" : "rgba(255,68,68,0.4)"}`, background: (u as any).membership_paid ? "rgba(6,182,212,0.1)" : "rgba(255,68,68,0.08)", color: (u as any).membership_paid ? "var(--cyan)" : "var(--red)" }}>
                          {(u as any).membership_paid ? `✓ ${t("active")}` : `✗ ${t("inactive")}`}
                        </button>
                      ) : <span style={{ fontSize: 11, color: "var(--text-muted)" }}>—</span>}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontFamily: "'Chakra Petch', sans-serif", fontWeight: 600 }}>{u.points?.toLocaleString()}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13 }}>{u.steps?.toLocaleString()}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => openEditUser(u)} title="Edit user" style={{ padding: 0, borderRadius: 6, background: "rgba(59,139,255,0.12)", border: "1px solid var(--blue)", color: "var(--blue)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28 }}>
                          <Edit3 size={13} />
                        </button>
                        <button onClick={() => { setGiftForm(f => ({ ...f, user_id: u.id })); setShowGiftModal(true); setTab("gifts"); }} style={{ padding: 0, borderRadius: 6, background: "rgba(255,179,64,0.1)", border: "1px solid var(--amber)", color: "var(--amber)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28 }}>
                          <Gift size={13} />
                        </button>
                        <button onClick={() => deleteUser(u.id)} style={{ padding: 0, borderRadius: 6, background: "rgba(255,68,68,0.1)", border: "1px solid var(--red)", color: "var(--red)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28 }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* COACHES */}
      {tab === "coaches" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 16, fontWeight: 700 }}>{t("manage_coaches")}</p>
            <button
              onClick={addCoachProfiles}
              disabled={addingCoaches}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 9,
                background: "var(--cyan)",
                border: "none",
                color: "#072226",
                fontSize: 12,
                fontWeight: 700,
                cursor: addingCoaches ? "not-allowed" : "pointer",
                opacity: addingCoaches ? 0.7 : 1,
                fontFamily: "'Chakra Petch', sans-serif"
              }}
            >
              <Plus size={14} /> {addingCoaches ? "Adding..." : "Add 5 Coaches"}
            </button>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>To add a coach, go to Users tab and change a user's role to "Coach".</p>
          {coaches.length === 0 ? (
            <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
              No coaches yet. Promote a user to "Coach" in the Users tab.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
              {coaches.map(c => (
                <div key={c.id} style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 }}>
                  <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
                    <img src={c.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.email}`} alt={c.name} style={{ width: 52, height: 52, borderRadius: "50%", backgroundColor: "var(--bg-surface)" }} />
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 15, fontWeight: 700 }}>{c.name}</h3>
                      <p style={{ fontSize: 12, color: "var(--cyan)", marginTop: 2 }}>{c.email}</p>
                      <p style={{ fontSize: 11, color: "var(--accent)", marginTop: 4 }}>⚡ {c.points?.toLocaleString()} pts</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={async () => {
                      const paid = !(c as any).membership_paid;
                      await api(`/api/admin/users/${c.id}/coach-membership`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ membership_paid: paid }) });
                      fetchAll();
                      showMsg(paid ? t("coach_membership_activated") : t("coach_membership_deactivated"));
                    }} style={{ flex: 1, padding: "7px", borderRadius: 8, background: (c as any).membership_paid ? "rgba(6,182,212,0.1)" : "rgba(255,68,68,0.08)", border: `1px solid ${(c as any).membership_paid ? "var(--cyan)" : "rgba(255,68,68,0.4)"}`, color: (c as any).membership_paid ? "var(--cyan)" : "var(--red)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                      {(c as any).membership_paid ? `✓ ${t("active")}` : `✗ ${t("inactive")}`}
                    </button>
                    <span style={{ flex: 1, padding: "7px", borderRadius: 8, fontSize: 12, color: "var(--text-muted)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>—</span>
                    <button onClick={() => updateUserRole(c.id, "user")} style={{ padding: "7px 12px", borderRadius: 8, background: "rgba(255,68,68,0.1)", border: "1px solid var(--red)", color: "var(--red)", cursor: "pointer", fontSize: 12 }}>
                      {t("demote")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PAYMENTS */}
      {tab === "payments" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {[
              { label: t("total_revenue"), value: `${payments.filter(p => p.status === "completed").reduce((s, p) => s + p.amount, 0).toFixed(0)} EGP`, color: "var(--accent)" },
              { label: t("transactions"), value: payments.length, color: "var(--cyan)" },
              { label: t("premium_subs"), value: payments.filter(p => p.type === "premium").length, color: "var(--amber)" },
              { label: t("coach_members"), value: payments.filter(p => p.type === "coach_membership").length, color: "var(--blue)" },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, minWidth: 120, backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 18 }}>
                <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{s.label}</p>
                <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>
          {/* Pending e-wallet approvals */}
          {payments.filter(p => p.status === "pending" && p.payment_method === "ewallet").length > 0 && (
            <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid rgba(255,179,64,0.35)", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,179,64,0.2)", backgroundColor: "rgba(255,179,64,0.05)", display: "flex", alignItems: "center", gap: 10 }}>
                <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--amber)" }}>
                  ⏳ Pending E-Wallet Approvals
                </p>
                <span style={{ padding: "2px 10px", borderRadius: 20, backgroundColor: "rgba(255,179,64,0.15)", color: "var(--amber)", fontSize: 12, fontWeight: 700 }}>
                  {payments.filter(p => p.status === "pending" && p.payment_method === "ewallet").length}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {payments.filter(p => p.status === "pending" && p.payment_method === "ewallet").map((p, i, arr) => (
                  <div key={p.id} style={{ padding: "16px 20px", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <p style={{ fontSize: 13, fontWeight: 600 }}>{p.user_name}</p>
                      <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.user_email}</p>
                      <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 3 }}>
                        {p.type === "premium" ? t("user_premium") : t("coach_membership")} · {p.plan} · <strong style={{ color: "var(--accent)" }}>{p.amount?.toFixed(0)} EGP</strong>
                      </p>
                      {p.proof_url && (
                        <a href={p.proof_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6, fontSize: 11, color: "var(--blue)", textDecoration: "none", padding: "3px 8px", borderRadius: 6, border: "1px solid rgba(59,139,255,0.3)", backgroundColor: "rgba(59,139,255,0.07)" }}>
                          📎 View Payment Proof
                        </a>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <button
                        onClick={async () => {
                          try {
                            const r = await api(`/api/payments/approve/${p.id}`, { method: "PATCH" });
                            if (r.ok) {
                              setPayments(prev => prev.map(x => x.id === p.id ? { ...x, status: "completed" } : x));
                            }
                          } catch {}
                        }}
                        style={{ padding: "7px 16px", borderRadius: 9, background: "rgba(200,255,0,0.1)", border: "1px solid rgba(200,255,0,0.3)", color: "var(--accent)", cursor: "pointer", fontSize: 12, fontWeight: 700 }}
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const r = await api(`/api/payments/reject/${p.id}`, { method: "PATCH" });
                            if (r.ok) {
                              setPayments(prev => prev.map(x => x.id === p.id ? { ...x, status: "rejected" } : x));
                            }
                          } catch {}
                        }}
                        style={{ padding: "7px 14px", borderRadius: 9, background: "rgba(255,68,68,0.08)", border: "1px solid rgba(255,68,68,0.25)", color: "var(--red)", cursor: "pointer", fontSize: 12, fontWeight: 700 }}
                      >
                        ✗ Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
              <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, fontWeight: 700 }}>{t("payment_transactions")}</p>
            </div>
            {payments.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>{t("no_payments_recorded")}</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                  <thead>
                    <tr style={{ backgroundColor: "var(--bg-surface)" }}>
                      {[t("table_user"), t("table_type"), t("table_method"), t("table_amount"), t("table_status"), t("table_date")].map(h => (
                        <th key={h} style={{ padding: "10px 16px", textAlign: "start", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid var(--border)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p, i) => (
                      <tr key={p.id} style={{ borderBottom: i < payments.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <td style={{ padding: "12px 16px" }}>
                          <p style={{ fontSize: 13, fontWeight: 600 }}>{p.user_name}</p>
                          <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{p.user_email}</p>
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: 12, color: p.type === "premium" ? "var(--accent)" : "var(--cyan)" }}>{p.type === "premium" ? t("user_premium") : t("coach_member")}</td>
                        <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)", textTransform: "capitalize" }}>{p.payment_method || "card"}</td>
                        <td style={{ padding: "12px 16px", fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--accent)" }}>{p.amount?.toFixed(0)} EGP</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, fontWeight: 600,
                            background: p.status === "completed" ? "rgba(200,255,0,0.08)" : p.status === "pending" ? "rgba(255,179,64,0.1)" : "rgba(255,68,68,0.08)",
                            color: p.status === "completed" ? "var(--accent)" : p.status === "pending" ? "var(--amber)" : "var(--red)",
                            border: `1px solid ${p.status === "completed" ? "rgba(200,255,0,0.2)" : p.status === "pending" ? "rgba(255,179,64,0.3)" : "rgba(255,68,68,0.2)"}`,
                          }}>
                            {p.status === "completed" ? `✓ ${t("paid")}` : p.status === "pending" ? `⏳ ${t("pending")}` : `✗ ${t("rejected")}`}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-muted)" }}>{new Date(p.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIDEOS */}
      {tab === "videos" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 16, fontWeight: 700 }}>Training Videos</p>
            <button onClick={() => setShowVideoModal(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 9, background: "var(--red)", border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Chakra Petch', sans-serif" }}>
              <Plus size={14} /> Add Video
            </button>
          </div>
          {videos.length === 0 && !loading && (
            <div style={{ textAlign: "center", padding: "40px 20px", backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, color: "var(--text-muted)", fontSize: 14 }}>
              No videos uploaded yet. Click "Add Video" to get started.
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {videos.map(v => (
              <div key={v.id} style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
                <div style={{ height: 140, backgroundColor: "var(--bg-surface)", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 50, height: 50, borderRadius: "50%", backgroundColor: "rgba(255,68,68,0.15)", border: "1px solid var(--red)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Play size={20} color="var(--red)" style={{ marginInlineStart: 3 }} />
                  </div>
                  {v.is_premium && <div style={{ position: "absolute", top: 10, insetInlineEnd: 10, padding: "3px 8px", borderRadius: 6, background: "var(--accent)", color: "#0A0A0B", fontSize: 10, fontWeight: 700, fontFamily: "'Chakra Petch', sans-serif" }}>PREMIUM</div>}
                  <div style={{ position: "absolute", bottom: 8, insetInlineStart: 10, fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                    <Clock size={11} /> {v.duration}
                  </div>
                </div>
                <div style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
                    <h3 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>{v.title}</h3>
                    <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 5, background: "var(--bg-surface)", color: "var(--text-muted)", border: "1px solid var(--border)", whiteSpace: "nowrap", marginInlineStart: 8 }}>{v.category}</span>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 12 }}>{v.description}</p>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 10, color: "var(--text-muted)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Coach</label>
                    <select className="input-base" value={v.coach_id ?? ""} onChange={e => assignVideoCoach(v.id, e.target.value)} style={{ fontSize: 12, padding: "7px 10px" }}>
                      <option value="">No coach (general)</option>
                      {coaches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={async () => { await api(`/api/admin/videos/${v.id}`, { method: "PATCH", body: JSON.stringify({ ...v, is_premium: !v.is_premium }) }); setVideos(vs => vs.map(x => x.id === v.id ? { ...x, is_premium: !x.is_premium } : x)); }} style={{ flex: 1, padding: "7px", borderRadius: 8, background: v.is_premium ? "var(--accent-dim)" : "var(--bg-surface)", border: `1px solid ${v.is_premium ? "var(--accent)" : "var(--border)"}`, color: v.is_premium ? "var(--accent)" : "var(--text-muted)", cursor: "pointer", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                      {v.is_premium ? <><Lock size={11} /> Premium</> : <><Unlock size={11} /> Free</>}
                    </button>
                    <button onClick={() => deleteVideo(v.id)} style={{ padding: "7px 12px", borderRadius: 8, background: "rgba(255,68,68,0.1)", border: "1px solid var(--red)", color: "var(--red)", cursor: "pointer" }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADS */}
      {tab === "ads" && (() => {
        const adFilter = (search || "").startsWith("ads:") ? search.replace("ads:", "").trim() : "";
        const statusFilters = ["all", "pending", "active", "rejected", "expired"] as const;
        const currentFilter = (["pending", "active", "rejected", "expired"].includes(adFilter) ? adFilter : "all") as typeof statusFilters[number];
        const filteredAds = currentFilter === "all" ? ads : ads.filter(a => a.status === currentFilter);
        const adStatsLocal = {
          total: ads.length,
          pending: ads.filter(a => a.status === "pending").length,
          active: ads.filter(a => a.status === "active").length,
          rejected: ads.filter(a => a.status === "rejected").length,
          expired: ads.filter(a => a.status === "expired").length,
          revenue: ads.reduce((s, a) => s + (a.payment_status === "approved" ? (a.paid_amount || 0) : 0), 0),
          pendingRevenue: ads.reduce((s, a) => s + (a.payment_status === "pending" ? (a.paid_amount || 0) : 0), 0),
          impressions: ads.reduce((s, a) => s + (a.impressions || 0), 0),
          clicks: ads.reduce((s, a) => s + (a.clicks || 0), 0),
        };
        const ctr = adStatsLocal.impressions > 0 ? ((adStatsLocal.clicks / adStatsLocal.impressions) * 100).toFixed(1) : "0";
        return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div>
              <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 16, fontWeight: 700 }}>📢 Ad Manager</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Rate: <strong>4 EGP/min</strong> · Review payment proof before activation</p>
            </div>
          </div>

          {/* Analytics Cards */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
            {[
              { label: "Revenue", value: `${adStatsLocal.revenue} EGP`, color: "var(--accent)" },
              { label: "Pending $", value: `${adStatsLocal.pendingRevenue} EGP`, color: "var(--amber)" },
              { label: "Impressions", value: adStatsLocal.impressions.toLocaleString(), color: "var(--blue)" },
              { label: "Clicks", value: adStatsLocal.clicks.toLocaleString(), color: "var(--cyan)" },
              { label: "CTR", value: `${ctr}%`, color: "var(--accent)" },
            ].map(s => (
              <div key={s.label} style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px" }}>
                <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{s.label}</p>
                <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Status Filter Tabs */}
          <div style={{ display: "flex", gap: 4, backgroundColor: "var(--bg-surface)", borderRadius: 10, padding: 3, border: "1px solid var(--border)", overflowX: "auto" }}>
            {statusFilters.map(f => {
              const count = f === "all" ? ads.length : ads.filter(a => a.status === f).length;
              const isActive = currentFilter === f;
              return (
                <button key={f} onClick={() => setSearch(f === "all" ? "" : `ads:${f}`)} style={{ padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer", background: isActive ? "var(--bg-card)" : "transparent", color: isActive ? "var(--text-primary)" : "var(--text-muted)", fontSize: 12, fontWeight: isActive ? 700 : 400, fontFamily: "'Chakra Petch', sans-serif", boxShadow: isActive ? "0 1px 4px var(--shadow)" : "none", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}>
                  {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                  {count > 0 && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, background: f === "pending" ? "rgba(255,179,64,0.2)" : f === "active" ? "rgba(200,255,0,0.2)" : "var(--bg-surface)", color: f === "pending" ? "var(--amber)" : f === "active" ? "var(--accent)" : "var(--text-muted)", fontWeight: 700 }}>{count}</span>}
                </button>
              );
            })}
          </div>

          {/* Ads List */}
          {filteredAds.length === 0 ? (
            <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
              {ads.length === 0 ? t("no_ads_submitted_yet") : `${t("no_label")} ${currentFilter} ${t("ads")}.`}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {filteredAds.map(ad => {
                const borderColor = ad.status === "active" ? "rgba(200,255,0,0.25)" : ad.status === "pending" ? "rgba(255,179,64,0.25)" : ad.status === "expired" ? "rgba(128,128,128,0.25)" : "rgba(255,68,68,0.25)";
                const statusColor = ad.status === "active" ? "var(--accent)" : ad.status === "pending" ? "var(--amber)" : ad.status === "expired" ? "var(--text-muted)" : "var(--red)";
                const adCtr = (ad.impressions || 0) > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : "0";
                const boostEnd = ad.boost_end ? new Date(ad.boost_end) : null;
                const boostStart = ad.boost_start ? new Date(ad.boost_start) : null;
                const isExpired = boostEnd && boostEnd < new Date();
                const remainingMs = boostEnd && !isExpired ? boostEnd.getTime() - Date.now() : 0;
                const remainingHours = Math.floor(remainingMs / 3600000);
                const remainingDays = Math.floor(remainingHours / 24);
                const remainingH = remainingHours % 24;

                return (
                  <div key={ad.id} style={{ backgroundColor: "var(--bg-card)", border: `1px solid ${borderColor}`, borderRadius: 16, padding: 20, opacity: ad.status === "expired" ? 0.75 : 1 }}>
                    <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                      {/* Coach avatar */}
                      <img src={ad.coach_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${ad.coach_email}`} alt={ad.coach_name} style={{ width: 48, height: 48, borderRadius: "50%", backgroundColor: "var(--bg-surface)", flexShrink: 0, border: `2px solid ${statusColor}` }} />
                      <div style={{ flex: 1, minWidth: 200 }}>
                        {/* Top row: title + status */}
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4, flexWrap: "wrap", gap: 8 }}>
                          <div>
                            <h3 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 15, fontWeight: 700 }}>{ad.title}</h3>
                            <p style={{ fontSize: 12, color: "var(--cyan)", marginTop: 2 }}>{ad.coach_name} · <span style={{ color: "var(--text-muted)" }}>{ad.coach_email}</span></p>
                          </div>
                          <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 20, fontWeight: 700, background: "transparent", color: statusColor, border: `1px solid ${statusColor}` }}>
                            {ad.status === "active" ? "✓ ACTIVE" : ad.status === "pending" ? "⏳ PENDING" : ad.status === "expired" ? "⌛ EXPIRED" : "✗ REJECTED"}
                          </span>
                        </div>

                        {/* Tags row */}
                        <div style={{ display: "flex", gap: 5, marginBottom: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, backgroundColor: "var(--bg-surface)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                            {ad.ad_type === "home_banner" ? "🏠 Banner" : "📱 Community"}
                          </span>
                          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, backgroundColor: "var(--bg-surface)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                            {ad.objective === "coaching" ? "🎯 Booking" : "👁 Awareness"}
                          </span>
                          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, backgroundColor: "var(--bg-surface)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                            {ad.media_type === "video" ? "🎬 Video" : "🖼 Image"} · {ad.specialty}
                          </span>
                        </div>

                        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 8 }}>{ad.description.length > 160 ? ad.description.slice(0, 160) + "…" : ad.description}</p>

                        {/* Media preview */}
                        {(ad.image_url || ad.video_url) && (
                          <div style={{ marginBottom: 10, borderRadius: 8, overflow: "hidden", maxHeight: 120, border: "1px solid var(--border)" }}>
                            {ad.media_type === "video" && ad.video_url
                              ? <video src={ad.video_url} style={{ width: "100%", maxHeight: 120, objectFit: "cover", display: "block" }} />
                              : ad.image_url ? <img src={ad.image_url} alt={ad.title} style={{ width: "100%", maxHeight: 120, objectFit: "cover", display: "block" }} /> : null}
                          </div>
                        )}

                        {/* Payment + Schedule Info */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                          {/* Payment */}
                          <div style={{ padding: "10px 12px", borderRadius: 10, background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>💳 Payment</p>
                            <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 12 }}>
                              <span>{t("table_amount")}: <strong style={{ color: "var(--amber)" }}>{ad.paid_amount || 0} EGP</strong></span>
                              <span>Duration: <strong style={{ color: "var(--accent)" }}>{ad.paid_minutes || 0} min</strong></span>
                              <span>{t("table_status")}: <strong style={{ color: ad.payment_status === "approved" ? "var(--accent)" : ad.payment_status === "pending" ? "var(--amber)" : "var(--red)" }}>{ad.payment_status || t("unpaid")}</strong></span>
                              {ad.payment_phone && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>📱 {ad.payment_phone}</span>}
                            </div>
                            {ad.payment_proof && (
                              <a href={ad.payment_proof} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4, fontSize: 11, color: "var(--blue)", textDecoration: "underline" }}>
                                📎 View proof
                              </a>
                            )}
                          </div>
                          {/* Schedule + Analytics */}
                          <div style={{ padding: "10px 12px", borderRadius: 10, background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>📊 Performance</p>
                            <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 12 }}>
                              <span>👁 {(ad.impressions || 0).toLocaleString()} impressions</span>
                              <span>🖱 {ad.clicks || 0} clicks · <strong style={{ color: "var(--blue)" }}>{adCtr}% CTR</strong></span>
                              {boostStart && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Start: {boostStart.toLocaleDateString()}</span>}
                              {boostEnd && (
                                <span style={{ fontSize: 11, color: isExpired ? "var(--red)" : "var(--accent)" }}>
                                  {isExpired ? `Ended: ${boostEnd.toLocaleDateString()}` : `⏱ ${remainingDays > 0 ? `${remainingDays}d ` : ""}${remainingH}h left`}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Admin note */}
                        {ad.admin_note && (
                          <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(255,68,68,0.05)", border: "1px solid rgba(255,68,68,0.2)", marginBottom: 10, fontSize: 12, color: "var(--text-secondary)" }}>
                            <strong style={{ color: "var(--red)" }}>Admin note:</strong> {ad.admin_note}
                          </div>
                        )}

                        {/* Action buttons */}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {ad.status !== "active" && (
                            <button onClick={() => updateAdStatus(ad.id, "active")} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, background: "rgba(200,255,0,0.1)", border: "1px solid rgba(200,255,0,0.3)", color: "var(--accent)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                              <CheckCircle size={13} /> Activate
                            </button>
                          )}
                          {ad.status === "active" && (
                            <button onClick={() => updateAdStatus(ad.id, "expired")} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, background: "rgba(128,128,128,0.1)", border: "1px solid rgba(128,128,128,0.3)", color: "var(--text-muted)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                              <Clock size={13} /> Expire
                            </button>
                          )}
                          {ad.status === "pending" && (
                            <button onClick={async () => {
                              const note = prompt("Rejection reason (optional):") || "";
                              const res = await api(`/api/admin/ads/${ad.id}/status`, { method: "PATCH", body: JSON.stringify({ status: "rejected", admin_note: note }) });
                              if (res.ok) { showMsg("Ad rejected"); fetchAll(); }
                            }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, background: "rgba(255,68,68,0.1)", border: "1px solid rgba(255,68,68,0.3)", color: "var(--red)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                              <X size={13} /> Reject
                            </button>
                          )}
                          {ad.payment_status === "pending" && (
                            <>
                              <button onClick={async () => {
                                const res = await api(`/api/admin/ads/${ad.id}/payment`, { method: "PATCH", body: JSON.stringify({ payment_status: "approved" }) });
                                if (res.ok) { showMsg("✅ Payment approved & ad activated!"); fetchAll(); }
                              }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, background: "rgba(59,139,255,0.1)", border: "1px solid rgba(59,139,255,0.3)", color: "var(--blue)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                                <CreditCard size={13} /> Approve Payment
                              </button>
                              <button onClick={async () => {
                                const res = await api(`/api/admin/ads/${ad.id}/payment`, { method: "PATCH", body: JSON.stringify({ payment_status: "rejected" }) });
                                if (res.ok) { showMsg("Payment rejected"); fetchAll(); }
                              }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, background: "rgba(255,68,68,0.08)", border: "1px solid rgba(255,68,68,0.2)", color: "var(--red)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                                <X size={13} /> Reject Payment
                              </button>
                            </>
                          )}
                          <button onClick={() => deleteAd(ad.id)} style={{ padding: "7px 10px", borderRadius: 8, background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer" }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>);
      })()}

      {/* GIFTS */}
      {tab === "gifts" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 16, fontWeight: 700 }}>Gift System</p>
            <button onClick={() => setShowGiftModal(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 9, background: "var(--red)", border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Chakra Petch', sans-serif" }}>
              <Plus size={14} /> Send Gift
            </button>
          </div>
          {gifts.length === 0 ? (
            <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
              <Gift size={40} strokeWidth={1} style={{ margin: "0 auto 12px" }} />
              <p style={{ fontFamily: "'Chakra Petch', sans-serif" }}>{t("no_gifts_sent_yet")}</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>{t("send_points_premium_athletes")}</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {gifts.map(g => (
                <div key={g.id} style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--accent-dim)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Gift size={15} color="var(--accent)" />
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700 }}>{g.title}</p>
                        <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{g.type} · {g.value}</p>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 5, background: "var(--accent-dim)", color: "var(--accent)", fontWeight: 600 }}>{g.type}</span>
                  </div>
                  {g.description && <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>{g.description}</p>}
                  <p style={{ fontSize: 11, color: "var(--text-muted)" }}>To: {g.user_name || `User #${g.user_id}`} · {new Date(g.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* COMMUNITY MODERATION */}
      {tab === "community" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div>
              <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 16, fontWeight: 700 }}>🛡 Community Moderation</p>
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Post announcements, moderate, pin, hide, or delete posts</p>
            </div>
            <button onClick={fetchCommunityPosts} style={{ padding: "8px 16px", borderRadius: 9, background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: 12, cursor: "pointer" }}>🔄 Refresh</button>
          </div>

          {/* ── Announcement Form ── */}
          <div style={{ backgroundColor: "var(--bg-card)", border: "2px solid rgba(59,139,255,0.25)", borderRadius: 16, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(59,139,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Megaphone size={16} color="var(--blue)" />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Chakra Petch', sans-serif" }}>📢 Post Announcement</p>
                <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Announcements are pinned to the top with a special label</p>
              </div>
            </div>
            <textarea
              value={announcementContent}
              onChange={e => setAnnouncementContent(e.target.value)}
              placeholder="Write your announcement to the community..."
              rows={3}
              style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid var(--border)", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", fontSize: 13, resize: "vertical", outline: "none", fontFamily: "'Outfit', sans-serif", lineHeight: 1.6 }}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
              <input
                value={announcementHashtags}
                onChange={e => setAnnouncementHashtags(e.target.value)}
                placeholder="#hashtags (optional)"
                style={{ flex: 1, minWidth: 160, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", fontSize: 12, outline: "none" }}
              />
              <button
                onClick={postAnnouncement}
                disabled={announcementPosting || !announcementContent.trim()}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "9px 20px", borderRadius: 9,
                  background: announcementPosting || !announcementContent.trim() ? "var(--bg-surface)" : "var(--blue)",
                  color: announcementPosting || !announcementContent.trim() ? "var(--text-muted)" : "#fff",
                  border: "none", cursor: announcementPosting ? "wait" : "pointer",
                  fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 13,
                }}
              >
                <Megaphone size={14} /> {announcementPosting ? "Posting…" : "Post Announcement"}
              </button>
            </div>
          </div>

          {/* ── Posts List ── */}
          {communityPosts.length === 0 ? (
            <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
              <p>No posts yet. Click Refresh to load.</p>
              <button onClick={fetchCommunityPosts} style={{ marginTop: 12, padding: "8px 20px", borderRadius: 9, background: "var(--accent)", color: "#0A0A0B", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>Load Posts</button>
            </div>
          ) : communityPosts.map((post: any) => (
            <div key={post.id} style={{ backgroundColor: "var(--bg-card)", border: `1px solid ${post.is_announcement ? "rgba(59,139,255,0.3)" : post.is_hidden ? "rgba(255,68,68,0.3)" : "var(--border)"}`, borderRadius: 14, padding: "16px 18px", opacity: post.is_hidden ? 0.7 : 1, position: "relative" }}>
              {/* Pinned / Announcement badges */}
              {(post.is_pinned || post.is_announcement) && (
                <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                  {post.is_pinned ? <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 20, background: "rgba(200,255,0,0.12)", color: "var(--accent)", fontWeight: 700, border: "1px solid rgba(200,255,0,0.3)" }}>📌 Pinned</span> : null}
                  {post.is_announcement ? <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 20, background: "rgba(59,139,255,0.12)", color: "var(--blue)", fontWeight: 700, border: "1px solid rgba(59,139,255,0.3)" }}>📢 Announcement</span> : null}
                </div>
              )}
              <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                <img src={post.user_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.user_email}`} alt={post.user_name} style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>{post.user_name}</p>
                    <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: post.user_role === "coach" ? "rgba(6,182,212,0.1)" : post.user_role === "admin" ? "rgba(255,68,68,0.1)" : "var(--bg-surface)", color: post.user_role === "coach" ? "var(--cyan)" : post.user_role === "admin" ? "var(--red)" : "var(--text-muted)", border: "1px solid var(--border)" }}>{post.user_role}</span>
                    {post.is_hidden && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: "rgba(255,68,68,0.1)", color: "var(--red)", border: "1px solid rgba(255,68,68,0.3)" }}>🚫 Hidden{post.moderation_reason ? ` — ${post.moderation_reason}` : ""}</span>}
                    <span style={{ fontSize: 11, color: "var(--text-muted)", marginInlineStart: "auto" }}>{new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                  <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{post.user_email}</p>
                </div>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6, marginBottom: 8 }}>{post.content}</p>
              {post.hashtags && <p style={{ fontSize: 12, color: "var(--accent)", marginBottom: 8 }}>{post.hashtags}</p>}
              {post.media_url && <img src={post.media_url} alt="Post media" style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 8, marginBottom: 8 }} />}
              <div style={{ display: "flex", gap: 10, fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
                <span>❤️ {post.likes || 0}</span>
                <span>💬 {post.comment_count || 0}</span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {/* Pin / Unpin */}
                <button onClick={() => togglePin(post.id)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, background: post.is_pinned ? "rgba(200,255,0,0.1)" : "var(--bg-surface)", border: `1px solid ${post.is_pinned ? "rgba(200,255,0,0.3)" : "var(--border)"}`, color: post.is_pinned ? "var(--accent)" : "var(--text-secondary)", cursor: "pointer", fontSize: 12 }}>
                  📌 {post.is_pinned ? "Unpin" : "Pin"}
                </button>
                {/* Hide / Restore */}
                {post.is_hidden ? (
                  <button onClick={async () => { await api(`/api/admin/community/posts/${post.id}/restore`, { method: "PATCH" }); fetchCommunityPosts(); showMsg("✅ Post restored"); }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, background: "rgba(200,255,0,0.1)", border: "1px solid rgba(200,255,0,0.3)", color: "var(--accent)", cursor: "pointer", fontSize: 12 }}>
                    ✓ Restore Post
                  </button>
                ) : (
                  <button onClick={async () => { const reason = prompt("Reason for hiding (optional):") || "Policy violation"; await api(`/api/admin/community/posts/${post.id}/hide`, { method: "PATCH", body: JSON.stringify({ reason }) }); fetchCommunityPosts(); showMsg("Post hidden"); }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, background: "rgba(255,179,64,0.1)", border: "1px solid rgba(255,179,64,0.3)", color: "var(--amber)", cursor: "pointer", fontSize: 12 }}>
                    🙈 Hide Post
                  </button>
                )}
                {/* Delete */}
                <button onClick={async () => { if (!confirm("Permanently delete this post?")) return; await api(`/api/admin/community/posts/${post.id}`, { method: "DELETE" }); fetchCommunityPosts(); showMsg("Post deleted"); }} style={{ padding: "6px 10px", borderRadius: 8, background: "rgba(255,68,68,0.1)", border: "1px solid rgba(255,68,68,0.3)", color: "var(--red)", cursor: "pointer" }}>
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* WEBSITE & CONFIG */}
      {tab === "website" && (
        <WebsiteCMS token={token} showMsg={showMsg} />
      )}

      {/* SUBSCRIPTIONS */}
      {tab === "subscriptions" && (
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
            <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 15, fontWeight: 700 }}>Coach Subscriptions</p>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{coachSubscriptions.filter(s => s.status === "pending").length} pending</span>
          </div>
          {coachSubscriptions.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--text-muted)", padding: 30, fontSize: 13 }}>No coach subscriptions yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {coachSubscriptions.map((sub: any) => (
                <div key={sub.id} style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600 }}>{sub.user_name || `User #${sub.user_id}`} → {sub.coach_name || `Coach #${sub.coach_id}`}</p>
                      <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, background: "rgba(59,130,246,0.1)", color: "var(--blue)", border: "1px solid rgba(59,130,246,0.2)" }}>
                          {sub.plan_type === "workout" ? "💪 Workout" : sub.plan_type === "nutrition" ? "🥗 Nutrition" : "🏆 Complete"}
                        </span>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, background: "rgba(200,255,0,0.08)", color: "var(--accent)", border: "1px solid rgba(200,255,0,0.2)" }}>
                          {sub.plan_cycle} · {sub.amount} EGP
                        </span>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, fontWeight: 600, background: sub.status === "active" ? "rgba(200,255,0,0.1)" : String(sub.status).includes("rejected") || sub.status === "refunded" ? "rgba(255,68,68,0.1)" : "rgba(255,179,64,0.1)", color: sub.status === "active" ? "var(--accent)" : String(sub.status).includes("rejected") || sub.status === "refunded" ? "var(--red)" : "var(--amber)", border: `1px solid ${sub.status === "active" ? "rgba(200,255,0,0.25)" : String(sub.status).includes("rejected") || sub.status === "refunded" ? "rgba(255,68,68,0.25)" : "rgba(255,179,64,0.25)"}` }}>
                      {sub.status}
                    </span>
                  </div>
                  {sub.payment_proof && (
                    <div style={{ marginBottom: 10 }}>
                      <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Payment Proof:</p>
                      <img src={sub.payment_proof.startsWith("http") ? sub.payment_proof : getApiBase() + `/uploads/${sub.payment_proof}`} alt="proof" style={{ maxHeight: 120, borderRadius: 8, border: "1px solid var(--border)" }} />
                    </div>
                  )}
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>Created: {new Date(sub.created_at).toLocaleDateString()}</p>
                  {(sub.status === "pending_admin" || sub.status === "pending") && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={async () => {
                        try {
                          const r = await api(`/api/payments/coach-subscriptions/${sub.id}/approve`, { method: "PATCH" });
                          if (r.ok) {
                            setCoachSubscriptions(prev => prev.map(s => s.id === sub.id ? { ...s, status: "pending_coach" } : s));
                            showMsg("✅ Payment verified. Waiting for coach decision.");
                          }
                        } catch {}
                      }} style={{ flex: 1, padding: "8px 14px", borderRadius: 8, background: "var(--accent)", border: "none", color: "#0A0A0B", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "'Chakra Petch', sans-serif" }}>
                        ✓ Verify Payment
                      </button>
                      <button onClick={async () => {
                        try {
                          const r = await api(`/api/payments/coach-subscriptions/${sub.id}/reject`, { method: "PATCH" });
                          if (r.ok) {
                            setCoachSubscriptions(prev => prev.map(s => s.id === sub.id ? { ...s, status: "rejected_admin" } : s));
                            showMsg("Payment rejected and user marked refunded.");
                          }
                        } catch {}
                      }} style={{ flex: 1, padding: "8px 14px", borderRadius: 8, background: "rgba(255,68,68,0.1)", border: "1px solid var(--red)", color: "var(--red)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                        ✗ Reject (Refund)
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* WITHDRAWALS */}
      {tab === "withdrawals" && (
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
            <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 15, fontWeight: 700 }}>Coach Withdrawal Requests</p>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{withdrawalRequests.filter(w => w.status === "pending").length} pending</span>
          </div>
          {withdrawalRequests.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--text-muted)", padding: 30, fontSize: 13 }}>No withdrawal requests yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {withdrawalRequests.map((wd: any) => (
                <div key={wd.id} style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600 }}>{wd.coach_name || `Coach #${wd.coach_id}`}</p>
                      <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--accent)", marginTop: 4 }}>{wd.amount} <span style={{ fontSize: 12, fontWeight: 400 }}>EGP</span></p>
                    </div>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, fontWeight: 600, background: wd.status === "approved" ? "rgba(200,255,0,0.1)" : wd.status === "rejected" ? "rgba(255,68,68,0.1)" : "rgba(255,179,64,0.1)", color: wd.status === "approved" ? "var(--accent)" : wd.status === "rejected" ? "var(--red)" : "var(--amber)", border: `1px solid ${wd.status === "approved" ? "rgba(200,255,0,0.25)" : wd.status === "rejected" ? "rgba(255,68,68,0.25)" : "rgba(255,179,64,0.25)"}` }}>
                      {wd.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
                    {(() => {
                      const mtype = wd.payment_method_type || "ewallet";
                      if (mtype === "ewallet") return <p>📱 {wd.wallet_type ? wd.wallet_type.charAt(0).toUpperCase() + wd.wallet_type.slice(1) : "E-Wallet"}: <strong>{wd.payment_phone || "N/A"}</strong></p>;
                      if (mtype === "paypal") return <p>🅿️ PayPal: <strong>{wd.paypal_email || "N/A"}</strong></p>;
                      if (mtype === "credit_card") return <p>💳 Card: <strong>{wd.card_holder_name || "N/A"}</strong> — {wd.card_number || "N/A"}</p>;
                      if (mtype === "instapay") return <p>⚡ InstaPay: <strong>{wd.instapay_handle || "N/A"}</strong></p>;
                      return <p>📱 {wd.wallet_type || "Vodafone"}: {wd.payment_phone || "N/A"}</p>;
                    })()}
                    <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Requested: {new Date(wd.created_at).toLocaleDateString()}</p>
                  </div>
                  {wd.status === "pending" && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={async () => {
                        try {
                          const r = await api(`/api/payments/withdrawals/${wd.id}/approve`, { method: "PATCH" });
                          if (r.ok) {
                            setWithdrawalRequests(prev => prev.map(w => w.id === wd.id ? { ...w, status: "approved" } : w));
                            showMsg("✅ Withdrawal approved! Pay the coach.");
                          }
                        } catch {}
                      }} style={{ flex: 1, padding: "8px 14px", borderRadius: 8, background: "var(--accent)", border: "none", color: "#0A0A0B", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "'Chakra Petch', sans-serif" }}>
                        ✓ Approve & Pay
                      </button>
                      <button onClick={async () => {
                        try {
                          const r = await api(`/api/payments/withdrawals/${wd.id}/reject`, { method: "PATCH" });
                          if (r.ok) {
                            setWithdrawalRequests(prev => prev.map(w => w.id === wd.id ? { ...w, status: "rejected" } : w));
                            showMsg("Withdrawal rejected. Credit refunded to coach.");
                          }
                        } catch {}
                      }} style={{ flex: 1, padding: "8px 14px", borderRadius: 8, background: "rgba(255,68,68,0.1)", border: "1px solid var(--red)", color: "var(--red)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                        ✗ Reject (Refund)
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "chat" && (
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
          <Chat />
        </div>
      )}

      {tab === "settings" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 22px" }}>
            <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Admin Preferences</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.07em" }}>Name</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className="input-base"
                    type="text"
                    value={adminName}
                    onChange={e => setAdminName(e.target.value)}
                    placeholder="Admin name"
                    style={{ flex: 1 }}
                  />
                  <button
                    onClick={saveAdminName}
                    style={{ padding: "10px 14px", borderRadius: 10, backgroundColor: "var(--accent)", color: "#0A0A0B", border: "none", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
                  >
                    Save Name
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 2 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>Mode</p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Toggle between light and dark theme</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Sun size={16} color={!isDark ? "var(--amber)" : "var(--text-muted)"} />
                  <button className={`theme-toggle ${!isDark ? "active" : ""}`} onClick={toggleTheme} />
                  <Moon size={16} color={isDark ? "var(--blue)" : "var(--text-muted)"} />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>Language</p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Choose admin panel language</p>
                </div>
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value as any)}
                  className="input-base"
                  style={{ width: 150, padding: "8px 10px", fontSize: 12 }}
                >
                  <option value="en">English</option>
                  <option value="ar">العربية</option>
                </select>
              </div>
            </div>
          </div>

          {/* Server URL */}
          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 22px" }}>
            <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 4 }}>🌐 Backend Server URL</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.5 }}>
              Set the full backend URL for mobile (Capacitor) builds. Leave empty to use relative paths (default for web).
              <br />Example: <strong>https://api.fitwayhub.com</strong> or <strong>http://192.168.1.100:3000</strong>
            </p>
            <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
              <input
                className="input-base"
                type="url"
                value={serverUrl}
                onChange={e => setServerUrl(e.target.value)}
                placeholder="https://api.fitwayhub.com"
                style={{ flex: 1 }}
              />
              <button
                onClick={testServerUrl}
                disabled={serverUrlTesting}
                style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-surface)", color: "var(--text-secondary)", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 600, fontSize: 12, cursor: serverUrlTesting ? "not-allowed" : "pointer", whiteSpace: "nowrap", opacity: serverUrlTesting ? 0.6 : 1 }}
              >
                {serverUrlTesting ? "Testing…" : "🔗 Test"}
              </button>
            </div>
            {serverUrlMsg && (
              <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, backgroundColor: serverUrlMsg.startsWith("✅") ? "rgba(0,220,130,0.1)" : serverUrlMsg.startsWith("⚠") ? "rgba(255,170,0,0.1)" : "rgba(255,68,68,0.1)", border: `1px solid ${serverUrlMsg.startsWith("✅") ? "rgba(0,220,130,0.3)" : serverUrlMsg.startsWith("⚠") ? "rgba(255,170,0,0.3)" : "rgba(255,68,68,0.3)"}`, fontSize: 13, fontWeight: 600, color: serverUrlMsg.startsWith("✅") ? "var(--accent)" : serverUrlMsg.startsWith("⚠") ? "var(--amber)" : "var(--red)" }}>
                {serverUrlMsg}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button
                onClick={saveServerUrl}
                disabled={serverUrlSaving}
                style={{ flex: 1, padding: "11px", borderRadius: 10, backgroundColor: "var(--accent)", color: "#0A0A0B", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 13, border: "none", cursor: serverUrlSaving ? "not-allowed" : "pointer", opacity: serverUrlSaving ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                <Save size={14} /> {serverUrlSaving ? "Saving…" : "Save Server URL"}
              </button>
              {serverUrl && (
                <button
                  onClick={() => { setServerUrl(""); localStorage.removeItem("fitway_server_url"); setServerUrlMsg("✅ Cleared — using relative paths (web mode)"); setTimeout(() => setServerUrlMsg(""), 4000); }}
                  style={{ padding: "11px 18px", borderRadius: 10, border: "1px solid rgba(255,68,68,0.3)", background: "rgba(255,68,68,0.06)", color: "var(--red)", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 22px" }}>
            <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Platform Info</p>
            {[
              { label: t("total_users"), value: users.length },
              { label: t("coaches"), value: coaches.length },
              { label: t("premium_members"), value: users.filter(u => u.role === "user" && u.is_premium).length },
              { label: t("total_revenue"), value: `${payments.filter(p => p.status === "completed").reduce((s, p) => s + p.amount, 0).toFixed(0)} EGP` },
              { label: t("pending_ads"), value: ads.filter(a => a.status === "pending").length },
            ].map(s => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>{s.label}</p>
                <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--accent)" }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Payment Settings */}
          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 15, fontWeight: 700 }}>💳 Payment Settings</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>Configure PayPal credentials and e-wallet phone number</p>
              </div>
              <button type="button" onClick={() => setShowSecrets(s => !s)} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                {showSecrets ? <EyeOff size={14} /> : <Eye size={14} />} {showSecrets ? "Hide" : "Show"} Secrets
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

              {/* User PayPal */}
              <div style={{ padding: "16px", backgroundColor: "rgba(0,112,243,0.06)", border: "1px solid rgba(0,112,243,0.2)", borderRadius: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#0070F3", marginBottom: 12 }}>👤 User Premium — PayPal Credentials</p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12, lineHeight: 1.5 }}>
                  Create a PayPal app at <strong>developer.paypal.com</strong> → My Apps &amp; Credentials → Live → Copy Client ID and Secret.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>Client ID</label>
                    <input className="input-base" type="text" value={paymentSettings.paypal_user_client_id} onChange={e => setPaymentSettings(s => ({ ...s, paypal_user_client_id: e.target.value }))} placeholder="AaBbCc..." />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>Secret Key</label>
                    <input className="input-base" type={showSecrets ? "text" : "password"} value={paymentSettings.paypal_user_secret} onChange={e => setPaymentSettings(s => ({ ...s, paypal_user_secret: e.target.value }))} placeholder="••••••••••••••••" />
                  </div>
                </div>
              </div>

              {/* Coach PayPal */}
              <div style={{ padding: "16px", backgroundColor: "rgba(0,220,200,0.06)", border: "1px solid rgba(0,220,200,0.2)", borderRadius: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--cyan)", marginBottom: 12 }}>🏋️ {t("coach_membership")} — PayPal Credentials</p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12, lineHeight: 1.5 }}>
                  You can use the same app or a separate PayPal app for coach payments.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>Client ID</label>
                    <input className="input-base" type="text" value={paymentSettings.paypal_coach_client_id} onChange={e => setPaymentSettings(s => ({ ...s, paypal_coach_client_id: e.target.value }))} placeholder="AaBbCc..." />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>Secret Key</label>
                    <input className="input-base" type={showSecrets ? "text" : "password"} value={paymentSettings.paypal_coach_secret} onChange={e => setPaymentSettings(s => ({ ...s, paypal_coach_secret: e.target.value }))} placeholder="••••••••••••••••" />
                  </div>
                </div>
              </div>

              {/* E-Wallet Phone Numbers */}
              <div style={{ padding: "16px", backgroundColor: "rgba(255,170,0,0.06)", border: "1px solid rgba(255,170,0,0.2)", borderRadius: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#FFAA00", marginBottom: 12 }}>📱 E-Wallet Phone Numbers</p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.5 }}>
                  Set a different phone number for each wallet provider. Users will see the matching number when they select a wallet.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ padding: "12px", backgroundColor: "rgba(230,0,0,0.06)", border: "1px solid rgba(230,0,0,0.15)", borderRadius: 10 }}>
                    <label style={{ fontSize: 11, color: "#E60000", display: "block", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>🔴 Vodafone Cash</label>
                    <input className="input-base" type="tel" value={paymentSettings.ewallet_phone_vodafone} onChange={e => setPaymentSettings(s => ({ ...s, ewallet_phone_vodafone: e.target.value }))} placeholder="+20 10 XXXX XXXX" />
                  </div>
                  <div style={{ padding: "12px", backgroundColor: "rgba(255,105,0,0.06)", border: "1px solid rgba(255,105,0,0.15)", borderRadius: 10 }}>
                    <label style={{ fontSize: 11, color: "#FF6900", display: "block", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>🟠 Orange Cash</label>
                    <input className="input-base" type="tel" value={paymentSettings.ewallet_phone_orange} onChange={e => setPaymentSettings(s => ({ ...s, ewallet_phone_orange: e.target.value }))} placeholder="+20 12 XXXX XXXX" />
                  </div>
                  <div style={{ padding: "12px", backgroundColor: "rgba(123,45,142,0.06)", border: "1px solid rgba(123,45,142,0.15)", borderRadius: 10 }}>
                    <label style={{ fontSize: 11, color: "#7B2D8E", display: "block", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>🟣 WE Pay</label>
                    <input className="input-base" type="tel" value={paymentSettings.ewallet_phone_we} onChange={e => setPaymentSettings(s => ({ ...s, ewallet_phone_we: e.target.value }))} placeholder="+20 15 XXXX XXXX" />
                  </div>
                </div>
              </div>

              {/* PayPal Mode */}
              <div style={{ padding: "16px", backgroundColor: "rgba(255,68,68,0.06)", border: "1px solid rgba(255,68,68,0.2)", borderRadius: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--red)", marginBottom: 8 }}>⚙️ PayPal Mode</p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12, lineHeight: 1.5 }}>
                  Switch between <strong>Sandbox</strong> (testing) and <strong>Live</strong> (real payments). Make sure PayPal credentials match the selected mode.
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["sandbox", "live"] as const).map(mode => (
                    <button key={mode} type="button" onClick={() => setPaymentSettings(s => ({ ...s, paypal_mode: mode }))}
                      style={{
                        flex: 1, padding: "12px", borderRadius: 10,
                        border: `2px solid ${paymentSettings.paypal_mode === mode ? (mode === "live" ? "var(--accent)" : "var(--amber)") : "var(--border)"}`,
                        backgroundColor: paymentSettings.paypal_mode === mode ? (mode === "live" ? "rgba(0,220,130,0.1)" : "rgba(255,170,0,0.1)") : "var(--bg-surface)",
                        cursor: "pointer", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 13,
                        color: paymentSettings.paypal_mode === mode ? (mode === "live" ? "var(--accent)" : "var(--amber)") : "var(--text-muted)",
                      }}>
                      {mode === "sandbox" ? "🧪 Sandbox (Testing)" : "🔴 Live (Real Payments)"}
                    </button>
                  ))}
                </div>
                {paymentSettings.paypal_mode === "live" && (
                  <p style={{ fontSize: 11, color: "var(--red)", marginTop: 8, fontWeight: 600 }}>
                    ⚠️ Live mode — real money will be charged. Ensure your PayPal credentials are for a production app.
                  </p>
                )}
              </div>

              {/* Coach Revenue Cut */}
              <div style={{ padding: "16px", backgroundColor: "rgba(0,220,130,0.06)", border: "1px solid rgba(0,220,130,0.2)", borderRadius: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", marginBottom: 8 }}>💰 Coach Revenue Share</p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12, lineHeight: 1.5 }}>
                  Percentage of subscription payments credited to the coach. The remaining goes to the platform.
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input className="input-base" type="number" min="0" max="100" value={paymentSettings.coach_cut_percentage} onChange={e => setPaymentSettings(s => ({ ...s, coach_cut_percentage: e.target.value }))} style={{ width: 100, textAlign: "center" }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-secondary)" }}>%</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    (Platform keeps {100 - Number(paymentSettings.coach_cut_percentage || 90)}%)
                  </span>
                </div>
              </div>

              {/* Payment Method Toggles */}
              <div style={{ padding: "16px", backgroundColor: "rgba(59,139,255,0.06)", border: "1px solid rgba(59,139,255,0.2)", borderRadius: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--blue)", marginBottom: 8 }}>🔀 Available Payment Methods</p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.5 }}>
                  Toggle which payment methods are visible to users. Disabled methods won't appear in the payment form.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { key: "pm_orange_cash" as const, label: "🟠 Orange Cash (E-Wallet)", color: "#FF6900" },
                    { key: "pm_vodafone_cash" as const, label: "🔴 Vodafone Cash (E-Wallet)", color: "#E60000" },
                    { key: "pm_we_pay" as const, label: "🟣 WE Pay (E-Wallet)", color: "#7B2D8E" },
                    { key: "pm_paypal" as const, label: "💳 PayPal", color: "#0070F3" },
                    { key: "pm_credit_card" as const, label: "💳 Credit / Debit Card", color: "var(--text-secondary)" },
                    { key: "pm_google_pay" as const, label: "▶️ Google Pay", color: "#34A853" },
                    { key: "pm_apple_pay" as const, label: "🍎 Apple Pay", color: "#333" },
                  ].map(pm => (
                    <div key={pm.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", backgroundColor: "var(--bg-surface)", borderRadius: 10, border: "1px solid var(--border)" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: pm.color }}>{pm.label}</span>
                      <button
                        type="button"
                        onClick={() => setPaymentSettings(s => ({ ...s, [pm.key]: s[pm.key] === "1" ? "0" : "1" }))}
                        style={{
                          width: 48, height: 26, borderRadius: 13, border: "none", cursor: "pointer",
                          backgroundColor: paymentSettings[pm.key] === "1" ? "var(--accent)" : "var(--border)",
                          position: "relative", transition: "background-color 0.2s",
                        }}
                      >
                        <div style={{
                          width: 20, height: 20, borderRadius: "50%", backgroundColor: "#fff",
                          position: "absolute", top: 3,
                          left: paymentSettings[pm.key] === "1" ? 25 : 3,
                          transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                        }} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {paymentSettingsMsg && (
                <div style={{ padding: "12px 16px", borderRadius: 10, backgroundColor: paymentSettingsMsg.startsWith("✅") ? "rgba(0,220,130,0.1)" : "rgba(255,68,68,0.1)", border: `1px solid ${paymentSettingsMsg.startsWith("✅") ? "rgba(0,220,130,0.3)" : "rgba(255,68,68,0.3)"}`, fontSize: 14, fontWeight: 600, color: paymentSettingsMsg.startsWith("✅") ? "var(--accent)" : "var(--red)" }}>
                  {paymentSettingsMsg}
                </div>
              )}

              <button onClick={savePaymentSettings} disabled={paymentSettingsSaving} style={{ padding: "13px", borderRadius: 11, backgroundColor: "var(--accent)", color: "#0A0A0B", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 14, border: "none", cursor: paymentSettingsSaving ? "not-allowed" : "pointer", opacity: paymentSettingsSaving ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Save size={15} /> {paymentSettingsSaving ? "Saving…" : "Save Payment Settings"}
              </button>
            </div>
          </div>

        </div>
      )}

      {/* Gift Modal */}
      {showUserEditModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1100, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: 24, width: "100%", maxWidth: 760, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 17, fontWeight: 700 }}>Edit User</p>
              <button onClick={() => setShowUserEditModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={20} /></button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              <div><label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>ID</label><input className="input-base" type="number" value={userEditForm.id} onChange={e => setUserEditForm((f: any) => ({ ...f, id: e.target.value }))} /></div>
              <div><label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Name</label><input className="input-base" value={userEditForm.name} onChange={e => setUserEditForm((f: any) => ({ ...f, name: e.target.value }))} /></div>
              <div><label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Email</label><input className="input-base" type="email" value={userEditForm.email} onChange={e => setUserEditForm((f: any) => ({ ...f, email: e.target.value }))} /></div>
              <div><label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Password (leave blank to keep)</label><input className="input-base" type="password" value={userEditForm.password} onChange={e => setUserEditForm((f: any) => ({ ...f, password: e.target.value }))} /></div>
              <div><label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Role</label><select className="input-base" value={userEditForm.role} onChange={e => setUserEditForm((f: any) => ({ ...f, role: e.target.value }))}><option value="user">User</option><option value="coach">Coach</option><option value="moderator">Moderator</option><option value="admin">Admin</option></select></div>
              <div><label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Avatar URL</label><input className="input-base" value={userEditForm.avatar} onChange={e => setUserEditForm((f: any) => ({ ...f, avatar: e.target.value }))} /></div>
              <div><label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Points</label><input className="input-base" type="number" value={userEditForm.points} onChange={e => setUserEditForm((f: any) => ({ ...f, points: e.target.value }))} /></div>
              <div><label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Steps</label><input className="input-base" type="number" value={userEditForm.steps} onChange={e => setUserEditForm((f: any) => ({ ...f, steps: e.target.value }))} /></div>
              <div><label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Step Goal</label><input className="input-base" type="number" value={userEditForm.step_goal} onChange={e => setUserEditForm((f: any) => ({ ...f, step_goal: e.target.value }))} /></div>
              <div><label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Height</label><input className="input-base" type="number" value={userEditForm.height} onChange={e => setUserEditForm((f: any) => ({ ...f, height: e.target.value }))} /></div>
              <div><label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Weight</label><input className="input-base" type="number" value={userEditForm.weight} onChange={e => setUserEditForm((f: any) => ({ ...f, weight: e.target.value }))} /></div>
              <div><label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Gender</label><input className="input-base" value={userEditForm.gender} onChange={e => setUserEditForm((f: any) => ({ ...f, gender: e.target.value }))} /></div>
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Medical History</label>
              <textarea className="input-base" rows={3} value={userEditForm.medical_history} onChange={e => setUserEditForm((f: any) => ({ ...f, medical_history: e.target.value }))} style={{ resize: "vertical" }} />
            </div>

            <div style={{ marginTop: 10 }}>
              <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Medical File URL</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input className="input-base" value={userEditForm.medical_file_url} onChange={e => setUserEditForm((f: any) => ({ ...f, medical_file_url: e.target.value }))} style={{ flex: 1, minWidth: 220 }} />
                <label style={{ padding: "10px 12px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--bg-surface)", cursor: medicalUploading ? "not-allowed" : "pointer", color: "var(--text-secondary)", fontSize: 12, whiteSpace: "nowrap" }}>
                  {medicalUploading ? "Uploading..." : "Upload Medical File"}
                  <input type="file" hidden accept="image/*" disabled={medicalUploading} onChange={e => { const f = e.target.files?.[0]; if (f) uploadMedicalForUser(f); }} />
                </label>
              </div>
            </div>

            <div style={{ display: "flex", gap: 14, marginTop: 14, flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <input type="checkbox" checked={!!userEditForm.is_premium} disabled={userEditForm.role !== 'user'} onChange={e => setUserEditForm((f: any) => ({ ...f, is_premium: e.target.checked }))} /> {t("premium")}
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}><input type="checkbox" checked={!!userEditForm.membership_paid} onChange={e => setUserEditForm((f: any) => ({ ...f, membership_paid: e.target.checked }))} /> Membership Paid</label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}><input type="checkbox" checked={!!userEditForm.coach_membership_active} onChange={e => setUserEditForm((f: any) => ({ ...f, coach_membership_active: e.target.checked }))} /> {t("coach_membership")} {t("active")}</label>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <button onClick={() => setShowUserEditModal(false)} style={{ padding: "10px 14px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--bg-surface)", color: "var(--text-secondary)", cursor: "pointer" }}>Cancel</button>
              <button onClick={saveUserEdit} disabled={userEditSaving} style={{ padding: "10px 14px", borderRadius: 9, border: "none", background: userEditSaving ? "var(--bg-surface)" : "var(--accent)", color: userEditSaving ? "var(--text-muted)" : "#0A0A0B", cursor: userEditSaving ? "not-allowed" : "pointer", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700 }}>
                {userEditSaving ? "Saving..." : "Save User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gift Modal */}
      {showGiftModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 440 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 16, fontWeight: 700 }}>🎁 Send Gift</p>
              <button onClick={() => setShowGiftModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={20} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>Recipient</label>
                <select className="input-base" value={giftForm.user_id} onChange={e => setGiftForm(f => ({ ...f, user_id: Number(e.target.value) }))}>
                  <option value={0}>Select user...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>Gift Title</label>
                <input className="input-base" value={giftForm.title} onChange={e => setGiftForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Welcome Bonus" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>{t("table_type")}</label>
                  <select className="input-base" value={giftForm.type} onChange={e => setGiftForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="points">Points</option>
                    <option value="premium">Premium Access</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>Value</label>
                  <input className="input-base" type="number" value={giftForm.value} onChange={e => setGiftForm(f => ({ ...f, value: Number(e.target.value) }))} min={0} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>Message (optional)</label>
                <textarea className="input-base" value={giftForm.description} onChange={e => setGiftForm(f => ({ ...f, description: e.target.value }))} placeholder="Personal message..." rows={2} style={{ resize: "none" }} />
              </div>
              <button onClick={sendGift} style={{ padding: "12px", borderRadius: 10, backgroundColor: "var(--accent)", color: "#0A0A0B", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Gift size={15} /> Send Gift
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Modal */}
      {showVideoModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 16, fontWeight: 700 }}>🎬 Upload Training Video</p>
              <button onClick={() => setShowVideoModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={20} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>Title *</label>
                <input className="input-base" value={videoForm.title} onChange={e => setVideoForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Full Body HIIT Blast" />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>Video File * (.mp4, .mov, .webm — max 500MB)</label>
                <div style={{ border: "2px dashed var(--border)", borderRadius: 10, padding: "18px 14px", textAlign: "center", cursor: "pointer", backgroundColor: videoFile ? "rgba(16,185,129,0.07)" : "var(--bg-surface)" }}
                  onClick={() => document.getElementById("videoFileInput")?.click()}>
                  {videoFile ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <Play size={18} color="var(--accent)" />
                      <span style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>{videoFile.name}</span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>({(videoFile.size / 1024 / 1024).toFixed(1)} MB)</span>
                    </div>
                  ) : (
                    <div>
                      <Play size={28} color="var(--text-muted)" style={{ marginBottom: 6 }} />
                      <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Click to select video file</p>
                    </div>
                  )}
                </div>
                <input id="videoFileInput" type="file" accept="video/*" style={{ display: "none" }} onChange={e => setVideoFile(e.target.files?.[0] || null)} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>Thumbnail Image (optional)</label>
                <div style={{ border: "1px dashed var(--border)", borderRadius: 10, padding: "12px 14px", textAlign: "center", cursor: "pointer", backgroundColor: "var(--bg-surface)" }}
                  onClick={() => document.getElementById("thumbFileInput")?.click()}>
                  {thumbnailFile ? <span style={{ fontSize: 13, color: "var(--accent)" }}>✅ {thumbnailFile.name}</span>
                    : <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Click to select thumbnail</span>}
                </div>
                <input id="thumbFileInput" type="file" accept="image/*" style={{ display: "none" }} onChange={e => setThumbnailFile(e.target.files?.[0] || null)} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>Description</label>
                <textarea className="input-base" value={videoForm.description} onChange={e => setVideoForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ resize: "none" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>Duration (e.g. 45:00)</label>
                  <input className="input-base" value={videoForm.duration} onChange={e => setVideoForm(f => ({ ...f, duration: e.target.value }))} placeholder="45:00" />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>Category</label>
                  <select className="input-base" value={videoForm.category} onChange={e => setVideoForm(f => ({ ...f, category: e.target.value }))}>
                    {["HIIT", "Strength", "Yoga", "Cardio", "Nutrition", "General"].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>Assign Coach (optional)</label>
                <select className="input-base" value={videoForm.coach_id} onChange={e => setVideoForm(f => ({ ...f, coach_id: e.target.value }))}>
                  <option value="">No coach (general)</option>
                  {coaches.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: 20 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, cursor: "pointer" }}>
                  <input type="checkbox" checked={videoForm.is_premium} onChange={e => setVideoForm(f => ({ ...f, is_premium: e.target.checked }))} style={{ width: 16, height: 16, accentColor: "var(--accent)" }} />
                  <span style={{ color: "var(--text-secondary)" }}>Premium only</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, cursor: "pointer" }}>
                  <input type="checkbox" checked={videoForm.is_short} onChange={e => setVideoForm(f => ({ ...f, is_short: e.target.checked }))} style={{ width: 16, height: 16, accentColor: "var(--accent)" }} />
                  <span style={{ color: "var(--text-secondary)" }}>Shorty (&lt; 2 min)</span>
                </label>
              </div>
              {videoUploadProgress && (
                <div style={{ padding: "10px 14px", borderRadius: 8, backgroundColor: "rgba(16,185,129,0.1)", border: "1px solid var(--accent)", textAlign: "center", fontSize: 13, color: "var(--accent)" }}>
                  ⏳ {videoUploadProgress}
                </div>
              )}
              <button onClick={addVideo} disabled={!!videoUploadProgress} style={{ padding: "13px", borderRadius: 10, backgroundColor: videoUploadProgress ? "var(--bg-surface)" : "var(--red)", color: videoUploadProgress ? "var(--text-muted)" : "#fff", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 14, border: "none", cursor: videoUploadProgress ? "not-allowed" : "pointer" }}>
                {videoUploadProgress ? "Uploading..." : "Upload Video"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
