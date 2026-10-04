"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import { initialActionState } from "@/lib/action-state";
import styles from "./login.module.css";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, initialActionState);
  const error = state.errors?.password ?? state.errors?.form;

  return (
    <main className={styles.wrap}>
      <form action={action} className={`glass ${styles.card}`}>
        <h1 className={styles.brand}>NEXUS</h1>
        <p className={styles.sub}>Progress today. A stronger tomorrow.</p>
        <input
          name="password"
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          autoFocus
          required
          className={styles.input}
        />
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        <button type="submit" disabled={pending} className={styles.button}>
          {pending ? "Checking…" : "Enter"}
        </button>
      </form>
    </main>
  );
}
