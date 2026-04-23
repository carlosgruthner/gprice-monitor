import { NextResponse } from 'next/server';

export async function GET() {
  // Aqui pegamos a variável diretamente do processo do Node no Docker
  const config = {
    apiIp: process.env.EXTERNAL_API_IP || 'localhost',
    apiPort: process.env.EXTERNAL_API_PORT || '4000',
  };

  return NextResponse.json(config);
}