// src/components/layout/bottom-nav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import {
  LayoutDashboard,
  Users,
  Printer,
  Wallet,
  Receipt,
  BarChart3,
  Settings,
  Truck,
  ShoppingCart,
} from "lucide-react";

const navItems = [
  {
    href: "/dashboard",
    label: "Home",
    icon: LayoutDashboard,
    showFor: ["owner", "employee"],
  },
  {
    href: "/clients",
    label: "Clients",
    icon: Users,
    showFor: ["owner", "employee"],
  },
  {
    href: "/jobs",
    label: "Jobs",
    icon: Printer,
    showFor: ["owner", "employee"],
  },
  { href: "/payments", label: "Payments", icon: Wallet, showFor: ["owner"] },
  { href: "/vendors", label: "Vendors", icon: Truck, showFor: ["owner"] },
  {
    href: "/purchases",
    label: "Purchases",
    icon: ShoppingCart,
    showFor: ["owner"],
  },
  {
    href: "/vendor-payments",
    label: "Vendor Pay",
    icon: Wallet,
    showFor: ["owner"],
  },
  { href: "/expenses", label: "Expenses", icon: Receipt, showFor: ["owner"] },
  {
    href: "/financials",
    label: "Reports",
    icon: BarChart3,
    showFor: ["owner"],
  },
  { href: "/settings", label: "Settings", icon: Settings, showFor: ["owner"] },
];

export function BottomNav() {
  const pathname = usePathname();
  const { userRole } = useAuth();

  const visibleItems = navItems.filter(
    (item) => userRole && item.showFor.includes(userRole),
  );

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800 md:hidden overflow-x-auto">
        <div className="flex justify-start items-center h-16 min-w-max">
          {visibleItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center px-4 h-full ${
                  isActive
                    ? "text-[#FF6B00]"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs mt-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex fixed left-0 top-16 bottom-0 w-64 bg-white dark:bg-black border-r border-gray-200 dark:border-gray-800 overflow-y-auto">
        <div className="flex flex-col w-full p-4 space-y-2">
          {visibleItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-[#FF6B00] text-white"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </aside>
    </>
  );
}
