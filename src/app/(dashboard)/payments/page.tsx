// src/app/(dashboard)/payments/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Trash2,
  Wallet,
  Banknote,
  CreditCard,
  Smartphone,
  Landmark,
  Calendar,
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

interface Payment {
  id: string;
  client_id: string;
  job_id: string | null;
  amount: number;
  payment_date: string;
  payment_method: string;
  notes: string;
  created_at: string;
  clients?: {
    company_name: string;
    first_name: string;
    last_name: string;
  };
}

const getPaymentMethodLabel = (method: string) => {
  const methods: { [key: string]: string } = {
    cash: "Cash",
    bank_transfer: "Bank Transfer",
    cheque: "Cheque",
    jazzcash: "JazzCash",
    easypaisa: "EasyPaisa",
    other: "Other",
  };
  return methods[method] || method || "-";
};

const getPaymentMethodIcon = (method: string) => {
  const icons: { [key: string]: any } = {
    cash: Banknote,
    bank_transfer: Landmark,
    cheque: CreditCard,
    jazzcash: Smartphone,
    easypaisa: Smartphone,
    other: Wallet,
  };
  return icons[method] || Wallet;
};

export default function PaymentsPage() {
  const { userRole } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
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
    const savedView = localStorage.getItem("paymentsViewMode");
    if (savedView === "grid" || savedView === "list") {
      setViewMode(savedView);
    }
  }, []);

  const changeViewMode = (mode: "list" | "grid") => {
    setViewMode(mode);
    localStorage.setItem("paymentsViewMode", mode);
  };

  useEffect(() => {
    fetchPayments();
  }, [dateFilter, customFrom, customTo, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, methodFilter, dateFilter, customFrom, customTo]);

  const fetchPayments = async () => {
    setLoading(true);

    const { from, to } = getDateRange(dateFilter, customFrom, customTo);

    let query = supabase.from("payments").select(
      `
        *,
        clients (
          company_name,
          first_name,
          last_name
        )
      `,
      { count: "exact" },
    );

    if (from) query = query.gte("payment_date", from);
    if (to) query = query.lte("payment_date", to);

    const fromIndex = (currentPage - 1) * itemsPerPage;
    const toIndex = fromIndex + itemsPerPage - 1;

    query = query
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(fromIndex, toIndex);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching payments:", error);
    } else {
      setPayments(data || []);
      setTotalCount(count || 0);

      // Calculate total for current page
      const pageTotal = (data || []).reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );
      setTotalAmount(pageTotal);
    }
    setLoading(false);
  };

  // Client-side filter for search + method
  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      searchTerm.trim() === "" ||
      payment.clients?.company_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      payment.clients?.first_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      payment.clients?.last_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      payment.notes?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesMethod =
      methodFilter === "all" || payment.payment_method === methodFilter;

    return matchesSearch && matchesMethod;
  });

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("payments").delete().eq("id", id);

    if (!error) {
      setPayments(payments.filter((payment) => payment.id !== id));
      setTotalCount((prev) => prev - 1);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-gray-500 text-sm">
            Record and track received payments
          </p>
        </div>
        <Link href="/payments/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Record Payment
          </Button>
        </Link>
      </div>

      {/* Summary Card */}
      <Card className="bg-gray-50 dark:bg-gray-900">
        <CardContent className="p-4 flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">Page Total</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(totalAmount)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Total Payments</p>
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
              placeholder="Search payments..."
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

        {/* Method Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            "all",
            "cash",
            "bank_transfer",
            "cheque",
            "jazzcash",
            "easypaisa",
            "other",
          ].map((method) => (
            <Button
              key={method}
              variant={methodFilter === method ? "default" : "outline"}
              size="sm"
              onClick={() => setMethodFilter(method)}
              className="whitespace-nowrap"
            >
              {method === "all" ? "All Methods" : getPaymentMethodLabel(method)}
            </Button>
          ))}
        </div>
      </div>

      {/* Payments Display */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B00]" />
        </div>
      ) : filteredPayments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wallet className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg">No payments found</p>
            <p className="text-gray-400 text-sm mt-2">
              {searchTerm || methodFilter !== "all"
                ? "Try different filters"
                : "No payments in this period"}
            </p>
          </CardContent>
        </Card>
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
                    Client
                  </th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Method
                  </th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider hidden md:table-cell">
                    Notes
                  </th>
                  <th className="text-right py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="text-right py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredPayments.map((payment) => {
                  const MethodIcon = getPaymentMethodIcon(
                    payment.payment_method,
                  );

                  return (
                    <tr
                      key={payment.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                    >
                      <td className="py-3 px-3 whitespace-nowrap text-xs">
                        {formatDate(payment.payment_date)}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium truncate max-w-[200px]">
                          {payment.clients?.company_name ||
                            `${payment.clients?.first_name} ${payment.clients?.last_name}`}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <MethodIcon className="h-3.5 w-3.5 text-[#FF6B00]" />
                          <span className="text-xs whitespace-nowrap">
                            {getPaymentMethodLabel(payment.payment_method)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 hidden md:table-cell">
                        <div className="truncate max-w-[250px] text-gray-500 text-xs">
                          {payment.notes || "-"}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-green-600 whitespace-nowrap">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/payments/${payment.id}/edit`}>
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
                                    Delete Payment
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this
                                    payment? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(payment.id)}
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
          {filteredPayments.map((payment) => {
            const MethodIcon = getPaymentMethodIcon(payment.payment_method);

            return (
              <Card
                key={payment.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start space-x-3">
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded-lg">
                          <MethodIcon className="h-5 w-5 text-[#FF6B00]" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">
                            {payment.clients?.company_name ||
                              `${payment.clients?.first_name} ${payment.clients?.last_name}`}
                          </h3>

                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                              {getPaymentMethodLabel(payment.payment_method)}
                            </span>
                            <span className="flex items-center text-sm text-gray-500">
                              <Calendar className="h-4 w-4 mr-1" />
                              {formatDate(payment.payment_date)}
                            </span>
                          </div>

                          {payment.notes && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                              {payment.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end space-y-2 ml-4">
                      <p className="font-bold text-lg text-green-600">
                        {formatCurrency(payment.amount)}
                      </p>

                      <div className="flex space-x-1">
                        <Link href={`/payments/${payment.id}/edit`}>
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
                                  Delete Payment
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this payment?
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(payment.id)}
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
