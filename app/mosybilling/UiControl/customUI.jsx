import { LiveSearchDropdown } from "./componentControl"
import { closeMosyCard, MosyCard } from "../../components/MosyCard";

import { magicRandomStr } from "../../MosyUtils/hiveUtils";
import { MosyNotify } from "../../MosyUtils/ActionModals";
import { chatWithGPT } from "./customFunctions";


//dynamic live search / organic live  search 
export function MosyLiveSearch({
    api = "",
    tableName = "",
    displayField = "",
    valueField = "",
    actionName = "",
    actionData = {},
    title = "Search",
    onSelectFull = () => {},
  }) {
    let finalValeField = valueField || displayField;
    const parentTable = actionData?.parentTable || tableName

    function handleOnSelect(dataRes) {
      // Call full payload regardless


      console.log(`Live search `, actionData , dataRes , actionName)
      onSelectFull(dataRes);
  
      // Perform mosyfilter logic
      if (actionName === "mosyfilter") {
        const router = actionData?.router;
        const qstrTemplate = actionData?.qstr || "";
        const stateSetters = actionData?.stateSetters
  
        // 💡 Replace placeholders like {{record_id}} with values from dataRes
        const newQstr = qstrTemplate.replace(/{{(.*?)}}/g, (match, fieldName) => {
          return (dataRes?.[fieldName] || "");
        });
        //console.log(`Live search `, newQstr , )

        // 🌐 Redirect with updated query string
        if (router && newQstr) {
            //router.push(`${actionData?.path}?${tableName}_mosyfilter=${btoa(newQstr)}`);
            window.location=`${actionData?.path}?${parentTable}_mosyfilter=${btoa(newQstr)}`;
            stateSetters.setLocalEventSignature(magicRandomStr())
          closeMosyCard()
        }

        //customEventHandler(actionData)
      }

      if (actionName === "load_profile") {
        const router = actionData?.router;
        const qstrTemplate = actionData?.token || "";
        const stateSetters = actionData?.stateSetters
  
        // 💡 Replace placeholders like {{record_id}} with values from dataRes
        const newQstr = qstrTemplate.replace(/{{(.*?)}}/g, (match, fieldName) => {
          return (dataRes?.[fieldName] || "");
        });
  
        // 🌐 Redirect with updated query string
        if (router && newQstr) {
            //router.push(`${actionData?.path}?${tableName}_mosyfilter=${btoa(newQstr)}`);
            window.location=`${actionData?.path}?${tableName}_uptoken=${btoa(newQstr)}`;
            stateSetters.setLocalEventSignature(magicRandomStr())
          closeMosyCard()
        }

       / //customEventHandler(actionData)
      }      
    }
  
    // Render your card and LiveSearchDropdown
    MosyCard(
      "",
      <>
        <div className="col-md-12 text-left h4 m-0 pt-2 pl-0 pr-0 pb-2">
          <span className="m-0 p-0 label_text">{title}</span>
        </div>
  
        <LiveSearchDropdown
          apiEndpoint={api}
          tblName={tableName}
          parentTable={parentTable}
          inputName="liveSearchModal"
          hiddenInputName="qdataInput"
          valueField={finalValeField}
          displayField={displayField}
          label=""
          onSelect={(id) => console.log("Just the ID:", id)}
          onSelectFull={handleOnSelect}
          defaultColSize="col-md-12 hive_data_cell text-left m-0 p-0"
          context={{ hostParent: "hostParent" }}
          labelClassName="d-none"
        />
      </>
    );
  }


  export function MosyExtendLiveSearch({
    table,
    label,
    query,
    context,
    hiddenInputName,
    parentTable
  }) {
   
    console.log(`[MosyExtendLiveSearch] Triggered for table: ${table} parent ${parentTable}`);

  }
  
  export function loadSmartSearch() {
    // Create a container ID for the response
    const responseBoxId = "qchat_response_box";
  
    MosyCard(
      "",
      <>
        <div className="col-md-12 text-left h4 m-0 pt-2 pl-0 pr-0 pb-2 d-none ">
          <span className="m-0 p-0 label_text">🧠 Request search</span>
        </div>
  
        <div className="form-group col-md-12 text-left p-0 m-0 pt-2">
          <label className="m-0 p-0 label_text">Ask anything</label>
          <input
            className="m-0 form-control"
            id="txt_qchat"
            name="txt_qchat"
            placeholder="e.g., Should I open a bakery or a car wash?"
            type="text"
          />
        </div>
  
        <div className="col-md-12 text-right pt-2 m-0 p-0 ">
          <div
            className="cpointer btn btn-primary mb-3"
            onClick={async () => {
              const input = document.getElementById("txt_qchat").value.trim();
              const responseBox = document.getElementById(responseBoxId);
              const goBtn = event.currentTarget;
            
              if (!input) {
                responseBox.innerHTML = "<div class='text-danger'>Please enter a question.</div>";
                return;
              }
            
              // Disable button and show thinking
              //goBtn.classList.add("disabled");
              responseBox.innerHTML = `<i class='fa fa-spinner fa-spin'></i> Thinking...`;
            
              try {
                const reply = await chatWithGPT(input);
                const formattedReply = reply.replace(/(?:\r\n|\r|\n)/g, "<br>");
            
                responseBox.innerHTML = `
                  <div class="gpt-bubble-wrapper mt-3 max_height_300px">
                    <div class="gpt-bubble text-left cpointer" title="Click to copy">
                      ${formattedReply}
                    </div>
                  </div>`;
            
                // Enable copy-to-clipboard
                document.querySelector(".gpt-bubble").onclick = () => {
                  navigator.clipboard.writeText(reply);
                  responseBox.innerHTML += `<div class="text-success small mt-2">✅ Copied to clipboard!</div>`;
                };
              } catch (err) {
                responseBox.innerHTML = `<div class="text-danger">❌ GPT failed: ${err.message}</div>`;
              } finally {
                // Re-enable the button
                //goBtn.classList.remove("disabled");
                goBtn.innerHTML = `<i class="fa fa-send"></i> Go`;
              }
            }}
            
          >
            <i className="fa fa-send"></i> Go
          </div>
        </div>
  
        <div className="col-md-12" id={responseBoxId}></div>
      </>
    );
  }

  