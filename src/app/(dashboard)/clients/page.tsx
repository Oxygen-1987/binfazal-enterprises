// src/app/(dashboard)/clients/page.tsx
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
  Pencil,
  Trash2,
  BookOpen,
  Users,
  Phone,
  Building2,
  List,
  LayoutGrid,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils/format";
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

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  company_name: string;
  mobile_number: string;
  address: string;
  opening_balance: number;
  opening_balance_date: string;
  created_at: string;
  account_balance?: number;
}

export default function ClientsPage() {
  const { user, userRole } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterType>("all_time");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Load saved view preference
  useEffect(() => {
    const savedView = localStorage.getItem("clientsViewMode");
    if (savedView === "grid" || savedView === "list") {
      setViewMode(savedView);
    }
  }, []);

  const changeViewMode = (mode: "list" | "grid") => {
    setViewMode(mode);
    localStorage.setItem("clientsViewMode", mode);
  };

  useEffect(() => {
    fetchClients();
  }, [dateFilter, customFrom, customTo, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFilter, customFrom, customTo]);

  const fetchClients = async () => {
    setLoading(true);

    const { from, to } = getDateRange(dateFilter, customFrom, customTo);

    let query = supabase.from("clients").select("*", { count: "exact" });

    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to + "T23:59:59");

    const fromIndex = (currentPage - 1) * itemsPerPage;
    const toIndex = fromIndex + itemsPerPage - 1;

    query = query
      .order("created_at", { ascending: false })
      .range(fromIndex, toIndex);

    const { data: clientsData, error: clientsError, count } = await query;

    if (clientsError) {
      console.error("Error fetching clients:", clientsError);
      setLoading(false);
      return;
    }

    // Fetch all jobs and payments for balance calculation
    // Note: For a large dataset, this should be done server-side via RPC
    const [jobsResult, paymentsResult] = await Promise.all([
      supabase.from("print_jobs").select("client_id, total_amount"),
      supabase.from("payments").select("client_id, amount"),
    ]);

    const jobsData = jobsResult.data || [];
    const paymentsData = paymentsResult.data || [];

    const clientsWithBalance = (clientsData || []).map((client) => {
      const totalJobs = jobsData
        .filter((job) => job.client_id === client.id)
        .reduce((sum, job) => sum + Number(job.total_amount), 0);

      const totalPayments = paymentsData
        .filter((payment) => payment.client_id === client.id)
        .reduce((sum, payment) => sum + Number(payment.amount), 0);

      const accountBalance =
        Number(client.opening_balance) + totalJobs - totalPayments;

      return {
        ...client,
        account_balance: accountBalance,
      };
    });

    setClients(clientsWithBalance);
    setTotalCount(count || 0);
    setLoading(false);
  };

  const filteredClients = clients.filter((client) => {
    if (searchTerm.trim() === "") return true;
    const search = searchTerm.toLowerCase();
    return (
      client.first_name?.toLowerCase().includes(search) ||
      client.last_name?.toLowerCase().includes(search) ||
      client.company_name?.toLowerCase().includes(search) ||
      client.mobile_number?.includes(searchTerm)
    );
  });

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("clients").delete().eq("id", id);

    if (!error) {
      setClients(clients.filter((client) => client.id !== id));
      setTotalCount((prev) => prev - 1);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-gray-500 text-sm">
            Manage your clients and their accounts
          </p>
        </div>
        <Link href="/clients/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add New Client
          </Button>
        </Link>
      </div>

      {/* Summary Card */}
      <Card className="bg-gray-50 dark:bg-gray-900">
        <CardContent className="p-4 flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">Total Clients</p>
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
              placeholder="Search by name, company, or phone..."
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
      </div>

      {/* Clients Display */}
      {loading ? (
        viewMode === "list" ? (
          <ListSkeleton rows={10} />
        ) : (
          <CardListSkeleton count={5} />
        )
      ) : filteredClients.length === 0 ? (
        searchTerm ? (
          <EmptyState
            icon={Search}
            title="No clients match your search"
            description={`We couldn't find any clients matching "${searchTerm}".`}
            variant="search"
          />
        ) : (
          <EmptyState
            icon={Users}
            title="No clients yet"
            description="Add your first client to get started. Clients will appear here with their contact details and account balance."
            actionLabel="Add New Client"
            actionHref="/clients/new"
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
                    Name
                  </th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider hidden md:table-cell">
                    Company
                  </th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Mobile
                  </th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider hidden lg:table-cell">
                    Address
                  </th>
                  {userRole === "owner" && (
                    <th className="text-right py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                      Balance
                    </th>
                  )}
                  <th className="text-right py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredClients.map((client) => (
                  <tr
                    key={client.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                  >
                    <td className="py-3 px-3">
                      <Link
                        href={`/clients/${client.id}/ledger`}
                        className="hover:text-[#FF6B00]"
                      >
                        <div className="font-medium">
                          {client.first_name} {client.last_name}
                        </div>
                      </Link>
                    </td>
                    <td className="py-3 px-3 hidden md:table-cell">
                      <div className="truncate max-w-[200px]">
                        {client.company_name || "-"}
                      </div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {client.mobile_number}
                    </td>
                    <td className="py-3 px-3 hidden lg:table-cell">
                      <div className="truncate max-w-[200px] text-gray-500">
                        {client.address || "-"}
                      </div>
                    </td>
                    {userRole === "owner" && (
                      <td className="py-3 px-3 text-right font-semibold whitespace-nowrap">
                        <span
                          className={`${
                            (client.account_balance || 0) > 0
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {formatCurrency(client.account_balance || 0)}
                        </span>
                      </td>
                    )}
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/clients/${client.id}/ledger`}>
                          <button
                            className="px-2 py-1 rounded text-xs bg-[#FF6B00] hover:bg-[#E66000] text-white flex items-center gap-1"
                            title="View Ledger"
                          >
                            <BookOpen className="h-3.5 w-3.5" />
                            <span className="hidden lg:inline">Ledger</span>
                          </button>
                        </Link>
                        <Link href={`/clients/${client.id}/edit`}>
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
                                  Delete Client
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this client?
                                  This action cannot be undone. All associated
                                  jobs and payments will also be deleted.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(client.id)}
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
          {filteredClients.map((client) => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <Link href={`/clients/${client.id}/ledger`}>
                      <h3 className="font-semibold text-lg truncate">
                        {client.company_name ||
                          `${client.first_name} ${client.last_name}`}
                      </h3>
                    </Link>

                    {client.company_name && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {client.first_name} {client.last_name}
                      </p>
                    )}

                    <div className="flex flex-col space-y-1 mt-2">
                      <div className="flex items-center text-sm text-gray-500">
                        <Phone className="h-4 w-4 mr-2" />
                        {client.mobile_number}
                      </div>
                      {client.address && (
                        <div className="flex items-center text-sm text-gray-500">
                          <Building2 className="h-4 w-4 mr-2" />
                          <span className="truncate">{client.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end space-y-2">
                    {userRole === "owner" && (
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Balance</p>
                        <p
                          className={`font-bold ${
                            (client.account_balance || 0) > 0
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {formatCurrency(client.account_balance || 0)}
                        </p>
                      </div>
                    )}

                    <div className="flex space-x-1">
                      <Link href={`/clients/${client.id}/ledger`}>
                        <Button
                          size="sm"
                          className="bg-[#FF6B00] hover:bg-[#E66000] text-white h-8 px-2"
                          title="View Ledger"
                        >
                          <BookOpen className="h-3.5 w-3.5 mr-1" />
                          <span className="text-xs">Ledger</span>
                        </Button>
                      </Link>
                      <Link href={`/clients/${client.id}/edit`}>
                        <Button variant="ghost" size="sm" title="Edit">
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
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Client</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this client?
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(client.id)}
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
