
export type AdminUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "user";
};
