// src/app/(dashboard)/purchases/new/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/shared/date-picker";
import {
  ArrowLeft,
  Save,
  PlusCircle,
  X,
  FileText,
  Calculator,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";

interface Vendor {
  id: string;
  first_name: string;
  last_name: string;
  company_name: string;
}

export default function NewPurchasePage() {
  const router = useRouter();
  const { user } = useAuth();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [vendorSearch, setVendorSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [entryType, setEntryType] = useState<"total" | "detailed">("total");

  const [formData, setFormData] = useState({
    purchase_date: new Date().toISOString().split("T")[0],
    vendor_id: "",
    vendor_name: "",
    item_details: "",
    quantity: "",
    rate: "",
    total_amount: "",
    payment_status: "unpaid",
    amount_paid: "",
    bill_number: "",
    notes: "",
  });

  useEffect(() => {
    fetchVendors();
  }, []);

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

  const handleSubmit = async (
    e: React.FormEvent,
    action: "save_new" | "save_close",
  ) => {
    e.preventDefault();
    setLoading(true);
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
        created_by: user?.id,
      };

      const { error: insertError } = await supabase
        .from("purchases")
        .insert(purchaseData);

      if (insertError) throw insertError;

      if (
        formData.payment_status === "partial" &&
        formData.amount_paid &&
        parseFloat(formData.amount_paid) > 0
      ) {
        const { error: paymentError } = await supabase
          .from("vendor_payments")
          .insert({
            vendor_id: formData.vendor_id,
            amount: parseFloat(formData.amount_paid),
            payment_date: formData.purchase_date,
            payment_method: "cash",
            notes: `Payment against purchase: ${itemDetails}`,
            created_by: user?.id,
          });

        if (paymentError) throw paymentError;
      }

      if (action === "save_new") {
        setFormData({
          purchase_date: new Date().toISOString().split("T")[0],
          vendor_id: "",
          vendor_name: "",
          item_details: "",
          quantity: "",
          rate: "",
          total_amount: "",
          payment_status: "unpaid",
          amount_paid: "",
          bill_number: "",
          notes: "",
        });
        window.scrollTo(0, 0);
      } else {
        window.location.href = "/purchases";
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/purchases">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">New Purchase</h1>
      </div>

      <Card>
        <CardContent className="p-6">
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
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
                          No vendors found.{" "}
                          <Link
                            href="/vendors/new"
                            className="text-[#FF6B00] hover:underline"
                          >
                            Add new vendor
                          </Link>
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
                      placeholder="Enter bill details (e.g., Printing material: 5kg ink, 2 rolls cloth, etc.)"
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
                  {/* Detailed Item Entry */}
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
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm appearance-none cursor-pointer"
                >
                  <option value="unpaid">Unpaid</option>
                  <option value="partial">Partial Payment</option>
                  <option value="paid">Fully Paid</option>
                </select>
              </div>

              {/* Amount Paid (if partial) */}
              {formData.payment_status === "partial" && (
                <div className="space-y-2">
                  <Label htmlFor="amount_paid">Amount Paid Now (PKR) *</Label>
                  <Input
                    id="amount_paid"
                    name="amount_paid"
                    type="number"
                    step="0.01"
                    value={formData.amount_paid}
                    onChange={handleInputChange}
                    placeholder="0"
                    required
                  />
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                  placeholder="Any additional notes..."
                />
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
              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  onClick={(e) => handleSubmit(e, "save_new")}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {loading ? "Saving..." : "Save and New"}
                </Button>
                <Button
                  type="button"
                  disabled={loading}
                  onClick={(e) => handleSubmit(e, "save_close")}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? "Saving..." : "Save and Close"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
