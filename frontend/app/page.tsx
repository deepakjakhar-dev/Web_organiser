import Link from "next/link";
import styles from "./page.module.css";

export const metadata = {
  title: "Sitewell",
  description: "Sitewell helps small business owners monitor uptime, performance, and broken links.",
};

export default function Home() {
  return (
    <div className={styles.main}>
      <nav className={styles.nav}>
        <div className={`container ${styles.navContent}`}>
          <div className={styles.logo}>Sitewell</div>
          <div className={styles.navLinks}>
            <Link href="/login" className="btn btn-outline">
              Log in
            </Link>
            <Link href="/signup" className="btn btn-primary">
              Start free
            </Link>
          </div>
        </div>
      </nav>

      <header className={styles.hero}>
        <div className="container">
          <div className={styles.badge}>Built for small business owners</div>
          <h1>
            Know when your website needs attention <br />
            <span>before customers do.</span>
          </h1>
          <p className={styles.subtitle}>
            Sitewell helps small businesses keep their website online and sends easy-to-read reports by email.
            Simple setup, clear results, and no paid tools needed to start.
          </p>
          <div className={styles.heroCtas}>
            <Link href="/signup" className="btn btn-primary btn-lg">
              Start free
            </Link>
            <p className={styles.noCredit}>One website free. No credit card required to try it.</p>
          </div>
        </div>
      </header>

      <section className={styles.trustStrip}>
        <div className="container">
          <div className={styles.trustGrid}>
            <div className={styles.trustItem}>
              <strong>1 free website</strong>
              <span>Start without paying upfront</span>
            </div>
            <div className={styles.trustItem}>
              <strong>Email reports</strong>
              <span>Send updates straight to your inbox</span>
            </div>
            <div className={styles.trustItem}>
              <strong>Built for owners</strong>
              <span>Clear language, no developer jargon</span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.stats}>
        <div className="container">
          <div className={styles.statGrid}>
            <div className={styles.statItem}>
              <h3>5 min</h3>
              <p>Monitoring interval</p>
            </div>
            <div className={styles.statItem}>
              <h3>3 checks</h3>
              <p>Core signals covered</p>
            </div>
            <div className={styles.statItem}>
              <h3>$10/mo</h3>
              <p>Simple pricing</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.features}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Everything you need to stay online</h2>
          <div className={styles.featureGrid}>
            <div className="card">
              <div className={styles.iconBox}>U</div>
              <h3>Uptime Pings</h3>
              <p>We check your site every 5 minutes from multiple global locations.</p>
            </div>
            <div className="card">
              <div className={styles.iconBox}>S</div>
              <h3>Page Speed</h3>
              <p>Detailed Google PageSpeed insights with actionable fixes.</p>
            </div>
            <div className="card">
              <div className={styles.iconBox}>L</div>
              <h3>Broken Links</h3>
              <p>Automatic crawling to find links that frustrate your customers.</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.howItWorks}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <p className={styles.sectionKicker}>How it works</p>
            <h2 className={styles.sectionTitle}>A simple setup that gets useful fast</h2>
          </div>
          <div className={styles.stepGrid}>
            <div className="card">
              <div className={styles.stepNumber}>1</div>
              <h3>Add your website</h3>
              <p>Paste your site URL and start with the free plan right away.</p>
            </div>
            <div className="card">
              <div className={styles.stepNumber}>2</div>
              <h3>We run checks</h3>
              <p>Sitewell keeps checking uptime, SSL, security, and page health in the background.</p>
            </div>
            <div className="card">
              <div className={styles.stepNumber}>3</div>
              <h3>Get reports</h3>
              <p>Receive simple email summaries. Upgrade only if you need history, PDFs, or more sites.</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.pricing}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <p className={styles.sectionKicker}>Pricing</p>
            <h2 className={styles.sectionTitle}>Start free, upgrade when you need deeper reporting</h2>
          </div>
          <div className={styles.pricingGrid}>
            <div className="card">
              <div className={styles.planLabel}>Starter</div>
              <h3 className={styles.planPrice}>Free</h3>
              <p className={styles.planDescription}>A light setup for trying the workflow and monitoring one site.</p>
              <ul className={styles.planList}>
                <li>One website</li>
                <li>Basic uptime checks</li>
                <li>Email reports</li>
              </ul>
              <Link href="/signup" className="btn btn-outline" style={{ width: "100%", marginTop: "1rem" }}>
                Get started
              </Link>
            </div>
            <div className={`card ${styles.featuredPlan}`}>
              <div className={styles.planBadge}>Most popular</div>
              <div className={styles.planLabel}>Pro</div>
              <h3 className={styles.planPrice}>$10/mo</h3>
              <p className={styles.planDescription}>Best for owners who want more history, reporting, and a polished client-ready view.</p>
              <ul className={styles.planList}>
                <li>Multiple websites</li>
                <li>Historical charts</li>
                <li>PDF report export</li>
              </ul>
              <Link href="/checkout" className="btn btn-primary" style={{ width: "100%", marginTop: "1rem" }}>
                Upgrade to Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.faqSection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <p className={styles.sectionKicker}>FAQ</p>
            <h2 className={styles.sectionTitle}>Quick answers before you try it</h2>
          </div>
          <div className={styles.faqGrid}>
            <div className={styles.faqItem}>
              <h3 className={styles.faqQuestion}>What is Sitewell for?</h3>
              <p className={styles.faqAnswer}>
                It helps small businesses monitor their website and understand issues without digging through technical tools.
              </p>
            </div>
            <div className={styles.faqItem}>
              <h3 className={styles.faqQuestion}>What do I get on the free plan?</h3>
              <p className={styles.faqAnswer}>One website, basic uptime checks, security status, and the dashboard.</p>
            </div>
            <div className={styles.faqItem}>
              <h3 className={styles.faqQuestion}>What is Pro for?</h3>
              <p className={styles.faqAnswer}>Pro adds multiple sites, PDF exports, history charts, and scheduled email reports.</p>
            </div>
            <div className={styles.faqItem}>
              <h3 className={styles.faqQuestion}>Do I need a paid tool to start?</h3>
              <p className={styles.faqAnswer}>No. You can start on the free plan and upgrade later when the reporting becomes useful.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className="container">
          <div className={styles.footerContent}>
            <div className={styles.logo}>Sitewell</div>
            <div className={styles.footerLinks}>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/contact">Support</Link>
            </div>
          </div>
          <p className={styles.copy}>&copy; 2026 Sitewell. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
