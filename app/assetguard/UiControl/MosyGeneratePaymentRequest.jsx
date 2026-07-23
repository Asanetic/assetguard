/**
 * Final FILE: generate-request.jsx
 * Auto Generated Frontend Functions
 */

import { MosyCard , closeMosyCard} from '../../components/MosyCard';
import { mosyPostData, magicRandomStr } from '../../MosyUtils/hiveUtils';
import { MosyNotify } from '../../MosyUtils/ActionModals';
import { getApiRoutes } from '../AppRoutes/apiRoutesHandler';
import { MosySendSmartMessage } from './MosySmartComms';

const apiRoutes = getApiRoutes();

export function buildRequestReference(rawPayerName = "", existingRef = "") {
  const current = String(existingRef || "").trim();
  if (current) return current;

  const cleanName = String(rawPayerName || "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim();

  const prefix = cleanName
    ? cleanName
        .split(/\s+/)
        .map((part) => part.charAt(0))
        .join("")
        .toUpperCase()
        .slice(0, 4)
    : "REQ";

  return `${prefix}${magicRandomStr(4)}`;
}

function autoFillRequestReference() {
  const refInput = document.getElementById("spr_request_reference");
  const payerNameInput = document.getElementById("spr_payer_name");
  if (!refInput) return;

  const nextRef = buildRequestReference(
    payerNameInput?.value || "",
    refInput?.value || ""
  );

  if (!refInput.value?.trim()) {
    refInput.value = nextRef;
  }
}

function collectRequestFormData() {
  return {
    request_reference: (document.getElementById('spr_request_reference')?.value || '').trim(),
    request_title: (document.getElementById('spr_payment_for')?.value || '').trim(),
    payer_name: (document.getElementById('spr_payer_name')?.value || '').trim(),
    payer_phone: (document.getElementById('spr_payer_tel')?.value || '').trim(),
    payer_email: (document.getElementById('spr_payer_email')?.value || '').trim(),
    amount_requested: (document.getElementById('spr_amount')?.value || '').trim(),
    payment_shortcode: (document.getElementById('spr_account_number')?.value || '').trim(),
    request_notes: (document.getElementById('spr_request_notes')?.value || '').trim(),
    smart_payment_requests_dataNode: (document.getElementById('spr_data_node')?.value || '').trim()
  };
}

function openSendRequestCard(requestData = {}) {
  const prettyAmount = requestData?.amount_requested
    ? Number(requestData.amount_requested).toLocaleString()
    : '-';

  MosyCard(
    '',
    <div className="col-md-12 p-0">
      <div className="bg-white rounded p-3 p-md-4">
        <div className="border-bottom pb-2 mb-3">
          <h5 className="mb-1 font-weight-bold text-dark">Send Payment Request</h5>
          <small className="text-muted">Please review request details before sending.</small>
        </div>

        <div className="border rounded p-3 bg-light text-left">
          <div className="row m-0">
            <div className="col-md-6 p-1"><strong>Reference:</strong> {requestData?.request_reference || '-'}</div>
            <div className="col-md-6 p-1"><strong>Title:</strong> {requestData?.request_title || '-'}</div>
            <div className="col-md-6 p-1"><strong>Name:</strong> {requestData?.payer_name || '-'}</div>
            <div className="col-md-6 p-1"><strong>Tel:</strong> {requestData?.payer_phone || '-'}</div>
            <div className="col-md-6 p-1"><strong>Email:</strong> {requestData?.payer_email || '-'}</div>
            <div className="col-md-6 p-1"><strong>Amount:</strong> {prettyAmount}</div>
            <div className="col-md-6 p-1"><strong>Account:</strong> {requestData?.payment_shortcode || '-'}</div>
            <div className="col-md-12 p-1"><strong>Notes:</strong> {requestData?.request_notes || '-'}</div>
          </div>
        </div>

        <div className="text-right pt-3">
          <button type="button" className="btn btn-outline-secondary btn-sm mr-2" onClick={() => closeMosyCard("modal1")}>
            Back
          </button>
          <button
            type="button"
            className="btn btn-info btn-sm px-4"
            onClick={() => {
              const amountLabel = requestData?.amount_requested
                ? Number(requestData.amount_requested).toLocaleString()
                : requestData?.amount_requested || '';

              const prefilledMessage = [
                `Hello ${requestData?.payer_name || 'Customer'},`,
                '',
                `Please find your payment request${requestData?.request_title ? ` for ${requestData.request_title}` : ''}.`,
                `Amount: ${amountLabel}`,
                `Paybill Number: ${requestData?.payment_shortcode || '-'}`,
                `Account Number: ${requestData?.request_reference || '-'}`,
                '',
                requestData?.request_notes || '',
                '',
                'Thank you.'
              ].join('\n');

              MosySendSmartMessage({
                profileDataNode:{
                  name: requestData?.payer_name || '',
                  tel: requestData?.payer_phone || '',
                  email: requestData?.payer_email || '',
                  record_id: requestData?.smart_payment_requests_dataNode || '',
                  amount: requestData?.amount_requested || '',
                  payment_shortcode: requestData?.payment_shortcode || '',
                  request_title: requestData?.request_title || '',
                  request_reference : requestData?.request_reference || '',
                  request_notes: requestData?.request_notes || ''
                },
                uiOptions: {
                  modalTitle: 'Send Payment Request Message',
                  subject: requestData?.request_title || 'Payment Request',
                  message: prefilledMessage
                }}
              );

              closeMosyCard("modal1");
            }}
          >
            Send Request
          </button>
        </div>
      </div>
    </div>,
    true,
    'modal1',
    'mosycard_medium'
  );
}

// ════════════════════════════════════════════════════════════════
// FUNCTION: createPayrequest
// ════════════════════════════════════════════════════════════════
async function submitPayrequest(prefillData = {}) {
  const formData = collectRequestFormData();
  const currentPrimkey = formData.smart_payment_requests_dataNode;
  const payload = {
    request_reference: formData.request_reference,
    request_title: formData.request_title,
    payer_name: formData.payer_name,
    payer_phone: formData.payer_phone,
    payer_email: formData.payer_email,
    amount_requested: formData.amount_requested,
    payment_shortcode: formData.payment_shortcode,
    request_notes: formData.request_notes,
    related_module: 'smartpaymentrequests',
    related_record_id: '',
    smart_payment_requests_dataNode: currentPrimkey
  };

  if (!payload.payer_name) {
    MosyNotify({ message: 'Name is required', icon: 'times-circle', iconColor: 'text-danger' });
    return;
  }

  if (!payload.amount_requested) {
    MosyNotify({ message: 'Amount is required', icon: 'times-circle', iconColor: 'text-danger' });
    return;
  }

  if (!payload.request_reference) {
    payload.request_reference = buildRequestReference(payload.payer_name, payload.request_reference);
    const refInput = document.getElementById('spr_request_reference');
    if (refInput) refInput.value = payload.request_reference;
  }

  MosyNotify({
    message: currentPrimkey ? 'Updating payment request...' : 'Creating payment request...',
    icon: 'send',
    addTimer: false
  });

  const response = await mosyPostData({
    url: apiRoutes.smartapi.base,
    data: {
      action: 'createPayrequest',
      payload
    }
  });

  const actionResult = response?.data || {};

  if (response?.status === 'success' && actionResult?.success !== false) {
    const savedPrimkey = String(actionResult?.data?.smart_payment_requests_dataNode || '').trim();
    if (savedPrimkey) {
      const nodeInput = document.getElementById('spr_data_node');
      const proceedBtn = document.getElementById('spr_proceed_btn');
      if (nodeInput) nodeInput.value = savedPrimkey;
      if (proceedBtn) proceedBtn.textContent = 'Update Request';
    }

    MosyNotify({
      message: actionResult?.message || (currentPrimkey ? 'Payment request updated successfully' : 'Payment request created successfully'),
      icon: 'check-circle',
      iconColor: 'text-success'
    });

    openSendRequestCard(payload)
    return;
  }

  MosyNotify({
    message: actionResult?.message || response?.message || 'Failed to create payment request',
    icon: 'times-circle',
    iconColor: 'text-danger'
  });
}

export function MosyCreatePayRequest({requestData, title}) {

    const modalTitle = title || 'Create payment request';
    const initialPrimkey = String(
      requestData?.smart_payment_requests_dataNode ||
      requestData?.primkey ||
      ''
    ).trim();
    const proceedLabel = initialPrimkey ? 'Update Request' : 'Proceed';
    const showCreateAsNew = !!initialPrimkey;

    const createAsNewFromCurrentData = () => {
      const nodeInput = document.getElementById('spr_data_node');
      const proceedBtn = document.getElementById('spr_proceed_btn');
      if (nodeInput) nodeInput.value = '';
      if (proceedBtn) proceedBtn.textContent = 'Proceed';
      submitPayrequest(requestData);
    };

  MosyCard(
    modalTitle,
    <div className="col-md-12 p-0">
      <div className="bg-white rounded p-3 p-md-4">
        <div className='col-md-12 text-right'>
        <button
            type="button"
            className="btn btn-outline-info btn-sm mr-2"
            onClick={() => openSendRequestCard(collectRequestFormData())}
          >
            Send
          </button>
        </div>
        <div className="row m-0">
        <input type="hidden" id="spr_data_node" defaultValue={initialPrimkey} />
        <div className="form-group col-md-4 text-left ">
            <label className="mb-1">Request Reference</label>
            <input
              id="spr_request_reference"
              type="text"
              className="form-control"
              placeholder="e.g. A1B2C"
              defaultValue={requestData?.request_reference || ''}
              onBlur={autoFillRequestReference}
            />
          </div>
        <div className="form-group col-md-4 text-left ">
            <label className="mb-1">Payment for</label>
            <input
              id="spr_payment_for"
              type="text"
              className="form-control"
              placeholder="Enter request title"
              defaultValue={requestData?.request_title || requestData?.payment_for || ''}
            />
          </div>            
          <div className="form-group col-md-4 text-left ">
            <label className="mb-1">Name</label>
            <input
              id="spr_payer_name"
              type="text"
              className="form-control"
              placeholder="Enter name"
              defaultValue={requestData?.payer_name || requestData?.name || ''}
              onBlur={autoFillRequestReference}
            />
          </div>

          <div className="form-group col-md-4 text-left ">
            <label className="mb-1">Tel</label>
            <input
              id="spr_payer_tel"
              type="text"
              className="form-control"
              placeholder="Enter phone number"
              defaultValue={requestData?.payer_phone || requestData?.tel || requestData?.phone || ''}
            />
          </div>

          <div className="form-group col-md-4 text-left">
            <label className="mb-1">Email</label>
            <input
              id="spr_payer_email"
              type="email"
              className="form-control"
              placeholder="Enter email address"
              defaultValue={requestData?.payer_email || requestData?.email || ''}
            />
          </div>

          <div className="form-group col-md-4 text-left ">
            <label className="mb-1">Amount</label>
            <input
              id="spr_amount"
              type="number"
              className="form-control"
              placeholder="Enter amount"
              defaultValue={requestData?.amount_requested || requestData?.amount || ''}
            />
          </div>

          <div className="form-group col-md-4 text-left ">
            <label className="mb-1">Account Number</label>
            <input
              id="spr_account_number"
              type="text"
              className="form-control"
              placeholder="Enter account number"
              defaultValue={requestData?.payment_shortcode || requestData?.account_number || ''}
            />
          </div>

          <div className="form-group col-md-12 text-left ">
            <label className="mb-1">Remark / Notes / Additional notes to send to payer</label>
            <textarea
              id="spr_request_notes"
              className="form-control"
              placeholder="Write remarks or notes..."
              style={{ minHeight: '200px' }}
              defaultValue={requestData?.request_notes || requestData?.remark || ''}
            ></textarea>
          </div>
        </div>

        <div className="text-right pt-2">
          {showCreateAsNew && (
            <button type="button" className="btn btn-outline-secondary btn-sm mr-2" onClick={createAsNewFromCurrentData}>
              Create as New
            </button>
          )}

          <button id="spr_proceed_btn" type="button" className="btn btn-info btn-sm px-4" onClick={() => submitPayrequest(requestData)}>
            {proceedLabel}
          </button>
        </div>
      </div>
    </div>,
    true,
    'modal3',
    'mosycard_wide'
  );

}
