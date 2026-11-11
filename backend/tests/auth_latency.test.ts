import { EventEmitter } from 'events';
import { Readable } from 'stream';
import app, { transporter } from '../src/index';
import { syncStoreFromDB } from '../src/usersStore';

interface MockHttpResult {
  status: number;
  headers: Record<string, any>;
  body: any;
  text: string;
}

function invokeApp(
  method: string,
  url: string,
  payload?: Record<string, any>
): Promise<MockHttpResult> {
  return new Promise((resolve, reject) => {
    const raw = payload ? JSON.stringify(payload) : '';
    const req: any = Readable.from(raw ? [raw] : []);
    req.method = method.toUpperCase();
    req.url = url;
    req.originalUrl = url;
    req.headers = {
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(raw).toString(),
      host: 'localhost:3000',
    };
    req.socket = { remoteAddress: '127.0.0.1' };
    req.connection = req.socket;

    const chunks: Buffer[] = [];
    const res: any = new EventEmitter();
    res.statusCode = 200;
    res.locals = {};
    res._headers = {} as Record<string, any>;
    res.setHeader = (k: string, v: any) => {
      res._headers[k.toLowerCase()] = v;
      return res;
    };
    res.getHeader = (k: string) => res._headers[k.toLowerCase()];
    res.getHeaders = () => res._headers;
    res.hasHeader = (k: string) => k.toLowerCase() in res._headers;
    res.removeHeader = (k: string) => {
      delete res._headers[k.toLowerCase()];
    };
    res.writeHead = (code: number, headers?: Record<string, any>) => {
      res.statusCode = code;
      if (headers) {
        for (const [k, v] of Object.entries(headers)) {
          res.setHeader(k, v);
        }
      }
      return res;
    };
    res.write = (chunk: any) => {
      if (chunk !== undefined && chunk !== null) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      }
      return true;
    };
    res.end = (chunk?: any) => {
      if (chunk !== undefined && chunk !== null) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      }
      const text = Buffer.concat(chunks).toString('utf8');
      let parsed: any = text;
      try {
        parsed = JSON.parse(text);
      } catch {
        // Keep raw text for non-JSON responses
      }
      resolve({
        status: res.statusCode,
        headers: res._headers,
        body: parsed,
        text,
      });
      res.emit('finish');
      return res;
    };

    try {
      (app as any)(req, res, (err: any) => {
        if (err) reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}

describe('Auth Login & MFA Non-Blocking Latency', () => {
  beforeAll(async () => {
    await syncStoreFromDB().catch(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns MFA challenge immediately without waiting for slow SMTP transport', async () => {
    const delayedMail = jest
      .spyOn(transporter, 'sendMail')
      .mockImplementation(
        () =>
          new Promise((resolve) => {
            const timer = setTimeout(() => resolve({ messageId: 'slow-smtp-ok' } as any), 4000);
            timer.unref?.();
          })
      );

    const startedAt = Date.now();
    const res = await invokeApp('POST', '/api/auth/login', {
      email: 'support@renu-biome.com',
      password: 'admin',
    });
    const elapsedMs = Date.now() - startedAt;

    expect(res.status).toBe(200);
    expect(res.body.mfaRequired).toBe(true);
    expect(res.body.email).toBe('support@renu-biome.com');
    expect(elapsedMs).toBeLessThan(1500);
    expect(delayedMail.mock.calls.length).toBeLessThanOrEqual(1);
  });

  it('resend-mfa also responds immediately even when SMTP transport stalls', async () => {
    jest
      .spyOn(transporter, 'sendMail')
      .mockImplementation(
        () =>
          new Promise((resolve) => {
            const timer = setTimeout(() => resolve({ messageId: 'slow-resend-ok' } as any), 4000);
            timer.unref?.();
          })
      );

    const startedAt = Date.now();
    const res = await invokeApp('POST', '/api/auth/resend-mfa', {
      email: 'support@renu-biome.com',
    });
    const elapsedMs = Date.now() - startedAt;

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(elapsedMs).toBeLessThan(1500);
  });
});
