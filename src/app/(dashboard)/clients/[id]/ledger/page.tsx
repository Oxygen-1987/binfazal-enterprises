// src/app/(dashboard)/clients/[id]/ledger/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, FileImage, Loader2 } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils/format";

interface LedgerEntry {
  id: string;
  date: string;
  type: "job" | "payment" | "opening";
  description: string;
  print_qty?: number;
  rate?: number;
  debit: number;
  credit: number;
  balance: number;
}

interface BusinessInfo {
  business_name: string;
  owner_name: string;
  mobile_number: string;
  address: string;
  email: string;
  ledger_template_url: string;
}

const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

export default function ClientLedgerPage() {
  const params = useParams();
  const clientId = params.id as string;
  const { userRole } = useAuth();

  const [client, setClient] = useState<any>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningBalance, setRunningBalance] = useState(0);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadingPng, setDownloadingPng] = useState(false);
  const [statementPeriod, setStatementPeriod] = useState({ from: "", to: "" });
  const ledgerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchLedger();
    fetchBusinessInfo();
  }, [clientId]);

  const fetchBusinessInfo = async () => {
    const { data } = await supabase.from("settings").select("*").single();

    if (data) {
      setBusinessInfo(data);
    }
  };

  const fetchLedger = async () => {
    setLoading(true);

    const { data: clientData } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();

    setClient(clientData);

    const { data: jobsData } = await supabase
      .from("print_jobs")
      .select("*")
      .eq("client_id", clientId)
      .order("job_date", { ascending: true });

    const { data: paymentsData } = await supabase
      .from("payments")
      .select("*")
      .eq("client_id", clientId)
      .order("payment_date", { ascending: true });

    const ledgerEntries: LedgerEntry[] = [];
    let balance = Number(clientData?.opening_balance) || 0;

    if (balance > 0) {
      ledgerEntries.push({
        id: "opening",
        date: clientData?.opening_balance_date || clientData?.created_at,
        type: "opening",
        description: "Opening Balance",
        debit: balance,
        credit: 0,
        balance: balance,
      });
    }

    jobsData?.forEach((job) => {
      balance += Number(job.total_amount);
      ledgerEntries.push({
        id: job.id,
        date: job.job_date,
        type: "job",
        description: job.job_details || "Print Job",
        print_qty: Number(job.print_qty) || 0,
        rate: Number(job.rate) || 0,
        debit: Number(job.total_amount),
        credit: 0,
        balance: balance,
      });
    });

    paymentsData?.forEach((payment) => {
      balance -= Number(payment.amount);
      ledgerEntries.push({
        id: payment.id,
        date: payment.payment_date,
        type: "payment",
        description: `Payment - ${payment.notes || payment.payment_method || "Received"}`,
        debit: 0,
        credit: Number(payment.amount),
        balance: balance,
      });
    });

    ledgerEntries.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    // Calculate statement period
    if (ledgerEntries.length > 0) {
      setStatementPeriod({
        from: ledgerEntries[0].date,
        to: ledgerEntries[ledgerEntries.length - 1].date,
      });
    }

    setEntries(ledgerEntries);
    setRunningBalance(balance);
    setLoading(false);
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const element = ledgerRef.current;
      if (!element) return;

      element.style.display = "block";
      element.style.position = "fixed";
      element.style.left = "-9999px";
      element.style.top = "0";

      await new Promise((resolve) => setTimeout(resolve, 500));

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: A4_WIDTH_PX,
        height: A4_HEIGHT_PX,
        windowWidth: A4_WIDTH_PX,
        windowHeight: A4_HEIGHT_PX,
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgRatio = canvas.width / canvas.height;
      const pdfRatio = pdfWidth / pdfHeight;

      let finalWidth = pdfWidth;
      let finalHeight = pdfHeight;
      let offsetX = 0;
      let offsetY = 0;

      if (imgRatio > pdfRatio) {
        finalHeight = pdfWidth / imgRatio;
        offsetY = (pdfHeight - finalHeight) / 2;
      } else {
        finalWidth = pdfHeight * imgRatio;
        offsetX = (pdfWidth - finalWidth) / 2;
      }

      const imgData = canvas.toDataURL("image/png", 1.0);
      pdf.addImage(imgData, "PNG", offsetX, offsetY, finalWidth, finalHeight);

      const clientName = (
        client?.company_name || `${client?.first_name}_${client?.last_name}`
      ).replace(/[^a-zA-Z0-9]/g, "_");
      const fileName = `Ledger_${clientName}_${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(fileName);

      element.style.display = "none";
      element.style.position = "";
      element.style.left = "";
      element.style.top = "";
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadPNG = async () => {
    setDownloadingPng(true);
    try {
      const html2canvas = (await import("html2canvas")).default;

      const element = ledgerRef.current;
      if (!element) return;

      element.style.display = "block";
      element.style.position = "fixed";
      element.style.left = "-9999px";
      element.style.top = "0";

      await new Promise((resolve) => setTimeout(resolve, 500));

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: A4_WIDTH_PX,
        height: A4_HEIGHT_PX,
        windowWidth: A4_WIDTH_PX,
        windowHeight: A4_HEIGHT_PX,
      });

      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          const clientName = (
            client?.company_name || `${client?.first_name}_${client?.last_name}`
          ).replace(/[^a-zA-Z0-9]/g, "_");
          a.download = `Ledger_${clientName}_${new Date().toISOString().split("T")[0]}.png`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        },
        "image/png",
        1.0,
      );

      element.style.display = "none";
      element.style.position = "";
      element.style.left = "";
      element.style.top = "";
    } catch (error) {
      console.error("Error generating PNG:", error);
      alert("Error generating PNG. Please try again.");
    } finally {
      setDownloadingPng(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B00]" />
      </div>
    );
  }

  const hasTemplate = !!businessInfo?.ledger_template_url;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-4">
          <Link href="/clients">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">
              {client?.company_name ||
                `${client?.first_name} ${client?.last_name}`}
            </h1>
            <p className="text-sm text-gray-500">Client Ledger</p>
          </div>
        </div>
        <div className="flex gap-2">
          {hasTemplate && (
            <>
              <Button
                variant="outline"
                onClick={handleDownloadPNG}
                disabled={downloadingPng}
              >
                {downloadingPng ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileImage className="mr-2 h-4 w-4" />
                )}
                {downloadingPng ? "Generating..." : "JPG"}
              </Button>
              <Button onClick={handleDownloadPDF} disabled={downloading}>
                {downloading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {downloading ? "Generating..." : "PDF"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Opening Balance</p>
            <p className="text-xl font-bold">
              {formatCurrency(client?.opening_balance || 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Jobs</p>
            <p className="text-xl font-bold text-red-600">
              {formatCurrency(
                entries
                  .filter((e) => e.type === "job")
                  .reduce((sum, e) => sum + e.debit, 0),
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Payments</p>
            <p className="text-xl font-bold text-green-600">
              {formatCurrency(
                entries
                  .filter((e) => e.type === "payment")
                  .reduce((sum, e) => sum + e.credit, 0),
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Current Balance */}
      <Card className="bg-gray-50 dark:bg-gray-900">
        <CardContent className="p-4 flex justify-between items-center">
          <span className="font-semibold">Current Balance</span>
          <span
            className={`text-2xl font-bold ${
              runningBalance > 0 ? "text-red-600" : "text-green-600"
            }`}
          >
            {formatCurrency(runningBalance)}
          </span>
        </CardContent>
      </Card>

      {/* Ledger Table (screen view) */}
      <Card>
        <CardContent className="p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left py-2 px-2">Date</th>
                <th className="text-left py-2 px-2">Description</th>
                <th className="text-right py-2 px-2">Qty</th>
                <th className="text-right py-2 px-2">Rate</th>
                <th className="text-right py-2 px-2">Debit</th>
                <th className="text-right py-2 px-2">Credit</th>
                <th className="text-right py-2 px-2">Balance</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <td className="py-2 px-2 whitespace-nowrap">
                    {formatDate(entry.date)}
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center">
                      {entry.type === "job" && (
                        <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                      )}
                      {entry.type === "payment" && (
                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      )}
                      {entry.type === "opening" && (
                        <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      )}
                      {entry.description}
                    </div>
                  </td>
                  <td className="text-right py-2 px-2">
                    {entry.print_qty ? entry.print_qty.toLocaleString() : "-"}
                  </td>
                  <td className="text-right py-2 px-2">
                    {entry.rate ? entry.rate.toFixed(4) : "-"}
                  </td>
                  <td className="text-right py-2 px-2 text-red-600">
                    {entry.debit > 0 ? formatCurrency(entry.debit) : "-"}
                  </td>
                  <td className="text-right py-2 px-2 text-green-600">
                    {entry.credit > 0 ? formatCurrency(entry.credit) : "-"}
                  </td>
                  <td className="text-right py-2 px-2 font-medium">
                    {formatCurrency(entry.balance)}
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    No transactions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Hidden A4 Template Container - Only used for PDF/JPG generation */}
      {hasTemplate && (
        <div
          ref={ledgerRef}
          style={{
            display: "none",
            width: `${A4_WIDTH_PX}px`,
            height: `${A4_HEIGHT_PX}px`,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${A4_WIDTH_PX}px`,
              height: `${A4_HEIGHT_PX}px`,
              padding: "60px 45px 45px 45px",
              backgroundImage: `url(${businessInfo?.ledger_template_url})`,
              backgroundSize: "100% 100%",
              backgroundPosition: "top left",
              backgroundRepeat: "no-repeat",
              backgroundColor: "#ffffff",
              fontFamily: "Arial, sans-serif",
              position: "relative",
              boxSizing: "border-box",
            }}
          >
            {/* Client Info Overlay */}
            <div
              style={{
                marginTop: "170px",
                marginBottom: "15px",
                fontSize: "12px",
                color: "#000",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ width: "55%" }}>
                  <p style={{ margin: "3px 0" }}>
                    <strong>Client:</strong>{" "}
                    {client?.company_name ||
                      `${client?.first_name} ${client?.last_name}`}
                  </p>
                  <p style={{ margin: "3px 0" }}>
                    <strong>Mobile:</strong> {client?.mobile_number || "-"}
                  </p>
                </div>
                <div style={{ width: "45%", textAlign: "right" }}>
                  <p style={{ margin: "3px 0" }}>
                    <strong>Statement Period:</strong>{" "}
                    {statementPeriod.from
                      ? `${formatDate(statementPeriod.from)} to ${formatDate(statementPeriod.to)}`
                      : "-"}
                  </p>
                  <p style={{ margin: "3px 0" }}>
                    <strong>Date:</strong> {formatDate(new Date())}
                  </p>
                </div>
              </div>
            </div>

            {/* Ledger Table Overlay */}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "10px",
                color: "#000",
              }}
            >
              <thead>
                <tr
                  style={{
                    borderTop: "2px solid #000",
                    borderBottom: "2px solid #000",
                  }}
                >
                  <th
                    style={{
                      textAlign: "left",
                      padding: "5px 3px",
                      fontWeight: "bold",
                      width: "13%",
                    }}
                  >
                    Date
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "5px 3px",
                      fontWeight: "bold",
                      width: "32%",
                    }}
                  >
                    Description
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "5px 3px",
                      fontWeight: "bold",
                      width: "10%",
                    }}
                  >
                    Qty
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "5px 3px",
                      fontWeight: "bold",
                      width: "10%",
                    }}
                  >
                    Rate
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "5px 3px",
                      fontWeight: "bold",
                      width: "12%",
                    }}
                  >
                    Debit
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "5px 3px",
                      fontWeight: "bold",
                      width: "11%",
                    }}
                  >
                    Credit
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "5px 3px",
                      fontWeight: "bold",
                      width: "12%",
                    }}
                  >
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} style={{ borderBottom: "1px solid #ccc" }}>
                    <td style={{ padding: "4px 3px", whiteSpace: "nowrap" }}>
                      {formatDate(entry.date)}
                    </td>
                    <td style={{ padding: "4px 3px" }}>{entry.description}</td>
                    <td style={{ textAlign: "right", padding: "4px 3px" }}>
                      {entry.print_qty ? entry.print_qty.toLocaleString() : ""}
                    </td>
                    <td style={{ textAlign: "right", padding: "4px 3px" }}>
                      {entry.rate ? entry.rate.toFixed(4) : ""}
                    </td>
                    <td style={{ textAlign: "right", padding: "4px 3px" }}>
                      {entry.debit > 0 ? formatCurrency(entry.debit) : ""}
                    </td>
                    <td style={{ textAlign: "right", padding: "4px 3px" }}>
                      {entry.credit > 0 ? formatCurrency(entry.credit) : ""}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        padding: "4px 3px",
                        fontWeight: 500,
                      }}
                    >
                      {formatCurrency(entry.balance)}
                    </td>
                  </tr>
                ))}
                {entries.length < 18 &&
                  Array.from({ length: 18 - entries.length }).map((_, i) => (
                    <tr
                      key={`empty-${i}`}
                      style={{ borderBottom: "1px solid #eee" }}
                    >
                      <td style={{ padding: "4px 3px" }}>&nbsp;</td>
                      <td style={{ padding: "4px 3px" }}></td>
                      <td style={{ padding: "4px 3px" }}></td>
                      <td style={{ padding: "4px 3px" }}></td>
                      <td style={{ padding: "4px 3px" }}></td>
                      <td style={{ padding: "4px 3px" }}></td>
                      <td style={{ padding: "4px 3px" }}></td>
                    </tr>
                  ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "2px solid #000", fontWeight: "bold" }}>
                  <td
                    colSpan={6}
                    style={{ padding: "8px 3px", textAlign: "right" }}
                  >
                    Closing Balance:
                  </td>
                  <td style={{ padding: "8px 3px", textAlign: "right" }}>
                    {formatCurrency(runningBalance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Message if no template */}
      {!hasTemplate && (
        <Card className="bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="p-4">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              💡 <strong>Tip:</strong> Upload a ledger template in{" "}
              <Link href="/settings" className="underline font-medium">
                Settings
              </Link>{" "}
              to enable PDF/JPG download with your branded design.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
