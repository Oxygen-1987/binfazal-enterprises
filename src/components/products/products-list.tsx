// src/components/products/products-list.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { showToast } from "@/lib/utils/toast";
import { getErrorMessage } from "@/lib/utils/errors";
import { EmptyState } from "@/components/shared/empty-state";
import { ProductForm } from "./product-form";
import {
  Plus,
  Package,
  Pencil,
  Trash2,
  Loader2,
  Layers,
  Palette,
  Hash,
  Percent,
} from "lucide-react";
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
} from "@/components/ui/alert-dialog";

interface ClientProduct {
  id: string;
  client_id: string;
  name: string;
  job_details: string | null;
  paper_qty: number;
  colors_qty: number;
  print_qty: number;
  rate: number;
  notes: string | null;
  created_at: string;
}

interface ProductsListProps {
  clientId: string;
}

export function ProductsList({ clientId }: ProductsListProps) {
  const { userRole } = useAuth();
  const [products, setProducts] = useState<ClientProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [clientId]);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("client_products")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (error) {
      showToast.error("Failed to load products", getErrorMessage(error));
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("client_products")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      showToast.success("Product deleted");
      setProducts(products.filter((p) => p.id !== deleteId));
      setDeleteId(null);
    } catch (err: any) {
      showToast.error("Failed to delete", getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingProduct(null);
    fetchProducts();
  };

  if (showForm || editingProduct) {
    return (
      <ProductForm
        clientId={clientId}
        productId={editingProduct}
        onClose={handleFormClose}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B00]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold">Products / Job Templates</h3>
          <p className="text-sm text-gray-500">
            {products.length} saved{" "}
            {products.length === 1 ? "template" : "templates"}
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          💡 <strong>Tip:</strong> Save frequently used job settings here. When
          creating a new job for this client, you can select a product to
          auto-fill all details.
        </p>
      </div>

      {/* Products List */}
      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Save your first job template to speed up repeat orders for this client."
          actionLabel="Add Product"
          onAction={() => setShowForm(true)}
        />
      ) : (
        <div className="space-y-3">
          {products.map((product) => (
            <Card
              key={product.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-orange-50 dark:bg-orange-900/20 p-1.5 rounded">
                        <Package className="h-4 w-4 text-[#FF6B00]" />
                      </div>
                      <h4 className="font-semibold truncate">{product.name}</h4>
                    </div>

                    {product.job_details && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                        {product.job_details}
                      </p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <div className="flex items-center gap-1 text-gray-500">
                        <Layers className="h-3 w-3" />
                        <span>Paper: {product.paper_qty || 0}</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-500">
                        <Palette className="h-3 w-3" />
                        <span>Colors: {product.colors_qty}</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-500">
                        <Hash className="h-3 w-3" />
                        <span>
                          Qty: {Number(product.print_qty).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-500">
                        <Percent className="h-3 w-3" />
                        <span>Rate: {Number(product.rate).toFixed(4)}</span>
                      </div>
                    </div>

                    {product.print_qty > 0 && product.rate > 0 && (
                      <p className="text-sm font-semibold text-[#FF6B00] mt-2">
                        Est. Total:{" "}
                        {formatCurrency(product.print_qty * product.rate)}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingProduct(product.id)}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {userRole === "owner" || userRole === "employee" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500"
                        onClick={() => setDeleteId(product.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the job template. Past jobs created from this
              product are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
