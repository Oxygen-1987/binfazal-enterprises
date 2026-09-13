// src/app/(dashboard)/vendors/page.tsx
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

interface Vendor {
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

export default function VendorsPage() {
  const { userRole } = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredVendors(vendors);
    } else {
      const filtered = vendors.filter(
        (vendor) =>
          vendor.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          vendor.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          vendor.company_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          vendor.mobile_number.includes(searchTerm),
      );
      setFilteredVendors(filtered);
    }
  }, [searchTerm, vendors]);

  const fetchVendors = async () => {
    setLoading(true);

    const { data: vendorsData, error: vendorsError } = await supabase
      .from("vendors")
      .select("*")
      .order("created_at", { ascending: false });

    if (vendorsError) {
      console.error("Error fetching vendors:", vendorsError);
      setLoading(false);
      return;
    }

    // Fetch all purchases to calculate balances
    const { data: purchasesData } = await supabase
      .from("purchases")
      .select("vendor_id, total_amount");

    // Fetch all vendor payments
    const { data: paymentsData } = await supabase
      .from("vendor_payments")
      .select("vendor_id, amount");

    // Calculate account balance for each vendor
    const vendorsWithBalance = vendorsData.map((vendor) => {
      const totalPurchases =
        purchasesData
          ?.filter((purchase) => purchase.vendor_id === vendor.id)
          .reduce((sum, purchase) => sum + Number(purchase.total_amount), 0) ||
        0;

      const totalPayments =
        paymentsData
          ?.filter((payment) => payment.vendor_id === vendor.id)
          .reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;

      const accountBalance =
        Number(vendor.opening_balance) + totalPurchases - totalPayments;

      return {
        ...vendor,
        account_balance: accountBalance,
      };
    });

    setVendors(vendorsWithBalance);
    setFilteredVendors(vendorsWithBalance);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("vendors").delete().eq("id", id);

    if (!error) {
      setVendors(vendors.filter((vendor) => vendor.id !== id));
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Vendors</h1>
          <p className="text-gray-500">Manage your suppliers and vendors</p>
        </div>
        <Link href="/vendors/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add New Vendor
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

      {/* Vendors List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B00]" />
        </div>
      ) : filteredVendors.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg">No vendors found</p>
            <p className="text-gray-400 text-sm mt-2">
              {searchTerm
                ? "Try different search terms"
                : "Add your first vendor"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredVendors.map((vendor) => (
            <Card key={vendor.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <Link href={`/vendors/${vendor.id}/ledger`}>
                      <h3 className="font-semibold text-lg truncate">
                        {vendor.company_name ||
                          `${vendor.first_name} ${vendor.last_name}`}
                      </h3>
                    </Link>

                    {vendor.company_name && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {vendor.first_name} {vendor.last_name}
                      </p>
                    )}

                    <div className="flex flex-col space-y-1 mt-2">
                      <div className="flex items-center text-sm text-gray-500">
                        <Phone className="h-4 w-4 mr-2" />
                        {vendor.mobile_number}
                      </div>
                      {vendor.address && (
                        <div className="flex items-center text-sm text-gray-500">
                          <Building2 className="h-4 w-4 mr-2" />
                          <span className="truncate">{vendor.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end space-y-2">
                    {userRole === "owner" && (
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Payable</p>
                        <p
                          className={`font-bold ${
                            (vendor.account_balance || 0) > 0
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {formatCurrency(vendor.account_balance || 0)}
                        </p>
                      </div>
                    )}

                    <div className="flex space-x-1">
                      <Link href={`/vendors/${vendor.id}/ledger`}>
                        <Button variant="ghost" size="icon" title="View Ledger">
                          <BookOpen className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/vendors/${vendor.id}/edit`}>
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
                              <AlertDialogTitle>Delete Vendor</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this vendor?
                                This action cannot be undone. All associated
                                purchases and payments will also be deleted.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(vendor.id)}
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
