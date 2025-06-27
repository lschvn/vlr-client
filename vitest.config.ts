import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.spec.ts'],
    mockReset: true,
    restoreMocks: true,

    /**
     * Use fake timers for all tests. This is required for predictable TTL
     * assertions and improves performance by mocking timer-related APIs.
     * @see https://vitest.dev/config/#faketimers
     */
    fakeTimers: {},
  },
});
