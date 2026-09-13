// src/app/(dashboard)/settings/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/shared/date-picker";
import {
  Building2,
  Users,
  Save,
  UserPlus,
  FileImage,
  Upload,
  X,
  Check,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  RotateCcw,
  FileSpreadsheet,
  Database,
} from "lucide-react";
import {
  exportToExcel,
  exportToCSV,
  exportMultiSheet,
} from "@/lib/utils/export";

interface UserRecord {
  id: string;
  email: string;
  full_name: string;
  role: "owner" | "employee";
  created_at: string;
  avatar_url?: string | null;
  phone?: string | null;
  designation?: string | null;
  joining_date?: string | null;
  cnic?: string | null;
  address?: string | null;
}

interface BusinessInfo {
  business_name: string;
  owner_name: string;
  mobile_number: string;
  address: string;
  email: string;
  ledger_template_url: string;
}

export default function SettingsPage() {
  const { userProfile, userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    business_name: "BinFazal Enterprises",
    owner_name: "",
    mobile_number: "",
    address: "",
    email: "",
    ledger_template_url: "",
  });
  const [successMessage, setSuccessMessage] = useState("");
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "employee",
    // New employee detail fields
    phone: "",
    designation: "",
    joining_date: "",
    cnic: "",
    address: "",
  });

  const [showFullscreen, setShowFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);

    // Fetch users
    const { data: usersData } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: true });

    if (usersData) {
      setUsers(usersData);
    }

    // Fetch business info
    const { data: settingsData } = await supabase
      .from("settings")
      .select("*")
      .single();

    if (settingsData) {
      setBusinessInfo({
        business_name: settingsData.business_name || "BinFazal Enterprises",
        owner_name: settingsData.owner_name || "",
        mobile_number: settingsData.mobile_number || "",
        address: settingsData.address || "",
        email: settingsData.email || "",
        ledger_template_url: settingsData.ledger_template_url || "",
      });
    }

    setLoading(false);
  };

  const handleBusinessInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBusinessInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveBusinessInfo = async () => {
    setSaving(true);
    setSuccessMessage("");

    try {
      const { data: existingSettings } = await supabase
        .from("settings")
        .select("id")
        .single();

      if (existingSettings) {
        const { error } = await supabase
          .from("settings")
          .update(businessInfo)
          .eq("id", existingSettings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("settings").insert(businessInfo);

        if (error) throw error;
      }

      setSuccessMessage("Business information saved successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes("image")) {
      alert("Please upload an image file (PNG, JPG, etc.)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size should be less than 5MB");
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `ledger-template-${Date.now()}.${fileExt}`;
      const filePath = `templates/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("ledger-templates")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("ledger-templates").getPublicUrl(filePath);

      const updatedInfo = {
        ...businessInfo,
        ledger_template_url: publicUrl,
      };

      setBusinessInfo(updatedInfo);

      const { data: existingSettings } = await supabase
        .from("settings")
        .select("id")
        .single();

      if (existingSettings) {
        await supabase
          .from("settings")
          .update(updatedInfo)
          .eq("id", existingSettings.id);
      } else {
        await supabase.from("settings").insert(updatedInfo);
      }

      setSuccessMessage("Ledger template uploaded successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error: any) {
      console.error("Error uploading template:", error);
      alert("Error uploading template: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveTemplate = async () => {
    if (!confirm("Are you sure you want to remove the ledger template?"))
      return;

    try {
      if (businessInfo.ledger_template_url) {
        const urlParts = businessInfo.ledger_template_url.split("/");
        const fileName = urlParts[urlParts.length - 1];
        const filePath = `templates/${fileName}`;

        await supabase.storage.from("ledger-templates").remove([filePath]);
      }

      const updatedInfo = {
        ...businessInfo,
        ledger_template_url: "",
      };

      const { data: existingSettings } = await supabase
        .from("settings")
        .select("id")
        .single();

      if (existingSettings) {
        await supabase
          .from("settings")
          .update(updatedInfo)
          .eq("id", existingSettings.id);
      }

      setBusinessInfo(updatedInfo);
      setSuccessMessage("Template removed successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error removing template:", error);
      alert("Error removing template");
    }
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleZoomReset = () => {
    setZoomLevel(1);
  };

  const handleDownload = async () => {
    if (!businessInfo.ledger_template_url) return;

    try {
      const response = await fetch(businessInfo.ledger_template_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ledger-template.png";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading template:", error);
      alert("Error downloading template");
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // Insert into users table with all details
        const { error: userError } = await supabase.from("users").insert({
          id: authData.user.id,
          email: newUser.email,
          full_name: newUser.full_name,
          role: newUser.role,
          phone: newUser.role === "employee" ? newUser.phone || null : null,
          designation:
            newUser.role === "employee" ? newUser.designation || null : null,
          joining_date:
            newUser.role === "employee" ? newUser.joining_date || null : null,
          cnic: newUser.role === "employee" ? newUser.cnic || null : null,
          address: newUser.role === "employee" ? newUser.address || null : null,
        });

        if (userError) throw userError;

        fetchSettings();
        setShowAddUser(false);
        setNewUser({
          email: "",
          password: "",
          full_name: "",
          role: "employee",
          phone: "",
          designation: "",
          joining_date: "",
          cnic: "",
          address: "",
        });
      }
    } catch (error: any) {
      console.error("Error adding user:", error);
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === userProfile?.id) {
      alert("You cannot delete your own account!");
      return;
    }

    if (confirm("Are you sure you want to delete this user?")) {
      const { error } = await supabase.from("users").delete().eq("id", userId);

      if (!error) {
        setUsers(users.filter((u) => u.id !== userId));
      }
    }
  };

  // Export handlers
  const handleExportAll = async () => {
    setExporting(true);
    try {
      // Fetch all data
      const [
        clients,
        jobs,
        payments,
        vendors,
        purchases,
        vendorPayments,
        expenses,
      ] = await Promise.all([
        supabase.from("clients").select("*").order("created_at"),
        supabase
          .from("print_jobs")
          .select("*, clients(company_name, first_name, last_name)")
          .order("job_date"),
        supabase
          .from("payments")
          .select("*, clients(company_name, first_name, last_name)")
          .order("payment_date"),
        supabase.from("vendors").select("*").order("created_at"),
        supabase
          .from("purchases")
          .select("*, vendors(company_name, first_name, last_name)")
          .order("purchase_date"),
        supabase
          .from("vendor_payments")
          .select("*, vendors(company_name, first_name, last_name)")
          .order("payment_date"),
        supabase.from("expenses").select("*").order("expense_date"),
      ]);

      // Format data
      const clientsData = (clients.data || []).map((c) => ({
        Name: `${c.first_name} ${c.last_name}`,
        Company: c.company_name || "",
        Mobile: c.mobile_number,
        Address: c.address || "",
        "Opening Balance": c.opening_balance,
        Created: c.created_at,
      }));

      const jobsData = (jobs.data || []).map((j) => ({
        Date: j.job_date,
        Client:
          j.clients?.company_name ||
          `${j.clients?.first_name} ${j.clients?.last_name}`,
        Details: j.job_details,
        "Paper Qty": j.paper_qty,
        Colors: j.colors_qty,
        "Print Qty": j.print_qty,
        Rate: j.rate,
        Total: j.total_amount,
        Status: j.status,
        Payment: j.payment_status,
      }));

      const paymentsData = (payments.data || []).map((p) => ({
        Date: p.payment_date,
        Client:
          p.clients?.company_name ||
          `${p.clients?.first_name} ${p.clients?.last_name}`,
        Amount: p.amount,
        Method: p.payment_method,
        Notes: p.notes || "",
      }));

      const vendorsData = (vendors.data || []).map((v) => ({
        Name: `${v.first_name} ${v.last_name}`,
        Company: v.company_name || "",
        Mobile: v.mobile_number,
        Address: v.address || "",
        "Opening Balance": v.opening_balance,
      }));

      const purchasesData = (purchases.data || []).map((p) => ({
        Date: p.purchase_date,
        Vendor:
          p.vendors?.company_name ||
          `${p.vendors?.first_name} ${p.vendors?.last_name}`,
        Details: p.item_details,
        Quantity: p.quantity,
        Rate: p.rate,
        Total: p.total_amount,
        Status: p.payment_status,
      }));

      const vendorPaymentsData = (vendorPayments.data || []).map((p) => ({
        Date: p.payment_date,
        Vendor:
          p.vendors?.company_name ||
          `${p.vendors?.first_name} ${p.vendors?.last_name}`,
        Amount: p.amount,
        Method: p.payment_method,
        Notes: p.notes || "",
      }));

      const expensesData = (expenses.data || []).map((e) => ({
        Date: e.expense_date,
        Category: e.category,
        Amount: e.amount,
        Description: e.description || "",
      }));

      // Export multi-sheet Excel
      exportMultiSheet(
        [
          { name: "Clients", data: clientsData },
          { name: "Print Jobs", data: jobsData },
          { name: "Client Payments", data: paymentsData },
          { name: "Vendors", data: vendorsData },
          { name: "Purchases", data: purchasesData },
          { name: "Vendor Payments", data: vendorPaymentsData },
          { name: "Expenses", data: expensesData },
        ],
        "BinFazal_Backup",
      );

      setSuccessMessage("Backup exported successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Export error:", error);
      alert("Error exporting data");
    } finally {
      setExporting(false);
    }
  };

  const handleExportClients = async () => {
    const { data } = await supabase
      .from("clients")
      .select("*")
      .order("created_at");
    const formatted = (data || []).map((c) => ({
      Name: `${c.first_name} ${c.last_name}`,
      Company: c.company_name || "",
      Mobile: c.mobile_number,
      Address: c.address || "",
      "Opening Balance": c.opening_balance,
    }));
    exportToExcel(formatted, "Clients", "Clients");
  };

  const handleExportJobs = async () => {
    const { data } = await supabase
      .from("print_jobs")
      .select("*, clients(company_name, first_name, last_name)")
      .order("job_date");
    const formatted = (data || []).map((j) => ({
      Date: j.job_date,
      Client:
        j.clients?.company_name ||
        `${j.clients?.first_name} ${j.clients?.last_name}`,
      Details: j.job_details,
      "Print Qty": j.print_qty,
      Rate: j.rate,
      Total: j.total_amount,
      Status: j.status,
      Payment: j.payment_status,
    }));
    exportToExcel(formatted, "Print_Jobs", "Jobs");
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
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-500">
          Manage your business information and users
        </p>
      </div>

      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-3 rounded-md text-sm flex items-center">
          <Check className="h-4 w-4 mr-2" />
          {successMessage}
        </div>
      )}

      {/* Business Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building2 className="h-5 w-5 mr-2 text-[#FF6B00]" />
            Business Information
          </CardTitle>
          <CardDescription>Your business details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="business_name">Business Name</Label>
              <Input
                id="business_name"
                name="business_name"
                value={businessInfo.business_name}
                onChange={handleBusinessInfoChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner_name">Owner Name</Label>
              <Input
                id="owner_name"
                name="owner_name"
                value={businessInfo.owner_name}
                onChange={handleBusinessInfoChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobile_number">Mobile Number</Label>
              <Input
                id="mobile_number"
                name="mobile_number"
                value={businessInfo.mobile_number}
                onChange={handleBusinessInfoChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={businessInfo.email}
                onChange={handleBusinessInfoChange}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                value={businessInfo.address}
                onChange={handleBusinessInfoChange}
              />
            </div>
          </div>
          <Button onClick={handleSaveBusinessInfo} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Business Info"}
          </Button>
        </CardContent>
      </Card>

      {/* Ledger Template */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileImage className="h-5 w-5 mr-2 text-[#FF6B00]" />
            Client Ledger Template
          </CardTitle>
          <CardDescription>
            Upload a PNG template that will be used as background for client
            ledgers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6">
            {businessInfo.ledger_template_url ? (
              <div className="space-y-4">
                {/* Preview Container with Zoom Controls */}
                <div className="relative">
                  {/* Zoom Controls Toolbar */}
                  <div className="absolute top-2 right-2 z-10 flex items-center space-x-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg shadow-lg p-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleZoomOut}
                      disabled={zoomLevel <= 0.5}
                      title="Zoom Out"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-xs px-2 font-medium min-w-[50px] text-center">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleZoomIn}
                      disabled={zoomLevel >= 3}
                      title="Zoom In"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleZoomReset}
                      title="Reset Zoom"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleDownload}
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setShowFullscreen(true)}
                      title="Fullscreen"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Preview Area */}
                  <div className="w-full h-96 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-auto flex items-center justify-center">
                    <div
                      className="transition-transform duration-200 ease-out"
                      style={{
                        transform: `scale(${zoomLevel})`,
                        transformOrigin: "center center",
                      }}
                    >
                      <img
                        src={businessInfo.ledger_template_url}
                        alt="Ledger Template"
                        className="max-w-full h-auto object-contain"
                        style={{ maxHeight: zoomLevel <= 1 ? "384px" : "none" }}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-center text-gray-500 mt-2">
                    Use zoom controls to preview the template in detail
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center text-sm text-green-600">
                    <Check className="h-4 w-4 mr-1" />
                    Template uploaded successfully
                  </div>
                  <div className="flex space-x-2">
                    <label className="cursor-pointer">
                      <Button variant="outline" size="sm" asChild>
                        <span>
                          <Upload className="mr-2 h-4 w-4" />
                          Change Template
                        </span>
                      </Button>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleTemplateUpload}
                        disabled={uploading}
                      />
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-500 hover:text-red-600"
                      onClick={handleRemoveTemplate}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <ImageIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-2 font-medium">
                  No template uploaded
                </p>
                <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto">
                  Upload a PNG file that will be used as the background for
                  client ledgers. Data will be overlaid on this template when
                  generating ledgers.
                </p>
                <label className="cursor-pointer">
                  <Button asChild disabled={uploading}>
                    <span>
                      <Upload className="mr-2 h-4 w-4" />
                      {uploading ? "Uploading..." : "Upload Template"}
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleTemplateUpload}
                    disabled={uploading}
                  />
                </label>
              </div>
            )}
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <strong>Recommended specs:</strong> A4 size (2480 × 3508 px), PNG
              format, transparent or white background. The system will overlay
              ledger data on this template when generating client statements.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Data Backup & Export */}
      {userRole === "owner" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="h-5 w-5 mr-2 text-[#FF6B00]" />
              Data Backup & Export
            </CardTitle>
            <CardDescription>
              Download your business data as Excel or CSV files
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Full Backup */}
            <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/10 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold flex items-center">
                    <FileSpreadsheet className="h-4 w-4 mr-2 text-[#FF6B00]" />
                    Complete Backup
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    All data in one Excel file with separate sheets for clients,
                    jobs, payments, vendors, purchases, and expenses.
                  </p>
                </div>
              </div>
              <Button
                className="mt-3 w-full"
                onClick={handleExportAll}
                disabled={exporting}
              >
                <Download className="mr-2 h-4 w-4" />
                {exporting ? "Exporting..." : "Download Full Backup (Excel)"}
              </Button>
            </div>

            {/* Individual Exports */}
            <div>
              <h3 className="font-semibold mb-3 text-sm">Individual Exports</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={handleExportClients}
                  className="justify-start"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Clients
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportJobs}
                  className="justify-start"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Print Jobs
                </Button>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                💡 <strong>Tip:</strong> Download a backup regularly and store
                it safely. You can open these files in Excel, Google Sheets, or
                Numbers.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Management */}
      {userRole === "owner" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Users className="h-5 w-5 mr-2 text-[#FF6B00]" />
                User Management
              </span>
              <Button size="sm" onClick={() => setShowAddUser(!showAddUser)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </CardTitle>
            <CardDescription>
              Manage system users and their roles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {showAddUser && (
              <form
                onSubmit={handleAddUser}
                className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg space-y-4"
              >
                <h3 className="font-semibold">Add New User</h3>

                {/* Account Credentials */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase">
                    Account Credentials
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name *</Label>
                      <Input
                        id="full_name"
                        value={newUser.full_name}
                        onChange={(e) =>
                          setNewUser((prev) => ({
                            ...prev,
                            full_name: e.target.value,
                          }))
                        }
                        placeholder="Enter employee's full name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newUser.email}
                        onChange={(e) =>
                          setNewUser((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        placeholder="employee@example.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={newUser.password}
                        onChange={(e) =>
                          setNewUser((prev) => ({
                            ...prev,
                            password: e.target.value,
                          }))
                        }
                        placeholder="Min 6 characters"
                        required
                        minLength={6}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <select
                        id="role"
                        value={newUser.role}
                        onChange={(e) =>
                          setNewUser((prev) => ({
                            ...prev,
                            role: e.target.value,
                          }))
                        }
                        className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                      >
                        <option value="employee">Employee (Machine Man)</option>
                        <option value="owner">Owner</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Employee Details (only if role is employee) */}
                {newUser.role === "employee" && (
                  <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-semibold text-gray-500 uppercase">
                      Employee Details
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={newUser.phone}
                          onChange={(e) =>
                            setNewUser((prev) => ({
                              ...prev,
                              phone: e.target.value,
                            }))
                          }
                          placeholder="0300-1234567"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="designation">Designation</Label>
                        <Input
                          id="designation"
                          value={newUser.designation}
                          onChange={(e) =>
                            setNewUser((prev) => ({
                              ...prev,
                              designation: e.target.value,
                            }))
                          }
                          placeholder="e.g., Machine Operator"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="joining_date">Joining Date</Label>
                        <DatePicker
                          value={newUser.joining_date}
                          onChange={(date: string) =>
                            setNewUser((prev) => ({
                              ...prev,
                              joining_date: date,
                            }))
                          }
                          placeholder="DD/MM/YYYY"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cnic">CNIC</Label>
                        <Input
                          id="cnic"
                          value={newUser.cnic}
                          onChange={(e) =>
                            setNewUser((prev) => ({
                              ...prev,
                              cnic: e.target.value,
                            }))
                          }
                          placeholder="00000-0000000-0"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          value={newUser.address}
                          onChange={(e) =>
                            setNewUser((prev) => ({
                              ...prev,
                              address: e.target.value,
                            }))
                          }
                          placeholder="Enter address"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex space-x-3 pt-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? "Adding..." : "Add User"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddUser(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {users.map((userRecord) => (
                <div
                  key={userRecord.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${
                        userRecord.role === "owner"
                          ? "bg-[#FF6B00]"
                          : "bg-blue-500"
                      }`}
                    >
                      {userRecord.full_name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">
                        {userRecord.full_name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {userRecord.designation
                          ? `${userRecord.designation} • ${userRecord.email}`
                          : userRecord.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 flex-shrink-0">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        userRecord.role === "owner"
                          ? "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                      }`}
                    >
                      {userRecord.role}
                    </span>
                    {userRecord.id !== userProfile?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500"
                        onClick={() => handleDeleteUser(userRecord.id)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fullscreen Preview Modal */}
      {showFullscreen && businessInfo.ledger_template_url && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={() => setShowFullscreen(false)}
        >
          <div className="relative w-full h-full flex items-center justify-center p-4">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
              onClick={() => setShowFullscreen(false)}
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Zoom Controls */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 flex items-center space-x-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg shadow-lg p-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 0.5}
              >
                <ZoomOut className="h-5 w-5" />
              </Button>
              <span className="text-sm px-3 font-medium min-w-[60px] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 3}
              >
                <ZoomIn className="h-5 w-5" />
              </Button>
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1" />
              <Button variant="ghost" size="icon" onClick={handleZoomReset}>
                <RotateCcw className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleDownload}>
                <Download className="h-5 w-5" />
              </Button>
            </div>

            {/* Image */}
            <div
              className="max-w-full max-h-full overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={businessInfo.ledger_template_url}
                alt="Ledger Template Fullscreen"
                className="transition-transform duration-200"
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: "center center",
                }}
              />
            </div>

            {/* File Info */}
            <div className="absolute top-4 left-4 text-white text-sm">
              <p className="font-medium">Ledger Template Preview</p>
              <p className="text-xs text-gray-300">Click outside to close</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
