// src/app/(dashboard)/vendor-payments/page.tsx
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
  Calendar,
  Truck,
  Banknote,
  CreditCard,
  Smartphone,
  Landmark,
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

interface VendorPayment {
  id: string;
  vendor_id: string;
  purchase_id: string | null;
  amount: number;
  payment_date: string;
  payment_method: string;
  notes: string;
  created_at: string;
  vendors?: {
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

export default function VendorPaymentsPage() {
  const { userRole } = useAuth();
  const [payments, setPayments] = useState<VendorPayment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<VendorPayment[]>([]);
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
          payment.vendors?.company_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          payment.vendors?.first_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          payment.vendors?.last_name
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
      .from("vendor_payments")
      .select(
        `
        *,
        vendors (
          company_name,
          first_name,
          last_name
        )
      `,
      )
      .order("payment_date", { ascending: false });

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
      console.error("Error fetching vendor payments:", error);
    } else {
      setPayments(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("vendor_payments")
      .delete()
      .eq("id", id);

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
          <h1 className="text-2xl font-bold">Vendor Payments</h1>
          <p className="text-gray-500">Track payments made to vendors</p>
        </div>
        <Link href="/vendor-payments/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Pay Vendor
          </Button>
        </Link>
      </div>

      {/* Summary Card */}
      <Card className="bg-gray-50 dark:bg-gray-900">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Total Paid</p>
              <p className="text-2xl font-bold text-red-600">
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
            placeholder="Search vendor payments..."
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
            <p className="text-gray-500 text-lg">No vendor payments found</p>
            <p className="text-gray-400 text-sm mt-2">
              {searchTerm
                ? "Try different search terms"
                : "Record your first vendor payment"}
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
                        <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
                          <Truck className="h-5 w-5 text-red-500" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">
                            {payment.vendors?.company_name ||
                              `${payment.vendors?.first_name} ${payment.vendors?.last_name}`}
                          </h3>

                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="flex items-center text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                              <MethodIcon className="h-3 w-3 mr-1" />
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
                      <p className="font-bold text-lg text-red-600">
                        {formatCurrency(payment.amount)}
                      </p>

                      <div className="flex space-x-1">
                        <Link href={`/vendor-payments/${payment.id}/edit`}>
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
                                Delete Vendor Payment
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
                    </div>
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
