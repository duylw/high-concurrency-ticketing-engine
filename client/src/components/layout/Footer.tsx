import React from 'react'

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-border-subtle bg-[#07090E]/95 py-10 mt-auto">
      <div className="container mx-auto px-6 flex flex-wrap justify-between items-center gap-6">
        <div>
          <div className="font-bold text-base text-text-primary mb-1">
            Ticketing Engine & Event Platform
          </div>
          <p className="text-xs text-text-muted">
            Nền tảng đặt vé sự kiện và hòa nhạc trực tuyến tốc độ cao, an toàn và tiện lợi.
          </p>
        </div>

        <div className="text-xs text-text-muted text-right">
          <div>Bảo Mật • Tốc Độ Cao • Tiện Lợi • Hỗ Trợ 24/7</div>
          <div className="mt-1">© 2026 Ticketing Engine. All rights reserved.</div>
        </div>
      </div>
    </footer>
  )
}
