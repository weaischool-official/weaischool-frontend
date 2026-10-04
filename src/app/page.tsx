import { redirect } from "next/navigation";

export default function HomePage() {
  // Root URL pe aate hi Super Admin Login pe bhej do
  redirect("/login");
}