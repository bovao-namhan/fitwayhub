import { useState, useEffect, useCallback } from "react";
import type { CSSProperties } from "react";
import { Bell, Send, Edit3, Trash2, Plus, CheckCircle, XCircle, RefreshCw, Users, Zap, ArrowLeft, Mail, Smartphone, MessageSquare } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getApiBase } from "@/lib/api";

const API = getApiBase();

interface PushTemplate {
  id: number;
  slug: string;
  title: string;
  body: string;
  category: string;
  trigger_type: string;
  enabled: number;
}

interface WelcomeMessage {
  id: number;
  target: "user" | "coach";
  channel: "email" | "push" | "in_app";
  subject: string;
  title: string;
  body: string;
  html_body: string | null;
  enabled: number;
}

interface LogEntry {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  template_slug: string | null;
  title: string;
  body: string;
  status: "sent" | "failed";
  created_at: string;
}

interface FcmStatus {
  configured: boolean;
  method: string;
  registeredDevices: number;
}

type View = "templates" | "welcome" | "send" | "log" | "edit-template" | "edit-welcome";

const CATEGORIES = ["new_user", "new_coach", "engagement", "streak", "inactivity", "promo", "coach_tip", "system"];

const categoryLabel: Record<string, string> = {
  new_user: "New User", new_coach: "New Coach", engagement: "Engagement",
  streak: "Streak", inactivity: "Inactivity", promo: "Promo",
  coach_tip: "Coach Tip", system: "System",
};

const channelIcon: Record<string, typeof Mail> = { email: Mail, push: Smartphone, in_app: MessageSquare };

