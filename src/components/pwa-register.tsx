"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const url = `${window.location.origin}/sw.js`;
    navigator.serviceWorker.register(url, { scope: "/" }).catch(() => {});
  }, []);

  return null;
}