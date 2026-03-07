import { Link } from "react-router-dom";
import type { CSSProperties } from "react";

type PaymentResultType = "success" | "cancel" | "error";

interface PaymentResultProps {
  result: PaymentResultType;
}

const resultConfig: Record<
  PaymentResultType,
  { title: string; description: string; ctaLabel: string; ctaHref: string }
> = {
  success: {
    title: "Payment Successful",
    description: "Your payment has been processed successfully. Your plan is now active.",
    ctaLabel: "Go to Dashboard",
    ctaHref: "/app/dashboard",
  },
  cancel: {
    title: "Payment Cancelled",
    description: "The payment flow was cancelled before completion. You can try again anytime.",
    ctaLabel: "Back to Pricing",
    ctaHref: "/app/pricing",
  },
  error: {
    title: "Payment Failed",
    description: "Something went wrong while processing your payment. Please try again.",
    ctaLabel: "Try Again",
    ctaHref: "/app/pricing",
  },
};

export default function PaymentResult({ result }: PaymentResultProps) {
  const { title, description, ctaLabel, ctaHref } = resultConfig[result];

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <h1 style={styles.title}>{title}</h1>
        <p style={styles.description}>{description}</p>
        <Link to={ctaHref} style={styles.button}>
          {ctaLabel}
        </Link>
      </section>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: "24px",
    background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
  },
  card: {
    width: "100%",
    maxWidth: "520px",
    borderRadius: "16px",
    backgroundColor: "#ffffff",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.12)",
    padding: "28px",
    textAlign: "center",
  },
  title: {
    margin: "0 0 12px",
    fontSize: "28px",
    color: "#0f172a",
  },
  description: {
    margin: "0 0 24px",
    lineHeight: 1.6,
    color: "#334155",
  },
  button: {
    display: "inline-block",
    textDecoration: "none",
    backgroundColor: "#0f172a",
    color: "#ffffff",
    padding: "10px 18px",
    borderRadius: "10px",
    fontWeight: 600,
  },
};
