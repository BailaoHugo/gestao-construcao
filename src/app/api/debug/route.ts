export const dynamic = "force-dynamic";

export async function GET() {
  const dbUrl = process.env.DATABASE_URL
    ? process.env.DATABASE_URL.replace(/:([^:@]+)@/, ":***@")
    : "(não definido)";

  return Response.json({
    DATABASE_URL: dbUrl,
    NODE_ENV: process.env.NODE_ENV,
    env_keys: Object.keys(process.env).sort(),
  });
}
