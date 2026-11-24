import { NextResponse } from 'next/server';
import { ZodError } from 'zod/v4';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

/** Wraps a route handler so every error leaves in the same `{ error: { code, message } }` shape. */
export function handle(fn: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    try {
      return await fn(req);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.status });
      }
      if (err instanceof ZodError) {
        const first = err.issues[0];
        const where = first?.path.length ? `${first.path.join('.')}: ` : '';
        return NextResponse.json(
          { error: { code: 'VALIDATION_FAILED', message: `${where}${first?.message ?? 'Some fields are invalid.'}` } },
          { status: 400 }
        );
      }
      console.error(err);
      return NextResponse.json({ error: { code: 'INTERNAL', message: 'Something went wrong.' } }, { status: 500 });
    }
  };
}

/** Best-effort client key for rate limiting; behind a proxy the first forwarded address wins. */
export function clientKey(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'local';
}

export function fileResponse(buffer: Buffer, fileName: string, contentType: string) {
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  });
}

export const CONTENT_TYPES = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
} as const;
