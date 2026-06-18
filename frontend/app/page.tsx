import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.main}>
      {/* Navbar */}
      <nav className={styles.nav}>
        <div className={`container ${styles.navContent}`}>
          <div className={styles.logo}>Sitewell</div>
          <div className={styles.navLinks}>
            <Link href="/login" className="btn btn-outline">Log in</Link>
            <Link href="/signup" className="btn btn-primary">Start Free Trial</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className={styles.hero}>
        <div className="container">
          <div className={styles.badge}>Built for small business owners</div>
          <h1>Monitor your website <br /><span>without lifting a finger.</span></h1>
          <p className={styles.subtitle}>
            Professional uptime, performance, and broken link reports delivered to your inbox. 
            Simple setup, powerful insights, zero maintenance.
          </p>
          <div className={styles.heroCtas}>
            <Link href="/signup" className="btn btn-primary btn-lg">
              Get Started for $10/month
            </Link>
            <p className={styles.noCredit}>No credit card required for setup</p>
          </div>
        </div>
      </header>

      {/* Stats/Social Proof */}
      <section className={styles.stats}>
        <div className="container">
          <div className={styles.statGrid}>
            <div className={styles.statItem}>
              <h3>99.9%</h3>
              <p>Monitoring Accuracy</p>
            </div>
            <div className={styles.statItem}>
              <h3>5 Min</h3>
              <p>Check Frequency</p>
            </div>
            <div className={styles.statItem}>
              <h3>$10/mo</h3>
              <p>Flat Pricing</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className={styles.features}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Everything you need to stay online</h2>
          <div className={styles.featureGrid}>
            <div className="card">
              <div className={styles.iconBox}>📡</div>
              <h3>Uptime Pings</h3>
              <p>We check your site every 5 minutes from multiple global locations.</p>
            </div>
            <div className="card">
              <div className={styles.iconBox}>⚡</div>
              <h3>Page Speed</h3>
              <p>Detailed Google PageSpeed insights with actionable fixes.</p>
            </div>
            <div className="card">
              <div className={styles.iconBox}>🔗</div>
              <h3>Broken Links</h3>
              <p>Automatic crawling to find links that frustrate your customers.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className="container">
          <div className={styles.footerContent}>
            <div className={styles.logo}>Sitewell</div>
            <div className={styles.footerLinks}>
              <span>Privacy coming soon</span>
              <span>Terms coming soon</span>
              <span>Support coming soon</span>
            </div>
          </div>
          <p className={styles.copy}>&copy; 2026 Sitewell. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
