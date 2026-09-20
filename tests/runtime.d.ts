// Deno is supplied by Supabase Edge Runtime; test runner stubs only its environment API.
declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): void;
};
