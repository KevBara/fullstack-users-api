import { describe, expect, it } from 'vitest';

import { exportUsersStream } from './export-users-use-case';

describe('exportUsersStream', () => {
  it('streams the header and all rows from a dataset larger than 5,000 users', async () => {
    async function* streamUsers() {
      for (let index = 0; index < 5_001; index += 1) {
        yield {
          id: `user-${index}`,
          name: `Usuario ${index}`,
          email: `user-${index}@example.com`,
          role: 'user' as const,
          active: true,
          createdAt: new Date(index).toISOString(),
        };
      }
    }

    const chunks: string[] = [];
    for await (const chunk of exportUsersStream({ streamAll: streamUsers })) {
      chunks.push(String(chunk));
    }

    const csvLines = chunks.join('').trimEnd().split('\n');
    expect(csvLines).toHaveLength(5_002);
    expect(csvLines[0]).toBe('id,name,email,role,active,createdAt');
    expect(csvLines[5_001]).toContain('user-5000');
  });
});