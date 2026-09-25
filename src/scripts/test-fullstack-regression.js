import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '../..')
const clientDir = path.resolve(rootDir, 'client')
const distDir = path.resolve(clientDir, 'dist')
const assetsDir = path.resolve(distDir, 'assets')

const API_BASE = 'http://localhost:5001/api/v1'

const logStep = (step, title) => {
  console.log(`\n======================================================`)
  console.log(`[TASK-16E REGRESSION STEP ${step}] ${title}`)
  console.log(`======================================================`)
}

async function runRegressionSuite() {
  console.log(`\n======================================================`)
  console.log(`[TEST RUNNER] Starting Fullstack Decoupled Architecture & Regression Suite...`)
  console.log(`======================================================`)

  let passedSteps = 0

  // ----------------------------------------------------
  // STEP 1: Verify Client Build & Rollup Chunk Splitting
  // ----------------------------------------------------
  logStep(1, 'Verify Production Build & Rollup Chunk Splitting')

  if (!fs.existsSync(distDir) || !fs.existsSync(assetsDir)) {
    console.log(`[INFO] Building client production bundle...`)
    execSync('npm run build', { cwd: clientDir, stdio: 'inherit' })
  }

  const indexHtmlPath = path.resolve(distDir, 'index.html')
  if (!fs.existsSync(indexHtmlPath)) {
    throw new Error(`[FAIL] client/dist/index.html does not exist!`)
  }

  const assetFiles = fs.readdirSync(assetsDir)
  console.log(`[INFO] Assets generated in client/dist/assets:`)

  const chunkStats = {}
  let hasOversizedChunk = false

  for (const file of assetFiles) {
    const filePath = path.resolve(assetsDir, file)
    const stats = fs.statSync(filePath)
    const sizeKB = (stats.size / 1024).toFixed(2)
    chunkStats[file] = stats.size

    console.log(`  - ${file.padEnd(40)} : ${sizeKB.padStart(8)} KB`)

    // Vite warning limit is 500 KB (512,000 bytes)
    if (file.endsWith('.js') && stats.size > 500 * 1024) {
      console.error(`[FAIL] Chunk ${file} exceeds 500 KB (${sizeKB} KB)!`)
      hasOversizedChunk = true
    }
  }

  if (hasOversizedChunk) {
    throw new Error(`[FAIL] One or more JavaScript chunks exceeded the 500 KB threshold!`)
  }

  const hasReactChunk = assetFiles.some((f) => f.startsWith('vendor-react-') && f.endsWith('.js'))
  const hasScannerChunk = assetFiles.some((f) => f.startsWith('vendor-scanner-') && f.endsWith('.js'))
  const hasIconsChunk = assetFiles.some((f) => f.startsWith('vendor-icons-') && f.endsWith('.js'))
  const hasUtilsChunk = assetFiles.some((f) => f.startsWith('vendor-utils-') && f.endsWith('.js'))
  const hasAppChunk = assetFiles.some((f) => f.startsWith('index-') && f.endsWith('.js'))
  const hasCssChunk = assetFiles.some((f) => f.startsWith('index-') && f.endsWith('.css'))

  if (!hasReactChunk) throw new Error('[FAIL] vendor-react chunk not generated!')
  if (!hasScannerChunk) throw new Error('[FAIL] vendor-scanner chunk not generated!')
  if (!hasIconsChunk) throw new Error('[FAIL] vendor-icons chunk not generated!')
  if (!hasUtilsChunk) throw new Error('[FAIL] vendor-utils chunk not generated!')
  if (!hasAppChunk) throw new Error('[FAIL] Application index chunk not generated!')
  if (!hasCssChunk) throw new Error('[FAIL] Application index CSS not generated!')

  console.log(`[PASSED] All vendor chunks cleanly split and within strict size budgets (< 500 KB).`)
  passedSteps++

  // ----------------------------------------------------
  // STEP 2: Deep Health Check & Backend API Independence
  // ----------------------------------------------------
  logStep(2, 'Deep Health Check & Headless API Independence')

  const healthRes = await fetch(`${API_BASE}/health`)
  if (!healthRes.ok) {
    throw new Error(`[FAIL] Health check failed with status: ${healthRes.status}`)
  }

  const healthData = await healthRes.json()
  if (!healthData.success || healthData.status !== 'healthy') {
    throw new Error(`[FAIL] System status is not healthy: ${JSON.stringify(healthData)}`)
  }

  console.log(`[INFO] PostgreSQL: ${healthData.services.database.status} (${healthData.services.database.latencyMs}ms)`)
  console.log(`[INFO] Redis: ${healthData.services.redis.status} (${healthData.services.redis.latencyMs}ms)`)
  console.log(`[INFO] BullMQ Ticket Release Queue: ${healthData.services.queues.ticketRelease.status}`)
  console.log(`[INFO] BullMQ Notification Queue: ${healthData.services.queues.notification.status}`)

  if (healthData.services.database.status !== 'up') throw new Error('[FAIL] Database is not up!')
  if (healthData.services.redis.status !== 'up') throw new Error('[FAIL] Redis is not up!')

  console.log(`[PASSED] Backend API is running purely as a headless engine with all sub-services healthy.`)
  passedSteps++

  // ----------------------------------------------------
  // STEP 3: CORS & Decoupled Headers Verification
  // ----------------------------------------------------
  logStep(3, 'CORS & Cross-Domain Decoupled Headers Verification')

  // Test preflight OPTIONS request from Frontend Dev server (port 5173)
  const preflightDev = await fetch(`${API_BASE}/auth/login`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:5173',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type, Authorization',
    },
  })

  const corsAllowOriginDev = preflightDev.headers.get('access-control-allow-origin')
  const corsAllowCredsDev = preflightDev.headers.get('access-control-allow-credentials')

  console.log(`[INFO] Dev Origin (5173) CORS Allow-Origin: ${corsAllowOriginDev}`)
  console.log(`[INFO] Dev Origin (5173) CORS Allow-Credentials: ${corsAllowCredsDev}`)

  if (!corsAllowOriginDev || corsAllowOriginDev !== 'http://localhost:5173') {
    throw new Error(`[FAIL] Expected Access-Control-Allow-Origin: http://localhost:5173, got: ${corsAllowOriginDev}`)
  }

  // Test preflight OPTIONS request from Frontend Preview server (port 4173)
  const preflightPreview = await fetch(`${API_BASE}/auth/login`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:4173',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type, Authorization',
    },
  })

  const corsAllowOriginPreview = preflightPreview.headers.get('access-control-allow-origin')
  console.log(`[INFO] Preview Origin (4173) CORS Allow-Origin: ${corsAllowOriginPreview}`)

  if (!corsAllowOriginPreview || corsAllowOriginPreview !== 'http://localhost:4173') {
    throw new Error(`[FAIL] Expected Access-Control-Allow-Origin: http://localhost:4173, got: ${corsAllowOriginPreview}`)
  }

  console.log(`[PASSED] Decoupled CORS configuration validates both dev and preview standalone frontend origins.`)
  passedSteps++

  // ----------------------------------------------------
  // STEP 4: Buyer Flow (Auth -> RTR -> Hold -> Idempotent Checkout)
  // ----------------------------------------------------
  logStep(4, 'Buyer End-to-End Flow (Auth, RTR, Hold & Checkout)')

  // 4.1 Login
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'buyer@ticketing.com', password: 'Password123!' }),
  })
  const loginData = await loginRes.json()
  if (!loginRes.ok || !loginData.data?.tokens) {
    throw new Error(`[FAIL] Buyer login failed: ${JSON.stringify(loginData)}`)
  }

  let { accessToken, refreshToken } = loginData.data.tokens
  console.log(`[INFO] Buyer logged in successfully. Token: ${accessToken.slice(0, 15)}...`)

  // 4.2 Silent Refresh Token Rotation (RTR)
  const rtrRes = await fetch(`${API_BASE}/auth/refresh-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
  const rtrData = await rtrRes.json()
  if (!rtrRes.ok || !rtrData.data?.tokens) {
    throw new Error(`[FAIL] Refresh token rotation failed: ${JSON.stringify(rtrData)}`)
  }

  const oldRefreshToken = refreshToken
  accessToken = rtrData.data.tokens.accessToken
  refreshToken = rtrData.data.tokens.refreshToken
  console.log(`[INFO] RTR rotated new token pair successfully.`)

  // 4.3 Replay Protection Defense
  const replayRes = await fetch(`${API_BASE}/auth/refresh-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: oldRefreshToken }),
  })
  if (replayRes.status !== 403) {
    throw new Error(`[FAIL] Expected 403 Forbidden on replaying revoked refresh token, got: ${replayRes.status}`)
  }
  console.log(`[INFO] Replay attack with revoked token blocked with HTTP 403 Forbidden.`)

  // 4.4 Find available event & tier by querying event details
  const eventsRes = await fetch(`${API_BASE}/events`)
  const eventsData = await eventsRes.json()
  const events = eventsData.data?.events || eventsData.data || []
  if (!events.length) throw new Error('[FAIL] No events found in database!')

  let activeEvent = null
  let activeTier = null
  const now = Date.now()

  for (const e of events) {
    const detailRes = await fetch(`${API_BASE}/events/${e.id}`)
    const detailData = await detailRes.json()
    const detail = detailData.data
    if (
      detail?.ticketTiers &&
      detail.ticketTiers.some((t) => t.availableStock > 0) &&
      new Date(detail.saleStartTime).getTime() <= now &&
      new Date(detail.saleEndTime).getTime() >= now
    ) {
      activeEvent = detail
      activeTier = detail.ticketTiers.find((t) => t.availableStock > 0)
      break
    }
  }

  // Fallback: any event with available stock
  if (!activeEvent || !activeTier) {
    for (const e of events) {
      const detailRes = await fetch(`${API_BASE}/events/${e.id}`)
      const detailData = await detailRes.json()
      const detail = detailData.data
      if (detail?.ticketTiers && detail.ticketTiers.some((t) => t.availableStock > 0)) {
        activeEvent = detail
        activeTier = detail.ticketTiers.find((t) => t.availableStock > 0)
        break
      }
    }
  }

  if (!activeEvent || !activeTier) {
    throw new Error('[FAIL] No active event with available tickets found!')
  }

  console.log(`[INFO] Selected Event: "${activeEvent.title}", Tier: "${activeTier.name}" (Available: ${activeTier.availableStock})`)

  // 4.5 Ticket Hold
  const holdRes = await fetch(`${API_BASE}/orders/hold`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      ticketTierId: activeTier.id,
      quantity: 1,
    }),
  })
  const holdData = await holdRes.json()
  const orderId = holdData.data?.id || holdData.data?.orderId
  if (!orderId || (holdRes.status !== 200 && holdRes.status !== 201)) {
    throw new Error(`[FAIL] Ticket hold failed: ${JSON.stringify(holdData)}`)
  }
  console.log(`[INFO] Ticket held successfully. Order ID: ${orderId}`)

  // 4.6 Idempotent Checkout
  const idempotencyKey = `REGRESSION-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  const checkoutRes = await fetch(`${API_BASE}/orders/${orderId}/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'X-Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({}),
  })
  const checkoutData = await checkoutRes.json()
  if (!checkoutRes.ok || checkoutData.data?.status !== 'COMPLETED') {
    throw new Error(`[FAIL] Checkout failed: ${JSON.stringify(checkoutData)}`)
  }

  // 4.7 Retrieve itemized ticket code for check-in test
  const myOrdersRes = await fetch(`${API_BASE}/orders/my-orders`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const myOrdersData = await myOrdersRes.json()
  const myOrders = myOrdersData.data?.orders || myOrdersData.data || []
  const currentOrder = myOrders.find((o) => o.id === orderId)

  if (!currentOrder || !currentOrder.tickets || !currentOrder.tickets.length) {
    throw new Error('[FAIL] Completed order does not contain itemized tickets!')
  }

  const issuedTicket = currentOrder.tickets[0]
  console.log(`[INFO] Checkout completed! Issued Ticket Code: ${issuedTicket.ticketCode}`)

  console.log(`[PASSED] Buyer purchase flow and ticket issuance verified end-to-end.`)
  passedSteps++

  // ----------------------------------------------------
  // STEP 5: Organizer Studio KPIs & Universal Gate Scanner Check-in
  // ----------------------------------------------------
  logStep(5, 'Organizer Analytics & Gate Scanner Anti-Passback Check-in')

  // 5.1 Organizer Login
  const orgLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'organizer@ticketing.com', password: 'Password123!' }),
  })
  const orgLoginData = await orgLoginRes.json()
  if (!orgLoginRes.ok || !orgLoginData.data?.tokens) {
    throw new Error(`[FAIL] Organizer login failed: ${JSON.stringify(orgLoginData)}`)
  }
  const orgToken = orgLoginData.data.tokens.accessToken

  // 5.2 Organizer Analytics
  const myEventsRes = await fetch(`${API_BASE}/events/organizer/my-events`, {
    headers: { Authorization: `Bearer ${orgToken}` },
  })
  const myEventsData = await myEventsRes.json()
  if (!myEventsRes.ok || !myEventsData.data) {
    throw new Error(`[FAIL] Fetch organizer events failed: ${JSON.stringify(myEventsData)}`)
  }
  const orgEvents = Array.isArray(myEventsData.data)
    ? myEventsData.data
    : myEventsData.data.events || []
  let totalRevenue = 0
  let totalTicketsSold = 0
  for (const evt of orgEvents) {
    totalRevenue += evt.totalRevenue ?? evt.stats?.totalRevenue ?? 0
    totalTicketsSold += evt.totalTicketsSold ?? evt.stats?.totalTicketsSold ?? 0
  }
  console.log(`[INFO] Organizer Events: ${orgEvents.length} events managed. KPIs: Revenue = ${totalRevenue.toLocaleString()} VND, Sold = ${totalTicketsSold}`)

  // 5.3 Gate Scanner Check-in (First Scan -> SUCCESS HTTP 200)
  const checkinRes1 = await fetch(`${API_BASE}/orders/${issuedTicket.ticketCode}/check-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${orgToken}`,
    },
  })
  const checkinData1 = await checkinRes1.json()
  if (checkinRes1.status !== 200 || checkinData1.data?.status !== 'CHECKED_IN') {
    throw new Error(`[FAIL] First check-in failed: status=${checkinRes1.status}, data=${JSON.stringify(checkinData1)}`)
  }
  console.log(`[INFO] First scan: Ticket successfully CHECKED_IN (HTTP 200).`)

  // 5.4 Anti-Passback Defense (Second Scan -> REJECT HTTP 409 Conflict)
  const checkinRes2 = await fetch(`${API_BASE}/orders/${issuedTicket.ticketCode}/check-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${orgToken}`,
    },
  })
  const checkinData2 = await checkinRes2.json()
  if (checkinRes2.status !== 409) {
    throw new Error(`[FAIL] Expected HTTP 409 Conflict on repeated scan, got: ${checkinRes2.status}`)
  }
  console.log(`[INFO] Anti-Passback Defense triggered: Second scan rejected with HTTP 409 Conflict.`)

  console.log(`[PASSED] Organizer studio metrics and gate check-in anti-passback roundtrip verified.`)
  passedSteps++

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log(`\n======================================================`)
  console.log(`[SUMMARY] FULLSTACK REGRESSION TEST PASSED 100%`)
  console.log(`Total Steps Verified: ${passedSteps} / 5`)
  console.log(`- Step 1: Rollup Chunk Splitting (< 500 KB per chunk)  [PASSED]`)
  console.log(`- Step 2: Headless Backend API & Deep Health Check     [PASSED]`)
  console.log(`- Step 3: Decoupled CORS & Origin Interceptor          [PASSED]`)
  console.log(`- Step 4: Buyer Purchase Flow & Silent RTR Rotation    [PASSED]`)
  console.log(`- Step 5: Organizer KPIs & Gate Scanner Anti-Passback  [PASSED]`)
  console.log(`======================================================\n`)
}

runRegressionSuite().catch((err) => {
  console.error(`\n[FATAL ERROR] Regression suite failed:`, err.message)
  process.exit(1)
})
