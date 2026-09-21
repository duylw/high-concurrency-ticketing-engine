import React from 'react'

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-border-subtle bg-[#07090E]/95 py-10 mt-auto">
      <div className="container mx-auto px-6 flex flex-wrap justify-between items-center gap-6">
        <div>
          <div className="font-bold text-base text-text-primary mb-1">
            Ticketing Engine & Flash-Sale Platform
          </div>
          <p className="text-xs text-text-muted">
            Hệ thống đặt vé trực tuyến tải cao với bảo vệ Pessimistic Locking & hàng đợi hoàn vé BullMQ.
          </p>
        </div>

        <div className="text-xs text-text-muted text-right">
          <div>Node.js • Express 5 • PostgreSQL 16 • Redis 7 • React 19 • TypeScript</div>
          <div className="mt-1">© 2026 Ticketing Engine. All rights reserved.</div>
        </div>
      </div>
    </footer>
  )
}
