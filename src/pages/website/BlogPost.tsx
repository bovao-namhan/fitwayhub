import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import DOMPurify from "dompurify";
import { ArrowLeft, Calendar, User, Clock } from "lucide-react";
import { useI18n } from "@/context/I18nContext";
import { fetchPublicBlogBySlug, resolveMediaUrl, type BlogPost as BlogPostType } from "@/lib/blogs";
import PageLoader from "@/components/ui/PageLoader";

function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .split('\n\n')
    .map(p => p.trim() && !p.startsWith('<') ? `<p>${p}</p>` : p)
    .join('\n');
}

function toDate(dateStr: string | null | undefined, lang: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function estimateReadMinutes(content: string): number {
  const words = content.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { lang, t } = useI18n();
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPost() {
      if (!slug) {
        setError("Invalid blog post");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const data = await fetchPublicBlogBySlug(slug, lang as "en" | "ar");
        setPost(data);
      } catch (err: any) {
        setError(err.message || "Failed to load blog post");
      } finally {
        setLoading(false);
      }
    }

    loadPost();
  }, [slug, lang]);

  if (loading) return <PageLoader />;

  if (error || !post) {
    return (
      <div style={{ 
        minHeight: "50vh", 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center", 
        justifyContent: "center",
        gap: 20,
        padding: 40 
      }}>
        <h2 style={{ color: "var(--text-primary)" }}>
          {lang === "ar" ? "المقال غير موجود" : "Blog Post Not Found"}
        </h2>
        <p style={{ color: "var(--text-secondary)" }}>
          {error || (lang === "ar" ? "هذا المقال غير متاح." : "This blog post is not available.")}
        </p>
        <Link 
          to="/blogs" 
          style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 8, 
            padding: "10px 20px",
            background: "var(--accent)", 
            color: "#fff", 
            borderRadius: 10, 
            textDecoration: "none" 
          }}
        >
          <ArrowLeft size={18} />
          {lang === "ar" ? "العودة للمقالات" : "Back to Blogs"}
        </Link>
      </div>
    );
  }

  return (
    <div style={{ 
      maxWidth: 900, 
      margin: "0 auto", 
      padding: "40px 20px",
      direction: lang === "ar" ? "rtl" : "ltr" 
    }}>
      {/* Back Button */}
      <button
        onClick={() => navigate("/blogs")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 16px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          color: "var(--text-secondary)",
          cursor: "pointer",
          marginBottom: 30,
        }}
      >
        <ArrowLeft size={18} />
        {lang === "ar" ? "العودة للمقالات" : "Back to Blogs"}
      </button>

      {/* Header Image */}
      {post.header_image_url && (
        <img 
          src={resolveMediaUrl(post.header_image_url)} 
          alt={post.title}
          style={{ 
            width: "100%", 
            maxHeight: 500, 
            objectFit: "cover", 
            borderRadius: 14, 
            marginBottom: 30,
            border: "1px solid var(--border)" 
          }} 
        />
      )}

      {/* Title */}
      <h1 style={{ 
        fontSize: "clamp(28px, 4vw, 42px)", 
        lineHeight: 1.2, 
        marginBottom: 20,
        color: "var(--text-primary)" 
      }}>
        {post.title}
      </h1>

      {/* Meta Info */}
      <div style={{ 
        display: "flex", 
        flexWrap: "wrap", 
        gap: 20, 
        marginBottom: 30,
        color: "var(--text-secondary)",
        fontSize: 14 
      }}>
        {post.author_name && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <User size={16} />
            <span>{post.author_name}</span>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Calendar size={16} />
          <span>{toDate(post.published_at || post.created_at, lang)}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Clock size={16} />
          <span>
            {estimateReadMinutes(post.content)} {lang === "ar" ? "دقائق قراءة" : "min read"}
          </span>
        </div>
      </div>

      {/* Excerpt */}
      {post.excerpt && (
        <p style={{ 
          fontSize: 18, 
          lineHeight: 1.6, 
          color: "var(--text-secondary)",
          marginBottom: 30,
          padding: "20px",
          background: "var(--bg-surface)",
          borderRadius: 12,
          borderLeft: lang === "ar" ? "none" : "4px solid var(--accent)",
          borderRight: lang === "ar" ? "4px solid var(--accent)" : "none"
        }}>
          {post.excerpt}
        </p>
      )}

      {/* Video */}
      {post.video_url && (
        <video 
          controls 
          src={resolveMediaUrl(post.video_url)} 
          style={{ 
            width: "100%", 
            borderRadius: 14, 
            marginBottom: 30,
            border: "1px solid var(--border)",
            background: "#000" 
          }} 
        />
      )}

      {/* Content */}
      <div
        style={{
          fontSize: 17,
          lineHeight: 1.8,
          color: "var(--text-primary)",
        }}
        className="blog-content"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(markdownToHtml(post.content)) }}
      />

      {/* Back to Blogs CTA */}
      <div style={{ 
        marginTop: 60, 
        paddingTop: 30, 
        borderTop: "1px solid var(--border)",
        textAlign: "center" 
      }}>
        <Link 
          to="/blogs" 
          style={{ 
            display: "inline-flex", 
            alignItems: "center", 
            gap: 8, 
            padding: "12px 24px",
            background: "var(--accent)", 
            color: "#fff", 
            borderRadius: 10, 
            textDecoration: "none",
            fontWeight: 600 
          }}
        >
          <ArrowLeft size={18} />
          {lang === "ar" ? "تصفح المزيد من المقالات" : "Browse More Articles"}
        </Link>
      </div>
    </div>
  );
}
