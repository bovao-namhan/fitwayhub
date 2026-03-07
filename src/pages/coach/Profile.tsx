import { getApiBase } from "@/lib/api";
import { useState, useEffect } from "react";
import { Star, MapPin, Edit3, Save, X, DollarSign, Wallet, CreditCard, ArrowUpCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";

export default function CoachProfile() {
  const { user, token } = useAuth();
  const { t } = useI18n();
  const [editMode, setEditMode] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [profile, setProfile] = useState({
    bio: "", specialty: "", location: "", available: true,
    planTypes: "complete", monthlyPrice: 0, yearlyPrice: 0,
  });
  const [editProfile, setEditProfile] = useState({ ...profile });

  // Credit & withdrawal state
  const [credit, setCredit] = useState(0);
  const [creditTransactions, setCreditTransactions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [paymentMethodType, setPaymentMethodType] = useState("ewallet");
  const [paymentPhone, setPaymentPhone] = useState("");
  const [walletType, setWalletType] = useState("vodafone");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [cardHolderName, setCardHolderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [instapayHandle, setInstapayHandle] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMsg, setWithdrawMsg] = useState("");
  const [showWithdraw, setShowWithdraw] = useState(false);

  const api = (path: string, opts?: RequestInit) =>
    fetch(getApiBase() + path, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts?.headers || {}) } });

  useEffect(() => {
    api("/api/coaching/profile").then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(d => {
      if (d.profile) {
        const p = {
          bio: d.profile.bio || "", specialty: d.profile.specialty || "", location: d.profile.location || "",
          available: Boolean(d.profile.available),
          planTypes: d.profile.plan_types || "complete",
          monthlyPrice: Number(d.profile.monthly_price) || 0,
          yearlyPrice: Number(d.profile.yearly_price) || 0,
        };
        setProfile(p); setEditProfile(p);
      }
    }).catch(() => {});
    if (user?.id) {
      api(`/api/coaching/reviews/${user.id}`).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(d => setReviews(d.reviews || [])).catch(() => {});
    }
    // Fetch credit info
    api("/api/payments/my-credit").then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(d => {
      setCredit(Number(d.credit) || 0);
      setCreditTransactions(d.transactions || []);
      if (d.paymentMethodType) setPaymentMethodType(d.paymentMethodType);
      if (d.paymentPhone) setPaymentPhone(d.paymentPhone);
      if (d.walletType) setWalletType(d.walletType);
      if (d.paypalEmail) setPaypalEmail(d.paypalEmail);
      if (d.cardHolderName) setCardHolderName(d.cardHolderName);
      if (d.cardNumber) setCardNumber(d.cardNumber);
      if (d.instapayHandle) setInstapayHandle(d.instapayHandle);
    }).catch(() => {});
    api("/api/payments/my-withdrawals").then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(d => {
      setWithdrawals(d.withdrawals || []);
    }).catch(() => {});
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const r = await api("/api/coaching/profile", { method: "POST", body: JSON.stringify(editProfile) });
      if (r.ok) {
        setProfile({ ...editProfile });
        setMessage(t("profile_updated"));
        setEditMode(false);
        setTimeout(() => setMessage(""), 3000);
      }
    } catch { setMessage(t("failed_save")); }
    finally { setSaving(false); }
  };

  const savePaymentInfo = async () => {
    try {
      const r = await api("/api/payments/payment-info", { method: "POST", body: JSON.stringify({ paymentMethodType, paymentPhone, walletType, paypalEmail, cardHolderName, cardNumber, instapayHandle }) });
      if (r.ok) { setMessage(t("payment_info_saved")); setTimeout(() => setMessage(""), 3000); }
      else { const d = await r.json(); setMessage(`❌ ${d.message || t("failed_save")}`); }
    } catch { setMessage(t("failed_payment_info")); }
  };

  const requestWithdrawal = async () => {
    setWithdrawMsg("");
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt <= 0) { setWithdrawMsg(t("enter_valid_amount")); return; }
    if (amt > credit) { setWithdrawMsg(t("insufficient_credit")); return; }
    if (!paymentPhone) { setWithdrawMsg(t("set_payment_first")); return; }
    try {
      const r = await api("/api/payments/withdraw", { method: "POST", body: JSON.stringify({ amount: amt }) });
      const d = await r.json();
      if (r.ok) {
        setWithdrawMsg(t("withdrawal_submitted"));
        setCredit(c => c - amt);
        setWithdrawAmount("");
        // Refresh withdrawals
        api("/api/payments/my-withdrawals").then(r2 => r2.json()).then(d2 => setWithdrawals(d2.withdrawals || [])).catch(() => {});
      } else { setWithdrawMsg(d.message || t("failed_withdrawal")); }
    } catch { setWithdrawMsg(t("failed_withdrawal")); }
  };

  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "—";

  const planTypeLabels: Record<string, string> = {
    complete: `${t("workout")} + ${t("nutrition")}`,
    workout: t("workout_only"),
    nutrition: t("nutrition_only"),
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 700, margin: "0 auto" }}>
      {/* Profile header */}
      <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: "28px 28px" }}>
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
          <img src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} alt={user?.name} style={{ width: 80, height: 80, borderRadius: "50%", backgroundColor: "var(--bg-surface)", border: "3px solid var(--blue)" }} />
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 22, fontWeight: 700 }}>{user?.name}</h1>
            <p style={{ fontSize: 13, color: "var(--blue)", marginTop: 2 }}>{profile.specialty || t("fitness_coach")}</p>
            {profile.location && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6, fontSize: 12, color: "var(--text-muted)" }}>
                <MapPin size={12} /> {profile.location}
              </div>
            )}
            <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--amber)", fontWeight: 700 }}>
                <Star size={14} style={{ fill: reviews.length > 0 ? "var(--amber)" : "none" }} /> {avgRating}
                <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 400 }}>({reviews.length} {t("reviews").toLowerCase()})</span>
              </div>
              <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: profile.available ? "rgba(200,255,0,0.1)" : "var(--bg-surface)", color: profile.available ? "var(--accent)" : "var(--text-muted)", border: `1px solid ${profile.available ? "rgba(200,255,0,0.25)" : "var(--border)"}` }}>
                {profile.available ? `● ${t("available")}` : `○ ${t("unavailable")}`}
              </span>
            </div>
          </div>
          <button onClick={() => { setEditMode(true); setEditProfile({ ...profile }); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 9, background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            <Edit3 size={13} /> {t("edit_profile")}
          </button>
        </div>
      </div>

      {message && <div style={{ padding: "10px 16px", backgroundColor: message.startsWith("✅") ? "var(--accent-dim)" : "rgba(255,68,68,0.08)", border: `1px solid ${message.startsWith("✅") ? "var(--accent)" : "var(--red)"}`, borderRadius: 10, fontSize: 13, color: message.startsWith("✅") ? "var(--accent)" : "var(--red)" }}>{message}</div>}

      {/* Stats cards */}
      <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 22px" }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            { label: t("monthly_plan"), value: profile.monthlyPrice > 0 ? `${profile.monthlyPrice} EGP` : t("not_set"), color: "var(--blue)" },
            { label: t("yearly_plan"), value: profile.yearlyPrice > 0 ? `${profile.yearlyPrice} EGP` : t("not_set"), color: "var(--cyan)" },
            { label: t("plan_type"), value: planTypeLabels[profile.planTypes] || profile.planTypes, color: "var(--amber)" },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, minWidth: 100, backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
              <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{s.label}</p>
              <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Credit & Earnings */}
      <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Wallet size={18} color="var(--accent)" />
            <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 15, fontWeight: 700 }}>{t("earnings_credit")}</p>
          </div>
          <button onClick={() => setShowWithdraw(!showWithdraw)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: "var(--accent-dim)", border: "1px solid rgba(200,255,0,0.25)", color: "var(--accent)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            <ArrowUpCircle size={13} /> {t("withdraw")}
          </button>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 120, background: "linear-gradient(135deg, rgba(200,255,0,0.08), rgba(200,255,0,0.02))", border: "1px solid rgba(200,255,0,0.2)", borderRadius: 14, padding: "18px 16px", textAlign: "center" }}>
            <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{t("available_credit")}</p>
            <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 28, fontWeight: 700, color: "var(--accent)" }}>{credit.toFixed(0)} <span style={{ fontSize: 14 }}>EGP</span></p>
          </div>
        </div>

        {/* Payment info */}
        <div style={{ backgroundColor: "var(--bg-surface)", borderRadius: 12, padding: "14px 16px", marginBottom: 12, border: "1px solid var(--border)" }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>{t("payment_info")}</p>

          {/* Method type selector */}
          <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
            {([
              { id: "ewallet", label: "📱 E-Wallet", color: "#E60000" },
              { id: "paypal", label: "🅿️ PayPal", color: "#003087" },
              { id: "credit_card", label: "💳 Card", color: "#1A73E8" },
              { id: "instapay", label: "⚡ InstaPay", color: "#FF6900" },
            ] as const).map(m => (
              <button key={m.id} onClick={() => setPaymentMethodType(m.id)} style={{ flex: 1, minWidth: 70, padding: "8px 6px", borderRadius: 8, border: `1px solid ${paymentMethodType === m.id ? m.color : "var(--border)"}`, background: paymentMethodType === m.id ? `${m.color}12` : "transparent", color: paymentMethodType === m.id ? m.color : "var(--text-muted)", cursor: "pointer", fontSize: 11, fontWeight: 600, transition: "all 0.2s" }}>
                {m.label}
              </button>
            ))}
          </div>

          {/* E-Wallet fields */}
          {paymentMethodType === "ewallet" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 6 }}>
                {(["vodafone", "orange", "we"] as const).map(w => {
                  const colors: Record<string, string> = { vodafone: "#E60000", orange: "#FF6900", we: "#7B2D8E" };
                  const icons: Record<string, string> = { vodafone: "🔴", orange: "🟠", we: "🟣" };
                  return (
                    <button key={w} onClick={() => setWalletType(w)} style={{ flex: 1, padding: "7px 4px", borderRadius: 8, border: `1px solid ${walletType === w ? colors[w] : "var(--border)"}`, background: walletType === w ? `${colors[w]}14` : "transparent", color: walletType === w ? colors[w] : "var(--text-muted)", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
                      {icons[w]} {w.charAt(0).toUpperCase() + w.slice(1)}
                    </button>
                  );
                })}
              </div>
              <input value={paymentPhone} onChange={e => setPaymentPhone(e.target.value)} placeholder="01012345678" className="input-base" />
            </div>
          )}

          {/* PayPal fields */}
          {paymentMethodType === "paypal" && (
            <input value={paypalEmail} onChange={e => setPaypalEmail(e.target.value)} placeholder="your@paypal.com" type="email" className="input-base" />
          )}

          {/* Credit Card fields */}
          {paymentMethodType === "credit_card" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input value={cardHolderName} onChange={e => setCardHolderName(e.target.value)} placeholder={t("card_holder_name")} className="input-base" />
              <input value={cardNumber} onChange={e => setCardNumber(e.target.value)} placeholder={t("card_number")} className="input-base" />
            </div>
          )}

          {/* InstaPay fields */}
          {paymentMethodType === "instapay" && (
            <input value={instapayHandle} onChange={e => setInstapayHandle(e.target.value)} placeholder="InstaPay handle or IPA" className="input-base" />
          )}

          <button onClick={savePaymentInfo} style={{ marginTop: 10, width: "100%", padding: "9px", borderRadius: 8, background: "var(--blue)", border: "none", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>{t("save_payment_info")}</button>
        </div>

        {/* Withdraw form */}
        {showWithdraw && (
          <div style={{ backgroundColor: "var(--bg-surface)", borderRadius: 12, padding: "14px 16px", marginBottom: 12, border: "1px solid var(--border)" }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>{t("request_withdrawal")}</p>
            <div style={{ display: "flex", gap: 8 }}>
              <input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} placeholder={t("amount_egp")} min="1" className="input-base" style={{ flex: 1 }} />
              <button onClick={requestWithdrawal} style={{ padding: "0 16px", borderRadius: 8, background: "var(--accent)", border: "none", color: "#0A0A0B", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "'Chakra Petch', sans-serif", whiteSpace: "nowrap" }}>{t("submit")}</button>
            </div>
            {withdrawMsg && <p style={{ fontSize: 12, color: withdrawMsg.startsWith("✅") ? "var(--accent)" : "var(--red)", marginTop: 8 }}>{withdrawMsg}</p>}
          </div>
        )}

        {/* Withdrawal history */}
        {withdrawals.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{t("withdrawal_history")}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto" }}>
              {withdrawals.map((w: any) => (
                <div key={w.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", backgroundColor: "var(--bg-surface)", borderRadius: 8, border: "1px solid var(--border)" }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{w.amount} EGP</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8 }}>{new Date(w.created_at).toLocaleDateString()}</span>
                  </div>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, fontWeight: 600, background: w.status === 'approved' ? "rgba(200,255,0,0.1)" : w.status === 'rejected' ? "rgba(255,68,68,0.1)" : "rgba(255,179,64,0.1)", color: w.status === 'approved' ? "var(--accent)" : w.status === 'rejected' ? "var(--red)" : "var(--amber)", border: `1px solid ${w.status === 'approved' ? "rgba(200,255,0,0.25)" : w.status === 'rejected' ? "rgba(255,68,68,0.25)" : "rgba(255,179,64,0.25)"}` }}>
                    {w.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent transactions */}
        {creditTransactions.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{t("recent_transactions")}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto" }}>
              {creditTransactions.slice(0, 10).map((t: any) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", backgroundColor: "var(--bg-surface)", borderRadius: 8, border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)", flex: 1 }}>{t.description || t.type}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: t.amount > 0 ? "var(--accent)" : "var(--red)" }}>
                    {t.amount > 0 ? "+" : ""}{t.amount} EGP
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {profile.bio && (
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 22px" }}>
          <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, fontWeight: 700, marginBottom: 10 }}>{t("about_me")}</p>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>{profile.bio}</p>
        </div>
      )}

      {reviews.length > 0 && (
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 22px" }}>
          <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, fontWeight: 700, marginBottom: 14 }}>{t("reviews")} ({reviews.length})</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {reviews.map((rv, i) => (
              <div key={i} style={{ backgroundColor: "var(--bg-surface)", borderRadius: 12, padding: "14px 16px", border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{ display: "flex", gap: 2 }}>{[1,2,3,4,5].map(s => <Star key={s} size={13} color="var(--amber)" style={{ fill: s <= rv.rating ? "var(--amber)" : "transparent" }} />)}</div>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{rv.userName || t("role_user")}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>{new Date(rv.created_at).toLocaleDateString()}</span>
                </div>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>{rv.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!profile.bio && reviews.length === 0 && (
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px dashed var(--border)", borderRadius: 16, padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
          <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 15, marginBottom: 8 }}>{t("profile_empty")}</p>
          <p style={{ fontSize: 13, marginBottom: 16 }}>{t("profile_empty_desc")}</p>
          <button onClick={() => { setEditMode(true); setEditProfile({ ...profile }); }} style={{ padding: "10px 24px", borderRadius: 9, background: "var(--blue)", border: "none", color: "#fff", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{t("setup_profile")}</button>
        </div>
      )}

      {/* Edit Profile Modal */}
      {editMode && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 520, maxHeight: "90dvh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 16, fontWeight: 700 }}>{t("edit_profile")}</p>
              <button onClick={() => setEditMode(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={20} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: t("specialty"), field: "specialty" as const, placeholder: t("specialty_placeholder") },
                { label: t("location"), field: "location" as const, placeholder: t("location_placeholder") },
              ].map(f => (
                <div key={f.field}>
                  <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>{f.label}</label>
                  <input className="input-base" value={editProfile[f.field] as string} onChange={e => setEditProfile(p => ({ ...p, [f.field]: e.target.value }))} placeholder={f.placeholder} />
                </div>
              ))}
              {/* Plan Types */}
              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.07em" }}>{t("plan_type_offered")}</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {([
                    { id: "complete", label: `🏆 ${t("complete_plan")}`, desc: `${t("workout")} + ${t("nutrition")}` },
                    { id: "workout", label: `💪 ${t("workout_only")}`, desc: t("workout_only_desc") },
                    { id: "nutrition", label: `🥗 ${t("nutrition_only")}`, desc: t("nutrition_only_desc") },
                  ] as const).map(plan => (
                    <button key={plan.id} type="button" onClick={() => setEditProfile(p => ({ ...p, planTypes: plan.id }))} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10, border: `1px solid ${editProfile.planTypes === plan.id ? "var(--accent)" : "var(--border)"}`, background: editProfile.planTypes === plan.id ? "var(--accent-dim)" : "var(--bg-surface)", cursor: "pointer", textAlign: "left" }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: editProfile.planTypes === plan.id ? "var(--accent)" : "var(--text-primary)" }}>{plan.label}</p>
                        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{plan.desc}</p>
                      </div>
                      {editProfile.planTypes === plan.id && <span style={{ color: "var(--accent)" }}>✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subscription Pricing */}
              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>{t("monthly_subscription_price")}</label>
                <input className="input-base" type="number" value={editProfile.monthlyPrice} onChange={e => setEditProfile(p => ({ ...p, monthlyPrice: Number(e.target.value) }))} min={0} placeholder={t("e_g_300")} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>{t("yearly_subscription_price")}</label>
                <input className="input-base" type="number" value={editProfile.yearlyPrice} onChange={e => setEditProfile(p => ({ ...p, yearlyPrice: Number(e.target.value) }))} min={0} placeholder={t("e_g_3000")} />
              </div>

              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>Bio</label>
                <textarea className="input-base" value={editProfile.bio} onChange={e => setEditProfile(p => ({ ...p, bio: e.target.value }))} placeholder={t("bio_placeholder")} rows={4} style={{ resize: "none" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.07em" }}>{t("availability")}</label>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={editProfile.available} onChange={e => setEditProfile(p => ({ ...p, available: e.target.checked }))} style={{ width: 16, height: 16, accentColor: "var(--accent)" }} />
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{t("available_for_clients")}</span>
                </label>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button onClick={() => setEditMode(false)} style={{ flex: 1, padding: "11px", borderRadius: 10, backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 14 }}>{t("cancel")}</button>
                <button onClick={saveProfile} disabled={saving} style={{ flex: 2, padding: "11px", borderRadius: 10, backgroundColor: "var(--blue)", color: "#fff", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 14, border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <Save size={14} /> {saving ? t("saving") : t("save_profile")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
