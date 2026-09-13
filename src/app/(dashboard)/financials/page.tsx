// src/app/(dashboard)/financials/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/shared/date-picker";
import { LedgerViewer } from "@/components/shared/ledger-viewer";
import {
  TrendingUp,
  Receipt,
  ShoppingCart,
  Download,
  FileText,
  Users,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";

interface FinancialData {
  totalRevenue: number;
  totalExpenses: number;
  totalPurchases: number;
  totalVendorPayments: number;
  totalClientPayments: number;
  totalPendingReceivable: number;
  totalPendingPayable: number;
  profitLoss: number;
  monthlyData: MonthlyData[];
}

interface MonthlyData {
  month: string;
  revenue: number;
  expenses: number;
  purchases: number;
  profit: number;
}

interface ClientOption {
  id: string;
  first_name: string;
  last_name: string;
  company_name: string;
}

export default function FinancialsPage() {
  const { userRole } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "ledger">("overview");

  // Overview state
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState("current");
  const [financialData, setFinancialData] = useState<FinancialData>({
    totalRevenue: 0,
    totalExpenses: 0,
    totalPurchases: 0,
    totalVendorPayments: 0,
    totalClientPayments: 0,
    totalPendingReceivable: 0,
    totalPendingPayable: 0,
    profitLoss: 0,
    monthlyData: [],
  });

  // Ledger report state
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [ledgerFrom, setLedgerFrom] = useState("");
  const [ledgerTo, setLedgerTo] = useState("");

  useEffect(() => {
    fetchFinancialData();
  }, [monthFilter]);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const { data } = await supabase
      .from("clients")
      .select("id, first_name, last_name, company_name")
      .order("company_name", { ascending: true });

    setClients(data || []);
  };

  const fetchFinancialData = async () => {
    setLoading(true);

    const now = new Date();

    try {
      // Build queries with date filters
      let jobsQuery = supabase.from("print_jobs").select("*");
      let expensesQuery = supabase.from("expenses").select("*");
      let purchasesQuery = supabase.from("purchases").select("*");
      let clientPaymentsQuery = supabase.from("payments").select("*");
      let vendorPaymentsQuery = supabase.from("vendor_payments").select("*");

      if (monthFilter === "current") {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .split("T")[0];
        jobsQuery = jobsQuery.gte("job_date", monthStart);
        expensesQuery = expensesQuery.gte("expense_date", monthStart);
        purchasesQuery = purchasesQuery.gte("purchase_date", monthStart);
        clientPaymentsQuery = clientPaymentsQuery.gte(
          "payment_date",
          monthStart,
        );
        vendorPaymentsQuery = vendorPaymentsQuery.gte(
          "payment_date",
          monthStart,
        );
      } else if (monthFilter === "previous") {
        const prevMonthStart = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          1,
        )
          .toISOString()
          .split("T")[0];
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .split("T")[0];
        jobsQuery = jobsQuery
          .gte("job_date", prevMonthStart)
          .lt("job_date", currentMonthStart);
        expensesQuery = expensesQuery
          .gte("expense_date", prevMonthStart)
          .lt("expense_date", currentMonthStart);
        purchasesQuery = purchasesQuery
          .gte("purchase_date", prevMonthStart)
          .lt("purchase_date", currentMonthStart);
        clientPaymentsQuery = clientPaymentsQuery
          .gte("payment_date", prevMonthStart)
          .lt("payment_date", currentMonthStart);
        vendorPaymentsQuery = vendorPaymentsQuery
          .gte("payment_date", prevMonthStart)
          .lt("payment_date", currentMonthStart);
      }

      const [
        jobsResult,
        expensesResult,
        purchasesResult,
        clientPaymentsResult,
        vendorPaymentsResult,
      ] = await Promise.all([
        jobsQuery,
        expensesQuery,
        purchasesQuery,
        clientPaymentsQuery,
        vendorPaymentsQuery,
      ]);

      // Calculate totals
      const totalRevenue =
        jobsResult.data?.reduce(
          (sum, job) => sum + Number(job.total_amount),
          0,
        ) || 0;
      const totalExpenses =
        expensesResult.data?.reduce(
          (sum, exp) => sum + Number(exp.amount),
          0,
        ) || 0;
      const totalPurchases =
        purchasesResult.data?.reduce(
          (sum, pur) => sum + Number(pur.total_amount),
          0,
        ) || 0;
      const totalClientPayments =
        clientPaymentsResult.data?.reduce(
          (sum, pay) => sum + Number(pay.amount),
          0,
        ) || 0;
      const totalVendorPayments =
        vendorPaymentsResult.data?.reduce(
          (sum, pay) => sum + Number(pay.amount),
          0,
        ) || 0;

      // Calculate pending
      const unpaidJobs =
        jobsResult.data?.filter((job) => job.payment_status !== "paid") || [];
      const totalPendingReceivable = unpaidJobs.reduce(
        (sum, job) => sum + Number(job.total_amount),
        0,
      );

      const unpaidPurchases =
        purchasesResult.data?.filter((pur) => pur.payment_status !== "paid") ||
        [];
      const totalPendingPayable = unpaidPurchases.reduce(
        (sum, pur) => sum + Number(pur.total_amount),
        0,
      );

      // Profit = Revenue - Expenses - Purchases
      const profitLoss = totalRevenue - totalExpenses - totalPurchases;

      // Build monthly data
      const monthlyData = await fetchMonthlyData();

      setFinancialData({
        totalRevenue,
        totalExpenses,
        totalPurchases,
        totalVendorPayments,
        totalClientPayments,
        totalPendingReceivable,
        totalPendingPayable,
        profitLoss,
        monthlyData,
      });
    } catch (error) {
      console.error("Error fetching financial data:", error);
    }

    setLoading(false);
  };

  const fetchMonthlyData = async () => {
    const monthlyData: MonthlyData[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthStr = monthStart.toLocaleString("default", {
        month: "short",
        year: "numeric",
      });

      const monthStartStr = monthStart.toISOString().split("T")[0];
      const monthEndStr = monthEnd.toISOString().split("T")[0];

      const [jobs, expenses, purchases] = await Promise.all([
        supabase
          .from("print_jobs")
          .select("total_amount")
          .gte("job_date", monthStartStr)
          .lte("job_date", monthEndStr),
        supabase
          .from("expenses")
          .select("amount")
          .gte("expense_date", monthStartStr)
          .lte("expense_date", monthEndStr),
        supabase
          .from("purchases")
          .select("total_amount")
          .gte("purchase_date", monthStartStr)
          .lte("purchase_date", monthEndStr),
      ]);

      const revenue =
        jobs.data?.reduce((sum, job) => sum + Number(job.total_amount), 0) || 0;
      const expenseAmount =
        expenses.data?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;
      const purchaseAmount =
        purchases.data?.reduce(
          (sum, pur) => sum + Number(pur.total_amount),
          0,
        ) || 0;

      monthlyData.push({
        month: monthStr,
        revenue,
        expenses: expenseAmount,
        purchases: purchaseAmount,
        profit: revenue - expenseAmount - purchaseAmount,
      });
    }

    return monthlyData;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-gray-500 text-sm">
            Financial insights and reports
          </p>
        </div>
        {activeTab === "overview" && (
          <Button variant="outline" onClick={handlePrint}>
            <Download className="mr-2 h-4 w-4" />
            Print
          </Button>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center ${
            activeTab === "overview"
              ? "border-[#FF6B00] text-[#FF6B00]"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          Financial Overview
        </button>
        <button
          onClick={() => setActiveTab("ledger")}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center ${
            activeTab === "ledger"
              ? "border-[#FF6B00] text-[#FF6B00]"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          <FileText className="h-4 w-4 mr-2" />
          Client Ledger Report
        </button>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B00]" />
            </div>
          ) : (
            <>
              {/* Month Filter */}
              <div className="flex gap-2">
                <Button
                  variant={monthFilter === "current" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMonthFilter("current")}
                >
                  This Month
                </Button>
                <Button
                  variant={monthFilter === "previous" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMonthFilter("previous")}
                >
                  Last Month
                </Button>
                <Button
                  variant={monthFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMonthFilter("all")}
                >
                  All Time
                </Button>
              </div>

              {/* Profit/Loss Card */}
              <Card
                className={`${
                  financialData.profitLoss >= 0
                    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                }`}
              >
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Net Profit / Loss
                    </p>
                    <p
                      className={`text-4xl font-bold ${
                        financialData.profitLoss >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatCurrency(financialData.profitLoss)}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Revenue - Expenses - Purchases
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Total Revenue</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(financialData.totalRevenue)}
                        </p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                        <TrendingUp className="h-6 w-6 text-green-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Total Expenses</p>
                        <p className="text-2xl font-bold text-red-600">
                          {formatCurrency(financialData.totalExpenses)}
                        </p>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                        <Receipt className="h-6 w-6 text-red-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Total Purchases</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {formatCurrency(financialData.totalPurchases)}
                        </p>
                      </div>
                      <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                        <ShoppingCart className="h-6 w-6 text-orange-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Cash Flow */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-3">
                      Money In (Receivable)
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Received from Clients
                        </span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(financialData.totalClientPayments)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Pending from Clients
                        </span>
                        <span className="font-medium text-orange-600">
                          {formatCurrency(financialData.totalPendingReceivable)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-3">Money Out (Payable)</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Paid to Vendors
                        </span>
                        <span className="font-medium text-red-600">
                          {formatCurrency(financialData.totalVendorPayments)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Pending to Vendors
                        </span>
                        <span className="font-medium text-orange-600">
                          {formatCurrency(financialData.totalPendingPayable)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Trend */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-4">
                    Monthly Performance (Last 6 Months)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b dark:border-gray-700">
                          <th className="text-left py-2 px-3">Month</th>
                          <th className="text-right py-2 px-3">Revenue</th>
                          <th className="text-right py-2 px-3">Expenses</th>
                          <th className="text-right py-2 px-3">Purchases</th>
                          <th className="text-right py-2 px-3">Profit/Loss</th>
                        </tr>
                      </thead>
                      <tbody>
                        {financialData.monthlyData.map((data) => (
                          <tr
                            key={data.month}
                            className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            <td className="py-2 px-3 font-medium">
                              {data.month}
                            </td>
                            <td className="text-right py-2 px-3 text-green-600">
                              {formatCurrency(data.revenue)}
                            </td>
                            <td className="text-right py-2 px-3 text-red-600">
                              {formatCurrency(data.expenses)}
                            </td>
                            <td className="text-right py-2 px-3 text-orange-600">
                              {formatCurrency(data.purchases)}
                            </td>
                            <td
                              className={`text-right py-2 px-3 font-medium ${
                                data.profit >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {formatCurrency(data.profit)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Summary */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-4">Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Total Revenue Generated
                      </span>
                      <span className="font-medium">
                        {formatCurrency(financialData.totalRevenue)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Total Operating Expenses
                      </span>
                      <span className="font-medium">
                        {formatCurrency(financialData.totalExpenses)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Total Purchases
                      </span>
                      <span className="font-medium">
                        {formatCurrency(financialData.totalPurchases)}
                      </span>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Net Profit / Loss</span>
                        <span
                          className={`font-bold ${
                            financialData.profitLoss >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {formatCurrency(financialData.profitLoss)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}

      {/* LEDGER REPORT TAB */}
      {activeTab === "ledger" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-[#FF6B00]" />
                Client Ledger Report
              </CardTitle>
              <CardDescription>
                Select a client and optionally a date range to generate their
                ledger
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Client Dropdown */}
                <div className="space-y-2 md:col-span-3">
                  <Label htmlFor="client-select">Client *</Label>
                  <select
                    id="client-select"
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                  >
                    <option value="">Select a client...</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.company_name ||
                          `${client.first_name} ${client.last_name}`}
                        {client.company_name
                          ? ` (${client.first_name} ${client.last_name})`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* From Date */}
                <div className="space-y-2">
                  <Label>From Date (Optional)</Label>
                  <DatePicker
                    value={ledgerFrom}
                    onChange={setLedgerFrom}
                    placeholder="DD/MM/YYYY"
                  />
                  <p className="text-xs text-gray-500">
                    Leave empty for full history
                  </p>
                </div>

                {/* To Date */}
                <div className="space-y-2">
                  <Label>To Date (Optional)</Label>
                  <DatePicker
                    value={ledgerTo}
                    onChange={setLedgerTo}
                    placeholder="DD/MM/YYYY"
                  />
                  <p className="text-xs text-gray-500">
                    Leave empty for full history
                  </p>
                </div>

                {/* Clear Button */}
                <div className="space-y-2">
                  <Label>&nbsp;</Label>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setLedgerFrom("");
                      setLedgerTo("");
                    }}
                    className="w-full"
                    disabled={!ledgerFrom && !ledgerTo}
                  >
                    Clear Dates
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ledger Viewer */}
          {selectedClientId ? (
            <LedgerViewer
              clientId={selectedClientId}
              fromDate={ledgerFrom || undefined}
              toDate={ledgerTo || undefined}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">
                  Select a client to view their ledger
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  You can also filter by date range for a specific period
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
