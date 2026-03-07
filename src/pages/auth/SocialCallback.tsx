import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function SocialCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { completeSocialLogin } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      const token = searchParams.get("token");
      const err = searchParams.get("error");

      if (err) {
        setError(err);
        return;
      }

      if (!token) {
        setError("Missing login token from social provider");
        return;
      }

      try {
        const user = await completeSocialLogin(token);
        if (user.role === "admin") navigate("/admin/dashboard", { replace: true });
        else if (user.role === "coach") navigate("/coach/dashboard", { replace: true });
        else navigate("/app/dashboard", { replace: true });
      } catch (e: any) {
        setError(e?.message || "Failed to complete social login");
      }
    };

    run();
  }, [searchParams, completeSocialLogin, navigate]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-primary)", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 460, backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10, color: "var(--text-primary)" }}>Completing sign in...</h1>
        {error ? (
          <>
            <p style={{ color: "var(--red)", fontSize: 14, marginBottom: 16 }}>{error}</p>
            <button
              onClick={() => navigate("/auth/login", { replace: true })}
              className="btn-accent"
              style={{ padding: "10px 14px", fontSize: 14 }}
            >
              Back to login
            </button>
          </>
        ) : (
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Please wait while we sign you into FitWay Hub.</p>
        )}
      </div>
    </div>
  );
}
