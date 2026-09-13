// src/app/(dashboard)/clients/[id]/ledger/page.tsx
"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/shared/date-picker";
import { LedgerViewer } from "@/components/shared/ledger-viewer";
import { ArrowLeft, Calendar, X } from "lucide-react";
import Link from "next/link";

export default function ClientLedgerPage() {
  const params = useParams();
  const clientId = params.id as string;
  const [clientName, setClientName] = useState("");
  const [ledgerFrom, setLedgerFrom] = useState("");
  const [ledgerTo, setLedgerTo] = useState("");
  const [showDateFilter, setShowDateFilter] = useState(false);

  useEffect(() => {
    const fetchClient = async () => {
      const { data } = await supabase
        .from("clients")
        .select("first_name, last_name, company_name")
        .eq("id", clientId)
        .single();

      if (data) {
        setClientName(
          data.company_name || `${data.first_name} ${data.last_name}`,
        );
      }
    };
    fetchClient();
  }, [clientId]);

  const clearDates = () => {
    setLedgerFrom("");
    setLedgerTo("");
  };

  const hasDateFilter = ledgerFrom || ledgerTo;

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
            <h1 className="text-2xl font-bold">{clientName}</h1>
            <p className="text-sm text-gray-500">Client Ledger</p>
          </div>
        </div>

        <Button
          variant={showDateFilter || hasDateFilter ? "default" : "outline"}
          onClick={() => setShowDateFilter(!showDateFilter)}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {showDateFilter ? "Hide Date Filter" : "Filter by Date"}
        </Button>
      </div>

      {/* Date Range Filter (collapsible) */}
      {showDateFilter && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* From Date */}
              <div className="space-y-2">
                <Label>From Date</Label>
                <DatePicker
                  value={ledgerFrom}
                  onChange={setLedgerFrom}
                  placeholder="DD/MM/YYYY"
                />
              </div>

              {/* To Date */}
              <div className="space-y-2">
                <Label>To Date</Label>
                <DatePicker
                  value={ledgerTo}
                  onChange={setLedgerTo}
                  placeholder="DD/MM/YYYY"
                />
              </div>

              {/* Clear Button */}
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button
                  variant="outline"
                  onClick={clearDates}
                  className="w-full"
                  disabled={!hasDateFilter}
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear Dates
                </Button>
              </div>
            </div>

            {hasDateFilter && (
              <p className="text-xs text-gray-500 mt-3">
                {ledgerFrom && `From ${ledgerFrom}. `}
                {ledgerTo && `To ${ledgerTo}. `}
                Opening balance is calculated based on prior transactions.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ledger Viewer */}
      <LedgerViewer
        clientId={clientId}
        fromDate={ledgerFrom || undefined}
        toDate={ledgerTo || undefined}
      />
    </div>
  );
}
