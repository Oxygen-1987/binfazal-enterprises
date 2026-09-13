// src/components/shared/ledger-viewer.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileImage, Loader2, Share2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { shareFile, saveFile, getSaveLocationMessage } from "@/lib/utils/share";

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

interface LedgerViewerProps {
  clientId: string;
  fromDate?: string;
  toDate?: string;
  showDownloadButtons?: boolean;
}

const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

async function imageUrlToBase64(url: string): Promise<string> {
  if (url.startsWith("data:")) return url;

  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Failed to convert image to base64:", error);
    return url;
  }
}

export function LedgerViewer({
  clientId,
  fromDate,
  toDate,
  showDownloadButtons = true,
}: LedgerViewerProps) {
  const [client, setClient] = useState<any>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningBalance, setRunningBalance] = useState(0);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [templateBase64, setTemplateBase64] = useState<string>("");
  const [downloading, setDownloading] = useState(false);
  const [downloadingPng, setDownloadingPng] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [statementPeriod, setStatementPeriod] = useState({ from: "", to: "" });
  const ledgerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchBusinessInfo();
  }, []);

  useEffect(() => {
    if (clientId) {
      fetchLedger();
    }
  }, [clientId, fromDate, toDate]);

  const fetchBusinessInfo = async () => {
    const { data } = await supabase.from("settings").select("*").single();

    if (data) {
      setBusinessInfo(data);

      if (data.ledger_template_url) {
        try {
          const base64 = await imageUrlToBase64(data.ledger_template_url);
          setTemplateBase64(base64);
        } catch (err) {
          console.error("Failed to convert template to base64:", err);
        }
      }
    }
  };

  const fetchLedger = async () => {
    setLoading(true);

    const { data: clientData } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();

    if (!clientData) {
      setLoading(false);
      return;
    }

    setClient(clientData);

    let jobsQuery = supabase
      .from("print_jobs")
      .select("*")
      .eq("client_id", clientId)
      .order("job_date", { ascending: true });

    if (fromDate) jobsQuery = jobsQuery.gte("job_date", fromDate);
    if (toDate) jobsQuery = jobsQuery.lte("job_date", toDate);

    let paymentsQuery = supabase
      .from("payments")
      .select("*")
      .eq("client_id", clientId)
      .order("payment_date", { ascending: true });

    if (fromDate) paymentsQuery = paymentsQuery.gte("payment_date", fromDate);
    if (toDate) paymentsQuery = paymentsQuery.lte("payment_date", toDate);

    const [jobsResult, paymentsResult] = await Promise.all([
      jobsQuery,
      paymentsQuery,
    ]);

    const jobsData = jobsResult.data || [];
    const paymentsData = paymentsResult.data || [];

    let startingBalance = Number(clientData.opening_balance) || 0;

    if (fromDate) {
      const { data: priorJobs } = await supabase
        .from("print_jobs")
        .select("total_amount")
        .eq("client_id", clientId)
        .lt("job_date", fromDate);

      const { data: priorPayments } = await supabase
        .from("payments")
        .select("amount")
        .eq("client_id", clientId)
        .lt("payment_date", fromDate);

      const priorJobsTotal = (priorJobs || []).reduce(
        (sum, j) => sum + Number(j.total_amount),
        0,
      );
      const priorPaymentsTotal = (priorPayments || []).reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );

      startingBalance = startingBalance + priorJobsTotal - priorPaymentsTotal;
    }

    const ledgerEntries: LedgerEntry[] = [];
    let balance = startingBalance;

    if (balance !== 0) {
      ledgerEntries.push({
        id: "opening",
        date:
          fromDate ||
          clientData?.opening_balance_date ||
          clientData?.created_at,
        type: "opening",
        description: fromDate
          ? "Opening Balance (Period Start)"
          : "Opening Balance",
        debit: balance > 0 ? balance : 0,
        credit: balance < 0 ? Math.abs(balance) : 0,
        balance: balance,
      });
    }

    jobsData.forEach((job) => {
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

    paymentsData.forEach((payment) => {
      balance -= Number(payment.amount);
      ledgerEntries.push({
        id: payment.id,
        date: payment.payment_date,
        type: "payment",
        description: `Payment - ${
          payment.notes || payment.payment_method || "Received"
        }`,
        debit: 0,
        credit: Number(payment.amount),
        balance: balance,
      });
    });

    ledgerEntries.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    if (ledgerEntries.length > 0) {
      setStatementPeriod({
        from: ledgerEntries[0].date,
        to: ledgerEntries[ledgerEntries.length - 1].date,
      });
    } else {
      setStatementPeriod({ from: fromDate || "", to: toDate || "" });
    }

    setEntries(ledgerEntries);
    setRunningBalance(balance);
    setLoading(false);
  };

  const generateCanvas = async () => {
    const html2canvas = (await import("html2canvas")).default;

    if (!templateBase64 && !businessInfo?.ledger_template_url) {
      throw new Error("No template available");
    }

    const sourceElement = ledgerRef.current;
    if (!sourceElement) {
      throw new Error("Ledger element not found");
    }

    const tempContainer = document.createElement("div");
    tempContainer.style.position = "fixed";
    tempContainer.style.left = "-10000px";
    tempContainer.style.top = "0";
    tempContainer.style.width = `${A4_WIDTH_PX}px`;
    tempContainer.style.height = `${A4_HEIGHT_PX}px`;
    tempContainer.style.zIndex = "-1";
    tempContainer.style.backgroundColor = "#ffffff";

    tempContainer.innerHTML = sourceElement.innerHTML;
    document.body.appendChild(tempContainer);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    try {
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: A4_WIDTH_PX,
        height: A4_HEIGHT_PX,
        windowWidth: A4_WIDTH_PX,
        windowHeight: A4_HEIGHT_PX,
        imageTimeout: 15000,
      });

      return canvas;
    } finally {
      document.body.removeChild(tempContainer);
    }
  };

  const generatePDFBlob = async (canvas: HTMLCanvasElement): Promise<Blob> => {
    const { jsPDF } = await import("jspdf");

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

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    pdf.addImage(imgData, "JPEG", offsetX, offsetY, finalWidth, finalHeight);

    return pdf.output("blob");
  };

  const getFileName = (ext: string) => {
    const clientName = (
      client?.company_name || `${client?.first_name}_${client?.last_name}`
    ).replace(/[^a-zA-Z0-9]/g, "_");
    const date = new Date().toISOString().split("T")[0];
    return `Ledger_${clientName}_${date}.${ext}`;
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const canvas = await generateCanvas();
      const pdfBlob = await generatePDFBlob(canvas);
      const fileName = getFileName("pdf");
      await saveFile(pdfBlob, fileName, "application/pdf");
    } catch (error: any) {
      console.error("PDF Error:", error);
      alert(`Error: ${error.message || "Failed to generate PDF"}`);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadPNG = async () => {
    setDownloadingPng(true);
    try {
      const canvas = await generateCanvas();
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/png", 1.0);
      });
      if (!blob) throw new Error("Failed to create image");
      const fileName = getFileName("png");
      await saveFile(blob, fileName, "image/png");
    } catch (error: any) {
      console.error("PNG Error:", error);
      alert(`Error: ${error.message || "Failed to generate PNG"}`);
    } finally {
      setDownloadingPng(false);
    }
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const canvas = await generateCanvas();
      const pdfBlob = await generatePDFBlob(canvas);
      const fileName = getFileName("pdf");
      const clientName =
        client?.company_name || `${client?.first_name} ${client?.last_name}`;
      const shareText = `Ledger statement for ${clientName} from ${
        businessInfo?.business_name || "BinFazal Enterprises"
      }`;

      await shareFile(pdfBlob, fileName, "Client Ledger", shareText);
    } catch (error: any) {
      console.error("Share Error:", error);
      alert(`Error: ${error.message || "Failed to share"}`);
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B00]" />
      </div>
    );
  }

  if (!client) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          Client not found
        </CardContent>
      </Card>
    );
  }

  const hasTemplate = !!businessInfo?.ledger_template_url;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">
              {fromDate ? "Opening Balance (Period)" : "Opening Balance"}
            </p>
            <p className="text-xl font-bold">
              {formatCurrency(
                entries.find((e) => e.type === "opening")?.debit || 0,
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Debit (Jobs)</p>
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
            <p className="text-sm text-gray-500">Total Credit (Payments)</p>
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
          <span className="font-semibold">Closing Balance</span>
          <span
            className={`text-2xl font-bold ${
              runningBalance > 0 ? "text-red-600" : "text-green-600"
            }`}
          >
            {formatCurrency(runningBalance)}
          </span>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {showDownloadButtons && hasTemplate && (
        <div className="flex justify-end gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={handleShare}
            disabled={sharing || downloading || downloadingPng}
            className="bg-[#25D366] hover:bg-[#20BA5A] text-white border-0"
          >
            {sharing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Share2 className="mr-2 h-4 w-4" />
            )}
            {sharing ? "Preparing..." : "Share"}
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadPNG}
            disabled={downloadingPng || sharing || downloading}
          >
            {downloadingPng ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileImage className="mr-2 h-4 w-4" />
            )}
            {downloadingPng ? "Generating..." : "JPG"}
          </Button>
          <Button
            onClick={handleDownloadPDF}
            disabled={downloading || sharing || downloadingPng}
          >
            {downloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {downloading ? "Generating..." : "PDF"}
          </Button>
        </div>
      )}

      {/* Ledger Table */}
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

      {/* Hidden A4 Template */}
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
              position: "relative",
              backgroundColor: "#ffffff",
              fontFamily: "Arial, sans-serif",
              boxSizing: "border-box",
            }}
          >
            <img
              src={templateBase64 || businessInfo?.ledger_template_url}
              alt=""
              crossOrigin="anonymous"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: `${A4_WIDTH_PX}px`,
                height: `${A4_HEIGHT_PX}px`,
                objectFit: "fill",
                zIndex: 0,
              }}
            />

            <div
              style={{
                position: "relative",
                zIndex: 1,
                padding: "60px 45px 45px 45px",
                width: "100%",
                height: "100%",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  marginTop: "170px",
                  marginBottom: "15px",
                  fontSize: "12px",
                  color: "#000",
                }}
              >
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
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
                        ? `${formatDate(statementPeriod.from)} to ${formatDate(
                            statementPeriod.to,
                          )}`
                        : "-"}
                    </p>
                    <p style={{ margin: "3px 0" }}>
                      <strong>Date:</strong> {formatDate(new Date())}
                    </p>
                  </div>
                </div>
              </div>

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
                    <tr
                      key={entry.id}
                      style={{ borderBottom: "1px solid #ccc" }}
                    >
                      <td style={{ padding: "4px 3px", whiteSpace: "nowrap" }}>
                        {formatDate(entry.date)}
                      </td>
                      <td style={{ padding: "4px 3px" }}>
                        {entry.description}
                      </td>
                      <td style={{ textAlign: "right", padding: "4px 3px" }}>
                        {entry.print_qty
                          ? entry.print_qty.toLocaleString()
                          : ""}
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
                  <tr
                    style={{ borderTop: "2px solid #000", fontWeight: "bold" }}
                  >
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
        </div>
      )}

      {!hasTemplate && (
        <Card className="bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="p-4">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              💡 <strong>Tip:</strong> Upload a ledger template in Settings to
              enable Share/JPG/PDF.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
