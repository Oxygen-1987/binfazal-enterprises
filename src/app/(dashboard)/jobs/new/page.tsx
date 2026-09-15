// src/app/(dashboard)/jobs/new/page.tsx
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
import { showToast } from "@/lib/utils/toast";
import { getErrorMessage } from "@/lib/utils/errors";
import {
  ArrowLeft,
  Save,
  X,
  ChevronDown,
  FilePlus,
  CheckCircle,
  FileText,
  Package,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils/format";

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  company_name: string;
}

interface ClientProduct {
  id: string;
  name: string;
  job_details: string | null;
  paper_qty: number;
  colors_qty: number;
  print_qty: number;
  rate: number;
}

export default function NewJobPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Product selection state
  const [products, setProducts] = useState<ClientProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [entryMode, setEntryMode] = useState<"manual" | "product">("manual");
  const [selectedProductId, setSelectedProductId] = useState<string>("");

  // Save as product state
  const [saveAsProduct, setSaveAsProduct] = useState(false);
  const [newProductName, setNewProductName] = useState("");

  const [formData, setFormData] = useState({
    job_date: new Date().toISOString().split("T")[0],
    client_id: "",
    client_name: "",
    job_details: "",
    paper_qty: "",
    colors_qty: "1",
    print_qty: "",
    rate: "",
    total_amount: "",
    status: "new",
    payment_status: "unpaid",
  });

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (clientSearch.trim() === "") {
      setFilteredClients(clients);
    } else {
      const filtered = clients.filter(
        (client) =>
          client.first_name
            .toLowerCase()
            .includes(clientSearch.toLowerCase()) ||
          client.last_name.toLowerCase().includes(clientSearch.toLowerCase()) ||
          client.company_name
            ?.toLowerCase()
            .includes(clientSearch.toLowerCase()),
      );
      setFilteredClients(filtered);
    }
  }, [clientSearch, clients]);

  // Fetch products when client changes
  useEffect(() => {
    if (formData.client_id && entryMode === "product") {
      fetchProducts(formData.client_id);
    } else {
      setProducts([]);
      setSelectedProductId("");
    }
  }, [formData.client_id, entryMode]);

  const fetchClients = async () => {
    const { data } = await supabase
      .from("clients")
      .select("id, first_name, last_name, company_name")
      .order("created_at", { ascending: false });

    if (data) {
      setClients(data);
      setFilteredClients(data);
    }
  };

  const fetchProducts = async (clientId: string) => {
    setLoadingProducts(true);
    const { data, error } = await supabase
      .from("client_products")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching products:", error);
    } else {
      setProducts(data || []);
    }
    setLoadingProducts(false);
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Auto-calculation
    if (name === "print_qty" || name === "rate") {
      const printQty =
        name === "print_qty"
          ? parseFloat(value)
          : parseFloat(formData.print_qty);
      const rate =
        name === "rate" ? parseFloat(value) : parseFloat(formData.rate);

      if (printQty && rate) {
        const total = printQty * rate;
        setFormData((prev) => ({
          ...prev,
          total_amount: total.toFixed(2),
        }));
      }
    }

    if (name === "total_amount") {
      const total = parseFloat(value);
      const printQty = parseFloat(formData.print_qty);

      if (total && printQty) {
        const calculatedRate = total / printQty;
        setFormData((prev) => ({
          ...prev,
          rate: calculatedRate.toFixed(4),
        }));
      }
    }
  };

  const handleDateChange = (date: string) => {
    setFormData((prev) => ({ ...prev, job_date: date }));
  };

  const handleClientSelect = (client: Client) => {
    setFormData((prev) => ({
      ...prev,
      client_id: client.id,
      client_name:
        client.company_name || `${client.first_name} ${client.last_name}`,
    }));
    setShowClientDropdown(false);
    setClientSearch("");
    // Reset product selection when client changes
    setSelectedProductId("");
    setEntryMode("manual");
  };

  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    const product = products.find((p) => p.id === productId);

    if (product) {
      const total = Number(product.print_qty) * Number(product.rate);
      setFormData((prev) => ({
        ...prev,
        job_details: product.job_details || "",
        paper_qty: product.paper_qty?.toString() || "0",
        colors_qty: product.colors_qty?.toString() || "1",
        print_qty: product.print_qty?.toString() || "0",
        rate: product.rate?.toString() || "0",
        total_amount: total.toFixed(2),
      }));
    }
  };

  const handleSubmit = async (
    e: React.FormEvent | React.MouseEvent,
    action: "save_new" | "save_close",
  ) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!formData.client_id) {
        throw new Error("Please select a client");
      }

      const jobData: any = {
        job_date: formData.job_date,
        client_id: formData.client_id,
        job_details: formData.job_details,
        paper_qty: parseFloat(formData.paper_qty) || 0,
        colors_qty: parseInt(formData.colors_qty) || 1,
        print_qty: parseFloat(formData.print_qty) || 0,
        rate: parseFloat(formData.rate) || 0,
        total_amount: parseFloat(formData.total_amount) || 0,
        status: formData.status,
        payment_status: formData.payment_status,
        created_by: user?.id,
      };

      // Link to product if selected
      if (entryMode === "product" && selectedProductId) {
        jobData.product_id = selectedProductId;
      }

      const { error: insertError } = await supabase
        .from("print_jobs")
        .insert(jobData);

      if (insertError) {
        if (
          insertError.code === "23505" ||
          insertError.message?.includes("duplicate")
        ) {
          console.log("Job already saved, ignoring duplicate");
        } else {
          throw insertError;
        }
      }

      // Save as new product if checked
      if (saveAsProduct && newProductName.trim()) {
        const productData = {
          client_id: formData.client_id,
          name: newProductName.trim(),
          job_details: formData.job_details || null,
          paper_qty: parseFloat(formData.paper_qty) || 0,
          colors_qty: parseInt(formData.colors_qty) || 1,
          print_qty: parseFloat(formData.print_qty) || 0,
          rate: parseFloat(formData.rate) || 0,
          created_by: user?.id,
        };

        const { error: productError } = await supabase
          .from("client_products")
          .insert(productData);

        if (productError) {
          console.error("Failed to save product:", productError);
          showToast.warning(
            "Job saved, but product not saved",
            getErrorMessage(productError),
          );
        } else {
          showToast.success("Job and product saved");
        }
      } else {
        showToast.success("Job saved successfully");
      }

      if (action === "save_new") {
        // Reset everything
        setFormData({
          job_date: new Date().toISOString().split("T")[0],
          client_id: "",
          client_name: "",
          job_details: "",
          paper_qty: "",
          colors_qty: "1",
          print_qty: "",
          rate: "",
          total_amount: "",
          status: "new",
          payment_status: "unpaid",
        });
        setEntryMode("manual");
        setSelectedProductId("");
        setSaveAsProduct(false);
        setNewProductName("");
        setProducts([]);
        window.scrollTo(0, 0);
      } else {
        window.location.href = "/jobs";
      }
    } catch (err: any) {
      console.error("Job save error:", err);
      const message = getErrorMessage(err);
      setError(message);
      showToast.error("Failed to save job", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/jobs">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">New Print Job</h1>
      </div>

      <Card>
        <CardContent className="p-6">
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date */}
              <div className="space-y-2">
                <Label>Date *</Label>
                <DatePicker
                  value={formData.job_date}
                  onChange={handleDateChange}
                  placeholder="DD/MM/YYYY"
                />
              </div>

              {/* Client */}
              <div className="space-y-2 relative">
                <Label>Client *</Label>
                <div className="relative">
                  <Input
                    value={formData.client_name}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        client_name: e.target.value,
                      }));
                      setClientSearch(e.target.value);
                      setShowClientDropdown(true);
                    }}
                    onFocus={() => setShowClientDropdown(true)}
                    placeholder="Search and select client..."
                  />
                  {showClientDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {filteredClients.length === 0 ? (
                        <div className="p-3 text-sm text-gray-500 text-center">
                          No clients found.{" "}
                          <Link
                            href="/clients/new"
                            className="text-[#FF6B00] hover:underline"
                          >
                            Add new client
                          </Link>
                        </div>
                      ) : (
                        filteredClients.map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => handleClientSelect(client)}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <span className="font-medium">
                              {client.company_name ||
                                `${client.first_name} ${client.last_name}`}
                            </span>
                            {client.company_name && (
                              <span className="text-sm text-gray-500 ml-2">
                                ({client.first_name} {client.last_name})
                              </span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Entry Mode Toggle (only when client selected) */}
              {formData.client_id && (
                <div className="md:col-span-2">
                  <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setEntryMode("manual");
                        setSelectedProductId("");
                        // Clear auto-filled data
                        setFormData((prev) => ({
                          ...prev,
                          job_details: "",
                          paper_qty: "",
                          colors_qty: "1",
                          print_qty: "",
                          rate: "",
                          total_amount: "",
                        }));
                      }}
                      className={`flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        entryMode === "manual"
                          ? "bg-[#FF6B00] text-white shadow"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                      }`}
                    >
                      <FileText className="h-4 w-4" />
                      <span>Manual Entry</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEntryMode("product")}
                      className={`flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        entryMode === "product"
                          ? "bg-[#FF6B00] text-white shadow"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                      }`}
                    >
                      <Package className="h-4 w-4" />
                      <span>Select Product</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Product Selector (if in product mode) */}
              {formData.client_id && entryMode === "product" && (
                <div className="md:col-span-2 space-y-2">
                  <Label>Select Product / Job Template</Label>
                  {loadingProducts ? (
                    <div className="flex items-center justify-center p-4 border rounded-md">
                      <Loader2 className="h-4 w-4 animate-spin text-[#FF6B00] mr-2" />
                      <span className="text-sm text-gray-500">
                        Loading products...
                      </span>
                    </div>
                  ) : products.length === 0 ? (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        No products saved for this client yet.
                      </p>
                      <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                        You can fill the form manually and save it as a product
                        for next time.
                      </p>
                    </div>
                  ) : (
                    <Select
                      value={selectedProductId}
                      onValueChange={handleProductSelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a saved product..." />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {product.name}
                              </span>
                              <span className="text-xs text-gray-500">
                                {Number(product.print_qty).toLocaleString()} pcs
                                × {Number(product.rate).toFixed(4)} ={" "}
                                {formatCurrency(
                                  product.print_qty * product.rate,
                                )}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {selectedProductId && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      ✓ Auto-filled from product. You can edit any field below.
                    </p>
                  )}
                </div>
              )}

              {/* Job Details */}
              <div className="space-y-2 md:col-span-2">
                <Label>Job Details</Label>
                <textarea
                  name="job_details"
                  value={formData.job_details}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                  placeholder="Enter job description..."
                />
              </div>

              {/* Paper Qty */}
              <div className="space-y-2">
                <Label>Paper Quantity</Label>
                <Input
                  name="paper_qty"
                  type="number"
                  step="0.01"
                  value={formData.paper_qty}
                  onChange={handleInputChange}
                  placeholder="0"
                />
              </div>

              {/* Colors Qty */}
              <div className="space-y-2">
                <Label>Colors Quantity</Label>
                <Input
                  name="colors_qty"
                  type="number"
                  min="1"
                  value={formData.colors_qty}
                  onChange={handleInputChange}
                  placeholder="1"
                />
              </div>

              {/* Print Qty */}
              <div className="space-y-2">
                <Label>Print Quantity *</Label>
                <Input
                  name="print_qty"
                  type="number"
                  step="0.01"
                  value={formData.print_qty}
                  onChange={handleInputChange}
                  placeholder="0"
                  required
                />
              </div>

              {/* Rate */}
              <div className="space-y-2">
                <Label>Rate *</Label>
                <Input
                  name="rate"
                  type="number"
                  step="0.0001"
                  value={formData.rate}
                  onChange={handleInputChange}
                  placeholder="0"
                  required
                />
              </div>

              {/* Total Amount */}
              <div className="space-y-2 md:col-span-2">
                <Label>Total Amount (PKR) *</Label>
                <Input
                  name="total_amount"
                  type="number"
                  step="0.01"
                  value={formData.total_amount}
                  onChange={handleInputChange}
                  placeholder="0"
                  className="text-lg font-bold"
                  required
                />
                <p className="text-xs text-gray-500">
                  Auto-calculates from Qty × Rate, or enter manually to
                  calculate rate
                </p>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>Job Status</Label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                >
                  <option value="new">New</option>
                  <option value="in_process">In Process</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {/* Payment Status */}
              <div className="space-y-2">
                <Label>Payment Status</Label>
                <select
                  name="payment_status"
                  value={formData.payment_status}
                  onChange={handleInputChange}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                >
                  <option value="unpaid">Unpaid</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                </select>
              </div>

              {/* Save as Product (only if not already from a product) */}
              {formData.client_id &&
                entryMode === "manual" &&
                formData.job_details && (
                  <div className="md:col-span-2 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg space-y-3">
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="saveAsProduct"
                        checked={saveAsProduct}
                        onChange={(e) => setSaveAsProduct(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-[#FF6B00] focus:ring-[#FF6B00]"
                      />
                      <div className="flex-1">
                        <label
                          htmlFor="saveAsProduct"
                          className="text-sm font-medium cursor-pointer"
                        >
                          Save these details as a product for this client
                        </label>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                          Next time, you can select this product to auto-fill
                          the form
                        </p>
                      </div>
                    </div>

                    {saveAsProduct && (
                      <div className="space-y-2 pl-7">
                        <Label htmlFor="newProductName">Product Name *</Label>
                        <Input
                          id="newProductName"
                          value={newProductName}
                          onChange={(e) => setNewProductName(e.target.value)}
                          placeholder='e.g., "Weekly Flyer Printing"'
                        />
                      </div>
                    )}
                  </div>
                )}
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-between items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Link href="/jobs">
                <Button variant="outline" type="button">
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" disabled={loading}>
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    {loading ? "Saving..." : "Save"}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    onClick={(e) => handleSubmit(e, "save_new")}
                    className="cursor-pointer"
                  >
                    <FilePlus className="mr-3 h-4 w-4 text-[#FF6B00]" />
                    <div className="flex flex-col">
                      <span className="font-medium">Save and New</span>
                      <span className="text-xs text-gray-500">
                        Save and start another
                      </span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => handleSubmit(e, "save_close")}
                    className="cursor-pointer"
                  >
                    <CheckCircle className="mr-3 h-4 w-4 text-green-600" />
                    <div className="flex flex-col">
                      <span className="font-medium">Save and Close</span>
                      <span className="text-xs text-gray-500">
                        Save and go back to list
                      </span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
