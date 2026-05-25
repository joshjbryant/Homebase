'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { HouseholdMember, CustodyDay, CalendarFeed, Expense, Message } from '@/types'

export function useHousehold() {
  const supabase = createClient()
  const [members, setMembers] = useState<HouseholdMember[]>([])
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [currentMember, setCurrentMember] = useState<HouseholdMember | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: myMember } = await supabase
        .from('household_members')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (!myMember) { setLoading(false); return }

      setHouseholdId(myMember.household_id)
      setCurrentMember(myMember)

      const { data: allMembers } = await supabase
        .from('household_members')
        .select('*')
        .eq('household_id', myMember.household_id)

      setMembers(allMembers || [])
      setLoading(false)
    }
    load()
  }, [])

  return { members, householdId, currentMember, loading }
}

export function useCustodyDays(householdId: string | null, year: number, month: number) {
  const supabase = createClient()
  const [days, setDays] = useState<CustodyDay[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!householdId) return
    async function load() {
      setLoading(true)
      const from = `${year}-${String(month + 1).padStart(2, '0')}-01`
      const lastDay = new Date(year, month + 1, 0).getDate()
      const to = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`

      const { data } = await supabase
        .from('custody_days')
        .select('*')
        .eq('household_id', householdId)
        .gte('date', from)
        .lte('date', to)

      setDays(data || [])
      setLoading(false)
    }
    load()
  }, [householdId, year, month])

  return { days, loading, refetch: () => {} }
}

export function useCalendarFeeds(householdId: string | null) {
  const supabase = createClient()
  const [feeds, setFeeds] = useState<CalendarFeed[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!householdId) return
    async function load() {
      const { data } = await supabase
        .from('calendar_feeds')
        .select('*')
        .eq('household_id', householdId)
        .order('created_at', { ascending: true })
      setFeeds(data || [])
      setLoading(false)
    }
    load()
  }, [householdId])

  async function addFeed(feed: { name: string; url: string; color: string }) {
    if (!householdId) return
    const { data: member } = await supabase
      .from('household_members')
      .select('id')
      .eq('household_id', householdId)
      .single()
    if (!member) return

    const { data } = await supabase.from('calendar_feeds').insert({
      household_id: householdId,
      name: feed.name,
      url: feed.url,
      color: feed.color,
      created_by: member.id,
    }).select().single()

    if (data) setFeeds(prev => [...prev, data])
  }

  async function toggleFeed(id: string, enabled: boolean) {
    await supabase.from('calendar_feeds').update({ enabled }).eq('id', id)
    setFeeds(prev => prev.map(f => f.id === id ? { ...f, enabled } : f))
  }

  async function deleteFeed(id: string) {
    await supabase.from('calendar_feeds').delete().eq('id', id)
    setFeeds(prev => prev.filter(f => f.id !== id))
  }

  return { feeds, loading, addFeed, toggleFeed, deleteFeed }
}

export function useExpenses(householdId: string | null) {
  const supabase = createClient()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!householdId) return
    async function load() {
      const { data } = await supabase
        .from('expenses')
        .select('*')
        .eq('household_id', householdId)
        .order('expense_date', { ascending: false })
      setExpenses(data || [])
      setLoading(false)
    }
    load()
  }, [householdId])

  async function markPaid(id: string, status: 'pending' | 'paid') {
    await supabase.from('expenses').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, status } : e))
  }

  return { expenses, loading, markPaid, refetch: () => {} }
}

export function useMessages(householdId: string | null) {
  const supabase = createClient()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!householdId) return

    async function load() {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('household_id', householdId)
        .order('created_at', { ascending: true })
        .limit(100)
      setMessages(data || [])
      setLoading(false)
    }
    load()

    // Realtime subscription
    const channel = supabase
      .channel(`messages:${householdId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `household_id=eq.${householdId}`,
      }, payload => {
        setMessages(prev => [...prev, payload.new as Message])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [householdId])

  async function sendMessage(body: string, senderId: string) {
    if (!householdId) return
    await supabase.from('messages').insert({
      household_id: householdId,
      sender_id: senderId,
      body,
    })
  }

  return { messages, loading, sendMessage }
}
