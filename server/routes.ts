import { Router, Request, Response, NextFunction } from "express";
import { authenticate, AuthenticatedRequest, requireAdmin, validateBody, logAdminAction } from "./middleware.ts";
import { dbQuery } from "./db.ts";
import {
  createProfileAndTrial,
  checkSubscriptionStatus,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  createGoal,
  updateGoal,
  deleteGoal,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  createHabit,
  logHabitCompletion,
  removeHabitLog,
  getHabitAnalytics,
  createStudyCourse,
  createStudySession,
  getStudyAnalytics,
  createRoadmap,
  createSkill,
  getRoadmapProgress,
  createExpense,
  createBudget,
  getBudgetAnalytics,
  createTimetable,
  createTimetableEntry,
  generateDailySnapshot,
  handleRazorpayWebhookSecure,
  verifyWebhookSignature
} from "./services.ts";

const router = Router();

// =========================================================================
// 12. RAZORPAY WEBHOOKS GATEWAY ENDPOINT (EXEMPT FROM Standard Auth)
// =========================================================================
router.post("/razorpay/webhook", async (req: Request, res: Response) => {
  const signature = req.headers["x-razorpay-signature"] as string;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (webhookSecret && signature) {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      console.warn("[Razorpay Security Warn] Received invalid Webhook Signature flag. Verification signature mismatch.");
      return res.status(400).json({ success: false, message: "Invalid webhook credentials signature." });
    }
  }

  try {
    const result = await handleRazorpayWebhookSecure(req.body);
    res.json(result);
  } catch (err: any) {
    console.error("[Razorpay Webhook handler crashed]:", err.message || err);
    res.status(500).json({ success: false, message: "Webhook handler failed internally." });
  }
});


// =========================================================================
// 1. TRANSACTIONAL REGISTRATION AUTH ENDPOINT
// =========================================================================
router.post("/auth/register", validateBody(["userId", "email"]), async (req: Request, res: Response, next: NextFunction) => {
  const { userId, email, fullName } = req.body;
  try {
    const result = await createProfileAndTrial(userId, email, fullName);
    res.status(201).json({
      success: true,
      message: "V2 Tenant Registration Complete. Active 7-day Trial established.",
      data: result
    });
  } catch (err) {
    next(err);
  }
});


// =========================================================================
// 2. SUBSCRIPTION VERIFIER ENDPOINT
// =========================================================================
router.get("/subscription/status", authenticate as any, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const status = await checkSubscriptionStatus(req.user!.id);
    res.json({ success: true, authorizationState: status });
  } catch (err) {
    next(err);
  }
});


// =========================================================================
// 3. LifeOS TASK MANAGER ENDPOINTS
// =========================================================================
router.get("/tasks", authenticate as any, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const filters = {
      status: req.query.status as string,
      priority_level: req.query.priority_level as string,
      eisenhower_quadrant: req.query.eisenhower_quadrant as string,
      quadrant: req.query.quadrant as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
    };

    const results = await getTasks(req.user!.id, filters);
    res.json({ success: true, ...results });
  } catch (err) {
    next(err);
  }
});

router.post("/tasks", authenticate as any, validateBody(["title"]), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Subscription block validation check
    const permissions = await checkSubscriptionStatus(req.user!.id);
    if (!permissions.canModify) {
      return res.status(403).json({ success: false, message: "Subscription expired. Your account is in Read Only Mode.", actionRequired: "UPGRADE" });
    }

    const task = await createTask(req.user!.id, req.body);
    res.status(201).json({ success: true, task });
  } catch (err) {
    next(err);
  }
});

router.patch("/tasks/:id", authenticate as any, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const permissions = await checkSubscriptionStatus(req.user!.id);
    if (!permissions.canModify) {
      return res.status(403).json({ success: false, message: "Read Only Mode dynamic active constraint.", actionRequired: "UPGRADE" });
    }

    const task = await updateTask(req.user!.id, req.params.id, req.body);
    res.json({ success: true, task });
  } catch (err) {
    next(err);
  }
});

router.delete("/tasks/:id", authenticate as any, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const permissions = await checkSubscriptionStatus(req.user!.id);
    if (!permissions.canModify) {
      return res.status(403).json({ success: false, message: "Read-only subscription limitation.", actionRequired: "UPGRADE" });
    }

    const outcome = await deleteTask(req.user!.id, req.params.id);
    res.json(outcome);
  } catch (err) {
    next(err);
  }
});


// =========================================================================
// 4. GOALS & DYNAMIC MILESTONES ENDPOINTS
// =========================================================================
router.post("/goals", authenticate as any, validateBody(["title"]), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const permissions = await checkSubscriptionStatus(req.user!.id);
    if (!permissions.canModify) {
      return res.status(403).json({ success: false, message: "Trial expired. Upgrade required." });
    }

    const goal = await createGoal(req.user!.id, req.body);
    res.status(201).json({ success: true, goal });
  } catch (err) {
    next(err);
  }
});

