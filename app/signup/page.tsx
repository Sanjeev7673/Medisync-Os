"use client";

import { useEffect } from "react";

export default function SignUpPage() {
  useEffect(() => {
    window.location.replace("/signin?mode=signup");
  }, []);

  return null;
}
