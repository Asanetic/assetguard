import { NextResponse } from "next/server";
import {
  magicRandomStr,
  mosyQddata,
  mosyFlexQuickSel,
  mosySqlInsert,
  mosySqlUpdate
} from "../../apiUtils/dataControl/dataUtils";
import { mosySendSMS } from "../../apiUtils/dataControl/send-sms";
import { mosySendEmail } from "../../apiUtils/dataControl/send-gmail";

export async function POST(request) {
  try {
    // Equivalent of file_get_contents('php://input')
    const trx_record = await request.json();

    const tr_type = trx_record.TransactionType;
    const trans_id = trx_record.TransID;
    const TransTime = trx_record.TransTime;
    const TransAmount = trx_record.TransAmount;
    const BusinessShortCode = trx_record.BusinessShortCode;
    const BillRefNumber = trx_record.BillRefNumber;
    const OrgAccountBalance = trx_record.OrgAccountBalance;
    const ThirdPartyTransID = trx_record.ThirdPartyTransID;
    const MSISDN = trx_record.MSISDN;
    const FirstName = trx_record.FirstName;
    const MiddleName = trx_record.MiddleName;
    const LastName = trx_record.LastName;

    const now = new Date();

    const trx_time_stamp =
      now.getFullYear() +
      "-" +
      String(now.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(now.getDate()).padStart(2, "0") +
      " " +
      String(now.getHours()).padStart(2, "0") +
      ":" +
      String(now.getMinutes()).padStart(2, "0") +
      ":" +
      String(now.getSeconds()).padStart(2, "0");

    const trx_date =
      now.getFullYear() +
      "-" +
      String(now.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(now.getDate()).padStart(2, "0");

    console.log({
      tr_type,
      trans_id,
      TransTime,
      TransAmount,
      BusinessShortCode,
      BillRefNumber,
      OrgAccountBalance,
      ThirdPartyTransID,
      MSISDN,
      FirstName,
      MiddleName,
      LastName,
      trx_time_stamp,
      trx_date,
    });

    const esc = (val = "") => String(val).replace(/'/g, "''");

    // 1) Try to resolve related request by request_reference first (BillRefNumber), then shortcode
    let relatedRequest = null;

    if (BusinessShortCode) {
      relatedRequest = await mosyQddata(
        "smart_payment_requests",
        "payment_shortcode",
        String(BusinessShortCode)
      );
    }
 
    // 2) Resolve hive_site from request first, fallback to settings (setting_code=shortcode)
    let hive_site_id = relatedRequest?.hive_site_id || "";
    let hive_site_name = relatedRequest?.hive_site_name || "";

    if (!hive_site_id && BusinessShortCode) {
      const settingsRow = await mosyFlexQuickSel(
        "smart_payment_settings",
        "hive_site_id, hive_site_name",
        `WHERE setting_code='shortcode' AND setting_value='${esc(BusinessShortCode)}' ORDER BY primkey DESC LIMIT 1`,
        "r"
      );

      if (settingsRow) {
        hive_site_id = settingsRow.hive_site_id || "";
        hive_site_name = settingsRow.hive_site_name || "";
      }
    }

    // 3) Idempotency: skip duplicate transaction_code
    const existingRow = await mosyQddata(
      "smart_payments",
      "transaction_code",
      String(trans_id || "")
    );

    if (existingRow) {
      return NextResponse.json({
        ResultCode: 0,
        ResultDesc: "Accepted",
        status: "success",
        message: "Duplicate IPN ignored",
      });
    }

    // 4) Insert smart_payments record
    const paymentRecordId = magicRandomStr(7);
    const paymentReference = `PAY-${Date.now()}`;
    const amountPaid = Number(TransAmount || 0) || 0;
    const requestReference = relatedRequest?.request_reference || String(BillRefNumber || "");

    const paymentInsertFields = {
      record_id: "?",
      payment_reference: "?",
      request_reference: "?",
      related_module: "?",
      related_record_id: "?",
      receipt_number: "?",
      payer_name: "?",
      payer_phone: "?",
      payer_email: "?",
      payment_method: "?",
      payment_channel: "?",
      transaction_code: "?",
      currency: "?",
      amount_paid: "?",
      payment_description: "?",
      payment_notes: "?",
      payment_date: "?",
      payment_status: "?",
      processed_by: "?",
      created_on: "?",
      updated_on: "?",
      created_at: "?",
      updated_at: "?",
      hive_site_id: "?",
      hive_site_name: "?"
    };

    const paymentInsertBody = {
      record_id: paymentRecordId,
      payment_reference: paymentReference,
      request_reference: requestReference,
      related_module: relatedRequest?.related_module || "smart_payment_requests",
      related_record_id: relatedRequest?.related_record_id || relatedRequest?.record_id || "",
      receipt_number: String(trans_id || ""),
      payer_name: [FirstName, MiddleName, LastName].filter(Boolean).join(" ").trim() || relatedRequest?.payer_name || "",
      payer_phone: String(MSISDN || relatedRequest?.payer_phone || ""),
      payer_email: String(relatedRequest?.payer_email || ""),
      payment_method: "M-Pesa",
      payment_channel: String(tr_type || "PayBill"),
      transaction_code: String(trans_id || ""),
      currency: "KES",
      amount_paid: String(amountPaid),
      payment_description: String(relatedRequest?.request_title || "Payment received"),
      payment_notes: `IPN BillRef: ${BillRefNumber || ""}; OrgBalance: ${OrgAccountBalance || ""}; ThirdPartyTransID: ${ThirdPartyTransID || ""}`,
      payment_date: trx_date,
      payment_status: "Completed",
      processed_by: "ipn-webhook",
      created_on: trx_date,
      updated_on: trx_time_stamp,
      created_at: trx_time_stamp,
      updated_at: trx_time_stamp,
      hive_site_id,
      hive_site_name
    };

    await mosySqlInsert("smart_payments", paymentInsertFields, paymentInsertBody);

    // 5) Update request using shortcode + hive site (+ request_reference when provided)
    if (BusinessShortCode && hive_site_id) {
      const whereBase =
        `WHERE payment_shortcode='${esc(BusinessShortCode)}' AND hive_site_id='${esc(hive_site_id)}'`;
      const whereWithRef = BillRefNumber
        ? `${whereBase} AND request_reference='${esc(BillRefNumber)}'`
        : whereBase;

      let updateTarget = await mosyFlexQuickSel(
        "smart_payment_requests",
        "*",
        `${whereWithRef} ORDER BY primkey DESC LIMIT 1`,
        "r"
      );

      // fallback if request_reference did not match
      if (!updateTarget) {
        updateTarget = await mosyFlexQuickSel(
          "smart_payment_requests",
          "*",
          `${whereBase} ORDER BY primkey DESC LIMIT 1`,
          "r"
        );
      }

      if (updateTarget?.primkey) {
        const prevPaid = Number(updateTarget.amount_paid || 0) || 0;
        const requested = Number(updateTarget.amount_requested || 0) || 0;
        const newPaid = prevPaid + amountPaid;
        const newBalance = Math.max(requested - newPaid, 0);
        const newStatus = newBalance <= 0 ? "Paid" : "Partially Paid";

        const requestUpdateFields = {
          amount_paid: "?",
          balance_amount: "?",
          request_status: "?",
          updated_on: "?",
          updated_at: "?"
        };

        const requestUpdateBody = {
          amount_paid: String(newPaid),
          balance_amount: String(newBalance),
          request_status: newStatus,
          updated_on: trx_time_stamp,
          updated_at: trx_time_stamp
        };

        await mosySqlUpdate(
          "smart_payment_requests",
          requestUpdateFields,
          requestUpdateBody,
          `primkey='${updateTarget.primkey}'`
        );

        relatedRequest = {
          ...updateTarget,
          amount_paid: String(newPaid),
          balance_amount: String(newBalance),
          request_status: newStatus,
        };
      }
    }

    // 6) Optional admin + payer notifications (best-effort, does not fail IPN)
    let notifyResult = { email: null, sms: null };
    let payerNotifyResult = { email: null, sms: null };
    try {
      const adminEmailRow = await mosyFlexQuickSel(
        "smart_payment_settings",
        "setting_value",
        `WHERE setting_code='admin_email' AND hive_site_id='${esc(hive_site_id)}' ORDER BY primkey DESC LIMIT 1`,
        "r"
      );

      const adminTelRow = await mosyFlexQuickSel(
        "smart_payment_settings",
        "setting_value",
        `WHERE setting_code='admin_tel' AND hive_site_id='${esc(hive_site_id)}' ORDER BY primkey DESC LIMIT 1`,
        "r"
      );

      const adminEmail = String(adminEmailRow?.setting_value || "").trim();
      const adminTel = String(adminTelRow?.setting_value || "").trim();

      const payerFullName = [FirstName, MiddleName, LastName].filter(Boolean).join(" ").trim() || "Unknown Payer";
      const requestTitle = relatedRequest?.request_title || "N/A";
      const requestRef = relatedRequest?.request_reference || String(BillRefNumber || "N/A");
      const amountLabel = String(TransAmount || "0");
      const requestNotes = relatedRequest?.request_notes || "N/A";

      const notifySubject = `Payment Received: ${requestRef}`;
      const notifyMessage =
        `Payment received notification\n` +
        `Payer: ${payerFullName}\n` +
        `Phone: ${MSISDN || "N/A"}\n` +
        `Reference: ${requestRef}\n` +
        `Receipt/Trans ID: ${trans_id || "N/A"}\n` +
        `Amount: ${amountLabel}\n` +
        `Request Title: ${requestTitle}\n` +
        `Request Notes: ${requestNotes}\n` +
        `Shortcode: ${BusinessShortCode || "N/A"}\n` +
        `Date: ${trx_time_stamp}`;

      if (adminEmail) {
        notifyResult.email = await mosySendEmail(adminEmail, notifySubject, notifyMessage);
      }

      if (adminTel) {
        notifyResult.sms = await mosySendSMS(adminTel, notifyMessage);
      }

      // Payer acknowledgement (send only when contact is available)
      const payerName =
        String(relatedRequest?.payer_name || [FirstName, MiddleName, LastName].filter(Boolean).join(" ").trim() || "Customer");
      const payerPhone = String(relatedRequest?.payer_phone || MSISDN || "").trim();
      const payerEmail = String(relatedRequest?.payer_email || "").trim();
      const payerRequestTitle = String(relatedRequest?.request_title || "Payment Request").trim();
      const payerRequestRef = String(relatedRequest?.request_reference || BillRefNumber || "N/A").trim();
      const payerAmountRequested = Number(relatedRequest?.amount_requested || 0) || 0;
      const payerAmountPaid = Number(relatedRequest?.amount_paid || amountPaid || 0) || 0;
      const payerBalance = Number(relatedRequest?.balance_amount || Math.max(payerAmountRequested - payerAmountPaid, 0)) || 0;
      const payerLastPaid = Number(amountPaid || 0) || 0;

      const ackSubject = `Payment Received: ${payerRequestRef}`;
      const ackMessage =
        `Hello ${payerName},\n` +
        `We have received your payment.\n\n` +
        `Request: ${payerRequestTitle}\n` +
        `Reference: ${payerRequestRef}\n` +
        `Amount Requested: ${payerAmountRequested}\n` +
        `Amount Paid (This Payment): ${payerLastPaid}\n` +
        `Total Amount Paid: ${payerAmountPaid}\n` +
        `Balance Amount: ${payerBalance}\n` +
        `Receipt/Trans ID: ${trans_id || "N/A"}\n` +
        `Date: ${trx_time_stamp}\n\n` +
        `Thank you.`;

      if (payerEmail) {
        payerNotifyResult.email = await mosySendEmail(payerEmail, ackSubject, ackMessage);
      }

      if (payerPhone) {
        payerNotifyResult.sms = await mosySendSMS(payerPhone, ackMessage);
      }
    } catch (notifyErr) {
      console.error("Admin notify error:", notifyErr);
    }

    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: "Accepted",
      status: "success",
      data: {
        request_reference: relatedRequest?.request_reference || String(BillRefNumber || ""),
        hive_site_id,
        hive_site_name,
        notify_result: notifyResult,
        payer_notify_result: payerNotifyResult
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        ResultCode: 1,
        ResultDesc: "Failed",
      },
      { status: 500 }
    );
  }
}
