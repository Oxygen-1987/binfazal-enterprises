// src/app/(dashboard)/clients/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Package, Pencil } from "lucide-react";
import { LedgerViewer } from "@/components/shared/ledger-viewer";
import { ProductsList } from "@/components/products/products-list";

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ledger" | "products">("ledger");

  useEffect(() => {
    fetchClient();
  }, [clientId]);

  const fetchClient = async () => {
    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();

    if (data) {
      setClient(data);
    }
    setLoading(false);
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
      <div className="text-center py-12">
        <p className="text-gray-500">Client not found</p>
        <Link href="/clients">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Clients
          </Button>
        </Link>
      </div>
    );
  }

  const clientName =
    client.company_name || `${client.first_name} ${client.last_name}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center space-x-4">
          <Link href="/clients">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{clientName}</h1>
            <p className="text-sm text-gray-500">
              {client.company_name
                ? `${client.first_name} ${client.last_name} • ${client.mobile_number}`
                : client.mobile_number}
            </p>
          </div>
        </div>

        <Link href={`/clients/${clientId}/edit`}>
          <Button variant="outline">
            <Pencil className="mr-2 h-4 w-4" />
            Edit Client
          </Button>
        </Link>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setActiveTab("ledger")}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center ${
            activeTab === "ledger"
              ? "border-[#FF6B00] text-[#FF6B00]"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          <BookOpen className="h-4 w-4 mr-2" />
          Ledger
        </button>
        <button
          onClick={() => setActiveTab("products")}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center ${
            activeTab === "products"
              ? "border-[#FF6B00] text-[#FF6B00]"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          <Package className="h-4 w-4 mr-2" />
          Products
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "ledger" && <LedgerViewer clientId={clientId} />}
      {activeTab === "products" && <ProductsList clientId={clientId} />}
    </div>
  );
}
