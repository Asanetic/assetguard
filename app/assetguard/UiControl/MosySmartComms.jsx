/**
 * Final FILE: send-smart-message.jsx
 * Auto Generated Frontend Functions
 */

import { MosyCard, closeMosyCard } from '../../components/MosyCard';
import { MosyNotify } from '../../MosyUtils/ActionModals';
import { mosyPostData, mosyGetData } from '../../MosyUtils/hiveUtils';
import { getApiRoutes } from '../AppRoutes/apiRoutesHandler';

const apiRoutes = getApiRoutes();
let smartMessageDraftToken = '';

const DEFAULT_SMART_MESSAGE_TEMPLATES = [];

function resolveDraftToken(profileDataNode = {}) {
  if (profileDataNode?.message_draft_token) {
    return profileDataNode.message_draft_token;
  }

  if (profileDataNode?.smart_messages_dataNode) {
    return btoa(String(profileDataNode.smart_messages_dataNode));
  }

  if (profileDataNode?.primkey) {
    return btoa(String(profileDataNode.primkey));
  }

  if (profileDataNode?.messages_dataNode) {
    return btoa(String(profileDataNode.messages_dataNode));
  }

  return '';
}

function updateDraftButtonLabel(isEditingDraft = false) {
  if (typeof document === 'undefined') return;

  const draftBtn = document.getElementById('smart_message_save_draft_btn');
  if (!draftBtn) return;

  draftBtn.innerHTML = `
    <i class="fa fa-floppy-o mr-1"></i>
    ${isEditingDraft ? 'Update Changes' : 'Save as Draft'}
  `;
}

function updateCloneDraftButtonVisibility(show = false) {
  if (typeof document === 'undefined') return;
  const cloneBtn = document.getElementById('smart_message_clone_draft_btn');
  if (!cloneBtn) return;
  cloneBtn.style.display = show ? 'inline-block' : 'none';
}

async function getSmartMessageTemplates(qstr = {}) {
  try {
    const response = await mosyGetData({
      endpoint: apiRoutes.smartmessagetemplates.base,
      params: {
        ...qstr,
        pageNo: 1,
        pageSize: 20,
        orderType: 'desc',
        src: btoa('getMessageTemplatesListData')
      }
    });

    if (response?.status !== 'success') {
      return DEFAULT_SMART_MESSAGE_TEMPLATES;
    }

    const rows = Array.isArray(response?.data) ? response.data : [];
    const mapped = rows.map((item) => ({
      id: item?.record_id || item?.primkey || Math.random().toString(36).slice(2),
      title: item?.subject || item?.template_name || item?.template_code || 'Untitled Template',
      preview: item?.message_content || ''
    }));

    const sanitized = mapped.filter((t) => (t.title || '').trim() || (t.preview || '').trim());

    return sanitized.length ? sanitized : DEFAULT_SMART_MESSAGE_TEMPLATES;
  } catch (error) {
    console.error('getSmartMessageTemplates error:', error);
    return DEFAULT_SMART_MESSAGE_TEMPLATES;
  }
}

function parseTemplatePlaceholders(text = '', data = {}) {
  return String(text).replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
    const value = data?.[key];
    return value === undefined || value === null ? match : String(value);
  });
}

function buildChannelFeedback(response = {}) {
  const apiData = response?.data || {};
  const sentChannels = Array.isArray(apiData?.sent_channels) ? apiData.sent_channels : [];
  const failedChannels = Array.isArray(apiData?.failed_channels) ? apiData.failed_channels : [];

  const sentLabel = sentChannels.length ? `Sent: ${sentChannels.join(', ')}` : '';
  const failedLabel = failedChannels.length
    ? `Failed: ${failedChannels.map((x) => `${x.channel}${x.reason ? ` (${x.reason})` : ''}`).join(', ')}`
    : '';

  if (sentLabel && failedLabel) return `${sentLabel}. ${failedLabel}.`;
  if (sentLabel) return sentLabel;
  if (failedLabel) return failedLabel;
  return response?.message || 'Message request processed.';
}

