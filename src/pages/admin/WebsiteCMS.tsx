import { getApiBase } from "@/lib/api";
import { useState, useEffect, useRef, type CSSProperties, type ChangeEvent } from "react";
import { Plus, Trash2, Eye, EyeOff, ChevronUp, ChevronDown, Edit3, Save, X, Upload, Image, Globe, Layout, Type, AlignLeft, Grid, Layers, ExternalLink, Languages, Search } from "lucide-react";
import { useI18n } from "@/context/I18nContext";

interface Section {
  id: number;
  page: string;
  type: string;
  label: string;
  content: any;
  sort_order: number;
  is_visible: number;
}

const PAGES = ["home", "about", "contact"] as const;
type Page = typeof PAGES[number];

const SECTION_TYPES: { type: string; label: string; icon: any; defaultContent: any }[] = [
  { type: "hero", label: "Hero Banner", icon: Layout,
    defaultContent: { badge: "", heading: "Your Heading Here", headingAccent: "Accent Text", subheading: "Your subheading text goes here.", primaryBtnText: "Get Started", primaryBtnLink: "/auth/register", secondaryBtnText: "Learn More", secondaryBtnLink: "/about", backgroundImage: "" } },
  { type: "stats", label: "Stats Bar", icon: Grid,
    defaultContent: { items: [{ value: "1K+", label: "Members" }, { value: "50+", label: "Programs" }, { value: "4.9★", label: "Rating" }, { value: "98%", label: "Satisfaction" }] } },
  { type: "features", label: "Features Grid", icon: Grid,
    defaultContent: { sectionLabel: "Why Us", heading: "Everything You Need", items: [{ icon: "Dumbbell", title: "Feature 1", desc: "Description here" }, { icon: "Brain", title: "Feature 2", desc: "Description here" }, { icon: "BarChart", title: "Feature 3", desc: "Description here" }, { icon: "Users", title: "Feature 4", desc: "Description here" }] } },
  { type: "text_image", label: "Text + Image", icon: AlignLeft,
    defaultContent: { sectionLabel: "", heading: "Section Heading", text: "Your text content goes here.", bullets: ["Point one", "Point two", "Point three"], imageSide: "right", imageUrl: "", linkText: "Learn more", linkUrl: "/" } },
  { type: "cards", label: "Cards Grid", icon: Layers,
    defaultContent: { sectionLabel: "", heading: "Cards Title", items: [{ icon: "Target", title: "Card 1", desc: "Description here", color: "accent" }, { icon: "Eye", title: "Card 2", desc: "Description here", color: "blue" }] } },
  { type: "cta", label: "CTA Banner", icon: ExternalLink,
    defaultContent: { badge: "JOIN US", heading: "Your Call to Action", subheading: "Supporting text here.", btnText: "Get Started", btnLink: "/auth/register" } },
  { type: "contact_info", label: "Contact Info + FAQ", icon: Type,
    defaultContent: { phone: "+1 234 567 8900", email: "hello@example.com", chatHours: "9am – 5pm", faqs: [{ q: "Question here?", a: "Answer here." }] } },
  { type: "calculator", label: "Calorie Calculator", icon: Grid,
    defaultContent: { sectionLabel: "Free Tool", heading: "Calorie Calculator" } },
  { type: "html", label: "Custom HTML", icon: Type,
    defaultContent: { html: "<div><h2>Custom HTML Section</h2><p>Edit this in the admin panel.</p></div>" } },
];

const ICON_OPTIONS = ["Dumbbell", "Brain", "BarChart", "Users", "Target", "Eye", "Shield", "Globe", "BookOpen", "Heart", "Zap", "Star", "Award", "Activity", "Smartphone"];
const COLOR_OPTIONS = ["accent", "blue", "cyan", "amber", "red"];

const iS: CSSProperties = { backgroundColor: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", width: "100%", fontSize: 13, color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif", outline: "none", boxSizing: "border-box" };
const taS: CSSProperties = { ...iS, resize: "vertical", minHeight: 80 };
const labelS: CSSProperties = { fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 5 };

interface Props {
  token: string | null;
  showMsg: (m: string) => void;
}

