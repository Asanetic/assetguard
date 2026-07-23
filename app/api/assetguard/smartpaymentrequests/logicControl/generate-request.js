/**
 * ════════════════════════════════════════════════════════════════
 * FILE: generate-request.ts
 * PURPOSE: Backend API handlers for generate-request
 * Function flow notes
 add your notes on how the function works here  * ════════════════════════════════════════════════════════════════
 */

import { magicRandomStr } from '../../../apiUtils/dataControl/dataUtils';
import { AddSmartPaymentRequests, UpdateSmartPaymentRequests } from '../smartpaymentrequests/SmartPaymentRequestsDbGateway';

// ════════════════════════════════════════════════════════════════
// COMMON UTILITIES IMPORT
// ════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════
// HANDLER: createPayrequest
// AUTH: Authentication and user data
// PAYLOAD: Request data from frontend
// RETURNS: NextResponse with { success, message, data }
/* 
createPayrequest Flow

*/
// ════════════════════════════════════════════════════════════════
export async function createPayrequest({ auth = {}, payload = {} }) {
  try {
    const payerName = String(payload?.payer_name || payload?.name || '').trim();
    const payerPhone = String(payload?.payer_phone || payload?.tel || payload?.phone || '').trim();
    const payerEmail = String(payload?.payer_email || payload?.email || '').trim();
    const amountRequested = Number(payload?.amount_requested ?? payload?.amount ?? 0);

    if (!payerName) {
      return { success: false, message: 'Payer name is required', data: null };
    }

    if (!amountRequested || Number.isNaN(amountRequested) || amountRequested <= 0) {
      return { success: false, message: 'Amount must be greater than zero', data: null };
    }

    const newId = magicRandomStr(7);
    const updatePrimkey = String(payload?.smart_payment_requests_dataNode || payload?.primkey || '').trim();
    const isUpdate = !!updatePrimkey;
    const nowDate = new Date().toISOString().slice(0, 10);
    const nowDateTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const requestReference = String(payload?.request_reference || '').trim() || magicRandomStr(5);

    const insertPayload = {
      record_id: newId,
      request_reference: requestReference,
      request_title: payload?.request_title || `Payment request for ${payerName}`,
      related_module: payload?.related_module || 'smart_payment_requests',
      related_record_id: payload?.related_record_id || '',
      payer_name: payerName,
      payer_phone: payerPhone,
      payer_email: payerEmail,
      amount_requested: String(amountRequested),
      amount_paid: String(payload?.amount_paid || 0),
      balance_amount: String(payload?.balance_amount ?? amountRequested),
      payment_shortcode: payload?.payment_shortcode || '',
      payment_link: payload?.payment_link || '',
      request_notes: payload?.request_notes || payload?.remark || '',
      expiry_date: payload?.expiry_date || '',
      request_status: payload?.request_status || 'Pending',
      created_by: auth?.full_name || auth?.user_name || auth?.email || '',
      created_on: nowDate,
      updated_on: nowDateTime,
      created_at: nowDateTime,
      updated_at: nowDateTime,
      hive_site_id: auth?.hive_site_id || '',
      hive_site_name: auth?.hive_site_name || ''
    };

    if (isUpdate) {
      // Keep existing record_id unless caller explicitly wants to replace it.
      delete insertPayload.record_id;
      const updateResult = await UpdateSmartPaymentRequests(
        newId,
        insertPayload,
        payload,
        auth,
        `primkey='${updatePrimkey}'`
      );

      return {
        success: true,
        message: 'Payment request updated successfully',
        data: {
          smart_payment_requests_dataNode: updatePrimkey,
          request_reference: insertPayload.request_reference,
          request_status: insertPayload.request_status,
          update_result: updateResult
        }
      };
    }

    const insertResult = await AddSmartPaymentRequests(newId, insertPayload, payload, auth);

    return {
      success: true,
      message: 'Payment request created successfully',
      data: {
        record_id: newId,
        smart_payment_requests_dataNode: insertResult?.record_id,
        request_reference: insertPayload.request_reference,
        request_status: insertPayload.request_status
      }
    };
  } catch (error) {
    console.error('Error in createPayrequest:', error);
    return {
      success: false,
      message: error.message || 'Operation failed',
      data: null
    };
  }
}
