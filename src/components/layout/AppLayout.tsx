'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calendar, Receipt, MessageSquare, FileText, Home } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Calendar', icon: Calendar },
  { href: '/expenses',  label: 'Expenses', icon: Receipt },
  { href: '/messages',  label: 'Messages', icon: MessageSquare },
  { href: '/docs',      label: 'Docs',     icon: FileText },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-2xl mx-auto">
      {/* Top header */}
      <header className="bg-white border-b border-gray-100 px-4 pt-safe-top sticky top-0 z-10">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-sage-500 rounded-lg flex items-center justify-center">
              <Home className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-gray-900 text-base">
              home<span className="text-sage-500">base</span>
            </span>
          </div>
          <Link href="/settings" className="w-8 h-8 bg-sage-50 rounded-full flex items-center justify-center text-sage-700 text-xs font-semibold hover:bg-sage-100 transition-colors">
            JB
          </Link>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="bg-white border-t border-gray-100 safe-bottom sticky bottom-0 z-10">
        <div className="grid grid-cols-4 h-16">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <Link key={href} href={href}
                className={`flex flex-col items-center justify-center gap-1 text-xs transition-colors ${
                  active ? 'text-sage-600' : 'text-gray-400 hover:text-gray-600'
                }`}>
                <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                <span className={active ? 'font-medium' : ''}>{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
