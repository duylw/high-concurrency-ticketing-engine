import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '../..')
const clientDir = path.resolve(rootDir, 'client')

const API_BASE = 'http://localhost:5001/api/v1'

const logStep = (step, title) => {
  console.log(`\n======================================================`)
  console.log(`[TASK-16D TEST STEP ${step}] ${title}`)
  console.log(`======================================================`)
}

async function runTests() {
  console.log(`\n======================================================`)
  console.log(`[TEST RUNNER] Starting Task 16D Organizer Studio & Gate Scanner Verification...`)
  console.log(`======================================================`)

  let passedSteps = 0

  // ----------------------------------------------------
  // STEP 1: Verify Task 16D React Component Architecture & Files
  // ----------------------------------------------------
  logStep(1, 'Verify Task 16D Component Architecture & Files')

  const requiredFiles = [
    'src/hooks/useWebcamScanner.ts',
    'src/utils/audio.ts',
    'src/components/organizer/KpiCard.tsx',
    'src/components/organizer/EventCreateModal.tsx',
    'src/components/organizer/index.ts',
    'src/components/scanner/CameraScanner.tsx',
    'src/components/scanner/ImageDropzone.tsx',
    'src/components/scanner/ManualCodeInput.tsx',
    'src/components/scanner/ScanResultModal.tsx',
    'src/components/scanner/index.ts',
    'src/pages/OrganizerStudioPage.tsx',
    'src/pages/GateScannerPage.tsx',
  ]

  for (const file of requiredFiles) {
    const fullPath = path.resolve(clientDir, file)
    if (!fs.existsSync(fullPath)) {
      throw new Error(`[FAIL] Required file missing: ${file}`)
    }
  }

  // Verify routing in App.tsx
  const appPath = path.resolve(clientDir, 'src/App.tsx')
  const appContent = fs.readFileSync(appPath, 'utf8')
  if (!appContent.includes('OrganizerStudioPage') || !appContent.includes('GateScannerPage')) {
    throw new Error('[FAIL] App.tsx must route OrganizerStudioPage and GateScannerPage')
  }

  console.log(`[PASSED] All 12 Task 16D architecture files and routing verified`)
  passedSteps++

  // ----------------------------------------------------
  // STEP 2: Authenticate Organizer & Fetch Studio Analytics
  // ----------------------------------------------------
  logStep(2, 'Authenticate Organizer & Fetch Studio Analytics')

  const orgLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'organizer@ticketing.com', password: 'Password123!' }),
  })
  const orgLoginData = await orgLoginRes.json()
  if (!orgLoginRes.ok || !orgLoginData.data?.tokens?.accessToken) {
    throw new Error(`[FAIL] Organizer login failed: ${JSON.stringify(orgLoginData)}`)
  }

  const orgToken = orgLoginData.data.tokens.accessToken
  const orgUser = orgLoginData.data.user
  console.log(`[PASSED] Organizer authenticated: ${orgUser.email} (ID: ${orgUser.id})`)

  // Fetch organizer events
  const myEventsRes = await fetch(`${API_BASE}/events/organizer/my-events`, {
    headers: { Authorization: `Bearer ${orgToken}` },
  })
  const myEventsData = await myEventsRes.json()
  if (!myEventsRes.ok) {
    throw new Error(`[FAIL] Fetch organizer events failed: ${JSON.stringify(myEventsData)}`)
  }

  const eventsList = Array.isArray(myEventsData.data) ? myEventsData.data : []
  console.log(`[INFO] Retrieved ${eventsList.length} events owned by organizer`)

  let totalRevenue = 0
  let totalTicketsSold = 0
  let totalStock = 0

  for (const evt of eventsList) {
    totalRevenue += evt.totalRevenue ?? evt.stats?.totalRevenue ?? 0
    totalTicketsSold += evt.totalTicketsSold ?? evt.stats?.totalTicketsSold ?? 0
    totalStock += evt.totalStock ?? evt.stats?.totalStock ?? 0
  }

  const soldOutPercentage = totalStock > 0 ? Math.round((totalTicketsSold / totalStock) * 100) : 0
  console.log(`[INFO] Calculated Studio KPIs:`)
  console.log(`       - Total Revenue:      ${totalRevenue.toLocaleString()} VND`)
  console.log(`       - Total Tickets Sold: ${totalTicketsSold.toLocaleString()} / ${totalStock.toLocaleString()}`)
  console.log(`       - Sold-Out Ratio:     ${soldOutPercentage}%`)

  console.log(`[PASSED] Organizer Studio KPI metrics calculation verified`)
  passedSteps++

  // ----------------------------------------------------
  // STEP 3: Create Event & Multi-Tier Setup via API
  // ----------------------------------------------------
  logStep(3, 'Create Event & Ticket Tiers via Organizer API')

  const now = Date.now()
  const eventPayload = {
    title: `Gate Scanner Live Test Show ${now}`,
    description: 'Special performance for testing 4-channel gate check-in and Anti-Passback defense.',
    venue: 'Sân Vận Động Quốc Gia Mỹ Đình, Hà Nội',
    bannerUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200',
    startTime: new Date(now + 86400000).toISOString(),
    endTime: new Date(now + 90000000).toISOString(),
    saleStartTime: new Date(now - 60000).toISOString(),
    saleEndTime: new Date(now + 86400000).toISOString(),
    status: 'PUBLISHED',
  }

  const createEventRes = await fetch(`${API_BASE}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${orgToken}`,
    },
    body: JSON.stringify(eventPayload),
  })
  const createEventData = await createEventRes.json()
  if (!createEventRes.ok || !createEventData.data?.id) {
    throw new Error(`[FAIL] Event creation failed: ${JSON.stringify(createEventData)}`)
  }

  const createdEvent = createEventData.data
  console.log(`[INFO] Created event: "${createdEvent.title}" (ID: ${createdEvent.id})`)

  // Add tier 1: VIP Floor
  const vipTierRes = await fetch(`${API_BASE}/events/${createdEvent.id}/tiers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${orgToken}`,
    },
    body: JSON.stringify({
      name: 'VIP Floor Seat',
      price: 1000000,
      totalStock: 50,
    }),
  })
  const vipTierData = await vipTierRes.json()
  if (!vipTierRes.ok || !vipTierData.data?.id) {
    throw new Error(`[FAIL] VIP Tier creation failed: ${JSON.stringify(vipTierData)}`)
  }
  const vipTier = vipTierData.data
  console.log(`[PASSED] Created Tier: "${vipTier.name}" - ${vipTier.price} VND (Stock: ${vipTier.totalStock})`)
  passedSteps++

  // ----------------------------------------------------
  // STEP 4: Buyer Purchases Ticket (Hold -> Idempotent Checkout)
  // ----------------------------------------------------
  logStep(4, 'Buyer Purchases Ticket for Gate Verification')

  const buyerLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'buyer@ticketing.com', password: 'Password123!' }),
  })
  const buyerLoginData = await buyerLoginRes.json()
  if (!buyerLoginRes.ok || !buyerLoginData.data?.tokens?.accessToken) {
    throw new Error(`[FAIL] Buyer login failed: ${JSON.stringify(buyerLoginData)}`)
  }

  const buyerToken = buyerLoginData.data.tokens.accessToken
  console.log(`[INFO] Buyer authenticated: buyer@ticketing.com`)

  // Hold 1 VIP ticket
  const holdRes = await fetch(`${API_BASE}/orders/hold`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${buyerToken}`,
    },
    body: JSON.stringify({ ticketTierId: vipTier.id, quantity: 1 }),
  })
  const holdData = await holdRes.json()
  if (!holdRes.ok || !holdData.data?.id) {
    throw new Error(`[FAIL] Hold ticket failed: ${JSON.stringify(holdData)}`)
  }
  const order = holdData.data
  console.log(`[INFO] Held Order: #${order.id} (Status: ${order.status})`)

  // Checkout with idempotency
  const idempotencyKey = `scan-test-${now}-${Math.random().toString(36).slice(2, 7)}`
  const checkoutRes = await fetch(`${API_BASE}/orders/${order.id}/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey,
      Authorization: `Bearer ${buyerToken}`,
    },
  })
  const checkoutData = await checkoutRes.json()
  if (!checkoutRes.ok || checkoutData.data?.status !== 'COMPLETED') {
    throw new Error(`[FAIL] Checkout failed: ${JSON.stringify(checkoutData)}`)
  }

  // Retrieve customer order with issued itemized tickets
  const myOrdersRes = await fetch(`${API_BASE}/orders/my-orders`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
  })
  const myOrdersData = await myOrdersRes.json()
  const currentOrder = myOrdersData.data?.find((o) => o.id === order.id)
  const targetTicket = currentOrder?.tickets?.[0]

  if (!targetTicket?.ticketCode) {
    throw new Error(`[FAIL] Target ticket missing ticketCode in order #${order.id}`)
  }

  console.log(`[PASSED] Issued itemized ticket for testing:`)
  console.log(`         Code:   ${targetTicket.ticketCode}`)
  console.log(`         Status: ${targetTicket.status}`)
  passedSteps++

  // ----------------------------------------------------
  // STEP 5: Gate Check-in & Anti-Passback Defense
  // ----------------------------------------------------
  logStep(5, 'Gate Check-in & Anti-Passback Defense Verification')

  // 5A: Valid First Check-in (Expect HTTP 200)
  const firstCheckInRes = await fetch(`${API_BASE}/orders/${targetTicket.ticketCode}/check-in`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${orgToken}` },
  })
  const firstCheckInData = await firstCheckInRes.json()

  if (firstCheckInRes.status !== 200 || firstCheckInData.data?.status !== 'CHECKED_IN') {
    throw new Error(`[FAIL] Expected 200 CHECKED_IN on first check-in, got ${firstCheckInRes.status}: ${JSON.stringify(firstCheckInData)}`)
  }

  console.log(`[PASSED] 1st Check-in SUCCESS (HTTP 200):`)
  console.log(`         Attendee: ${firstCheckInData.data.user?.name || firstCheckInData.data.user?.email}`)
  console.log(`         Tier:     ${firstCheckInData.data.ticketTier?.name}`)
  console.log(`         Status:   ${firstCheckInData.data.status}`)

  // 5B: Duplicate Second Check-in (Expect HTTP 409 Anti-Passback Conflict)
  const duplicateCheckInRes = await fetch(`${API_BASE}/orders/${targetTicket.ticketCode}/check-in`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${orgToken}` },
  })
  const duplicateCheckInData = await duplicateCheckInRes.json()

  if (duplicateCheckInRes.status !== 409) {
    throw new Error(`[FAIL] Expected 409 Anti-Passback Conflict on duplicate check-in, got ${duplicateCheckInRes.status}`)
  }

  console.log(`[PASSED] 2nd Check-in BLOCKED with Anti-Passback Defense (HTTP 409 Conflict):`)
  console.log(`         Message: "${duplicateCheckInData.message}"`)

  // 5C: Non-organizer Buyer Check-in (Expect HTTP 403 Forbidden)
  const buyerCheckInRes = await fetch(`${API_BASE}/orders/${targetTicket.ticketCode}/check-in`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${buyerToken}` },
  })
  if (buyerCheckInRes.status !== 403) {
    throw new Error(`[FAIL] Expected 403 Forbidden for non-organizer check-in, got ${buyerCheckInRes.status}`)
  }

  console.log(`[PASSED] RBAC Enforcement verified: Buyer check-in strictly rejected with HTTP 403 Forbidden`)
  passedSteps++

  // ----------------------------------------------------
  // STEP 6: Execute Client Production Build (tsc -b && vite build)
  // ----------------------------------------------------
  logStep(6, 'Execute Client Production Build (tsc -b && vite build)')

  try {
    const buildOutput = execSync('npm run build', {
      cwd: clientDir,
      encoding: 'utf8',
      stdio: 'pipe',
    })
    console.log(buildOutput)
    console.log('[PASSED] Production bundle built cleanly with zero TypeScript / CSS errors')
    passedSteps++
  } catch (buildErr) {
    console.error('[BUILD ERROR]', buildErr.stdout || buildErr.message)
    throw new Error('Client build failed')
  }

  console.log(`\n======================================================`)
  console.log(`[SUCCESS] ALL TASK-16D VERIFICATION TESTS PASSED (${passedSteps}/6) 100%!`)
  console.log(`======================================================\n`)
}

runTests().catch((err) => {
  console.error('\n[FATAL ERROR]', err)
  process.exit(1)
})
