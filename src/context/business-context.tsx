// src/context/business-context.tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

interface BusinessInfo {
  id: string;
  business_name: string;
  owner_name: string | null;
  mobile_number: string | null;
  address: string | null;
  email: string | null;
  ledger_template_url: string | null;
  business_logo_url: string | null;
}

interface BusinessContextType {
  businessInfo: BusinessInfo | null;
  loading: boolean;
  refreshBusinessInfo: () => Promise<void>;
}

const BusinessContext = createContext<BusinessContextType>({
  businessInfo: null,
  loading: true,
  refreshBusinessInfo: async () => {},
});

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBusinessInfo = async () => {
    try {
      const { data } = await supabase.from("settings").select("*").single();

      if (data) {
        setBusinessInfo(data);
      }
    } catch (error) {
      console.error("Error fetching business info:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinessInfo();
  }, []);

  return (
    <BusinessContext.Provider
      value={{
        businessInfo,
        loading,
        refreshBusinessInfo: fetchBusinessInfo,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export const useBusiness = () => useContext(BusinessContext);
