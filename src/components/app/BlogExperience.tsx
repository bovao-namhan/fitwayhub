import { useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";
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

function toDate(value: string | null, lang: "en" | "ar"): string {
  if (!value) return lang === "ar" ? "غير منشور" : "Unpublished";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? (lang === "ar" ? "غير منشور" : "Unpublished") : date.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US");
}

function estimateReadMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export default function BlogExperience({ mode, heading, subheading, allowWriting = false }: BlogExperienceProps) {
  const { token, user } = useAuth();
  const { t, lang } = useI18n();
  const canWrite = allowWriting && !!token && (user?.role === "coach" || user?.role === "admin");
  const blogText = {
    loadFailed: lang === "ar" ? "فشل تحميل المقالات" : "Failed to load blog posts",
    signinNeeded: lang === "ar" ? "لازم تكون مسجل دخول." : "You need to be signed in.",
    titleContentRequired: lang === "ar" ? "العنوان والمحتوى مطلوبين." : "Title and content are required.",
    saveFailed: lang === "ar" ? "فشل حفظ المقال" : "Failed to save post",
    deleteConfirm: lang === "ar" ? "تحذف المقال ده؟" : "Delete this post?",
    deleteFailed: lang === "ar" ? "فشل حذف المقال" : "Failed to delete post",
    readerView: lang === "ar" ? "وضع القراءة" : "Reader View",
    writerStudio: lang === "ar" ? "استوديو الكتابة" : "Writer Studio",
    newPost: lang === "ar" ? "مقال جديد" : "New Post",
    loadingPosts: lang === "ar" ? "جارٍ تحميل المقالات..." : "Loading posts...",
    noPosts: lang === "ar" ? "مفيش مقالات." : "No posts found.",
    noExcerpt: lang === "ar" ? "مفيش ملخص" : "No excerpt",
    unknown: lang === "ar" ? "غير معروف" : "Unknown",
    by: lang === "ar" ? "بواسطة" : "By",
    minRead: lang === "ar" ? "دقايق قراءة" : "min read",
    selectPost: lang === "ar" ? "اختار مقال عشان تبدأ تقرأ." : "Select a post to start reading.",
    editPost: lang === "ar" ? "تعديل المقال" : "Edit Blog Post",
    writePost: lang === "ar" ? "اكتب مقال جديد" : "Write New Blog Post",
    editor: lang === "ar" ? "المحرر" : "Editor",
    close: lang === "ar" ? "قفل" : "Close",
    postTitle: lang === "ar" ? "عنوان المقال" : "Post title",
    postExcerpt: lang === "ar" ? "ملخص قصير للكروت ومعاينات السوشيال" : "Short excerpt for cards and social previews",
    writeArticle: lang === "ar" ? "اكتب مقالك..." : "Write your article...",
    words: lang === "ar" ? "كلمة" : "words",
    autosave: lang === "ar" ? "حفظ تلقائي شغال" : "Autosave enabled",
    tipSave: lang === "ar" ? "نصيحة: اضغط Ctrl/Cmd + S لحفظ المسودة" : "Tip: press Ctrl/Cmd + S to save draft",
    headerImage: lang === "ar" ? "صورة الغلاف" : "Header Image",
    uploadHeader: lang === "ar" ? "ارفع صورة الغلاف" : "Upload header image",
    headerHint: lang === "ar" ? "مقاس 16:9 يطلع أنضف في الواجهة." : "Use 16:9 for clean hero visuals.",
    videoUpload: lang === "ar" ? "رفع فيديو" : "Video Upload",
    uploadVideo: lang === "ar" ? "ارفع فيديو للمقال" : "Upload article video",
    videoHint: lang === "ar" ? "يفضل MP4 عشان يشتغل كويس على المتصفح." : "MP4 recommended for browser compatibility.",
    removeHeader: lang === "ar" ? "امسح صورة الغلاف الحالية" : "Remove current header image",
    removeVideo: lang === "ar" ? "امسح الفيديو الحالي" : "Remove current video",
    saveDraft: lang === "ar" ? "احفظ مسودة" : "Save Draft",
    saving: lang === "ar" ? "جارٍ الحفظ..." : "Saving...",
    publish: lang === "ar" ? "انشر" : "Publish",
  };

  const [activeTab, setActiveTab] = useState<"feed" | "manage">(canWrite ? "manage" : "feed");
  const [query, setQuery] = useState("");
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showEditor, setShowEditor] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [draft, setDraft] = useState<DraftState>(defaultDraft);
  const [language, setLanguage] = useState<"en" | "ar">("en");
  const [relatedBlogId, setRelatedBlogId] = useState<number | null>(null);
  const [headerFile, setHeaderFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [removeHeaderImage, setRemoveHeaderImage] = useState(false);
  const [removeVideo, setRemoveVideo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const editorRef = useRef<HTMLTextAreaElement | null>(null);

  // Detect video duration client-side when file is selected
  const handleVideoFileChange = (file: File | null) => {
    setVideoFile(file);
    setVideoDuration(null);

    if (!file) return;

    // Use HTML5 video API to detect duration
    const reader = new FileReader();
    reader.onload = (e) => {
      const video = document.createElement("video");
      video.onloadedmetadata = () => {
        setVideoDuration(Math.round(video.duration));
      };
      video.onerror = () => {
        // If duration detection fails, it will be null - backend will try to detect it
        console.warn("Failed to detect video duration client-side");
      };
      video.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

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
      const displayLang = lang as "en" | "ar";

      if (mode === "website") {
        nextPosts = await fetchPublicBlogs(query, displayLang);
      } else if (!token) {
        nextPosts = await fetchPublicBlogs(query, displayLang);
      } else if (canWrite && activeTab === "manage") {
        nextPosts = await fetchBlogs(token, "manage", query, displayLang);
      } else {
        nextPosts = await fetchBlogs(token, "feed", query, displayLang);
      }

      setPosts(nextPosts);
      setSelectedId((prev) => prev || nextPosts[0]?.id || null);
    } catch (err: any) {
      setError(err.message || blogText.loadFailed);
      setPosts([]);
      setSelectedId(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => loadPosts(), 220);
    return () => window.clearTimeout(timer);
  }, [query, activeTab, token, mode, canWrite, lang]);

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
    setLanguage("en");
    setRelatedBlogId(null);
    setHeaderFile(null);
    setVideoFile(null);
    setVideoDuration(null);
    setUploadProgress(0);
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
    setLanguage(post.language || "en");
    setRelatedBlogId(post.related_blog_id || null);
    setHeaderFile(null);
    setVideoFile(null);
    setVideoDuration(null);
    setUploadProgress(0);
    setRemoveHeaderImage(false);
    setRemoveVideo(false);
    setPreviewMode(false);
    setShowEditor(true);
  }

  function closeEditor() {
    setShowEditor(false);
    setEditingPost(null);
    setSaving(false);
    setUploadProgress(0);
    setLanguage("en");
    setRelatedBlogId(null);
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
      setError(blogText.signinNeeded);
      return;
    }

    if (!draft.title.trim() || !draft.content.trim()) {
      setError(blogText.titleContentRequired);
      return;
    }

    setSaving(true);
    setError("");
    setUploadProgress(0);

    try {
      const saved = await saveBlog(
        token,
        {
          ...draft,
          status,
          language,
          relatedBlogId,
          headerImage: headerFile,
          video: videoFile,
          videoDuration,
          removeHeaderImage,
          removeVideo,
        },
        editingPost?.id,
        (percentage) => setUploadProgress(percentage)
      );

      localStorage.removeItem(draftKey);
      closeEditor();
      await loadPosts();
      setSelectedId(saved.id);
    } catch (err: any) {
      setError(err.message || blogText.saveFailed);
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  }

  async function onDelete(postId: number) {
    if (!token) return;
    if (!window.confirm(blogText.deleteConfirm)) return;

    try {
      await removeBlog(token, postId);
      await loadPosts();
    } catch (err: any) {
      setError(err.message || blogText.deleteFailed);
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
            placeholder={t("search_placeholder") || (lang === "ar" ? "ابحث في المقالات" : "Search blogs")}
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
              {blogText.readerView}
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
              {blogText.writerStudio}
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
              <PenSquare size={16} /> {blogText.newPost}
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
              {blogText.loadingPosts}
            </div>
          ) : posts.length === 0 ? (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, color: "var(--text-secondary)" }}>
              {blogText.noPosts}
            </div>
          ) : (
            posts.map((post) => {
              const active = post.id === (selectedPost?.id || 0);
              return (
                <button
                  key={post.id}
                  onClick={() => setSelectedId(post.id)}
                  style={{
                    textAlign: "start",
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
                    {(post.excerpt || blogText.noExcerpt).slice(0, 95)}
                  </p>
                  <small style={{ color: "var(--text-muted)" }}>{toDate(post.published_at || post.created_at, lang)} • {post.author_name || blogText.unknown}</small>
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
                    {blogText.by} {selectedPost.author_name || blogText.unknown} • {toDate(selectedPost.published_at || selectedPost.created_at, lang)} • {estimateReadMinutes(selectedPost.content)} {blogText.minRead}
                  </p>
                </div>
                {canWrite && activeTab === "manage" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => openEditEditor(selectedPost)} style={{ border: "1px solid var(--border)", background: "var(--bg-surface)", color: "var(--text-primary)", borderRadius: 10, padding: "8px 10px", cursor: "pointer" }}>{t("edit")}</button>
                    <button onClick={() => onDelete(selectedPost.id)} style={{ border: "1px solid rgba(255,68,68,0.4)", background: "rgba(255,68,68,0.1)", color: "#ff9a9a", borderRadius: 10, padding: "8px 10px", cursor: "pointer" }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              {selectedPost.header_image_url && (
                <img src={resolveMediaUrl(selectedPost.header_image_url)} alt={blogText.headerImage} style={{ width: "100%", maxHeight: 360, objectFit: "cover", borderRadius: 14, border: "1px solid var(--border)" }} />
              )}

              {selectedPost.video_url && (
                <video controls src={resolveMediaUrl(selectedPost.video_url)} style={{ width: "100%", borderRadius: 14, border: "1px solid var(--border)", background: "#000" }} />
              )}

              {selectedPost.excerpt && (
                <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 17, lineHeight: 1.6 }}>{selectedPost.excerpt}</p>
              )}

              <div
                style={{ color: "var(--text-primary)", lineHeight: 1.8, fontSize: 16 }}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(markdownToHtml(selectedPost.content)) }}
              />
            </div>
          ) : (
            <div style={{ color: "var(--text-secondary)" }}>{blogText.selectPost}</div>
          )}
        </article>
      </div>

      {showEditor && canWrite && (
        <div style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(3px)", padding: 16, overflowY: "auto" }}>
          <div style={{ maxWidth: 1160, margin: "0 auto", background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 20, padding: 16, display: "grid", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <h3 style={{ margin: 0, fontSize: 22 }}>{editingPost ? blogText.editPost : blogText.writePost}</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={() => setPreviewMode((prev) => !prev)} style={{ border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-primary)", borderRadius: 10, padding: "8px 10px", cursor: "pointer" }}>
                  <Sparkles size={14} /> {previewMode ? blogText.editor : t("preview")}
                </button>
                <button onClick={closeEditor} style={{ border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", borderRadius: 10, padding: "8px 10px", cursor: "pointer" }}>
                  {blogText.close}
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }} className="grid-2col">
              <section style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 14, display: "grid", gap: 10 }}>
                <input
                  value={draft.title}
                  onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder={blogText.postTitle}
                  className="input-base"
                  style={{ fontSize: 18, fontWeight: 700 }}
                />
                <textarea
                  value={draft.excerpt}
                  onChange={(e) => setDraft((prev) => ({ ...prev, excerpt: e.target.value }))}
                  placeholder={blogText.postExcerpt}
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
                    placeholder={blogText.writeArticle}
                    className="input-base"
                    style={{ minHeight: 340, resize: "vertical", lineHeight: 1.7 }}
                  />
                ) : (
                  <div style={{ minHeight: 340, border: "1px solid var(--border)", borderRadius: 10, padding: 14, background: "var(--bg-surface)" }}>
                    <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(markdownToHtml(draft.content)) }} />
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                  <small style={{ color: "var(--text-muted)" }}>{words} {blogText.words} • {readMinutes} {blogText.minRead} • {blogText.autosave}</small>
                  <small style={{ color: "var(--text-muted)" }}>{blogText.tipSave}</small>
                </div>
              </section>

              <aside style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 14, display: "grid", gap: 12, alignContent: "start" }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Language</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => {
                        if (!editingPost) {
                          setLanguage("en");
                          setDraft(defaultDraft);
                          setHeaderFile(null);
                          setVideoFile(null);
                          setVideoDuration(null);
                          setRemoveHeaderImage(false);
                          setRemoveVideo(false);
                        }
                      }}
                      disabled={!!editingPost}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: `1px solid ${language === "en" ? "var(--accent)" : "var(--border)"}`,
                        background: language === "en" ? "var(--accent-dim)" : "var(--bg-surface)",
                        color: language === "en" ? "var(--accent)" : "var(--text-secondary)",
                        cursor: editingPost ? "not-allowed" : "pointer",
                        opacity: editingPost ? 0.5 : 1,
                        fontWeight: language === "en" ? 600 : 400,
                        fontSize: 12,
                      }}
                    >
                      🇬🇧 English
                    </button>
                    <button
                      onClick={() => {
                        if (!editingPost) {
                          setLanguage("ar");
                          setDraft(defaultDraft);
                          setHeaderFile(null);
                          setVideoFile(null);
                          setVideoDuration(null);
                          setRemoveHeaderImage(false);
                          setRemoveVideo(false);
                        }
                      }}
                      disabled={!!editingPost}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: `1px solid ${language === "ar" ? "var(--accent)" : "var(--border)"}`,
                        background: language === "ar" ? "var(--accent-dim)" : "var(--bg-surface)",
                        color: language === "ar" ? "var(--accent)" : "var(--text-secondary)",
                        cursor: editingPost ? "not-allowed" : "pointer",
                        opacity: editingPost ? 0.5 : 1,
                        fontWeight: language === "ar" ? 600 : 400,
                        fontSize: 12,
                      }}
                    >
                      🇸🇦 العربية
                    </button>
                  </div>
                  {!editingPost && (
                    <small style={{ color: "var(--text-muted)", fontSize: 11 }}>
                      {lang === "ar" ? "اختر اللغة قبل البدء في الكتابة" : "Select language before writing"}
                    </small>
                  )}
                  {editingPost && (
                    <small style={{ color: "var(--text-muted)", fontSize: 11 }}>
                      {lang === "ar" ? "لا يمكن تغيير لغة المقال بعد إنشائه" : "Cannot change language after creation"}
                    </small>
                  )}
                  {!editingPost && (
                    <select
                      value={relatedBlogId || ""}
                      onChange={(e) => setRelatedBlogId(e.target.value ? Number(e.target.value) : null)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 10,
                        border: "1px solid var(--border)",
                        background: "var(--bg-surface)",
                        color: "var(--text-primary)",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      <option value="">{language === "ar" ? "لا توجد نسخة مرتبطة" : "No related version"}</option>
                      {posts
                        .filter((p) => p.language !== language && !p.related_blog_id)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {language === "ar" ? "ربط بـ" : "Link to"}: {p.title}
                          </option>
                        ))}
                    </select>
                  )}
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{blogText.headerImage}</span>
                  <label style={{ border: "1px dashed var(--border-light)", borderRadius: 12, padding: 12, cursor: "pointer", background: "var(--bg-surface)", display: "grid", gap: 6 }}>
                    <input type="file" accept="image/*" onChange={(e) => setHeaderFile(e.target.files?.[0] || null)} style={{ display: "none" }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)" }}><ImageIcon size={14} /> {headerFile ? headerFile.name : blogText.uploadHeader}</div>
                    <small style={{ color: "var(--text-muted)" }}>{blogText.headerHint}</small>
                  </label>
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{blogText.videoUpload}</span>
                  <label style={{ border: "1px dashed var(--border-light)", borderRadius: 12, padding: 12, cursor: "pointer", background: "var(--bg-surface)", display: "grid", gap: 6 }}>
                    <input type="file" accept="video/*" onChange={(e) => handleVideoFileChange(e.target.files?.[0] || null)} style={{ display: "none" }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)" }}><PlayCircle size={14} /> {videoFile ? videoFile.name : blogText.uploadVideo}</div>
                    {videoDuration !== null && (
                      <small style={{ color: "var(--accent)", fontWeight: 600 }}>Duration: {Math.floor(videoDuration / 60)}m {videoDuration % 60}s</small>
                    )}
                    <small style={{ color: "var(--text-muted)" }}>{blogText.videoHint}</small>
                  </label>
                </label>

                {editingPost?.header_image_url && (
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)" }}>
                    <input type="checkbox" checked={removeHeaderImage} onChange={(e) => setRemoveHeaderImage(e.target.checked)} /> {blogText.removeHeader}
                  </label>
                )}
                {editingPost?.video_url && (
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)" }}>
                    <input type="checkbox" checked={removeVideo} onChange={(e) => setRemoveVideo(e.target.checked)} /> {blogText.removeVideo}
                  </label>
                )}

                <div style={{ display: "grid", gap: 8 }}>
                  <button
                    onClick={() => onSave("draft")}
                    disabled={saving}
                    style={{ borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-surface)", color: "var(--text-primary)", padding: "10px 12px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                  >
                    <Save size={15} /> {blogText.saveDraft}
                  </button>
                  <button
                    onClick={() => onSave("published")}
                    disabled={saving}
                    style={{ borderRadius: 10, border: "none", background: "var(--accent)", color: "#111", padding: "10px 12px", cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                  >
                    <Upload size={15} /> {saving ? blogText.saving : blogText.publish}
                  </button>
                  {saving && uploadProgress > 0 && (
                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{
                        width: "100%",
                        height: 6,
                        background: "var(--bg-surface)",
                        borderRadius: 3,
                        overflow: "hidden",
                        border: "1px solid var(--border-light)"
                      }}>
                        <div style={{
                          height: "100%",
                          width: `${uploadProgress}%`,
                          background: "var(--accent)",
                          transition: "width 0.3s ease",
                        }} />
                      </div>
                      <small style={{ color: "var(--text-muted)", textAlign: "center" }}>{uploadProgress}% uploaded</small>
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
