// src/app/(dashboard)/clients/[id]/ledger/page.tsx
"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/shared/date-picker";
import { LedgerViewer } from "@/components/shared/ledger-viewer";
import { createPortalLink, buildPortalUrl } from "@/lib/utils/portal";
import { showToast } from "@/lib/utils/toast";
import { getErrorMessage } from "@/lib/utils/errors";
import { formatDate } from "@/lib/utils/format";
import {
  ArrowLeft,
  Calendar,
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Loader2,
} from "lucide-react";
import Link from "next/link";

export default function ClientLedgerPage() {
  const params = useParams();
  const clientId = params.id as string;
  const { user } = useAuth();
  const [clientName, setClientName] = useState("");
  const [ledgerFrom, setLedgerFrom] = useState("");
  const [ledgerTo, setLedgerTo] = useState("");
  const [showDateFilter, setShowDateFilter] = useState(false);

  // Client portal link state
  const [showPortalModal, setShowPortalModal] = useState(false);
  const [portalLink, setPortalLink] = useState<{
    token: string;
    expiresAt: string;
  } | null>(null);
  const [creatingLink, setCreatingLink] = useState(false);

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

  const handleCreatePortalLink = async () => {
    if (!clientId) return;

    setCreatingLink(true);
    try {
      const link = await createPortalLink(clientId, user?.id || "", 7);
      if (link) {
        setPortalLink(link);
        showToast.success("Link created", "Valid for 7 days");
      } else {
        showToast.error("Failed to create link");
      }
    } catch (err) {
      showToast.error("Failed to create link", getErrorMessage(err));
    } finally {
      setCreatingLink(false);
    }
  };

  const handleCopyLink = () => {
    if (!portalLink) return;
    const url = buildPortalUrl(portalLink.token);
    navigator.clipboard.writeText(url);
    showToast.success("Link copied to clipboard");
  };

  const handleShareWhatsApp = () => {
    if (!portalLink || !clientName) return;
    const url = buildPortalUrl(portalLink.token);
    const message = `Dear ${clientName},\n\nHere is your account statement from BinFazal Enterprises:\n${url}\n\nThis link is valid for 7 days.\n\nRegards,\nBinFazal Enterprises`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

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

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPortalModal(true)}>
            <Share2 className="mr-2 h-4 w-4" />
            Send to Client
          </Button>
          <Button
            variant={showDateFilter || hasDateFilter ? "default" : "outline"}
            onClick={() => setShowDateFilter(!showDateFilter)}
          >
            <Calendar className="mr-2 h-4 w-4" />
            {showDateFilter ? "Hide Date Filter" : "Filter by Date"}
          </Button>
        </div>
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

      {/* Send Statement to Client Modal */}
      {showPortalModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Send statement to client"
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowPortalModal(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-gray-900 rounded-lg shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Send Statement to Client</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowPortalModal(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {!portalLink ? (
              <>
                <p className="text-sm text-gray-500 mb-4">
                  Generate a secure link that lets{" "}
                  <strong>{clientName}</strong> view their ledger online. The
                  link will be valid for 7 days.
                </p>
                <Button
                  className="w-full"
                  onClick={handleCreatePortalLink}
                  disabled={creatingLink}
                >
                  {creatingLink ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Share2 className="mr-2 h-4 w-4" />
                  )}
                  {creatingLink ? "Creating..." : "Generate Secure Link"}
                </Button>
              </>
            ) : (
              <>
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg mb-4">
                  <div className="flex items-center text-sm text-green-700 dark:text-green-300">
                    <Check className="h-4 w-4 mr-2" />
                    Link generated successfully
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4">
                  <p className="text-xs text-gray-500 mb-1">Shareable Link</p>
                  <div className="flex items-start gap-2">
                    <p className="text-xs font-mono break-all flex-1">
                      {buildPortalUrl(portalLink.token)}
                    </p>
                    <a
                      href={buildPortalUrl(portalLink.token)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open portal"
                      className="text-gray-500 hover:text-[#FF6B00] shrink-0"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mb-4">
                  Expires: {formatDate(portalLink.expiresAt)}
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={handleCopyLink}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                  <Button
                    className="bg-[#25D366] hover:bg-[#20BA5A] text-white"
                    onClick={handleShareWhatsApp}
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    WhatsApp
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
