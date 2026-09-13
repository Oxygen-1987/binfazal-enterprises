// src/components/layout/global-search.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  Search,
  User,
  Printer,
  Truck,
  ShoppingCart,
  Wallet,
  Receipt,
  Loader2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";

interface SearchResult {
  id: string;
  type:
    | "client"
    | "job"
    | "vendor"
    | "purchase"
    | "payment"
    | "vendor_payment"
    | "expense";
  title: string;
  subtitle: string;
  amount?: number;
  href: string;
}

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (query.trim().length >= 2) {
        performSearch(query);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    const q = searchQuery.toLowerCase().trim();
    const searchResults: SearchResult[] = [];

    try {
      // Search clients
      const { data: clients } = await supabase
        .from("clients")
        .select("id, first_name, last_name, company_name, mobile_number")
        .or(
          `first_name.ilike.%${q}%,last_name.ilike.%${q}%,company_name.ilike.%${q}%,mobile_number.ilike.%${q}%`,
        )
        .limit(4);

      clients?.forEach((c) => {
        searchResults.push({
          id: c.id,
          type: "client",
          title: c.company_name || `${c.first_name} ${c.last_name}`,
          subtitle: c.company_name
            ? `${c.first_name} ${c.last_name} • ${c.mobile_number}`
            : c.mobile_number,
          href: `/clients/${c.id}/ledger`,
        });
      });

      // Search vendors
      const { data: vendors } = await supabase
        .from("vendors")
        .select("id, first_name, last_name, company_name, mobile_number")
        .or(
          `first_name.ilike.%${q}%,last_name.ilike.%${q}%,company_name.ilike.%${q}%,mobile_number.ilike.%${q}%`,
        )
        .limit(3);

      vendors?.forEach((v) => {
        searchResults.push({
          id: v.id,
          type: "vendor",
          title: v.company_name || `${v.first_name} ${v.last_name}`,
          subtitle: v.company_name
            ? `${v.first_name} ${v.last_name} • ${v.mobile_number}`
            : v.mobile_number,
          href: `/vendors/${v.id}/ledger`,
        });
      });

      // Search jobs (by details)
      const { data: jobs } = await supabase
        .from("print_jobs")
        .select(
          "id, job_details, total_amount, job_date, clients(company_name, first_name, last_name)",
        )
        .ilike("job_details", `%${q}%`)
        .order("job_date", { ascending: false })
        .limit(3);

      jobs?.forEach((j) => {
        const clientName =
          j.clients?.company_name ||
          `${j.clients?.first_name} ${j.clients?.last_name}`;
        searchResults.push({
          id: j.id,
          type: "job",
          title: j.job_details || "Print Job",
          subtitle: `${clientName} • ${j.job_date}`,
          amount: Number(j.total_amount),
          href: `/jobs/${j.id}/edit`,
        });
      });

      // Search purchases
      const { data: purchases } = await supabase
        .from("purchases")
        .select(
          "id, item_details, total_amount, purchase_date, vendors(company_name, first_name, last_name)",
        )
        .ilike("item_details", `%${q}%`)
        .order("purchase_date", { ascending: false })
        .limit(3);

      purchases?.forEach((p) => {
        const vendorName =
          p.vendors?.company_name ||
          `${p.vendors?.first_name} ${p.vendors?.last_name}`;
        searchResults.push({
          id: p.id,
          type: "purchase",
          title: p.item_details || "Purchase",
          subtitle: `${vendorName} • ${p.purchase_date}`,
          amount: Number(p.total_amount),
          href: `/purchases/${p.id}/edit`,
        });
      });

      // Search expenses
      const { data: expenses } = await supabase
        .from("expenses")
        .select("id, description, category, amount, expense_date")
        .or(`description.ilike.%${q}%,category.ilike.%${q}%`)
        .order("expense_date", { ascending: false })
        .limit(3);

      expenses?.forEach((e) => {
        searchResults.push({
          id: e.id,
          type: "expense",
          title: e.description || e.category,
          subtitle: `${e.category} • ${e.expense_date}`,
          amount: Number(e.amount),
          href: `/expenses/${e.id}/edit`,
        });
      });

      setResults(searchResults);
      setSelectedIndex(0);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      handleResultClick(results[selectedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleResultClick = (result: SearchResult) => {
    router.push(result.href);
    setQuery("");
    setResults([]);
    setIsOpen(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "client":
        return User;
      case "job":
        return Printer;
      case "vendor":
        return Truck;
      case "purchase":
        return ShoppingCart;
      case "expense":
        return Receipt;
      default:
        return Search;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "client":
        return "Client";
      case "job":
        return "Job";
      case "vendor":
        return "Vendor";
      case "purchase":
        return "Purchase";
      case "expense":
        return "Expense";
      default:
        return "";
    }
  };

  return (
    <div className="relative flex-1 max-w-xl" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search clients, jobs, vendors..."
          className="w-full pl-10 pr-10 py-2.5 bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-[#FF6B00] focus:bg-white dark:focus:bg-gray-900 rounded-full text-sm outline-none transition-all"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl overflow-hidden z-50 max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="p-6 text-center">
              <Search className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                No results found for "{query}"
              </p>
            </div>
          ) : (
            <>
              <div className="p-2 border-b border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-500 px-2">
                  {results.length} result{results.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="p-1">
                {results.map((result, index) => {
                  const Icon = getIcon(result.type);
                  const isSelected = index === selectedIndex;

                  return (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleResultClick(result)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full flex items-start space-x-3 p-3 rounded-lg transition-colors text-left ${
                        isSelected
                          ? "bg-orange-50 dark:bg-orange-900/20"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                    >
                      <div
                        className={`p-2 rounded-lg flex-shrink-0 ${
                          isSelected
                            ? "bg-[#FF6B00] text-white"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-sm truncate">
                            {result.title}
                          </p>
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {getTypeLabel(result.type)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {result.subtitle}
                        </p>
                      </div>
                      {result.amount !== undefined && (
                        <p className="text-sm font-semibold text-[#FF6B00] flex-shrink-0">
                          {formatCurrency(result.amount)}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="p-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <p className="text-xs text-gray-500 text-center">
                  ↑↓ Navigate • Enter to open • Esc to close
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
