import { getApiBase } from "@/lib/api";
import React, { useState, useEffect, useRef } from "react";
import { Smartphone, CheckCircle, Upload, X, AlertCircle } from "lucide-react";
import { detectPlatform, isNativeApp } from "@/lib/iap";

declare global {
  interface Window { paypal?: any; }
}

interface PaymentFormProps {
  amount: number;
  plan: "monthly" | "annual";
  type: "user" | "coach";
  token: string | null;
  onSuccess: () => void;
  onError?: (msg: string) => void;
  /** For coach subscription payments */
  coachId?: number;
  coachName?: string;
}

const iStyle: React.CSSProperties = {
  backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10,
  padding: "11px 14px", width: "100%", fontSize: 14, color: "var(--text-primary)",
  fontFamily: "'Outfit', sans-serif", outline: "none", boxSizing: "border-box",
};

// ── Main PaymentForm ─────────────────────────────────────────────────────────
export default function PaymentForm({ amount, plan, type, token, onSuccess, onError, coachId, coachName }: PaymentFormProps) {
  type Method = "paypal" | "ewallet" | "apple_iap" | "google_iap";
  const platform = detectPlatform();
  const native = isNativeApp();

  // Default: E-Wallet for web, Apple/Google IAP for native
  const defaultMethod: Method = coachId ? "ewallet" : (platform === "ios" ? "apple_iap" : platform === "android" ? "google_iap" : "ewallet");
  const [method, setMethod] = useState<Method>(defaultMethod);

  const [paypalClientId, setPaypalClientId] = useState<string | null>(null);
  const [ewalletPhone, setEwalletPhone] = useState<string>("+20 12 8790 4338");
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const [walletType, setWalletType] = useState<"vodafone" | "orange" | "we">("vodafone");
  const [senderNumber, setSenderNumber] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [ewalletProcessing, setEwalletProcessing] = useState(false);
  const [ewalletError, setEwalletError] = useState("");
  const [ewalletSuccess, setEwalletSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const paypalContainerRef = useRef<HTMLDivElement>(null);
  const paypalRendered = useRef(false);
  const loadedClientId = useRef<string | null>(null);

  const [iapProcessing, setIapProcessing] = useState(false);
  const [iapError, setIapError] = useState("");

  const api = (path: string, opts?: RequestInit) =>
    fetch(getApiBase() + path, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts?.headers || {}) } });

  // ── Load configs ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(getApiBase() + "/api/payments/public-settings")
      .then(r => r.json())
      .then(data => {
        const s = data.settings || {};
        const clientIdKey = type === "coach" ? "paypal_coach_client_id" : "paypal_user_client_id";
        if (s[clientIdKey]) setPaypalClientId(s[clientIdKey]);
        if (s.ewallet_phone) setEwalletPhone(s.ewallet_phone);
        setSettingsLoaded(true);
      })
      .catch(() => setSettingsLoaded(true));
  }, [type]);

  // ── PayPal rendering ────────────────────────────────────────────────────────
  useEffect(() => {
    if (method !== "paypal" || !paypalClientId || !settingsLoaded) return;
    if (paypalRendered.current && loadedClientId.current === paypalClientId) return;

    const renderButtons = () => {
      if (!window.paypal || !paypalContainerRef.current) { setTimeout(renderButtons, 200); return; }
      paypalContainerRef.current.innerHTML = "";
      paypalRendered.current = false;
      loadedClientId.current = paypalClientId;
      paypalRendered.current = true;
      window.paypal.Buttons({
        style: { layout: "vertical", color: "gold", shape: "rect", label: "pay", height: 45 },
        createOrder: async () => {
          const res = await api("/api/payments/paypal/create-order", { method: "POST", body: JSON.stringify({ amount: amount.toFixed(2), plan, type }) });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || "Failed to create order");
          return data.id;
        },
        onApprove: async (data: any) => {
          const res = await api("/api/payments/paypal/capture-order", { method: "POST", body: JSON.stringify({ orderId: data.orderID, plan, type, amount }) });
          const result = await res.json();
          if (!res.ok) { onError?.(result.message || "Capture failed"); return; }
          onSuccess();
        },
        onError: () => { onError?.("PayPal encountered an error. Please try another method."); },
        onCancel: () => { onError?.("Payment was cancelled."); },
      }).render(paypalContainerRef.current);
    };

    const existingScript = document.querySelector(`script[src*="paypal.com/sdk"]`);
    if (existingScript && !existingScript.getAttribute("src")?.includes(paypalClientId)) {
      existingScript.remove();
      (window as any).paypal = undefined;
      paypalRendered.current = false;
    }

    if (!document.querySelector(`script[src*="${paypalClientId}"]`)) {
      const script = document.createElement("script");
      script.src = `https://www.paypal.com/sdk/js?client-id=${paypalClientId}&currency=USD`;
      script.async = true;
      script.onload = renderButtons;
      document.head.appendChild(script);
    } else {
      renderButtons();
    }
  }, [method, paypalClientId, settingsLoaded, amount]);

  // ── Apple / Google IAP ──────────────────────────────────────────────────────
  const handleIAPPurchase = async () => {
    setIapProcessing(true);
    setIapError("");
    try {
      const Capacitor = (window as any).Capacitor;
      if (!Capacitor?.isNativePlatform?.()) {
        setIapError(`In-app purchases are only available in the mobile app. Please use E-Wallet or PayPal on web.`);
        return;
      }
      setIapError(`To complete your purchase, please use the FitWay Hub mobile app from the ${platform === "ios" ? "App Store" : "Google Play Store"}.`);
    } catch (err: any) {
      setIapError(err.message || "Purchase failed");
    } finally {
      setIapProcessing(false);
    }
  };

  // ── E-Wallet Submit ─────────────────────────────────────────────────────────
  const handleEwalletSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEwalletError("");
    if (!senderNumber.trim()) { setEwalletError("Please enter your wallet number."); return; }
    if (!proofFile) { setEwalletError("Please upload a screenshot of the transaction."); return; }
    setEwalletProcessing(true);
    try {
      const formData = new FormData();
      formData.append("plan", plan);
      formData.append("type", type);
      formData.append("walletType", walletType);
      formData.append("senderNumber", senderNumber);
      formData.append("proof", proofFile);
      if (coachId) formData.append("coachId", coachId.toString());
      const res = await fetch(getApiBase() + "/api/payments/ewallet", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
      if (!res.ok) {
        const text = await res.text();
        let message = "Payment submission failed.";
        try {
          const parsed = JSON.parse(text || "{}");
          if (parsed?.message) message = parsed.message;
        } catch {
          if (text?.trim()) message = text.trim();
          else message = `Payment submission failed (HTTP ${res.status}).`;
        }
        throw new Error(message);
      }
      setEwalletSuccess(true);
    } catch (err: any) {
      setEwalletError(err.message || "Failed to submit payment.");
    } finally {
      setEwalletProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setProofPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const walletColors: Record<string, string> = { vodafone: "#E60000", orange: "#FF6900", we: "#7B2D8E" };
  const walletColor = walletColors[walletType];

  // ── Success state ───────────────────────────────────────────────────────────
  if (ewalletSuccess) {
    return (
      <div style={{ textAlign: "center", padding: "28px 16px" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", backgroundColor: "rgba(255,179,64,0.12)", border: "2px solid rgba(255,179,64,0.4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <CheckCircle size={32} color="var(--amber)" />
        </div>
        <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Proof Submitted!</p>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 20 }}>
          Your payment screenshot was sent for admin review.<br/>
          <strong style={{ color: "var(--amber)" }}>
            {coachId
              ? "Admin will verify payment, then your coach can accept or decline the request."
              : "Your account will be activated once approved."}
          </strong>
        </p>
        <button onClick={onSuccess} style={{ padding: "11px 28px", borderRadius: 10, backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 14 }}>Close</button>
      </div>
    );
  }

  // ── Method button helper ────────────────────────────────────────────────────
  const methodBtn = (m: Method, icon: React.ReactNode, label: string, sublabel?: string) => (
    <button type="button" onClick={() => { setMethod(m); paypalRendered.current = false; }}
      style={{
        flex: 1, padding: "10px 6px", borderRadius: 11, minWidth: 0,
        border: `2px solid ${method === m ? "var(--accent)" : "var(--border)"}`,
        backgroundColor: method === m ? "var(--accent-dim)" : "var(--bg-surface)",
        color: method === m ? "var(--accent)" : "var(--text-secondary)",
        cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center",
        gap: 4, fontSize: 11, fontWeight: 600, transition: "all 0.15s",
      }}>
      {icon}
      <span style={{ lineHeight: 1.2, textAlign: "center" }}>{label}</span>
      {sublabel && <span style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 400 }}>{sublabel}</span>}
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── Payment Method Selector ──────────────────────────────────── */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Payment Method</p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {methodBtn("ewallet",
            <Smartphone size={18} />,
            "E-Wallet"
          )}
          {!coachId && methodBtn("paypal",
            <img src="https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_37x23.jpg" alt="PayPal" style={{ height: 18, borderRadius: 2 }} />,
            "PayPal"
          )}
          {!coachId && (platform === "ios" || !native) && methodBtn("apple_iap",
            <span style={{ fontSize: 18 }}>🍎</span>,
            "Apple Pay",
            native ? "" : "iOS App"
          )}
          {!coachId && (platform === "android" || !native) && methodBtn("google_iap",
            <span style={{ fontSize: 18 }}>▶️</span>,
            "Google Pay",
            native ? "" : "Android"
          )}
        </div>
      </div>

      {/* ── PayPal ─────────────────────────────────────────────────────── */}
      {method === "paypal" && (
        <div>
          {!settingsLoaded ? (
            <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)", fontSize: 13 }}>Loading payment options…</div>
          ) : !paypalClientId ? (
            <div style={{ padding: "16px 18px", backgroundColor: "rgba(255,170,0,0.08)", border: "1px solid rgba(255,170,0,0.3)", borderRadius: 12, display: "flex", gap: 12, alignItems: "flex-start" }}>
              <AlertCircle size={20} color="#FFAA00" style={{ marginTop: 1, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#FFAA00", marginBottom: 4 }}>PayPal Not Configured</p>
                <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Please use another payment method.</p>
              </div>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14, textAlign: "center" }}>You'll be redirected to PayPal to complete your payment securely.</p>
              <div ref={paypalContainerRef} style={{ minHeight: 50 }} />
            </>
          )}
        </div>
      )}

      {/* ── E-Wallet ───────────────────────────────────────────────────── */}
      {method === "ewallet" && (
        <form onSubmit={handleEwalletSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Select Wallet</p>
            <div style={{ display: "flex", gap: 8 }}>
              {([
                { id: "vodafone" as const, label: "Vodafone Cash", icon: "🔴", color: "#E60000" },
                { id: "orange" as const, label: "Orange Cash", icon: "🟠", color: "#FF6900" },
                { id: "we" as const, label: "WE Pay", icon: "🟣", color: "#7B2D8E" },
              ]).map(w => (
                <button key={w.id} type="button" onClick={() => setWalletType(w.id)} style={{
                  flex: 1, padding: "12px 6px", borderRadius: 12,
                  border: `2px solid ${walletType === w.id ? w.color : "var(--border)"}`,
                  backgroundColor: walletType === w.id ? `${w.color}18` : "var(--bg-surface)",
                  cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                }}>
                  <span style={{ fontSize: 22 }}>{w.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: w.color }}>{w.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div style={{ padding: "16px", backgroundColor: `${walletColor}14`, border: `1px solid ${walletColor}44`, borderRadius: 12 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 12 }}>📱 Transfer Instructions</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 13, color: "var(--text-primary)" }}>1. Send <strong style={{ color: walletColor }}>{amount} EGP</strong> to:</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", backgroundColor: "var(--bg-surface)", borderRadius: 10, border: `1px solid ${walletColor}44` }}>
                <span style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 800, color: walletColor, letterSpacing: 2 }}>{ewalletPhone}</span>
                <button type="button" onClick={() => navigator.clipboard?.writeText(ewalletPhone)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "var(--text-muted)", padding: "4px 8px", borderRadius: 6, backgroundColor: "var(--bg-card)" }}>Copy</button>
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>2. Take a screenshot of the confirmation</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>3. Upload it below</div>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 5 }}>Your Wallet Number</label>
            <input type="tel" value={senderNumber} onChange={(e) => setSenderNumber(e.target.value.replace(/[\s]/g, "").slice(0, 15))} placeholder="e.g. 01012345678" style={iStyle} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 8 }}>Transaction Screenshot *</label>
            <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
            {proofPreview ? (
              <div style={{ position: "relative" }}>
                <img src={proofPreview} alt="Proof" style={{ width: "100%", maxHeight: 200, objectFit: "contain", borderRadius: 10, border: "1px solid var(--border)", backgroundColor: "var(--bg-surface)" }} />
                <button type="button" onClick={() => { setProofFile(null); setProofPreview(null); }} style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.6)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <X size={14} color="#fff" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()} style={{ width: "100%", padding: "24px", borderRadius: 12, border: "2px dashed var(--border)", backgroundColor: "var(--bg-surface)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <Upload size={24} color="var(--text-muted)" />
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Click to upload screenshot</span>
              </button>
            )}
          </div>
          {ewalletError && <div style={{ padding: "10px 14px", backgroundColor: "rgba(255,68,68,0.08)", border: "1px solid rgba(255,68,68,0.25)", borderRadius: 9, fontSize: 13, color: "var(--red)" }}>{ewalletError}</div>}
          <button type="submit" disabled={ewalletProcessing || !proofFile} style={{ padding: "14px", borderRadius: 11, backgroundColor: "var(--accent)", color: "#0A0A0B", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 14, border: "none", cursor: ewalletProcessing ? "not-allowed" : "pointer", opacity: (ewalletProcessing || !proofFile) ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <CheckCircle size={15} /> {ewalletProcessing ? "Submitting…" : "Submit Payment Proof"}
          </button>
        </form>
      )}

      {/* ── Apple IAP ──────────────────────────────────────────────────── */}
      {method === "apple_iap" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ padding: "16px", backgroundColor: "rgba(100,100,100,0.06)", border: "1px solid var(--border)", borderRadius: 12, textAlign: "center" }}>
            <span style={{ fontSize: 40 }}>🍎</span>
            <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 16, fontWeight: 700, marginTop: 8, marginBottom: 6 }}>Apple In-App Purchase</p>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              {native
                ? "Complete your purchase using your Apple ID payment method. Charged directly through the App Store."
                : "Apple Pay is available in the FitWay Hub iOS app. Download from the App Store to use Apple's secure in-app purchases."}
            </p>
          </div>
          {iapError && (
            <div style={{ padding: "10px 14px", backgroundColor: "rgba(255,170,0,0.08)", border: "1px solid rgba(255,170,0,0.3)", borderRadius: 9, fontSize: 13, color: "var(--amber)" }}>
              {iapError}
            </div>
          )}
          <button onClick={handleIAPPurchase} disabled={iapProcessing} style={{
            padding: "14px", borderRadius: 11, backgroundColor: "#000", color: "#fff",
            fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 14, border: "1px solid #333",
            cursor: iapProcessing ? "not-allowed" : "pointer", opacity: iapProcessing ? 0.7 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            🍎 {iapProcessing ? "Processing…" : `Buy with Apple Pay — ${amount} EGP`}
          </button>
        </div>
      )}

      {/* ── Google IAP ─────────────────────────────────────────────────── */}
      {method === "google_iap" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ padding: "16px", backgroundColor: "rgba(100,100,100,0.06)", border: "1px solid var(--border)", borderRadius: 12, textAlign: "center" }}>
            <span style={{ fontSize: 40 }}>▶️</span>
            <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 16, fontWeight: 700, marginTop: 8, marginBottom: 6 }}>Google Play Purchase</p>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              {native
                ? "Complete your purchase using your Google account payment method. Charged directly through Google Play."
                : "Google Play payments are available in the FitWay Hub Android app. Download from Google Play to use in-app purchases."}
            </p>
          </div>
          {iapError && (
            <div style={{ padding: "10px 14px", backgroundColor: "rgba(255,170,0,0.08)", border: "1px solid rgba(255,170,0,0.3)", borderRadius: 9, fontSize: 13, color: "var(--amber)" }}>
              {iapError}
            </div>
          )}
          <button onClick={handleIAPPurchase} disabled={iapProcessing} style={{
            padding: "14px", borderRadius: 11, background: "linear-gradient(135deg, #34A853, #1B873B)", color: "#fff",
            fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 14, border: "none",
            cursor: iapProcessing ? "not-allowed" : "pointer", opacity: iapProcessing ? 0.7 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            ▶️ {iapProcessing ? "Processing…" : `Buy with Google Play — ${amount} EGP`}
          </button>
        </div>
      )}

      {/* ── Security note ──────────────────────────────────────────────── */}
      <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", lineHeight: 1.6 }}>
        🔒 All payments are secured with 256-bit SSL encryption.
        {method === "apple_iap" ? " Managed by Apple." : ""}
        {method === "google_iap" ? " Managed by Google." : ""}
        {" "}Cancel anytime.
      </p>
    </div>
  );
}
