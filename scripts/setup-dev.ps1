# 🚀 Quick Setup Script for TaskFlow

Write-Host "🚀 TaskFlow Development Setup" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env.local exists
if (!(Test-Path ".env.local")) {
    Write-Host "📝 Creating .env.local from template..." -ForegroundColor Yellow
    Copy-Item ".env.local.example" ".env.local"
    Write-Host "✅ .env.local created!" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: Edit .env.local and add your actual credentials!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Required values:" -ForegroundColor Yellow
    Write-Host "  - NEXT_PUBLIC_SUPABASE_URL" -ForegroundColor White
    Write-Host "  - NEXT_PUBLIC_SUPABASE_ANON_KEY" -ForegroundColor White
    Write-Host "  - NEXT_PUBLIC_EDGE_URL" -ForegroundColor White
    Write-Host ""
    
    # Open .env.local in default editor
    $response = Read-Host "Would you like to edit .env.local now? (y/n)"
    if ($response -eq "y") {
        notepad .env.local
    }
} else {
    Write-Host "✅ .env.local already exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "📦 Checking dependencies..." -ForegroundColor Cyan

# Check if node_modules exists
if (!(Test-Path "node_modules")) {
    Write-Host "📥 Installing dependencies with pnpm..." -ForegroundColor Yellow
    pnpm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Dependencies installed successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Dependencies already installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "🔍 Validating environment..." -ForegroundColor Cyan
node scripts/check-env.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=================================" -ForegroundColor Cyan
    Write-Host "✨ Setup Complete!" -ForegroundColor Green
    Write-Host "=================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🎯 Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Make sure your .env.local has correct values" -ForegroundColor White
    Write-Host "  2. Run: pnpm dev" -ForegroundColor White
    Write-Host "  3. Open: http://localhost:3000" -ForegroundColor White
    Write-Host ""
    
    $response = Read-Host "Would you like to start the dev server now? (y/n)"
    if ($response -eq "y") {
        Write-Host ""
        Write-Host "🚀 Starting development server..." -ForegroundColor Green
        pnpm dev
    }
} else {
    Write-Host ""
    Write-Host "⚠️  Please fix the environment issues above" -ForegroundColor Yellow
    Write-Host "   Edit .env.local with your actual credentials" -ForegroundColor White
    Write-Host "   Then run: pnpm check-env" -ForegroundColor White
}
