"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDemo } from "@/lib/demo-store";

const routeByRole = {
  member: "/member",
  coach: "/coach",
  admin: "/admin",
} as const;

export default function RootPage() {
  const router = useRouter();
  const {
    state: { session },
    isBootstrapped,
  } = useDemo();

  useEffect(() => {
    if (!isBootstrapped) return;
    if (!session.isAuthenticated || !session.role) {
      router.replace("/login");
      return;
    }
    router.replace(routeByRole[session.role]);
  }, [isBootstrapped, session.isAuthenticated, session.role, router]);

  return <div className="route-loading">正在进入系统...</div>;
}
