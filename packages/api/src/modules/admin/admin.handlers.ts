import type { FastifyRequest, FastifyReply } from 'fastify';
import { ForbiddenError } from '../../lib/errors.js';
import { AccessReconciliationJob } from '../../jobs/reconciliation.js';
import { getReconciliationStatus, updateReconciliationStatus } from '../../jobs/scheduler.js';

export async function reconcileHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = await request.server.prisma.user.findUnique({
    where: { id: request.user!.userId },
  });

  if (!user?.isAdmin) {
    throw new ForbiddenError('Admin access required');
  }

  const job = new AccessReconciliationJob(
    request.server.prisma,
    request.server.github,
    request.log
  );

  try {
    const result = await job.run();
    updateReconciliationStatus(result);
    return reply.send(result);
  } catch (error) {
    updateReconciliationStatus(
      { orgsChecked: 0, reposChecked: 0, driftsFound: 0, corrections: [] },
      String(error)
    );
    throw error;
  }
}

export async function getReconciliationStatusHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = await request.server.prisma.user.findUnique({
    where: { id: request.user!.userId },
  });

  if (!user?.isAdmin) {
    throw new ForbiddenError('Admin access required');
  }

  return reply.send(getReconciliationStatus());
}
