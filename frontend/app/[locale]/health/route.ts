import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch('/api/health')
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { status: 'error', message: 'Бэкенд недоступен' },
      { status: 503 }
    )
  }
}