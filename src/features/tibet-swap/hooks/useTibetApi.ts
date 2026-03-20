"use client";

import { useMemo } from "react";
import { useNetwork } from "@/shared/hooks/useNetwork";
import { createTibetApiClient } from "../api/tibetApi";
import { getTibetApiBaseUrl } from "../lib/tibetApiBaseUrl";

const TIBET_KEY = "tibet";

export { TIBET_KEY };

export function useTibetApi() {
  const { network } = useNetwork();
  const baseUrl = getTibetApiBaseUrl(network);
  return useMemo(() => createTibetApiClient({ baseUrl }), [baseUrl]);
}
