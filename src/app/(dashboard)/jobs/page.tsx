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
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils/format";
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
  const [filteredJobs, setFilteredJobs] = useState<PrintJob[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    filterJobs();
  }, [searchTerm, statusFilter, jobs]);

  const fetchJobs = async () => {
    setLoading(true);

    // Get current month's jobs
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStartStr = monthStart.toISOString().split("T")[0];

    const { data: jobsData, error } = await supabase
      .from("print_jobs")
      .select(
        `
        *,
        clients (
          company_name,
          first_name,
          last_name
        )
      `,
      )
      .gte("job_date", monthStartStr)
      .order("job_date", { ascending: false });

    if (error) {
      console.error("Error fetching jobs:", error);
    } else {
      setJobs(jobsData || []);
    }
    setLoading(false);
  };

  const filterJobs = () => {
    let filtered = [...jobs];

    // Apply search
    if (searchTerm.trim() !== "") {
      filtered = filtered.filter(
        (job) =>
          job.job_details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.clients?.company_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          job.clients?.first_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          job.clients?.last_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()),
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((job) => job.status === statusFilter);
    }

    setFilteredJobs(filtered);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("print_jobs").delete().eq("id", id);

    if (!error) {
      setJobs(jobs.filter((job) => job.id !== id));
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Print Jobs</h1>
          <p className="text-gray-500">Current month's jobs</p>
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
            <p className="text-sm text-gray-500">Total Jobs Value</p>
            <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Total Jobs</p>
            <p className="text-2xl font-bold">{filteredJobs.length}</p>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search jobs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {["all", "new", "in_process", "completed"].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
            >
              {status === "all" ? "All" : status.replace("_", " ")}
            </Button>
          ))}
        </div>
      </div>

      {/* Jobs List */}
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
                : "Add your first job"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredJobs.map((job) => (
            <Card key={job.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold text-lg truncate">
                        {job.clients?.company_name ||
                          `${job.clients?.first_name} ${job.clients?.last_name}`}
                      </h3>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${getStatusColor(job.status)}`}
                      >
                        {job.status.replace("_", " ")}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${getPaymentStatusColor(job.payment_status)}`}
                      >
                        {job.payment_status}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {job.job_details || "No details"}
                    </p>

                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                      <span>Qty: {job.print_qty}</span>
                      <span>Rate: {job.rate}</span>
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
                        onClick={() => updateJobStatus(job.id, "new")}
                        className={job.status === "new" ? "text-blue-600" : ""}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
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
    </div>
  );
}
