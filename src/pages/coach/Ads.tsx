import { getApiBase } from "@/lib/api";
import { useState, useEffect, useRef, useCallback, type CSSProperties, type DragEvent, type ChangeEvent } from "react";
import { Plus, X, Eye, TrendingUp, Megaphone, Edit3, Trash2, Lock, Crown, ArrowLeft, Upload, Image as ImageIcon, Video, Target, Users, Radio, Clock, Calendar, CheckCircle, AlertCircle, MousePointerClick, DollarSign } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import axios from "axios";

interface Ad {
  id: string; title: string; description: string; specialty: string;
  status: "active" | "pending" | "rejected" | "draft" | "expired";
  impressions: number; clicks: number; created_at: string;
  cta: string; highlight: string; image_url?: string; video_url?: string;
  payment_method?: string; ad_type?: string; media_type?: string;
  objective?: string; duration_hours?: number; duration_days?: number;
  paid_amount?: number; paid_minutes?: number; payment_status?: string;
  payment_proof?: string; admin_note?: string;
  boost_start?: string; boost_end?: string;
}

const specialties = ["Strength & Conditioning", "HIIT & Weight Loss", "Yoga & Mobility", "Nutrition & Fitness", "Cardio & Endurance"];
const RATE_PER_MIN = 4;

