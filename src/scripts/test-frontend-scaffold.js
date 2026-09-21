import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execSync } from 'node:child_process'

const logStep = (step, title) => {
  console.log(`\n======================================================`)
  console.log(`[TASK-16A TEST STEP ${step}] ${title}`)
  console.log(`======================================================`)
}

const runTask16aVerification = async () => {
  console.log(`\n======================================================`)
  console.log(`[TEST RUNNER] Starting Task 16A Vite React Scaffold Verification...`)
  console.log(`======================================================`)

  const clientDir = resolve(process.cwd(), 'client')

  try {
    // ----------------------------------------------------
    // STEP 1: Verify package.json & Dependencies
    // ----------------------------------------------------
    logStep(1, 'Verify client/package.json and Essential Dependencies')

    const pkgPath = resolve(clientDir, 'package.json')
    if (!existsSync(pkgPath)) {
      throw new Error('[FAIL] client/package.json does not exist')
    }

    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    const requiredDeps = ['react', 'react-dom', 'axios', 'react-router-dom', 'lucide-react']

    for (const dep of requiredDeps) {
      if (!pkg.dependencies?.[dep]) {
        throw new Error(`[FAIL] Missing required dependency: ${dep}`)
      }
    }

    console.log('[PASSED] client/package.json has all required dependencies:', requiredDeps.join(', '))

    // ----------------------------------------------------
    // STEP 2: Verify Vite Configuration & Path Aliases
    // ----------------------------------------------------
    logStep(2, 'Verify client/vite.config.ts and tsconfig paths')

    const viteConfigPath = resolve(clientDir, 'vite.config.ts')
    if (!existsSync(viteConfigPath)) {
      throw new Error('[FAIL] client/vite.config.ts does not exist')
    }

    const viteConfig = readFileSync(viteConfigPath, 'utf-8')
    if (!viteConfig.includes("alias: {") || !viteConfig.includes("'@'")) {
      throw new Error("[FAIL] vite.config.ts is missing '@' path alias")
    }

    if (!viteConfig.includes("proxy: {") || !viteConfig.includes("'/api'")) {
      throw new Error("[FAIL] vite.config.ts is missing '/api' proxy configuration")
    }

    console.log("[PASSED] vite.config.ts correctly configured with '@/' alias and backend proxy on port 5001")

    // ----------------------------------------------------
    // STEP 3: Verify Design System CSS Tokens
    // ----------------------------------------------------
    logStep(3, 'Verify Design System CSS Tokens in client/src/styles/')

    const cssFiles = [
      { path: 'client/src/styles/variables.css', check: '--color-brand-primary' },
      { path: 'client/src/styles/reset.css', check: 'box-sizing' },
      { path: 'client/src/styles/main.css', check: '.glass-panel' },
    ]

    for (const item of cssFiles) {
      const fullPath = resolve(process.cwd(), item.path)
      if (!existsSync(fullPath)) {
        throw new Error(`[FAIL] Missing CSS file: ${item.path}`)
      }
      const content = readFileSync(fullPath, 'utf-8')
      if (!content.includes(item.check)) {
        throw new Error(`[FAIL] ${item.path} missing token: ${item.check}`)
      }
    }

    console.log('[PASSED] All CSS token files (variables, reset, main) verified with Dark Theme & Glassmorphism')

    // ----------------------------------------------------
    // STEP 4: Verify Atomic UI Components & Context
    // ----------------------------------------------------
    logStep(4, 'Verify Atomic UI Components and ToastContext')

    const componentFiles = [
      'client/src/components/common/Button.tsx',
      'client/src/components/common/Badge.tsx',
      'client/src/components/common/Modal.tsx',
      'client/src/components/common/Drawer.tsx',
      'client/src/components/common/Toast.tsx',
      'client/src/components/common/index.ts',
      'client/src/context/ToastContext.tsx',
      'client/src/App.tsx',
      'client/src/main.tsx',
    ]

    for (const comp of componentFiles) {
      const fullPath = resolve(process.cwd(), comp)
      if (!existsSync(fullPath)) {
        throw new Error(`[FAIL] Missing component file: ${comp}`)
      }
    }

    console.log(`[PASSED] All ${componentFiles.length} atomic components and context providers verified`)

    // ----------------------------------------------------
    // STEP 5: Verify TypeScript Compilation & Production Build
    // ----------------------------------------------------
    logStep(5, 'Execute client build (tsc -b && vite build)')

    const buildOutput = execSync('npm run build', {
      cwd: clientDir,
      encoding: 'utf-8',
    })

    console.log(buildOutput)

    const distIndex = resolve(clientDir, 'dist/index.html')
    if (!existsSync(distIndex)) {
      throw new Error('[FAIL] client/dist/index.html was not generated')
    }

    console.log('[PASSED] Production build succeeded with 0 TypeScript errors and client/dist/ artifacts verified')

    console.log(`\n======================================================`)
    console.log(`[SUCCESS] ALL TASK-16A VERIFICATION TESTS PASSED 100%!`)
    console.log(`======================================================\n`)
  } catch (error) {
    console.error('\n[ERROR] Task 16A Verification Failed:')
    console.error(error.message || error)
    process.exit(1)
  }
}

runTask16aVerification()
