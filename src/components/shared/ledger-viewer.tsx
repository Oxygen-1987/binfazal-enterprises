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
  paper_qty?: number;
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

// Page layout constants
const PAGE_TOP_PADDING = 60;
const CLIENT_INFO_HEIGHT = 170;
const BOTTOM_PADDING = 45;
const FOOTER_RESERVE = 120;
const ROWS_PER_PAGE = 20;

// Helper: format rate (no trailing decimals for whole numbers)
function formatRate(rate: number | undefined): string {
  if (!rate) return "-";
  const num = Number(rate);
  if (Number.isInteger(num)) return num.toString();
  return num.toFixed(2);
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

    if (balance !== 0 || fromDate) {
      ledgerEntries.push({
        id: "opening",
        date:
          fromDate ||
          clientData?.opening_balance_date ||
          clientData?.created_at,
        type: "opening",
        description: "Opening Balance",
        debit: 0,
        credit: 0,
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
        paper_qty: Number(job.paper_qty) || 0,
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
          payment.payment_method?.replace("_", " ") || "Received"
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

  const pages: LedgerEntry[][] = [];
  if (entries.length === 0) {
    pages.push([]);
  } else {
    let i = 0;
    while (i < entries.length) {
      pages.push(entries.slice(i, i + ROWS_PER_PAGE));
      i += ROWS_PER_PAGE;
    }
  }
  const pageCount = pages.length;

  const getPageCarryForward = (pageIdx: number) => {
    if (pageIdx >= pages.length - 1) return null;
    const lastEntry = pages[pageIdx][pages[pageIdx].length - 1];
    return lastEntry?.balance || 0;
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
        windowWidth: A4_WIDTH_PX,
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

    for (let page = 0; page < pageCount; page++) {
      if (page > 0) pdf.addPage();

      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = A4_WIDTH_PX * 2;
      pageCanvas.height = A4_HEIGHT_PX * 2;
      const ctx = pageCanvas.getContext("2d");

      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        const sy = page * A4_HEIGHT_PX * 2;
        ctx.drawImage(
          canvas,
          0,
          sy,
          A4_WIDTH_PX * 2,
          A4_HEIGHT_PX * 2,
          0,
          0,
          pageCanvas.width,
          pageCanvas.height,
        );
      }

      const pageImgData = pageCanvas.toDataURL("image/jpeg", 0.95);
      pdf.addImage(pageImgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
    }

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
      alert(getSaveLocationMessage());
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
      alert(getSaveLocationMessage());
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

  // html2canvas ignores vertical-align/height on table cells and draws text a
  // few px low, so we position text with explicit padding (bottom > top).
  // To lift header text: raise HEADER_PAD_BOTTOM and lower HEADER_PAD_TOP by the
  // same amount (keep the sum constant so the row height doesn't change).
  const HEADER_PAD_TOP = 4;
  const HEADER_PAD_BOTTOM = 10;
  const ROW_PAD_TOP = 4;
  const ROW_PAD_BOTTOM = 9;

  const pdfHeaderBase: React.CSSProperties = {
    backgroundColor: "#1e3a8a",
    color: "#fff",
    textAlign: "center",
    verticalAlign: "top",
    padding: `${HEADER_PAD_TOP}px 6px ${HEADER_PAD_BOTTOM}px 6px`,
    fontWeight: 700,
    fontSize: "10.5px",
    letterSpacing: "0.4px",
    textTransform: "uppercase",
    lineHeight: "12px",
    borderRight: "1px solid rgba(255,255,255,0.18)",
  };

  const cellBase: React.CSSProperties = {
    padding: `${ROW_PAD_TOP}px 8px ${ROW_PAD_BOTTOM}px 8px`,
    verticalAlign: "top",
    lineHeight: "13px",
    fontSize: "12px",
    borderBottom: "1px solid #e5e7eb",
    borderRight: "1px solid #f1f2f4",
  };
  const numCell: React.CSSProperties = {
    ...cellBase,
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
  };

  const totalDebit = entries
    .filter((e) => e.type === "job")
    .reduce((s, e) => s + e.debit, 0);
  const totalCredit = entries
    .filter((e) => e.type === "payment")
    .reduce((s, e) => s + e.credit, 0);

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
                entries.find((e) => e.type === "opening")?.balance || 0,
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Debit (Jobs)</p>
            <p className="text-xl font-bold text-red-600">
              {formatCurrency(totalDebit)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Credit (Payments)</p>
            <p className="text-xl font-bold text-green-600">
              {formatCurrency(totalCredit)}
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

      {/* Screen View — simple table, unchanged */}
      <Card>
        <CardContent className="p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left py-2 px-2">Date</th>
                <th className="text-left py-2 px-2">Description</th>
                <th className="text-right py-2 px-2">Paper Qty</th>
                <th className="text-right py-2 px-2">Print Qty</th>
                <th className="text-right py-2 px-2">Rate</th>
                <th className="text-right py-2 px-2">Debit</th>
                <th className="text-right py-2 px-2">Credit</th>
                <th className="text-right py-2 px-2">Balance</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const isPayment = entry.type === "payment";
                const isOpening = entry.type === "opening";
                return (
                  <tr
                    key={entry.id}
                    className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 ${
                      isOpening ? "bg-blue-50/50 dark:bg-blue-900/10" : ""
                    }`}
                  >
                    <td className="py-2 px-2 whitespace-nowrap">
                      {formatDate(entry.date)}
                    </td>
                    <td
                      className={`py-2 px-2 ${
                        isPayment ? "text-green-600" : ""
                      }`}
                    >
                      {entry.description}
                    </td>
                    <td className="text-right py-2 px-2">
                      {entry.paper_qty ? entry.paper_qty.toLocaleString() : "-"}
                    </td>
                    <td className="text-right py-2 px-2">
                      {entry.print_qty ? entry.print_qty.toLocaleString() : "-"}
                    </td>
                    <td className="text-right py-2 px-2">
                      {formatRate(entry.rate)}
                    </td>
                    <td className="text-right py-2 px-2 text-red-600">
                      {entry.debit > 0 ? formatCurrency(entry.debit) : "-"}
                    </td>
                    <td className="text-right py-2 px-2 text-green-600">
                      {entry.credit > 0 ? formatCurrency(entry.credit) : "-"}
                    </td>
                    <td
                      className={`text-right py-2 px-2 font-medium ${
                        entry.balance < 0 ? "text-green-600" : ""
                      }`}
                    >
                      {formatCurrency(entry.balance)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Hidden A4 Template — PDF/JPG */}
      {hasTemplate && (
        <div
          ref={ledgerRef}
          style={{
            display: "none",
            width: `${A4_WIDTH_PX}px`,
          }}
        >
          {pages.map((pageEntries, pageIndex) => (
            <div
              key={pageIndex}
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
                  padding: `${PAGE_TOP_PADDING}px 45px ${BOTTOM_PADDING}px 45px`,
                  width: "100%",
                  height: "100%",
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    marginTop: `${CLIENT_INFO_HEIGHT}px`,
                    marginBottom: "10px",
                    fontSize: "12px",
                    color: "#000",
                  }}
                >
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <div style={{ width: "60%" }}>
                      <p
                        style={{
                          margin: "3px 0",
                          fontWeight: "bold",
                          fontSize: "13px",
                        }}
                      >
                        Client:{" "}
                        {client?.company_name ||
                          `${client?.first_name} ${client?.last_name}`}
                      </p>
                      <p
                        style={{
                          margin: "3px 0",
                          fontSize: "12px",
                          color: "#333",
                        }}
                      >
                        Period:{" "}
                        {statementPeriod.from
                          ? `${formatDate(
                              statementPeriod.from,
                            )} to ${formatDate(statementPeriod.to)}`
                          : "-"}
                      </p>
                      {pageIndex > 0 && (
                        <p
                          style={{
                            margin: "3px 0",
                            fontStyle: "italic",
                            color: "#666",
                            fontSize: "10px",
                          }}
                        >
                          (Continued from previous page)
                        </p>
                      )}
                    </div>
                    <div style={{ width: "40%", textAlign: "right" }}>
                      <p
                        style={{
                          margin: "3px 0",
                          fontSize: "12px",
                          color: "#555",
                        }}
                      >
                        Generated: {formatDate(new Date())}{" "}
                        {new Date().toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <p
                        style={{
                          margin: "3px 0",
                          fontSize: "12px",
                          color: "#555",
                        }}
                      >
                        Page: {pageIndex + 1} of {pageCount}
                      </p>
                    </div>
                  </div>
                </div>

                {/* PDF Table */}
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "separate",
                    borderSpacing: 0,
                    fontSize: "12px",
                    color: "#111",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    overflow: "hidden",
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ ...pdfHeaderBase, width: "12%" }}>Date</th>
                      <th
                        style={{
                          ...pdfHeaderBase,
                          width: "28%",
                          textAlign: "left",
                        }}
                      >
                        Description
                      </th>
                      <th style={{ ...pdfHeaderBase, width: "9%" }}>
                        Paper Qty
                      </th>
                      <th style={{ ...pdfHeaderBase, width: "9%" }}>
                        Print Qty
                      </th>
                      <th style={{ ...pdfHeaderBase, width: "8%" }}>Rate</th>
                      <th style={{ ...pdfHeaderBase, width: "11%" }}>Debit</th>
                      <th style={{ ...pdfHeaderBase, width: "11%" }}>Credit</th>
                      <th
                        style={{
                          ...pdfHeaderBase,
                          width: "12%",
                          borderRight: "none",
                        }}
                      >
                        Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageEntries.map((entry, idx) => {
                      const isPayment = entry.type === "payment";
                      const isOpening = entry.type === "opening";
                      const rowBg = isOpening
                        ? "#eef2ff"
                        : idx % 2 === 0
                        ? "#ffffff"
                        : "#f8fafc";

                      return (
                        <tr key={entry.id} style={{ backgroundColor: rowBg }}>
                          <td
                            style={{
                              ...cellBase,
                              whiteSpace: "nowrap",
                              textAlign: "center",
                            }}
                          >
                            {formatDate(entry.date)}
                          </td>
                          <td
                            style={{
                              ...cellBase,
                              textAlign: "left",
                              color: isPayment ? "#15803d" : "#111",
                              fontWeight: isPayment || isOpening ? 600 : 400,
                            }}
                          >
                            {entry.description}
                          </td>
                          <td style={numCell}>
                            {entry.paper_qty
                              ? entry.paper_qty.toLocaleString()
                              : "-"}
                          </td>
                          <td style={numCell}>
                            {entry.print_qty
                              ? entry.print_qty.toLocaleString()
                              : "-"}
                          </td>
                          <td style={numCell}>{formatRate(entry.rate)}</td>
                          <td style={numCell}>
                            {entry.debit > 0
                              ? entry.debit.toLocaleString()
                              : "-"}
                          </td>
                          <td style={{ ...numCell, color: "#15803d" }}>
                            {entry.credit > 0
                              ? entry.credit.toLocaleString()
                              : "-"}
                          </td>
                          <td
                            style={{
                              ...numCell,
                              borderRight: "none",
                              fontWeight: 700,
                              color: entry.balance < 0 ? "#15803d" : "#111",
                            }}
                          >
                            {entry.balance.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    {pageIndex < pageCount - 1 ? (
                      <tr style={{ backgroundColor: "#eef2ff" }}>
                        <td
                          colSpan={7}
                          style={{
                            ...cellBase,
                            padding: "6px 8px 12px 8px",
                            lineHeight: "14px",
                            textAlign: "right",
                            fontWeight: 700,
                            color: "#1e3a8a",
                            borderTop: "2px solid #1e3a8a",
                            borderBottom: "none",
                          }}
                        >
                          Balance Carried Forward
                        </td>
                        <td
                          style={{
                            ...numCell,
                            padding: "6px 8px 12px 8px",
                            lineHeight: "14px",
                            fontWeight: 700,
                            color: "#1e3a8a",
                            borderTop: "2px solid #1e3a8a",
                            borderBottom: "none",
                            borderRight: "none",
                          }}
                        >
                          Rs.{" "}
                          {(
                            getPageCarryForward(pageIndex) || 0
                          ).toLocaleString()}
                        </td>
                      </tr>
                    ) : (
                      <>
                        <tr style={{ backgroundColor: "#f1f5f9" }}>
                          <td
                            colSpan={5}
                            style={{
                              ...cellBase,
                              textAlign: "right",
                              fontWeight: 700,
                              borderTop: "2px solid #1e3a8a",
                            }}
                          >
                            Totals
                          </td>
                          <td
                            style={{
                              ...numCell,
                              fontWeight: 700,
                              borderTop: "2px solid #1e3a8a",
                            }}
                          >
                            {totalDebit.toLocaleString()}
                          </td>
                          <td
                            style={{
                              ...numCell,
                              fontWeight: 700,
                              color: "#15803d",
                              borderTop: "2px solid #1e3a8a",
                            }}
                          >
                            {totalCredit.toLocaleString()}
                          </td>
                          <td
                            style={{
                              ...cellBase,
                              borderTop: "2px solid #1e3a8a",
                              borderRight: "none",
                            }}
                          />
                        </tr>
                        <tr style={{ backgroundColor: "#04b0ff52" }}>
                          <td
                            colSpan={8}
                            style={{
                              ...cellBase,
                              padding: "7px 12px 13px 8px",
                              lineHeight: "20px",
                              textAlign: "right",
                              fontSize: "15px",
                              fontWeight: 700,
                              color: "#d10000",
                              whiteSpace: "nowrap",
                              borderBottom: "none",
                              borderRight: "none",
                            }}
                          >
                            <span style={{ letterSpacing: "0.5px" }}>
                              OUTSTANDING BALANCE
                            </span>
                            <span style={{ marginLeft: "18px" }}>
                              Rs. {runningBalance.toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      </>
                    )}
                  </tfoot>
                </table>

                <div
                  style={{
                    marginTop: "20px",
                    textAlign: "center",
                    fontSize: "10px",
                    color: "#666",
                    fontStyle: "italic",
                  }}
                >
                  Computer generated statement - For official use only
                </div>

                <div style={{ height: `${FOOTER_RESERVE}px`, flexShrink: 0 }} />
              </div>
            </div>
          ))}
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
