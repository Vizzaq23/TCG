import { Resend, type CreateEmailOptions } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getOrderNotificationConfig,
  type OrderNotificationConfig,
} from "@/lib/shop/config";
import type { Database, Json } from "@/lib/types/database";

type Admin = SupabaseClient<Database>;

export type OrderNotificationKind =
  | "customer_order_confirmation"
  | "owner_new_order";

export type OrderNotificationDetails = {
  id: string;
  orderNumber: string;
  buyerEmail: string;
  shippingName: string | null;
  shippingAddress: Json | null;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
  storeName: string;
  supportEmail: string;
  items: Array<{
    title: string;
    condition: string | null;
    quantity: number;
    unitPriceCents: number;
  }>;
};

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );
}

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function addressLines(value: Json | null): string[] {
  if (!value || Array.isArray(value) || typeof value !== "object") return [];
  const line = (key: string) => {
    const candidate = value[key];
    return typeof candidate === "string" ? candidate.trim() : "";
  };
  const cityStatePostal = [line("city"), line("state"), line("postal_code")]
    .filter(Boolean)
    .join(", ")
    .replace(/, ([^,]+), /, ", $1 ");
  return [line("line1"), line("line2"), cityStatePostal, line("country")].filter(
    Boolean,
  );
}

function orderLines(details: OrderNotificationDetails): string[] {
  return details.items.map((item) => {
    const condition = item.condition ? ` (${item.condition})` : "";
    return `${item.quantity} × ${item.title}${condition} — ${formatMoney(
      item.unitPriceCents * item.quantity,
      details.currency,
    )}`;
  });
}

function summaryLines(details: OrderNotificationDetails): string[] {
  return [
    `Subtotal: ${formatMoney(details.subtotalCents, details.currency)}`,
    `Shipping: ${formatMoney(details.shippingCents, details.currency)}`,
    `Tax: ${formatMoney(details.taxCents, details.currency)}`,
    `Total: ${formatMoney(details.totalCents, details.currency)}`,
  ];
}

function emailShell(title: string, content: string): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#07090d;color:#f7f8fa;font-family:Arial,sans-serif">
    <div style="max-width:620px;margin:0 auto;padding:32px 20px">
      <div style="border:1px solid #2b313b;border-radius:16px;background:#11151b;padding:28px">
        <h1 style="margin:0 0 18px;font-size:24px;line-height:1.3">${escapeHtml(title)}</h1>
        ${content}
      </div>
    </div>
  </body>
</html>`;
}

function itemListHtml(details: OrderNotificationDetails): string {
  return `<ul style="padding-left:20px;line-height:1.7">${orderLines(details)
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join("")}</ul>`;
}

function totalsHtml(details: OrderNotificationDetails): string {
  return `<div style="margin-top:20px;border-top:1px solid #2b313b;padding-top:16px;line-height:1.7">${summaryLines(
    details,
  )
    .map((line, index) => `<div${index === 3 ? ' style="font-weight:700"' : ""}>${escapeHtml(line)}</div>`)
    .join("")}</div>`;
}

export function buildCustomerOrderEmail(
  details: OrderNotificationDetails,
  config: OrderNotificationConfig,
): CreateEmailOptions {
  const title = `Order ${details.orderNumber} confirmed`;
  const greeting = details.shippingName?.trim()
    ? `Hi ${details.shippingName.trim()},`
    : "Hello,";
  const text = [
    greeting,
    "",
    `We received your payment for order ${details.orderNumber}.`,
    "",
    ...orderLines(details),
    "",
    ...summaryLines(details),
    "",
    `Questions? Contact ${details.supportEmail}.`,
  ].join("\n");

  return {
    from: config.from,
    to: details.buyerEmail,
    replyTo: details.supportEmail,
    subject: `${details.storeName}: ${title}`,
    text,
    html: emailShell(
      title,
      `<p style="line-height:1.7">${escapeHtml(greeting)}</p>
       <p style="line-height:1.7">We received your payment. We will contact you when the order ships.</p>
       ${itemListHtml(details)}
       ${totalsHtml(details)}
       <p style="margin-top:22px;line-height:1.7;color:#b8c0cc">Questions? Email <a style="color:#f6c75b" href="mailto:${escapeHtml(
         details.supportEmail,
       )}">${escapeHtml(details.supportEmail)}</a>.</p>`,
    ),
    tags: [{ name: "category", value: "order_confirmation" }],
  };
}

