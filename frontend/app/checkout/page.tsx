"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function CheckoutPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const initiatePayment = async () => {
    setLoading(true);
    // In production, this would call our backend to create a real PayPal Order ID
    window.location.href = "https://www.paypal.com/paypalme/Deepakjakhar123/10.00USD";
  };

  return (
    <div className="container" style={{ marginTop: '3rem', maxWidth: '500px' }}>
      <div className="card">
        <h1>Upgrade to Sitewell Pro</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Review the plan details before continuing to secure payment.</p>
        
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderBottom: '1px solid #eee' }}>
            <span>Sitewell Pro</span>
            <strong>$10.00 / month</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0' }}>
            <span>Billing Cycle</span>
            <strong>Monthly</strong>
          </div>
        </div>

        <button 
          className="btn btn-primary" 
          style={{ width: '100%', fontSize: '1rem' }}
          onClick={initiatePayment}
          disabled={loading}
        >
          {loading ? "Redirecting..." : "Pay with PayPal"}
        </button>
        <p style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          By clicking pay, you agree to our terms and conditions.
        </p>
      </div>
    </div>
  );
}
