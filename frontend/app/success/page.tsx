"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import { useSearchParams, useRouter } from "next/navigation";

function SuccessContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("user_id");
  const [isUpdating, setIsUpdating] = useState(true);
  const router = useRouter();

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
        <h1>{isUpdating ? "Confirming Payment..." : "Welcome to Pro!"}</h1>
        <p>Your subscription is active and your professional monitoring has started.</p>
        <p className={styles.detail}>
          You'll now receive deep analysis reports according to your selected frequency.
        </p>
        <div className={styles.nextSteps}>
          <h3>What's unlocked:</h3>
          <ul>
            <li>Deep PageSpeed Analysis</li>
            <li>Broken Link Detection</li>
            <li>Historical Uptime Charts</li>
            <li>Custom Reporting Intervals</li>
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