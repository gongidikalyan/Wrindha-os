import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import Razorpay from "razorpay";
import crypto from "crypto";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lazy init handler for Razorpay
function getRazorpayInstance() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return null;
  }
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[Server] Supabase Configured: ${!!process.env.VITE_SUPABASE_URL}`);
  console.log(`[Server] Razorpay Configured: ${!!process.env.RAZORPAY_KEY_ID}`);
  
  app.use((req, res, next) => {
    if (req.url.startsWith('/api') || req.url.includes('main.tsx')) {
      console.log(`[Request] ${req.method} ${req.url}`);
    }
    next();
  });

  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      message: "Wrindha OS Backend matches your energy!",
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV
    });
  });

  app.get("/api/config", (req, res) => {
    res.json({
      supabaseEnabled: !!process.env.VITE_SUPABASE_URL,
      razorpayEnabled: !!process.env.RAZORPAY_KEY_ID,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || null,
      version: "1.0.0"
    });
  });

  // Create Razorpay Order
  app.post("/api/payments/razorpay/order", async (req, res) => {
    const { planName, amount, currency } = req.body;
    const cleanAmount = parseFloat(amount) || 49;
    const cleanCurrency = currency || "INR";

    try {
      const rzp = getRazorpayInstance();
      if (!rzp) {
        // Safe sandbox fallback mode if credential keys are absent in environment
        const mockOrderId = `order_sand_${Math.random().toString(36).substring(2, 10)}`;
        return res.json({
          success: true,
          isSandbox: true,
          orderId: mockOrderId,
          keyId: "rzp_test_sandbox_dummy",
          amount: Math.round(cleanAmount * 100),
          currency: cleanCurrency,
          receipt: `receipt_sand_${Date.now()}`
        });
      }

      const orderOptions = {
        amount: Math.round(cleanAmount * 100), // paisa
        currency: cleanCurrency,
        receipt: `receipt_wrindha_${Date.now()}`
      };

      const order = await rzp.orders.create(orderOptions);

      return res.json({
        success: true,
        isSandbox: false,
        orderId: order.id,
        keyId: process.env.RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt
      });
    } catch (err: any) {
      console.error("[Razorpay Order Error]:", err);
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to create Razorpay Order Session"
      });
    }
  });

  // Verify Razorpay Payment Signature
  app.post("/api/payments/razorpay/verify", async (req, res) => {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, isSandbox } = req.body;

    try {
      if (isSandbox) {
        // Auto-approve sandbox mode payments immediately
        return res.json({
          success: true,
          status: "verified",
          message: "Sandbox payment verified in core mock ledger."
        });
      }

      const secret = process.env.RAZORPAY_KEY_SECRET;
      if (!secret) {
        return res.status(400).json({
          success: false,
          message: "Razorpay Secret Key configuration is missing on server."
        });
      }

      // Standard Razorpay signature verification
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(body.toString())
        .digest("hex");

      if (expectedSignature === razorpay_signature) {
        return res.json({
          success: true,
          status: "verified",
          message: "Payment successfully verified."
        });
      } else {
        return res.status(400).json({
          success: false,
          message: "Invalid Razorpay security signature verified. Unauthorized transaction detected."
        });
      }
    } catch (err: any) {
      console.error("[Razorpay Verification Error]:", err);
      return res.status(500).json({
        success: false,
        message: err.message || "Engine verification failure."
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Wrindha OS running at http://localhost:${PORT}`);
  });
}

startServer();
