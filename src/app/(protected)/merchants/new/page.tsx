import { getTenants } from "@/lib/data";
import NewMerchantPageClient from "./client-page";

export default async function NewMerchantPage() {
  const tenants = await getTenants();
  return <NewMerchantPageClient tenants={tenants} />;
}
