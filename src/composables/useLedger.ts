import { computed, type Ref } from 'vue'
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryReturnType,
} from '@tanstack/vue-query'
import {
  ledgerApi,
  type AiCategory,
  type AiProvider,
  type AiUsageListParams,
  type AiUsageListResponse,
  type CompareData,
  type ExchangeRateResponse,
  type ExchangeRateUpdateRequest,
  type InfraCostsResponse,
  type InfraCostsUpdateRequest,
  type LedgerMonth,
  type LedgerResponse,
  type RevenueListParams,
  type RevenueListResponse,
} from '@/lib/api-ledger'

// -----------------------------------------------------------------------------
// Query keys (frozen — exported for tests + manual invalidation)
// -----------------------------------------------------------------------------

export interface AiUsageKeyFilters {
  category?: AiCategory
  model?: string
  provider?: AiProvider
}

export const ledgerKeys = {
  all: ['ledger'] as const,
  summary: (month: string) => [...ledgerKeys.all, 'summary', month] as const,
  months: () => [...ledgerKeys.all, 'months'] as const,
  compare: (month: string, against: string) =>
    [...ledgerKeys.all, 'compare', month, against] as const,
  revenue: (month: string, cursor: string, packageId?: string) =>
    [...ledgerKeys.all, 'revenue', month, cursor, packageId ?? ''] as const,
  aiUsage: (month: string, cursor: string, filters: AiUsageKeyFilters) =>
    [...ledgerKeys.all, 'aiUsage', month, cursor, filters] as const,
  infraCosts: (month: string) => [...ledgerKeys.all, 'infraCosts', month] as const,
  exchangeRate: () => [...ledgerKeys.all, 'exchangeRate'] as const,
}

// -----------------------------------------------------------------------------
// Read hooks
// -----------------------------------------------------------------------------

/**
 * Empty string month = "current month" (server-side default).
 */
export function useLedgerSummary(
  month: Ref<string>,
): UseQueryReturnType<LedgerResponse, Error> {
  return useQuery({
    queryKey: computed(() => ledgerKeys.summary(month.value)),
    queryFn: () => ledgerApi.getSummary(month.value || undefined),
  })
}

export function useLedgerMonths(): UseQueryReturnType<{ months: LedgerMonth[] }, Error> {
  return useQuery({
    queryKey: ledgerKeys.months(),
    queryFn: () => ledgerApi.months(),
  })
}

export function useLedgerCompare(
  month: Ref<string>,
  against: Ref<string>,
  enabled: Ref<boolean>,
): UseQueryReturnType<CompareData, Error> {
  return useQuery({
    queryKey: computed(() => ledgerKeys.compare(month.value, against.value)),
    queryFn: () =>
      ledgerApi.getCompare(month.value || undefined, against.value || 'prev'),
    enabled,
  })
}

export function useLedgerRevenue(
  month: Ref<string>,
  cursor: Ref<string>,
  packageId: Ref<string | undefined>,
  enabled?: Ref<boolean>,
): UseQueryReturnType<RevenueListResponse, Error> {
  return useQuery({
    queryKey: computed(() => ledgerKeys.revenue(month.value, cursor.value, packageId.value)),
    queryFn: () => {
      const params: RevenueListParams = {}
      if (month.value) params.month = month.value
      if (cursor.value) params.cursor = cursor.value
      if (packageId.value) params.package_id = packageId.value
      return ledgerApi.getRevenue(params)
    },
    ...(enabled ? { enabled } : {}),
  })
}

export function useLedgerAiUsage(
  month: Ref<string>,
  cursor: Ref<string>,
  filters: Ref<AiUsageKeyFilters>,
  enabled?: Ref<boolean>,
): UseQueryReturnType<AiUsageListResponse, Error> {
  return useQuery({
    queryKey: computed(() => ledgerKeys.aiUsage(month.value, cursor.value, filters.value)),
    queryFn: () => {
      const params: AiUsageListParams = {}
      if (month.value) params.month = month.value
      if (cursor.value) params.cursor = cursor.value
      if (filters.value.category) params.category = filters.value.category
      if (filters.value.model) params.model = filters.value.model
      if (filters.value.provider) params.provider = filters.value.provider
      return ledgerApi.getAiUsage(params)
    },
    ...(enabled ? { enabled } : {}),
  })
}

export function useLedgerInfraCosts(
  month: Ref<string>,
): UseQueryReturnType<InfraCostsResponse, Error> {
  return useQuery({
    queryKey: computed(() => ledgerKeys.infraCosts(month.value)),
    queryFn: () => ledgerApi.getInfraCosts(month.value || undefined),
  })
}

export function useExchangeRate(): UseQueryReturnType<ExchangeRateResponse, Error> {
  return useQuery({
    queryKey: ledgerKeys.exchangeRate(),
    queryFn: () => ledgerApi.getExchangeRate(),
  })
}

// -----------------------------------------------------------------------------
// Mutation hooks
// -----------------------------------------------------------------------------

/**
 * Invalidates summary + compare + infra-costs caches.
 * Used by both PUT (update) and DELETE (delete) infra cost mutations
 * since they have identical downstream effects.
 */
function invalidateInfraCostScope(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [...ledgerKeys.all, 'infraCosts'] })
  queryClient.invalidateQueries({ queryKey: [...ledgerKeys.all, 'summary'] })
  queryClient.invalidateQueries({ queryKey: [...ledgerKeys.all, 'compare'] })
}

/**
 * Invalidates summary + compare + exchange-rate caches.
 * Used by both manual override (PUT) and refresh (POST) since both
 * potentially change the IDR conversion factor.
 */
function invalidateExchangeRateScope(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ledgerKeys.exchangeRate() })
  queryClient.invalidateQueries({ queryKey: [...ledgerKeys.all, 'summary'] })
  queryClient.invalidateQueries({ queryKey: [...ledgerKeys.all, 'compare'] })
}

export function useUpdateInfraCosts() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (req: InfraCostsUpdateRequest) => ledgerApi.updateInfraCosts(req),
    onSuccess: () => invalidateInfraCostScope(queryClient),
  })
}

export function useDeleteInfraCostPeriod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (periodId: string) => ledgerApi.deleteInfraCost(periodId),
    onSuccess: () => invalidateInfraCostScope(queryClient),
  })
}

export function useUpdateExchangeRate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (req: ExchangeRateUpdateRequest) => ledgerApi.updateExchangeRate(req),
    onSuccess: () => invalidateExchangeRateScope(queryClient),
  })
}

export function useRefreshExchangeRate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => ledgerApi.refreshExchangeRate(),
    // On 200 → all three scopes invalidate.
    // On 502 → onError fires; only the exchange rate cache is refreshed
    // because IDR values upstream did not change.
    onSuccess: () => invalidateExchangeRateScope(queryClient),
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ledgerKeys.exchangeRate() })
    },
  })
}
