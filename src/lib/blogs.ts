import { getApiBase } from "@/lib/api";

export type BlogStatus = "draft" | "published";

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  header_image_url: string | null;
  video_url: string | null;
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
  headerImage?: File | null;
  video?: File | null;
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

export async function fetchPublicBlogs(query = ""): Promise<BlogPost[]> {
  const search = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
  const response = await fetch(`${getApiBase()}/api/blogs/public${search}`);
  const data = await parseJsonResponse(response);
  if (!response.ok) throw new Error(data.message || "Failed to load blog posts");
  return data.posts || [];
}

export async function fetchBlogs(token: string, mode: "feed" | "manage", query = ""): Promise<BlogPost[]> {
  const params = new URLSearchParams({ mode });
  if (query.trim()) params.set("q", query.trim());

  const response = await fetch(`${getApiBase()}/api/blogs?${params.toString()}`, {
    headers: authHeaders(token),
  });

  const data = await parseJsonResponse(response);
  if (!response.ok) throw new Error(data.message || "Failed to load blog posts");
  return data.posts || [];
}

export async function saveBlog(token: string, input: SaveBlogInput, postId?: number): Promise<BlogPost> {
  const form = new FormData();
  form.append("title", input.title.trim());
  form.append("excerpt", input.excerpt.trim());
  form.append("content", input.content.trim());
  form.append("status", input.status);

  if (input.headerImage) form.append("headerImage", input.headerImage);
  if (input.video) form.append("video", input.video);
  if (input.removeHeaderImage) form.append("removeHeaderImage", "1");
  if (input.removeVideo) form.append("removeVideo", "1");

  const method = postId ? "PUT" : "POST";
  const url = postId ? `${getApiBase()}/api/blogs/${postId}` : `${getApiBase()}/api/blogs`;

  const response = await fetch(url, {
    method,
    headers: authHeaders(token),
    body: form,
  });

  const data = await parseJsonResponse(response);
  if (!response.ok) throw new Error(data.message || "Failed to save blog post");
  return data.post;
}

export async function removeBlog(token: string, postId: number): Promise<void> {
  const response = await fetch(`${getApiBase()}/api/blogs/${postId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });

  const data = await parseJsonResponse(response);
  if (!response.ok) throw new Error(data.message || "Failed to delete blog post");
}
