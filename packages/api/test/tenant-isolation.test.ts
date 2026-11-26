import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Types } from 'mongoose';
import { buildTenantQuery, assertTenantOwnership } from '../src/middleware/tenant-guard';
import type { JwtPayload } from '../src/types';

describe('Tenant Isolation & IDOR Protection', () => {
  const entityA = new Types.ObjectId().toString();
  const entityB = new Types.ObjectId().toString();

  const managerUserA: JwtPayload = {
    userId: new Types.ObjectId().toString(),
    role: 'BWG_MANAGER',
    entityId: entityA,
    facilityId: new Types.ObjectId().toString(),
  };

  const supremeHeadUser: JwtPayload = {
    userId: new Types.ObjectId().toString(),
    role: 'SUPREME_HEAD',
    entityId: entityA,
  };

  it('buildTenantQuery scopes non-Supreme Head queries strictly to user.entityId', () => {
    const query = buildTenantQuery(managerUserA, { status: 'ACTIVE' });
    assert.strictEqual(query.status, 'ACTIVE');
    assert.strictEqual(String(query.entityId), entityA);
  });

  it('buildTenantQuery allows Supreme Head to query across all entities', () => {
    const query = buildTenantQuery(supremeHeadUser, { status: 'ACTIVE' });
    assert.strictEqual(query.status, 'ACTIVE');
    assert.strictEqual(query.entityId, undefined);
  });

  it('assertTenantOwnership allows same-tenant access', () => {
    let sentCode = 0;
    const mockReply: any = {
      code: (c: number) => {
        sentCode = c;
        return { send: () => {} };
      },
    };

    const allowed = assertTenantOwnership(managerUserA, entityA, mockReply, 'Compost Box');
    assert.strictEqual(allowed, true);
    assert.strictEqual(sentCode, 0);
  });

  it('assertTenantOwnership denies cross-tenant access with 403 Forbidden', () => {
    let sentCode = 0;
    let sentBody: any = null;
    const mockReply: any = {
      code: (c: number) => {
        sentCode = c;
        return {
          send: (body: any) => {
            sentBody = body;
          },
        };
      },
    };

    const allowed = assertTenantOwnership(managerUserA, entityB, mockReply, 'Compost Box');
    assert.strictEqual(allowed, false);
    assert.strictEqual(sentCode, 403);
    assert.strictEqual(sentBody?.error, 'Forbidden');
  });

  it('assertTenantOwnership allows Supreme Head global oversight across any entity', () => {
    const mockReply: any = {
      code: () => ({ send: () => {} }),
    };

    const allowed = assertTenantOwnership(supremeHeadUser, entityB, mockReply, 'Compost Box');
    assert.strictEqual(allowed, true);
  });
});
