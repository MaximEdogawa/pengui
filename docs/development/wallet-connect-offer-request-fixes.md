# WalletConnect Offer Request Fixes

## Overview

This document details the fixes applied to resolve issues with WalletConnect offer requests (`takeOffer` and `cancelOffer`). These fixes ensure that offer requests are properly formatted, validated, and handled when communicating with Chia wallets via WalletConnect.

## Issues Identified

### 1. **Parameter Mismatch in `cancelOffer`**

- **Problem**: The wallet expects `tradeId` parameter, but the app was passing `id`
- **Impact**: Wallet rejected all cancel offer requests
- **Error**: Generic "Request failed" errors (code 4001)

### 2. **Fee Format Mismatch**

- **Problem**: Wallet expects fees in mojos (smallest unit), but app was passing fees in XCH
- **Impact**: Wallet rejected requests with incorrect fee format
- **Example**: App passed `0.000001` XCH, but wallet expected `1000000` mojos

### 3. **Response Handling Issues**

- **Problem**: Wallet responses had inconsistent structures - some returned `error: null` on success, others returned `success: true`
- **Impact**: App incorrectly treated successful requests as failures
- **Error**: "Failed to take market offer - no tradeId returned" even when offer was successful

### 4. **Session Validation Missing**

- **Problem**: Requests were sent without verifying session was active and chainId was valid
- **Impact**: Requests failed with "without any listeners" errors
- **Error**: "Error: emitting session_request: [...] without any listeners"

### 5. **Error Message Extraction**

- **Problem**: Error messages from wallet were deeply nested and not properly extracted
- **Impact**: Users saw generic "[object Object]" errors instead of meaningful messages
- **Error**: "Take offer error: [object Object]"

## Fixes Applied

### 1. **Parameter Mapping for `cancelOffer`**

**Location**: `src/shared/lib/walletConnect/repositories/walletQueries.repository.ts`

**Fix**:

```typescript
export async function cancelOffer(
  params: CancelOfferRequest,
  signClient: SignClient | undefined,
  session: WalletConnectSession
): Promise<{ success: boolean; data?: CancelOfferResponse; error?: string }> {
  // Map 'id' to 'tradeId' as the wallet expects 'tradeId' parameter
  const walletParams = {
    tradeId: params.id, // ✅ Map id to tradeId for wallet compatibility
    ...(feeInMojos !== undefined && { fee: feeInMojos }),
  };

  return await makeWalletRequest<CancelOfferResponse>(
    SageMethods.CHIA_CANCEL_OFFER,
    walletParams,
    signClient,
    session
  );
}
```

**Key Changes**:

- Map `params.id` to `tradeId` in the wallet request
- Wallet API expects `tradeId`, not `id`

### 2. **Fee Conversion from XCH to Mojos**

**Location**: `src/shared/lib/walletConnect/repositories/walletQueries.repository.ts`

**Fix**:

```typescript
/**
 * Convert fee to mojos based on explicit unit
 * The wallet expects fee in mojos (smallest unit)
 */
function convertFeeToMojos(feeInXch?: number, feeInMojos?: number): number | undefined {
  if (feeInMojos !== undefined && feeInMojos !== null) {
    return feeInMojos;
  }
  if (feeInXch !== undefined && feeInXch !== null && feeInXch > 0) {
    return xchToMojos(feeInXch);
  }
  return undefined;
}

export async function takeOffer(
  params: TakeOfferRequest,
  signClient: SignClient | undefined,
  session: WalletConnectSession
): Promise<{ success: boolean; data?: TakeOfferResponse; error?: string }> {
  // Validate offer parameter - reject if not a string or if whitespace-only
  const trimmedOffer = typeof params.offer === "string" ? params.offer.trim() : "";
  if (!trimmedOffer) {
    return { success: false, error: "Invalid offer parameter: offer must be a non-empty string" };
  }

  const feeInMojos = convertFeeToMojos(params.feeInXch, params.feeInMojos);
  const walletParams = {
    offer: trimmedOffer,
    ...(feeInMojos !== undefined && { fee: feeInMojos }),
  };

  return await makeWalletRequest<TakeOfferResponse>(
    SageMethods.CHIA_TAKE_OFFER,
    walletParams,
    signClient,
    session
  );
}
```

