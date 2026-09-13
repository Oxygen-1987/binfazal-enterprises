// src/app/(dashboard)/purchases/page.tsx
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
  ShoppingCart,
  Calendar,
  Truck,
  FileText,
  Calculator,
  Pencil,
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
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchPurchases();
  }, []);

  useEffect(() => {
    filterPurchases();
  }, [searchTerm, statusFilter, purchases]);

  const fetchPurchases = async () => {
    setLoading(true);

    const { data: purchasesData, error } = await supabase
      .from("purchases")
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
      .order("purchase_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching purchases:", error);
    } else {
      console.log("Purchases data:", purchasesData);
      setPurchases(purchasesData || []);
    }
    setLoading(false);
  };

  const filterPurchases = () => {
    let filtered = [...purchases];

    if (searchTerm.trim() !== "") {
      filtered = filtered.filter(
        (purchase) =>
          purchase.item_details
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          purchase.vendors?.company_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          purchase.vendors?.first_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          purchase.vendors?.last_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()),
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (purchase) => purchase.payment_status === statusFilter,
      );
    }

    setFilteredPurchases(filtered);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("purchases").delete().eq("id", id);

    if (!error) {
      setPurchases(purchases.filter((purchase) => purchase.id !== id));
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

  const totalAmount = filteredPurchases.reduce(
    (sum, purchase) => sum + Number(purchase.total_amount),
    0,
  );
  const totalUnpaid = filteredPurchases
    .filter((p) => p.payment_status === "unpaid")
    .reduce((sum, purchase) => sum + Number(purchase.total_amount), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Purchases</h1>
          <p className="text-gray-500">Track purchases from vendors</p>
        </div>
        <Link href="/purchases/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Purchase
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gray-50 dark:bg-gray-900">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Purchases</p>
            <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-4">
            <p className="text-sm text-red-600 dark:text-red-400">
              Total Unpaid
            </p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(totalUnpaid)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search purchases..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {["all", "unpaid", "partial", "paid"].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
            >
              {status === "all" ? "All" : status}
            </Button>
          ))}
        </div>
      </div>

      {/* Purchases List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B00]" />
        </div>
      ) : filteredPurchases.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingCart className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg">No purchases found</p>
            <p className="text-gray-400 text-sm mt-2">
              {searchTerm || statusFilter !== "all"
                ? "Try different filters"
                : "Add your first purchase"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredPurchases.map((purchase) => (
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
                            className={`text-xs px-2 py-1 rounded-full ${getPaymentStatusColor(purchase.payment_status)}`}
                          >
                            {purchase.payment_status}
                          </span>
                          <span className="flex items-center text-sm text-gray-500">
                            <Calendar className="h-4 w-4 mr-1" />
                            {formatDate(purchase.purchase_date)}
                          </span>
                        </div>

                        {/* Show item details or bill details */}
                        {purchase.item_details && (
                          <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <div className="flex items-start space-x-2">
                              {purchase.quantity && purchase.rate ? (
                                <Calculator className="h-4 w-4 text-gray-400 mt-0.5" />
                              ) : (
                                <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                              )}
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {purchase.item_details}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Show quantity and rate if available */}
                        {purchase.quantity && purchase.rate && (
                          <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                            <span>Qty: {purchase.quantity}</span>
                            <span>Rate: {formatCurrency(purchase.rate)}</span>
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
          ))}
        </div>
      )}
    </div>
  );
}
