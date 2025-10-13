
export type AdminUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "user";
  name?: string; // For compatibility
  isSuperUser?: boolean; // Computed field for super user status
};
