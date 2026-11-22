import { initialGameState, selectBrightness, useGame } from './state';

beforeEach(() => useGame.setState(initialGameState()));

it('kavanoz boşaltma Işık ekler ve bölge ışığını artırır', () => {
  const gain = useGame.getState().emptyJar(10);
  expect(gain).toBe(10);
  const s = useGame.getState();
  expect(s.light).toBe(10);
  expect(s.totalLight).toBe(10);
  expect(s.zoneLight[0]).toBe(10);
  expect(selectBrightness(s)).toBeGreaterThan(0);
});

it('boş kavanoz hiçbir şey değiştirmez', () => {
  expect(useGame.getState().emptyJar(0)).toBe(0);
  expect(useGame.getState().light).toBe(0);
});