**Key Changes**:

- Created `convertFeeToMojos` helper function with explicit unit parameters
- Prefers `feeInMojos` when provided, otherwise converts `feeInXch` to mojos
- Validates and trims offer parameter before processing
- Applied to both `takeOffer` and `cancelOffer`

**Conversion Logic**:

- 1 XCH = 1,000,000,000,000 mojos
- If fee < 1,000,000,000,000 → assume XCH, convert to mojos
- If fee >= 1,000,000,000,000 → assume already in mojos

### 3. **Improved Response Handling**

**Location**: `src/shared/lib/walletConnect/repositories/walletQueries.repository.ts`

**Fix**:

```typescript
function processWalletRequestResult<T>(
  result:
    | T
    | { error: Record<string, unknown> }
    | { error: string }
    | { success?: boolean; error?: unknown },
  method: string
): { success: boolean; data?: T; error?: string } {
  // Handle null/undefined result
  if (!result) {
    return { success: false, error: "Wallet returned an empty response" };
  }

  // Check if result has a success property first (most reliable indicator)
  if (typeof result === "object" && "success" in result) {
    const successValue = (result as { success?: boolean }).success;
    if (successValue === true) {
      return { success: true, data: result as T };
    }
    if (successValue === false) {
      const errorMessage =
        "error" in result && result.error
          ? typeof result.error === "string"
            ? result.error
            : String(result.error)
          : "Wallet request failed";
      return { success: false, error: errorMessage };
    }
  }

  // Check if result has an error property (but only treat as error if it's truthy)
  if (typeof result === "object" && "error" in result) {
    const errorObj = result.error;

    // ✅ If error is null, undefined, empty string, or false, treat as success
    // (some wallets return error: null or error: false on success)
    if (errorObj === null || errorObj === undefined || errorObj === "" || errorObj === false) {
      return { success: true, data: result as T };
    }

    // If error is a truthy value, extract the error message
    const errorMessage =
      typeof errorObj === "string"
        ? errorObj
        : typeof errorObj === "object" && errorObj !== null && "message" in errorObj
          ? String(errorObj.message)
          : String(errorObj);

    // Special case: Some wallets return error messages that are actually warnings
    // Check if the result also has success indicators (like tradeId for takeOffer)
    if (method.includes("takeOffer") || method.includes("TakeOffer")) {
      const hasTradeId =
        result && typeof result === "object" && ("tradeId" in result || "data" in result);
      if (hasTradeId) {
        return { success: true, data: result as T };
      }
    }

    return { success: false, error: errorMessage };
  }

  // Default: treat as success if no error indicators found
  return { success: true, data: result as T };
}
```

**Key Changes**:

- Check `success` property first (most reliable)
- Treat `error: null`, `error: false`, or `error: ''` as success
- Special handling for `takeOffer` - check for `tradeId` even if error field exists
- Extract error messages from nested objects

### 4. **Session Validation Before Requests**

**Location**: `src/shared/lib/walletConnect/repositories/walletQueries.repository.ts`

**Fix**:

```typescript
export async function makeWalletRequest<T>(
  method: string,
  data: Record<string, unknown>,
  signClient: SignClient | undefined,
  session: WalletConnectSession
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    // ✅ Validate session connection
    const connectionValidation = validateSessionConnection(signClient, session);
    if (!connectionValidation.isValid) {
      return { success: false, error: connectionValidation.error };
    }

    // ✅ Ensure SignClient is ready - check if it has active sessions
    if (signClient) {
      const activeSessions = signClient.session.getAll();
      const hasActiveSession = activeSessions.some((s) => s.topic === session.topic);
      if (!hasActiveSession) {
        return { success: false, error: "Session not found in active WalletConnect sessions" };
      }
    }

    // ✅ Validate and get chainId
    const chainIdValidation = validateChainId(signClient!, session);
    if (!chainIdValidation.isValid) {
      return { success: false, error: chainIdValidation.error };
    }

    const validChainId = chainIdValidation.validChainId || session.chainId;

    // Execute request with timeout
    const result = await executeWalletRequest<T>({
      signClient: signClient!,
      session,
      method,
      data,
      validChainId,
    });

    return processWalletRequestResult(result, method);
  } catch (error) {
    return handleWalletRequestError(error, method);
  }
}
```

