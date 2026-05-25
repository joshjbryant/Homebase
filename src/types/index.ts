// ─── Core domain types ───────────────────────────────────────────────────────

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete'

export interface Household {
  id: string
  created_by: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_status: SubscriptionStatus
  trial_ends_at: string | null
  created_at: string
}

export interface HouseholdMember {
  id: string
  household_id: string
  user_id: string
  display_name: string
  color: string
  role: 'owner' | 'member'
  joined_at: string
}

export interface CustodyDay {
  id: string
  household_id: string
  date: string           // ISO date: YYYY-MM-DD
  assigned_to: string    // household_member id
  created_by: string
  updated_at: string
}

export interface CalendarFeed {
  id: string
  household_id: string
  name: string
  url: string
  color: string
  enabled: boolean
  last_synced_at: string | null
  created_by: string
  created_at: string
}

export interface CalendarFeedEvent {
  feedId: string
  feedName: string
  feedColor: string
  title: string
  date: string           // ISO date
  startTime?: string
  endTime?: string
  allDay: boolean
}

export type ExpenseCategory = 'medical' | 'school' | 'sports' | 'clothing' | 'food' | 'other'
export type ExpenseStatus = 'pending' | 'paid'

export interface Expense {
  id: string
  household_id: string
  description: string
  amount: number
  category: ExpenseCategory
  expense_date: string
  paid_by: string        // household_member id
  split_pct: number      // % that paid_by is responsible for (0-100)
  receipt_url: string | null
  status: ExpenseStatus
  created_by: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  household_id: string
  sender_id: string      // household_member id
  body: string
  created_at: string
}

export type DocumentCategory = 'medical' | 'school' | 'legal' | 'other'

export interface Document {
  id: string
  household_id: string
  name: string
  category: DocumentCategory
  file_url: string
  uploaded_by: string    // household_member id
  created_at: string
}

// ─── UI / derived types ───────────────────────────────────────────────────────

export interface CalendarDay {
  date: string
  isCurrentMonth: boolean
  isToday: boolean
  custodyMember: HouseholdMember | null
  feedEvents: CalendarFeedEvent[]
  hasExpense: boolean
}

export interface ExpenseSummary {
  totalYTD: number
  balances: {
    memberId: string
    memberName: string
    owes: number         // positive = this member owes the other
  }[]
}

// ─── API request/response types ───────────────────────────────────────────────

export interface CreateHouseholdRequest {
  display_name: string
  color: string
}

export interface InvitePartnerRequest {
  email: string
}

export interface AddCustodyDayRequest {
  date: string
  assigned_to: string
}

export interface AddCalendarFeedRequest {
  name: string
  url: string
  color: string
}

export interface AddExpenseRequest {
  description: string
  amount: number
  category: ExpenseCategory
  expense_date: string
  paid_by: string
  split_pct: number
  receipt_file?: File
}

export interface SendMessageRequest {
  body: string
}

export interface UploadDocumentRequest {
  name: string
  category: DocumentCategory
  file: File
}

// ─── Stripe types ─────────────────────────────────────────────────────────────

export interface StripeWebhookEvent {
  type: string
  data: {
    object: Record<string, unknown>
  }
}