export default function Notifications() {
  const { token } = useAuth();
  const [view, setView] = useState<View>("templates");
  const [templates, setTemplates] = useState<PushTemplate[]>([]);
  const [welcomeMsgs, setWelcomeMsgs] = useState<WelcomeMessage[]>([]);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [fcmStatus, setFcmStatus] = useState<FcmStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Edit states
  const [editTemplate, setEditTemplate] = useState<PushTemplate | null>(null);
  const [editWelcome, setEditWelcome] = useState<WelcomeMessage | null>(null);

  // Send form
  const [sendTitle, setSendTitle] = useState("");
  const [sendBody, setSendBody] = useState("");
  const [sendSegment, setSendSegment] = useState<string>("all");
  const [sendUserId, setSendUserId] = useState("");
  const [sending, setSending] = useState(false);

  // New template form
  const [newSlug, setNewSlug] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newCategory, setNewCategory] = useState("engagement");
  const [newTrigger, setNewTrigger] = useState("manual");
  const [showNewForm, setShowNewForm] = useState(false);

  // Filter
  const [filterCat, setFilterCat] = useState<string>("all");

  const hdr = useCallback(() => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" }), [token]);

  const flash = (msg: string, isErr = false) => {
    if (isErr) { setError(msg); setSuccess(""); }
    else { setSuccess(msg); setError(""); }
    setTimeout(() => { setError(""); setSuccess(""); }, 4000);
  };

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/notifications/templates`, { headers: hdr() });
      const d = await r.json();
      setTemplates(d.templates || []);
    } catch { flash("Failed to load templates", true); }
    setLoading(false);
  }, [hdr]);

  const loadWelcome = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/notifications/welcome-messages`, { headers: hdr() });
      const d = await r.json();
      setWelcomeMsgs(d.messages || []);
    } catch { flash("Failed to load welcome messages", true); }
    setLoading(false);
  }, [hdr]);

  const loadLog = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/notifications/log?limit=100`, { headers: hdr() });
      const d = await r.json();
      setLogEntries(d.log || []);
    } catch { flash("Failed to load log", true); }
    setLoading(false);
  }, [hdr]);

  const loadFcmStatus = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/notifications/fcm-status`, { headers: hdr() });
      const d = await r.json();
      setFcmStatus(d);
    } catch {}
  }, [hdr]);

  useEffect(() => {
    loadTemplates();
    loadFcmStatus();
  }, [loadTemplates, loadFcmStatus]);

  useEffect(() => {
    if (view === "welcome") loadWelcome();
    if (view === "log") loadLog();
  }, [view, loadWelcome, loadLog]);

  // ── Actions ───────────────────
  const toggleTemplate = async (t: PushTemplate) => {
    await fetch(`${API}/api/notifications/templates/${t.id}`, { method: "PUT", headers: hdr(), body: JSON.stringify({ enabled: !t.enabled }) });
    loadTemplates();
  };

  const deleteTemplate = async (id: number) => {
    if (!confirm("Delete this template?")) return;
    await fetch(`${API}/api/notifications/templates/${id}`, { method: "DELETE", headers: hdr() });
    flash("Template deleted");
    loadTemplates();
  };

  const saveTemplate = async () => {
    if (!editTemplate) return;
    await fetch(`${API}/api/notifications/templates/${editTemplate.id}`, {
      method: "PUT", headers: hdr(),
      body: JSON.stringify({ title: editTemplate.title, body: editTemplate.body, trigger_type: editTemplate.trigger_type, enabled: editTemplate.enabled }),
    });
    flash("Template saved");
    setView("templates");
    loadTemplates();
  };

  const createTemplate = async () => {
    if (!newSlug || !newTitle || !newBody) return flash("Fill slug, title, body", true);
    const r = await fetch(`${API}/api/notifications/templates`, {
      method: "POST", headers: hdr(),
      body: JSON.stringify({ slug: newSlug, title: newTitle, body: newBody, category: newCategory, trigger_type: newTrigger }),
    });
    if (r.ok) {
      flash("Template created");
      setShowNewForm(false); setNewSlug(""); setNewTitle(""); setNewBody(""); setNewCategory("engagement"); setNewTrigger("manual");
      loadTemplates();
    } else {
      const d = await r.json();
      flash(d.message || "Failed", true);
    }
  };

  const saveWelcome = async () => {
    if (!editWelcome) return;
    await fetch(`${API}/api/notifications/welcome-messages/${editWelcome.id}`, {
      method: "PUT", headers: hdr(),
      body: JSON.stringify({ subject: editWelcome.subject, title: editWelcome.title, body: editWelcome.body, html_body: editWelcome.html_body, enabled: editWelcome.enabled }),
    });
    flash("Welcome message saved");
    setView("welcome");
    loadWelcome();
  };

  const toggleWelcome = async (m: WelcomeMessage) => {
    await fetch(`${API}/api/notifications/welcome-messages/${m.id}`, { method: "PUT", headers: hdr(), body: JSON.stringify({ enabled: !m.enabled }) });
    loadWelcome();
  };

  const handleSend = async () => {
    if (!sendTitle || !sendBody) return flash("Title and body are required", true);
    setSending(true);
    try {
      const payload: any = { title: sendTitle, body: sendBody };
      if (sendUserId) payload.userId = parseInt(sendUserId);
      else payload.segment = sendSegment;
      const r = await fetch(`${API}/api/notifications/send`, { method: "POST", headers: hdr(), body: JSON.stringify(payload) });
      const d = await r.json();
      flash(d.message || "Sent!");
    } catch { flash("Send failed", true); }
    setSending(false);
  };

  // ── Styles ────────────────────
  const card: CSSProperties = { backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, marginBottom: 16 };
  const btn: CSSProperties = { padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 };
  const btnAccent: CSSProperties = { ...btn, backgroundColor: "var(--accent)", color: "#0A0A0B" };
  const btnSecondary: CSSProperties = { ...btn, backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", border: "1px solid var(--border)" };
  const input: CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", fontSize: 14 };
  const textarea: CSSProperties = { ...input, minHeight: 80, resize: "vertical" as const };
  const badge = (color: string): CSSProperties => ({ display: "inline-block", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, backgroundColor: `${color}20`, color });
  const tabBtn = (active: boolean): CSSProperties => ({ ...btn, backgroundColor: active ? "var(--accent)" : "var(--bg-surface)", color: active ? "#0A0A0B" : "var(--text-secondary)", border: active ? "none" : "1px solid var(--border)" });

  const filteredTemplates = filterCat === "all" ? templates : templates.filter(t => t.category === filterCat);

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 24, fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
        <Bell size={22} /> Push Notifications
      </h1>

      {/* FCM Status */}
      {fcmStatus && (
        <div style={{ ...card, display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {fcmStatus.configured ? <CheckCircle size={16} color="var(--green)" /> : <XCircle size={16} color="var(--red)" />}
            <span style={{ fontSize: 13 }}>FCM: {fcmStatus.configured ? `Configured (${fcmStatus.method})` : "Not configured"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Smartphone size={16} color="var(--text-secondary)" />
            <span style={{ fontSize: 13 }}>{fcmStatus.registeredDevices} registered device(s)</span>
          </div>
          {!fcmStatus.configured && (
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Set FCM_SERVER_KEY or FCM_PROJECT_ID + FCM_SERVICE_ACCOUNT_PATH in env
            </span>
          )}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <button style={tabBtn(view === "templates")} onClick={() => setView("templates")}><Zap size={14} /> Templates ({templates.length})</button>
        <button style={tabBtn(view === "welcome")} onClick={() => setView("welcome")}><Mail size={14} /> Welcome Messages</button>
        <button style={tabBtn(view === "send")} onClick={() => setView("send")}><Send size={14} /> Send Push</button>
        <button style={tabBtn(view === "log")} onClick={() => setView("log")}><RefreshCw size={14} /> Push Log</button>
      </div>

      {error && <div style={{ padding: "10px 14px", backgroundColor: "rgba(255,68,68,0.1)", border: "1px solid rgba(255,68,68,0.25)", borderRadius: 10, color: "var(--red)", fontSize: 13, marginBottom: 16 }}>{error}</div>}
      {success && <div style={{ padding: "10px 14px", backgroundColor: "rgba(0,200,100,0.1)", border: "1px solid rgba(0,200,100,0.25)", borderRadius: 10, color: "var(--green)", fontSize: 13, marginBottom: 16 }}>{success}</div>}

      {/* ── Templates view ── */}
      {view === "templates" && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <select style={{ ...input, width: "auto" }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              <option value="all">All categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{categoryLabel[c]}</option>)}
            </select>
            <button style={btnAccent} onClick={() => setShowNewForm(!showNewForm)}><Plus size={14} /> New Template</button>
          </div>

          {showNewForm && (
            <div style={card}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>New Push Template</h3>
              <div style={{ display: "grid", gap: 10 }}>
                <input style={input} placeholder="Slug (unique ID, e.g. my_promo)" value={newSlug} onChange={e => setNewSlug(e.target.value)} />
                <input style={input} placeholder="Title" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                <textarea style={textarea} placeholder="Body (use {{first_name}} etc.)" value={newBody} onChange={e => setNewBody(e.target.value)} />
                <div style={{ display: "flex", gap: 10 }}>
                  <select style={{ ...input, flex: 1 }} value={newCategory} onChange={e => setNewCategory(e.target.value)}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{categoryLabel[c]}</option>)}
                  </select>
                  <input style={{ ...input, flex: 1 }} placeholder="Trigger type" value={newTrigger} onChange={e => setNewTrigger(e.target.value)} />
                </div>
                <button style={btnAccent} onClick={createTemplate}>Create Template</button>
              </div>
            </div>
          )}

          {loading ? <p style={{ color: "var(--text-secondary)" }}>Loading...</p> : (
            filteredTemplates.map(t => (
              <div key={t.id} style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{t.title}</span>
                    <span style={badge(t.enabled ? "var(--green)" : "var(--red)")}>{t.enabled ? "ON" : "OFF"}</span>
                    <span style={badge("var(--accent)")}>{categoryLabel[t.category] || t.category}</span>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>{t.body}</p>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Trigger: {t.trigger_type} · Slug: {t.slug}</span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button style={btnSecondary} onClick={() => { setEditTemplate({ ...t }); setView("edit-template"); }}><Edit3 size={13} /></button>
                  <button style={btnSecondary} onClick={() => toggleTemplate(t)}>{t.enabled ? <XCircle size={13} /> : <CheckCircle size={13} />}</button>
                  <button style={{ ...btnSecondary, color: "var(--red)" }} onClick={() => deleteTemplate(t.id)}><Trash2 size={13} /></button>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {/* ── Edit template ── */}
      {view === "edit-template" && editTemplate && (
        <div style={card}>
          <button style={{ ...btnSecondary, marginBottom: 16 }} onClick={() => setView("templates")}><ArrowLeft size={14} /> Back</button>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Edit: {editTemplate.slug}</h3>
          <div style={{ display: "grid", gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>TITLE</label>
              <input style={input} value={editTemplate.title} onChange={e => setEditTemplate({ ...editTemplate, title: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>BODY</label>
              <textarea style={textarea} value={editTemplate.body} onChange={e => setEditTemplate({ ...editTemplate, body: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>TRIGGER</label>
              <input style={input} value={editTemplate.trigger_type} onChange={e => setEditTemplate({ ...editTemplate, trigger_type: e.target.value })} />
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input type="checkbox" checked={!!editTemplate.enabled} onChange={e => setEditTemplate({ ...editTemplate, enabled: e.target.checked ? 1 : 0 })} /> Enabled
              </label>
            </div>
            <button style={btnAccent} onClick={saveTemplate}>Save Changes</button>
          </div>
        </div>
      )}

      {/* ── Welcome messages ── */}
      {view === "welcome" && (
        <>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
            These messages are sent automatically when a new user or coach registers. Edit content and toggle on/off.
          </p>
          {loading ? <p style={{ color: "var(--text-secondary)" }}>Loading...</p> : (
            <>
              {["user", "coach"].map(target => (
                <div key={target}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, marginTop: 16, textTransform: "capitalize" }}>New {target} Messages</h3>
                  {welcomeMsgs.filter(m => m.target === target).map(m => {
                    const Icon = channelIcon[m.channel] || Bell;
                    return (
                      <div key={m.id} style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                            <Icon size={16} color="var(--accent)" />
                            <span style={{ fontWeight: 700, fontSize: 14, textTransform: "capitalize" }}>{m.channel.replace("_", "-")}</span>
                            <span style={badge(m.enabled ? "var(--green)" : "var(--red)")}>{m.enabled ? "ON" : "OFF"}</span>
                          </div>
                          {m.subject && <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Subject: {m.subject}</p>}
                          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{m.title}</p>
                          <p style={{ fontSize: 12, color: "var(--text-secondary)", whiteSpace: "pre-wrap", maxHeight: 80, overflow: "hidden" }}>{m.body}</p>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button style={btnSecondary} onClick={() => { setEditWelcome({ ...m }); setView("edit-welcome"); }}><Edit3 size={13} /></button>
                          <button style={btnSecondary} onClick={() => toggleWelcome(m)}>{m.enabled ? <XCircle size={13} /> : <CheckCircle size={13} />}</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </>
          )}
        </>
      )}

      {/* ── Edit welcome message ── */}
      {view === "edit-welcome" && editWelcome && (
        <div style={card}>
          <button style={{ ...btnSecondary, marginBottom: 16 }} onClick={() => setView("welcome")}><ArrowLeft size={14} /> Back</button>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
            Edit: {editWelcome.target} — {editWelcome.channel.replace("_", "-")}
          </h3>
          <div style={{ display: "grid", gap: 10 }}>
            {editWelcome.channel === "email" && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>SUBJECT</label>
                <input style={input} value={editWelcome.subject} onChange={e => setEditWelcome({ ...editWelcome, subject: e.target.value })} />
              </div>
            )}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>TITLE</label>
              <input style={input} value={editWelcome.title} onChange={e => setEditWelcome({ ...editWelcome, title: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>BODY (plain text)</label>
              <textarea style={{ ...textarea, minHeight: 120 }} value={editWelcome.body} onChange={e => setEditWelcome({ ...editWelcome, body: e.target.value })} />
            </div>
            {editWelcome.channel === "email" && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>HTML BODY (optional)</label>
                <textarea style={{ ...textarea, minHeight: 150, fontFamily: "monospace", fontSize: 12 }} value={editWelcome.html_body || ""} onChange={e => setEditWelcome({ ...editWelcome, html_body: e.target.value })} />
              </div>
            )}
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input type="checkbox" checked={!!editWelcome.enabled} onChange={e => setEditWelcome({ ...editWelcome, enabled: e.target.checked ? 1 : 0 })} /> Enabled
              </label>
            </div>
            <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
              Tokens: {"{{first_name}}"}, {"{{app_url}}"}. Use them in title, body, subject, and HTML.
            </p>
            <button style={btnAccent} onClick={saveWelcome}>Save Changes</button>
          </div>
        </div>
      )}

      {/* ── Send push ── */}
      {view === "send" && (
        <div style={card}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Send Push Notification</h3>
          <div style={{ display: "grid", gap: 10 }}>
            <input style={input} placeholder="Title" value={sendTitle} onChange={e => setSendTitle(e.target.value)} />
            <textarea style={textarea} placeholder="Body (use {{first_name}} for personalization)" value={sendBody} onChange={e => setSendBody(e.target.value)} />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>SEGMENT (blast)</label>
                <select style={input} value={sendSegment} onChange={e => setSendSegment(e.target.value)}>
                  <option value="all">All Users</option>
                  <option value="users">Users Only</option>
                  <option value="coaches">Coaches Only</option>
                  <option value="premium">Premium Users</option>
                  <option value="inactive">Inactive (7d+)</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>OR SPECIFIC USER ID</label>
                <input style={input} placeholder="User ID (optional)" value={sendUserId} onChange={e => setSendUserId(e.target.value)} />
              </div>
            </div>
            <button style={btnAccent} onClick={handleSend} disabled={sending}>
              <Send size={14} /> {sending ? "Sending..." : "Send Push"}
            </button>
          </div>
        </div>
      )}

      {/* ── Push log ── */}
      {view === "log" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Last 100 push notifications sent</p>
            <button style={btnSecondary} onClick={loadLog}><RefreshCw size={14} /> Refresh</button>
          </div>
          {loading ? <p style={{ color: "var(--text-secondary)" }}>Loading...</p> : (
            logEntries.length === 0 ? <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 32 }}>No push notifications sent yet</p> : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--text-secondary)", fontWeight: 600 }}>Time</th>
                      <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--text-secondary)", fontWeight: 600 }}>User</th>
                      <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--text-secondary)", fontWeight: 600 }}>Title</th>
                      <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--text-secondary)", fontWeight: 600 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logEntries.map(l => (
                      <tr key={l.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>{new Date(l.created_at).toLocaleString()}</td>
                        <td style={{ padding: "8px 12px" }}>{l.user_name || l.user_email || "—"}</td>
                        <td style={{ padding: "8px 12px" }}>
                          <strong>{l.title}</strong>
                          {l.template_slug && <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 6 }}>({l.template_slug})</span>}
                        </td>
                        <td style={{ padding: "8px 12px" }}>
                          <span style={badge(l.status === "sent" ? "var(--green)" : "var(--red)")}>{l.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
