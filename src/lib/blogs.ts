import { getApiBase } from "@/lib/api";

export type BlogStatus = "draft" | "published";
export type BlogLanguage = "en" | "ar";

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  language: BlogLanguage;
  related_blog_id: number | null;
  excerpt: string;
  content: string;
  header_image_url: string | null;
  video_url: string | null;
  video_duration: number | null;
  status: BlogStatus;
  author_id: number;
  author_role: string;
  author_name?: string;
  author_avatar?: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

interface SaveBlogInput {
  title: string;
  excerpt: string;
  content: string;
  status: BlogStatus;
  language?: BlogLanguage;
  relatedBlogId?: number | null;
  headerImage?: File | null;
  video?: File | null;
  videoDuration?: number | null;
  removeHeaderImage?: boolean;
  removeVideo?: boolean;
}

async function parseJsonResponse(response: Response): Promise<any> {
  const raw = await response.text();
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return { message: "Unexpected server response" };
  }
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export function resolveMediaUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const base = getApiBase();
  return `${base}${path}`;
}

export async function fetchPublicBlogs(query = "", language: BlogLanguage = "en"): Promise<BlogPost[]> {
  const params = new URLSearchParams({ lang: language });
  if (query.trim()) params.set("q", query.trim());
  const response = await fetch(`${getApiBase()}/api/blogs/public?${params.toString()}`);
  const data = await parseJsonResponse(response);
  if (!response.ok) throw new Error(data.message || "Failed to load blog posts");
  return data.posts || [];
}

export async function fetchBlogs(token: string, mode: "feed" | "manage", query = "", language: BlogLanguage = "en"): Promise<BlogPost[]> {
  const params = new URLSearchParams({ mode, lang: language });
  if (query.trim()) params.set("q", query.trim());

  const response = await fetch(`${getApiBase()}/api/blogs?${params.toString()}`, {
    headers: authHeaders(token),
  });

  const data = await parseJsonResponse(response);
  if (!response.ok) throw new Error(data.message || "Failed to load blog posts");
  return data.posts || [];
}

export async function saveBlog(
  token: string,
  input: SaveBlogInput,
  postId?: number,
  onProgress?: (percentage: number) => void
): Promise<BlogPost> {
  const form = new FormData();
  form.append("title", input.title.trim());
  form.append("excerpt", input.excerpt.trim());
  form.append("content", input.content.trim());
  form.append("status", input.status);
  form.append("language", input.language || "en");

  if (input.relatedBlogId) {
    form.append("relatedBlogId", String(input.relatedBlogId));
  }
  if (input.headerImage) form.append("headerImage", input.headerImage);
  if (input.video) form.append("video", input.video);
  if (input.videoDuration !== undefined && input.videoDuration !== null) {
    form.append("videoDuration", String(input.videoDuration));
  }
  if (input.removeHeaderImage) form.append("removeHeaderImage", "1");
  if (input.removeVideo) form.append("removeVideo", "1");

  const method = postId ? "PUT" : "POST";
  const url = postId ? `${getApiBase()}/api/blogs/${postId}` : `${getApiBase()}/api/blogs`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentage = Math.round((e.loaded / e.total) * 100);
          onProgress(percentage);
        }
      });
    }

    xhr.addEventListener("load", () => {
      try {
        const data = JSON.parse(xhr.responseText || "{}");
        if (xhr.status === 200 || xhr.status === 201) {
          resolve(data.post);
        } else {
          reject(new Error(data.message || "Failed to save blog post"));
        }
      } catch (e) {
        reject(new Error("Invalid server response"));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error while uploading"));
    });

    xhr.addEventListener("abort", () => {
      reject(new Error("Upload cancelled"));
    });

    xhr.open(method, url);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.send(form);
  });
}

export async function removeBlog(token: string, postId: number): Promise<void> {
  const response = await fetch(`${getApiBase()}/api/blogs/${postId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });

  const data = await parseJsonResponse(response);
  if (!response.ok) throw new Error(data.message || "Failed to delete blog post");
}
