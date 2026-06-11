import express from "express";
import nodemailer from "nodemailer";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import Razorpay from "razorpay";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI, Type } from "@google/genai";
import v2Router from "./server/routes.ts";
import { authContext } from "./server/db.ts";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase server-side client
const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://lbthopvezqjcynkfpcnn.supabase.co";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxidGhvcHZlenFqY3lua2ZwY25uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMTg4NDgsImV4cCI6MjA5Mzc5NDg0OH0.-fCSsMSyk1Ay_dDb0juQWhCObfKtzo6L01NhqueY7J8";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// In-memory master fallback for coupons system if offline or sandbox fallback is leveraged
let DUMMY_COUPONS = [
  {
    id: "coupon-1",
    coupon_code: "FIRST29",
    description: "First Month ₹29 instead of ₹59",
    discount_type: "fixed",
    discount_value: 30,
    is_active: true,
    max_uses: 100,
    current_uses: 12,
    start_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "coupon-2",
    coupon_code: "FIFTYOFF",
    description: "50% Off Wrindha OS Subscription",
    discount_type: "percentage",
    discount_value: 50,
    is_active: true,
    max_uses: 50,
    current_uses: 4,
    start_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "coupon-3",
    coupon_code: "FLAT20",
    description: "Flat ₹20 discount on checkouts",
    discount_type: "fixed",
    discount_value: 20,
    is_active: true,
    max_uses: 500,
    current_uses: 45,
    start_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "coupon-4",
    coupon_code: "FESTIVAL",
    description: "Festival Special flat ₹15 Off",
    discount_type: "fixed",
    discount_value: 15,
    is_active: true,
    max_uses: 200,
    current_uses: 18,
    start_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "coupon-5",
    coupon_code: "STUDENT30",
    description: "Verified academic student 30% Off",
    discount_type: "percentage",
    discount_value: 30,
    is_active: true,
    max_uses: 1000,
    current_uses: 82,
    start_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000).toISOString()
  }
];

let MOCK_COUPON_USAGES = [
  { id: "use-1", coupon_id: "coupon-1", coupon_code: "FIRST29", discount_applied: 20, paid_amount: 29, used_at: new Date(Date.now() - 5 * 3600000).toISOString(), user_email: "student_a@gpay.com" },
  { id: "use-2", coupon_id: "coupon-2", coupon_code: "FIFTYOFF", discount_applied: 24.5, paid_amount: 24.5, used_at: new Date(Date.now() - 12 * 3600000).toISOString(), user_email: "expert_writer@gmail.com" },
  { id: "use-3", coupon_id: "coupon-3", coupon_code: "FLAT20", discount_applied: 20, paid_amount: 29, used_at: new Date(Date.now() - 24 * 3600000).toISOString(), user_email: "local@instance.com" },
  { id: "use-4", coupon_id: "coupon-5", coupon_code: "STUDENT30", discount_applied: 14.7, paid_amount: 34.3, used_at: new Date(Date.now() - 48 * 3600000).toISOString(), user_email: "test_candidate@iit.edu" }
];

// Helper to validate a coupon structure and calculate discounts
function validateCouponCode(coupon: any, originalPrice: number) {
  if (!coupon) {
    return { valid: false, message: "Coupon code does not exist. Check for typos!" };
  }
  if (!coupon.is_active) {
    return { valid: false, message: "This coupon is currently inactive." };
  }
  if (coupon.max_uses !== null && coupon.max_uses !== undefined && coupon.max_uses > 0) {
    if (coupon.current_uses >= coupon.max_uses) {
      return { valid: false, message: "This coupon has reached its maximum usage limit." };
    }
  }
  const now = new Date();
  if (coupon.start_date && new Date(coupon.start_date) > now) {
    return { valid: false, message: "This coupon code promotion is not active yet." };
  }
  if (coupon.end_date && new Date(coupon.end_date) < now) {
    return { valid: false, message: "This coupon code has expired." };
  }

  // Calculate discount
  let discountAmount = 0;
  const val = parseFloat(coupon.discount_value) || 0;
  if (coupon.discount_type === "percentage") {
    discountAmount = Math.round((originalPrice * (val / 100)) * 100) / 100;
  } else if (coupon.discount_type === "fixed") {
    discountAmount = Math.min(originalPrice, val);
  }

  const payableAmount = Math.round((Math.max(0, originalPrice - discountAmount)) * 100) / 100;

  return {
    valid: true,
    id: coupon.id,
    couponCode: coupon.coupon_code,
    description: coupon.description,
    discountType: coupon.discount_type,
    discountValue: val,
    discountAmount,
    payableAmount
  };
}

