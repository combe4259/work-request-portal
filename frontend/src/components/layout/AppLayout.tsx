import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!sidebarOpen) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [sidebarOpen])

  return (
    <div className="flex h-screen bg-[#F0F4FF] overflow-hidden">
      <Sidebar className="hidden lg:flex" />

      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? '' : 'pointer-events-none'}`} aria-hidden={!sidebarOpen}>
        <button
          type="button"
          aria-label="사이드바 닫기"
          onClick={() => setSidebarOpen(false)}
          className={`absolute inset-0 bg-black/40 transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}
        />
        <Sidebar
          className={`relative z-10 h-full transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
          onNavigate={() => setSidebarOpen(false)}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
