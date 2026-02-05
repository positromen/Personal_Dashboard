import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
    try {
        // Path to the SQLite database file
        const dbPath = join(process.cwd(), 'prisma', 'dev.db');

        // Read the database file
        const dbBuffer = await readFile(dbPath);

        // Create filename with current date
        const date = new Date().toISOString().split('T')[0];
        const filename = `nexus_database_backup_${date}.db`;

        // Return the file as a download
        return new NextResponse(dbBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/x-sqlite3',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': dbBuffer.length.toString(),
            },
        });
    } catch (error) {
        console.error('Database export error:', error);
        return NextResponse.json(
            { error: 'Failed to export database' },
            { status: 500 }
        );
    }
}