// Lazy init handler for Razorpay
function getRazorpayInstance() {
  let keyId = process.env.RAZORPAY_KEY_ID;
  let keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return null;
  }
  keyId = keyId.trim().replace(/^["']|["']$/g, "");
  keySecret = keySecret.trim().replace(/^["']|["']$/g, "");
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({
    verify: (req: any, res: any, buf: Buffer) => {
      req.rawBody = buf;
    }
  }));

  // Enable CORS headers to allow cross-origin requests from frontends (e.g. GitHub Pages or specific client origins)
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedPatterns = [
      /^https?:\/\/(.*\.)?wrindhaos\.in$/,
      /^https?:\/\/.*\.github\.io$/,
      /^http:\/\/localhost:\d+$/,
      /^https?:\/\/.*\.run\.app$/ // For AI Studio development/shared previews
    ];

    if (origin) {
      const isAllowed = allowedPatterns.some(pattern => pattern.test(origin));
      if (isAllowed) {
        res.header("Access-Control-Allow-Origin", origin);
        res.header("Access-Control-Allow-Credentials", "true");
      } else {
        res.header("Access-Control-Allow-Origin", "*");
      }
    } else {
      res.header("Access-Control-Allow-Origin", "*");
    }

    res.header("Access-Control-Allow-Methods", "GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-user-id, x-user-email");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

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

  // Mount the SaaS v2 API core router with request-scoped Bearer token propagation
  app.use("/api/v2", (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : undefined;
    authContext.run({ token }, () => {
      v2Router(req, res, next);
    });
  });

  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      message: "Wrindha OS Backend matches your energy!",
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV
    });
  });

  app.get("/api/server-time", (req, res) => {
    res.json({
      serverTime: new Date().toISOString()
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

  app.post("/api/contact", async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: "Required inputs missing." });
    }

    console.log(`[CONTACT RECEIVED] Name: ${name}, Email: ${email}, Message: ${message}`);

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    const emailHtmlFounder = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #4f46e5; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">New Contact Message Received</h2>
        <p style="margin: 8px 0;"><strong>Name:</strong> ${name}</p>
        <p style="margin: 8px 0;"><strong>Email Address:</strong> <a href="mailto:${email}" style="color: #4f46e5; text-decoration: none;">${email}</a></p>
        <p style="margin-top: 20px; margin-bottom: 6px;"><strong>Message / Inquiry Details:</strong></p>
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; border-left: 4px solid #4f46e5; margin-bottom: 20px; white-space: pre-wrap; color: #1f2937; font-size: 14px; line-height: 1.5;">${message}</div>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 11px; color: #6b7280; text-align: center; margin: 0;">Wrindha OS Notification Service</p>
      </div>
    `;

    const emailHtmlUser = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #4f46e5; margin-bottom: 10px;">We Received Your Message!</h2>
        <p style="color: #374151; font-size: 14px; line-height: 1.5;">Hi ${name},</p>
        <p style="color: #374151; font-size: 14px; line-height: 1.5;">Thank you for reaching out to Wrindha OS. We have successfully received your inquiry and are currently reviewing your details.</p>
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold; color: #1f2937; font-size: 13px;">Copy of your message:</p>
          <p style="margin: 10px 0 0 0; font-style: italic; color: #4b5563; font-size: 13.5px; white-space: pre-wrap;">"${message}"</p>
        </div>
        <p style="color: #374151; font-size: 14px; line-height: 1.5;">We typically respond within 24 to 48 business hours. If you need immediate assistance, feel free to reply directly to this mail or write us at <a href="mailto:wrindhaos@gmail.com" style="color: #4f46e5; text-decoration: none; font-weight: bold;">wrindhaos@gmail.com</a>.</p>
        <p style="color: #374151; font-size: 14px; line-height: 1.5; margin-top: 24px;">Best regards,<br /><strong style="color: #4f46e5;">The Wrindha OS Team</strong></p>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 25px 0 20px 0;" />
        <p style="font-size: 11px; color: #9ca3af; text-align: center; margin: 0;">This is an automated receipt confirmation from Wrindha OS.</p>
      </div>
    `;

    if (smtpHost && smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });

        // 1. Send copy to founder
        await transporter.sendMail({
          from: `"Wrindha OS Contact" <${smtpUser}>`,
          to: "wrindhaos@gmail.com",
          replyTo: email,
          subject: `Inquiry from ${name} (${email})`,
          html: emailHtmlFounder
        });

        // 2. Send receipt to the user who wrote the message
        await transporter.sendMail({
          from: `"Wrindha OS Support" <${smtpUser}>`,
          to: email,
          subject: "We received your message • Wrindha OS",
          html: emailHtmlUser
        });

        console.log(`[SMTP] Emails successfully sent to wrindhaos@gmail.com and user mail: ${email}`);
        return res.json({ success: true, message: "Emails sent successfully." });
      } catch (err: any) {
        console.error("Error sending emails via SMTP:", err);
        return res.status(500).json({ success: false, message: "SMTP mail delivery failed: " + err.message });
      }
    } else {
      console.warn("[SMTP Log] SMTP credentials not set under environment. Printing email payload to logs:");
      console.log(`================ MOCK EMAIL INBOX ================`);
      console.log(`[FROM] Wrindha OS <wrindhaos@gmail.com>`);
      console.log(`[TO] wrindhaos@gmail.com`);
      console.log(`[SUBJECT] Inquiry from ${name} (${email})`);
      console.log(`[MESSAGE CONTENT]\n${message}`);
      console.log(`------------------------------`);
      console.log(`[TO] ${email}`);
      console.log(`[SUBJECT] We received your message • Wrindha OS`);
      console.log(`[CONTENT]\nHi ${name},\nYour message has been processed. Copy: "${message}"`);
      console.log(`==================================================`);

      return res.json({ 
        success: true, 
        message: "Your message has been successfully received. A copy would be sent to your email address dynamically once SMTP credentials are active.", 
        simulated: true 
      });
    }
  });

  /* ==========================================
     CAREER PATH PLANNER GEMINI AI GENERATION
     ========================================== */
  app.post("/api/career/generate", async (req, res) => {
    const { current_position, target_position, target_year, category, vision_statement } = req.body;

    if (!current_position || !target_position || !target_year || !category) {
      return res.status(400).json({ success: false, message: "Required inputs missing." });
    }

    const yearNum = parseInt(target_year) || 5;

    // First attempt to invoke Gemini API if apiKey exists
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey: apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });

        const prompt = `You are an expert Career Counselor and Roadmap Generator.
Create a highly professional and structured career roadmap from a user's current situation to their target position.

Inputs:
Current Position: ${current_position}
Target Position: ${target_position}
Timeline Limit: ${yearNum} year(s)
Industry Category: ${category}
Vision Statement/Aspirations: ${vision_statement || "To excel and reach leadership rank in the target position."}

Ensure your response is detailed, professional, encouraging, and tailored to the inputs.`;

        const responseSchema = {
          type: Type.OBJECT,
          properties: {
            roadmap: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  stage: { type: Type.STRING, description: "Stage identifier, e.g., 'Current', 'Year 1', 'Year 3', 'Year 5'" },
                  title: { type: Type.STRING, description: "Milestone goal for this stage" },
                  description: { type: Type.STRING, description: "Detailed explanation of what to accomplish or focus on during this period" },
                },
                required: ["stage", "title", "description"]
              }
            },
            milestones: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Title of a major milestone block" },
                  description: { type: Type.STRING, description: "Detailed sub-tasks or outcomes" },
                  target_date: { type: Type.STRING, description: "When this milestone should be achieved (e.g. Month 3, Year 1, Year 3)" }
                },
                required: ["title", "description", "target_date"]
              }
            },
            skills: {
              type: Type.ARRAY,
              items: { type: Type.STRING, description: "A high-demand skill required for the target position" }
            },
            certifications: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            experience_requirements: { type: Type.STRING },
            monthly_action_plan: {
              type: Type.ARRAY,
              items: { type: Type.STRING, description: "Specific direct actionable item for early learning months" }
            },
            yearly_action_plan: {
              type: Type.ARRAY,
              items: { type: Type.STRING, description: "Strategic yearly expectations leading to the target goal" }
            },
            books_and_resources: {
              type: Type.ARRAY,
              items: { type: Type.STRING, description: "Curated books, learning hubs, websites, or courses" }
            },
            projects_to_complete: {
              type: Type.ARRAY,
              items: { type: Type.STRING, description: "A specific landmark portfolio project to validate learning" }
            },
            monthly_learning_targets: {
              type: Type.ARRAY,
              items: { type: Type.STRING, description: "Concrete target metrics for standard monthly checks" }
            },
            gap_analysis: {
              type: Type.OBJECT,
              properties: {
                current_state: { type: Type.STRING, description: "Summary of user's current situation" },
                desired_state: { type: Type.STRING, description: "Description of the target capability" },
                missing_skills: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING, description: "Key technical/soft skills missing currently" }
                },
                missing_experience: { type: Type.STRING },
                suggested_actions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ["current_state", "desired_state", "missing_skills", "missing_experience", "suggested_actions"]
            }
          },
          required: [
            "roadmap",
            "milestones",
            "skills",
            "certifications",
            "experience_requirements",
            "monthly_action_plan",
            "yearly_action_plan",
            "books_and_resources",
            "projects_to_complete",
            "monthly_learning_targets",
            "gap_analysis"
          ]
        };

        const result = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
            temperature: 0.2
          }
        });

        const text = result.text;
        if (text) {
          const generatedData = JSON.parse(text);
          return res.json({
            success: true,
            source: "gemini-ai",
            data: generatedData
          });
        }
      } catch (geminiError: any) {
        console.error("[Gemini Career Generation Error] Falling back to structured response:", geminiError);
      }
    }

    // High quality Category Fallback Generator
    console.log(`[Career API] Generating Tailored Fallback for Target: "${target_position}" In stream: "${category}"`);
    
    // Tailored defaults based on category
    let skills: string[] = ["Leadership", "Time Management", "Industry Literacy"];
    let certifications: string[] = ["Professional Certification in Track"];
    let resources: string[] = ["Industry Whitepapers", "Reference Handbooks"];
    let projects: string[] = ["Comprehensive Portfolio Case Study"];
    let missingSkillsList: string[] = ["Advanced Sector Tooling", "Niche Domain Expertise"];
    let milestonesList: any[] = [];
    let roadmapList: any[] = [];
    let monthlyActions: string[] = [];
    let yearlyActions: string[] = [];

    if (category === "Technology") {
      skills = ["Design Patterns & Architecture", "API Design", "Distributed Systems & Cloud Computing", "Advanced Algorithms", "Continuous Integration (CI/CD)"];
      certifications = ["AWS/GCP Professional Solutions Architect", "Certified Kubernetes Administrator (CKA)", "Professional Scrum Master"];
      resources = ["'Designing Data-Intensive Applications' by Martin Kleppmann", "Refactoring.Guru Tutorials", "System Design Primer Guide"];
      projects = ["Deploy a Multi-service Cloud-Native distributed microsegmentation dashboard", "Develop an open-source library solving a core compiler or API bottleneck"];
      missingSkillsList = ["Enterprise System Architecture", "Cloud Orchestration", "High scale latency optimization"];
    } else if (category === "Government Jobs" || category === "UPSC") {
      skills = ["Indian Constitution & Polity", "Quantitative Aptitude", "General Knowledge & Static GK", "Comprehensive Essay Writing", "Public Administration Fundamentals"];
      certifications = ["State level Academy Modules", "Foundation Training Certificate"];
      resources = ["Polity by Laxmikanth", "A Brief History of Modern India by Rajiv Ahir", "Daily Economic Times & Editorial Digests"];
      projects = ["Write 50 High-Scoring Mains Practice Papers with self-correction", "Complete Mock Personality & Board panels sessions"];
      missingSkillsList = ["Comprehensive Essay Writing", "Speed Aptitude Calculations", "Detailed Current Affairs Command"];
    } else if (category === "Business & Entrepreneurship") {
      skills = ["Venture Capital & Unit Economics", "Growth Hacking", "Financial Modeling", "Product-Market Fit Validation", "B2B Negotiations"];
      certifications = ["Y Combinator Startup School Certificate", "Inbound Marketing Certification"];
      resources = ["'The Lean Startup' by Eric Ries", "'Zero to One' by Peter Thiel", "'The Hard Thing About Hard Things' by Ben Horowitz"];
      projects = ["Launch an MVP with standard customer feedback cycles", "Pitch deck design and financial forecast creation for Angel round"];
      missingSkillsList = ["Fundraising Negotiations", "B2B Customer Acquisition", "Scalable Product Strategy"];
    } else if (category === "Finance") {
      skills = ["Chartered Financial Analysis (CFA Core)", "Excel Advanced Modeling", "Quantitative Portfolio Strategy", "Risk Assessment", "Corporate Valuation"];
      certifications = ["CFA Level 1 / Level 2", "Financial Risk Manager (FRM)", "Bloomberg Market Concepts (BMC)"];
      resources = ["'The Intelligent Investor' by Benjamin Graham", "Damodaran Corporate Finance Materials", "Venture Valuation Guides"];
      projects = ["Build an active algorithmic equity valuation model", "Implement a simulated defensive-growth portfolio with monthly rebalancing"];
      missingSkillsList = ["Advanced Financial Modeling", "SEC Audit Protocols", "Quantitative Risk Models"];
    } else if (category === "Design") {
      skills = ["UI/UX Design Systems", "User Research & Cognitive Psychology", "Typography & Layout Grid Mastery", "Interactive Prototyping (Figma Components)", "Brand Strategy"];
      certifications = ["Google UX Design Professional Certificate", "Interaction Design Foundation (IxDF) Certified Member"];
      resources = ["'The Design of Everyday Things' by Don Norman", "'Don't Make Me Think' by Steve Krug", "Laws of UX website"];
      projects = ["Design and prototype a full responsive fintech workspace ecosystem", "Publish 3 deep-dive case studies explaining complex user journeys"];
      missingSkillsList = ["Design System Tokenization", "User Research Methodologies", "Complex Micro-animations"];
    } else {
      skills = ["Strategic Communication", "Data-Driven Decision Making", "Project Management", "Technical Domain Architecture", "Conflict Resolution"];
      certifications = ["Project Management Professional (PMP)", "Agile Project Framework Certification"];
      resources = ["'Atomic Habits' by James Clear", "Harvard Business Review Management Guides"];
      projects = ["Implement a streamlined operational blueprint inside current workflow", "Design a custom dashboard summarizing high impact business objectives"];
      missingSkillsList = ["Strategic Leadership", "Advanced Budgeting/Financial Control", "Domain-Specific Regulations Standard Compliance"];
    }

    // Build timeline stages
    const steps = [1, 2, 3, 4, 10];
    const validSteps = steps.filter(s => s <= yearNum);
    if (!validSteps.includes(yearNum)) {
      validSteps.push(yearNum);
    }
    validSteps.sort((a,b) => a - b);

    // Timeline view roadmap
    roadmapList.push({
      stage: "Current",
      title: `${current_position}`,
      description: `Starting baseline position. Focus on gap analysis and identifying immediate skill acquisitions required to transition into ${category}.`
    });

    validSteps.forEach((yr, idx) => {
      let stageTitle = `Year ${yr} Goal`;
      let stageDesc = `Consolidating medium-term milestones. Mastering core competencies in ${category} to qualify for higher scopes.`;
      if (yr === yearNum) {
        stageTitle = `${target_position} (Target Achieve)`;
        stageDesc = `Fully step into your target role as an expert. Accelerate leadership capabilities, own high-impact workflows, and lead vision metrics.`;
      } else if (idx === 0) {
        stageTitle = `Year 1 Foundation`;
        stageDesc = `Building structural knowledge bases. Complete critical baseline certifications and hands-on projects to close immediate technical gaps.`;
      }
      roadmapList.push({
        stage: `Year ${yr}`,
        title: stageTitle,
        description: stageDesc
      });
    });

    // Milestones list
    milestonesList = [
      {
        title: "Foundation Blueprint Setup",
        description: "Draft professional curriculum, purchase essential study books/courses, and setup learning timetable.",
        target_date: "Month 1"
      },
      {
        title: "Core Skill Integration Checkpoint",
        description: `Verify high mastery in initial core skills: ${skills.slice(0, 2).join(", ")}.`,
        target_date: "Month 4"
      },
      {
        title: "Inaugural Capstone Project Launch",
        description: `Complete and host first comprehensive capstone project verifying practical domain experience: "${projects[0]}".`,
        target_date: "Month 9"
      }
    ];

    if (yearNum >= 3) {
      milestonesList.push({
        title: "Intermediate Professional Upgrade",
        description: "Acquire professional level certifications and transition into leadership tasks.",
        target_date: "Year 2"
      });
    }

    milestonesList.push({
      title: "Final Target Execution Runway",
      description: `Full application or role transition into ${target_position}. Optimize interview prep, resume portfolios, and custom networking.`,
      target_date: `Year ${yearNum}`
    });

    // Monthly action list
    monthlyActions = [
      `Dedicate 12 hours weekly to studying core materials: ${resources[0]}`,
      `Implement 3 minor sandbox exercises focusing on immediate technical mastery`,
      "Establish habit of reading industry articles or study materials daily for 30 mins",
      `Begin initial draft design/ideation for: "${projects[0]}"`
    ];

    // Yearly action list
    yearlyActions = [
      `Year 1: Dedicate to structural mastery, build top-tier portfolio, and earn starter certification.`,
      yearNum >= 3 ? `Year 2-3: Transition from practitioner to specialist, lead community/work initiatives, and shadow senior specialists.` : null,
      yearNum >= 5 ? `Year 4-5: Establish complete domain authority, publish case studies, and initiate active applications for "${target_position}".` : null,
      `Final Target Horizon: Reach absolute readiness and establish placement as a premier candidate/practitioner.`
    ].filter(Boolean) as string[];

    const finalMockData = {
      roadmap: roadmapList,
      milestones: milestonesList,
      skills: skills,
      certifications: certifications,
      experience_requirements: `Requires strong practical knowledge in ${category}, verified by at least one robust capstone portfolio project. Soft skills of high-efficiency time management and structured communication are recommended.`,
      monthly_action_plan: monthlyActions,
      yearly_action_plan: yearlyActions,
      books_and_resources: resources,
      projects_to_complete: projects,
      monthly_learning_targets: [
        "Complete 4 modules of study curriculum monthly",
        "Publish 1 conceptual learning case study or analysis article",
        "Conduct 1 mock validation or peer review session"
      ],
      gap_analysis: {
        current_state: `Currently serving as "${current_position}" focusing on baseline skills.`,
        desired_state: `Expert professional in "${target_position}" owning high precision deliverables with advanced competency.`,
        missing_skills: missingSkillsList,
        missing_experience: `Transitioning into a different domain scope requires bridging 1-2 practical product launches or specialized certifications.`,
        suggested_actions: [
          `Immediately acquire baseline certification: ${certifications[0]}`,
          `Create a professional timeline inside WrindhaOS Task Manager for: "${projects[0]}"`,
          `Sync daily habit tracker in WrindhaOS with a focus on "1 hour focused skill drills" daily.`
        ]
      }
    };

    return res.json({
      success: true,
      source: "fallback-expert-system",
      data: finalMockData
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

  /* ==========================================
     COUPON CODES & OFFERS SECURE VALIDATION
     ========================================== */
  app.post("/api/coupons/validate", async (req, res) => {
    const { couponCode, originalPrice } = req.body;
    const cleanOrigPrice = parseFloat(originalPrice) || 59;

    if (!couponCode || typeof couponCode !== "string") {
      return res.status(400).json({ success: false, message: "Please enter a coupon code." });
    }

    const searchCode = couponCode.trim().toUpperCase();

    try {
      let coupon: any = null;

      if (process.env.VITE_SUPABASE_URL) {
        const { data, error } = await supabase
          .from("coupons")
          .select("*")
          .eq("coupon_code", searchCode)
          .maybeSingle();

        if (data) {
          coupon = data;
        }
      }

      // Roll back to active local list if DB is not reachable/has no entry
      if (!coupon) {
        coupon = DUMMY_COUPONS.find(c => c.coupon_code === searchCode);
      }

      const result = validateCouponCode(coupon, cleanOrigPrice);

      if (!result.valid) {
        return res.json({ success: false, message: result.message });
      }

      return res.json({
        success: true,
        ...result
      });
    } catch (err: any) {
      console.error("[Coupon server validation err]:", err);
      // Fail-safe sandbox fallback in response
      const coupon = DUMMY_COUPONS.find(c => c.coupon_code === searchCode);
      if (coupon) {
        const result = validateCouponCode(coupon, cleanOrigPrice);
        return res.json({ success: result.valid, ...result, isFallback: true });
      }
      return res.status(500).json({ success: false, message: "Faulty database linkage during coupon validation." });
    }
  });

  /* ==========================================
     ADMIN COUPON & STATS CRUD ENDPOINTS
     ========================================== */
  app.get("/api/admin/coupons", async (req, res) => {
    try {
      if (process.env.VITE_SUPABASE_URL) {
        const { data: dbCoupons, error } = await supabase
          .from("coupons")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && dbCoupons) {
          // Calculate stats for each coupon from coupon_usage
          const { data: usages } = await supabase
            .from("coupon_usage")
            .select("*");

          const couponsWithStats = dbCoupons.map(cp => {
            const cpUsages = (usages || []).filter((u: any) => u.coupon_id === cp.id || u.coupon_code === cp.coupon_code);
            const totalRevenue = cpUsages.reduce((sum: number, u: any) => sum + (parseFloat(u.paid_amount) || 0), 0);
            return {
              ...cp,
              current_uses: cpUsages.length || cp.current_uses || 0,
              total_revenue_generated: totalRevenue
            };
          });

          return res.json({ success: true, coupons: couponsWithStats });
        }
      }

      // If offline/sandbox mode:
      const processedLocal = DUMMY_COUPONS.map(cp => {
        const cpUsages = MOCK_COUPON_USAGES.filter(u => u.coupon_id === cp.id || u.coupon_code === cp.coupon_code);
        const totalRevenue = cpUsages.reduce((sum, u) => sum + u.paid_amount, 0);
        return {
          ...cp,
          total_revenue_generated: totalRevenue
        };
      });

      return res.json({ success: true, coupons: processedLocal, isSandbox: true });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post("/api/admin/coupons", async (req, res) => {
    const { coupon_code, description, discount_type, discount_value, start_date, end_date, max_uses, is_active } = req.body;
    
    if (!coupon_code || !discount_type || discount_value === undefined) {
      return res.status(400).json({ success: false, message: "Required fields coupons properties are missing." });
    }

    const normalizedCode = coupon_code.trim().toUpperCase();

    try {
      if (process.env.VITE_SUPABASE_URL) {
        const { data, error } = await supabase
          .from("coupons")
          .insert({
            coupon_code: normalizedCode,
            description,
            discount_type,
            discount_value: parseFloat(discount_value),
            start_date: start_date || new Date().toISOString(),
            end_date: end_date || null,
            max_uses: max_uses ? parseInt(max_uses) : null,
            current_uses: 0,
            is_active: is_active ?? true
          })
          .select()
          .single();

        if (!error && data) {
          return res.json({ success: true, coupon: data });
        } else if (error) {
          throw error;
        }
      }

      // Local In-memory mutation
      const newCoupon = {
        id: `coupon-${Date.now()}`,
        coupon_code: normalizedCode,
        description,
        discount_type,
        discount_value: parseFloat(discount_value),
        start_date: start_date || new Date().toISOString(),
        end_date: end_date || null,
        max_uses: max_uses ? parseInt(max_uses) : null,
        current_uses: 0,
        is_active: is_active ?? true
      };

      DUMMY_COUPONS.unshift(newCoupon);
      return res.json({ success: true, coupon: newCoupon, isSandbox: true });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Unable to save coupon." });
    }
  });

  app.put("/api/admin/coupons/:id", async (req, res) => {
    const { id } = req.params;
    const { description, discount_type, discount_value, start_date, end_date, max_uses, is_active } = req.body;

    try {
      if (process.env.VITE_SUPABASE_URL && id.length > 10 && !id.startsWith("coupon-")) {
        const { data, error } = await supabase
          .from("coupons")
          .update({
            description,
            discount_type,
            discount_value: discount_value ? parseFloat(discount_value) : undefined,
            start_date,
            end_date,
            max_uses: max_uses !== undefined ? (max_uses ? parseInt(max_uses) : null) : undefined,
            is_active
          })
          .eq("id", id)
          .select()
          .single();

        if (!error && data) {
          return res.json({ success: true, coupon: data });
        }
      }

      // Local Fallback
      const idx = DUMMY_COUPONS.findIndex(c => c.id === id);
      if (idx !== -1) {
        DUMMY_COUPONS[idx] = {
          ...DUMMY_COUPONS[idx],
          description: description ?? DUMMY_COUPONS[idx].description,
          discount_type: discount_type ?? DUMMY_COUPONS[idx].discount_type,
          discount_value: discount_value ? parseFloat(discount_value) : DUMMY_COUPONS[idx].discount_value,
          start_date: start_date ?? DUMMY_COUPONS[idx].start_date,
          end_date: end_date ?? DUMMY_COUPONS[idx].end_date,
          max_uses: max_uses !== undefined ? (max_uses ? parseInt(max_uses) : null) : DUMMY_COUPONS[idx].max_uses,
          is_active: is_active !== undefined ? is_active : DUMMY_COUPONS[idx].is_active
        };
        return res.json({ success: true, coupon: DUMMY_COUPONS[idx], isSandbox: true });
      }

      return res.status(404).json({ success: false, message: "Coupon ID resource not found." });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  app.delete("/api/admin/coupons/:id", async (req, res) => {
    const { id } = req.params;

    try {
      if (process.env.VITE_SUPABASE_URL && id.length > 10 && !id.startsWith("coupon-")) {
        const { error } = await supabase
          .from("coupons")
          .delete()
          .eq("id", id);

        if (!error) {
          return res.json({ success: true, message: "Coupon successfully deleted" });
        }
      }

      const idx = DUMMY_COUPONS.findIndex(c => c.id === id);
      if (idx !== -1) {
        DUMMY_COUPONS.splice(idx, 1);
        return res.json({ success: true, message: "Coupon removed from memory pool." });
      }

      return res.status(404).json({ success: false, message: "Coupon resource not found in ledger." });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  app.get("/api/admin/coupon-stats", (req, res) => {
    res.json({
      success: true,
      usages: MOCK_COUPON_USAGES,
      availableOffers: [
        { name: "First Month ₹29", code: "FIRST29", type: "fixed", value: 30 },
        { name: "50% Off Lifetime Space Voucher", code: "FIFTYOFF", type: "percentage", value: 50 },
        { name: "Flat ₹20 Off Checkouts", code: "FLAT20", type: "fixed", value: 20 },
        { name: "Festival Offer Flat ₹15 Off", code: "FESTIVAL", type: "fixed", value: 15 },
        { name: "Academic Student 30% Off", code: "STUDENT30", type: "percentage", value: 30 }
      ]
    });
  });

  // Create Razorpay Order with Secure Coupon calculation
  app.post("/api/payments/razorpay/order", async (req, res) => {
    const { planName, amount, currency, couponCode } = req.body;
    let cleanAmount = parseFloat(amount) || 59;
    const cleanCurrency = currency || "INR";

    let discountApplied = 0;
    let appliedCouponDetail = null;

    if (couponCode && typeof couponCode === "string" && couponCode.trim()) {
      const searchCode = couponCode.trim().toUpperCase();
      try {
        let coupon: any = null;
        if (process.env.VITE_SUPABASE_URL) {
          const { data } = await supabase
            .from("coupons")
            .select("*")
            .eq("coupon_code", searchCode)
            .maybeSingle();
          if (data) coupon = data;
        }

        if (!coupon) {
          coupon = DUMMY_COUPONS.find(c => c.coupon_code === searchCode);
        }

        if (coupon) {
          const result = validateCouponCode(coupon, cleanAmount);
          if (result.valid) {
            discountApplied = result.discountAmount;
            cleanAmount = result.payableAmount;
            appliedCouponDetail = result;
            console.log(`[Secure Server Coupon Applied] Code: ${searchCode}, Discount: ₹${discountApplied}, Paid Amount: ₹${cleanAmount}`);
          }
        }
      } catch (couponErr) {
        console.error("Revalidating coupon at order init block failed:", couponErr);
      }
    }

    try {
      const rzp = getRazorpayInstance();
      if (!rzp) {
        return res.status(400).json({
          success: false,
          message: "Razorpay keys (RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET) are not configured on the server. Live payment gateway is unavailable and sandbox mode has been disabled."
        });
      }

      const orderOptions = {
        amount: Math.round(cleanAmount * 100), // paisa
        currency: cleanCurrency,
        receipt: `receipt_wrindha_${Date.now()}`
      };

      try {
        const order = await rzp.orders.create(orderOptions);

        return res.json({
          success: true,
          isSandbox: false,
          orderId: order.id,
          keyId: process.env.RAZORPAY_KEY_ID,
          amount: order.amount,
          currency: order.currency,
          receipt: order.receipt,
          discountApplied,
          finalAmount: cleanAmount
        });
      } catch (rzpErr: any) {
        console.error("[Razorpay Live Order Failed] Crucial error during live transaction setup:", rzpErr);
        let errMsg = "communication error with Razorpay servers";
        if (rzpErr && typeof rzpErr === "object") {
          if (rzpErr.error && rzpErr.error.description) {
            errMsg = rzpErr.error.description;
          } else if (rzpErr.description) {
            errMsg = rzpErr.description;
          } else if (rzpErr.message) {
            errMsg = rzpErr.message;
          }
        }
        
        if (errMsg.toLowerCase().includes("authentication failed") || (rzpErr.error && rzpErr.error.code === "BAD_REQUEST_ERROR" && rzpErr.error.description === "Authentication failed")) {
          errMsg = "Razorpay Authentication Failed: Your RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is incorrect or invalid. Please check your developer API credentials dashboard and verify your workspace environment secrets.";
        }

        return res.status(500).json({
          success: false,
          message: `Live Gateway Order failed: ${errMsg}`
        });
      }
    } catch (err: any) {
      console.error("[Razorpay Core Handler Error]:", err);
      return res.status(500).json({
        success: false,
        message: err.message || "Razorpay Payment core initialization failure. Request refused."
      });
    }
  });

  // Verify Razorpay Payment Signature
  app.post("/api/payments/razorpay/verify", async (req, res) => {
    const { 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature, 
      isSandbox,
      couponCode,
      userId,
      userEmail,
      discountApplied,
      paidAmount
    } = req.body;

    try {
      // Secure processing of verified transaction
      const recordCouponUsageAndIncrement = async () => {
        if (!couponCode || typeof couponCode !== "string") return;
        const cleanCode = couponCode.trim().toUpperCase();
        try {
          if (process.env.VITE_SUPABASE_URL) {
            const { data: couponData } = await supabase
              .from("coupons")
              .select("*")
              .eq("coupon_code", cleanCode)
              .maybeSingle();

            if (couponData) {
              // Increment current_uses
              await supabase
                .from("coupons")
                .update({ current_uses: (couponData.current_uses || 0) + 1 })
                .eq("id", couponData.id);

              // Logs usage stats
              await supabase
                .from("coupon_usage")
                .insert({
                  coupon_id: couponData.id,
                  coupon_code: cleanCode,
                  user_id: userId || null,
                  discount_applied: discountApplied || 0,
                  paid_amount: paidAmount || 0
                });
                
              console.log(`[Database Coupon Log Successful] Applied ${cleanCode}`);
            }
          } else {
            // Local fallback incrementation
            const localCp = DUMMY_COUPONS.find(c => c.coupon_code === cleanCode);
            if (localCp) {
              localCp.current_uses += 1;
              MOCK_COUPON_USAGES.unshift({
                id: `use-${Date.now()}`,
                coupon_id: localCp.id,
                coupon_code: cleanCode,
                discount_applied: parseFloat(discountApplied) || 0,
                paid_amount: parseFloat(paidAmount) || 0,
                used_at: new Date().toISOString(),
                user_email: userEmail || "anonymous_subscriber@localos.com"
              });
              console.log(`[Local Sandbox Coupon Log Successful] Applied ${cleanCode}`);
            }
          }
        } catch (couponWriteErr) {
          console.error("Failed to commit coupon usage log record:", couponWriteErr);
        }
      };

      if (isSandbox) {
        return res.status(400).json({
          success: false,
          message: "Security violation: Sandbox payment verification is disabled."
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
        await recordCouponUsageAndIncrement();
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

  // Standard Razorpay Create Order Endpoint
  app.post("/api/create-order", async (req, res) => {
    const { amount, currency, receipt } = req.body;

    if (amount === undefined || amount === null) {
      return res.status(400).json({ success: false, message: "Amount is required." });
    }

    const intAmount = parseInt(amount, 10);
    if (isNaN(intAmount) || intAmount < 100) {
      return res.status(400).json({ success: false, message: "Amount must be at least 100 paise (1 INR)." });
    }

    const rzp = getRazorpayInstance();
    if (!rzp) {
      return res.status(500).json({ success: false, message: "Razorpay keys are missing or unconfigured on the server." });
    }

    try {
      const order = await rzp.orders.create({
        amount: intAmount,
        currency: currency || "INR",
        receipt: receipt || `receipt_std_${Date.now()}`
      });

      return res.json({
        success: true,
        order_id: order.id,
        amount: order.amount,
        currency: order.currency
      });
    } catch (err: any) {
      console.error("[Standard Razorpay Create Order Error]:", err);
      return res.status(500).json({ success: false, message: err.message || "Failed to create Razorpay order." });
    }
  });

  // Standard Razorpay Verify Signature Endpoint
  app.post("/api/verify-payment", async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing required verification parameters." });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return res.status(500).json({ success: false, message: "Razorpay configuration secret is missing on the server." });
    }

    try {
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(body)
        .digest("hex");

      if (expectedSignature === razorpay_signature) {
        return res.json({ success: true, message: "Payment successfully verified." });
      } else {
        return res.status(400).json({ success: false, message: "Invalid payment signature." });
      }
    } catch (err: any) {
      console.error("[Standard Razorpay Verify Payment Error]:", err);
      return res.status(500).json({ success: false, message: err.message || "Failed to verify transaction signature." });
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
    app.get("/", (req, res) => {
      res.json({
        status: "ok",
        service: "Wrindha OS Backend",
        health: "/api/health",
        config: "/api/config"
      });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Wrindha OS running at http://localhost:${PORT}`);
  });
}

startServer();