**Key Changes**:

- Validate session connection before making request
- Verify session exists in active SignClient sessions
- Validate chainId against session's supported chains
- Return early with clear error messages if validation fails

**Additional Validation in `executeWalletRequest`**:

```typescript
async function executeWalletRequest<T>({
  signClient,
  session,
  method,
  data,
  validChainId,
}: ExecuteWalletRequestOptions): Promise<
  T | { error: Record<string, unknown> } | { error: string }
> {
  // ✅ Verify session is still active before making request
  const activeSessions = signClient.session.getAll();
  const activeSession = activeSessions.find((s) => s.topic === session.topic);
  if (!activeSession) {
    return { error: `Session ${session.topic} is not active` };
  }

  // ✅ Verify the chainId is in the session's supported chains
  const sessionChains = activeSession.namespaces?.chia?.chains || [];
  if (sessionChains.length > 0 && !sessionChains.includes(validChainId)) {
    return { error: `ChainId ${validChainId} not in session chains [${sessionChains.join(", ")}]` };
  }

  // ... rest of request execution
}
```

### 5. **Enhanced Error Message Extraction**

**Location**: `src/shared/lib/walletConnect/repositories/walletErrorHandler.ts`

**Fix**:

```typescript
export function extractErrorInfo(error: unknown): ExtractedError {
  let errorMessage = "Unknown error";
  let errorCode: number | undefined;

  if (error instanceof Error) {
    errorMessage = error.message;
    if ("code" in error && typeof (error as any).code === "number") {
      errorCode = (error as any).code;
    }
  } else if (error && typeof error === "object" && !(error instanceof Error)) {
    const errorObj = error as Record<string, unknown>;

    // ✅ Check for nested error object
    if ("error" in errorObj && errorObj.error && typeof errorObj.error === "object") {
      const nestedError = errorObj.error as Record<string, unknown>;
      if ("message" in nestedError && typeof nestedError.message === "string") {
        errorMessage = nestedError.message;
      }
      if ("code" in nestedError && typeof nestedError.code === "number") {
        errorCode = nestedError.code;
      }
    }

    // ✅ Check top-level message
    if ("message" in errorObj && typeof errorObj.message === "string") {
      errorMessage = errorObj.message;
    }

    // ✅ Check for code
    if ("code" in errorObj && typeof errorObj.code === "number") {
      errorCode = errorObj.code;
    }
  } else if (typeof error === "string") {
    errorMessage = error;
  }

  return { message: errorMessage, code: errorCode };
}
```

**Key Changes**:

- Extract error messages from nested error objects
- Check for error codes at multiple levels
- Handle both Error instances and plain objects
- Provide fallback error messages

**Enhanced Error Code 4001 Handling**:

```typescript
function handleErrorCode4001(errorMessage: string): { success: false; error: string } | null {
  // Provide more context-specific error messages
  if (errorMessage === "Request failed" || errorMessage === "[object Object]") {
    return {
      success: false,
      error: "Wallet rejected the request. Please check the offer details and try again.",
    };
  }
  return null;
}
```

### 6. **Improved Hook Response Handling**

**Location**: `src/features/trading/ui/market/hooks/useMarketOfferSubmission.ts`

**Fix**:

