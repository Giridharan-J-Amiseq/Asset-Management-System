export const navigationItems = [
  { path: "/dashboard", label: "Dashboard", roles: ["Admin", "IT Manager"] },
  { path: "/assets", label: "Manage Asset", roles: ["Admin", "IT Manager", "Viewer"] },
  { path: "/transactions", label: "Asset Transaction", roles: ["Admin", "IT Manager"] },
  { path: "/assign", label: "Assign Asset", roles: ["Admin", "IT Manager"] },
  { path: "/transfer", label: "Transfer Asset", roles: ["Admin", "IT Manager"] },
  { path: "/maintenance", label: "Maintenance", roles: ["Admin", "IT Manager"] },
  { path: "/users", label: "Users", roles: ["Admin"] },
  { path: "/qr-print", label: "QR Print", roles: ["Admin", "IT Manager"] },
];

export const assetTypes = ["Laptop", "Desktop", "Server", "Furniture", "Printer", "Phone", "Monitor", "UPS", "Other"];
export const assetStatuses = ["Available", "Assigned", "In Repair", "Retired", "Lost"];
export const assetConditions = ["New", "Good", "Damaged"];
export const maintenanceIssueTypes = ["Repair", "Physical Damage", "Theft", "Software Issue"];
export const userRoles = ["Admin", "IT Manager", "Viewer"];
