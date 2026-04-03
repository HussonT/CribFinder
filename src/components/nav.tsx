"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  Search,
  List,
  MessageSquare,
  Settings,
  LogOut,
} from "lucide-react";

const navItems = [
  { href: "/listings", label: "Listings", icon: Search },
  { href: "/shortlists", label: "Shortlists", icon: List },
  { href: "/inbox", label: "Inbox", icon: MessageSquare },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-6">
        <Link href="/listings" className="flex items-center gap-2">
          <Home className="w-6 h-6" />
          <span className="text-xl font-bold">CribFinder</span>
        </Link>
        <p className="text-xs text-gray-400 mt-1">
          West Village · SoHo · Chelsea
        </p>
      </div>

      {/* Nav links */}
      <div className="flex-1 px-3">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition mb-1",
                isActive
                  ? "bg-black text-white"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Bottom */}
      <div className="p-4 border-t border-gray-100">
        <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </nav>
  );
}