export default function WebsiteCMS({ token, showMsg }: Props) {
  const { t, lang } = useI18n();
  const l = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const [activePage, setActivePage] = useState<Page>("home");
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => { const h = () => setIsMobile(window.innerWidth < 768); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState<any>({});
  const [editLabel, setEditLabel] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState(SECTION_TYPES[0].type);
  const [addLabel, setAddLabel] = useState(SECTION_TYPES[0].label);
  const [saving, setSaving] = useState(false);
  const [brandingLoading, setBrandingLoading] = useState(false);
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [brandingForm, setBrandingForm] = useState<Record<string, string>>({});
  const [appSettings, setAppSettings] = useState<any[]>([]);
  const [appSettingsForm, setAppSettingsForm] = useState<Record<string, string>>({});
  const [settingsSaving, setSettingsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translationsForm, setTranslationsForm] = useState<Record<string, string>>({});
  const [translationsLoading, setTranslationsLoading] = useState(false);
  const [translationsSaving, setTranslationsSaving] = useState(false);
  const [translationSearch, setTranslationSearch] = useState("");
  const [newTransKey, setNewTransKey] = useState("");
  const [newTransVal, setNewTransVal] = useState("");

  const api = (path: string, opts?: RequestInit & { rawBody?: boolean }) => {
    const hdrs: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (!opts?.rawBody) hdrs["Content-Type"] = "application/json";
    return fetch(getApiBase() + path, { ...opts, headers: { ...hdrs, ...(opts?.headers || {}) } });
  };

  const apiForm = (path: string, body: FormData) =>
    fetch(getApiBase() + path, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body });

  const loadBranding = async () => {
    setBrandingLoading(true);
    try {
      const r = await api("/api/admin/app-settings");
      const d = await r.json();
      const rows = (d?.settings || []) as any[];
      const brandingRows = rows.filter((s: any) => s.category === "branding");
      const map: Record<string, string> = {};
      for (const s of brandingRows) map[s.setting_key] = s.setting_value || "";
      setBrandingForm(map);
    } catch {
      showMsg(t("cms_failed_load_branding"));
    } finally {
      setBrandingLoading(false);
    }
  };

  const saveBranding = async () => {
    setBrandingSaving(true);
    try {
      const keys = [
        "app_name", "app_tagline", "logo_url_en_light", "logo_url_en_dark", "logo_url_ar_light", "logo_url_ar_dark", "favicon_url", "footer_text", "copyright_text",
        "primary_color", "secondary_color", "bg_primary", "bg_card",
        "font_en", "font_ar", "font_heading",
        "social_instagram", "social_facebook", "social_twitter", "social_youtube",
      ];

      for (const key of ["logo_url_en_light", "logo_url_en_dark", "logo_url_ar_light", "logo_url_ar_dark"]) {
        if (!(key in brandingForm)) {
          try {
            await api("/api/admin/app-settings/add", {
              method: "POST",
              body: JSON.stringify({ key, value: "", type: "text", category: "branding", label: key }),
            });
          } catch {
            // Ignore if key already exists.
          }
        }
      }

      const payload: Record<string, string> = {};
      for (const k of keys) payload[k] = brandingForm[k] || "";
      const r = await api("/api/admin/app-settings", { method: "PUT", body: JSON.stringify(payload) });
      if (!r.ok) throw new Error("save failed");
      showMsg(t("cms_branding_saved"));
      window.dispatchEvent(new Event("branding:refresh"));
      loadBranding();
    } catch {
      showMsg(t("cms_failed_save_branding"));
    } finally {
      setBrandingSaving(false);
    }
  };

  const uploadBrandingImage = async (key: string, file: File) => {
    const fd = new FormData();
    fd.append("image", file);
    try {
      const resp = await fetch(getApiBase() + "/api/admin/upload-branding-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const d = await resp.json();
      if (!resp.ok || !d?.url) throw new Error("upload failed");
      setBrandingForm(prev => ({ ...prev, [key]: d.url }));

      if (!(key in brandingForm)) {
        try {
          await api("/api/admin/app-settings/add", {
            method: "POST",
            body: JSON.stringify({ key, value: "", type: "text", category: "branding", label: key }),
          });
        } catch {
          // Ignore if key already exists.
        }
      }

      // Persist the uploaded image URL immediately so branding context can read it.
      const saveResp = await api("/api/admin/app-settings", {
        method: "PUT",
        body: JSON.stringify({ [key]: d.url }),
      });
      if (!saveResp.ok) throw new Error("save failed");

      showMsg(t("cms_image_uploaded"));
      window.dispatchEvent(new Event("branding:refresh"));
      await loadBranding();
    } catch {
      showMsg(t("cms_failed_upload_branding_image"));
    }
  };

  const fetchAppSettings = async () => {
    try {
      const r = await api("/api/admin/app-settings");
      const d = await r.json();
      const all = d.settings || [];
      setAppSettings(all);
      const form: Record<string, string> = {};
      all.forEach((s: any) => form[s.setting_key] = s.setting_value);
      setAppSettingsForm(form);
    } catch {}
  };

  const loadTranslations = async () => {
    setTranslationsLoading(true);
    try {
      const r = await api("/api/admin/website-translations");
      const d = await r.json();
      const t = d.translations || {};
      setTranslations(t);
      setTranslationsForm({ ...t });
    } catch {} finally { setTranslationsLoading(false); }
  };

  const saveTranslations = async () => {
    setTranslationsSaving(true);
    try {
      const r = await api("/api/admin/website-translations", { method: "PUT", body: JSON.stringify({ translations: translationsForm }) });
      if (!r.ok) throw new Error();
      showMsg("✅ Translations saved!");
      setTranslations({ ...translationsForm });
    } catch { showMsg("❌ Failed to save translations"); }
    finally { setTranslationsSaving(false); }
  };

  const addTranslation = () => {
    if (!newTransKey.trim()) return;
    setTranslationsForm(prev => ({ ...prev, [newTransKey.trim()]: newTransVal.trim() }));
    setNewTransKey("");
    setNewTransVal("");
  };

  const removeTranslation = (key: string) => {
    setTranslationsForm(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const load = async () => {
    setLoading(true);
    const r = await api(`/api/cms/admin/sections/${activePage}`);
    const d = await r.json();
    setSections(d.sections || []);
    setLoading(false);
  };

  useEffect(() => { load(); setEditingId(null); }, [activePage]);
  useEffect(() => { loadBranding(); }, []);

  const toggleVisible = async (s: Section) => {
    await api(`/api/cms/admin/sections/${s.id}`, { method: "PUT", body: JSON.stringify({ is_visible: !s.is_visible }) });
    setSections(prev => prev.map(x => x.id === s.id ? { ...x, is_visible: x.is_visible ? 0 : 1 } : x));
  };

  const deleteSection = async (id: number) => {
    if (!confirm(t("cms_delete_section_confirm"))) return;
    await api(`/api/cms/admin/sections/${id}`, { method: "DELETE" });
    setSections(prev => prev.filter(x => x.id !== id));
    showMsg(t("cms_section_deleted"));
  };

  const moveSection = async (id: number, dir: "up" | "down") => {
    const idx = sections.findIndex(s => s.id === id);
    if (dir === "up" && idx === 0) return;
    if (dir === "down" && idx === sections.length - 1) return;
    const newSections = [...sections];
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    [newSections[idx], newSections[swapIdx]] = [newSections[swapIdx], newSections[idx]];
    const orders = newSections.map((s, i) => ({ id: s.id, sort_order: i + 1 }));
    setSections(newSections.map((s, i) => ({ ...s, sort_order: i + 1 })));
    await api("/api/cms/admin/sections/reorder", { method: "POST", body: JSON.stringify({ orders }) });
  };

  const startEdit = (s: Section) => {
    setEditingId(s.id);
    setEditContent(JSON.parse(JSON.stringify(s.content)));
    setEditLabel(s.label);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    await api(`/api/cms/admin/sections/${editingId}`, { method: "PUT", body: JSON.stringify({ label: editLabel, content: editContent }) });
    setSections(prev => prev.map(s => s.id === editingId ? { ...s, label: editLabel, content: editContent } : s));
    setEditingId(null);
    setSaving(false);
    showMsg(t("cms_section_saved"));
  };

  const addSection = async () => {
    const typeDef = SECTION_TYPES.find(t => t.type === addType)!;
    const r = await api("/api/cms/admin/sections", {
      method: "POST",
      body: JSON.stringify({ page: activePage, type: addType, label: addLabel || typeLabel(addType), content: typeDef.defaultContent }),
    });
    const d = await r.json();
    setSections(prev => [...prev, d.section]);
    setShowAddModal(false);
    setAddLabel("");
    showMsg(t("cms_section_added"));
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("image", file);
    const r = await apiForm("/api/cms/admin/upload-image", formData);
    const d = await r.json();
    if (d.url) {
      setEditContent((prev: any) => ({ ...prev, [field]: d.url }));
      showMsg(t("cms_image_uploaded"));
    }
    setUploadingFor(null);
  };

  // ── Content field editors by section type ────────────────────────────────────
  const renderContentEditor = (type: string) => {
    const c = editContent;
    const set = (field: string, value: any) => setEditContent((prev: any) => ({ ...prev, [field]: value }));

    const bilingualInput = (field: string, label: string, enPlaceholder = "", arPlaceholder = "") => (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={labelS}>{label} (EN)</label>
          <input style={iS} value={c[field] || ""} onChange={e => set(field, e.target.value)} placeholder={enPlaceholder} />
        </div>
        <div>
          <label style={labelS}>{label} (AR)</label>
          <input style={iS} value={c[`${field}_ar`] || ""} onChange={e => set(`${field}_ar`, e.target.value)} placeholder={arPlaceholder} dir="rtl" />
        </div>
      </div>
    );

    const bilingualTextarea = (field: string, label: string, enPlaceholder = "", arPlaceholder = "") => (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={labelS}>{label} (EN)</label>
          <textarea style={taS} value={c[field] || ""} onChange={e => set(field, e.target.value)} placeholder={enPlaceholder} />
        </div>
        <div>
          <label style={labelS}>{label} (AR)</label>
          <textarea style={taS} value={c[`${field}_ar`] || ""} onChange={e => set(`${field}_ar`, e.target.value)} placeholder={arPlaceholder} dir="rtl" />
        </div>
      </div>
    );

    const imageField = (field: string, label: string) => (
      <div>
        <label style={labelS}>{label}</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input style={{ ...iS, flex: 1 }} value={c[field] || ""} onChange={e => set(field, e.target.value)} placeholder={t("cms_paste_image_url") + "..."} />
          <button type="button" onClick={() => { setUploadingFor(field); fileInputRef.current?.click(); }}
            style={{ padding: "9px 12px", borderRadius: 8, backgroundColor: "var(--accent-dim)", border: "1px solid var(--accent)", color: "var(--accent)", cursor: "pointer", flexShrink: 0 }}>
            <Upload size={14} />
          </button>
        </div>
        {c[field] && <img src={c[field]} alt={t("preview")} style={{ marginTop: 8, maxHeight: 100, maxWidth: "100%", borderRadius: 8, objectFit: "contain", border: "1px solid var(--border)" }} />}
      </div>
    );

    if (type === "hero") return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {bilingualInput("badge", "Badge Text", "e.g. #1 FITNESS APP", "مثال: #١ تطبيق لياقة")}
        {bilingualInput("heading", "Heading")}
        {bilingualInput("headingAccent", "Heading Accent (colored)")}
        {bilingualTextarea("subheading", "Subheading")}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div><label style={labelS}>{l("Primary Button Link", "رابط الزر الأساسي")}</label><input style={iS} value={c.primaryBtnLink || ""} onChange={e => set("primaryBtnLink", e.target.value)} /></div>
          <div><label style={labelS}>{l("Secondary Button Link", "رابط الزر الثانوي")}</label><input style={iS} value={c.secondaryBtnLink || ""} onChange={e => set("secondaryBtnLink", e.target.value)} /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div><label style={labelS}>{l("Primary Button Text (EN)", "نص الزر الأساسي (EN)")}</label><input style={iS} value={c.primaryBtnText || ""} onChange={e => set("primaryBtnText", e.target.value)} /></div>
          <div><label style={labelS}>{l("Primary Button Text (AR)", "نص الزر الأساسي (AR)")}</label><input style={iS} value={c.primaryBtnText_ar || ""} onChange={e => set("primaryBtnText_ar", e.target.value)} dir="rtl" /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div><label style={labelS}>{l("Secondary Button Text (EN)", "نص الزر الثانوي (EN)")}</label><input style={iS} value={c.secondaryBtnText || ""} onChange={e => set("secondaryBtnText", e.target.value)} /></div>
          <div><label style={labelS}>{l("Secondary Button Text (AR)", "نص الزر الثانوي (AR)")}</label><input style={iS} value={c.secondaryBtnText_ar || ""} onChange={e => set("secondaryBtnText_ar", e.target.value)} dir="rtl" /></div>
        </div>
        {imageField("backgroundImage", "Background Image (optional)")}
      </div>
    );

    if (type === "stats") return (
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <label style={labelS}>{t("cms_stats_items")}</label>
          <button onClick={() => set("items", [...(c.items || []), { value: "0", label: "New Stat" }])}
            style={{ padding: "4px 10px", borderRadius: 6, backgroundColor: "var(--accent-dim)", border: "1px solid var(--accent)", color: "var(--accent)", cursor: "pointer", fontSize: 12 }}>+ {t("add")}</button>
        </div>
        {(c.items || []).map((item: any, i: number) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, marginBottom: 8 }}>
            <input style={iS} value={item.value} onChange={e => { const items = [...c.items]; items[i] = { ...item, value: e.target.value }; set("items", items); }} placeholder="12K+" />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <input style={iS} value={item.label} onChange={e => { const items = [...c.items]; items[i] = { ...item, label: e.target.value }; set("items", items); }} placeholder="Active Members (EN)" />
              <input style={iS} value={item.label_ar || ""} onChange={e => { const items = [...c.items]; items[i] = { ...item, label_ar: e.target.value }; set("items", items); }} placeholder="الأعضاء النشطون (AR)" dir="rtl" />
            </div>
            <button onClick={() => set("items", c.items.filter((_: any, j: number) => j !== i))}
              style={{ padding: "9px", borderRadius: 8, background: "rgba(255,68,68,0.1)", border: "1px solid var(--red)", color: "var(--red)", cursor: "pointer" }}><Trash2 size={13} /></button>
          </div>
        ))}
      </div>
    );

    if (type === "features" || type === "cards") return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {bilingualInput("sectionLabel", "Section Label")}
        {bilingualInput("heading", "Section Heading")}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <label style={labelS}>{type === "features" ? t("cms_feature_items") : t("cms_card_items")}</label>
            <button onClick={() => set("items", [...(c.items || []), { icon: "Dumbbell", title: "New Item", desc: "Description", color: "accent" }])}
              style={{ padding: "4px 10px", borderRadius: 6, backgroundColor: "var(--accent-dim)", border: "1px solid var(--accent)", color: "var(--accent)", cursor: "pointer", fontSize: 12 }}>+ {t("cms_add_item")}</button>
          </div>
          {(c.items || []).map((item: any, i: number) => (
            <div key={i} style={{ padding: 12, backgroundColor: "var(--bg-primary)", borderRadius: 10, border: "1px solid var(--border)", marginBottom: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, marginBottom: 8 }}>
                <div>
                  <label style={{ ...labelS, marginBottom: 4 }}>{t("icon")}</label>
                  <select style={iS} value={item.icon || ""} onChange={e => { const items = [...c.items]; items[i] = { ...item, icon: e.target.value }; set("items", items); }}>
                    <option value="">{t("none")}</option>
                    {ICON_OPTIONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ ...labelS, marginBottom: 4 }}>Title (EN)</label>
                  <input style={iS} value={item.title} onChange={e => { const items = [...c.items]; items[i] = { ...item, title: e.target.value }; set("items", items); }} />
                </div>
                <div>
                  <label style={{ ...labelS, marginBottom: 4 }}>Title (AR)</label>
                  <input style={iS} value={item.title_ar || ""} onChange={e => { const items = [...c.items]; items[i] = { ...item, title_ar: e.target.value }; set("items", items); }} dir="rtl" />
                </div>
                {type === "cards" && (
                  <div>
                    <label style={{ ...labelS, marginBottom: 4 }}>{t("color")}</label>
                    <select style={iS} value={item.color || "accent"} onChange={e => { const items = [...c.items]; items[i] = { ...item, color: e.target.value }; set("items", items); }}>
                      {COLOR_OPTIONS.map(co => <option key={co} value={co}>{co}</option>)}
                    </select>
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <button onClick={() => set("items", c.items.filter((_: any, j: number) => j !== i))}
                    style={{ padding: "9px", borderRadius: 8, background: "rgba(255,68,68,0.1)", border: "1px solid var(--red)", color: "var(--red)", cursor: "pointer" }}><Trash2 size={13} /></button>
                </div>
              </div>
              <div>
                <label style={{ ...labelS, marginBottom: 4 }}>Description (EN)</label>
                <textarea style={{ ...taS, minHeight: 60 }} value={item.desc} onChange={e => { const items = [...c.items]; items[i] = { ...item, desc: e.target.value }; set("items", items); }} />
              </div>
              <div>
                <label style={{ ...labelS, marginBottom: 4 }}>Description (AR)</label>
                <textarea style={{ ...taS, minHeight: 60 }} value={item.desc_ar || ""} onChange={e => { const items = [...c.items]; items[i] = { ...item, desc_ar: e.target.value }; set("items", items); }} dir="rtl" />
              </div>
              {type === "cards" && (
                <div style={{ marginTop: 8 }}>
                  <label style={{ ...labelS, marginBottom: 4 }}>{t("cms_card_image_url")} ({t("optional")})</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input style={{ ...iS, flex: 1 }} value={item.imageUrl || ""} onChange={e => { const items = [...c.items]; items[i] = { ...item, imageUrl: e.target.value }; set("items", items); }} placeholder="https://..." />
                    <button type="button" onClick={() => { setUploadingFor(`items.${i}.imageUrl`); fileInputRef.current?.click(); }}
                      style={{ padding: "9px 12px", borderRadius: 8, backgroundColor: "var(--accent-dim)", border: "1px solid var(--accent)", color: "var(--accent)", cursor: "pointer" }}><Upload size={14} /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );

    if (type === "text_image") return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {bilingualInput("sectionLabel", "Section Label")}
        {bilingualInput("heading", "Heading")}
        {bilingualTextarea("text", "Text Content")}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <label style={labelS}>{t("cms_bullet_points")}</label>
            <button onClick={() => set("bullets", [...(c.bullets || []), "New bullet point"])}
              style={{ padding: "4px 10px", borderRadius: 6, backgroundColor: "var(--accent-dim)", border: "1px solid var(--accent)", color: "var(--accent)", cursor: "pointer", fontSize: 12 }}>+ {t("add")}</button>
          </div>
          {(c.bullets || []).map((b: string, i: number) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, marginBottom: 6 }}>
              <input style={{ ...iS, flex: 1 }} value={b} onChange={e => { const bullets = [...(c.bullets || [])]; bullets[i] = e.target.value; set("bullets", bullets); }} placeholder="Bullet (EN)" />
              <input style={{ ...iS, flex: 1 }} value={(c.bullets_ar || [])[i] || ""} onChange={e => { const bulletsAr = [...(c.bullets_ar || [])]; bulletsAr[i] = e.target.value; set("bullets_ar", bulletsAr); }} placeholder="نقطة (AR)" dir="rtl" />
              <button onClick={() => set("bullets", c.bullets.filter((_: any, j: number) => j !== i))}
                style={{ padding: "9px", borderRadius: 8, background: "rgba(255,68,68,0.1)", border: "1px solid var(--red)", color: "var(--red)", cursor: "pointer" }}><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <div><label style={labelS}>{l("Image Side", "موضع الصورة")}</label>
            <select style={iS} value={c.imageSide || "right"} onChange={e => set("imageSide", e.target.value)}>
              <option value="right">{t("right")}</option><option value="left">{t("left")}</option>
            </select>
          </div>
          <div><label style={labelS}>{l("Link Text (EN)", "نص الرابط (EN)")}</label><input style={iS} value={c.linkText || ""} onChange={e => set("linkText", e.target.value)} /></div>
          <div><label style={labelS}>{l("Link Text (AR)", "نص الرابط (AR)")}</label><input style={iS} value={c.linkText_ar || ""} onChange={e => set("linkText_ar", e.target.value)} dir="rtl" /></div>
          <div><label style={labelS}>{l("Link URL", "رابط URL")}</label><input style={iS} value={c.linkUrl || ""} onChange={e => set("linkUrl", e.target.value)} /></div>
        </div>
        {imageField("imageUrl", "Section Image")}
      </div>
    );

    if (type === "cta") return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {bilingualInput("badge", "Badge Text", "e.g. JOIN 12,000+ MEMBERS", "مثال: انضم الآن")}
        {bilingualInput("heading", "Heading")}
        {bilingualInput("subheading", "Subheading")}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div><label style={labelS}>{l("Button Text (EN)", "نص الزر (EN)")}</label><input style={iS} value={c.btnText || ""} onChange={e => set("btnText", e.target.value)} /></div>
          <div><label style={labelS}>{l("Button Text (AR)", "نص الزر (AR)")}</label><input style={iS} value={c.btnText_ar || ""} onChange={e => set("btnText_ar", e.target.value)} dir="rtl" /></div>
          <div><label style={labelS}>{l("Button Link", "رابط الزر")}</label><input style={iS} value={c.btnLink || ""} onChange={e => set("btnLink", e.target.value)} /></div>
        </div>
      </div>
    );

    if (type === "contact_info") return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {bilingualInput("formTitle", "Form Title", "Send us a message", "راسلنا")}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div><label style={labelS}>Name Label (EN)</label><input style={iS} value={c.nameLabel || ""} onChange={e => set("nameLabel", e.target.value)} /></div>
          <div><label style={labelS}>Name Label (AR)</label><input style={iS} value={c.nameLabel_ar || ""} onChange={e => set("nameLabel_ar", e.target.value)} dir="rtl" /></div>
          <div><label style={labelS}>Email Label (EN)</label><input style={iS} value={c.emailLabel || ""} onChange={e => set("emailLabel", e.target.value)} /></div>
          <div><label style={labelS}>Email Label (AR)</label><input style={iS} value={c.emailLabel_ar || ""} onChange={e => set("emailLabel_ar", e.target.value)} dir="rtl" /></div>
          <div><label style={labelS}>Name Placeholder (EN)</label><input style={iS} value={c.namePlaceholder || ""} onChange={e => set("namePlaceholder", e.target.value)} /></div>
          <div><label style={labelS}>Name Placeholder (AR)</label><input style={iS} value={c.namePlaceholder_ar || ""} onChange={e => set("namePlaceholder_ar", e.target.value)} dir="rtl" /></div>
          <div><label style={labelS}>Email Placeholder (EN)</label><input style={iS} value={c.emailPlaceholder || ""} onChange={e => set("emailPlaceholder", e.target.value)} /></div>
          <div><label style={labelS}>Email Placeholder (AR)</label><input style={iS} value={c.emailPlaceholder_ar || ""} onChange={e => set("emailPlaceholder_ar", e.target.value)} dir="rtl" /></div>
          <div><label style={labelS}>Subject Label (EN)</label><input style={iS} value={c.subjectLabel || ""} onChange={e => set("subjectLabel", e.target.value)} /></div>
          <div><label style={labelS}>Subject Label (AR)</label><input style={iS} value={c.subjectLabel_ar || ""} onChange={e => set("subjectLabel_ar", e.target.value)} dir="rtl" /></div>
          <div><label style={labelS}>Message Label (EN)</label><input style={iS} value={c.messageLabel || ""} onChange={e => set("messageLabel", e.target.value)} /></div>
          <div><label style={labelS}>Message Label (AR)</label><input style={iS} value={c.messageLabel_ar || ""} onChange={e => set("messageLabel_ar", e.target.value)} dir="rtl" /></div>
          <div><label style={labelS}>Message Placeholder (EN)</label><input style={iS} value={c.messagePlaceholder || ""} onChange={e => set("messagePlaceholder", e.target.value)} /></div>
          <div><label style={labelS}>Message Placeholder (AR)</label><input style={iS} value={c.messagePlaceholder_ar || ""} onChange={e => set("messagePlaceholder_ar", e.target.value)} dir="rtl" /></div>
          <div><label style={labelS}>Send Button Text (EN)</label><input style={iS} value={c.sendBtnText || ""} onChange={e => set("sendBtnText", e.target.value)} /></div>
          <div><label style={labelS}>Send Button Text (AR)</label><input style={iS} value={c.sendBtnText_ar || ""} onChange={e => set("sendBtnText_ar", e.target.value)} dir="rtl" /></div>
          <div><label style={labelS}>Quick Contact Title (EN)</label><input style={iS} value={c.quickContactTitle || ""} onChange={e => set("quickContactTitle", e.target.value)} /></div>
          <div><label style={labelS}>Quick Contact Title (AR)</label><input style={iS} value={c.quickContactTitle_ar || ""} onChange={e => set("quickContactTitle_ar", e.target.value)} dir="rtl" /></div>
          <div><label style={labelS}>Live Chat Label (EN)</label><input style={iS} value={c.liveChatLabel || ""} onChange={e => set("liveChatLabel", e.target.value)} /></div>
          <div><label style={labelS}>Live Chat Label (AR)</label><input style={iS} value={c.liveChatLabel_ar || ""} onChange={e => set("liveChatLabel_ar", e.target.value)} dir="rtl" /></div>
          <div><label style={labelS}>WhatsApp Label (EN)</label><input style={iS} value={c.whatsappLabel || ""} onChange={e => set("whatsappLabel", e.target.value)} /></div>
          <div><label style={labelS}>WhatsApp Label (AR)</label><input style={iS} value={c.whatsappLabel_ar || ""} onChange={e => set("whatsappLabel_ar", e.target.value)} dir="rtl" /></div>
          <div><label style={labelS}>Email Row Label (EN)</label><input style={iS} value={c.emailContactLabel || ""} onChange={e => set("emailContactLabel", e.target.value)} /></div>
          <div><label style={labelS}>Email Row Label (AR)</label><input style={iS} value={c.emailContactLabel_ar || ""} onChange={e => set("emailContactLabel_ar", e.target.value)} dir="rtl" /></div>
          <div><label style={labelS}>FAQ Title (EN)</label><input style={iS} value={c.faqTitle || ""} onChange={e => set("faqTitle", e.target.value)} /></div>
          <div><label style={labelS}>FAQ Title (AR)</label><input style={iS} value={c.faqTitle_ar || ""} onChange={e => set("faqTitle_ar", e.target.value)} dir="rtl" /></div>
          <div><label style={labelS}>Subject Options (EN, comma-separated)</label><input style={iS} value={(c.subjectOptions || []).join(", ")} onChange={e => set("subjectOptions", e.target.value.split(",").map((v: string) => v.trim()).filter(Boolean))} /></div>
          <div><label style={labelS}>Subject Options (AR, comma-separated)</label><input style={iS} value={(c.subjectOptions_ar || []).join(", ")} onChange={e => set("subjectOptions_ar", e.target.value.split(",").map((v: string) => v.trim()).filter(Boolean))} dir="rtl" /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <div><label style={labelS}>{l("Phone / WhatsApp", "الهاتف / واتساب")}</label><input style={iS} value={c.phone || ""} onChange={e => set("phone", e.target.value)} /></div>
          <div><label style={labelS}>{l("Email", "البريد الإلكتروني")}</label><input style={iS} value={c.email || ""} onChange={e => set("email", e.target.value)} /></div>
          <div><label style={labelS}>{l("Chat Hours", "ساعات الدردشة")}</label><input style={iS} value={c.chatHours || ""} onChange={e => set("chatHours", e.target.value)} /></div>
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <label style={labelS}>{t("cms_faq_items")}</label>
            <button onClick={() => set("faqs", [...(c.faqs || []), { q: "New question?", a: "Answer here." }])}
              style={{ padding: "4px 10px", borderRadius: 6, backgroundColor: "var(--accent-dim)", border: "1px solid var(--accent)", color: "var(--accent)", cursor: "pointer", fontSize: 12 }}>+ {t("cms_add_faq")}</button>
          </div>
          {(c.faqs || []).map((faq: any, i: number) => (
            <div key={i} style={{ padding: 12, backgroundColor: "var(--bg-primary)", borderRadius: 10, border: "1px solid var(--border)", marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ ...labelS, marginBottom: 4 }}>Question (EN)</label>
                  <input style={iS} value={faq.q} onChange={e => { const faqs = [...c.faqs]; faqs[i] = { ...faq, q: e.target.value }; set("faqs", faqs); }} />
                  <label style={{ ...labelS, marginTop: 6, marginBottom: 4 }}>Question (AR)</label>
                  <input style={iS} value={faq.q_ar || ""} onChange={e => { const faqs = [...c.faqs]; faqs[i] = { ...faq, q_ar: e.target.value }; set("faqs", faqs); }} dir="rtl" />
                </div>
                <button onClick={() => set("faqs", c.faqs.filter((_: any, j: number) => j !== i))}
                  style={{ marginTop: 20, padding: "9px", borderRadius: 8, background: "rgba(255,68,68,0.1)", border: "1px solid var(--red)", color: "var(--red)", cursor: "pointer" }}><Trash2 size={13} /></button>
              </div>
              <label style={{ ...labelS, marginBottom: 4 }}>Answer (EN)</label>
              <textarea style={{ ...taS, minHeight: 60 }} value={faq.a} onChange={e => { const faqs = [...c.faqs]; faqs[i] = { ...faq, a: e.target.value }; set("faqs", faqs); }} />
              <label style={{ ...labelS, marginTop: 6, marginBottom: 4 }}>Answer (AR)</label>
              <textarea style={{ ...taS, minHeight: 60 }} value={faq.a_ar || ""} onChange={e => { const faqs = [...c.faqs]; faqs[i] = { ...faq, a_ar: e.target.value }; set("faqs", faqs); }} dir="rtl" />
            </div>
          ))}
        </div>
      </div>
    );

    if (type === "calculator") return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {bilingualInput("sectionLabel", "Section Label")}
        {bilingualInput("heading", "Heading")}
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("cms_calculator_embed_note")}</p>
      </div>
    );

    if (type === "html") return (
      <div>
        <label style={labelS}>Custom HTML (EN)</label>
        <textarea style={{ ...taS, minHeight: 160, fontFamily: "monospace", fontSize: 12 }} value={c.html || ""} onChange={e => set("html", e.target.value)} />
        <label style={{ ...labelS, marginTop: 10 }}>Custom HTML (AR)</label>
        <textarea style={{ ...taS, minHeight: 160, fontFamily: "monospace", fontSize: 12 }} value={c.html_ar || ""} onChange={e => set("html_ar", e.target.value)} dir="rtl" />
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>⚠️ {t("cms_html_warning")}</p>
      </div>
    );

    return <p style={{ color: "var(--text-muted)", fontSize: 13 }}>{t("cms_no_editor_for_type")} "{type}".</p>;
  };

  const typeInfo = (type: string) => SECTION_TYPES.find(t => t.type === type);
  const typeLabel = (type: string) => ({
    hero: t("cms_type_hero"),
    stats: t("cms_type_stats"),
    features: t("cms_type_features"),
    text_image: t("cms_type_text_image"),
    cards: t("cms_type_cards"),
    cta: t("cms_type_cta"),
    contact_info: t("cms_type_contact_info"),
    calculator: t("cms_type_calculator"),
    html: t("cms_type_html"),
  } as Record<string, string>)[type] || type;
  const pageColor = { home: "var(--accent)", about: "var(--blue)", contact: "var(--cyan)" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Hidden file input for image uploads */}
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
        if (!uploadingFor) return;
        // Handle nested path like "items.0.imageUrl"
        if (uploadingFor.startsWith("items.")) {
          const parts = uploadingFor.split(".");
          const idx = parseInt(parts[1]);
          const field = parts[2];
          const file = e.target.files?.[0];
          if (!file) return;
          const formData = new FormData();
          formData.append("image", file);
          fetch(getApiBase() + "/api/cms/admin/upload-image", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData })
            .then(r => r.json())
            .then(d => {
              if (d.url) {
                const items = [...editContent.items];
                items[idx] = { ...items[idx], [field]: d.url };
                setEditContent((prev: any) => ({ ...prev, items }));
                showMsg(t("cms_image_uploaded"));
              }
            });
        } else {
          handleImageUpload(e, uploadingFor);
        }
        e.target.value = "";
      }} />

      {/* Page Selector */}
      <div>
        <h2 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <Globe size={18} color="var(--accent)" /> {t("website_cms")}
        </h2>
        <div style={{ display: "flex", gap: 8 }}>
          {PAGES.map(p => (
            <button key={p} onClick={() => setActivePage(p)}
              style={{ padding: "9px 20px", borderRadius: 10, border: `2px solid ${activePage === p ? (pageColor as any)[p] : "var(--border)"}`, backgroundColor: activePage === p ? `${(pageColor as any)[p]}18` : "var(--bg-surface)", color: activePage === p ? (pageColor as any)[p] : "var(--text-muted)", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer", textTransform: "capitalize", transition: "all 0.15s" }}>
              {p === "home" ? "🏠" : p === "about" ? "📖" : "📞"} {p === "home" ? t("nav_home") : p === "about" ? t("about") : t("contact")}
            </button>
          ))}
          <a href={`/${activePage === "home" ? "" : activePage}`} target="_blank" rel="noopener noreferrer"
            style={{ marginInlineStart: "auto", padding: "9px 16px", borderRadius: 10, border: "1px solid var(--border)", backgroundColor: "var(--bg-surface)", color: "var(--text-secondary)", fontSize: 12, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
            <ExternalLink size={13} /> {t("preview")}
          </a>
        </div>
      </div>

      {/* Branding Editor */}
      <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <div>
            <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 15, fontWeight: 700 }}>🏷 {t("cms_branding_editor")}</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{t("cms_branding_editor_desc")}</p>
          </div>
          <button
            onClick={saveBranding}
            disabled={brandingSaving || brandingLoading}
            style={{ padding: "8px 16px", borderRadius: 9, border: "none", cursor: "pointer", backgroundColor: brandingSaving ? "var(--bg-surface)" : "var(--accent)", color: brandingSaving ? "var(--text-muted)" : "#0A0A0B", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 12 }}
          >
            {brandingSaving ? t("saving") : t("cms_save_branding")}
          </button>
        </div>

        {brandingLoading ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>{t("cms_loading_branding")}</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("cms_identity")}</p>
              <div><label style={labelS}>{t("cms_app_name")}</label><input style={iS} value={brandingForm.app_name || ""} onChange={e => setBrandingForm(v => ({ ...v, app_name: e.target.value }))} /></div>
              <div><label style={labelS}>{t("cms_tagline")}</label><input style={iS} value={brandingForm.app_tagline || ""} onChange={e => setBrandingForm(v => ({ ...v, app_tagline: e.target.value }))} /></div>
              <div><label style={labelS}>{t("cms_footer_text")}</label><textarea style={{ ...taS, minHeight: 70 }} value={brandingForm.footer_text || ""} onChange={e => setBrandingForm(v => ({ ...v, footer_text: e.target.value }))} /></div>
              <div><label style={labelS}>{t("cms_copyright_text")}</label><input style={iS} value={brandingForm.copyright_text || ""} onChange={e => setBrandingForm(v => ({ ...v, copyright_text: e.target.value }))} /></div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("cms_logo_favicon")}</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { key: "logo_url_en_light", label: "🇬🇧 English — Light Mode" },
                  { key: "logo_url_en_dark",  label: "🇬🇧 English — Dark Mode" },
                  { key: "logo_url_ar_light", label: "🇪🇬 Arabic — Light Mode" },
                  { key: "logo_url_ar_dark",  label: "🇪🇬 Arabic — Dark Mode" },
                ].map(({ key, label }) => (
                  <div key={key} style={{ backgroundColor: key.includes("dark") ? "#1a1a1a" : "#f5f5f5", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}>
                    <label style={{ ...labelS, color: key.includes("dark") ? "#ccc" : "#555" }}>{label}</label>
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      <label style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)", backgroundColor: key.includes("dark") ? "#2a2a2a" : "var(--bg-surface)", cursor: "pointer", fontSize: 12, color: key.includes("dark") ? "#eee" : "var(--text-secondary)", whiteSpace: "nowrap" }}>
                        📁 {t("upload")}
                        <input type="file" hidden accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) uploadBrandingImage(key, f); }} />
                      </label>
                      <input style={{ ...iS, flex: 1, fontSize: 11 }} value={brandingForm[key] || ""} onChange={e => setBrandingForm(v => ({ ...v, [key]: e.target.value }))} placeholder="URL or upload" />
                    </div>
                    <div style={{ marginTop: 8, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: key.includes("dark") ? "#111" : "#fff", borderRadius: 8, border: "1px solid var(--border)", padding: 6 }}>
                      {brandingForm[key] ? <img src={brandingForm[key]} alt={label} style={{ maxHeight: 40, maxWidth: "100%", objectFit: "contain" }} /> : <span style={{ fontSize: 11, color: "#999" }}>No logo</span>}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label style={labelS}>{t("cms_favicon")}</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input style={{ ...iS, flex: 1 }} value={brandingForm.favicon_url || ""} onChange={e => setBrandingForm(v => ({ ...v, favicon_url: e.target.value }))} placeholder="/uploads/favicon.png" />
                  <label style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", backgroundColor: "var(--bg-surface)", cursor: "pointer", fontSize: 12 }}>{t("upload")}
                    <input type="file" hidden accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) uploadBrandingImage("favicon_url", f); }} />
                  </label>
                </div>
                {brandingForm.favicon_url ? <img src={brandingForm.favicon_url} alt="favicon" style={{ marginTop: 8, width: 28, height: 28, borderRadius: 6, border: "1px solid var(--border)", backgroundColor: "var(--bg-surface)", padding: 4 }} /> : null}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("cms_colors_fonts")}</p>
              {[
                [t("cms_primary_color"), "primary_color"],
                [t("cms_secondary_color"), "secondary_color"],
                [t("cms_bg_primary"), "bg_primary"],
                [t("cms_bg_card"), "bg_card"],
              ].map(([label, key]) => (
                <div key={key as string}>
                  <label style={labelS}>{label}</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input type="color" value={brandingForm[key as string] || "#000000"} onChange={e => setBrandingForm(v => ({ ...v, [key]: e.target.value }))} style={{ width: 44, height: 36, borderRadius: 8, border: "1px solid var(--border)", backgroundColor: "var(--bg-surface)" }} />
                    <input style={{ ...iS, flex: 1 }} value={brandingForm[key as string] || ""} onChange={e => setBrandingForm(v => ({ ...v, [key]: e.target.value }))} />
                  </div>
                </div>
              ))}
              <div><label style={labelS}>{t("cms_font_en")}</label><input style={iS} value={brandingForm.font_en || ""} onChange={e => setBrandingForm(v => ({ ...v, font_en: e.target.value }))} /></div>
              <div><label style={labelS}>{t("cms_font_ar")}</label><input style={iS} value={brandingForm.font_ar || ""} onChange={e => setBrandingForm(v => ({ ...v, font_ar: e.target.value }))} /></div>
              <div><label style={labelS}>{t("cms_font_heading")}</label><input style={iS} value={brandingForm.font_heading || ""} onChange={e => setBrandingForm(v => ({ ...v, font_heading: e.target.value }))} /></div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("cms_social_links")}</p>
              <div><label style={labelS}>{t("cms_instagram")}</label><input style={iS} value={brandingForm.social_instagram || ""} onChange={e => setBrandingForm(v => ({ ...v, social_instagram: e.target.value }))} /></div>
              <div><label style={labelS}>{t("cms_facebook")}</label><input style={iS} value={brandingForm.social_facebook || ""} onChange={e => setBrandingForm(v => ({ ...v, social_facebook: e.target.value }))} /></div>
              <div><label style={labelS}>{t("cms_twitter")}</label><input style={iS} value={brandingForm.social_twitter || ""} onChange={e => setBrandingForm(v => ({ ...v, social_twitter: e.target.value }))} /></div>
              <div><label style={labelS}>{t("cms_youtube")}</label><input style={iS} value={brandingForm.social_youtube || ""} onChange={e => setBrandingForm(v => ({ ...v, social_youtube: e.target.value }))} /></div>
            </div>
          </div>
        )}
      </div>

      {/* Sections List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>{t("cms_loading_sections")}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sections.map((s, idx) => {
            const info = typeInfo(s.type);
            const IconComp = info?.icon || Layout;
            const isEditing = editingId === s.id;
            return (
              <div key={s.id} style={{ backgroundColor: "var(--bg-card)", border: `1px solid ${isEditing ? "var(--accent)" : "var(--border)"}`, borderRadius: 14, overflow: "hidden", transition: "border-color 0.2s" }}>
                {/* Section Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", backgroundColor: isEditing ? "var(--accent-dim)" : "transparent" }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: s.is_visible ? "var(--accent-dim)" : "var(--bg-surface)", border: `1px solid ${s.is_visible ? "rgba(200,255,0,0.3)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <IconComp size={15} color={s.is_visible ? "var(--accent)" : "var(--text-muted)"} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</p>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{typeLabel(s.type)} · {t("order")} {idx + 1}</p>
                  </div>
                  {/* Visibility badge */}
                  <div style={{ padding: "3px 10px", borderRadius: 20, backgroundColor: s.is_visible ? "var(--accent-dim)" : "var(--bg-surface)", border: `1px solid ${s.is_visible ? "rgba(200,255,0,0.3)" : "var(--border)"}`, fontSize: 11, fontWeight: 600, color: s.is_visible ? "var(--accent)" : "var(--text-muted)" }}>
                    {s.is_visible ? t("visible") : t("hidden")}
                  </div>
                  {/* Controls */}
                  <div style={{ display: "flex", gap: 4 }}>
                    <button title={t("move_up")} onClick={() => moveSection(s.id, "up")} disabled={idx === 0}
                      style={{ width: 30, height: 30, borderRadius: 7, background: "none", border: "1px solid var(--border)", cursor: idx === 0 ? "default" : "pointer", opacity: idx === 0 ? 0.3 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <ChevronUp size={13} color="var(--text-secondary)" />
                    </button>
                    <button title={t("move_down")} onClick={() => moveSection(s.id, "down")} disabled={idx === sections.length - 1}
                      style={{ width: 30, height: 30, borderRadius: 7, background: "none", border: "1px solid var(--border)", cursor: idx === sections.length - 1 ? "default" : "pointer", opacity: idx === sections.length - 1 ? 0.3 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <ChevronDown size={13} color="var(--text-secondary)" />
                    </button>
                    <button title={s.is_visible ? t("hide") : t("show")} onClick={() => toggleVisible(s)}
                      style={{ width: 30, height: 30, borderRadius: 7, background: s.is_visible ? "rgba(200,255,0,0.08)" : "none", border: `1px solid ${s.is_visible ? "rgba(200,255,0,0.3)" : "var(--border)"}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {s.is_visible ? <Eye size={13} color="var(--accent)" /> : <EyeOff size={13} color="var(--text-muted)" />}
                    </button>
                    <button title={isEditing ? t("close") : t("edit")} onClick={() => isEditing ? setEditingId(null) : startEdit(s)}
                      style={{ width: 30, height: 30, borderRadius: 7, background: isEditing ? "var(--accent-dim)" : "none", border: `1px solid ${isEditing ? "var(--accent)" : "var(--border)"}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {isEditing ? <X size={13} color="var(--accent)" /> : <Edit3 size={13} color="var(--text-secondary)" />}
                    </button>
                    <button title={t("delete")} onClick={() => deleteSection(s.id)}
                      style={{ width: 30, height: 30, borderRadius: 7, background: "none", border: "1px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Trash2 size={13} color="var(--red)" />
                    </button>
                  </div>
                </div>

                {/* Section Content Editor */}
                {isEditing && (
                  <div style={{ padding: "16px 18px", borderTop: "1px solid var(--border)", backgroundColor: "var(--bg-surface)" }}>
                    <div style={{ marginBottom: 14 }}>
                      <label style={labelS}>{t("cms_section_label_admin")}</label>
                      <input style={iS} value={editLabel} onChange={e => setEditLabel(e.target.value)} />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ ...labelS, marginBottom: 10 }}>{t("content")}</label>
                      {renderContentEditor(s.type)}
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={saveEdit} disabled={saving}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 9, backgroundColor: "var(--accent)", color: "#0A0A0B", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 13, border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
                        <Save size={14} /> {saving ? t("saving") : t("save_changes")}
                      </button>
                      <button onClick={() => setEditingId(null)}
                        style={{ padding: "10px 16px", borderRadius: 9, backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: 13, cursor: "pointer" }}>
                        {t("cancel")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add Section Button */}
          <button onClick={() => { setAddLabel(typeLabel(addType)); setShowAddModal(true); }}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px", borderRadius: 14, border: "2px dashed var(--border)", backgroundColor: "transparent", color: "var(--text-muted)", fontSize: 14, cursor: "pointer", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 600, transition: "border-color 0.15s, color 0.15s" }}
            onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)"; }}
            onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}>
            <Plus size={18} /> {t("cms_add_new_section")}
          </button>
        </div>
      )}

      {/* Add Section Modal */}
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 18, padding: "28px 24px", width: "100%", maxWidth: 560, maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <h3 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 16, fontWeight: 700 }}>{t("cms_add_new_section")}</h3>
              <button onClick={() => setShowAddModal(false)} style={{ width: 30, height: 30, borderRadius: 7, background: "none", border: "1px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelS}>{t("cms_section_type_layout")}</label>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(155px, 1fr))", gap: 8, marginTop: 8 }}>
                  {SECTION_TYPES.map(st => {
                    const Ic = st.icon;
                    return (
                      <button key={st.type} onClick={() => { setAddType(st.type); setAddLabel(typeLabel(st.type)); }}
                        style={{ padding: "12px", borderRadius: 10, border: `2px solid ${addType === st.type ? "var(--accent)" : "var(--border)"}`, backgroundColor: addType === st.type ? "var(--accent-dim)" : "var(--bg-surface)", cursor: "pointer", textAlign: "start", transition: "all 0.15s" }}>
                        <Ic size={16} color={addType === st.type ? "var(--accent)" : "var(--text-secondary)"} />
                        <p style={{ fontSize: 12, fontWeight: 600, marginTop: 6, color: addType === st.type ? "var(--accent)" : "var(--text-primary)" }}>{typeLabel(st.type)}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label style={labelS}>{t("cms_section_label_admin_ref")}</label>
                <input style={iS} value={addLabel} onChange={e => setAddLabel(e.target.value)} placeholder={typeLabel(addType)} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={addSection}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 24px", borderRadius: 10, backgroundColor: "var(--accent)", color: "#0A0A0B", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer" }}>
                  <Plus size={15} /> {t("cms_add_section")}
                </button>
                <button onClick={() => setShowAddModal(false)}
                  style={{ padding: "12px 18px", borderRadius: 10, backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: 14, cursor: "pointer" }}>
                  {t("cancel")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* APP CONFIGURATION */}
      {/* Website Translations Manager */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
              <Languages size={18} color="var(--accent)" /> Website Translations
            </p>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Manage Arabic fallback translations for website text</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {Object.keys(translationsForm).length > 0 && (
              <button onClick={saveTranslations} disabled={translationsSaving} style={{ padding: "8px 20px", borderRadius: 9, background: translationsSaving ? "var(--bg-surface)" : "var(--accent)", color: translationsSaving ? "var(--text-muted)" : "#0A0A0B", border: "none", cursor: "pointer", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 13 }}>
                {translationsSaving ? "Saving…" : "💾 Save Translations"}
              </button>
            )}
          </div>
        </div>

        {Object.keys(translationsForm).length === 0 && !translationsLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
            <button onClick={loadTranslations} style={{ padding: "10px 24px", borderRadius: 10, background: "var(--accent)", color: "#0A0A0B", border: "none", cursor: "pointer", fontWeight: 700 }}>Load Translations</button>
          </div>
        ) : translationsLoading ? (
          <div style={{ padding: 30, textAlign: "center", color: "var(--text-muted)" }}>Loading translations...</div>
        ) : (
          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px" }}>
            {/* Search + Add */}
            <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
                <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input value={translationSearch} onChange={e => setTranslationSearch(e.target.value)} placeholder="Search translations..." style={{ ...iS, paddingLeft: 36 }} />
              </div>
            </div>

            {/* Add new translation */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, marginBottom: 14, padding: "10px 12px", backgroundColor: "var(--bg-surface)", borderRadius: 10, border: "1px solid var(--border)" }}>
              <input style={iS} value={newTransKey} onChange={e => setNewTransKey(e.target.value)} placeholder="English text (key)" />
              <input style={iS} value={newTransVal} onChange={e => setNewTransVal(e.target.value)} placeholder="Arabic translation" dir="rtl" />
              <button onClick={addTranslation} style={{ padding: "9px 14px", borderRadius: 8, backgroundColor: "var(--accent-dim)", border: "1px solid var(--accent)", color: "var(--accent)", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>+ Add</button>
            </div>

            {/* Translations list */}
            <div style={{ maxHeight: 400, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
              {Object.entries(translationsForm)
                .filter(([k, v]) => !translationSearch || k.toLowerCase().includes(translationSearch.toLowerCase()) || v.toLowerCase().includes(translationSearch.toLowerCase()))
                .map(([key, val]) => (
                  <div key={key} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "center" }}>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", padding: "6px 8px", backgroundColor: "var(--bg-primary)", borderRadius: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={key}>{key}</div>
                    <input style={{ ...iS, fontSize: 12 }} value={val} onChange={e => setTranslationsForm(prev => ({ ...prev, [key]: e.target.value }))} dir="rtl" />
                    <button onClick={() => removeTranslation(key)} style={{ padding: "6px", borderRadius: 6, background: "rgba(255,68,68,0.1)", border: "1px solid var(--red)", color: "var(--red)", cursor: "pointer" }}><Trash2 size={12} /></button>
                  </div>
                ))}
            </div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 10 }}>{Object.keys(translationsForm).length} translation(s)</p>
          </div>
        )}
      </div>

      {/* APP SETTINGS */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 16, fontWeight: 700 }}>⚙ App Configuration</p>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Manage branding, theme, access rules, and pricing stored in database</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => {
              const key = prompt("Setting key (e.g. my_setting):");
              if (!key) return;
              const label = prompt("Label:") || key;
              const type = prompt("Type (text/color/number/boolean/image/font):") || "text";
              const category = prompt("Category (branding/access/pricing/points):") || "branding";
              const value = prompt("Default value:") || "";
              api("/api/admin/app-settings/add", { method: "POST", body: JSON.stringify({ key, value, type, category, label }) })
                .then(r => { if (r.ok) { showMsg("✅ Setting added!"); fetchAppSettings(); } else { showMsg("❌ Failed — key may already exist"); } })
                .catch(() => showMsg("❌ Network error"));
            }} style={{ padding: "8px 16px", borderRadius: 9, background: "var(--bg-surface)", color: "var(--text-primary)", border: "1px solid var(--border)", cursor: "pointer", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 12 }}>
              + Add Setting
            </button>
            <button onClick={() => { setSettingsSaving(true); api("/api/admin/app-settings", { method: "PUT", body: JSON.stringify(appSettingsForm) }).then(() => { showMsg("✅ Settings saved!"); setSettingsSaving(false); fetchAppSettings(); }).catch(() => setSettingsSaving(false)); }} disabled={settingsSaving} style={{ padding: "8px 20px", borderRadius: 9, background: settingsSaving ? "var(--bg-surface)" : "var(--accent)", color: settingsSaving ? "var(--text-muted)" : "#0A0A0B", border: "none", cursor: "pointer", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 13 }}>
              {settingsSaving ? "Saving…" : "💾 Save All"}
            </button>
          </div>
        </div>
        {appSettings.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
            <button onClick={fetchAppSettings} style={{ padding: "10px 24px", borderRadius: 10, background: "var(--accent)", color: "#0A0A0B", border: "none", cursor: "pointer", fontWeight: 700 }}>Load Settings</button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
            {["branding", "access", "pricing", "points"].map(cat => {
              const catSettings = appSettings.filter((s: any) => s.category === cat && !s.setting_key.startsWith("logo_url"));
              if (catSettings.length === 0) return null;
              const catLabels: Record<string, string> = { branding: "🏷 Branding (Colors & Fonts)", access: "🔒 Access Control", pricing: "💰 Pricing", points: "🎯 Points System" };
              const GOOGLE_EN_FONTS = ["Outfit", "Roboto", "Inter", "Poppins", "Montserrat", "Open Sans", "Lato", "Raleway", "Nunito", "Manrope", "DM Sans", "Space Grotesk"];
              const GOOGLE_AR_FONTS = ["Cairo", "Tajawal", "Noto Sans Arabic", "Almarai", "El Messiri", "Amiri", "Changa", "Readex Pro", "IBM Plex Sans Arabic", "Noto Kufi Arabic"];
              const HEADING_FONTS = ["Chakra Petch", "Orbitron", "Audiowide", "Cairo", "Tajawal", "Poppins", "Montserrat"];
              return (
                <div key={cat} style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px" }}>
                  <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 13, fontWeight: 700, marginBottom: 14, color: "var(--accent)" }}>{catLabels[cat] || cat}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {catSettings.map((s: any) => (
                      <div key={s.setting_key}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                          <label style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{s.label}</label>
                          <button onClick={() => {
                            if (!confirm(`Delete setting "${s.label}"?`)) return;
                            api(`/api/admin/app-settings/${s.setting_key}`, { method: "DELETE" })
                              .then(r => { if (r.ok) { showMsg("🗑️ Setting removed"); fetchAppSettings(); } })
                              .catch(() => showMsg("❌ Failed to delete"));
                          }} title="Remove setting" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 13, padding: "0 2px", opacity: 0.5 }}>✕</button>
                        </div>
                        {s.setting_type === "image" ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {appSettingsForm[s.setting_key] && (
                              <div style={{ position: "relative", display: "inline-block" }}>
                                <img src={appSettingsForm[s.setting_key]} alt={s.label} style={{ maxHeight: 64, maxWidth: 200, borderRadius: 8, border: "1px solid var(--border)", objectFit: "contain", backgroundColor: "var(--bg-surface)", padding: 4 }} />
                                <button onClick={() => setAppSettingsForm(f => ({ ...f, [s.setting_key]: "" }))} style={{ position: "absolute", top: -6, insetInlineEnd: -6, width: 20, height: 20, borderRadius: "50%", background: "var(--red)", color: "#fff", border: "none", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                              </div>
                            )}
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <label style={{ padding: "6px 14px", borderRadius: 8, background: "var(--bg-surface)", border: "1px solid var(--border)", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>
                                📁 Upload
                                <input type="file" accept="image/*" hidden onChange={async e => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const fd = new FormData();
                                  fd.append("image", file);
                                  try {
                                    const resp = await api("/api/admin/upload-branding-image", { method: "POST", body: fd, rawBody: true });
                                    const r = await resp.json();
                                    if (r?.url) { setAppSettingsForm(f => ({ ...f, [s.setting_key]: r.url })); showMsg("✅ Image uploaded!"); }
                                  } catch { showMsg("❌ Upload failed"); }
                                }} />
                              </label>
                              <input type="text" value={appSettingsForm[s.setting_key] || ""} onChange={e => setAppSettingsForm(f => ({ ...f, [s.setting_key]: e.target.value }))} className="input-base" style={{ flex: 1, fontSize: 12 }} placeholder="Or paste image URL…" />
                            </div>
                          </div>
                        ) : s.setting_type === "font" ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <select value={appSettingsForm[s.setting_key] || ""} onChange={e => setAppSettingsForm(f => ({ ...f, [s.setting_key]: e.target.value }))} className="input-base" style={{ cursor: "pointer" }}>
                              {(s.setting_key === "font_ar" ? GOOGLE_AR_FONTS : s.setting_key === "font_heading" ? HEADING_FONTS : GOOGLE_EN_FONTS).map(f => (
                                <option key={f} value={f}>{f}</option>
                              ))}
                              <option value="__custom__">⬆ Upload custom font…</option>
                            </select>
                            <p style={{ fontSize: 12, color: "var(--text-secondary)", fontFamily: `'${appSettingsForm[s.setting_key] || "Outfit"}', sans-serif` }}>
                              Preview: {s.setting_key === "font_ar" ? "مرحبًا بك في فيت واي" : "The quick brown fox jumps"}
                            </p>
                            {appSettingsForm[s.setting_key] === "__custom__" && (
                              <div>
                                <input type="file" accept=".woff,.woff2,.ttf,.otf" onChange={async e => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const fd = new FormData();
                                  fd.append("font", file);
                                  fd.append("font_name", file.name.replace(/\.[^.]+$/, ""));
                                  try {
                                    const resp = await api("/api/admin/upload-font", { method: "POST", body: fd, rawBody: true });
                                    const r = await resp.json();
                                    if (r?.name) { setAppSettingsForm(f => ({ ...f, [s.setting_key]: r.name })); showMsg(`✅ Font "${r.name}" uploaded!`); }
                                  } catch { showMsg("❌ Font upload failed"); }
                                }} style={{ fontSize: 12 }} />
                                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Upload .woff2, .woff, .ttf or .otf file</p>
                              </div>
                            )}
                          </div>
                        ) : s.setting_type === "color" ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <input type="color" value={appSettingsForm[s.setting_key] || "#000000"} onChange={e => setAppSettingsForm(f => ({ ...f, [s.setting_key]: e.target.value }))} style={{ width: 40, height: 36, borderRadius: 8, border: "1px solid var(--border)", cursor: "pointer", padding: 2, backgroundColor: "var(--bg-surface)" }} />
                            <input type="text" value={appSettingsForm[s.setting_key] || ""} onChange={e => setAppSettingsForm(f => ({ ...f, [s.setting_key]: e.target.value }))} className="input-base" style={{ flex: 1 }} placeholder="#RRGGBB" />
                          </div>
                        ) : s.setting_type === "boolean" ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <button onClick={() => setAppSettingsForm(f => ({ ...f, [s.setting_key]: f[s.setting_key] === "1" ? "0" : "1" }))} style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: appSettingsForm[s.setting_key] === "1" ? "var(--accent)" : "var(--bg-surface)", border: "1px solid var(--border)", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
                              <div style={{ position: "absolute", top: 3, insetInlineStart: appSettingsForm[s.setting_key] === "1" ? 22 : 3, width: 16, height: 16, borderRadius: "50%", backgroundColor: appSettingsForm[s.setting_key] === "1" ? "#0A0A0B" : "var(--text-muted)", transition: "all 0.2s" }} />
                            </button>
                            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{appSettingsForm[s.setting_key] === "1" ? "Enabled" : "Disabled"}</span>
                          </div>
                        ) : (
                          <input type={s.setting_type === "number" ? "number" : "text"} value={appSettingsForm[s.setting_key] || ""} onChange={e => setAppSettingsForm(f => ({ ...f, [s.setting_key]: e.target.value }))} className="input-base" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