export function buildOwnerOrderEmail(
  details: OrderNotificationDetails,
  config: OrderNotificationConfig,
): CreateEmailOptions {
  const address = addressLines(details.shippingAddress);
  const title = `New paid order ${details.orderNumber}`;
  const text = [
    title,
    `Customer: ${details.buyerEmail}`,
    details.shippingName ? `Ship to: ${details.shippingName}` : "",
    ...address,
    "",
    ...orderLines(details),
    "",
    ...summaryLines(details),
    "",
    "Verify the order in the protected store dashboard before fulfillment.",
  ]
    .filter((line, index, lines) => line || lines[index - 1] !== "")
    .join("\n");

  return {
    from: config.from,
    to: config.ownerEmail,
    replyTo: details.buyerEmail,
    subject: `${details.storeName}: ${title}`,
    text,
    html: emailShell(
      title,
      `<p style="line-height:1.7"><strong>Customer:</strong> ${escapeHtml(
        details.buyerEmail,
      )}</p>
       ${
         details.shippingName || address.length
           ? `<div style="line-height:1.7"><strong>Ship to:</strong><br>${[
               details.shippingName ?? "",
               ...address,
             ]
               .filter(Boolean)
               .map(escapeHtml)
               .join("<br>")}</div>`
           : ""
       }
       ${itemListHtml(details)}
       ${totalsHtml(details)}
       <p style="margin-top:22px;line-height:1.7;color:#f6c75b">Verify this order in the protected store dashboard before fulfillment.</p>`,
    ),
    tags: [{ name: "category", value: "new_order" }],
  };
}

async function loadOrderNotificationDetails(
  admin: Admin,
  orderId: string,
): Promise<OrderNotificationDetails> {
  const { data: order, error: orderError } = await admin
    .from("shop_orders")
    .select(
      "id, order_number, owner_user_id, buyer_email, shipping_name, shipping_address, subtotal_cents, shipping_cents, tax_cents, total_cents, currency, payment_status",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (orderError || !order || order.payment_status !== "paid") {
    throw new Error(orderError?.message ?? "paid_order_not_found");
  }

  const [{ data: settings, error: settingsError }, { data: items, error: itemsError }] =
    await Promise.all([
      admin
        .from("shop_settings")
        .select("store_name, support_email")
        .eq("owner_user_id", order.owner_user_id)
        .maybeSingle(),
      admin
        .from("shop_order_items")
        .select("title, condition, quantity, unit_price_cents")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true }),
    ]);

  if (settingsError || !settings?.support_email) {
    throw new Error(settingsError?.message ?? "shop_notification_settings_missing");
  }
  if (itemsError || !items?.length) {
    throw new Error(itemsError?.message ?? "shop_notification_items_missing");
  }

  return {
    id: order.id,
    orderNumber: order.order_number,
    buyerEmail: order.buyer_email,
    shippingName: order.shipping_name,
    shippingAddress: order.shipping_address,
    subtotalCents: order.subtotal_cents,
    shippingCents: order.shipping_cents,
    taxCents: order.tax_cents,
    totalCents: order.total_cents,
    currency: order.currency,
    storeName: settings.store_name,
    supportEmail: settings.support_email,
    items,
  };
}

async function sendClaimedNotification(input: {
  admin: Admin;
  resend: Resend;
  config: OrderNotificationConfig;
  details: OrderNotificationDetails;
  kind: OrderNotificationKind;
}) {
  const { data: claimed, error: claimError } = await input.admin.rpc(
    "shop_claim_order_notification",
    { p_order_id: input.details.id, p_kind: input.kind },
  );
  if (claimError) throw new Error(claimError.message);
  if (!claimed) return;

  try {
    const payload =
      input.kind === "customer_order_confirmation"
        ? buildCustomerOrderEmail(input.details, input.config)
        : buildOwnerOrderEmail(input.details, input.config);
    const { data, error } = await input.resend.emails.send(payload, {
      idempotencyKey: `${input.kind}/${input.details.id}`,
    });
    if (error || !data?.id) {
      throw new Error(error?.message ?? "email_provider_missing_message_id");
    }

    const { error: completeError } = await input.admin.rpc(
      "shop_complete_order_notification",
      {
        p_order_id: input.details.id,
        p_kind: input.kind,
        p_provider_message_id: data.id,
      },
    );
    if (completeError) throw new Error(completeError.message);
  } catch (error) {
    const message = error instanceof Error ? error.message : "order_notification_failed";
    await input.admin.rpc("shop_release_order_notification", {
      p_order_id: input.details.id,
      p_kind: input.kind,
      p_error: message,
    });
    throw error;
  }
}

export async function sendPaidOrderNotifications(admin: Admin, orderId: string) {
  const config = getOrderNotificationConfig();
  if (!config) throw new Error("order_notification_not_configured");

  const { error: enqueueError } = await admin.rpc(
    "shop_enqueue_paid_order_notifications",
    { p_order_id: orderId },
  );
  if (enqueueError) throw new Error(enqueueError.message);

  const details = await loadOrderNotificationDetails(admin, orderId);
  const resend = new Resend(config.apiKey);
  for (const kind of [
    "customer_order_confirmation",
    "owner_new_order",
  ] as const) {
    await sendClaimedNotification({ admin, resend, config, details, kind });
  }
}

