// src/app/(dashboard)/clients/page.tsx
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
  BookOpen,
  Users,
  Phone,
  Building2,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils/format";
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
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredClients(clients);
    } else {
      const filtered = clients.filter(
        (client) =>
          client.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.company_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          client.mobile_number.includes(searchTerm),
      );
      setFilteredClients(filtered);
    }
  }, [searchTerm, clients]);

  const fetchClients = async () => {
    setLoading(true);

    // Fetch clients with their job totals
    const { data: clientsData, error: clientsError } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (clientsError) {
      console.error("Error fetching clients:", clientsError);
      setLoading(false);
      return;
    }

    // Fetch all jobs to calculate balances
    const { data: jobsData } = await supabase
      .from("print_jobs")
      .select("client_id, total_amount");

    // Fetch all payments
    const { data: paymentsData } = await supabase
      .from("payments")
      .select("client_id, amount");

    // Calculate account balance for each client
    const clientsWithBalance = clientsData.map((client) => {
      const totalJobs =
        jobsData
          ?.filter((job) => job.client_id === client.id)
          .reduce((sum, job) => sum + Number(job.total_amount), 0) || 0;

      const totalPayments =
        paymentsData
          ?.filter((payment) => payment.client_id === client.id)
          .reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;

      const accountBalance =
        Number(client.opening_balance) + totalJobs - totalPayments;

      return {
        ...client,
        account_balance: accountBalance,
      };
    });

    setClients(clientsWithBalance);
    setFilteredClients(clientsWithBalance);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("clients").delete().eq("id", id);

    if (!error) {
      setClients(clients.filter((client) => client.id !== id));
      setDeleteId(null);
    } else {
      console.error("Error deleting client:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-gray-500">
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

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by name, company, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Clients List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      ) : filteredClients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg">No clients found</p>
            <p className="text-gray-400 text-sm mt-2">
              {searchTerm
                ? "Try different search terms"
                : "Add your first client to get started"}
            </p>
          </CardContent>
        </Card>
      ) : (
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
                        <Button variant="ghost" size="icon" title="View Ledger">
                          <BookOpen className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/clients/${client.id}/edit`}>
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