function openCreateTemplateCard() {
  const saveNewTemplate = async () => {
    const templateCode = (document.getElementById('smart_new_template_code')?.value || '').trim();
    const templateSubject = (document.getElementById('smart_new_template_subject')?.value || '').trim();
    const templateBody = (document.getElementById('smart_new_template_body')?.value || '').trim();

    if (!templateCode) {
      MosyNotify({
        message: 'Template code is required.',
        icon: 'times-circle',
        iconColor: 'text-danger'
      });
      return;
    }

    if (!templateBody) {
      MosyNotify({
        message: 'Template body is required.',
        icon: 'times-circle',
        iconColor: 'text-danger'
      });
      return;
    }

    const templateEndpoint = apiRoutes?.smartmessagetemplates?.base;

    if (!templateEndpoint) {
      MosyNotify({
        message: 'Message template API route is missing.',
        icon: 'times-circle',
        iconColor: 'text-danger'
      });
      return;
    }

    MosyNotify({ message: 'Saving template...', icon: 'save', addTimer: false });

    const response = await mosyPostData({
      url: templateEndpoint,
      method: 'POST',
      data: {
        template_name: templateSubject || templateCode,
        template_code: templateCode,
        template_category: 'Smart Message',
        message_channel: '',
        subject: templateSubject,
        message_content: templateBody,
        template_status: 'Active',
        created_by: '',
        last_updated_by: '',
        created_on: '',
        updated_on: '',
        created_at: '',
        updated_at: ''
      }
    });

    if (response?.status === 'success') {
      MosyNotify({
        message: response?.message || 'Template saved successfully',
        icon: 'check-circle',
        iconColor: 'text-success'
      });
      closeMosyCard('modal1');
      return;
    }

    MosyNotify({
      message: response?.message || 'Failed to save template',
      icon: 'times-circle',
      iconColor: 'text-danger'
    });
  };

  MosyCard(
    '',
    <div className="col-md-12 p-0">
      <div className="bg-white rounded p-3 p-md-4">
        <div className="mb-3 border-bottom pb-2">
          <h5 className="mb-1 font-weight-bold text-dark">Create new template</h5>
        </div>

        <div className="form-group mb-3 text-left">
          <label className="font-weight-semibold text-dark mb-2">Template Code</label>
          <input
            type="text"
            id="smart_new_template_code"
            className="form-control"
            placeholder="Enter template code"
          />
        </div>

        <div className="form-group mb-3 text-left">
          <label className="font-weight-semibold text-dark mb-2">Subject</label>
          <input
            type="text"
            id="smart_new_template_subject"
            className="form-control"
            placeholder="Enter template subject"
          />
        </div>

        <div className="form-group mb-3 text-left">
          <label className="font-weight-semibold text-dark mb-2">Template message</label>
          <textarea
          style={{minHeight: '200px'}}
            id="smart_new_template_body"
            className="form-control"
            rows="7"
            placeholder="Write template body..."
          ></textarea>
        </div>

        <div className="text-right">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm mr-2"
            onClick={() => closeMosyCard('modal1')}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-info btn-sm"
            onClick={saveNewTemplate}
          >
            Save / Proceed
          </button>
        </div>
      </div>
    </div>,
    true,
    'modal1',
    'mosycard_medium'
  );
}

