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
  Pencil, // Add this
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
  return methods[method] || method;
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
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState("current");

  useEffect(() => {
    fetchPayments();
  }, [monthFilter]);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredPayments(payments);
    } else {
      const filtered = payments.filter(
        (payment) =>
          payment.clients?.company_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          payment.clients?.first_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          payment.clients?.last_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          payment.notes?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
      setFilteredPayments(filtered);
    }
  }, [searchTerm, payments]);

  const fetchPayments = async () => {
    setLoading(true);

    let query = supabase
      .from("payments")
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
      .order("payment_date", { ascending: false });

    // Apply month filter
    if (monthFilter === "current") {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthStartStr = monthStart.toISOString().split("T")[0];
      query = query.gte("payment_date", monthStartStr);
    } else if (monthFilter === "previous") {
      const now = new Date();
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      query = query
        .gte("payment_date", prevMonthStart.toISOString().split("T")[0])
        .lt("payment_date", currentMonthStart.toISOString().split("T")[0]);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching payments:", error);
    } else {
      setPayments(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("payments").delete().eq("id", id);

    if (!error) {
      setPayments(payments.filter((payment) => payment.id !== id));
      setDeleteId(null);
    }
  };

  const totalPayments = filteredPayments.reduce(
    (sum, payment) => sum + Number(payment.amount),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-gray-500">Record and track received payments</p>
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
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Total Received</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totalPayments)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Total Payments</p>
              <p className="text-2xl font-bold">{filteredPayments.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search payments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
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
      </div>

      {/* Payments List */}
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
              {searchTerm
                ? "Try different search terms"
                : "Record your first payment"}
            </p>
          </CardContent>
        </Card>
      ) : (
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
                      </div>
                    </div>{" "}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
