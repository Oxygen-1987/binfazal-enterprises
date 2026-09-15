// src/app/(dashboard)/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatsSkeleton } from "@/components/shared/skeletons";
import {
  Plus,
  Printer,
  Users,
  Wallet,
  TrendingUp,
  Receipt,
  AlertCircle,
  Clock,
  CheckCircle,
  Truck,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface MonthlyData {
  month: string;
  revenue: number;
  expenses: number;
  purchases: number;
}

interface PendingClient {
  id: string;
  name: string;
  balance: number;
}

interface PendingJob {
  id: string;
  client_name: string;
  job_details: string;
  status: string;
  job_date: string;
  total_amount: number;
}

export default function DashboardPage() {
  const { userRole } = useAuth();
  const [stats, setStats] = useState({
    todayJobs: 0,
    todayJobsValue: 0,
    todayPayments: 0,
    monthlyRevenue: 0,
    pendingPayments: 0,
    monthlyExpenses: 0,
    monthlyPurchases: 0,
  });
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [pendingClients, setPendingClients] = useState<PendingClient[]>([]);
  const [pendingJobs, setPendingJobs] = useState<PendingJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStartStr = monthStart.toISOString().split("T")[0];

    // Fetch today's jobs
    const { data: todayJobsData } = await supabase
      .from("print_jobs")
      .select("*, clients(company_name, first_name, last_name)")
      .eq("job_date", today);

    // Fetch today's payments
    const { data: todayPaymentsData } = await supabase
      .from("payments")
      .select("amount")
      .eq("payment_date", today);

    // Fetch monthly jobs
    const { data: monthlyJobsData } = await supabase
      .from("print_jobs")
      .select("total_amount, payment_status")
      .gte("job_date", monthStartStr);

    // Fetch monthly expenses
    const { data: monthlyExpensesData } = await supabase
      .from("expenses")
      .select("amount")
      .gte("expense_date", monthStartStr);

    // Fetch monthly purchases
    const { data: monthlyPurchasesData } = await supabase
      .from("purchases")
      .select("total_amount")
      .gte("purchase_date", monthStartStr);

    // Fetch recent jobs
    const { data: recentJobsData } = await supabase
      .from("print_jobs")
      .select(
        `
        *,
        clients (company_name, first_name, last_name)
      `,
      )
      .order("created_at", { ascending: false })
      .limit(5);

    // Fetch pending jobs (new + in_process)
    const { data: pendingJobsData } = await supabase
      .from("print_jobs")
      .select(
        `
        *,
        clients (company_name, first_name, last_name)
      `,
      )
      .in("status", ["new", "in_process"])
      .order("job_date", { ascending: true })
      .limit(5);

    // Fetch clients with pending payments
    const { data: allClients } = await supabase
      .from("clients")
      .select("id, first_name, last_name, company_name, opening_balance");

    const { data: allJobs } = await supabase
      .from("print_jobs")
      .select("client_id, total_amount");

    const { data: allPayments } = await supabase
      .from("payments")
      .select("client_id, amount");

    // Calculate pending clients
    const clientsWithBalance = (allClients || [])
      .map((client) => {
        const totalJobs = (allJobs || [])
          .filter((job) => job.client_id === client.id)
          .reduce((sum, job) => sum + Number(job.total_amount), 0);
        const totalPayments = (allPayments || [])
          .filter((payment) => payment.client_id === client.id)
          .reduce((sum, payment) => sum + Number(payment.amount), 0);
        const balance =
          Number(client.opening_balance) + totalJobs - totalPayments;

        return {
          id: client.id,
          name:
            client.company_name || `${client.first_name} ${client.last_name}`,
          balance,
        };
      })
      .filter((c) => c.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 5);

    setPendingClients(clientsWithBalance);

    // Calculate totals
    const todayJobsValue = (todayJobsData || []).reduce(
      (sum, job) => sum + Number(job.total_amount),
      0,
    );
    const todayPayments = (todayPaymentsData || []).reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    const monthlyRevenue = (monthlyJobsData || []).reduce(
      (sum, job) => sum + Number(job.total_amount),
      0,
    );
    const monthlyExpenses = (monthlyExpensesData || []).reduce(
      (sum, e) => sum + Number(e.amount),
      0,
    );
    const monthlyPurchases = (monthlyPurchasesData || []).reduce(
      (sum, p) => sum + Number(p.total_amount),
      0,
    );
    const pendingPayments = (monthlyJobsData || [])
      .filter((j) => j.payment_status !== "paid")
      .reduce((sum, job) => sum + Number(job.total_amount), 0);

    setStats({
      todayJobs: todayJobsData?.length || 0,
      todayJobsValue,
      todayPayments,
      monthlyRevenue,
      pendingPayments,
      monthlyExpenses,
      monthlyPurchases,
    });

    setRecentJobs(recentJobsData || []);

    // Format pending jobs
    const formattedPendingJobs = (pendingJobsData || []).map((job) => ({
      id: job.id,
      client_name:
        job.clients?.company_name ||
        `${job.clients?.first_name} ${job.clients?.last_name}`,
      job_details: job.job_details || "No details",
      status: job.status,
      job_date: job.job_date,
      total_amount: Number(job.total_amount),
    }));
    setPendingJobs(formattedPendingJobs);

    // Fetch monthly data for chart (last 6 months)
    const chartData: MonthlyData[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthStr = monthStart.toLocaleString("default", { month: "short" });

      const startStr = monthStart.toISOString().split("T")[0];
      const endStr = monthEnd.toISOString().split("T")[0];

      const [jobs, expenses, purchases] = await Promise.all([
        supabase
          .from("print_jobs")
          .select("total_amount")
          .gte("job_date", startStr)
          .lte("job_date", endStr),
        supabase
          .from("expenses")
          .select("amount")
          .gte("expense_date", startStr)
          .lte("expense_date", endStr),
        supabase
          .from("purchases")
          .select("total_amount")
          .gte("purchase_date", startStr)
          .lte("purchase_date", endStr),
      ]);

      chartData.push({
        month: monthStr,
        revenue: (jobs.data || []).reduce(
          (sum, j) => sum + Number(j.total_amount),
          0,
        ),
        expenses: (expenses.data || []).reduce(
          (sum, e) => sum + Number(e.amount),
          0,
        ),
        purchases: (purchases.data || []).reduce(
          (sum, p) => sum + Number(p.total_amount),
          0,
        ),
      });
    }
    setMonthlyData(chartData);
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
      case "in_process":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
      case "completed":
        return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (loading) {
    return <StatsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-500">{formatDate(new Date())}</p>
      </div>

      {/* Today's Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/10 border-orange-200 dark:border-orange-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                  Today's Jobs
                </p>
                <p className="text-2xl font-bold">{stats.todayJobs}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {formatCurrency(stats.todayJobsValue)}
                </p>
              </div>
              <Printer className="h-8 w-8 text-[#FF6B00]" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/10 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                  Today's Received
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(stats.todayPayments)}
                </p>
              </div>
              <Wallet className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Stats */}
      {userRole === "owner" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">Monthly Revenue</p>
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(stats.monthlyRevenue)}
              </p>
              <TrendingUp className="h-4 w-4 text-green-500 mt-1" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">Pending Payments</p>
              <p className="text-lg font-bold text-yellow-600">
                {formatCurrency(stats.pendingPayments)}
              </p>
              <AlertCircle className="h-4 w-4 text-yellow-500 mt-1" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">Monthly Expenses</p>
              <p className="text-lg font-bold text-red-600">
                {formatCurrency(stats.monthlyExpenses)}
              </p>
              <Receipt className="h-4 w-4 text-red-500 mt-1" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">Monthly Purchases</p>
              <p className="text-lg font-bold text-orange-600">
                {formatCurrency(stats.monthlyPurchases)}
              </p>
              <Truck className="h-4 w-4 text-orange-500 mt-1" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/jobs/new">
          <Button className="w-full h-20 text-base flex-col gap-1">
            <Plus className="h-5 w-5" />
            New Job
          </Button>
        </Link>
        <Link href="/clients/new">
          <Button
            variant="outline"
            className="w-full h-20 text-base flex-col gap-1"
          >
            <Users className="h-5 w-5" />
            New Client
          </Button>
        </Link>
        {userRole === "owner" && (
          <>
            <Link href="/payments/new">
              <Button
                variant="outline"
                className="w-full h-20 text-base flex-col gap-1"
              >
                <Wallet className="h-5 w-5" />
                Payment
              </Button>
            </Link>
            <Link href="/expenses/new">
              <Button
                variant="outline"
                className="w-full h-20 text-base flex-col gap-1"
              >
                <Receipt className="h-5 w-5" />
                Expense
              </Button>
            </Link>
          </>
        )}
      </div>

      {/* Revenue vs Expenses Chart (Owner Only) */}
      {userRole === "owner" && monthlyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">6-Month Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ width: "100%", height: 250 }}>
              <ResponsiveContainer>
                <BarChart
                  data={monthlyData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: any) => formatCurrency(Number(value))}
                    contentStyle={{
                      backgroundColor: "rgba(0,0,0,0.9)",
                      border: "none",
                      borderRadius: "8px",
                      color: "white",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "white" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar
                    dataKey="revenue"
                    fill="#22c55e"
                    name="Revenue"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="expenses"
                    fill="#ef4444"
                    name="Expenses"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="purchases"
                    fill="#FF6B00"
                    name="Purchases"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Jobs Reminder */}
      {pendingJobs.length > 0 && (
        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center">
                <Clock className="h-5 w-5 mr-2 text-yellow-600" />
                Pending Jobs
              </CardTitle>
              <Link href="/jobs">
                <Button variant="ghost" size="sm" className="text-[#FF6B00]">
                  View All <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingJobs.map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}/edit`}>
                <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        job.status === "new" ? "bg-blue-500" : "bg-yellow-500"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">
                        {job.client_name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {job.job_details}
                      </p>
                    </div>
                  </div>
                  <div className="text-right ml-3">
                    <p className="font-bold text-sm">
                      {formatCurrency(job.total_amount)}
                    </p>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${getStatusColor(job.status)}`}
                    >
                      {job.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pending Payments Reminder (Owner Only) */}
      {userRole === "owner" && pendingClients.length > 0 && (
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-red-600" />
                Clients with Pending Payments
              </CardTitle>
              <Link href="/clients">
                <Button variant="ghost" size="sm" className="text-[#FF6B00]">
                  View All <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingClients.map((client) => (
              <Link key={client.id} href={`/clients/${client.id}/ledger`}>
                <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                  <p className="font-medium text-sm truncate flex-1">
                    {client.name}
                  </p>
                  <p className="font-bold text-red-600 text-sm ml-3">
                    {formatCurrency(client.balance)}
                  </p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Jobs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Recent Jobs</h2>
          <Link href="/jobs">
            <Button variant="ghost" size="sm" className="text-[#FF6B00]">
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div className="space-y-3">
          {recentJobs.map((job: any) => (
            <Link key={job.id} href={`/jobs/${job.id}/edit`}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">
                        {job.clients?.company_name ||
                          `${job.clients?.first_name} ${job.clients?.last_name}`}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {job.job_details}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(job.job_date)}
                      </p>
                    </div>
                    <div className="text-right ml-3">
                      <p className="font-bold">
                        {formatCurrency(job.total_amount)}
                      </p>
                      <span
                        className={`text-xs px-2 py-1 rounded ${getStatusColor(job.status)}`}
                      >
                        {job.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {recentJobs.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                No jobs yet.{" "}
                <Link
                  href="/jobs/new"
                  className="text-[#FF6B00] hover:underline"
                >
                  Create your first job
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
