import {
  Activity, ArrowLeftRight, BadgeCheck, Banknote, BarChart3, Bell, Boxes, Bug, Building2,
  Calculator, CalendarClock, CalendarRange, Circle, ClipboardCheck, ClipboardList, Clock,
  Cog, Container, Cpu, CreditCard, Factory, FileCheck, FileEdit, FileOutput,
  FileSpreadsheet, FileText, FolderOpen, Gauge, Handshake, KeyRound, Layers,
  LayoutDashboard, MessageSquare, Package, PackageCheck, PackageMinus, Palette, PhoneCall,
  Receipt, ScanLine, Scissors, Scroll, ScrollText, SearchCheck, Send, ShieldCheck, Ship,
  Shirt, ShoppingBag, ShoppingCart, SlidersHorizontal, Sparkles, Sun, Timer, TriangleAlert,
  TrendingUp, Truck, Undo2, Upload, User, UserCog, Users, Warehouse, Wrench,
  type LucideIcon,
} from "lucide-react";

export const NAV_ICONS: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/alerts": TriangleAlert,
  "/analytics": BarChart3,
  "/approvals": BadgeCheck,
  "/notifications": Bell,

  "/finance/payables": CreditCard,
  "/finance/receivables": Banknote,
  "/finance/expenses": Receipt,
  "/finance/profitability": TrendingUp,

  "/buyers": Users,
  "/enquiries": MessageSquare,
  "/styles": Palette,
  "/samples": ClipboardCheck,
  "/orders": ShoppingBag,
  "/orders/amendments": FileEdit,
  "/tna": CalendarClock,
  "/costing": Calculator,
  "/bom": Layers,
  "/seasons": Sun,

  "/material-requirements": ClipboardList,
  "/prs": FileText,
  "/rfqs": Send,
  "/quotations": FileSpreadsheet,
  "/purchase-orders": ShoppingCart,
  "/purchase-orders/proforma-invoices": FileCheck,
  "/follow-ups": PhoneCall,
  "/suppliers": Factory,
  "/materials": Package,

  "/warehouses": Warehouse,
  "/inventory": Boxes,
  "/inventory/adjustments": SlidersHorizontal,
  "/inventory/transfers": ArrowLeftRight,
  "/material-returns": Undo2,
  "/fabric-rolls": Scroll,
  "/goods-receipts": PackageCheck,
  "/material-issues": PackageMinus,
  "/scan": ScanLine,

  "/production-orders": Cog,
  "/ppc": CalendarRange,
  "/ppc/capacity": Gauge,
  "/cutting": Scissors,
  "/sewing": Shirt,
  "/wip": Activity,
  "/finishing": Sparkles,
  "/subcontract": Handshake,
  "/ie": Timer,

  "/quality/inspections": SearchCheck,
  "/quality/defects": Bug,
  "/quality/aql": ShieldCheck,
  "/quality/capa": Wrench,

  "/packing/cartons": Container,
  "/shipments": Ship,
  "/shipments/forwarders": Truck,
  "/commercial/documents": FileOutput,

  "/admin/users": User,
  "/admin/roles": KeyRound,
  "/admin/audit-logs": ScrollText,
  "/admin/jobs": Cpu,
  "/admin/scheduled-reports": Clock,
  "/import": Upload,
  "/admin/portal-users": UserCog,

  "/organization": Building2,
  "/documents": FolderOpen,
};

// notun page-er icon na dile ei ekta dekhabe
export const iconFor = (href: string): LucideIcon => NAV_ICONS[href] ?? Circle;