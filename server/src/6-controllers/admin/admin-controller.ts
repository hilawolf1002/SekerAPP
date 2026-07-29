import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../3-middleware/auth-middleware';
import { validateBody } from '../../3-middleware/validate-middleware';
import {
  getAllUsers,
  getPendingResponders,
  getResponderDetails,
  getIdDocumentPreview,
  approveResponder,
  rejectResponder,
  blockUser,
  getSystemStats,
} from '../../5-logic/admin/admin-logic';
import {
  getOrCreateSettings,
  updateSettings,
  listGiftOptions,
  createGiftOption,
  updateGiftOption,
  addGiftCoupons,
  listAllRedemptions,
  setUserStatus,
  fulfillRedemption,
  rejectRedemption,
  getRedemptionIdDocument,
} from '../../5-logic/admin/settings-redemption-logic';
import {
  updateSettingsSchema,
  createGiftOptionSchema,
  updateGiftOptionSchema,
  addGiftCouponsSchema,
  setUserStatusSchema,
  fulfillRedemptionSchema,
  createTagSchema,
  setUserTagsSchema,
} from '../../4-models/admin-schemas';
import {
  listTags,
  createTag,
  deleteTag,
  setUserTags,
  countAudienceByTags,
} from '../../5-logic/admin/tags-logic';
import { resyncAllDemographicTags } from '../../5-logic/admin/auto-tag-logic';
import { parsePagination } from '../../2-utils/pagination';
import { dal } from '../../2-utils/dal';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/stats', async (_req, res, next) => {
  try {
    const stats = await getSystemStats();
    res.json({ success: true, stats });
  } catch (error) {
    next(error);
  }
});

