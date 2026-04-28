import type { ComponentProps } from "react";

import { InvoiceTemplate } from "@/lib/invoice-template";

export function InvoicePreview({
  invoice
}: {
  invoice: ComponentProps<typeof InvoiceTemplate>["invoice"];
}) {
  return <InvoiceTemplate invoice={invoice} />;
}
