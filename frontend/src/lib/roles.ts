/**
 * ROLE SYSTEM - MASTER PROMPT SPECIFICATION
 * Two-role architecture: PROVIDER and INSURANCE_REVIEWER
 */

export type UserRole = "provider" | "reviewer";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organization: string;
  contact?: string;
  avatar?: string;
}

export interface RoleConfig {
  role: UserRole;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  badgeBg: string;
  badgeText: string;
  allowedRoutes: string[];
}

export const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  provider: {
    role: "provider",
    label: "Healthcare Provider",
    description: "Submit treatment authorization requests, upload documents, and track status.",
    color: "text-teal-600",
    bgColor: "bg-teal-50",
    borderColor: "border-teal-200",
    badgeBg: "bg-teal-100",
    badgeText: "text-teal-600",
    allowedRoutes: [
      "/provider/dashboard",
      "/provider/create-request",
      "/provider/requests",
      "/provider/requests/:id",
      "/profile",
      "/notifications",
    ],
  },
  reviewer: {
    role: "reviewer",
    label: "Insurance Payer",
    description: "Payer decision support platform: rule evaluation, RAG policy evidence, ML complexity triage, and clinical review.",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-700",
    allowedRoutes: [
      "/reviewer/dashboard",
      "/reviewer/review-queue",
      "/reviewer/requests",
      "/reviewer/requests/:id",
      "/reviewer/policy-companion",
      "/reviewer/policies",
      "/reviewer/policies/:id",
      "/reviewer/audit-trail",
      "/profile",
      "/notifications",
    ],
  },
};

/**
 * MOCK USER PROFILES - DEMO CREDENTIALS
 * Provider: provider@demo.com / Provider@123
 * Reviewer: reviewer@demo.com / Reviewer@123
 */
export const USER_PROFILES: Record<UserRole, UserProfile> = {
  provider: {
    id: "p-001",
    name: "Dr. James Collins",
    email: "provider@demo.com",
    role: "provider",
    organization: "Northwestern Memorial Hospital",
    contact: "(312) 555-0147",
  },
  reviewer: {
    id: "r-001",
    name: "Sarah Henderson",
    email: "reviewer@demo.com",
    role: "reviewer",
    organization: "BlueCross BlueShield Insurance",
    contact: "(312) 555-0198",
  },
};

/**
 * NAVIGATION CONFIGURATION PER ROLE
 * MASTER PROMPT SPECIFICATION - Section 6 & 7
 */
export const ROLE_NAV_GROUPS: Record<
  UserRole,
  Array<{
    label: string;
    items: Array<{ href: string; label: string; icon: string }>;
  }>
> = {
  // PROVIDER SIDEBAR
  provider: [
    {
      label: "Main",
      items: [
        { href: "/provider/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
        { href: "/provider/create-request", label: "New Authorization", icon: "FilePlus2" },
        { href: "/provider/requests", label: "My Requests", icon: "FileText" },
      ],
    },
    {
      label: "Workspace",
      items: [
        { href: "/notifications", label: "Notifications", icon: "Bell" },
      ],
    },
    {
      label: "Account",
      items: [
        { href: "/profile", label: "Profile", icon: "User" },
      ],
    },
  ],

  // REVIEWER SIDEBAR
  reviewer: [
    {
      label: "Main",
      items: [
        { href: "/reviewer/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
        { href: "/reviewer/review-queue", label: "Review Queue", icon: "Stethoscope" },
        { href: "/reviewer/requests", label: "All Requests", icon: "FileText" },
      ],
    },
    {
      label: "Clinical",
      items: [
        { href: "/reviewer/policies", label: "Policies", icon: "BookOpen" },
        { href: "/reviewer/policy-companion", label: "Policy Companion", icon: "Sparkles" },
      ],
    },
    {
      label: "Compliance",
      items: [
        { href: "/reviewer/audit-trail", label: "Audit Trail", icon: "History" },
      ],
    },
    {
      label: "Account",
      items: [
        { href: "/notifications", label: "Notifications", icon: "Bell" },
        { href: "/profile", label: "Profile", icon: "User" },
      ],
    },
  ],
};