async function openTemplateListCard(recipientName = 'Client', templateData = {}, uiOptions = {}) {
  MosyNotify({ message: 'Loading templates...', icon: 'refresh', addTimer: false });
  let smartTemplates = await getSmartMessageTemplates();
  const baseTitle = uiOptions?.modalTitle || 'Message';
  const templateModalTitle = `Select ${baseTitle} Template`;

   closeMosyCard()
  const applyTemplateToComposer = (template) => {
    const parsedTitle = parseTemplatePlaceholders(template?.title || '', templateData);
    const parsedBody = parseTemplatePlaceholders(template?.preview || '', templateData);

    if (typeof document !== 'undefined') {
      const subjectInput = document.getElementById('smart_message_subject_input');
      const bodyInput = document.getElementById('smart_message_body_input');

      if (subjectInput) subjectInput.value = parsedTitle;
      if (bodyInput) bodyInput.value = parsedBody;
    }

    closeMosyCard('modal1');
  };

  const renderTemplateRows = (templates = []) => {
    const target = document.getElementById('smart_template_results_holder');
    if (!target) return;

    if (!templates.length) {
      target.innerHTML = "<div class='text-muted p-2'>No templates found.</div>";
      return;
    }

    target.innerHTML = templates.map((template) => {
      const title = template?.title || 'Untitled Template';
      const preview = template?.preview || '';
      const id = template?.id || '';
      const safeSearch = `${title} ${preview}`.replace(/"/g, '&quot;');
      return `
        <div class="mosy_template_item border rounded p-3 mb-2 bg-white col-md-12 text-left" data-template-id="${id}" data-search="${safeSearch}">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <h6 class="mb-1 font-weight-bold text-dark">${title}</h6>
              <p class="mb-0 text-muted" style="font-size:13px">${preview}</p>
            </div>
            <button type="button" class="btn btn-outline-info btn-sm ml-2 smart_template_use_btn" data-template-id="${id}">
              Use
            </button>
          </div>
        </div>
      `;
    }).join('');

    const useButtons = target.querySelectorAll('.smart_template_use_btn');
    useButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const templateId = btn.getAttribute('data-template-id');
        const selected = smartTemplates.find((x) => String(x?.id) === String(templateId));
        if (selected) applyTemplateToComposer(selected);
      });
    });
  };

  const searchTemplatesFromBackend = async (keyword = '') => {
    const trimmed = (keyword || '').trim();
    const qstr = trimmed ? { searchAny: btoa(trimmed) } : {};
    smartTemplates = await getSmartMessageTemplates(qstr);
    renderTemplateRows(smartTemplates);
  };

  renderTemplateRows(smartTemplates);

  MosyCard(
    '',
    <div className="col-md-12 p-0">
      <div className="bg-white rounded p-3 p-md-4">
        <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
          <div>
            <h5 className="mb-1 font-weight-bold text-dark">{templateModalTitle}</h5>
            <small className="text-muted">Pick a template for {recipientName}</small>
          </div>
        </div>

        <div className="form-group mb-3">
          <div className="d-flex justify-content-end mb-2">
            <button
              type="button"
              className="btn btn-outline-info btn-sm"
              onClick={openCreateTemplateCard}
            >
              <i className="fa fa-plus mr-1"></i>
              Create new template
            </button>
          </div>
          <label className="text-left w-100 mb-1 font-weight-semibold">Search Template</label>
          <input
            type="text"
            className="form-control"
            placeholder="Type template name..."
            onChange={async (e) => {
              const keyword = e?.target?.value || '';
              await searchTemplatesFromBackend(keyword);
            }}
          />
        </div>

        <div id="smart_template_results_holder" style={{ maxHeight: '320px', overflowY: 'auto' }}>
          {smartTemplates.map((template) => (
            <div key={template.id} className="mosy_template_item border rounded p-3 mb-2 bg-white col-md-12 text-left">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h6 className="mb-1 font-weight-bold text-dark">{template.title}</h6>
                  <p className="mb-0 text-muted" style={{ fontSize: '13px' }}>{template.preview}</p>
                </div>
                <button type="button" className="btn btn-outline-info btn-sm ml-2" onClick={() => applyTemplateToComposer(template)}>
                  Use
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    true,
    'modal1',
    "mosycard_medium"
  );
}

async function sendViaSelectedMode({ mode, profileDataNode = {} }) 
{
  const subjectInput = typeof document !== 'undefined' ? document.getElementById('smart_message_subject_input') : null;
  const bodyInput = typeof document !== 'undefined' ? document.getElementById('smart_message_body_input') : null;
  const emailInput = typeof document !== 'undefined' ? document.getElementById('smart_message_email_input') : null;
  const telInput = typeof document !== 'undefined' ? document.getElementById('smart_message_tel_input') : null;

  const messageSubject = subjectInput?.value?.trim() || '';
  const messageContent = bodyInput?.value?.trim() || '';
  const typedEmail = emailInput?.value?.trim() || '';
  const typedTel = telInput?.value?.trim() || '';

  if (!messageContent) {
    MosyNotify({
      message: 'Message body is required before sending.',
      icon: 'times-circle',
      iconColor: 'text-danger'
    });
    return;
  }

  MosyNotify({ message: 'Sending message...', icon: 'send', addTimer: false });

  const payload = {
    channel: mode,
    message_channel:   mode,
    message_subject:   messageSubject,
    message_content:   messageContent,
    related_record_id: profileDataNode?.record_id || profileDataNode?.client_id || '',
    recipient_name:
      profileDataNode?.full_name ||
      profileDataNode?.business_name ||
      profileDataNode?.name ||
      'Client',
    recipient_phone:
      typedTel ||
      profileDataNode?.phone_number ||
      profileDataNode?.tel ||
      profileDataNode?.phone ||
      '',
    recipient_email:
      typedEmail ||
      profileDataNode?.email_address ||
      profileDataNode?.primary_email ||
      profileDataNode?.email ||
      '',
    request_source: 'clients_smart_message_card'
  };

  const response = await mosyPostData({url: apiRoutes.smartapi.base, data:{
      action: 'sendUtilMessage',
      payload: payload
  }
    
  });

  const actionResult = response?.data || {};
  const wasRequestOk = response?.status === 'success';
  const wasActionOk = actionResult?.success !== false;

  if (wasRequestOk && wasActionOk) {
    const details = buildChannelFeedback(actionResult);
    MosyNotify({
      message: actionResult?.message ? `${actionResult.message}. ${details}` : details,
      icon: 'check-circle',
      iconColor: 'text-success'
    });
  } else {
    const details = buildChannelFeedback(actionResult);
    MosyNotify({
      message: actionResult?.message || response?.message || details || 'Failed to send message',
      icon: 'times-circle',
      iconColor: 'text-danger'
    });
    return;
  }


  if (mode === 'whatsapp') {
    const rawPhone =
      payload?.recipient_phone ||
      profileDataNode?.phone_number ||
      profileDataNode?.tel ||
      profileDataNode?.phone ||
      '';

    if (!rawPhone) {
      MosyNotify({
        message: 'WhatsApp phone is missing. Draft/save was done but WhatsApp could not open.',
        icon: 'times-circle',
        iconColor: 'text-danger'
      });
      return;
    }

    openWhatsAppUrl(rawPhone, messageContent);

  }

  closeMosyCard('modal1');

}

async function saveDraftMessage({ profileDataNode = {}, forceNew = false } = {}) {
  const subjectInput = typeof document !== 'undefined' ? document.getElementById('smart_message_subject_input') : null;
  const bodyInput = typeof document !== 'undefined' ? document.getElementById('smart_message_body_input') : null;
  const emailInput = typeof document !== 'undefined' ? document.getElementById('smart_message_email_input') : null;
  const telInput = typeof document !== 'undefined' ? document.getElementById('smart_message_tel_input') : null;

  const messageSubject = subjectInput?.value?.trim() || '';
  const messageContent = bodyInput?.value?.trim() || '';
  const typedEmail = emailInput?.value?.trim() || '';
  const typedTel = telInput?.value?.trim() || '';

  if (!messageSubject && !messageContent) {
    MosyNotify({
      message: 'Add subject or message body before saving draft.',
      icon: 'times-circle',
      iconColor: 'text-danger'
    });
    return;
  }

  if (!forceNew && !smartMessageDraftToken) {
    smartMessageDraftToken = resolveDraftToken(profileDataNode);
  }

  const isEditingDraft = !forceNew && !!smartMessageDraftToken;
  const method = isEditingDraft ? 'PUT' : 'POST';

  const payload = {
    message_number: '',
    related_record_id: profileDataNode?.record_id || profileDataNode?.client_id || '',
    recipient_name:
      profileDataNode?.name || 'Client',
    recipient_email:
      typedEmail ||
      profileDataNode?.email_address ||
      profileDataNode?.primary_email ||
      profileDataNode?.email ||
      '',
    recipient_phone:
      typedTel ||
      profileDataNode?.phone_number ||
      profileDataNode?.tel ||
      profileDataNode?.phone ||
      '',
    message_channel: 'draft',
    message_subject: messageSubject,
    message_content: messageContent,
    message_status: 'draft',
    delivery_status: 'draft',
    request_source: 'clients_smart_message_draft',
    request_id: '',
    sent_by: '',
    scheduled_for: '',
    sent_on: '',
    delivered_on: '',
    read_on: '',
    failed_on: '',
    failure_reason: '',
    created_on: '',
    created_at: '',
    updated_at: '',
    smart_messages_mosy_action: isEditingDraft ? 'update_smart_messages' : 'add_smart_messages'
  };

  if (isEditingDraft) {
    payload.smart_messages_dataNode = smartMessageDraftToken;
  }

  MosyNotify({ message: forceNew ? 'Cloning draft...' : 'Saving draft...', icon: 'save', addTimer: false });

  const response = await mosyPostData({
    url: apiRoutes.smartmessages.base,
    method,
    data: payload
  });

  if (response?.status === 'success') {
    if (response?.smart_messages_dataNode) {
      smartMessageDraftToken = btoa(String(response.smart_messages_dataNode));
    } else if (response?.messages_dataNode) {
      smartMessageDraftToken = btoa(String(response.messages_dataNode));
    }

    updateDraftButtonLabel(true);
    updateCloneDraftButtonVisibility(true);

    MosyNotify({
      message: forceNew
        ? 'Draft cloned successfully'
        : (isEditingDraft ? 'Draft updated successfully' : 'Draft saved successfully'),
      icon: 'check-circle',
      iconColor: 'text-success'
    });
    return;
  }

  MosyNotify({
    message: response?.message || 'Failed to save draft',
    icon: 'times-circle',
    iconColor: 'text-danger'
  });
}

export function openWhatsAppUrl(phone, message) {
    if (!phone || !message) return;
  
    let cleanedPhone = phone.trim();
  
    // Handle +254 numbers (keep the +)
    if (cleanedPhone.startsWith("+254")) {
      cleanedPhone = cleanedPhone.replace(/\s+/g, ""); // remove internal spaces
    }
  
    // Handle 07... -> convert to 2547...
    else if (cleanedPhone.startsWith("07")) {
      cleanedPhone = "254" + cleanedPhone.substring(1);
    }
  
    // Handle 254... without + (no change needed, just strip non-digits)
    else if (cleanedPhone.startsWith("254")) {
      cleanedPhone = cleanedPhone.replace(/\D/g, "");
    }
  
    // Handle + other international (keep as-is)
    else if (cleanedPhone.startsWith("+")) {
      cleanedPhone = cleanedPhone.replace(/\s+/g, "");
    }
  
    // Fallback: clean digits, maybe raise a log or warning
    else {
      cleanedPhone = cleanedPhone.replace(/\D/g, "");
    }
  
    const encodedMessage = encodeURIComponent(message);
    const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent);
    const baseUrl = isMobile
      ? "https://api.whatsapp.com/send"
      : "https://web.whatsapp.com/send";
  
    // Strip + for wa.me format
    const whatsappPhone = cleanedPhone.startsWith("+")
      ? cleanedPhone.substring(1)
      : cleanedPhone;
  
    closeMosyCard("topmost");
  
    const waUrl = `${baseUrl}?phone=${whatsappPhone}&text=${encodedMessage}`;
    //window.open(url, "_blank", "noopener,noreferrer");

    window.open(waUrl, 'whatsapp_share_popup', 'width=920,height=600');

  }

function openSendChannelCard(recipientName = 'Client', recipientEmail = '', profileDataNode = {}) {
  const shareTarget = recipientEmail ? `${recipientName} (${recipientEmail})` : recipientName;

  function channelButton(icon, text, mode, btnClass = 'btn bg-white border border_set') {
    return (
      <button
        className={`btn ${btnClass} elforge_mosy_channel_btn_v1 w-100`}
        type="button"
        onClick={() => sendViaSelectedMode({ mode, profileDataNode })}
      >
        <i className={`fa ${icon}`}></i>
        <span>{text}</span>
      </button>
    );
  }

  MosyCard(
    '',
    <div className="col-md-12 p-0">
      <div className="bg-white rounded p-3 p-md-4">
        <div className="mb-3 border-bottom pb-2">
          <h5 className="mb-1 font-weight-bold text-dark text-left">Choose Delivery Channel</h5>
          <small className="text-muted">Where do you want to send this message for {shareTarget}?</small>
        </div>

        <div className="row justify-content-center col-md-12 m-0 p-0">
          <div className="col-md-6 p-1">{channelButton('fa-commenting-o', 'Send as SMS', 'sms')}</div>
          <div className="col-md-6 p-1">{channelButton('fa-envelope-o', 'Send as Email', 'email')}</div>
          <div className="col-md-12 p-3"></div>
          <div className="col-md-12 p-1">{channelButton('fa-random', 'Send as email and SMS', 'both')}</div>
          <div className="col-md-12 p-3"></div>
          <div className="col-md-7 p-1">{channelButton('fa-whatsapp', 'Share via WhatsApp', 'whatsapp', 'btn-outline-success')}</div>
        </div>
      </div>
    </div>,
    true,
    'modal1'
  );
}

export function SmartMessageUI({ profileDataNode = {}, uiOptions = {} } = {}) 
{
  smartMessageDraftToken = resolveDraftToken(profileDataNode);
  if (typeof document !== 'undefined') {
    setTimeout(() => updateCloneDraftButtonVisibility(!!smartMessageDraftToken), 0);
  }

  const dynamicTitle = uiOptions?.modalTitle || 'Compose Message';
  const defaultSubject = uiOptions?.subject || '';
  const defaultMessage = uiOptions?.message || uiOptions?.body || '';

  const recipientName =
    profileDataNode?.full_name ||
    profileDataNode?.business_name ||
    profileDataNode?.name ||
    'Client';

  const recipientEmail =
    profileDataNode?.email_address ||
    profileDataNode?.primary_email ||
    profileDataNode?.email ||
    '';

  const templateParserData = {
    ...profileDataNode,
    user_name:
      profileDataNode?.user_name ||
      profileDataNode?.full_name ||
      profileDataNode?.business_name ||
      'Client',
    email: recipientEmail
  };

  return (
    <div className="col-md-12 p-0">
      <div className="bg-white rounded p-3 p-md-4">
        <div className="d-flex align-items-start justify-content-between mb-3">
          <div>
            <h5 className="mb-1 font-weight-bold text-dark col-md-12 text-left p-0 m-0">{dynamicTitle}</h5>
            <small className="text-muted">
              To: {recipientName}{recipientEmail ? ` (${recipientEmail})` : ''}
            </small>
          </div>
          <button
            type="button"
            className="btn btn-info btn-sm px-4"
            onClick={() => openSendChannelCard(recipientName, recipientEmail, profileDataNode)}
          >
            <i className="fa fa-paper-plane mr-1"></i>
            Send Message
          </button>
        </div>

        <div className="form-group mb-3 text-left">
          <div className="row m-0">
            <div className="col-md-4 p-1">
              <label className="font-weight-semibold text-dark mb-2">Subject</label>
              <input
                id="smart_message_subject_input"
                type="text"
                className="form-control"
                placeholder="Enter message subject"
                defaultValue={defaultSubject}
              />
            </div>
            <div className="col-md-4 p-1">
              <label className="font-weight-semibold text-dark mb-2">Email</label>
              <input
                id="smart_message_email_input"
                type="email"
                className="form-control"
                placeholder="Enter email"
                defaultValue={recipientEmail}
              />
            </div>
            <div className="col-md-4 p-1">
              <label className="font-weight-semibold text-dark mb-2">Telephone</label>
              <input
                id="smart_message_tel_input"
                type="text"
                className="form-control"
                placeholder="Enter phone number"
                defaultValue={profileDataNode?.phone_number || profileDataNode?.tel || profileDataNode?.phone || ''}
              />
            </div>
          </div>
        </div>

        <div className="form-group mb-3 text-left">
          <label className="font-weight-semibold text-dark mb-2">Message Body</label>
          <textarea
            id="smart_message_body_input"
            style={{ minHeight: '200px' }}
            className="form-control"
            rows="7"
            placeholder="Write your message..."
            defaultValue={defaultMessage}
          ></textarea>
        </div>

        <div className="d-flex flex-wrap justify-content-between align-items-center">
          <div className="mb-2 mb-md-0">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm mr-2"
              onClick={() => openTemplateListCard(recipientName, templateParserData, uiOptions)}
            >
              <i className="fa fa-folder-open-o mr-1"></i>
              Load Template
            </button>
            <button
              id="smart_message_save_draft_btn"
              type="button"
              className="btn btn-outline-dark btn-sm"
              onClick={() => saveDraftMessage({ profileDataNode })}
            >
              <i className="fa fa-floppy-o mr-1"></i>
              {smartMessageDraftToken ? 'Update Changes' : 'Save as Draft'}
            </button>
            <button
              id="smart_message_clone_draft_btn"
              type="button"
              className="btn btn-outline-info btn-sm ml-2"
              style={{ display: smartMessageDraftToken ? 'inline-block' : 'none' }}
              onClick={() => saveDraftMessage({ profileDataNode, forceNew: true })}
              title="Create a new draft from this message"
            >
              <i className="fa fa-clone mr-1"></i>
              Create as New
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MosySendSmartMessage({profileDataNode = {}, uiOptions = {}} = {}) {
  MosyCard('Smart Messanger', <SmartMessageUI profileDataNode={profileDataNode} uiOptions={uiOptions} />, true, 'modal3', 'mosycard_wide');
}
