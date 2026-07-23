import { NextResponse } from 'next/server';
import { magicRandomStr, mosySqlInsert } from '../../../apiUtils/dataControl/dataUtils';
import { mosySendSMS } from '../../../apiUtils/dataControl/send-sms';
import { mosySendEmail } from '../../../apiUtils/dataControl/send-gmail';

function nowSqlDateTime() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function nowSqlDate() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeChannel(channel = '') {
  const value = String(channel || '').trim().toLowerCase();
  if (value === 'sms') return ['sms'];
  if (value === 'email') return ['email'];
  if (value === 'both') return ['sms', 'email'];
  if (value === 'sms_email') return ['sms', 'email'];
  if (value === 'email_sms') return ['sms', 'email'];
  if (value === 'whatsapp') return ['whatsapp'];
  return ['sms'];
}

function buildSentBy(auth = {}) {
  return (
    auth?.full_name ||
    auth?.user_name ||
    auth?.email ||
    auth?.record_id ||
    'system'
  );
}

function cleanValue(v, fallback = '') {
  return v === undefined || v === null ? fallback : String(v);
}

async function sendByChannel(channel, messagePayload) {
  if (channel === 'sms') {
    if (!messagePayload.recipient_phone) {
      return { status: 'error', message: 'Missing recipient phone', data: null };
    }
    return mosySendSMS(messagePayload.recipient_phone, messagePayload.message_content);
  }

  if (channel === 'email') {
    if (!messagePayload.recipient_email) {
      return { status: 'error', message: 'Missing recipient email', data: null };
    }
    return mosySendEmail(
      messagePayload.recipient_email,
      messagePayload.message_subject,
      messagePayload.message_content
    );
  }

  if (channel === 'whatsapp') {
    return {
      status: 'success',
      message: 'WhatsApp share queued (manual flow)',
      data: null
    };
  }

  return { status: 'error', message: `Unsupported channel: ${channel}`, data: null };
}

function buildMessageRow({ payload = {}, auth = {}, channel, requestId }) {
  const nowDateTime = nowSqlDateTime();
  const nowDate = nowSqlDate();
  const recordId = magicRandomStr(7);

  return {
    record_id: recordId,
    message_number: cleanValue(payload.message_number, `MSG-${Date.now()}-${channel}`),
    related_record_id: cleanValue(payload.related_record_id || payload.client_id || payload.record_id || ''),
    recipient_name: cleanValue(payload.recipient_name || payload.user_name || payload.full_name || payload.business_name || 'Client'),
    recipient_phone: cleanValue(payload.recipient_phone || payload.phone || payload.phone_number || ''),
    recipient_email: cleanValue(payload.recipient_email || payload.email || payload.email_address || payload.primary_email || ''),
    message_channel: channel,
    message_subject: cleanValue(payload.message_subject || payload.subject || ''),
    message_content: cleanValue(payload.message_content || payload.body || payload.message || ''),
    message_status: 'pending',
    delivery_status: 'pending',
    request_source: cleanValue(payload.request_source, 'smart_message_ui'),
    request_id: cleanValue(payload.request_id, requestId),
    sent_by: buildSentBy(auth),
    scheduled_for: cleanValue(payload.scheduled_for || ''),
    sent_on: '',
    delivered_on: '',
    read_on: '',
    failed_on: '',
    failure_reason: '',
    created_on: nowDate,
    created_at: nowDateTime,
    updated_at: nowDateTime,
    hive_site_id: cleanValue(auth?.hive_site_id, cleanValue(payload.hive_site_id, '')),
    hive_site_name: cleanValue(auth?.hive_site_name, cleanValue(payload.hive_site_name, ''))
  };
}

export async function sendUtilMessage({ auth = {}, payload = {} }) {
  try {
    const channels = normalizeChannel(payload?.message_channel || payload?.channel);
    const requestId = cleanValue(payload?.request_id, `REQ-${Date.now()}-${magicRandomStr(4)}`);

    const results = [];

    for (const channel of channels) {
      const row = buildMessageRow({ payload, auth, channel, requestId });

      const sendResult = await sendByChannel(channel, row);
      const sentNow = sendResult?.status === 'success';
      const nowDateTime = nowSqlDateTime();

      row.message_status = sentNow ? 'sent' : 'failed';
      row.delivery_status = sentNow ? 'sent' : 'failed';
      row.sent_on = sentNow ? nowDateTime : '';
      row.delivered_on = sentNow ? nowDateTime : '';
      row.failed_on = sentNow ? '' : nowDateTime;
      row.failure_reason = sentNow ? '' : cleanValue(sendResult?.message, 'Send failed');
      row.updated_at = nowDateTime;

       const insertResult = await mosySqlInsert("smart_messages", row, payload);

      results.push({
        channel,
        record_id: row.record_id,
        insert: insertResult,
        delivery: sendResult
      });
    }

    const successItems = results.filter((r) => r.delivery?.status === 'success');
    const failedItems = results.filter((r) => r.delivery?.status !== 'success');
    const successCount = successItems.length;
    const failedCount = failedItems.length;
    const hasAnyFailure = failedCount > 0;

    const failedChannels = failedItems.map((item) => ({
      channel: item.channel,
      reason: item?.delivery?.message || 'Delivery failed'
    }));

    const sentChannels = successItems.map((item) => item.channel);

    const statusLabel = hasAnyFailure
      ? (successCount > 0 ? 'partial_success' : 'failed')
      : 'success';

    const humanMessage = !hasAnyFailure
      ? `Message sent successfully via ${sentChannels.join(', ')}`
      : successCount > 0
        ? `Sent via ${sentChannels.join(', ')}. Failed via ${failedChannels.map((x) => x.channel).join(', ')}.`
        : `Message failed via ${failedChannels.map((x) => x.channel).join(', ')}.`;

    return {
      success: !hasAnyFailure,
      status: statusLabel,
      message: humanMessage,
      data: {
        request_id: requestId,
        selected_channel: payload?.message_channel || payload?.channel || 'sms',
        channels_processed: channels,
        sent_count: successCount,
        failed_count: failedCount,
        sent_channels: sentChannels,
        failed_channels: failedChannels,
        results
      }
    }
  } catch (error) {
    console.error('Error in sendUtilMessage:', error);
    return {
      
        success: false,
        message: error.message || 'Operation failed'
    }
  }
}
