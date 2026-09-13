// src/lib/utils/ledger-generator.ts
import { supabase } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export interface LedgerEntry {
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

export interface ClientLedgerData {
  client: any;
  entries: LedgerEntry[];
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  runningBalance: number;
  statementPeriod: { from: string; to: string };
}

export async function generateClientLedger(
  clientId: string,
  fromDate?: string,
  toDate?: string,
): Promise<ClientLedgerData | null> {
  // Fetch client
  const { data: clientData } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .single();

  if (!clientData) return null;

  // Fetch jobs within period (or all if no date range)
  let jobsQuery = supabase
    .from("print_jobs")
    .select("*")
    .eq("client_id", clientId)
    .order("job_date", { ascending: true });

  if (fromDate) jobsQuery = jobsQuery.gte("job_date", fromDate);
  if (toDate) jobsQuery = jobsQuery.lte("job_date", toDate);

  // Fetch payments within period
  let paymentsQuery = supabase
    .from("payments")
    .select("*")
    .eq("client_id", clientId)
    .order("payment_date", { ascending: true });

  if (fromDate) paymentsQuery = paymentsQuery.gte("payment_date", fromDate);
  if (toDate) paymentsQuery = paymentsQuery.lte("payment_date", toDate);

  // Fetch all jobs & payments up to 'fromDate' to calculate opening balance for the period
  let priorJobsQuery = supabase
    .from("print_jobs")
    .select("total_amount")
    .eq("client_id", clientId);

  let priorPaymentsQuery = supabase
    .from("payments")
    .select("amount")
    .eq("client_id", clientId);

  if (fromDate) {
    priorJobsQuery = priorJobsQuery.lt("job_date", fromDate);
    priorPaymentsQuery = priorPaymentsQuery.lt("payment_date", fromDate);
  }

  const [jobsResult, paymentsResult, priorJobsResult, priorPaymentsResult] =
    await Promise.all([
      jobsQuery,
      paymentsQuery,
      priorJobsQuery,
      priorPaymentsQuery,
    ]);

  const jobs = jobsResult.data || [];
  const payments = paymentsResult.data || [];

  // Calculate opening balance for the period
  let openingBalance = Number(clientData.opening_balance) || 0;

  // If we have a date filter, add prior jobs/payments to opening balance
  if (fromDate) {
    const priorJobs = priorJobsResult.data || [];
    const priorPayments = priorPaymentsResult.data || [];

    const priorJobsTotal = priorJobs.reduce(
      (sum, j) => sum + Number(j.total_amount),
      0,
    );
    const priorPaymentsTotal = priorPayments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );

    openingBalance = openingBalance + priorJobsTotal - priorPaymentsTotal;
  }

  // Build entries
  const entries: LedgerEntry[] = [];
  let balance = openingBalance;

  // Add opening balance as first entry
  if (balance !== 0) {
    entries.push({
      id: "opening",
      date:
        fromDate || clientData.opening_balance_date || clientData.created_at,
      type: "opening",
      description: fromDate
        ? "Opening Balance (Period Start)"
        : "Opening Balance",
      debit: balance > 0 ? balance : 0,
      credit: balance < 0 ? Math.abs(balance) : 0,
      balance: balance,
    });
  }

  // Add jobs
  jobs.forEach((job) => {
    balance += Number(job.total_amount);
    entries.push({
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

  // Add payments
  payments.forEach((payment) => {
    balance -= Number(payment.amount);
    entries.push({
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

  // Sort by date
  entries.sort((a, b) => {
    const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateCompare !== 0) return dateCompare;
    // Opening balance should come first
    if (a.type === "opening") return -1;
    if (b.type === "opening") return 1;
    return 0;
  });

  // Calculate totals
  const totalDebit = entries
    .filter((e) => e.type !== "opening")
    .reduce((sum, e) => sum + e.debit, 0);
  const totalCredit = entries
    .filter((e) => e.type !== "opening")
    .reduce((sum, e) => sum + e.credit, 0);

  // Statement period
  const periodFrom = entries.length > 0 ? entries[0].date : fromDate || "";
  const periodTo =
    entries.length > 0 ? entries[entries.length - 1].date : toDate || "";

  return {
    client: clientData,
    entries,
    openingBalance,
    totalDebit,
    totalCredit,
    runningBalance: balance,
    statementPeriod: { from: periodFrom, to: periodTo },
  };
}

export function generateLedgerHTML(
  data: ClientLedgerData,
  businessInfo: any,
  useTemplate: boolean = true,
): string {
  const {
    client,
    entries,
    openingBalance,
    totalDebit,
    totalCredit,
    runningBalance,
    statementPeriod,
  } = data;
  const clientName =
    client.company_name || `${client.first_name} ${client.last_name}`;

  const templateBackground =
    useTemplate && businessInfo?.ledger_template_url
      ? `background-image: url('${businessInfo.ledger_template_url}'); background-size: 100% 100%; background-repeat: no-repeat;`
      : "";

  const marginTop =
    useTemplate && businessInfo?.ledger_template_url ? "170px" : "20px";

  const rows = entries
    .map(
      (entry) => `
    <tr style="border-bottom: 1px solid #ccc;">
      <td style="padding: 5px 4px; white-space: nowrap;">${formatDate(
        entry.date,
      )}</td>
      <td style="padding: 5px 4px;">${entry.description}</td>
      <td style="text-align: right; padding: 5px 4px;">${
        entry.print_qty ? entry.print_qty.toLocaleString() : ""
      }</td>
      <td style="text-align: right; padding: 5px 4px;">${
        entry.rate ? entry.rate.toFixed(4) : ""
      }</td>
      <td style="text-align: right; padding: 5px 4px;">${
        entry.debit > 0 ? formatCurrency(entry.debit) : ""
      }</td>
      <td style="text-align: right; padding: 5px 4px;">${
        entry.credit > 0 ? formatCurrency(entry.credit) : ""
      }</td>
      <td style="text-align: right; padding: 5px 4px; font-weight: 500;">${formatCurrency(
        entry.balance,
      )}</td>
    </tr>
  `,
    )
    .join("");

  const emptyRows =
    entries.length < 18
      ? Array(18 - entries.length)
          .fill(0)
          .map(
            () => `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 5px 4px;">&nbsp;</td>
          <td style="padding: 5px 4px;"></td>
          <td style="padding: 5px 4px;"></td>
          <td style="padding: 5px 4px;"></td>
          <td style="padding: 5px 4px;"></td>
          <td style="padding: 5px 4px;"></td>
          <td style="padding: 5px 4px;"></td>
        </tr>
      `,
          )
          .join("")
      : "";

  return `
    <div style="
      width: 794px;
      height: 1123px;
      padding: 60px 45px 45px 45px;
      ${templateBackground}
      background-color: #ffffff;
      font-family: Arial, sans-serif;
      position: relative;
      box-sizing: border-box;
    ">
      <div style="margin-top: ${marginTop}; margin-bottom: 15px; font-size: 12px; color: #000;">
        <div style="display: flex; justify-content: space-between;">
          <div style="width: 55%;">
            <p style="margin: 3px 0;"><strong>Client:</strong> ${clientName}</p>
            <p style="margin: 3px 0;"><strong>Mobile:</strong> ${
              client.mobile_number || "-"
            }</p>
          </div>
          <div style="width: 45%; text-align: right;">
            <p style="margin: 3px 0;"><strong>Statement Period:</strong> ${
              statementPeriod.from && statementPeriod.to
                ? `${formatDate(statementPeriod.from)} to ${formatDate(
                    statementPeriod.to,
                  )}`
                : "-"
            }</p>
            <p style="margin: 3px 0;"><strong>Date:</strong> ${formatDate(
              new Date(),
            )}</p>
          </div>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 10px; color: #000;">
        <thead>
          <tr style="border-top: 2px solid #000; border-bottom: 2px solid #000;">
            <th style="text-align: left; padding: 5px 3px; font-weight: bold; width: 13%;">Date</th>
            <th style="text-align: left; padding: 5px 3px; font-weight: bold; width: 32%;">Description</th>
            <th style="text-align: right; padding: 5px 3px; font-weight: bold; width: 10%;">Qty</th>
            <th style="text-align: right; padding: 5px 3px; font-weight: bold; width: 10%;">Rate</th>
            <th style="text-align: right; padding: 5px 3px; font-weight: bold; width: 12%;">Debit</th>
            <th style="text-align: right; padding: 5px 3px; font-weight: bold; width: 11%;">Credit</th>
            <th style="text-align: right; padding: 5px 3px; font-weight: bold; width: 12%;">Balance</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          ${emptyRows}
        </tbody>
        <tfoot>
          <tr style="border-top: 2px solid #000; font-weight: bold;">
            <td colspan="6" style="padding: 8px 3px; text-align: right;">Closing Balance:</td>
            <td style="padding: 8px 3px; text-align: right;">${formatCurrency(
              runningBalance,
            )}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
}
