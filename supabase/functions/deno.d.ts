// supabase/functions/deno.d.ts
// Declaraciones de tipos para Supabase Edge Functions ejecutadas en runtime Deno

declare module "https://*" {
  const content: any;
  export default content;
  export const createClient: any;
}

declare module "jsr:*" {
  const content: any;
  export default content;
}

declare namespace Deno {
  interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
  }
  const env: Env;
  function serve(handler: (req: Request) => Response | Promise<Response>): void;
}
