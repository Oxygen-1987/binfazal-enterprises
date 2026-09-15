// src/components/products/product-form.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { showToast } from "@/lib/utils/toast";
import { getErrorMessage } from "@/lib/utils/errors";
import { Save, X, Loader2, Package } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";

interface ClientProduct {
  id?: string;
  client_id: string;
  name: string;
  job_details: string;
  paper_qty: string;
  colors_qty: string;
  print_qty: string;
  rate: string;
  notes: string;
}

interface ProductFormProps {
  clientId: string;
  productId?: string | null;
  onClose: () => void;
  onSaved?: (product: any) => void;
}

export function ProductForm({
  clientId,
  productId,
  onClose,
  onSaved,
}: ProductFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!productId);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState<ClientProduct>({
    client_id: clientId,
    name: "",
    job_details: "",
    paper_qty: "",
    colors_qty: "1",
    print_qty: "",
    rate: "",
    notes: "",
  });

  useEffect(() => {
    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  const fetchProduct = async () => {
    setFetching(true);
    const { data, error } = await supabase
      .from("client_products")
      .select("*")
      .eq("id", productId)
      .single();

    if (data) {
      setFormData({
        client_id: data.client_id,
        name: data.name || "",
        job_details: data.job_details || "",
        paper_qty: data.paper_qty?.toString() || "",
        colors_qty: data.colors_qty?.toString() || "1",
        print_qty: data.print_qty?.toString() || "",
        rate: data.rate?.toString() || "",
        notes: data.notes || "",
      });
    }
    setFetching(false);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const total =
    (parseFloat(formData.print_qty) || 0) * (parseFloat(formData.rate) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!formData.name.trim()) {
        throw new Error("Product name is required");
      }

      const productData = {
        client_id: clientId,
        name: formData.name.trim(),
        job_details: formData.job_details.trim() || null,
        paper_qty: parseFloat(formData.paper_qty) || 0,
        colors_qty: parseInt(formData.colors_qty) || 1,
        print_qty: parseFloat(formData.print_qty) || 0,
        rate: parseFloat(formData.rate) || 0,
        notes: formData.notes.trim() || null,
        created_by: user?.id,
      };

      let result;
      if (productId) {
        const { data, error } = await supabase
          .from("client_products")
          .update(productData)
          .eq("id", productId)
          .select()
          .single();
        if (error) throw error;
        result = data;
        showToast.success("Product updated");
      } else {
        const { data, error } = await supabase
          .from("client_products")
          .insert(productData)
          .select()
          .single();
        if (error) throw error;
        result = data;
        showToast.success("Product added");
      }

      onSaved?.(result);
      onClose();
    } catch (err: any) {
      console.error("Product save error:", err);
      setError(getErrorMessage(err));
      showToast.error("Failed to save product", getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B00]" />
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Product Name */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">
                Product Name *{" "}
                <span className="text-gray-500 text-xs">
                  (e.g., "4-Color Box Printing")
                </span>
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter a name to identify this job template"
                required
                autoFocus
              />
            </div>

            {/* Job Details */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="job_details">Job Details</Label>
              <textarea
                id="job_details"
                name="job_details"
                value={formData.job_details}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                placeholder="Description of the printing job (paper type, finishing, etc.)"
              />
            </div>

            {/* Paper Qty */}
            <div className="space-y-2">
              <Label htmlFor="paper_qty">Paper Quantity</Label>
              <Input
                id="paper_qty"
                name="paper_qty"
                type="number"
                step="0.01"
                value={formData.paper_qty}
                onChange={handleChange}
                placeholder="0"
              />
            </div>

            {/* Colors Qty */}
            <div className="space-y-2">
              <Label htmlFor="colors_qty">Colors Quantity</Label>
              <Input
                id="colors_qty"
                name="colors_qty"
                type="number"
                min="1"
                value={formData.colors_qty}
                onChange={handleChange}
                placeholder="1"
              />
            </div>

            {/* Print Qty */}
            <div className="space-y-2">
              <Label htmlFor="print_qty">Print Quantity</Label>
              <Input
                id="print_qty"
                name="print_qty"
                type="number"
                step="0.01"
                value={formData.print_qty}
                onChange={handleChange}
                placeholder="0"
              />
            </div>

            {/* Rate */}
            <div className="space-y-2">
              <Label htmlFor="rate">Rate</Label>
              <Input
                id="rate"
                name="rate"
                type="number"
                step="0.0001"
                value={formData.rate}
                onChange={handleChange}
                placeholder="0"
              />
            </div>

            {/* Total Preview */}
            {total > 0 && (
              <div className="space-y-2 md:col-span-2 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    Estimated Total (Print Qty × Rate)
                  </span>
                  <span className="text-lg font-bold text-[#FF6B00]">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={2}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                placeholder="Any additional notes..."
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-between items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {loading
                ? "Saving..."
                : productId
                ? "Update Product"
                : "Save Product"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