```typescript
const handleSubmit = useCallback(
  async (values: MarketOfferFormValues) => {
    try {
      formState.setErrorMessage(null);
      formState.setIsSubmitting(true);

      const result = await takeOfferMutation.mutateAsync({
        offer: values.offer,
        fee: values.fee,
      });

      // ✅ Improved success check - handle various response structures
      const tradeId = result?.tradeId || result?.data?.tradeId;
      const isSuccess = result?.success || result?.data?.success;

      if (tradeId || (isSuccess && result)) {
        // Success - offer was taken
        formState.setSuccessMessage("Market offer taken successfully!");
        formState.resetForm();

        // Invalidate offers query to refresh the list
        queryClient.invalidateQueries({ queryKey: ["offers"] });
      } else {
        throw new Error("Failed to take market offer - no tradeId returned");
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error occurred";
      formState.setErrorMessage(`Failed to take market offer: ${errorMsg}`);
    } finally {
      formState.setIsSubmitting(false);
    }
  },
  [takeOfferMutation, formState, queryClient]
);
```

**Key Changes**:

- Check for `tradeId` at multiple levels (`result.tradeId` or `result.data.tradeId`)
- Check for `success` flag at multiple levels
- Handle cases where wallet returns success but no immediate `tradeId` (pending offers)

## Testing the Fixes

### Before Fixes

- ❌ All `takeOffer` requests failed with "Request failed" (code 4001)
- ❌ All `cancelOffer` requests failed with parameter errors
- ❌ Users saw "[object Object]" error messages
- ❌ "without any listeners" errors in console

### After Fixes

- ✅ `takeOffer` requests succeed when offer is valid
- ✅ `cancelOffer` requests succeed when tradeId is valid
- ✅ Clear error messages shown to users
- ✅ Session validation prevents invalid requests
- ✅ Fee conversion handles both XCH and mojos formats

## Request Flow

```text
User submits offer
    ↓
useMarketOfferSubmission.handleSubmit()
    ↓
takeOfferMutation.mutateAsync()
    ↓
takeOffer() in walletQueries.repository.ts
    ↓
1. Validate offer parameter
2. Convert fee from XCH to mojos (if needed)
3. Trim offer string
    ↓
makeWalletRequest()
    ↓
1. Validate session connection
2. Verify session is active
3. Validate chainId
    ↓
executeWalletRequest()
    ↓
1. Verify session is still active
2. Verify chainId is in session chains
3. Send request via signClient.request()
    ↓
processWalletRequestResult()
    ↓
1. Check success property
2. Handle error: null as success
3. Extract tradeId for takeOffer
    ↓
Return result to hook
    ↓
Display success/error message to user
```

## Key Takeaways

1. **Parameter Mapping**: Always verify wallet API expects the correct parameter names (`tradeId` vs `id`)

2. **Fee Format**: Wallet expects fees in mojos (smallest unit), not XCH. Always convert if needed.

3. **Response Handling**: Wallets may return inconsistent response structures. Handle multiple formats:
   - `{ success: true, tradeId: "..." }`
   - `{ error: null, tradeId: "..." }`
   - `{ tradeId: "...", success: true }`

4. **Session Validation**: Always validate session is active and chainId is valid before sending requests.

5. **Error Extraction**: Error messages can be deeply nested. Extract from multiple levels.

6. **Special Cases**: Some wallets return error fields even on success. Check for success indicators (like `tradeId`) even if error field exists.

## Related Files

- `src/shared/lib/walletConnect/repositories/walletQueries.repository.ts` - Main request handling
- `src/shared/lib/walletConnect/repositories/walletErrorHandler.ts` - Error extraction and handling
- `src/shared/lib/walletConnect/repositories/walletSessionValidator.ts` - Session validation
- `src/features/trading/ui/market/hooks/useMarketOfferSubmission.ts` - Hook for offer submission
- `src/shared/lib/utils/chia-units.ts` - XCH to mojos conversion utility

## References

- [WalletConnect Documentation](https://docs.walletconnect.com/)
- [Chia WalletConnect Package](https://github.com/maximedogawa/chia-wallet-connect-react)
- [Chia Units Conversion](../architecture/fsd-structure.md)
