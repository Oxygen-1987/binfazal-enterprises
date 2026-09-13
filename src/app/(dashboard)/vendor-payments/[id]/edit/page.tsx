// src/app/(dashboard)/vendor-payments/[id]/edit/page.tsx
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
import { ArrowLeft, Save, X, Trash2, ChevronDown } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils/format";

interface Vendor {
  id: string;
  first_name: string;
  last_name: string;
  company_name: string;
  account_balance?: number;
}

export default function EditVendorPaymentPage() {
  const router = useRouter();
  const params = useParams();
  const { userRole } = useAuth();
  const paymentId = params.id as string;

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [vendorSearch, setVendorSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [originalAmount, setOriginalAmount] = useState(0);

  const [formData, setFormData] = useState({
    payment_date: "",
    vendor_id: "",
    vendor_name: "",
    amount: "",
    payment_method: "",
    notes: "",
    cheque_number: "",
    cheque_date: "",
    bank_name: "",
    account_number: "",
    account_title: "",
    mobile_number: "",
    transaction_id: "",
  });

  useEffect(() => {
    fetchVendors();
    fetchPayment();
  }, [paymentId]);

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
    const { data: vendorsData } = await supabase
      .from("vendors")
      .select("*")
      .order("created_at", { ascending: false });

    if (vendorsData) {
      const { data: purchasesData } = await supabase
        .from("purchases")
        .select("vendor_id, total_amount");

      const { data: paymentsData } = await supabase
        .from("vendor_payments")
        .select("vendor_id, amount");

      const vendorsWithBalance = vendorsData.map((vendor) => {
        const totalPurchases =
          purchasesData
            ?.filter((purchase) => purchase.vendor_id === vendor.id)
            .reduce(
              (sum, purchase) => sum + Number(purchase.total_amount),
              0,
            ) || 0;

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
    }
  };

  const fetchPayment = async () => {
    setLoading(true);

    const { data, error } = await supabase
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
      .eq("id", paymentId)
      .single();

    if (error) {
      console.error("Error fetching vendor payment:", error);
      setError("Payment not found");
    } else if (data) {
      setOriginalAmount(Number(data.amount));

      // Parse notes for conditional fields
      let cheque_number = "",
        cheque_date = "",
        bank_name = "",
        account_number = "",
        account_title = "",
        mobile_number = "",
        transaction_id = "";
      const notes = data.notes || "";

      const chequeMatch = notes.match(/Cheque No:\s*([^,]+)/);
      const bankMatch = notes.match(/Bank:\s*([^,]+)/);
      const titleMatch = notes.match(/Title:\s*([^,]+)/);
      const chequeDateMatch = notes.match(/Cheque Date:\s*([^,|]+)/);
      const txnMatch = notes.match(/Ref\/Transaction:\s*([^,|]+)/);
      const txnIdMatch = notes.match(/Transaction ID:\s*([^,|]+)/);
      const accMatch = notes.match(/Account:\s*([^,]+)/);
      const mobileMatch = notes.match(/Mobile:\s*([^,]+)/);

      if (chequeMatch) cheque_number = chequeMatch[1].trim();
      if (bankMatch) bank_name = bankMatch[1].trim();
      if (titleMatch) account_title = titleMatch[1].trim();
      if (chequeDateMatch) cheque_date = chequeDateMatch[1].trim();
      if (txnMatch) transaction_id = txnMatch[1].trim();
      if (txnIdMatch) transaction_id = txnIdMatch[1].trim();
      if (accMatch) account_number = accMatch[1].trim();
      if (mobileMatch) mobile_number = mobileMatch[1].trim();

      const cleanNotes = notes
        .replace(/Cheque No:[^|]+/g, "")
        .replace(/Bank:[^|]+/g, "")
        .replace(/Title:[^|]+/g, "")
        .replace(/Cheque Date:[^|]+/g, "")
        .replace(/Ref\/Transaction:[^|]+/g, "")
        .replace(/Transaction ID:[^|]+/g, "")
        .replace(/Account:[^|]+/g, "")
        .replace(/Mobile:[^|]+/g, "")
        .replace(/\s*\|\s*/g, " ")
        .trim();

      setFormData({
        payment_date: data.payment_date || "",
        vendor_id: data.vendor_id || "",
        vendor_name:
          data.vendors?.company_name ||
          `${data.vendors?.first_name} ${data.vendors?.last_name}` ||
          "",
        amount: data.amount?.toString() || "",
        payment_method: data.payment_method || "",
        notes: cleanNotes,
        cheque_number,
        cheque_date,
        bank_name,
        account_number,
        account_title,
        mobile_number,
        transaction_id,
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
  };

  const handleDateChange = (date: string) => {
    setFormData((prev) => ({ ...prev, payment_date: date }));
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

  const handlePaymentMethodChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const method = e.target.value;
    setFormData((prev) => ({
      ...prev,
      payment_method: method,
      cheque_number: "",
      cheque_date: "",
      bank_name: "",
      account_number: "",
      account_title: "",
      mobile_number: "",
      transaction_id: "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      let paymentDetails = "";
      if (formData.payment_method === "cheque") {
        paymentDetails = `Cheque No: ${formData.cheque_number}, Bank: ${formData.bank_name}, Title: ${formData.account_title}, Cheque Date: ${formData.cheque_date}`;
      } else if (formData.payment_method === "bank_transfer") {
        paymentDetails = `Bank: ${formData.bank_name}, Title: ${formData.account_title}, Ref/Transaction: ${formData.transaction_id}`;
      } else if (
        formData.payment_method === "jazzcash" ||
        formData.payment_method === "easypaisa"
      ) {
        paymentDetails = `Title: ${formData.account_title}, Transaction ID: ${formData.transaction_id}`;
      }

      const fullNotes = [formData.notes, paymentDetails]
        .filter(Boolean)
        .join(" | ");

      const paymentData = {
        payment_date: formData.payment_date,
        vendor_id: formData.vendor_id,
        amount: parseFloat(formData.amount) || 0,
        payment_method: formData.payment_method,
        notes: fullNotes || null,
      };

      const { error: updateError } = await supabase
        .from("vendor_payments")
        .update(paymentData)
        .eq("id", paymentId);

      if (updateError) throw updateError;

      router.push("/vendor-payments");
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
        .from("vendor_payments")
        .delete()
        .eq("id", paymentId);

      if (error) throw error;

      router.push("/vendor-payments");
    } catch (err: any) {
      setError(err.message);
      setDeleting(false);
    }
  };

  const selectedVendor = vendors.find((v) => v.id === formData.vendor_id);

  // Calculate what balance would be without this payment's original amount, then with new amount
  const currentBalance = selectedVendor?.account_balance || 0;
  const balanceExcludingOriginal = currentBalance + originalAmount;
  const newBalance = formData.amount
    ? balanceExcludingOriginal - parseFloat(formData.amount)
    : balanceExcludingOriginal;

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
          <Link href="/vendor-payments">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Edit Vendor Payment</h1>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="payment_date">Payment Date *</Label>
                <DatePicker
                  value={formData.payment_date}
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
                            <div className="flex justify-between items-center">
                              <span className="font-medium">
                                {vendor.company_name ||
                                  `${vendor.first_name} ${vendor.last_name}`}
                              </span>
                            </div>
                            {vendor.company_name && (
                              <span className="text-sm text-gray-500">
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

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (PKR) *</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={handleInputChange}
                  placeholder="0"
                  required
                  className="text-lg font-bold"
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label htmlFor="payment_method">Payment Method *</Label>
                <div className="relative">
                  <select
                    id="payment_method"
                    name="payment_method"
                    value={formData.payment_method}
                    onChange={handlePaymentMethodChange}
                    required
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm appearance-none cursor-pointer"
                  >
                    <option value="">Select payment method...</option>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="jazzcash">JazzCash</option>
                    <option value="easypaisa">EasyPaisa</option>
                    <option value="other">Other</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Cheque Fields */}
              {formData.payment_method === "cheque" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="bank_name">Bank Name *</Label>
                    <Input
                      id="bank_name"
                      name="bank_name"
                      value={formData.bank_name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account_title">Account Title *</Label>
                    <Input
                      id="account_title"
                      name="account_title"
                      value={formData.account_title}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cheque_number">Cheque Number *</Label>
                    <Input
                      id="cheque_number"
                      name="cheque_number"
                      value={formData.cheque_number}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cheque_date">Cheque Date *</Label>
                    <DatePicker
                      value={formData.cheque_date}
                      onChange={(date) =>
                        setFormData((prev) => ({ ...prev, cheque_date: date }))
                      }
                      placeholder="DD/MM/YYYY"
                    />
                  </div>
                </>
              )}

              {/* Bank Transfer Fields */}
              {formData.payment_method === "bank_transfer" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="bank_name">Bank Name *</Label>
                    <Input
                      id="bank_name"
                      name="bank_name"
                      value={formData.bank_name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account_title">Account Title *</Label>
                    <Input
                      id="account_title"
                      name="account_title"
                      value={formData.account_title}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transaction_id">
                      Transaction / Ref # *
                    </Label>
                    <Input
                      id="transaction_id"
                      name="transaction_id"
                      value={formData.transaction_id}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </>
              )}

              {/* JazzCash/EasyPaisa Fields */}
              {(formData.payment_method === "jazzcash" ||
                formData.payment_method === "easypaisa") && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="account_title">Account Title *</Label>
                    <Input
                      id="account_title"
                      name="account_title"
                      value={formData.account_title}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transaction_id">Transaction ID *</Label>
                    <Input
                      id="transaction_id"
                      name="transaction_id"
                      value={formData.transaction_id}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </>
              )}

              {/* Notes */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                  placeholder="Enter payment notes (optional)..."
                />
              </div>

              {/* Vendor Balance Display */}
              {selectedVendor && (
                <div className="md:col-span-2 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                      Current Payable:
                    </span>
                    <span
                      className={`font-bold ${
                        currentBalance > 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {formatCurrency(currentBalance)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                      Balance After Edit:
                    </span>
                    <span
                      className={`font-bold ${
                        newBalance > 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {formatCurrency(newBalance)}
                    </span>
                  </div>
                  {originalAmount !== parseFloat(formData.amount || "0") && (
                    <p className="text-xs text-orange-600 dark:text-orange-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                      Note: Editing this payment will adjust the vendor's
                      balance by{" "}
                      {formatCurrency(
                        Math.abs(
                          parseFloat(formData.amount || "0") - originalAmount,
                        ),
                      )}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-between space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Link href="/vendor-payments">
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
                <h3 className="text-lg font-bold">Delete Vendor Payment?</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete this payment? The vendor's
                balance will be increased by {formatCurrency(originalAmount)}.
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
