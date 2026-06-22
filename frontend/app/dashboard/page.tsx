"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import styles from "./page.module.css";

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [websites, setWebsites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSite, setSelectedSite] = useState<any>(null);
  const [siteStats, setSiteStats] = useState<any>(null);
  const [securityStatus, setSecurityStatus] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [profileWebsite, setProfileWebsite] = useState("");

  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    setName(parsedUser.name || "");
    setCompany(parsedUser.company || "");
    fetchWebsites(parsedUser.id);
  }, []);

  const fetchWebsites = async (userId: number) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/user/${userId}/websites`);
    if (res.ok) setWebsites(await res.json());
  };

  const handleAddWebsite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/websites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, url: websiteUrl, report_frequency: "weekly" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || "Unable to add website");
      }
      setWebsiteUrl("");
      fetchWebsites(user.id);
    } catch (err: any) {
      alert(err.message);
    }
    setIsLoading(false);
  };

  const handleSaveProfile = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/user/${user.id}/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, company, website_url: profileWebsite }),
    });
    if (res.ok) {
      const updatedUser = await res.json();
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      alert("Profile updated!");
    }
  };

  const updateStats = async (site: any) => {
    try {
      const [statsRes, secRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/websites/${site.id}/stats`),
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/websites/${site.id}/security`),
      ]);
      if (statsRes.ok) setSiteStats(await statsRes.json());
      if (secRes.ok) setSecurityStatus(await secRes.json());

      if (user?.is_subscribed) {
        const histRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/websites/${site.id}/history`);
        if (histRes.ok) setHistory(await histRes.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSiteStats = async (site: any) => {
    setSelectedSite(site);
    setActiveTab("details");
    setSiteStats(null);
    updateStats(site);
  };

  useEffect(() => {
    if (!selectedSite) return;
    const interval = setInterval(() => updateStats(selectedSite), 30000);
    return () => clearInterval(interval);
  }, [selectedSite, user]);

  const handleUpgrade = async () => {
    window.location.href = "https://www.paypal.com/paypalme/Deepakjakhar123";
  };

  if (!user) return null;

  const addLimitReached = !user.is_subscribed && websites.length >= 1;

  return (
    <div className={styles.dashboardContainer}>
      <aside className={styles.sidebar}>
        <div>
          <h2>Sitewell</h2>
          <p style={{ color: "rgba(241,245,249,0.7)", marginTop: "0.35rem" }}>Monitoring made clean and client-ready.</p>
        </div>
        <nav>
          <div
            className={`${styles.navItem} ${activeTab === "overview" ? styles.navItemActive : ""}`}
            onClick={() => {
              setActiveTab("overview");
              setSelectedSite(null);
            }}
          >
            Dashboard
          </div>
          <div
            className={`${styles.navItem} ${activeTab === "profile" ? styles.navItemActive : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            Profile
          </div>
        </nav>

        <div className={styles.tierCard}>
          <p className={styles.tierLabel}>Current plan</p>
          <strong>{user.is_subscribed ? "Sitewell Pro" : "Starter"}</strong>
          <span>{user.is_subscribed ? "Historical charts and PDF export included." : "Upgrade for deeper reporting and exports."}</span>
        </div>

        <button
          className="btn"
          style={{ marginTop: "auto", background: "#334155", color: "white" }}
          onClick={() => {
            localStorage.removeItem("user");
            router.push("/login");
          }}
        >
          Logout
        </button>
      </aside>

      <main className={styles.mainContent}>
        {activeTab === "overview" && (
          <>
            <header style={{ marginBottom: "2rem" }}>
              <p style={{ color: "var(--text-muted)", marginBottom: "0.5rem" }}>Workspace overview</p>
              <h1>Monitor your sites with confidence</h1>
            </header>
            <div className={styles.statsGrid}>
              <div className="card">
                <h3>{websites.length}</h3>
                <p style={{ color: "var(--text-muted)" }}>Sites</p>
              </div>
              <div className="card">
                <h3>{websites.filter((s) => s.id > 0).length}</h3>
                <p style={{ color: "var(--text-muted)" }}>Active</p>
              </div>
              <div className="card">
                <h3>{user.is_subscribed ? "Pro" : "Starter"}</h3>
                <p style={{ color: "var(--text-muted)" }}>Plan</p>
              </div>
            </div>

            <div className="card" style={{ marginBottom: "2rem" }}>
              <h3>Add new website</h3>
              <p style={{ color: "var(--text-muted)", marginTop: "0.35rem" }}>
                Add a site to start uptime and performance checks.
              </p>
              {!user.is_subscribed && (
                <p style={{ color: "var(--text-muted)", marginTop: "0.35rem" }}>
                  Starter plan supports one website. Upgrade to Pro for multiple sites and PDF exports.
                </p>
              )}
              <form onSubmit={handleAddWebsite} style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <input
                  className="input-field"
                  placeholder="https://website.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  required
                  disabled={addLimitReached}
                />
                <button type="submit" className="btn btn-primary" disabled={isLoading || addLimitReached}>
                  {isLoading ? "Adding..." : addLimitReached ? "Upgrade to add more" : "Add"}
                </button>
              </form>
              {addLimitReached && (
                <div style={{ marginTop: "1rem", padding: "1rem", borderRadius: "12px", background: "#eff6ff", color: "#1d4ed8" }}>
                  You&apos;ve used the free plan limit. Upgrade to Pro for multiple websites, PDF exports, and email reports.
                </div>
              )}
            </div>

            <h3>Monitored sites</h3>
            <div style={{ marginTop: "1rem", display: "grid", gap: "1rem" }}>
              {websites.length === 0 ? (
                <div className="card">
                  <h4>No sites yet</h4>
                  <p style={{ color: "var(--text-muted)", marginTop: "0.35rem" }}>
                    Add your first site above and we&apos;ll start building your monitoring history.
                  </p>
                </div>
              ) : (
                websites.map((site) => (
                  <div
                    key={site.id}
                    className="card"
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}
                  >
                    <div>
                      <h4>{site.url}</h4>
                      <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Last checked automatically every 5 minutes</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => fetchSiteStats(site)}>
                      View
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {activeTab === "details" && selectedSite && (
          <div>
            <button className="btn btn-outline" style={{ marginBottom: "1rem" }} onClick={() => setActiveTab("overview")}>
              Back
            </button>
            <h1>{selectedSite.url}</h1>
            <p style={{ color: "var(--text-muted)", marginTop: "0.35rem" }}>
              Live monitoring, security checks, and trend history for this site.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "1rem",
                marginBottom: "2rem",
                marginTop: "1rem",
              }}
            >
              <div className="card">
                <p>Status</p>
                <h3>{siteStats?.isActive ? "Online" : "Offline"}</h3>
              </div>
              <div className="card">
                <p>Latency</p>
                <h3>{siteStats ? `${siteStats.latency}ms` : "..."}</h3>
              </div>
              <div className="card">
                <p>Security</p>
                <h3 style={{ color: securityStatus?.isBlacklisted ? "var(--error)" : "var(--secondary)" }}>
                  {securityStatus?.isBlacklisted ? "Blacklisted" : "No threats detected"}
                </h3>
              </div>
            </div>
            {user.is_subscribed ? (
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                  <h3>Historical trends</h3>
                  <button
                    className="btn btn-outline"
                    onClick={() => window.open(`${process.env.NEXT_PUBLIC_BACKEND_URL}/websites/${selectedSite.id}/download-pdf`)}
                  >
                    Download PDF Report
                  </button>
                </div>
                <div style={{ height: "250px", marginTop: "1rem" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="latency" stroke="var(--primary)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="card" style={{ textAlign: "center" }}>
                <h3>Upgrade to unlock reports</h3>
                <p style={{ color: "var(--text-muted)", marginTop: "0.5rem" }}>
                  Starter includes the basics. Pro adds history, exports, and a stronger client-ready dashboard.
                </p>
                <button className="btn btn-primary" onClick={handleUpgrade} style={{ marginTop: "1rem" }}>
                  Upgrade to Pro
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "profile" && (
          <div className={styles.profileCard}>
            <div className={styles.profileHero}>
              <div className={styles.profileAvatar}>{name?.trim()?.charAt(0)?.toUpperCase() || "S"}</div>
              <div>
                <p className={styles.profileEyebrow}>Workspace profile</p>
                <h2>{name || "Sitewell user"}</h2>
                <p className={styles.profileMeta}>{company || "Add your company details to personalize reports."}</p>
              </div>
            </div>

            <div className={styles.profileGrid}>
              <div className={styles.profileField}>
                <label>Your name</label>
                <input className="input-field" placeholder="Ava Patel" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className={styles.profileField}>
                <label>Company name</label>
                <input className="input-field" placeholder="Northwind Studio" value={company} onChange={(e) => setCompany(e.target.value)} />
              </div>
              <div className={styles.profileFieldWide}>
                <label>Primary website URL</label>
                <input
                  className="input-field"
                  placeholder="https://yourcompany.com"
                  value={profileWebsite}
                  onChange={(e) => setProfileWebsite(e.target.value)}
                />
              </div>
              <div className={styles.profileFieldWide}>
                <label>Upload report logo</label>
                <input
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const formData = new FormData();
                      formData.append("file", file);
                      fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/user/${user.id}/upload-logo`, {
                        method: "POST",
                        body: formData,
                      }).then((res) => res.ok && alert("Logo uploaded!"));
                    }
                  }}
                />
              </div>
            </div>

            <div className={styles.profileActions}>
              <button className="btn btn-primary" onClick={handleSaveProfile}>
                Save Profile
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
