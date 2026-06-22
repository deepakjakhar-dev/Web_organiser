import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | Sitewell",
};

export default function Privacy() {
  return (
    <div className="container" style={{ maxWidth: "700px", margin: "0 auto", padding: "60px 20px" }}>
      <h1>Privacy Policy</h1>
      <p style={{ color: "#888", marginBottom: "30px" }}>Last updated: June 2026</p>

      <h2>What we collect</h2>
      <p>We collect your email address, the website URLs you submit for monitoring, and basic usage data needed to deliver your reports.</p>

      <h2>How we use it</h2>
      <p>Your data is used solely to run uptime checks, generate performance reports, and send them to your inbox. We do not sell or share your data with third parties.</p>

      <h2>Data storage</h2>
      <p>Your data is stored securely and retained only as long as your account is active. You can request deletion at any time.</p>

      <h2>Contact</h2>
      <p>Questions about your data? Reach out via our <Link href="/contact">contact page</Link>.</p>
    </div>
  );
}
