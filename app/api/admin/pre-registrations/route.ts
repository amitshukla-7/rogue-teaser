import { NextResponse } from 'next/server';
import { getPreRegistrations } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const authHeader = req.headers.get('x-admin-key');
    const queryKey = url.searchParams.get('key');
    const adminSecret = process.env.ADMIN_SECRET_KEY;

    // Strict Authorization check
    if (!adminSecret || (authHeader !== adminSecret && queryKey !== adminSecret)) {
      return NextResponse.json({ error: 'Unauthorized access. Valid admin credentials required.' }, { status: 401 });
    }

    const list = await getPreRegistrations();

    if (url.searchParams.get('export') === 'csv') {
      let csv = 'Position,Name,Email,Signup Date,Badge\n';
      list.forEach((item: any) => {
        csv += `"${item.position}","${item.name}","${item.email}","${item.created_at}","${item.founder_badge}"\n`;
      });

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="campusconnect_preregistrations.csv"'
        }
      });
    }

    return NextResponse.json(list);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch pre-registrations' }, { status: 500 });
  }
}