router.put("/goals/:id", authenticate as any, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const permissions = await checkSubscriptionStatus(req.user!.id);
    if (!permissions.canModify) return res.status(403).json({ success: false, message: "Expired profile barrier." });

    const goal = await updateGoal(req.user!.id, req.params.id, req.body);
    res.json({ success: true, goal });
  } catch (err) {
    next(err);
  }
});

router.delete("/goals/:id", authenticate as any, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const permissions = await checkSubscriptionStatus(req.user!.id);
    if (!permissions.canModify) return res.status(403).json({ success: false, message: "Expired profile barrier." });

    const result = await deleteGoal(req.user!.id, req.params.id);
    res.json({ success: true, message: "Goal cascade deleted successfully", ...result });
  } catch (err) {
    next(err);
  }
});

router.post("/goals/:goalId/milestones", authenticate as any, validateBody(["title"]), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const milestone = await createMilestone(req.params.goalId, req.body);
    res.status(201).json({ success: true, milestone });
  } catch (err) {
    next(err);
  }
});

router.put("/goals/:goalId/milestones/:milestoneId", authenticate as any, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const milestone = await updateMilestone(req.params.goalId, req.params.milestoneId, req.body);
    res.json({ success: true, milestone });
  } catch (err) {
    next(err);
  }
});

router.delete("/goals/:goalId/milestones/:milestoneId", authenticate as any, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await deleteMilestone(req.params.goalId, req.params.milestoneId);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});


// =========================================================================
// 5. HABIT ROUTER (STREAK ANALYSIS & LOGGING)
// =========================================================================
router.post("/habits", authenticate as any, validateBody(["name"]), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const habit = await createHabit(req.user!.id, req.body);
    res.status(201).json({ success: true, habit });
  } catch (err) {
    next(err);
  }
});

router.post("/habits/:id/log", authenticate as any, validateBody(["completed_date"]), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const outcome = await logHabitCompletion(req.user!.id, req.params.id, req.body.completed_date);
    res.json({ success: true, ...outcome });
  } catch (err) {
    next(err);
  }
});

router.delete("/habits/:id/log/:completed_date", authenticate as any, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const outcome = await removeHabitLog(req.user!.id, req.params.id, req.params.completed_date);
    res.json({ success: true, ...outcome });
  } catch (err) {
    next(err);
  }
});

router.get("/habits/analytics", authenticate as any, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const analytics = await getHabitAnalytics(req.user!.id);
    res.json({ success: true, analytics });
  } catch (err) {
    next(err);
  }
});


// =========================================================================
// 6. STUDY TRACKER ENDPOINTS
// =========================================================================
router.post("/study/courses", authenticate as any, validateBody(["name"]), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const course = await createStudyCourse(req.user!.id, req.body);
    res.status(201).json({ success: true, course });
  } catch (err) {
    next(err);
  }
});

router.post("/study/courses/:id/sessions", authenticate as any, validateBody(["duration_minutes", "topic"]), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const session = await createStudySession(req.params.id, req.body.duration_minutes, req.body.topic, req.body.notes);
    res.status(201).json({ success: true, session });
  } catch (err) {
    next(err);
  }
});

router.get("/study/analytics", authenticate as any, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const analytics = await getStudyAnalytics(req.user!.id);
    res.json({ success: true, analytics });
  } catch (err) {
    next(err);
  }
});


// =========================================================================
// 7. ROADMAPS & KNOWLEDGE SKILLS ENDPOINTS
// =========================================================================
router.post("/career/roadmaps", authenticate as any, validateBody(["title"]), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const roadmap = await createRoadmap(req.user!.id, req.body.title, req.body.description);
    res.status(201).json({ success: true, roadmap });
  } catch (err) {
    next(err);
  }
});

router.post("/career/roadmaps/:id/skills", authenticate as any, validateBody(["skill_name"]), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const skill = await createSkill(req.params.id, req.body.skill_name, req.body.proficiency_level);
    res.status(201).json({ success: true, skill });
  } catch (err) {
    next(err);
  }
});

router.get("/career/roadmaps/:id/progress", authenticate as any, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const progress = await getRoadmapProgress(req.params.id);
    res.json({ success: true, completionPercentage: progress });
  } catch (err) {
    next(err);
  }
});


// =========================================================================
// 8. BUDGETS & FINANCIAL PLANNERS ENDPOINTS
// =========================================================================
router.post("/finance/expenses", authenticate as any, validateBody(["amount", "category", "date"]), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const expense = await createExpense(req.user!.id, req.body);
    res.status(201).json({ success: true, expense });
  } catch (err) {
    next(err);
  }
});

router.post("/finance/budgets", authenticate as any, validateBody(["category", "amount", "month"]), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const budget = await createBudget(req.user!.id, req.body.category, req.body.amount, req.body.month);
    res.status(201).json({ success: true, budget });
  } catch (err) {
    next(err);
  }
});

router.get("/finance/analytics", authenticate as any, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const month = req.query.month as string || new Date().toISOString().split("T")[0].substring(0, 7) + "-01";
    const report = await getBudgetAnalytics(req.user!.id, month);
    res.json({ success: true, report });
  } catch (err) {
    next(err);
  }
});


