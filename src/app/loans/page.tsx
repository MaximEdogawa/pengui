'use client'

import { useState, useMemo } from 'react'
import { List, Briefcase, Plus, TrendingUp } from 'lucide-react'
import type { LoanFilters, AmountFilter } from '@/entities/loan'
import { useLoansData } from '@/features/loans'
import { filterLoans } from '@/features/loans/model/useLoanFilters'
import {
  LoansPageHeader,
  LoansTabNavigation,
  LoanFilters as LoanFiltersComponent,
  AvailableLoansList,
  MyTakenLoansList,
  CreateLoanForm as CreateLoanFormComponent,
  MyCreatedLoans,
  LoanIncomeAnalytics,
} from '@/features/loans'

const TAKER_TABS = [
  { label: 'Available Loans', value: 'available', icon: List },
  { label: 'My Active Loans', value: 'myTaken', icon: Briefcase },
]

const MAKER_TABS = [
  { label: 'Create Offer', value: 'create', icon: Plus },
  { label: 'My Offers', value: 'myCreated', icon: Briefcase },
  { label: 'Income', value: 'income', icon: TrendingUp },
]

export default function LoansPage() {
  const [isLender, setIsLender] = useState(false)
  const [activeTab, setActiveTab] = useState('available')
  const [amountFilter, setAmountFilter] = useState<AmountFilter>({ min: 0, max: 100000 })
  const [filters, setFilters] = useState<LoanFilters>({
    activeChips: [],
    searchQuery: '',
  })

  const { availableLoans, myLoansTaken, myCreatedLoans } = useLoansData()
  const userRole = isLender ? 'maker' : 'taker'
  const tabs = userRole === 'maker' ? MAKER_TABS : TAKER_TABS

  const filteredAvailableLoans = useMemo(() => {
    return filterLoans(availableLoans, filters, amountFilter)
  }, [availableLoans, filters, amountFilter])

  const handlePayment = (loanId: number, paymentAmount: number) => {
    // TODO: Implement payment functionality
    void loanId
    void paymentAmount
  }

  const handleTakeLoan = (loanId: number) => {
    // TODO: Implement take loan functionality
    void loanId
  }

  const handleViewDetails = (loanId: number) => {
    // TODO: Implement view details functionality
    void loanId
  }

  const handleLoanCreated = (formData: unknown) => {
    // TODO: Implement loan creation functionality
    void formData
  }

  return (
    <div className="w-full relative z-10 flex flex-col" style={{ height: '100%', minHeight: 0 }}>
      {/* Fixed Header */}
      <div className="flex-shrink-0">
        <LoansPageHeader isLender={isLender} onToggleRole={() => setIsLender(!isLender)} />
      </div>

      {/* Fixed Tab Navigation */}
      <div className="flex-shrink-0">
        <LoansTabNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Scrollable Content Area - Stable scrollbar, always visible, fixed height */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-modern scrollbar-permanent"
        style={{
          scrollbarGutter: 'stable',
          minHeight: 0,
          height: 0, // Force flex-1 to work properly
        }}
      >
        {activeTab === 'available' && userRole === 'taker' && (
          <LoanFiltersComponent
            filters={filters}
            amountFilter={amountFilter}
            onFiltersChange={setFilters}
            onAmountFilterChange={setAmountFilter}
          />
        )}

        <div className="space-y-2">
          {activeTab === 'available' && userRole === 'taker' && (
            <AvailableLoansList
              loans={filteredAvailableLoans}
              onTakeLoan={handleTakeLoan}
              onViewDetails={handleViewDetails}
            />
          )}

          {activeTab === 'myTaken' && userRole === 'taker' && (
            <MyTakenLoansList
              loans={myLoansTaken}
              onPayment={handlePayment}
              onViewDetails={handleViewDetails}
            />
          )}

          {activeTab === 'create' && userRole === 'maker' && (
            <CreateLoanFormComponent onSubmit={handleLoanCreated} />
          )}

          {activeTab === 'myCreated' && userRole === 'maker' && (
            <MyCreatedLoans loans={myCreatedLoans} onViewDetails={handleViewDetails} />
          )}

          {activeTab === 'income' && userRole === 'maker' && (
            <LoanIncomeAnalytics loans={myCreatedLoans} />
          )}
        </div>
      </div>
    </div>
  )
}
