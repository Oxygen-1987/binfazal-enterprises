// src/app/(dashboard)/purchases/[id]/edit/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/shared/date-picker";
import { ArrowLeft, Save, X, Trash2, FileText, Calculator } from "lucide-react";
import Link from "next/link";

interface Vendor {
  id: string;
  first_name: string;
  last_name: string;
  company_name: string;
}

export default function EditPurchasePage() {
  const router = useRouter();
  const params = useParams();
  const { user, userRole } = useAuth();
  const purchaseId = params.id as string;

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [vendorSearch, setVendorSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [entryType, setEntryType] = useState<"total" | "detailed">("total");

  const [formData, setFormData] = useState({
    purchase_date: "",
    vendor_id: "",
    vendor_name: "",
    item_details: "",
    quantity: "",
    rate: "",
    total_amount: "",
    payment_status: "unpaid",
    bill_number: "",
  });

  useEffect(() => {
    fetchVendors();
    fetchPurchase();
  }, [purchaseId]);

  useEffect(() => {
    if (vendorSearch.trim() === "") {
      setFilteredVendors(vendors);
    } else {
      const filtered = vendors.filter(
        (vendor) =>
          vendor.first_name
            .toLowerCase()
            .includes(vendorSearch.toLowerCase()) ||
          vendor.last_name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
          vendor.company_name
            ?.toLowerCase()
            .includes(vendorSearch.toLowerCase()),
      );
      setFilteredVendors(filtered);
    }
  }, [vendorSearch, vendors]);

  const fetchVendors = async () => {
    const { data } = await supabase
      .from("vendors")
      .select("id, first_name, last_name, company_name")
      .order("created_at", { ascending: false });

    if (data) {
      setVendors(data);
      setFilteredVendors(data);
    }
  };

  const fetchPurchase = async () => {
    setLoading(true);

    const { data, error } = await supabase
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
      .eq("id", purchaseId)
      .single();

    if (error) {
      console.error("Error fetching purchase:", error);
      setError("Purchase not found");
    } else if (data) {
      // Determine entry type based on quantity/rate
      const hasDetailed = data.quantity && data.rate;
      setEntryType(hasDetailed ? "detailed" : "total");

      // Parse bill number from item_details if present
      let billNumber = "";
      let itemDetails = data.item_details || "";
      const billMatch = itemDetails.match(/^Bill #([^\s-]+)/);
      if (billMatch) {
        billNumber = billMatch[1];
        itemDetails = itemDetails.replace(/^Bill #[^\s-]+\s*-?\s*/, "");
      }

      setFormData({
        purchase_date: data.purchase_date || "",
        vendor_id: data.vendor_id || "",
        vendor_name:
          data.vendors?.company_name ||
          `${data.vendors?.first_name} ${data.vendors?.last_name}` ||
          "",
        item_details: itemDetails,
        quantity: data.quantity?.toString() || "",
        rate: data.rate?.toString() || "",
        total_amount: data.total_amount?.toString() || "",
        payment_status: data.payment_status || "unpaid",
        bill_number: billNumber,
      });
    }

    setLoading(false);
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Auto-calculation for detailed entry
    if (entryType === "detailed") {
      if (name === "quantity" || name === "rate") {
        const quantity =
          name === "quantity"
            ? parseFloat(value)
            : parseFloat(formData.quantity);
        const rate =
          name === "rate" ? parseFloat(value) : parseFloat(formData.rate);

        if (quantity && rate) {
          const total = quantity * rate;
          setFormData((prev) => ({
            ...prev,
            total_amount: total.toFixed(2),
          }));
        }
      }
    }
  };

  const handleDateChange = (date: string) => {
    setFormData((prev) => ({ ...prev, purchase_date: date }));
  };

  const handleVendorSelect = (vendor: Vendor) => {
    setFormData((prev) => ({
      ...prev,
      vendor_id: vendor.id,
      vendor_name:
        vendor.company_name || `${vendor.first_name} ${vendor.last_name}`,
    }));
    setShowVendorDropdown(false);
    setVendorSearch("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      let itemDetails = formData.item_details;

      if (entryType === "total") {
        itemDetails = `Bill #${formData.bill_number ? formData.bill_number + " - " : ""}${formData.item_details}`;
      }

      const purchaseData = {
        purchase_date: formData.purchase_date,
        vendor_id: formData.vendor_id,
        item_details: itemDetails,
        quantity:
          entryType === "detailed"
            ? parseFloat(formData.quantity) || null
            : null,
        rate:
          entryType === "detailed" ? parseFloat(formData.rate) || null : null,
        total_amount: parseFloat(formData.total_amount) || 0,
        payment_status: formData.payment_status,
      };

      const { error: updateError } = await supabase
        .from("purchases")
        .update(purchaseData)
        .eq("id", purchaseId);

      if (updateError) throw updateError;

      router.push("/purchases");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("purchases")
        .delete()
        .eq("id", purchaseId);

      if (error) throw error;

      router.push("/purchases");
    } catch (err: any) {
      setError(err.message);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B00]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/purchases">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Edit Purchase</h1>
        </div>
        {userRole === "owner" && (
          <Button
            variant="outline"
            className="text-red-500 border-red-200 hover:bg-red-50"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* Entry Type Toggle */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <button
                type="button"
                onClick={() => setEntryType("total")}
                className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  entryType === "total"
                    ? "bg-[#FF6B00] text-white shadow"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>Total Bill</span>
              </button>
              <button
                type="button"
                onClick={() => setEntryType("detailed")}
                className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  entryType === "detailed"
                    ? "bg-[#FF6B00] text-white shadow"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                <Calculator className="h-4 w-4" />
                <span>Item Details</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="purchase_date">Purchase Date *</Label>
                <DatePicker
                  value={formData.purchase_date}
                  onChange={handleDateChange}
                  placeholder="DD/MM/YYYY"
                />
              </div>

              {/* Vendor Selection */}
              <div className="space-y-2 relative">
                <Label htmlFor="vendor">Vendor *</Label>
                <div className="relative">
                  <Input
                    id="vendor"
                    value={formData.vendor_name}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        vendor_name: e.target.value,
                      }));
                      setVendorSearch(e.target.value);
                      setShowVendorDropdown(true);
                    }}
                    onFocus={() => setShowVendorDropdown(true)}
                    placeholder="Search and select vendor..."
                    required
                  />
                  {showVendorDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {filteredVendors.length === 0 ? (
                        <div className="p-3 text-sm text-gray-500 text-center">
                          No vendors found
                        </div>
                      ) : (
                        filteredVendors.map((vendor) => (
                          <button
                            key={vendor.id}
                            type="button"
                            onClick={() => handleVendorSelect(vendor)}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <span className="font-medium">
                              {vendor.company_name ||
                                `${vendor.first_name} ${vendor.last_name}`}
                            </span>
                            {vendor.company_name && (
                              <span className="text-sm text-gray-500 ml-2">
                                ({vendor.first_name} {vendor.last_name})
                              </span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {entryType === "total" ? (
                <>
                  {/* Total Bill Entry */}
                  <div className="space-y-2">
                    <Label htmlFor="bill_number">Bill Number (Optional)</Label>
                    <Input
                      id="bill_number"
                      name="bill_number"
                      value={formData.bill_number}
                      onChange={handleInputChange}
                      placeholder="Enter bill/invoice number"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="item_details">Bill Details *</Label>
                    <textarea
                      id="item_details"
                      name="item_details"
                      value={formData.item_details}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                      placeholder="Enter bill details..."
                      required
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="total_amount">
                      Total Bill Amount (PKR) *
                    </Label>
                    <Input
                      id="total_amount"
                      name="total_amount"
                      type="number"
                      step="0.01"
                      value={formData.total_amount}
                      onChange={handleInputChange}
                      placeholder="0"
                      required
                      className="text-lg font-bold"
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Detailed Entry */}
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="item_details">Item Details *</Label>
                    <textarea
                      id="item_details"
                      name="item_details"
                      value={formData.item_details}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                      placeholder="Enter item description..."
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      name="quantity"
                      type="number"
                      step="0.01"
                      value={formData.quantity}
                      onChange={handleInputChange}
                      placeholder="0"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rate">Rate *</Label>
                    <Input
                      id="rate"
                      name="rate"
                      type="number"
                      step="0.01"
                      value={formData.rate}
                      onChange={handleInputChange}
                      placeholder="0"
                      required
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="total_amount">Total Amount (PKR) *</Label>
                    <Input
                      id="total_amount"
                      name="total_amount"
                      type="number"
                      step="0.01"
                      value={formData.total_amount}
                      onChange={handleInputChange}
                      placeholder="Auto-calculated or enter manually"
                      className="text-lg font-bold"
                      required
                    />
                  </div>
                </>
              )}

              {/* Payment Status */}
              <div className="space-y-2">
                <Label htmlFor="payment_status">Payment Status</Label>
                <select
                  id="payment_status"
                  name="payment_status"
                  value={formData.payment_status}
                  onChange={handleInputChange}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                >
                  <option value="unpaid">Unpaid</option>
                  <option value="partial">Partial Payment</option>
                  <option value="paid">Fully Paid</option>
                </select>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-between space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Link href="/purchases">
                <Button variant="outline" type="button">
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <h3 className="text-lg font-bold">Delete Purchase?</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete this purchase? This action
                cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-red-500 hover:bg-red-600"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
