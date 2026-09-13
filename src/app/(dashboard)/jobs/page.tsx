// src/app/(dashboard)/jobs/page.tsx
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
  Pencil,
  Trash2,
  Printer,
  CheckCircle,
  Clock,
  FileText,
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

interface PrintJob {
  id: string;
  job_date: string;
  client_id: string;
  job_details: string;
  paper_qty: number;
  colors_qty: number;
  print_qty: number;
  rate: number;
  total_amount: number;
  status: "new" | "in_process" | "completed";
  payment_status: "unpaid" | "partial" | "paid";
  created_at: string;
  clients?: {
    company_name: string;
    first_name: string;
    last_name: string;
  };
}

export default function JobsPage() {
  const { user, userRole } = useAuth();
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [totalCount, setTotalCount] = useState(0);
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
    const savedView = localStorage.getItem("jobsViewMode");
    if (savedView === "grid" || savedView === "list") {
      setViewMode(savedView);
    }
  }, []);

  const changeViewMode = (mode: "list" | "grid") => {
    setViewMode(mode);
    localStorage.setItem("jobsViewMode", mode);
  };

  useEffect(() => {
    fetchJobs();
  }, [dateFilter, customFrom, customTo, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, dateFilter, customFrom, customTo]);

  const fetchJobs = async () => {
    setLoading(true);

    const { from, to } = getDateRange(dateFilter, customFrom, customTo);

    // Build base query
    let query = supabase.from("print_jobs").select(
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

    if (from) query = query.gte("job_date", from);
    if (to) query = query.lte("job_date", to);

    // Apply pagination
    const fromIndex = (currentPage - 1) * itemsPerPage;
    const toIndex = fromIndex + itemsPerPage - 1;
    query = query
      .order("job_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(fromIndex, toIndex);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching jobs:", error);
    } else {
      setJobs(data || []);
      setTotalCount(count || 0);
    }
    setLoading(false);
  };

  // Client-side filtering for search + status
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      searchTerm.trim() === "" ||
      job.job_details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.clients?.company_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      job.clients?.first_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      job.clients?.last_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || job.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("print_jobs").delete().eq("id", id);

    if (!error) {
      setJobs(jobs.filter((job) => job.id !== id));
      setTotalCount((prev) => prev - 1);
      setDeleteId(null);
    }
  };

  const updateJobStatus = async (
    id: string,
    newStatus: "new" | "in_process" | "completed",
  ) => {
    const { error } = await supabase
      .from("print_jobs")
      .update({ status: newStatus })
      .eq("id", id);

    if (!error) {
      setJobs(
        jobs.map((job) =>
          job.id === id ? { ...job, status: newStatus } : job,
        ),
      );
    }
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

  const totalAmount = filteredJobs.reduce(
    (sum, job) => sum + Number(job.total_amount),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Print Jobs</h1>
          <p className="text-gray-500 text-sm">Manage your print jobs</p>
        </div>
        <Link href="/jobs/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Job
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
            <p className="text-sm text-gray-500">Total Jobs</p>
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
              placeholder="Search jobs..."
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
          {["all", "new", "in_process", "completed"].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className="whitespace-nowrap"
            >
              {status === "all" ? "All" : status.replace("_", " ")}
            </Button>
          ))}
        </div>
      </div>

      {/* Jobs Display */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B00]" />
        </div>
      ) : filteredJobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Printer className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg">No jobs found</p>
            <p className="text-gray-400 text-sm mt-2">
              {searchTerm || statusFilter !== "all"
                ? "Try different filters"
                : "No jobs in this period"}
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
                  <th className="text-left py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider hidden md:table-cell">
                    Details
                  </th>
                  <th className="text-right py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider hidden lg:table-cell">
                    Qty
                  </th>
                  <th className="text-right py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider hidden lg:table-cell">
                    Rate
                  </th>
                  <th className="text-right py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Total
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
                {filteredJobs.map((job) => (
                  <tr
                    key={job.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                  >
                    <td className="py-3 px-3 whitespace-nowrap text-xs">
                      {formatDate(job.job_date)}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium truncate max-w-[180px]">
                        {job.clients?.company_name ||
                          `${job.clients?.first_name} ${job.clients?.last_name}`}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">
                      <div className="truncate max-w-[250px]">
                        {job.job_details || "-"}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right hidden lg:table-cell whitespace-nowrap">
                      {job.print_qty
                        ? Number(job.print_qty).toLocaleString()
                        : "-"}
                    </td>
                    <td className="py-3 px-3 text-right hidden lg:table-cell whitespace-nowrap">
                      {job.rate ? Number(job.rate).toFixed(4) : "-"}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold whitespace-nowrap">
                      {formatCurrency(job.total_amount)}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${getStatusColor(
                            job.status,
                          )}`}
                        >
                          {job.status.replace("_", " ")}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${getPaymentStatusColor(
                            job.payment_status,
                          )}`}
                        >
                          {job.payment_status}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => updateJobStatus(job.id, "in_process")}
                          className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${
                            job.status === "in_process"
                              ? "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30"
                              : "text-gray-400"
                          }`}
                          title="Mark In Process"
                        >
                          <Clock className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => updateJobStatus(job.id, "completed")}
                          className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${
                            job.status === "completed"
                              ? "text-green-600 bg-green-50 dark:bg-green-900/30"
                              : "text-gray-400"
                          }`}
                          title="Mark Completed"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>

                        <Link href={`/jobs/${job.id}/edit`}>
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
                                <AlertDialogTitle>Delete Job</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this job? This
                                  action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(job.id)}
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
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* GRID VIEW */
        <div className="space-y-3">
          {filteredJobs.map((job) => (
            <Card key={job.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">
                      {job.clients?.company_name ||
                        `${job.clients?.first_name} ${job.clients?.last_name}`}
                    </h3>

                    <div className="flex flex-wrap gap-2 mb-3 mt-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${getStatusColor(
                          job.status,
                        )}`}
                      >
                        {job.status.replace("_", " ")}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${getPaymentStatusColor(
                          job.payment_status,
                        )}`}
                      >
                        {job.payment_status}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {job.job_details || "No details"}
                    </p>

                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                      <span>Qty: {Number(job.print_qty).toLocaleString()}</span>
                      <span>Rate: {Number(job.rate).toFixed(4)}</span>
                      <span>{formatDate(job.job_date)}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end space-y-2 ml-4">
                    <p className="font-bold text-lg">
                      {formatCurrency(job.total_amount)}
                    </p>

                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateJobStatus(job.id, "in_process")}
                        className={
                          job.status === "in_process" ? "text-yellow-600" : ""
                        }
                      >
                        <Clock className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateJobStatus(job.id, "completed")}
                        className={
                          job.status === "completed" ? "text-green-600" : ""
                        }
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Link href={`/jobs/${job.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      {userRole === "owner" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Job</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this job? This
                                action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(job.id)}
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
          ))}
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
