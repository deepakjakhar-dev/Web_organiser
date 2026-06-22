import Link from "next/link";

export const metadata = {
  title: "Terms of Service | Sitewell",
};

export default function Terms() {
  return (
    <div className="container" style={{ maxWidth: "700px", margin: "0 auto", padding: "60px 20px" }}>
      <h1>Terms of Service</h1>
      <p style={{ color: "#888", marginBottom: "30px" }}>Last updated: June 2026</p>

      <h2>Service</h2>
      <p>Sitewell provides automated website monitoring, performance reports, and broken link detection delivered via email on a subscription basis.</p>

      <h2>Billing</h2>
      <p>Subscriptions are billed monthly. You may cancel anytime; access continues until the end of the current billing period.</p>

      <h2>Limitations</h2>
      <p>We monitor and report based on automated checks. We do not guarantee 100% accuracy and are not liable for losses resulting from undetected downtime or inaccurate reports.</p>

      <h2>Contact</h2>
      <p>Questions? Reach out via our <Link href="/contact">contact page</Link>.</p>
    </div>
  );
}
