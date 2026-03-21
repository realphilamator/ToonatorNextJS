import { NextResponse } from 'next/server'
import { writeFileSync, readFileSync } from 'fs'
import { join } from 'path'

export async function GET() {
  const maintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true'
  return NextResponse.json({ maintenanceMode })
}

export async function POST(request) {
  try {
    const { enabled } = await request.json()
    
    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 })
    }
    
    // Update .env.local file
    const envPath = join(process.cwd(), '.env.local')
    let envContent = readFileSync(envPath, 'utf8')
    
    // Remove existing maintenance mode line if it exists
    envContent = envContent.split('\n').filter(line => !line.startsWith('NEXT_PUBLIC_MAINTENANCE_MODE=')).join('\n')
    
    // Add new maintenance mode line
    envContent += `\nNEXT_PUBLIC_MAINTENANCE_MODE=${enabled}`
    
    // Write back to file
    writeFileSync(envPath, envContent.trim() + '\n')
    
    return NextResponse.json({ 
      success: true, 
      maintenanceMode: enabled,
      message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`
    })
  } catch (error) {
    console.error('Error toggling maintenance mode:', error)
    return NextResponse.json({ error: 'Failed to toggle maintenance mode' }, { status: 500 })
  }
}