router.get('/users', async (req, res, next) => {
  try {
    const { status, role, search } = req.query;
    const { skip, take } = parsePagination(req.query, {
      defaultTake: 20,
      maxTake: 50,
    });
    const result = await getAllUsers({
      status: status as string | undefined,
      role: role as string | undefined,
      search: search as string | undefined,
      skip,
      take,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

router.get('/responders/pending', async (_req, res, next) => {
  try {
    const responders = await getPendingResponders();
    res.json({ success: true, responders });
  } catch (error) {
    next(error);
  }
});

router.get('/responders/:id', async (req, res, next) => {
  try {
    const details = await getResponderDetails(req.params.id);
    res.json({ success: true, ...details });
  } catch (error) {
    next(error);
  }
});

router.get('/responders/:id/id-document', async (req, res, next) => {
  try {
    const document = await getIdDocumentPreview(req.params.id);
    res.json({ success: true, document });
  } catch (error) {
    next(error);
  }
});

router.post('/responders/:id/approve', async (req, res, next) => {
  try {
    const result = await approveResponder(req.params.id);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

router.post('/responders/:id/reject', async (req, res, next) => {
  try {
    const { sendSms, reason } = req.body || {};
    const result = await rejectResponder(req.params.id, { sendSms, reason });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

router.post('/users/:id/block', async (req, res, next) => {
  try {
    const { reason } = req.body || {};
    const result = await blockUser(req.params.id, reason);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/users/:id/status',
  validateBody(setUserStatusSchema),
  async (req, res, next) => {
    try {
      const userId = req.params.id;
      const { status, reason } = req.body;

      const existing = await dal.user.findUnique({
        where: { id: userId },
        select: { status: true },
      });

      if (status === 'APPROVED' && existing?.status === 'PENDING_APPROVAL') {
        const result = await approveResponder(userId);
        res.json({ success: true, ...result });
        return;
      }

      if (status === 'REJECTED' && existing?.status === 'PENDING_APPROVAL') {
        const result = await rejectResponder(userId, {
          sendSms: true,
          reason,
        });
        res.json({ success: true, ...result });
        return;
      }

      const result = await setUserStatus(userId, status, reason);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/settings', async (_req, res, next) => {
  try {
    const settings = await getOrCreateSettings();
    res.json({ success: true, settings });
  } catch (error) {
    next(error);
  }
});

router.patch(
  '/settings',
  validateBody(updateSettingsSchema),
  async (req, res, next) => {
    try {
      const settings = await updateSettings(req.body);
      res.json({ success: true, settings, message: 'ההגדרות נשמרו' });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/gifts', async (_req, res, next) => {
  try {
    const gifts = await listGiftOptions({ includeInactive: true });
    res.json({ success: true, gifts });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/gifts',
  validateBody(createGiftOptionSchema),
  async (req, res, next) => {
    try {
      const gift = await createGiftOption(req.body);
      res.status(201).json({ success: true, gift });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/gifts/:id',
  validateBody(updateGiftOptionSchema),
  async (req, res, next) => {
    try {
      const gift = await updateGiftOption(req.params.id, req.body);
      res.json({ success: true, gift });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/gifts/:id/coupons',
  validateBody(addGiftCouponsSchema),
  async (req, res, next) => {
    try {
      const result = await addGiftCoupons(req.params.id, req.body);
      res.status(201).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
);

/** GET /api/admin/tags – רשימת תגיות קהל */
router.get('/tags', async (_req, res, next) => {
  try {
    const tags = await listTags();
    res.json({ success: true, tags });
  } catch (error) {
    next(error);
  }
});

/** GET /api/admin/tags/audience-count?tagIds=id1,id2&surveyId=… – ספירת קהל ייחודי */
router.get('/tags/audience-count', async (req, res, next) => {
  try {
    const raw = String(req.query.tagIds || '');
    const tagIds = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const surveyId =
      typeof req.query.surveyId === 'string' && req.query.surveyId
        ? req.query.surveyId
        : undefined;
    const result = await countAudienceByTags(tagIds, { surveyId });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

/** POST /api/admin/tags/resync-demographics – סנכרון תגיות מרישום לכל העונים */
router.post('/tags/resync-demographics', async (_req, res, next) => {
  try {
    const result = await resyncAllDemographicTags();
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

/** POST /api/admin/tags – יצירת תגית */
router.post('/tags', validateBody(createTagSchema), async (req, res, next) => {
  try {
    const tag = await createTag(req.body.name);
    res.status(201).json({ success: true, tag });
  } catch (error) {
    next(error);
  }
});

/** DELETE /api/admin/tags/:tagId */
router.delete('/tags/:tagId', async (req, res, next) => {
  try {
    const result = await deleteTag(req.params.tagId);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

/** POST /api/admin/users/:userId/tags – שיוך תגיות לעונה (החלפה מלאה) */
router.post(
  '/users/:userId/tags',
  validateBody(setUserTagsSchema),
  async (req, res, next) => {
    try {
      const tags = await setUserTags(req.params.userId, req.body.tagIds);
      res.json({ success: true, tags });
    } catch (error) {
      next(error);
    }
  }
);

/** GET /api/admin/redemptions – כל הפניות (PENDING + היסטוריה) */
router.get('/redemptions', async (req, res, next) => {
  try {
    const { skip, take } = parsePagination(req.query, { defaultTake: 20 });
    const result = await listAllRedemptions({ skip, take });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

/** GET /api/admin/redemptions/:id/id-document – תצוגת ת.ז. לאדמין */
router.get('/redemptions/:id/id-document', async (req, res, next) => {
  try {
    const document = await getRedemptionIdDocument(req.params.id);
    res.json({ success: true, document });
  } catch (error) {
    next(error);
  }
});

/** POST /api/admin/redemptions/:id/fulfill – סימון כמטופל + מחיקת ת.ז. */
router.post(
  '/redemptions/:id/fulfill',
  validateBody(fulfillRedemptionSchema),
  async (req, res, next) => {
    try {
      const result = await fulfillRedemption(req.params.id, req.body.note);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
);

/** POST /api/admin/redemptions/:id/reject – דחיית פנייה + מחיקת ת.ז. */
router.post(
  '/redemptions/:id/reject',
  validateBody(fulfillRedemptionSchema),
  async (req, res, next) => {
    try {
      const result = await rejectRedemption(req.params.id, req.body.note);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
