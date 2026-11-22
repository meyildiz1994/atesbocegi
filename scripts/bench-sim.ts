/**
 * Simülasyon adımının süresini ölçer (çizimsiz). Cihazdaki UI thread'den daha hızlıdır
 * ama değişikliklerin göreli etkisini görmek için yeterli.
 *   npm run bench -- 1500
 */
import { SIM } from '../src/config/balance';
import { countByStatus, createSimState, seedFireflies, STATUS_FREE, stepSimulation } from '../src/game/simulation';

const n = Number(process.argv[2] ?? 1500);
const W = 393;
const H = 852;
const s = createSimState(SIM.capacity, 99);
seedFireflies(s, n, W, H);
const steps = 3000;
const dt = 1 / 60;
let fx = 100;
const t0 = performance.now();
for (let k = 0; k < steps; k++) {
  fx = 60 + ((k * 4) % 280);
  stepSimulation(s, dt, {
    width: W, height: H, maxFireflies: n, spawnRate: 200, ringRadius: 120, jarCapacity: 1e9, jarCount: 0,
    jarX: W / 2, jarY: H - 104, fingerActive: true, fingerX: fx, fingerY: 300,
    spirits: 40, spiritSpeed: 70, magnetRange: 200, magnetPull: 90,
  });
}
const ms = (performance.now() - t0) / steps;
console.log(`${n} böcek: adım başına ${ms.toFixed(3)} ms (aktif ${countByStatus(s, STATUS_FREE)})`);
