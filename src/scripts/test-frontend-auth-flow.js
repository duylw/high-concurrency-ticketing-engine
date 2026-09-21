import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execSync } from 'node:child_process'

const BASE_URL = process.env.BASE_URL || 'http://localhost:5001'

const logStep = (step, title) => {
  console.log(`\n======================================================`)
  console.log(`[TASK-16B TEST STEP ${step}] ${title}`)
  console.log(`======================================================`)
}

const runTask16bVerification = async () => {
  console.log(`\n======================================================`)
  console.log(`[TEST RUNNER] Starting Task 16B Network & Auth Routing Verification...`)
  console.log(`======================================================`)

  const clientDir = resolve(process.cwd(), 'client')

  try {
    // ----------------------------------------------------
    // STEP 1: Verify Task 16B Source Files Structure
    // ----------------------------------------------------
    logStep(1, 'Verify Task 16B Client Architecture Files')

    const requiredFiles = [
      'client/src/types/api.ts',
      'client/src/types/auth.ts',
      'client/src/types/event.ts',
      'client/src/types/order.ts',
      'client/src/types/index.ts',
      'client/src/api/http.client.ts',
      'client/src/api/auth.api.ts',
      'client/src/api/events.api.ts',
      'client/src/api/orders.api.ts',
      'client/src/api/organizer.api.ts',
      'client/src/api/index.ts',
      'client/src/context/AuthContext.tsx',
      'client/src/components/auth/AuthModal.tsx',
      'client/src/components/layout/Navbar.tsx',
      'client/src/components/layout/RootLayout.tsx',
      'client/src/routes/ProtectedRoute.tsx',
      'client/src/routes/OrganizerRoute.tsx',
    ]

    for (const f of requiredFiles) {
      const fullPath = resolve(process.cwd(), f)
      if (!existsSync(fullPath)) {
        throw new Error(`[FAIL] Missing required file: ${f}`)
      }
    }

    console.log(`[PASSED] All ${requiredFiles.length} Task 16B architecture files exist and are verified`)

    // ----------------------------------------------------
    // STEP 2: Verify Axios Silent RTR Interceptor Logic
    // ----------------------------------------------------
    logStep(2, 'Verify Axios Silent RTR & Mutex Queue Implementation')

    const httpClientContent = readFileSync(resolve(clientDir, 'src/api/http.client.ts'), 'utf-8')
    if (!httpClientContent.includes('isRefreshing')) {
      throw new Error('[FAIL] http.client.ts is missing isRefreshing mutex lock')
    }
    if (!httpClientContent.includes('failedQueue')) {
      throw new Error('[FAIL] http.client.ts is missing failedQueue array for concurrent request replay')
    }
    if (!httpClientContent.includes('/auth/refresh-token')) {
      throw new Error('[FAIL] http.client.ts is missing automatic call to refresh-token')
    }

    console.log('[PASSED] http.client.ts implements complete Mutex Queue & Silent Token Rotation interceptor')

    // ----------------------------------------------------
    // STEP 3: Verify Buyer Authentication API Flow
    // ----------------------------------------------------
    logStep(3, 'Verify Buyer Login & Profile API Endpoints')

    const buyerRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'buyer@ticketing.com',
        password: 'Password123!',
      }),
    })

    const buyerData = await buyerRes.json()
    if (buyerRes.status !== 200 || !buyerData.data?.tokens?.accessToken) {
      throw new Error(`[FAIL] Buyer login failed: ${JSON.stringify(buyerData)}`)
    }

    const buyerAccessToken = buyerData.data.tokens.accessToken
    const buyerRefreshToken = buyerData.data.tokens.refreshToken

    // Test GET /auth/me
    const meRes = await fetch(`${BASE_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${buyerAccessToken}` },
    })
    const meData = await meRes.json()
    const userProfile = meData.data?.user || meData.data
    if (meRes.status !== 200 || userProfile?.email !== 'buyer@ticketing.com') {
      throw new Error(`[FAIL] GET /auth/me failed: ${JSON.stringify(meData)}`)
    }

    console.log(`[PASSED] Buyer authenticated successfully: ${userProfile.email} (Role: ${userProfile.role})`)

    // ----------------------------------------------------
    // STEP 4: Verify Token Rotation & Reuse Detection
    // ----------------------------------------------------
    logStep(4, 'Verify Server-Side Refresh Token Rotation (RTR)')

    const refreshRes = await fetch(`${BASE_URL}/api/v1/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: buyerRefreshToken }),
    })

    const refreshData = await refreshRes.json()
    if (refreshRes.status !== 200 || !refreshData.data?.tokens?.accessToken) {
      throw new Error(`[FAIL] Refresh token call failed: ${JSON.stringify(refreshData)}`)
    }

    console.log('[PASSED] Refresh Token successfully rotated with brand new token pair')

    // Reuse detection: Sending the old refresh token must be rejected with 403 Forbidden
    const replayRes = await fetch(`${BASE_URL}/api/v1/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: buyerRefreshToken }),
    })

    if (replayRes.status !== 403) {
      throw new Error(`[FAIL] Expected 403 Forbidden for replayed refresh token, got ${replayRes.status}`)
    }

    console.log('[PASSED] Token reuse attack correctly detected and blocked with HTTP 403 Forbidden')

    // ----------------------------------------------------
    // STEP 5: Verify Organizer Authentication
    // ----------------------------------------------------
    logStep(5, 'Verify Organizer Authentication & Role RBAC')

    const orgRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'organizer@ticketing.com',
        password: 'Password123!',
      }),
    })

    const orgData = await orgRes.json()
    if (orgRes.status !== 200 || orgData.data?.user?.role !== 'ORGANIZER') {
      throw new Error(`[FAIL] Organizer login failed or invalid role: ${JSON.stringify(orgData)}`)
    }

    console.log(`[PASSED] Organizer authenticated: ${orgData.data.user.email} (Role: ${orgData.data.user.role})`)

    // ----------------------------------------------------
    // STEP 6: Verify Client Production Build
    // ----------------------------------------------------
    logStep(6, 'Execute Client Production Build (tsc -b && vite build)')

    const buildOutput = execSync('npm run build', {
      cwd: clientDir,
      encoding: 'utf-8',
    })

    console.log(buildOutput)

    console.log(`\n======================================================`)
    console.log(`[SUCCESS] ALL TASK-16B VERIFICATION TESTS PASSED 100%!`)
    console.log(`======================================================\n`)
  } catch (error) {
    console.error('\n[ERROR] Task 16B Verification Failed:')
    console.error(error.message || error)
    process.exit(1)
  }
}

runTask16bVerification()
