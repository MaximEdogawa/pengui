'use client'

import { AppLink } from '@/shared/ui'
import { Briefcase, ArrowRight, FileText, FileCheck } from 'lucide-react'
import type { ThemeClasses } from '@/shared/lib/theme'
import type { LoanOffer, LoanAgreement } from '@/entities/loan'

interface InvestmentsCardProps {
  isDark: boolean
  t: ThemeClasses
  loans?: LoanOffer[]
  agreements?: LoanAgreement[]
}

export interface InvestmentRow {
  id: number
  investmentType: 'Loan' | 'Options Contract'
  asset: string
  value: string
  status: string
  date: string
  href: string
}

function statusColor(status: string, isDark: boolean): string {
  switch (status) {
    case 'funded':
    case 'active':
      return isDark ? 'text-emerald-400 bg-emerald-500/10 border-emerald-400/20' : 'text-emerald-700 bg-emerald-500/15 border-emerald-600/20'
    case 'available':
      return isDark ? 'text-blue-400 bg-blue-500/10 border-blue-400/20' : 'text-blue-700 bg-blue-500/15 border-blue-600/20'
    case 'settled':
      return isDark ? 'text-slate-400 bg-slate-500/10 border-slate-400/20' : 'text-slate-600 bg-slate-500/15 border-slate-600/20'
    default:
      return isDark ? 'text-amber-400 bg-amber-500/10 border-amber-400/20' : 'text-amber-700 bg-amber-500/15 border-amber-600/20'
  }
}

export function buildInvestmentRows(
  loans: LoanOffer[],
  agreements: LoanAgreement[],
): InvestmentRow[] {
  const list: InvestmentRow[] = []

  for (const loan of loans) {
    list.push({
      id: loan.id,
      investmentType: loan.assetType === 'Options' ? 'Options Contract' : 'Loan',
      asset: `${loan.amount.toLocaleString()} ${loan.currency}`,
      value: `${loan.amount.toLocaleString()} ${loan.currency}`,
      status: loan.status,
      date: loan.fundedDate ?? '-',
      href: '/loans',
    })
  }

  for (const agreement of agreements) {
    list.push({
      id: agreement.id,
      investmentType: agreement.assetType === 'Options' ? 'Options Contract' : 'Loan',
      asset: `${agreement.amount.toLocaleString()} ${agreement.currency}`,
      value: `${agreement.totalRepayment?.toLocaleString() ?? agreement.amount.toLocaleString()} ${agreement.currency}`,
      status: agreement.status,
      date: agreement.startDate ?? '-',
      href: '/loans',
    })
  }

  return list
}

export function InvestmentsCard({ isDark, t, loans = [], agreements = [] }: InvestmentsCardProps) {
  const rows = buildInvestmentRows(loans, agreements)
  const isEmpty = rows.length === 0

  return (
    <div
      className={`backdrop-blur-[40px] ${t.card} rounded-2xl p-3 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 ${
        isDark ? 'bg-white/[0.03]' : 'bg-white/30'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className={`p-2 rounded-xl backdrop-blur-sm ${
              isDark ? 'bg-cyan-500/10' : 'bg-cyan-600/15'
            }`}
          >
            <Briefcase
              className={isDark ? 'text-cyan-400' : 'text-cyan-700'}
              size={16}
              strokeWidth={2}
            />
          </div>
          <p
            className={`${t.textSecondary} text-[10px] font-medium uppercase tracking-wide`}
          >
            Investments
          </p>
        </div>
        <AppLink
          href="/loans"
          className={`flex items-center gap-1 text-[10px] font-medium ${t.textTertiary} hover:opacity-80 transition-opacity`}
        >
          View details <ArrowRight size={10} />
        </AppLink>
      </div>

      {isEmpty ? (
        <div className="flex items-center justify-center py-6">
          <p className={`${t.textTertiary} text-xs`}>No open investments</p>
        </div>
      ) : (
        <>
          {/* Table header */}
          <div className={`grid grid-cols-12 gap-2 px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wide ${t.textTertiary}`}>
            <span className="col-span-3">Type</span>
            <span className="col-span-3">Asset</span>
            <span className="col-span-2 text-right">Value</span>
            <span className="col-span-2 text-center">Status</span>
            <span className="col-span-2 text-right">Date</span>
          </div>

          <div className="space-y-1">
            {rows.map((row) => (
              <AppLink
                key={`${row.investmentType}-${row.id}`}
                href={row.href}
                className={`grid grid-cols-12 gap-2 items-center rounded-xl px-2.5 py-2 border transition-all duration-200 ${
                  isDark
                    ? 'bg-white/[0.03] border-white/5 hover:bg-white/[0.05]'
                    : 'bg-white/50 border-cyan-200/30 hover:bg-white/70'
                }`}
              >
                <div className="col-span-3 flex items-center gap-2">
                  {row.investmentType === 'Options Contract' ? (
                    <FileCheck size={12} className={isDark ? 'text-violet-400' : 'text-violet-600'} />
                  ) : (
                    <FileText size={12} className={isDark ? 'text-cyan-400' : 'text-cyan-700'} />
                  )}
                  <span className={`${t.text} text-[11px] font-medium truncate`}>
                    {row.investmentType}
                  </span>
                </div>
                <span className={`col-span-3 ${t.text} text-[11px] font-medium truncate`}>
                  {row.asset}
                </span>
                <span className={`col-span-2 text-right ${t.text} text-[11px] font-semibold tabular-nums`}>
                  {row.value}
                </span>
                <div className="col-span-2 flex justify-center">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold border capitalize ${statusColor(row.status, isDark)}`}
                  >
                    {row.status}
                  </span>
                </div>
                <span className={`col-span-2 text-right ${t.textTertiary} text-[10px] tabular-nums`}>
                  {row.date}
                </span>
              </AppLink>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
