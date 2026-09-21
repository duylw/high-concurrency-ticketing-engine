import React from 'react'

export const Footer: React.FC = () => {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--color-border-subtle)',
        background: 'rgba(7, 9, 14, 0.95)',
        padding: '2.5rem 0',
        marginTop: 'auto',
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1.5rem',
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>
            Ticketing Engine & Flash-Sale Platform
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            Hệ thống đặt vé trực tuyến tải cao với bảo vệ Pessimistic Locking & hàng đợi hoàn vé BullMQ.
          </p>
        </div>

        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', textAlign: 'right' }}>
          <div>Node.js • Express 5 • PostgreSQL 16 • Redis 7 • React 19 • TypeScript</div>
          <div style={{ marginTop: '0.25rem' }}>© 2026 Ticketing Engine. All rights reserved.</div>
        </div>
      </div>
    </footer>
  )
}