// =========================================================================
// 9. TIMETABLES & TIMEBLOCKED SCHEDULES
// =========================================================================
router.post("/timetable", authenticate as any, validateBody(["title"]), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const timetable = await createTimetable(req.user!.id, req.body.title, req.body.type);
    res.status(201).json({ success: true, timetable });
  } catch (err) {
    next(err);
  }
});

router.post("/timetable/:id/entries", authenticate as any, validateBody(["day_of_week", "start_time", "end_time", "title"]), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const entry = await createTimetableEntry(req.params.id, req.body);
    res.status(201).json({ success: true, entry });
  } catch (err) {
    next(err);
  }
});


// =========================================================================
// 10. METRICS SNAPSHOT TRIGGER ENDPOINT
// =========================================================================
router.post("/analytics/snapshot", authenticate as any, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const snap = await generateDailySnapshot(req.user!.id);
    res.json({ success: true, snapshot: snap });
  } catch (err) {
    next(err);
  }
});

router.get("/analytics/snapshots", authenticate as any, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const snapshotsRes = await dbQuery<any>("analytics_snapshots", "select", {
      match: { user_id: req.user!.id },
      queryBuilder: (qb) => qb.order("snapshot_date", { ascending: true })
    });
    res.json({ success: true, snapshots: snapshotsRes.data || [] });
  } catch (err) {
    next(err);
  }
});


// =========================================================================
// 11. SECURE ADMINISTRATIVE RBAC MODULE
// =========================================================================

// Require Admin Middleware protects ALL endpoints inside this group block
router.use("/admin", authenticate as any, requireAdmin as any);

router.get("/admin/users", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { data: users } = await dbQuery("profiles", "select", {});
    res.json({ success: true, users: users || [] });
  } catch (err) {
    next(err);
  }
});

router.patch("/admin/users/:userId/role", validateBody(["role"]), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    const result = await dbQuery("profiles", "update", {
      match: { id: userId },
      data: { role, updated_at: new Date().toISOString() }
    });

    await logAdminAction(req.user!.id, "update_role", "profiles", userId, { role });
    res.json({ success: true, updatedProfile: result.data });
  } catch (err) {
    next(err);
  }
});

router.get("/admin/subscriptions", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { data: subs } = await dbQuery("subscriptions", "select", {});
    res.json({ success: true, subscriptions: subs || [] });
  } catch (err) {
    next(err);
  }
});

router.get("/admin/payments", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { data: pay } = await dbQuery("payments", "select", {});
    res.json({ success: true, payments: pay || [] });
  } catch (err) {
    next(err);
  }
});

router.get("/admin/revenue", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { data: payments } = await dbQuery<any>("payments", "select", { match: { status: "captured" } });
    const paymentList = payments || [];
    
    const totalAmount = paymentList.reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);
    const byCurrency: Record<string, number> = {};
    for (const p of paymentList) {
      byCurrency[p.currency] = (byCurrency[p.currency] || 0) + parseFloat(p.amount);
    }

    res.json({
      success: true,
      totalRevenue: totalAmount,
      byCurrency,
      transactionsCount: paymentList.length
    });
  } catch (err) {
    next(err);
  }
});

router.post("/admin/announcements", validateBody(["title", "message"]), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const annId = `ann_${Math.random().toString(36).substring(2, 11)}`;
    const annDoc = {
      id: annId,
      title: req.body.title,
      message: req.body.message,
      is_active: req.body.is_active ?? true,
      start_date: req.body.start_date || new Date().toISOString(),
      end_date: req.body.end_date || null,
      created_by: req.user!.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const resDb = await dbQuery("announcements", "insert", { data: annDoc });
    await logAdminAction(req.user!.id, "create_announcement", "announcements", annId, annDoc);

    res.status(201).json({ success: true, announcement: resDb.data || annDoc });
  } catch (err) {
    next(err);
  }
});

router.get("/admin/tickets", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { data: tickets } = await dbQuery("support_tickets", "select", {});
    res.json({ success: true, tickets: tickets || [] });
  } catch (err) {
    next(err);
  }
});

router.post("/admin/tickets/:ticketId/reply", validateBody(["response"]), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { ticketId } = req.params;
    const { response, resolveTicket } = req.body;

    const updates: any = {
      admin_response: response,
      resolved_at: resolveTicket ? new Date().toISOString() : null,
      status: resolveTicket ? "closed" : "in_progress"
    };

    const result = await dbQuery("support_tickets", "update", {
      match: { id: ticketId },
      data: updates
    });

    await logAdminAction(req.user!.id, "reply_ticket", "support_tickets", ticketId, updates);
    res.json({ success: true, updatedTicket: result.data });
  } catch (err) {
    next(err);
  }
});

router.get("/admin/feature-requests", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { data: requests } = await dbQuery("feature_requests", "select", {});
    res.json({ success: true, featureRequests: requests || [] });
  } catch (err) {
    next(err);
  }
});

export default router;
