"use client";

import { useMemo } from "react";
import { useNetwork } from "@/shared/hooks/useNetwork";
import { getTibetApiUrl } from "@/shared/lib/utils/networkUtils";
import { createTibetApiClient } from "../api/tibetApi";

const TIBET_KEY = "tibet";

export { TIBET_KEY };

export function useTibetApi() {
  const { network } = useNetwork();
  const baseUrl = getTibetApiUrl(network);
  return useMemo(() => createTibetApiClient({ baseUrl }), [baseUrl]);
}
