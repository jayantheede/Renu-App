/**
 * Health check & uptime telemetry monitor script for ReNu-Biome Grower Portal
 * Pings https://app.renu-biome.com/health and https://biome-app1.onrender.com/health
 */

const TARGETS = [
  'https://app.renu-biome.com/health',
  'https://biome-app1.onrender.com/health'
];

async function checkHealth() {
  console.log(`[Health Monitor] Running health check at ${new Date().toISOString()}`);
  for (const url of TARGETS) {
    try {
      const start = Date.now();
      const res = await fetch(url, { headers: { 'User-Agent': 'ReNu-Biome-Monitor/1.0' } });
      const latency = Date.now() - start;
      if (res.ok) {
        const body = await res.json().catch(() => ({}));
        console.log(`✓ ${url} -> HTTP ${res.status} OK (${latency}ms) - Status: ${body.status || 'OK'}`);
      } else {
        console.warn(`⚠ ${url} returned HTTP ${res.status} (${latency}ms)`);
      }
    } catch (err: any) {
      console.error(`✗ ${url} connection failed: ${err.message}`);
    }
  }
}

checkHealth();
