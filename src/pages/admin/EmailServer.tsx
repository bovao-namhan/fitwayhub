import { useState, useEffect, useCallback } from "react";
import type { CSSProperties, FormEvent } from "react";
import { Mail, Plus, Trash2, Send, Inbox, ArrowLeft, RefreshCw, Eye, Settings, CheckCircle, XCircle, Zap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const API = import.meta.env.VITE_API_BASE || "";

interface EmailAccount {
  id: number;
  email: string;
  display_name: string;
  created_at: string;
}

interface Email {
  id: number;
  sender: string;
  recipient: string;
  subject: string;
  text_body: string;
  html_body: string;
  direction: "inbound" | "outbound";
  is_read: number;
  created_at: string;
}

interface SmtpSettings {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_secure: "none" | "tls" | "starttls";
  from_name: string;
  from_email: string;
  enabled: number;
}

type View = "settings" | "accounts" | "inbox" | "sent" | "compose" | "read";

export default function EmailServer() {
  const { token } = useAuth();
  const [view, setView] = useState<View>("settings");
  const [domain, setDomain] = useState("");
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<EmailAccount | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // SMTP settings
  const [smtp, setSmtp] = useState<SmtpSettings>({ smtp_host: "", smtp_port: 587, smtp_user: "", smtp_pass: "", smtp_secure: "starttls", from_name: "", from_email: "", enabled: 0 });
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testSending, setTestSending] = useState(false);

  // create account form
  const [localPart, setLocalPart] = useState("");
  const [displayName, setDisplayName] = useState("");

  // compose form
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sending, setSending] = useState(false);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const flash = (msg: string, type: "error" | "success" = "error") => {
    if (type === "error") { setError(msg); setSuccess(""); }
    else { setSuccess(msg); setError(""); }
    setTimeout(() => { setError(""); setSuccess(""); }, 5000);
  };

  const fetchDomain = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/email/domain`, { headers });
      const d = await r.json();
      setDomain(d.domain || "");
    } catch { /* ignore */ }
  }, [token]);

  const fetchSettings = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/email/settings`, { headers });
      const d = await r.json();
      if (d.settings) setSmtp(d.settings);
    } catch { /* ignore */ }
  }, [token]);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/email/accounts`, { headers });
      const d = await r.json();
      setAccounts(d.accounts || []);
    } catch { flash("Failed to load accounts"); }
    setLoading(false);
  }, [token]);

  const fetchEmails = useCallback(async (accountId: number, direction: "inbound" | "outbound") => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/email/accounts/${accountId}/emails?direction=${direction}`, { headers });
      const d = await r.json();
      setEmails(d.emails || []);
    } catch { flash("Failed to load emails"); }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchDomain(); fetchSettings(); fetchAccounts(); }, [fetchDomain, fetchSettings, fetchAccounts]);

  async function saveSettings(e: FormEvent) {
    e.preventDefault();
    setSmtpLoading(true);
    try {
      const r = await fetch(`${API}/api/email/settings`, {
        method: "PUT", headers,
        body: JSON.stringify(smtp),
      });
      const d = await r.json();
      if (!r.ok) return flash(d.message || "Failed to save");
      flash("SMTP settings saved!", "success");
    } catch { flash("Network error"); }
    setSmtpLoading(false);
  }

  async function testConnection() {
    setSmtpTesting(true);
    try {
      const r = await fetch(`${API}/api/email/settings/test`, { method: "POST", headers });
      const d = await r.json();
      flash(d.message, d.ok ? "success" : "error");
    } catch { flash("Network error"); }
    setSmtpTesting(false);
  }

  async function sendTestEmail(e: FormEvent) {
    e.preventDefault();
    if (!testEmail.trim()) return flash("Enter recipient email");
    setTestSending(true);
    try {
      const r = await fetch(`${API}/api/email/settings/test-send`, {
        method: "POST", headers,
        body: JSON.stringify({ to: testEmail.trim() }),
      });
      const d = await r.json();
      flash(d.message, d.ok ? "success" : "error");
    } catch { flash("Network error"); }
    setTestSending(false);
  }

  async function createAccount(e: FormEvent) {
    e.preventDefault();
    if (!localPart.trim()) return flash("Enter the email name (part before @)");
    try {
      const r = await fetch(`${API}/api/email/accounts`, {
        method: "POST", headers,
        body: JSON.stringify({ local_part: localPart.trim(), display_name: displayName.trim() }),
      });
      const d = await r.json();
      if (!r.ok) return flash(d.message || "Failed");
      flash(`Created ${d.email}`, "success");
      setLocalPart(""); setDisplayName("");
      fetchAccounts();
    } catch { flash("Network error"); }
  }

  async function deleteAccount(id: number) {
    if (!confirm("Delete this email account and all its emails?")) return;
    try {
      await fetch(`${API}/api/email/accounts/${id}`, { method: "DELETE", headers });
      flash("Account deleted", "success");
      if (selectedAccount?.id === id) { setSelectedAccount(null); setView("accounts"); }
      fetchAccounts();
    } catch { flash("Delete failed"); }
  }

  async function deleteEmail(id: number) {
    try {
      await fetch(`${API}/api/email/emails/${id}`, { method: "DELETE", headers });
      setEmails((prev) => prev.filter((e) => e.id !== id));
      if (selectedEmail?.id === id) { setSelectedEmail(null); setView(view === "read" ? "inbox" : view); }
    } catch { flash("Failed to delete email"); }
  }

  function openInbox(account: EmailAccount) {
    setSelectedAccount(account);
    setView("inbox");
    fetchEmails(account.id, "inbound");
  }

  function openSent(account: EmailAccount) {
    setSelectedAccount(account);
    setView("sent");
    fetchEmails(account.id, "outbound");
  }

  function openCompose(account: EmailAccount) {
    setSelectedAccount(account);
    setComposeTo(""); setComposeSubject(""); setComposeBody("");
    setView("compose");
  }

  async function openEmail(em: Email) {
    setSelectedEmail(em);
    setView("read");
    // mark as read
    if (!em.is_read) {
      try {
        await fetch(`${API}/api/email/emails/${em.id}`, { headers });
        setEmails((prev) => prev.map((e) => e.id === em.id ? { ...e, is_read: 1 } : e));
      } catch { /* ignore */ }
    }
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!composeTo.trim() || !composeSubject.trim()) return flash("Recipient and subject are required");
    setSending(true);
    try {
      const r = await fetch(`${API}/api/email/send`, {
        method: "POST", headers,
        body: JSON.stringify({
          account_id: selectedAccount!.id,
          to: composeTo.trim(),
          subject: composeSubject.trim(),
          text: composeBody,
        }),
      });
      const d = await r.json();
      if (!r.ok) return flash(d.message || "Send failed");
      flash("Email sent!", "success");
      setView("sent");
      fetchEmails(selectedAccount!.id, "outbound");
    } catch { flash("Network error"); }
    setSending(false);
  }

  // ── Styles ──────────────────────────────────────────────────────
  const card: CSSProperties = {
    background: "var(--bg-card)", borderRadius: 14, border: "none",
    padding: 20, marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
    transition: "box-shadow 0.2s",
  };
  const btn = (bg = "var(--accent)", color = "#fff"): CSSProperties => ({
    background: bg, color, border: "none", borderRadius: 10, padding: "8px 18px",
    fontWeight: 600, cursor: "pointer", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6,
  });
  const input: CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: 10, border: "none",
    background: "var(--bg-surface)", color: "var(--text-primary)", fontSize: 14, outline: "none",
    boxSizing: "border-box", boxShadow: "inset 0 1px 4px rgba(0,0,0,0.08)",
  };
  const th: CSSProperties = {
    textAlign: "start", padding: "8px 12px", fontSize: 11, textTransform: "uppercase",
    color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.05em",
  };
  const td: CSSProperties = {
    padding: "10px 12px", fontSize: 13,
    color: "var(--text-primary)", verticalAlign: "middle",
  };
  const labelStyle: CSSProperties = {
    fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4,
  };

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {!["settings", "accounts"].includes(view) && (
          <button onClick={() => setView("accounts")} style={btn("var(--bg-surface)", "var(--text-primary)")}>
            <ArrowLeft size={14} /> Back
          </button>
        )}
        <Mail size={22} style={{ color: "var(--accent)" }} />
        <h1 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: "clamp(18px, 4vw, 26px)", fontWeight: 700, margin: 0 }}>
          Email Server
        </h1>
        {domain && (
          <span style={{ fontSize: 12, color: "var(--text-muted)", background: "var(--bg-surface)", padding: "4px 10px", borderRadius: 8 }}>
            @{domain}
          </span>
        )}
      </div>

      {/* Tab buttons */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => setView("settings")} style={btn(view === "settings" ? "var(--accent)" : "var(--bg-surface)", view === "settings" ? "#fff" : "var(--text-primary)")}>
          <Settings size={14} /> SMTP Settings
        </button>
        <button onClick={() => setView("accounts")} style={btn(view === "accounts" ? "var(--accent)" : "var(--bg-surface)", view === "accounts" ? "#fff" : "var(--text-primary)")}>
          <Mail size={14} /> Accounts
        </button>
      </div>

      {/* Alerts */}
      {error && <div style={{ ...card, background: "rgba(255,68,68,0.1)", color: "var(--red)", padding: "10px 16px", fontSize: 13 }}>{error}</div>}
      {success && <div style={{ ...card, background: "rgba(0,200,120,0.1)", color: "#0c6", padding: "10px 16px", fontSize: 13 }}>{success}</div>}

      {/* ─── SMTP SETTINGS VIEW ─── */}
      {view === "settings" && (
        <>
          <div style={card}>
            <h3 style={{ fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 15, margin: "0 0 6px" }}>
              <Settings size={14} style={{ display: "inline", marginRight: 6 }} />
              SMTP Relay Configuration
            </h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 16px" }}>
              Configure an external SMTP service (Gmail, SendGrid, Mailgun, etc.) to send real emails.
            </p>
            <form onSubmit={saveSettings} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: "2 1 200px" }}>
                  <label style={labelStyle}>SMTP Host *</label>
                  <input value={smtp.smtp_host} onChange={(e) => setSmtp({ ...smtp, smtp_host: e.target.value })} placeholder="smtp.gmail.com" style={input} />
                </div>
                <div style={{ flex: "1 1 100px" }}>
                  <label style={labelStyle}>Port *</label>
                  <input type="number" value={smtp.smtp_port} onChange={(e) => setSmtp({ ...smtp, smtp_port: Number(e.target.value) })} placeholder="587" style={input} />
                </div>
                <div style={{ flex: "1 1 120px" }}>
                  <label style={labelStyle}>Security</label>
                  <select value={smtp.smtp_secure} onChange={(e) => setSmtp({ ...smtp, smtp_secure: e.target.value as any })} style={input}>
                    <option value="starttls">STARTTLS (587)</option>
                    <option value="tls">TLS/SSL (465)</option>
                    <option value="none">None (25)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 200px" }}>
                  <label style={labelStyle}>Username / Email *</label>
                  <input value={smtp.smtp_user} onChange={(e) => setSmtp({ ...smtp, smtp_user: e.target.value })} placeholder="your-email@gmail.com" style={input} />
                </div>
                <div style={{ flex: "1 1 200px" }}>
                  <label style={labelStyle}>Password / App Password *</label>
                  <input type="password" value={smtp.smtp_pass} onChange={(e) => setSmtp({ ...smtp, smtp_pass: e.target.value })} placeholder="••••••••" style={input} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 200px" }}>
                  <label style={labelStyle}>From Name</label>
                  <input value={smtp.from_name} onChange={(e) => setSmtp({ ...smtp, from_name: e.target.value })} placeholder="FitWay Hub" style={input} />
                </div>
                <div style={{ flex: "1 1 200px" }}>
                  <label style={labelStyle}>From Email</label>
                  <input value={smtp.from_email} onChange={(e) => setSmtp({ ...smtp, from_email: e.target.value })} placeholder="noreply@fitwayhub.com" style={input} />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                  <input type="checkbox" checked={!!smtp.enabled} onChange={(e) => setSmtp({ ...smtp, enabled: e.target.checked ? 1 : 0 })} />
                  Enable email sending
                </label>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="submit" disabled={smtpLoading} style={{ ...btn(), opacity: smtpLoading ? 0.6 : 1 }}>
                  {smtpLoading ? "Saving..." : "Save Settings"}
                </button>
                <button type="button" onClick={testConnection} disabled={smtpTesting} style={{ ...btn("var(--blue)", "#fff"), opacity: smtpTesting ? 0.6 : 1 }}>
                  <Zap size={13} /> {smtpTesting ? "Testing..." : "Test Connection"}
                </button>
              </div>
            </form>
          </div>

          {/* Test send */}
          <div style={card}>
            <h3 style={{ fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 15, margin: "0 0 6px" }}>
              <Send size={14} style={{ display: "inline", marginRight: 6 }} />
              Send Test Email
            </h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 12px" }}>
              Send a test email to verify your SMTP settings are working correctly.
            </p>
            <form onSubmit={sendTestEmail} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 250px" }}>
                <label style={labelStyle}>Recipient Email</label>
                <input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="your-email@gmail.com" style={input} />
              </div>
              <button type="submit" disabled={testSending} style={{ ...btn("var(--cyan)", "#fff"), opacity: testSending ? 0.6 : 1 }}>
                <Send size={13} /> {testSending ? "Sending..." : "Send Test"}
              </button>
            </form>
          </div>

          {/* Quick setup guides */}
          <div style={card}>
            <h3 style={{ fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 14, margin: "0 0 10px" }}>Quick Setup Guides</h3>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {[
                { name: "Gmail", host: "smtp.gmail.com", port: 587, secure: "starttls", note: "Use App Password (enable 2FA first)" },
                { name: "SendGrid", host: "smtp.sendgrid.net", port: 587, secure: "starttls", note: "Username: apikey, Password: your API key" },
                { name: "Mailgun", host: "smtp.mailgun.org", port: 587, secure: "starttls", note: "Use domain credentials from Mailgun dashboard" },
                { name: "Outlook", host: "smtp-mail.outlook.com", port: 587, secure: "starttls", note: "Use your Outlook email and password" },
              ].map((p) => (
                <div key={p.name} style={{
                  flex: "1 1 180px", padding: 12, borderRadius: 10, border: "none",
                  background: "var(--bg-surface)", fontSize: 12, boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
                  transition: "box-shadow 0.2s",
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.15)")}
                  onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 1px 6px rgba(0,0,0,0.07)")}
                >
                  <strong style={{ fontSize: 13 }}>{p.name}</strong>
                  <p style={{ margin: "4px 0 0", color: "var(--text-muted)", lineHeight: 1.5 }}>
                    Host: <code>{p.host}</code><br />
                    Port: {p.port} ({p.secure})<br />
                    <em>{p.note}</em>
                  </p>
                  <button
                    type="button"
                    onClick={() => setSmtp({ ...smtp, smtp_host: p.host, smtp_port: p.port, smtp_secure: p.secure as any })}
                    style={{ ...btn("var(--bg-card)", "var(--accent)"), padding: "4px 10px", fontSize: 11, marginTop: 6 }}
                  >
                    Use {p.name}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ─── ACCOUNTS VIEW ─── */}
      {view === "accounts" && (
        <>
          {/* Create account form */}
          <div style={card}>
            <h3 style={{ fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 15, margin: "0 0 14px" }}>
              <Plus size={14} style={{ display: "inline", marginRight: 6 }} />
              Create Email Account
            </h3>
            <form onSubmit={createAccount} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ flex: "1 1 180px" }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Username</label>
                <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                  <input
                    value={localPart}
                    onChange={(e) => setLocalPart(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))}
                    placeholder="support"
                    style={{ ...input, borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                  />
                  <span style={{
                    padding: "10px 12px", background: "var(--bg-surface)", border: "none",
                    borderTopRightRadius: 10, borderBottomRightRadius: 10, fontSize: 13, color: "var(--text-muted)",
                    whiteSpace: "nowrap", boxShadow: "inset 0 1px 4px rgba(0,0,0,0.08)",
                  }}>
                    @{domain}
                  </span>
                </div>
              </div>
              <div style={{ flex: "1 1 150px" }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Display Name</label>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="FitWay Support" style={input} />
              </div>
              <button type="submit" style={btn()}>
                <Plus size={14} /> Create
              </button>
            </form>
          </div>

          {/* Accounts list */}
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 15, margin: 0 }}>
                Email Accounts ({accounts.length})
              </h3>
              <button onClick={fetchAccounts} style={btn("var(--bg-surface)", "var(--text-primary)")}>
                <RefreshCw size={13} /> Refresh
              </button>
            </div>

            {loading && <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading...</p>}
            {!loading && accounts.length === 0 && (
              <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "24px 0" }}>
                No email accounts yet. Create one above.
              </p>
            )}

            {accounts.map((a) => (
              <div key={a.id} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                borderRadius: 10, flexWrap: "wrap", marginBottom: 8,
                transition: "box-shadow 0.2s",
              }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.12)")}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
              >
                <div style={{ flex: 1, minWidth: 160 }}>
                  <p style={{ fontWeight: 700, fontSize: 14, margin: 0, fontFamily: "'Chakra Petch', sans-serif" }}>{a.email}</p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>{a.display_name}</p>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button onClick={() => openInbox(a)} style={btn("var(--blue)", "#fff")}>
                    <Inbox size={13} /> Inbox
                  </button>
                  <button onClick={() => openSent(a)} style={btn("var(--cyan)", "#fff")}>
                    <Send size={13} /> Sent
                  </button>
                  <button onClick={() => openCompose(a)} style={btn()}>
                    <Send size={13} /> Compose
                  </button>
                  <button onClick={() => deleteAccount(a.id)} style={btn("var(--red)", "#fff")}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* DNS info */}
          <div style={{ ...card, padding: 16 }}>
            <h3 style={{ fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 14, margin: "0 0 10px" }}>DNS Setup Guide</h3>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
              To receive emails on <strong>{domain}</strong>, add these DNS records at your domain registrar:
            </p>
            <div style={{ marginTop: 10, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={th}>Type</th><th style={th}>Host</th><th style={th}>Value</th><th style={th}>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={td}><strong>MX</strong></td>
                    <td style={td}>@</td>
                    <td style={{ ...td, fontFamily: "monospace", fontSize: 11 }}>{domain}</td>
                    <td style={td}>10</td>
                  </tr>
                  <tr>
                    <td style={td}><strong>TXT</strong></td>
                    <td style={td}>@</td>
                    <td style={{ ...td, fontFamily: "monospace", fontSize: 11, wordBreak: "break-all" }}>v=spf1 a mx ip4:YOUR_SERVER_IP ~all</td>
                    <td style={td}>—</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
              SMTP port: <strong>{2525}</strong> (configurable via <code>SMTP_PORT</code> env var).
              For production, set up a reverse proxy or use port 25.
            </p>
          </div>
        </>
      )}

      {/* ─── INBOX / SENT VIEW ─── */}
      {(view === "inbox" || view === "sent") && selectedAccount && (
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
            <h3 style={{ fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 15, margin: 0 }}>
              {view === "inbox" ? <><Inbox size={15} style={{ display: "inline", marginRight: 6 }} />Inbox</> : <><Send size={15} style={{ display: "inline", marginRight: 6 }} />Sent</>}
              <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 400, marginLeft: 8 }}>{selectedAccount.email}</span>
            </h3>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => view === "inbox" ? openSent(selectedAccount) : openInbox(selectedAccount)} style={btn("var(--bg-surface)", "var(--text-primary)")}>
                {view === "inbox" ? <><Send size={13} /> Sent</> : <><Inbox size={13} /> Inbox</>}
              </button>
              <button onClick={() => openCompose(selectedAccount)} style={btn()}>
                <Send size={13} /> Compose
              </button>
              <button onClick={() => fetchEmails(selectedAccount.id, view === "inbox" ? "inbound" : "outbound")} style={btn("var(--bg-surface)", "var(--text-primary)")}>
                <RefreshCw size={13} />
              </button>
            </div>
          </div>

          {loading && <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading...</p>}
          {!loading && emails.length === 0 && (
            <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "24px 0" }}>
              No emails yet.
            </p>
          )}

          {emails.map((em) => (
            <div
              key={em.id}
              onClick={() => openEmail(em)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                borderRadius: 10, cursor: "pointer",
                background: em.is_read ? "transparent" : "rgba(99,102,241,0.06)",
                transition: "box-shadow 0.2s, background 0.15s", marginBottom: 4,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.12)"; e.currentTarget.style.background = "var(--bg-surface)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.background = em.is_read ? "transparent" : "rgba(99,102,241,0.06)"; }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontWeight: em.is_read ? 400 : 700, fontSize: 13, margin: 0, overflow: "hidden",
                  textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {em.subject || "(no subject)"}
                </p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0" }}>
                  {view === "inbox" ? `From: ${em.sender}` : `To: ${em.recipient}`}
                </p>
              </div>
              <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                {new Date(em.created_at).toLocaleString()}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); deleteEmail(em.id); }}
                style={{ ...btn("transparent", "var(--red)"), padding: "4px 6px" }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ─── READ VIEW ─── */}
      {view === "read" && selectedEmail && (
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <div>
              <h3 style={{ fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 16, margin: "0 0 4px" }}>
                {selectedEmail.subject || "(no subject)"}
              </h3>
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
                <strong>From:</strong> {selectedEmail.sender}<br />
                <strong>To:</strong> {selectedEmail.recipient}<br />
                <strong>Date:</strong> {new Date(selectedEmail.created_at).toLocaleString()}
              </p>
            </div>
            <button onClick={() => deleteEmail(selectedEmail.id)} style={btn("var(--red)", "#fff")}>
              <Trash2 size={13} /> Delete
            </button>
          </div>
          <hr style={{ border: "none", height: 1, background: "rgba(128,128,128,0.12)", margin: "12px 0" }} />
          {selectedEmail.html_body ? (
            <div
              style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-primary)", overflowX: "auto" }}
              dangerouslySetInnerHTML={{ __html: selectedEmail.html_body }}
            />
          ) : (
            <pre style={{
              fontSize: 13, lineHeight: 1.7, color: "var(--text-primary)", whiteSpace: "pre-wrap",
              wordBreak: "break-word", fontFamily: "inherit", margin: 0,
            }}>
              {selectedEmail.text_body || "(empty)"}
            </pre>
          )}
        </div>
      )}

      {/* ─── COMPOSE VIEW ─── */}
      {view === "compose" && selectedAccount && (
        <div style={card}>
          <h3 style={{ fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 15, margin: "0 0 14px" }}>
            <Send size={14} style={{ display: "inline", marginRight: 6 }} />
            Compose — from {selectedAccount.email}
          </h3>
          <form onSubmit={handleSend} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>To</label>
              <input value={composeTo} onChange={(e) => setComposeTo(e.target.value)} placeholder="recipient@example.com" style={input} required />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Subject</label>
              <input value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} placeholder="Subject" style={input} required />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Message</label>
              <textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                placeholder="Type your message..."
                rows={8}
                style={{ ...input, resize: "vertical", minHeight: 120 }}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={sending} style={{ ...btn(), opacity: sending ? 0.6 : 1 }}>
                <Send size={14} /> {sending ? "Sending..." : "Send Email"}
              </button>
              <button type="button" onClick={() => setView("inbox")} style={btn("var(--bg-surface)", "var(--text-primary)")}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
