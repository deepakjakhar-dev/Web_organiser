"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import { useSearchParams } from "next/navigation";

function SuccessContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("user_id");
  const [isUpdating, setIsUpdating] = useState(true);

  useEffect(() => {
    if (userId) {
      upgradeUser(userId);
    } else {
      setIsUpdating(false);
    }
  }, [userId]);

  const upgradeUser = async (id: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/upgrade-user/${id}`, {
        method: "POST",
      });
      if (res.ok) {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const user = JSON.parse(storedUser);
          user.is_subscribed = true;
          localStorage.setItem("user", JSON.stringify(user));
        }
      }
    } catch (err) {
      console.error("Failed to upgrade user in database", err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.icon}>🎉</div>
        <h1>{isUpdating ? "Confirming payment..." : "You are on Sitewell Pro"}</h1>
        <p>Your subscription is active and your reporting has started.</p>
        <p className={styles.detail}>
          You&apos;ll now receive deeper reports, PDF export, and historical trend tracking.
        </p>
        <div className={styles.nextSteps}>
          <h3>What&apos;s unlocked:</h3>
          <ul>
            <li>Historical uptime charts</li>
            <li>Broken link detection</li>
            <li>PDF report export</li>
            <li>Custom reporting intervals</li>
          </ul>
        </div>
        <Link href="/dashboard" className="btn btn-primary" style={{ width: "100%" }}>
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default function Success() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
