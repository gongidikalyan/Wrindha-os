import { Request, Response, NextFunction } from "express";
import { supabase, dbQuery } from "./db.ts";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: "user" | "admin";
    account_status: "trial" | "premium" | "expired";
  };
}

/**
 * 1. Robust Authentication & Identification Middleware
 * Resolves JWT token via Supabase or falls back to 'x-user-id' in sandbox/trial setups.
 */
export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    let userId: string | null = null;
    let email: string | null = null;

    // Check custom headers for Sandbox & developer trials
    const demoUserId = req.headers["x-user-id"];
    const demoEmail = req.headers["x-user-email"];

    // 1. Resolve from bearer token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        userId = user.id;
        email = user.email || "";
      }
    }

    // 2. Resolve from Sandbox dev bypass if no live token extracted
    if (!userId && demoUserId) {
      userId = String(demoUserId);
      email = String(demoEmail || "sandbox_user@wrindha.io");
      console.log(`[Auth Middleware] Authenticating via sandbox developer custom header: userId=${userId}`);
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please log in or provide security access headers."
      });
    }

    // Fetch Profile details from DB to read role and account subscription status
    const { data: profiles } = await dbQuery<any>("profiles", "select", {
      match: { id: userId }
    });

    let role: "user" | "admin" = "user";
    let accountStatus: "trial" | "premium" | "expired" = "trial";

    if (profiles && Array.isArray(profiles) && profiles.length > 0) {
      const profile = profiles[0];
      role = profile.role === "admin" ? "admin" : "user";
      accountStatus = profile.account_status || "trial";
    } else {
      // Auto-create or default profile internally
      role = req.headers["x-user-role"] === "admin" ? "admin" : "user";
    }

    req.user = {
      id: userId,
      email: email || "unknown@wrindha.io",
      role,
      account_status: accountStatus
    };

    next();
  } catch (error: any) {
    console.error("[Authentication Middleware Exception]:", error);
    return res.status(401).json({ success: false, message: "Invalid or expired token sessions." });
  }
}

/**
 * 2. Role-Based Access Control (RBAC) - Admin validation
 * Rejects requests if user is not flagged as admin.
 */
export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Forbidden. Admin clearance permissions required."
    });
  }
  next();
}

/**
 * 3. Dynamic Validation Helper Middleware
 * Handlers can supply validation schemas or object checker callbacks.
 */
export function validateBody(requiredFields: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const missing: string[] = [];
    for (const field of requiredFields) {
      if (req.body[field] === undefined || req.body[field] === null) {
        missing.push(field);
      }
    }
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Validation Failed. Missing mandatory fields: ${missing.join(", ")}`
      });
    }
    next();
  };
}

/**
 * 4. Audit Logger Infrastructure
 * Record critical administrative operations automatically inside 'admin_logs'.
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  details: any = {}
) {
  try {
    await dbQuery("admin_logs", "insert", {
      data: {
        admin_id: adminId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details: JSON.stringify(details),
        created_at: new Date().toISOString()
      }
    });
    console.log(`[Audit Trail] Admin ${adminId} executed '${action}' on '${entityType}:${entityId}'`);
  } catch (err) {
    console.error("[Audit Logger failure]:", err);
  }
}

/**
 * 5. General Centralized Error Handler Middleware
 */
export function handleError(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(`[Express Error Handler Internal Trigger]:`, err.stack || err);
  return res.status(err.status || 500).json({
    success: false,
    message: err.message || "An unexpected system fault has occurred on the server.",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined
  });
}
