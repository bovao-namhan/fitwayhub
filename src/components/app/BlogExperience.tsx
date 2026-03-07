import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bold,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  PenSquare,
  PlayCircle,
  Quote,
  Save,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import {
  type BlogPost,
  type BlogStatus,
  fetchBlogs,
  fetchPublicBlogs,
  removeBlog,
  resolveMediaUrl,
  saveBlog,
} from "@/lib/blogs";

interface BlogExperienceProps {
  mode: "website" | "app" | "coach" | "admin";
  heading: string;
  subheading: string;
  allowWriting?: boolean;
}

interface DraftState {
  title: string;
  excerpt: string;
  content: string;
  status: BlogStatus;
}

const defaultDraft: DraftState = {
  title: "",
  excerpt: "",
  content: "",
  status: "draft",
};

function markdownToHtml(markdown: string): string {
  const escaped = markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped
    .replace(/^###\s+(.+)$/gm, "<h3>$1</h3>")
    .replace(/^##\s+(.+)$/gm, "<h2>$1</h2>")
    .replace(/^>\s+(.+)$/gm, "<blockquote>$1</blockquote>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, "<code>$1</code>")
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/^-\s+(.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")
    .replace(/\n\n/g, "<br/><br/>")
    .replace(/\n/g, "<br/>");
}

function toDate(value: string | null): string {
  if (!value) return "Unpublished";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unpublished" : date.toLocaleDateString();
}

function estimateReadMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export default function BlogExperience({ mode, heading, subheading, allowWriting = false }: BlogExperienceProps) {
  const { token, user } = useAuth();
  const { t } = useI18n();
  const canWrite = allowWriting && !!token && (user?.role === "coach" || user?.role === "admin");

  const [activeTab, setActiveTab] = useState<"feed" | "manage">(canWrite ? "manage" : "feed");
  const [query, setQuery] = useState("");
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showEditor, setShowEditor] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [draft, setDraft] = useState<DraftState>(defaultDraft);
  const [headerFile, setHeaderFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [removeHeaderImage, setRemoveHeaderImage] = useState(false);
  const [removeVideo, setRemoveVideo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const editorRef = useRef<HTMLTextAreaElement | null>(null);

  const draftKey = useMemo(
    () => `fitway_blog_draft_${mode}_${user?.id || "guest"}`,
    [mode, user?.id]
  );

  const selectedPost = useMemo(
    () => posts.find((post) => post.id === selectedId) || posts[0] || null,
    [posts, selectedId]
  );

  async function loadPosts() {
    setLoading(true);
    setError("");
    try {
      let nextPosts: BlogPost[] = [];

      if (mode === "website") {
        nextPosts = await fetchPublicBlogs(query);
      } else if (!token) {
        nextPosts = await fetchPublicBlogs(query);
      } else if (canWrite && activeTab === "manage") {
        nextPosts = await fetchBlogs(token, "manage", query);
      } else {
        nextPosts = await fetchBlogs(token, "feed", query);
      }

      setPosts(nextPosts);
      setSelectedId((prev) => prev || nextPosts[0]?.id || null);
    } catch (err: any) {
      setError(err.message || "Failed to load blog posts");
      setPosts([]);
      setSelectedId(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => loadPosts(), 220);
    return () => window.clearTimeout(timer);
  }, [query, activeTab, token, mode, canWrite]);

  useEffect(() => {
    if (!showEditor || editingPost) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setDraft({ ...defaultDraft, ...parsed });
    } catch {
      // Ignore draft hydration errors.
    }
  }, [showEditor, editingPost, draftKey]);

  useEffect(() => {
    if (!showEditor || editingPost) return;
    const timer = window.setTimeout(() => {
      localStorage.setItem(draftKey, JSON.stringify(draft));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [draft, showEditor, editingPost, draftKey]);

  useEffect(() => {
    if (!showEditor) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (!saving && canWrite) {
          void onSave("draft");
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showEditor, saving, canWrite, draft, headerFile, videoFile, removeHeaderImage, removeVideo, editingPost]);

  function openNewEditor() {
    setEditingPost(null);
    setDraft(defaultDraft);
    setHeaderFile(null);
    setVideoFile(null);
    setRemoveHeaderImage(false);
    setRemoveVideo(false);
    setPreviewMode(false);
    setShowEditor(true);
  }

  function openEditEditor(post: BlogPost) {
    setEditingPost(post);
    setDraft({
      title: post.title,
      excerpt: post.excerpt || "",
      content: post.content || "",
      status: post.status,
    });
    setHeaderFile(null);
    setVideoFile(null);
    setRemoveHeaderImage(false);
    setRemoveVideo(false);
    setPreviewMode(false);
    setShowEditor(true);
  }

  function closeEditor() {
    setShowEditor(false);
    setEditingPost(null);
    setSaving(false);
  }

  function insertSyntax(before: string, after = "", placeholder = "text") {
    const textarea = editorRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = draft.content.slice(start, end) || placeholder;
    const next = `${draft.content.slice(0, start)}${before}${selected}${after}${draft.content.slice(end)}`;

    setDraft((prev) => ({ ...prev, content: next }));

    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + before.length + selected.length + after.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  async function onSave(status: BlogStatus) {
    if (!token) {
      setError("You need to be signed in.");
      return;
    }

    if (!draft.title.trim() || !draft.content.trim()) {
      setError("Title and content are required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const saved = await saveBlog(
        token,
        {
          ...draft,
          status,
          headerImage: headerFile,
          video: videoFile,
          removeHeaderImage,
          removeVideo,
        },
        editingPost?.id
      );

      localStorage.removeItem(draftKey);
      closeEditor();
      await loadPosts();
      setSelectedId(saved.id);
    } catch (err: any) {
      setError(err.message || "Failed to save post");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(postId: number) {
    if (!token) return;
    if (!window.confirm("Delete this post?")) return;

    try {
      await removeBlog(token, postId);
      await loadPosts();
    } catch (err: any) {
      setError(err.message || "Failed to delete post");
    }
  }

  const words = draft.content.trim().split(/\s+/).filter(Boolean).length;
  const readMinutes = estimateReadMinutes(draft.content);

  return (
    <section style={{ padding: 20, display: "grid", gap: 18 }}>
      <header style={{ display: "grid", gap: 8 }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(24px,3vw,34px)", margin: 0 }}>{heading}</h1>
        <p style={{ margin: 0, color: "var(--text-secondary)" }}>{subheading}</p>
      </header>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "10px 12px",
          minWidth: 260,
          flex: 1,
        }}>
          <Search size={16} color="var(--text-secondary)" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search") || "Search blogs"}
            style={{ border: "none", background: "transparent", color: "var(--text-primary)", width: "100%", outline: "none" }}
          />
        </div>

        {canWrite && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setActiveTab("feed")}
              style={{
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: activeTab === "feed" ? "var(--accent-dim)" : "var(--bg-card)",
                color: activeTab === "feed" ? "var(--accent)" : "var(--text-secondary)",
                padding: "10px 12px",
                cursor: "pointer",
              }}
            >
              Reader View
            </button>
            <button
              onClick={() => setActiveTab("manage")}
              style={{
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: activeTab === "manage" ? "var(--blue)" : "var(--bg-card)",
                color: activeTab === "manage" ? "#fff" : "var(--text-secondary)",
                padding: "10px 12px",
                cursor: "pointer",
              }}
            >
              Writer Studio
            </button>
            <button
              onClick={openNewEditor}
              style={{
                borderRadius: 10,
                border: "none",
                background: "var(--accent)",
                color: "#111",
                padding: "10px 14px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <PenSquare size={16} /> New Post
            </button>
          </div>
        )}
      </div>

      {error && (
        <div style={{ background: "rgba(255,68,68,0.1)", border: "1px solid rgba(255,68,68,0.35)", color: "#ff8f8f", borderRadius: 12, padding: "10px 12px" }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 360px) 1fr", gap: 14 }} className="grid-2col">
        <aside style={{ display: "grid", gap: 10, alignContent: "start" }}>
          {loading ? (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, color: "var(--text-secondary)" }}>
              Loading posts...
            </div>
          ) : posts.length === 0 ? (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, color: "var(--text-secondary)" }}>
              No posts found.
            </div>
          ) : (
            posts.map((post) => {
              const active = post.id === (selectedPost?.id || 0);
              return (
                <button
                  key={post.id}
                  onClick={() => setSelectedId(post.id)}
                  style={{
                    textAlign: "left",
                    border: "1px solid",
                    borderColor: active ? "var(--accent)" : "var(--border)",
                    background: active ? "var(--accent-dim)" : "var(--bg-card)",
                    borderRadius: 14,
                    padding: 12,
                    cursor: "pointer",
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <strong style={{ color: "var(--text-primary)", lineHeight: 1.3 }}>{post.title}</strong>
                    <small style={{ color: post.status === "published" ? "var(--accent)" : "var(--amber)", fontWeight: 700 }}>
                      {post.status}
                    </small>
                  </div>
                  <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 13 }}>
                    {(post.excerpt || "No excerpt").slice(0, 95)}
                  </p>
                  <small style={{ color: "var(--text-muted)" }}>{toDate(post.published_at || post.created_at)} • {post.author_name || "Unknown"}</small>
                </button>
              );
            })
          )}
        </aside>

        <article style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 16 }}>
          {selectedPost ? (
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: "clamp(22px,2.5vw,30px)" }}>{selectedPost.title}</h2>
                  <p style={{ margin: "6px 0 0", color: "var(--text-secondary)" }}>
                    By {selectedPost.author_name || "Unknown"} • {toDate(selectedPost.published_at || selectedPost.created_at)} • {estimateReadMinutes(selectedPost.content)} min read
                  </p>
                </div>
                {canWrite && activeTab === "manage" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => openEditEditor(selectedPost)} style={{ border: "1px solid var(--border)", background: "var(--bg-surface)", color: "var(--text-primary)", borderRadius: 10, padding: "8px 10px", cursor: "pointer" }}>Edit</button>
                    <button onClick={() => onDelete(selectedPost.id)} style={{ border: "1px solid rgba(255,68,68,0.4)", background: "rgba(255,68,68,0.1)", color: "#ff9a9a", borderRadius: 10, padding: "8px 10px", cursor: "pointer" }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              {selectedPost.header_image_url && (
                <img src={resolveMediaUrl(selectedPost.header_image_url)} alt="Header" style={{ width: "100%", maxHeight: 360, objectFit: "cover", borderRadius: 14, border: "1px solid var(--border)" }} />
              )}

              {selectedPost.video_url && (
                <video controls src={resolveMediaUrl(selectedPost.video_url)} style={{ width: "100%", borderRadius: 14, border: "1px solid var(--border)", background: "#000" }} />
              )}

              {selectedPost.excerpt && (
                <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 17, lineHeight: 1.6 }}>{selectedPost.excerpt}</p>
              )}

              <div
                style={{ color: "var(--text-primary)", lineHeight: 1.8, fontSize: 16 }}
                dangerouslySetInnerHTML={{ __html: markdownToHtml(selectedPost.content) }}
              />
            </div>
          ) : (
            <div style={{ color: "var(--text-secondary)" }}>Select a post to start reading.</div>
          )}
        </article>
      </div>

      {showEditor && canWrite && (
        <div style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(3px)", padding: 16, overflowY: "auto" }}>
          <div style={{ maxWidth: 1160, margin: "0 auto", background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 20, padding: 16, display: "grid", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <h3 style={{ margin: 0, fontSize: 22 }}>{editingPost ? "Edit Blog Post" : "Write New Blog Post"}</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={() => setPreviewMode((prev) => !prev)} style={{ border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-primary)", borderRadius: 10, padding: "8px 10px", cursor: "pointer" }}>
                  <Sparkles size={14} /> {previewMode ? "Editor" : "Preview"}
                </button>
                <button onClick={closeEditor} style={{ border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", borderRadius: 10, padding: "8px 10px", cursor: "pointer" }}>
                  Close
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }} className="grid-2col">
              <section style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 14, display: "grid", gap: 10 }}>
                <input
                  value={draft.title}
                  onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Post title"
                  className="input-base"
                  style={{ fontSize: 18, fontWeight: 700 }}
                />
                <textarea
                  value={draft.excerpt}
                  onChange={(e) => setDraft((prev) => ({ ...prev, excerpt: e.target.value }))}
                  placeholder="Short excerpt for cards and social previews"
                  className="input-base"
                  style={{ minHeight: 84, resize: "vertical" }}
                />

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "8px 0" }}>
                  <button onClick={() => insertSyntax("## ", "", "Section title")} style={{ border: "1px solid var(--border)", background: "var(--bg-surface)", color: "var(--text-primary)", borderRadius: 8, padding: "6px 8px", cursor: "pointer" }}><Heading2 size={14} /></button>
                  <button onClick={() => insertSyntax("### ", "", "Sub-section")} style={{ border: "1px solid var(--border)", background: "var(--bg-surface)", color: "var(--text-primary)", borderRadius: 8, padding: "6px 8px", cursor: "pointer" }}><Heading3 size={14} /></button>
                  <button onClick={() => insertSyntax("**", "**", "bold")} style={{ border: "1px solid var(--border)", background: "var(--bg-surface)", color: "var(--text-primary)", borderRadius: 8, padding: "6px 8px", cursor: "pointer" }}><Bold size={14} /></button>
                  <button onClick={() => insertSyntax("*", "*", "italic")} style={{ border: "1px solid var(--border)", background: "var(--bg-surface)", color: "var(--text-primary)", borderRadius: 8, padding: "6px 8px", cursor: "pointer" }}><Italic size={14} /></button>
                  <button onClick={() => insertSyntax("- ", "", "list item")} style={{ border: "1px solid var(--border)", background: "var(--bg-surface)", color: "var(--text-primary)", borderRadius: 8, padding: "6px 8px", cursor: "pointer" }}><List size={14} /></button>
                  <button onClick={() => insertSyntax("1. ", "", "list item")} style={{ border: "1px solid var(--border)", background: "var(--bg-surface)", color: "var(--text-primary)", borderRadius: 8, padding: "6px 8px", cursor: "pointer" }}><ListOrdered size={14} /></button>
                  <button onClick={() => insertSyntax("> ", "", "quote")} style={{ border: "1px solid var(--border)", background: "var(--bg-surface)", color: "var(--text-primary)", borderRadius: 8, padding: "6px 8px", cursor: "pointer" }}><Quote size={14} /></button>
                  <button onClick={() => insertSyntax("[", "](https://)", "link text")} style={{ border: "1px solid var(--border)", background: "var(--bg-surface)", color: "var(--text-primary)", borderRadius: 8, padding: "6px 8px", cursor: "pointer" }}><LinkIcon size={14} /></button>
                </div>

                {!previewMode ? (
                  <textarea
                    ref={editorRef}
                    value={draft.content}
                    onChange={(e) => setDraft((prev) => ({ ...prev, content: e.target.value }))}
                    placeholder="Write your article..."
                    className="input-base"
                    style={{ minHeight: 340, resize: "vertical", lineHeight: 1.7 }}
                  />
                ) : (
                  <div style={{ minHeight: 340, border: "1px solid var(--border)", borderRadius: 10, padding: 14, background: "var(--bg-surface)" }}>
                    <div dangerouslySetInnerHTML={{ __html: markdownToHtml(draft.content) }} />
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                  <small style={{ color: "var(--text-muted)" }}>{words} words • {readMinutes} min read • Autosave enabled</small>
                  <small style={{ color: "var(--text-muted)" }}>Tip: press Ctrl/Cmd + S to save draft</small>
                </div>
              </section>

              <aside style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 14, display: "grid", gap: 12, alignContent: "start" }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Header Image</span>
                  <label style={{ border: "1px dashed var(--border-light)", borderRadius: 12, padding: 12, cursor: "pointer", background: "var(--bg-surface)", display: "grid", gap: 6 }}>
                    <input type="file" accept="image/*" onChange={(e) => setHeaderFile(e.target.files?.[0] || null)} style={{ display: "none" }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)" }}><ImageIcon size={14} /> {headerFile ? headerFile.name : "Upload header image"}</div>
                    <small style={{ color: "var(--text-muted)" }}>Use 16:9 for clean hero visuals.</small>
                  </label>
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Video Upload</span>
                  <label style={{ border: "1px dashed var(--border-light)", borderRadius: 12, padding: 12, cursor: "pointer", background: "var(--bg-surface)", display: "grid", gap: 6 }}>
                    <input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} style={{ display: "none" }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)" }}><PlayCircle size={14} /> {videoFile ? videoFile.name : "Upload article video"}</div>
                    <small style={{ color: "var(--text-muted)" }}>MP4 recommended for browser compatibility.</small>
                  </label>
                </label>

                {editingPost?.header_image_url && (
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)" }}>
                    <input type="checkbox" checked={removeHeaderImage} onChange={(e) => setRemoveHeaderImage(e.target.checked)} /> Remove current header image
                  </label>
                )}
                {editingPost?.video_url && (
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)" }}>
                    <input type="checkbox" checked={removeVideo} onChange={(e) => setRemoveVideo(e.target.checked)} /> Remove current video
                  </label>
                )}

                <div style={{ display: "grid", gap: 8 }}>
                  <button
                    onClick={() => onSave("draft")}
                    disabled={saving}
                    style={{ borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-surface)", color: "var(--text-primary)", padding: "10px 12px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                  >
                    <Save size={15} /> Save Draft
                  </button>
                  <button
                    onClick={() => onSave("published")}
                    disabled={saving}
                    style={{ borderRadius: 10, border: "none", background: "var(--accent)", color: "#111", padding: "10px 12px", cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                  >
                    <Upload size={15} /> {saving ? "Saving..." : "Publish"}
                  </button>
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
