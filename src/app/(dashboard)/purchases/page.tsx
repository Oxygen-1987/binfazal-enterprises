// src/app/(dashboard)/purchases/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { ListSkeleton, CardListSkeleton } from "@/components/shared/skeletons";
import {
  Plus,
  Search,
  Trash2,
  ShoppingCart,
  Calendar,
  Truck,
  FileText,
  Calculator,
  Pencil,
  List,
  LayoutGrid,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import {
  DateRangeFilter,
  getDateRange,
  type DateFilterType,
} from "@/components/shared/date-range-filter";
import { Pagination } from "@/components/shared/pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Purchase {
  id: string;
  purchase_date: string;
  vendor_id: string;
  item_details: string;
  quantity: number | null;
  rate: number | null;
  total_amount: number;
  payment_status: "unpaid" | "partial" | "paid";
  created_at: string;
  vendors?: {
    company_name: string;
    first_name: string;
    last_name: string;
  };
}

export default function PurchasesPage() {
  const { userRole } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateFilterType>("current_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Load saved view preference
  useEffect(() => {
    const savedView = localStorage.getItem("purchasesViewMode");
    if (savedView === "grid" || savedView === "list") {
      setViewMode(savedView);
    }
  }, []);

  const changeViewMode = (mode: "list" | "grid") => {
    setViewMode(mode);
    localStorage.setItem("purchasesViewMode", mode);
  };

  useEffect(() => {
    fetchPurchases();
  }, [dateFilter, customFrom, customTo, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, dateFilter, customFrom, customTo]);

  const fetchPurchases = async () => {
    setLoading(true);

    const { from, to } = getDateRange(dateFilter, customFrom, customTo);

    let query = supabase.from("purchases").select(
      `
        *,
        vendors (
          company_name,
          first_name,
          last_name
        )
      `,
      { count: "exact" },
    );

    if (from) query = query.gte("purchase_date", from);
    if (to) query = query.lte("purchase_date", to);

    const fromIndex = (currentPage - 1) * itemsPerPage;
    const toIndex = fromIndex + itemsPerPage - 1;

    query = query
      .order("purchase_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(fromIndex, toIndex);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching purchases:", error);
    } else {
      setPurchases(data || []);
      setTotalCount(count || 0);

      const pageTotal = (data || []).reduce(
        (sum, p) => sum + Number(p.total_amount),
        0,
      );
      setTotalAmount(pageTotal);
    }
    setLoading(false);
  };

  // Client-side filter for search + status
  const filteredPurchases = purchases.filter((purchase) => {
    const matchesSearch =
      searchTerm.trim() === "" ||
      purchase.item_details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.vendors?.company_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      purchase.vendors?.first_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      purchase.vendors?.last_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || purchase.payment_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("purchases").delete().eq("id", id);

    if (!error) {
      setPurchases(purchases.filter((purchase) => purchase.id !== id));
      setTotalCount((prev) => prev - 1);
      setDeleteId(null);
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "unpaid":
        return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
      case "partial":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300";
      case "paid":
        return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Purchases</h1>
          <p className="text-gray-500 text-sm">Track purchases from vendors</p>
        </div>
        <Link href="/purchases/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Purchase
          </Button>
        </Link>
      </div>

      {/* Summary Card */}
      <Card className="bg-gray-50 dark:bg-gray-900">
        <CardContent className="p-4 flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">Page Total</p>
            <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Total Purchases</p>
            <p className="text-2xl font-bold">{totalCount}</p>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="space-y-3">
        {/* Date Filter */}
        <DateRangeFilter
          value={dateFilter}
          customFrom={customFrom}
          customTo={customTo}
          onChange={(value, from, to) => {
            setDateFilter(value);
            if (from) setCustomFrom(from);
            if (to) setCustomTo(to);
          }}
        />

        {/* Search + View Toggle */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search purchases..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={() => changeViewMode("list")}
              className={`px-3 py-2 flex items-center justify-center transition-colors ${
                viewMode === "list"
                  ? "bg-[#FF6B00] text-white"
                  : "bg-white dark:bg-gray-900 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
              title="List View"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => changeViewMode("grid")}
              className={`px-3 py-2 flex items-center justify-center transition-colors ${
                viewMode === "grid"
                  ? "bg-[#FF6B00] text-white"
                  : "bg-white dark:bg-gray-900 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {["all", "unpaid", "partial", "paid"].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className="whitespace-nowrap"
            >
              {status === "all"
                ? "All"
                : status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Purchases Display */}
      {loading ? (
        viewMode === "list" ? (
          <ListSkeleton rows={10} />
        ) : (
          <CardListSkeleton count={5} />
        )
      ) : filteredPurchases.length === 0 ? (
        searchTerm || statusFilter !== "all" ? (
          <EmptyState
            icon={Search}
            title="No purchases match your search"
            description={`We couldn't find any purchases matching "${
              searchTerm || statusFilter
            }".`}
            variant="search"
          />
        ) : (
          <EmptyState
            icon={ShoppingCart}
            title="No purchases yet"
            description="Add your first purchase to get started. Purchases will appear here with their vendor and payment status."
            actionLabel="New Purchase"
            actionHref="/purchases/new"
          />
        )
      ) : viewMode === "list" ? (
        /* LIST VIEW */
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="text-left py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider hidden md:table-cell">
                    Details
                  </th>
                  <th className="text-center py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Type
                  </th>
                  <th className="text-right py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="text-center py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredPurchases.map((purchase) => {
                  const isDetailed = purchase.quantity && purchase.rate;

                  return (
                    <tr
                      key={purchase.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                    >
                      <td className="py-3 px-3 whitespace-nowrap text-xs">
                        {formatDate(purchase.purchase_date)}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium truncate max-w-[180px]">
                          {purchase.vendors?.company_name ||
                            `${purchase.vendors?.first_name} ${purchase.vendors?.last_name}`}
                        </div>
                      </td>
                      <td className="py-3 px-3 hidden md:table-cell">
                        <div className="truncate max-w-[300px] text-gray-600 dark:text-gray-400 text-xs">
                          {purchase.item_details || "-"}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isDetailed ? (
                          <span className="inline-flex items-center text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full whitespace-nowrap">
                            <Calculator className="h-3 w-3 mr-1" />
                            Item
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full whitespace-nowrap">
                            <FileText className="h-3 w-3 mr-1" />
                            Bill
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold whitespace-nowrap">
                        {formatCurrency(purchase.total_amount)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${getPaymentStatusColor(
                            purchase.payment_status,
                          )}`}
                        >
                          {purchase.payment_status}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/purchases/${purchase.id}/edit`}>
                            <button
                              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          </Link>

                          {userRole === "owner" && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button
                                  className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Delete Purchase
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this
                                    purchase? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(purchase.id)}
                                    className="bg-red-500 hover:bg-red-600"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* GRID VIEW */
        <div className="space-y-3">
          {filteredPurchases.map((purchase) => {
            const isDetailed = purchase.quantity && purchase.rate;

            return (
              <Card
                key={purchase.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start space-x-3">
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded-lg">
                          <Truck className="h-5 w-5 text-[#FF6B00]" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">
                            {purchase.vendors?.company_name ||
                              `${purchase.vendors?.first_name} ${purchase.vendors?.last_name}`}
                          </h3>

                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${getPaymentStatusColor(
                                purchase.payment_status,
                              )}`}
                            >
                              {purchase.payment_status}
                            </span>
                            {isDetailed ? (
                              <span className="inline-flex items-center text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                                <Calculator className="h-3 w-3 mr-1" />
                                Item Details
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-xs bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full">
                                <FileText className="h-3 w-3 mr-1" />
                                Total Bill
                              </span>
                            )}
                            <span className="flex items-center text-sm text-gray-500">
                              <Calendar className="h-4 w-4 mr-1" />
                              {formatDate(purchase.purchase_date)}
                            </span>
                          </div>

                          {purchase.item_details && (
                            <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                {purchase.item_details}
                              </p>
                            </div>
                          )}

                          {isDetailed && (
                            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                              <span>
                                Qty:{" "}
                                {Number(purchase.quantity).toLocaleString()}
                              </span>
                              <span>
                                Rate: {formatCurrency(Number(purchase.rate))}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end space-y-2 ml-4">
                      <p className="font-bold text-lg">
                        {formatCurrency(purchase.total_amount)}
                      </p>

                      <div className="flex space-x-1">
                        <Link href={`/purchases/${purchase.id}/edit`}>
                          <Button variant="ghost" size="icon" title="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>

                        {userRole === "owner" && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-500"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete Purchase
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this purchase?
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(purchase.id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalCount}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
      />
    </div>
  );
}