export default function CoachAds() {
  const { user, token } = useAuth();
  const { t } = useI18n();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => { const h = () => setIsMobile(window.innerWidth < 768); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Ad | null>(null);
  const [message, setMessage] = useState("");
  const [modalStep, setModalStep] = useState<"details" | "payment">("details");
  const [saving, setSaving] = useState(false);

  // Ad form fields
  const [form, setForm] = useState({ title: "", description: "", specialty: specialties[0], cta: "Book Free Consultation", highlight: "" });
  const [adType, setAdType] = useState<"community" | "home_banner">("community");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [objective, setObjective] = useState<"coaching" | "awareness">("coaching");
  const [durationHours, setDurationHours] = useState(0);
  const [durationDays, setDurationDays] = useState(1);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Payment
  const [boostPhone, setBoostPhone] = useState("");
  const [boostProofFile, setBoostProofFile] = useState<File | null>(null);
  const [adPayError, setAdPayError] = useState("");
  const [adPayProcessing, setAdPayProcessing] = useState(false);
  const [ewalletPhone, setEwalletPhone] = useState("+20 12 8790 4338");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);

  const totalMinutes = (durationHours * 60) + (durationDays * 24 * 60);
  const totalCost = totalMinutes * RATE_PER_MIN;

  const showMsg = (m: string) => { setMessage(m); setTimeout(() => setMessage(""), 3500); };

  useEffect(() => {
    fetchAds();
    fetch(getApiBase() + "/api/payments/public-settings").then(r => r.json()).then(d => {
      if (d.settings?.ewallet_phone) setEwalletPhone(d.settings.ewallet_phone);
    }).catch(() => {});
  }, []);

  const fetchAds = async () => {
    try {
      setLoading(true);
      const res = await axios.get(getApiBase() + "/api/coach/ads", { headers: { Authorization: `Bearer ${token}` } });
      setAds(res.data.ads || []);
    } catch { setAds([]); } finally { setLoading(false); }
  };

  const resetForm = () => {
    setForm({ title: "", description: "", specialty: specialties[0], cta: "Book Free Consultation", highlight: "" });
    setAdType("community"); setMediaType("image"); setObjective("coaching");
    setDurationHours(0); setDurationDays(1);
    setMediaFile(null); setMediaPreview(null);
    setBoostPhone(""); setBoostProofFile(null); setAdPayError("");
    setModalStep("details"); setSaving(false);
  };

  const openCreate = () => { setEditing(null); resetForm(); setShowModal(true); };
  const openEdit = (ad: Ad) => {
    setEditing(ad);
    setForm({ title: ad.title, description: ad.description, specialty: ad.specialty, cta: ad.cta, highlight: ad.highlight || "" });
    setAdType((ad.ad_type as any) || "community");
    setMediaType((ad.media_type as any) || "image");
    setObjective((ad.objective as any) || "coaching");
    setDurationHours(ad.duration_hours || 0);
    setDurationDays(ad.duration_days || 1);
    setMediaFile(null);
    setMediaPreview(ad.image_url || ad.video_url || null);
    setModalStep("details"); setSaving(false);
    setShowModal(true);
  };

  // Drag and drop handlers
  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (mediaType === "image" && !file.type.startsWith("image/")) { showMsg(t("coach_ads_drop_image")); return; }
    if (mediaType === "video" && !file.type.startsWith("video/")) { showMsg(t("coach_ads_drop_video")); return; }
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  }, [mediaType]);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const saveAd = async () => {
    if (!form.title || !form.description) { showMsg(t("coach_ads_title_description_required")); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
      fd.append("ad_type", adType);
      fd.append("media_type", mediaType);
      fd.append("objective", objective);
      fd.append("duration_hours", String(durationHours));
      fd.append("duration_days", String(durationDays));
      fd.append("paymentMethod", "ewallet");
      if (mediaFile) {
        fd.append(mediaType === "image" ? "image" : "video", mediaFile);
      }
      if (editing) {
        await axios.put(`/api/coach/ads/${editing.id}`, fd, { headers: { Authorization: `Bearer ${token}` } });
        showMsg(t("coach_ads_updated"));
      } else {
        await axios.post(getApiBase() + "/api/coach/ads", fd, { headers: { Authorization: `Bearer ${token}` } });
      }
      return true;
    } catch (err: any) {
      showMsg(err.response?.data?.message || t("coach_ads_save_failed"));
      return false;
    } finally { setSaving(false); }
  };

  const handleSubmitWithPayment = async () => {
    setAdPayError(""); setAdPayProcessing(true);
    try {
      const ok = await saveAd();
      if (!ok) { setAdPayProcessing(false); return; }
      // Get latest ad
      const adsRes = await fetch(getApiBase() + "/api/coach/ads", { headers: { Authorization: `Bearer ${token}` } });
      const adsData = await adsRes.json();
      const latestAd = (adsData.ads || [])[0];
      if (!latestAd) { setAdPayProcessing(false); return; }
      // Upload proof if provided
      let proofUrl = null;
      if (boostProofFile) {
        const pfd = new FormData(); pfd.append("image", boostProofFile);
        const ur = await fetch(getApiBase() + "/api/user/upload-proof", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: pfd });
        if (ur.ok) { const ud = await ur.json(); proofUrl = ud.url; }
      }
      await fetch(getApiBase() + `/api/coach/ads/${latestAd.id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ duration_minutes: totalMinutes, payment_method: "ewallet", proof_url: proofUrl, phone: boostPhone })
      });
      showMsg(t("coach_ads_submitted"));
      setShowModal(false); fetchAds();
    } catch (err: any) {
      setAdPayError(err.message || t("coach_ads_submission_failed"));
    } finally { setAdPayProcessing(false); }
  };

  const deleteAd = async (id: string) => {
    if (!confirm(t("coach_ads_remove_confirm"))) return;
    try {
      await axios.delete(`/api/coach/ads/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      showMsg(t("coach_ads_removed")); fetchAds();
    } catch { showMsg(t("coach_ads_delete_failed")); }
  };

  const totalImpressions = ads.reduce((s, a) => s + (a.impressions || 0), 0);
  const totalClicks = ads.reduce((s, a) => s + (a.clicks || 0), 0);

  const statusStyle = (status: Ad["status"]) => ({
    active: { bg: "rgba(200,255,0,0.1)", color: "var(--accent)", label: `✓ ${t("active")}` },
    pending: { bg: "rgba(255,179,64,0.1)", color: "var(--amber)", label: `⏳ ${t("coach_ads_under_review")}` },
    rejected: { bg: "rgba(255,68,68,0.08)", color: "var(--red)", label: `✗ ${t("rejected")}` },
    expired: { bg: "rgba(128,128,128,0.08)", color: "var(--text-muted)", label: `⌛ ${t("coach_ads_expired")}` },
    draft: { bg: "var(--bg-surface)", color: "var(--text-muted)", label: t("coach_ads_draft") },
  }[status]);

  const iStyle: CSSProperties = { backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 14px", width: "100%", fontSize: 14, color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif", outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: "clamp(18px,4vw,26px)", fontWeight: 700 }}>{t("my_ads")}</h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 3 }}>{t("coach_ads_subtitle")}</p>
        </div>
        <button onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 10, background: "var(--blue)", border: "none", color: "#fff", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          <Plus size={15} /> {t("create_ad")}
        </button>
      </div>

      {/* Rate info */}
      <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(255,179,64,0.07)", border: "1px solid rgba(255,179,64,0.2)", fontSize: 13, color: "var(--amber)", display: "flex", gap: 8, alignItems: "center" }}>
        <Clock size={15} />
        <span>{t("coach_ads_rate_prefix")} <strong>{RATE_PER_MIN} EGP / {t("minute")}</strong> {t("coach_ads_rate_suffix")}</span>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10 }}>
        {[
          { label: t("impressions"), value: totalImpressions.toLocaleString(), icon: Eye, color: "var(--blue)" },
          { label: t("clicks"), value: totalClicks, icon: MousePointerClick, color: "var(--accent)" },
          { label: "CTR", value: totalImpressions > 0 ? `${((totalClicks / totalImpressions) * 100).toFixed(1)}%` : "—", icon: TrendingUp, color: "var(--cyan)" },
          { label: t("active"), value: ads.filter(a => a.status === "active").length, icon: Radio, color: "var(--accent)" },
          { label: t("pending"), value: ads.filter(a => a.status === "pending").length, icon: Clock, color: "var(--amber)" },
          { label: t("coach_ads_spent"), value: `${ads.reduce((s, a) => s + ((a.payment_status === "approved" ? a.paid_amount : 0) || 0), 0)} EGP`, icon: DollarSign, color: "var(--amber)" },
        ].map(s => (
          <div key={s.label} style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</p>
              <s.icon size={14} color={s.color} />
            </div>
            <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {message && <div style={{ padding: "10px 16px", backgroundColor: "var(--accent-dim)", border: "1px solid var(--accent)", borderRadius: 10, fontSize: 13, color: "var(--accent)" }}>{message}</div>}

      {/* Ads List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>{t("coach_ads_loading")}</div>
        ) : ads.length === 0 ? (
          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 60, textAlign: "center", color: "var(--text-muted)" }}>
            <Megaphone size={40} strokeWidth={1} style={{ margin: "0 auto 12px" }} />
            <p style={{ fontFamily: "'Chakra Petch', sans-serif", marginBottom: 4 }}>{t("no_ads")}</p>
            <p style={{ fontSize: 13 }}>{t("create_first_ad")}</p>
          </div>
        ) : ads.map(ad => {
          const st = statusStyle(ad.status);
          const adCtr = (ad.impressions || 0) > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : "0";
          const boostEnd = ad.boost_end ? new Date(ad.boost_end) : null;
          const boostStart = ad.boost_start ? new Date(ad.boost_start) : null;
          const isExpired = boostEnd && boostEnd < new Date();
          const remainingMs = boostEnd && !isExpired ? boostEnd.getTime() - Date.now() : 0;
          const remainingH = Math.floor(remainingMs / 3600000);
          const remainingD = Math.floor(remainingH / 24);
          const remH = remainingH % 24;
          const remMin = Math.floor((remainingMs % 3600000) / 60000);

          // Time & money tracking
          const totalPaidMinutes = Number(ad.paid_minutes) || 0;
          const totalPaidAmount = Number(ad.paid_amount) || 0;
          const elapsedMs = boostStart && !isExpired && ad.status === "active" ? Date.now() - boostStart.getTime() : (boostStart && boostEnd ? boostEnd.getTime() - boostStart.getTime() : 0);
          const elapsedMin = Math.min(Math.floor(elapsedMs / 60000), totalPaidMinutes);
          const moneySpent = elapsedMin * RATE_PER_MIN;
          const remainingMin = Math.max(totalPaidMinutes - elapsedMin, 0);
          const moneyRemaining = Math.max(totalPaidAmount - moneySpent, 0);
          return (
            <div key={ad.id} style={{ backgroundColor: "var(--bg-card)", border: `1px solid ${ad.status === "active" ? "rgba(200,255,0,0.2)" : "var(--border)"}`, borderRadius: 16, padding: "18px 20px", opacity: ad.status === "expired" ? 0.7 : 1 }}>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                {(ad.image_url || ad.video_url) && (
                  <div style={{ width: 80, height: 80, borderRadius: 10, overflow: "hidden", flexShrink: 0, backgroundColor: "var(--bg-surface)" }}>
                    {ad.media_type === "video" && ad.video_url
                      ? <video src={ad.video_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <img src={ad.image_url} alt={ad.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                    <div>
                      <h3 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 15, fontWeight: 700 }}>{ad.title}</h3>
                      <div style={{ display: "flex", gap: 5, marginTop: 4, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 600, backgroundColor: st.bg, color: st.color }}>{st.label}</span>
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, backgroundColor: "var(--bg-surface)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                          {ad.ad_type === "home_banner" ? t("home_banner") : t("community_post")}
                        </span>
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, backgroundColor: "var(--bg-surface)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                          {ad.objective === "coaching" ? t("coach_ads_booking") : t("coach_ads_awareness")}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {ad.status !== "active" && ad.status !== "expired" && (
                        <button onClick={() => openEdit(ad)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 12 }}>
                          <Edit3 size={12} /> {t("edit")}
                        </button>
                      )}
                      <button onClick={() => deleteAd(ad.id)} style={{ padding: "6px 10px", borderRadius: 8, background: "rgba(255,68,68,0.08)", border: "1px solid rgba(255,68,68,0.2)", color: "var(--red)", cursor: "pointer" }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 8 }}>{ad.description.slice(0, 120)}{ad.description.length > 120 ? "…" : ""}</p>

                  {/* Payment & Boost Status */}
                  {(ad.paid_amount || ad.payment_status || ad.boost_end) && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                      {ad.payment_status && (
                        <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, padding: "3px 9px", borderRadius: 20, fontWeight: 600,
                          background: ad.payment_status === "approved" ? "rgba(200,255,0,0.08)" : ad.payment_status === "pending" ? "rgba(255,179,64,0.1)" : "rgba(255,68,68,0.08)",
                          color: ad.payment_status === "approved" ? "var(--accent)" : ad.payment_status === "pending" ? "var(--amber)" : "var(--red)",
                          border: `1px solid ${ad.payment_status === "approved" ? "rgba(200,255,0,0.2)" : ad.payment_status === "pending" ? "rgba(255,179,64,0.3)" : "rgba(255,68,68,0.2)"}`,
                        }}>
                          {ad.payment_status === "approved" ? <CheckCircle size={10} /> : ad.payment_status === "pending" ? <Clock size={10} /> : <AlertCircle size={10} />}
                          {ad.paid_amount || 0} EGP · {ad.payment_status}
                        </span>
                      )}
                      {boostEnd && !isExpired && ad.status === "active" && (
                        <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, backgroundColor: "rgba(200,255,0,0.07)", color: "var(--accent)", border: "1px solid rgba(200,255,0,0.2)", fontWeight: 600 }}>
                          ⏱ {remainingD > 0 ? `${remainingD}d ` : ""}{remH}h {t("remaining")}
                        </span>
                      )}
                      {isExpired && (
                        <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, backgroundColor: "rgba(128,128,128,0.08)", color: "var(--text-muted)", border: "1px solid rgba(128,128,128,0.2)", fontWeight: 600 }}>
                          ⌛ {t("coach_ads_boost_ended")} {boostEnd?.toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Admin rejection note */}
                  {ad.admin_note && ad.status === "rejected" && (
                    <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(255,68,68,0.05)", border: "1px solid rgba(255,68,68,0.2)", marginBottom: 8, fontSize: 12, color: "var(--text-secondary)" }}>
                      <strong style={{ color: "var(--red)" }}>{t("admin")}: </strong>{ad.admin_note}
                    </div>
                  )}

                  {/* Time & Money Analytics */}
                  {totalPaidMinutes > 0 && ad.payment_status === "approved" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                      <div style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(59,139,255,0.06)", border: "1px solid rgba(59,139,255,0.15)" }}>
                        <p style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{t("time_spent")}</p>
                        <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--blue)" }}>
                          {elapsedMin >= 1440 ? `${Math.floor(elapsedMin / 1440)}d ${Math.floor((elapsedMin % 1440) / 60)}h` : elapsedMin >= 60 ? `${Math.floor(elapsedMin / 60)}h ${elapsedMin % 60}m` : `${elapsedMin}m`}
                        </p>
                      </div>
                      <div style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(255,179,64,0.06)", border: "1px solid rgba(255,179,64,0.15)" }}>
                        <p style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{t("money_spent")}</p>
                        <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--amber)" }}>{moneySpent} EGP</p>
                      </div>
                      <div style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(200,255,0,0.06)", border: "1px solid rgba(200,255,0,0.15)" }}>
                        <p style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{t("time_left")}</p>
                        <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--accent)" }}>
                          {remainingMin >= 1440 ? `${Math.floor(remainingMin / 1440)}d ${Math.floor((remainingMin % 1440) / 60)}h` : remainingMin >= 60 ? `${Math.floor(remainingMin / 60)}h ${remainingMin % 60}m` : `${remainingMin}m`}
                        </p>
                      </div>
                      <div style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.15)" }}>
                        <p style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{t("money_left")}</p>
                        <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--cyan)" }}>{moneyRemaining} EGP</p>
                      </div>
                    </div>
                  )}

                  {/* Performance row */}
                  <div style={{ display: "flex", gap: 14, fontSize: 11, color: "var(--text-muted)" }}>
                    <span>👁 {(ad.impressions || 0).toLocaleString()}</span>
                    <span>🖱 {ad.clicks || 0}</span>
                    <span style={{ color: "var(--blue)", fontWeight: 600 }}>{adCtr}% CTR</span>
                    <span>🕒 {new Date(ad.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, backgroundColor: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}>
          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: 24, width: "100%", maxWidth: 580, margin: "auto", maxHeight: "95dvh", overflowY: "auto" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 16, fontWeight: 700 }}>{editing ? t("coach_ads_edit") : t("coach_ads_create_new")}</p>
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  {["details", "payment"].map((s, i) => (
                    <div key={s} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: modalStep === s || (s === "details" && modalStep === "payment") ? "var(--blue)" : "var(--bg-surface)", color: modalStep === s || (s === "details" && modalStep === "payment") ? "#fff" : "var(--text-muted)", border: `1px solid ${modalStep === s ? "var(--blue)" : "var(--border)"}` }}>{i+1}</div>
                      <span style={{ fontSize: 11, color: modalStep === s ? "var(--text-primary)" : "var(--text-muted)", textTransform: "capitalize" }}>{s === "details" ? t("coach_ads_details") : t("payment")}</span>
                      {i < 1 && <span style={{ fontSize: 10, color: "var(--text-muted)", margin: "0 2px" }}>→</span>}
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={20} /></button>
            </div>

            {/* ─── STEP 1: AD DETAILS ─── */}
            {modalStep === "details" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Ad Type */}
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.07em" }}>{t("ad_placement")}</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {([ ["community", t("community_post"), t("coach_ads_place_community_desc")] , ["home_banner", t("home_banner"), t("coach_ads_place_banner_desc")]] as const).map(([val, label, desc]) => (
                      <button key={val} onClick={() => setAdType(val)} style={{ padding: "12px 14px", borderRadius: 12, border: `2px solid ${adType === val ? "var(--blue)" : "var(--border)"}`, background: adType === val ? "rgba(59,139,255,0.1)" : "var(--bg-surface)", cursor: "pointer", textAlign: "left" }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: adType === val ? "var(--blue)" : "var(--text-primary)", marginBottom: 4 }}>{label}</p>
                        <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>{desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Objective */}
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.07em" }}>{t("ad_objective")}</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {([ ["coaching", t("coach_ads_objective_coaching"), t("coach_ads_objective_coaching_desc")] , ["awareness", t("coach_ads_objective_awareness"), t("coach_ads_objective_awareness_desc")]] as const).map(([val, label, desc]) => (
                      <button key={val} onClick={() => setObjective(val)} style={{ padding: "12px 14px", borderRadius: 12, border: `2px solid ${objective === val ? "var(--accent)" : "var(--border)"}`, background: objective === val ? "rgba(200,255,0,0.07)" : "var(--bg-surface)", cursor: "pointer", textAlign: "left" }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: objective === val ? "var(--accent)" : "var(--text-primary)", marginBottom: 4 }}>{label}</p>
                        <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>{desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Media Type */}
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.07em" }}>{t("coach_ads_media_type")}</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {([ ["image", <ImageIcon size={16} />, t("image")] , ["video", <Video size={16} />, t("video")] ] as const).map(([val, icon, label]) => (
                      <button key={val} onClick={() => { setMediaType(val); setMediaFile(null); setMediaPreview(null); }} style={{ flex: 1, padding: "10px", borderRadius: 10, border: `2px solid ${mediaType === val ? "var(--cyan)" : "var(--border)"}`, background: mediaType === val ? "rgba(6,182,212,0.1)" : "var(--bg-surface)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: mediaType === val ? "var(--cyan)" : "var(--text-secondary)", fontWeight: 600, fontSize: 13 }}>
                        {icon} {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Drag & Drop Media Upload */}
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                    {mediaType === "image" ? t("coach_ads_ad_image") : t("coach_ads_ad_video")} ({t("optional")})
                  </label>
                  <div
                    onDrop={handleDrop}
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onClick={() => fileInputRef.current?.click()}
                    style={{ border: `2px dashed ${isDragging ? "var(--blue)" : mediaFile ? "var(--accent)" : "var(--border)"}`, borderRadius: 12, padding: mediaPreview ? 0 : "32px 16px", textAlign: "center", cursor: "pointer", backgroundColor: isDragging ? "rgba(59,139,255,0.05)" : "var(--bg-surface)", transition: "all 0.2s", overflow: "hidden", position: "relative", minHeight: 100 }}>
                    {mediaPreview ? (
                      <>
                        {mediaType === "video"
                          ? <video src={mediaPreview} controls style={{ width: "100%", maxHeight: 200, display: "block" }} />
                          : <img src={mediaPreview} alt="Preview" style={{ width: "100%", maxHeight: 200, objectFit: "cover", display: "block" }} />}
                        <div style={{ position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 6, padding: "3px 8px", fontSize: 11, color: "#fff" }}>{t("coach_ads_change")}</div>
                      </>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                        <Upload size={28} color={isDragging ? "var(--blue)" : "var(--text-muted)"} />
                        <p style={{ fontSize: 13, color: isDragging ? "var(--blue)" : "var(--text-muted)", fontWeight: isDragging ? 600 : 400 }}>
                          {isDragging ? t("coach_ads_drop_here") : t("coach_ads_drag_upload")}
                        </p>
                        <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          {mediaType === "image" ? "PNG, JPG, WEBP — max 5MB" : "MP4, MOV, WEBM — max 500MB"}
                        </p>
                      </div>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept={mediaType === "image" ? "image/*" : "video/*"} style={{ display: "none" }} onChange={handleFileSelect} />
                </div>

                {/* Title & Description */}
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>{t("ad_title")} *</label>
                  <input style={iStyle} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder={t("coach_ads_title_placeholder")} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>{t("description")} *</label>
                  <textarea style={{ ...iStyle, resize: "none" }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={t("coach_ads_description_placeholder")} rows={3} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>{t("specialty")}</label>
                    <select style={iStyle} value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}>
                      {specialties.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>{t("call_to_action")}</label>
                    <input style={iStyle} value={form.cta} onChange={e => setForm(f => ({ ...f, cta: e.target.value }))} placeholder={t("coach_ads_cta_placeholder")} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>{t("coach_ads_highlight_badge")} ({t("optional")})</label>
                  <input style={iStyle} value={form.highlight} onChange={e => setForm(f => ({ ...f, highlight: e.target.value }))} placeholder={t("coach_ads_highlight_placeholder")} />
                </div>

                {/* Duration */}
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.07em" }}>{t("boost_duration")}</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>{t("days")}</label>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button onClick={() => setDurationDays(Math.max(0, durationDays - 1))} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-surface)", color: "var(--text-primary)", cursor: "pointer", fontSize: 16 }}>−</button>
                        <input type="number" min="0" value={durationDays} onChange={e => setDurationDays(Math.max(0, parseInt(e.target.value) || 0))} style={{ ...iStyle, width: 60, textAlign: "center", padding: "8px" }} />
                        <button onClick={() => setDurationDays(durationDays + 1)} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-surface)", color: "var(--text-primary)", cursor: "pointer", fontSize: 16 }}>+</button>
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>{t("hours")}</label>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button onClick={() => setDurationHours(Math.max(0, durationHours - 1))} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-surface)", color: "var(--text-primary)", cursor: "pointer", fontSize: 16 }}>−</button>
                        <input type="number" min="0" max="23" value={durationHours} onChange={e => setDurationHours(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))} style={{ ...iStyle, width: 60, textAlign: "center", padding: "8px" }} />
                        <button onClick={() => setDurationHours(Math.min(23, durationHours + 1))} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-surface)", color: "var(--text-primary)", cursor: "pointer", fontSize: 16 }}>+</button>
                      </div>
                    </div>
                  </div>
                  {totalMinutes > 0 && (
                    <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(200,255,0,0.07)", border: "1px solid rgba(200,255,0,0.2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                        {durationDays > 0 ? `${durationDays}d ` : ""}{durationHours > 0 ? `${durationHours}h` : ""} = {totalMinutes} {t("minutes")}
                      </span>
                      <span style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 18, fontWeight: 700, color: "var(--accent)" }}>{totalCost} EGP</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => { if (!form.title || !form.description) return; if (editing) { saveAd().then(ok => { if (ok) { setShowModal(false); fetchAds(); } }); } else { setModalStep("payment"); } }}
                  disabled={!form.title || !form.description || saving}
                  style={{ padding: "12px", borderRadius: 11, background: saving ? "var(--bg-surface)" : "var(--blue)", border: "none", color: saving ? "var(--text-muted)" : "#fff", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 14, cursor: !form.title || !form.description || saving ? "not-allowed" : "pointer", opacity: !form.title || !form.description ? 0.5 : 1 }}>
                  {saving ? t("saving") : editing ? t("coach_ads_update_ad") : `${t("coach_ads_next_payment")} (${totalCost} EGP) →`}
                </button>
              </div>
            )}

            {/* ─── STEP 2: PAYMENT ─── */}
            {modalStep === "payment" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Summary */}
                <div style={{ backgroundColor: "var(--bg-surface)", borderRadius: 12, padding: "14px 16px", border: "1px solid var(--border)" }}>
                  <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>📢 {form.title}</p>
                  <div style={{ display: "flex", gap: 10, fontSize: 11, color: "var(--text-muted)", flexWrap: "wrap" }}>
                    <span>{adType === "home_banner" ? t("home_banner") : t("community_post")}</span>
                    <span>{objective === "coaching" ? t("coach_ads_booking") : t("coach_ads_awareness")}</span>
                    {totalMinutes > 0 && <span>⏱ {durationDays > 0 ? `${durationDays}d ` : ""}{durationHours > 0 ? `${durationHours}h` : ""}</span>}
                  </div>
                </div>

                {/* Cost breakdown */}
                <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(255,179,64,0.07)", border: "1px solid rgba(255,179,64,0.25)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                    <span style={{ color: "var(--text-secondary)" }}>{t("duration")}</span>
                    <span>{totalMinutes} {t("minutes")}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                    <span style={{ color: "var(--text-secondary)" }}>{t("rate")}</span>
                    <span>{RATE_PER_MIN} EGP / {t("minute")}</span>
                  </div>
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 700, color: "var(--amber)" }}>{t("total")}</span>
                    <span style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--accent)" }}>{totalCost} EGP</span>
                  </div>
                </div>

                {/* E-wallet instructions */}
                <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(59,139,255,0.07)", border: "1px solid rgba(59,139,255,0.2)" }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--blue)", marginBottom: 8 }}>📱 {t("coach_ads_ewallet_payment")}</p>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6 }}>{t("coach_ads_send") } <strong style={{ color: "var(--accent)" }}>{totalCost} EGP</strong> {t("coach_ads_to")}</p>
                  <div style={{ padding: "10px 14px", borderRadius: 8, background: "var(--bg-surface)", border: "1px solid rgba(59,139,255,0.3)", fontFamily: "monospace", fontSize: 18, fontWeight: 800, color: "var(--blue)", marginBottom: 6 }}>
                    {ewalletPhone}
                    <button onClick={() => navigator.clipboard?.writeText(ewalletPhone)} style={{ float: "right", background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "var(--text-muted)" }}>{t("copy")}</button>
                  </div>
                  <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{t("coach_ads_upload_proof_note")}</p>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 5 }}>{t("coach_ads_your_phone")}</label>
                  <input type="tel" value={boostPhone} onChange={e => setBoostPhone(e.target.value)} placeholder="+20 1XX XXXX XXXX" style={iStyle} />
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 5 }}>{t("coach_ads_payment_screenshot")}</label>
                  <div
                    onClick={() => proofInputRef.current?.click()}
                    style={{ border: `2px dashed ${boostProofFile ? "var(--accent)" : "var(--border)"}`, borderRadius: 10, padding: "16px", textAlign: "center", cursor: "pointer", background: "var(--bg-surface)" }}>
                    {boostProofFile
                      ? <span style={{ fontSize: 13, color: "var(--accent)" }}>✅ {boostProofFile.name}</span>
                      : <><Upload size={20} color="var(--text-muted)" style={{ margin: "0 auto 6px" }} /><p style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("coach_ads_click_upload")}</p></>}
                  </div>
                  <input ref={proofInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => setBoostProofFile(e.target.files?.[0] || null)} />
                </div>

                {adPayError && <div style={{ padding: "10px 14px", backgroundColor: "rgba(255,68,68,0.08)", border: "1px solid rgba(255,68,68,0.25)", borderRadius: 9, fontSize: 13, color: "var(--red)" }}>{adPayError}</div>}

                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setModalStep("details")} style={{ flex: 1, padding: "11px", borderRadius: 10, backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 14 }}>← {t("back")}</button>
                  <button onClick={handleSubmitWithPayment} disabled={adPayProcessing} style={{ flex: 2, padding: "11px", borderRadius: 10, backgroundColor: adPayProcessing ? "var(--bg-surface)" : "var(--blue)", color: adPayProcessing ? "var(--text-muted)" : "#fff", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 14, border: "none", cursor: adPayProcessing ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <Lock size={14} /> {adPayProcessing ? t("coach_ads_submitting") : `${t("submit_pay")} ${totalCost} EGP`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
