import type { Prisma } from '@prisma/client';

type AccessUser = {
  id: string;
  firmId: string;
  role: string;
};

export function readCaseFilter(user: { firmId: string }): Prisma.CaseWhereInput {
  return { firmId: user.firmId };
}

export function writeCaseFilter(user: AccessUser): Prisma.CaseWhereInput {
  if (user.role === 'ADMIN') {
    return { firmId: user.firmId };
  }
  return {
    firmId: user.firmId,
    assignments: { some: { userId: user.id } },
  };
}

export function canWriteCase(
  user: AccessUser,
  caseRecord: { firmId: string; assignments?: Array<{ userId: string }> }
): boolean {
  if (caseRecord.firmId !== user.firmId) return false;
  if (user.role === 'ADMIN') return true;
  return !!caseRecord.assignments?.some((a) => a.userId === user.id);
}
