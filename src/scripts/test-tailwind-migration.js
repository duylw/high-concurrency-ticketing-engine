/**
 * test-tailwind-migration.js
 * Automated verification test for Task 16B.2:
 * Tailwind CSS Migration, Design Token Mapping & Clean UI Architecture Refactor
 */

import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '../..')
const clientDir = path.resolve(rootDir, 'client')

console.log('======================================================')
console.log('[TEST RUNNER] Starting Task 16B.2 Tailwind Migration Verification...')
console.log('======================================================')

let passedSteps = 0
const totalSteps = 5

// ----------------------------------------------------
// STEP 1: Verify Tailwind Tooling & Vite Plugin Config
// ----------------------------------------------------
console.log('\n======================================================')
console.log('[TASK-16B.2 TEST STEP 1] Verify Tailwind Tooling & Vite Plugin Config')
console.log('======================================================')

const viteConfigPath = path.resolve(clientDir, 'vite.config.ts')
const viteConfigContent = fs.readFileSync(viteConfigPath, 'utf8')
if (!viteConfigContent.includes('@tailwindcss/vite') || !viteConfigContent.includes('tailwindcss()')) {
  throw new Error('client/vite.config.ts must import and register @tailwindcss/vite plugin')
}

const cnPath = path.resolve(clientDir, 'src/utils/cn.ts')
if (!fs.existsSync(cnPath)) {
  throw new Error('client/src/utils/cn.ts does not exist')
}
const cnContent = fs.readFileSync(cnPath, 'utf8')
if (!cnContent.includes('twMerge') || !cnContent.includes('clsx')) {
  throw new Error('cn.ts must implement twMerge(clsx(inputs))')
}

const mainCssPath = path.resolve(clientDir, 'src/styles/main.css')
const mainCssContent = fs.readFileSync(mainCssPath, 'utf8')
if (!mainCssContent.includes('@import "tailwindcss";') || !mainCssContent.includes('@theme')) {
  throw new Error('main.css must import tailwindcss and declare @theme design tokens')
}

console.log('[PASSED] Tailwind v4 Vite plugin, cn helper and @theme design tokens verified')
passedSteps++

// ----------------------------------------------------
// STEP 2: Verify CVA Base Components
// ----------------------------------------------------
console.log('\n======================================================')
console.log('[TASK-16B.2 TEST STEP 2] Verify CVA Base Components (Button, Badge)')
console.log('======================================================')

const buttonPath = path.resolve(clientDir, 'src/components/common/Button.tsx')
const buttonContent = fs.readFileSync(buttonPath, 'utf8')
if (!buttonContent.includes('cva(') || !buttonContent.includes('cn(') || !buttonContent.includes('buttonVariants')) {
  throw new Error('Button.tsx must implement CVA buttonVariants with cn() helper')
}

const badgePath = path.resolve(clientDir, 'src/components/common/Badge.tsx')
const badgeContent = fs.readFileSync(badgePath, 'utf8')
if (!badgeContent.includes('cva(') || !badgeContent.includes('cn(') || !badgeContent.includes('badgeVariants')) {
  throw new Error('Badge.tsx must implement CVA badgeVariants with cn() helper')
}

console.log('[PASSED] Button.tsx and Badge.tsx properly modernized with CVA and cn()')
passedSteps++

// ----------------------------------------------------
// STEP 3: Verify Zero Inline Styles in client/src/
// ----------------------------------------------------
console.log('\n======================================================')
console.log('[TASK-16B.2 TEST STEP 3] Verify Zero Inline Styles Across client/src/')
console.log('======================================================')

function getFilesRecursively(dir, extensions = ['.tsx', '.ts']) {
  let results = []
  const list = fs.readdirSync(dir)
  for (const file of list) {
    const filePath = path.resolve(dir, file)
    const stat = fs.statSync(filePath)
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(filePath, extensions))
    } else if (extensions.some((ext) => file.endsWith(ext))) {
      results.push(filePath)
    }
  }
  return results
}

const allSrcFiles = getFilesRecursively(path.resolve(clientDir, 'src'), ['.tsx'])
const filesWithInlineStyles = []

for (const filePath of allSrcFiles) {
  const content = fs.readFileSync(filePath, 'utf8')
  if (content.includes('style={{')) {
    filesWithInlineStyles.push(path.relative(clientDir, filePath))
  }
}

if (filesWithInlineStyles.length > 0) {
  throw new Error(
    `Found lingering inline styles (style={{) in: ${filesWithInlineStyles.join(', ')}`
  )
}

console.log(`[PASSED] Scanned ${allSrcFiles.length} React components: Exactly 0 inline styles found!`)
passedSteps++

// ----------------------------------------------------
// STEP 4: Verify Decoupled Router & Dev Testing Page
// ----------------------------------------------------
console.log('\n======================================================')
console.log('[TASK-16B.2 TEST STEP 4] Verify Decoupled App Router & DevTestingPage')
console.log('======================================================')

const appPath = path.resolve(clientDir, 'src/App.tsx')
const appContent = fs.readFileSync(appPath, 'utf8')
const appLines = appContent.split('\n').length

if (appLines > 100) {
  throw new Error(`App.tsx is too bloated (${appLines} lines). Must be under 100 lines.`)
}

const devTestingPath = path.resolve(clientDir, 'src/pages/DevTestingPage.tsx')
if (!fs.existsSync(devTestingPath)) {
  throw new Error('client/src/pages/DevTestingPage.tsx does not exist')
}

const homePath = path.resolve(clientDir, 'src/pages/HomePage.tsx')
if (!fs.existsSync(homePath)) {
  throw new Error('client/src/pages/HomePage.tsx does not exist')
}

console.log(`[PASSED] App.tsx is ultra-clean (${appLines} lines) with decoupled /dev route and HomePage`)
passedSteps++

// ----------------------------------------------------
// STEP 5: Verify Production Client Build (tsc -b && vite build)
// ----------------------------------------------------
console.log('\n======================================================')
console.log('[TASK-16B.2 TEST STEP 5] Execute Client Production Build (tsc -b && vite build)')
console.log('======================================================')

try {
  const buildOutput = execSync('npm run build', {
    cwd: clientDir,
    encoding: 'utf8',
    stdio: 'pipe',
  })
  console.log(buildOutput)
  console.log('[PASSED] Production bundle built cleanly with zero TypeScript / CSS errors')
  passedSteps++
} catch (err) {
  console.error('[ERROR] Build failed:', err.stdout || err.stderr || err.message)
  throw new Error('Client production build failed')
}

console.log('\n======================================================')
console.log(`[SUCCESS] ALL TASK-16B.2 TESTS PASSED (${passedSteps}/${totalSteps}) 100%!`)
console.log('======================================================\n')
