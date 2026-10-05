import { NextResponse } from 'next/server';
import { ZodError, type ZodTypeAny, type z } from 'zod';
import { auth } from '@/lib/auth';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string[] | undefined>
  ) {
    super(message);
  }
}

export const notFound = (what = 'Resource') => new ApiError(404, 'NOT_FOUND', `${what} not found.`);

/** Wraps a route handler so every error leaves in the same `{ error: { code, message, fields } }` shape. */
export function handle<C>(fn: (req: Request, ctx: C) => Promise<Response>) {
  return async (req: Request, ctx: C): Promise<Response> => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: { code: err.code, message: err.message, fields: err.fields } }, { status: err.status });
      }
      if (err instanceof ZodError) {
        const flat = err.flatten();
        return NextResponse.json(
          { error: { code: 'VALIDATION_FAILED', message: flat.formErrors[0] ?? 'Some fields are invalid.', fields: flat.fieldErrors } },
          { status: 400 }
        );
      }
      console.error(err);
      return NextResponse.json({ error: { code: 'INTERNAL', message: 'Something went wrong.' } }, { status: 500 });
    }
  };
}

/** Every query in a handler is scoped by the id this returns, never by an id from the request body. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new ApiError(401, 'UNAUTHENTICATED', 'Please sign in.');
  return session.user;
}

export async function readJson<S extends ZodTypeAny>(req: Request, schema: S): Promise<z.output<S>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, 'BAD_JSON', 'Request body must be JSON.');
  }
  return schema.parse(body);
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
