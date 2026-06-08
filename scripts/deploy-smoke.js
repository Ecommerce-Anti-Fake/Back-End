const baseUrl = process.env.DEPLOY_SMOKE_BASE_URL ?? process.env.API_BASE_URL ?? 'http://127.0.0.1:3001';
const healthUrl = new URL('/api/health', baseUrl).toString();

async function run() {
  const response = await fetch(healthUrl, {
    headers: {
      'x-request-id': 'deploy-smoke',
    },
  });

  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
  }

  const body = await response.json();
  if (body.status !== 'ok' || body.service !== 'api-gateway') {
    throw new Error(`Unexpected health payload: ${JSON.stringify(body)}`);
  }

  console.log(
    JSON.stringify(
      {
      ok: true,
      healthUrl,
      status: body.status,
      service: body.service,
      timestamp: body.timestamp,
      },
      null,
      2,
    ),
  );
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
