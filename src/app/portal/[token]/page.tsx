// src/app/portal/[token]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import {
  Building2,
  Phone,
  MapPin,
  Printer,
  AlertCircle,
} from "lucide-react";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { LedgerViewer } from "@/components/shared/ledger-viewer";

interface ClientInfo {
  id: string;
  first_name: string;
  last_name: string;
  company_name: string;
  mobile_number: string;
  address: string;
  opening_balance: number;
  opening_balance_date: string;
}

interface BusinessInfo {
  business_name: string;
  owner_name: string;
  mobile_number: string;
  address: string;
  email: string;
}

export default function ClientPortalPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);

  useEffect(() => {
    loadPortal();
  }, [token]);

  const loadPortal = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Validate token and get client
      const { data: clientData, error: clientError } = await supabase.rpc(
        "get_client_by_portal_token",
        { portal_token: token },
      );

      if (clientError) {
        console.error("Portal error:", clientError);
        setError("Unable to load your statement.");
        return;
      }

      if (!clientData || clientData.length === 0) {
        setError("This link is invalid or has expired.");
        return;
      }

      setClient(clientData[0]);

      // 2. Increment view count
      await supabase.rpc("increment_portal_view", { portal_token: token });

      // 3. Load business info (public setting)
      const { data: settingsData } = await supabase
        .from("settings")
        .select("business_name, owner_name, mobile_number, address, email")
        .single();

      if (settingsData) {
        setBusinessInfo(settingsData);
      }
    } catch (err) {
      console.error("Portal load error:", err);
      setError("Unable to load your statement.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner page label="Loading your statement..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <AlertCircle className="h-10 w-10 text-red-500" />
            </div>
            <h1 className="text-xl font-bold mb-2">Access Unavailable</h1>
            <p className="text-gray-500 mb-6">{error}</p>
            <p className="text-sm text-gray-400">
              Please contact{" "}
              {businessInfo?.business_name || "BinFazal Enterprises"} for a new
              link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!client) return null;

  const clientName =
    client.company_name || `${client.first_name} ${client.last_name}`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-3">
              <div className="bg-[#FF6B00] p-2 rounded-lg">
                <Printer className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">
                  {businessInfo?.business_name || "BinFazal Enterprises"}
                </h1>
                <p className="text-xs text-gray-500">Client Statement Portal</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Client Info Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex items-start space-x-4">
                <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                  <Building2 className="h-6 w-6 text-[#FF6B00]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{clientName}</h2>
                  {client.company_name && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {client.first_name} {client.last_name}
                    </p>
                  )}
                  <div className="mt-3 space-y-1">
                    {client.mobile_number && (
                      <div className="flex items-center text-sm text-gray-500">
                        <Phone className="h-3.5 w-3.5 mr-2" />
                        {client.mobile_number}
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-center text-sm text-gray-500">
                        <MapPin className="h-3.5 w-3.5 mr-2" />
                        {client.address}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ledger Viewer (Read-only) */}
        <LedgerViewer clientId={client.id} showDownloadButtons={true} />

        {/* Footer */}
        <div className="text-center py-8 text-sm text-gray-500">
          <p>
            For queries, contact{" "}
            {businessInfo?.business_name || "BinFazal Enterprises"}
          </p>
          {businessInfo?.mobile_number && (
            <p className="mt-1">
              <a
                href={`tel:${businessInfo.mobile_number}`}
                className="text-[#FF6B00] hover:underline"
              >
                {businessInfo.mobile_number}
              </a>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
