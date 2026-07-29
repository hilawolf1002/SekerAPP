import { PointTransactionType } from '@prisma/client';
import { dal } from '../../2-utils/dal';

export async function getPointsSummary(
  userId: string,
  options?: { skip?: number; take?: number }
) {
  const skip = options?.skip ?? 0;
  const take = options?.take ?? 10;

  const [aggregate, transactions, total] = await Promise.all([
    dal.pointTransaction.aggregate({
      where: { userId },
      _sum: { amount: true },
    }),
    dal.pointTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        amount: true,
        type: true,
        note: true,
        referenceId: true,
        createdAt: true,
      },
    }),
    dal.pointTransaction.count({ where: { userId } }),
  ]);

  return {
    balance: aggregate._sum.amount ?? 0,
    transactions,
    total,
    skip,
    take,
  };
}

export function transactionTypeLabel(type: PointTransactionType): string {
  switch (type) {
    case 'SURVEY_COMPLETION':
      return 'מענה לסקר';
    case 'JOIN_BONUS':
      return 'בונוס הצטרפות';
    case 'REFERRAL_BONUS':
      return 'בונוס חבר מביא חבר';
    case 'GIFT_REDEMPTION':
      return 'מימוש נקודות';
    case 'ADJUSTMENT':
      return 'עדכון ידני';
    default:
      return type;
  }
}
