  // MosyProfileSection.jsx
  export function MosyProfileSection({
    title = "",
    component: Component,
    source = "",
    dataIn = {},
    dataOut = {},
  }) {
  
    const hideAllSources = true;
  
    const sourceVisibilityBlacklist = [
        "apk_uploads_AppUsageProfile",
        "apk_uploads_GuardianLogsProfile",
    ];
  
    const sourceVisibilityWhitelist = [
      "invoice_items_InvoiceItemsList",
      "assets_AssetPricingList",
      "assets_SubscriptionsList",
      "dashboardAssetsList",
      "app_users_SubscriptionsProfile",
      "subscriptions_PaymentsList" // subscription payment list

    ];
  
    // whitelist override
    const isForceVisible = sourceVisibilityWhitelist.includes(source);
  
    // blacklist check
    const isBlocked = sourceVisibilityBlacklist.includes(source);
  
    // visibility engine
    if (!isForceVisible) {
  
      if (hideAllSources) {
        return null;
      }
  
      if (isBlocked) {
        return null;
      }
  
    }
  
    // safety
    if (!Component) {
      return null;
    }
  
    return (
      <section className="col-md-12 m-0 bg-white pt-5 p-0">
  
        {
          title !== "" &&
          <h5 className="col-md-12 text-left border-bottom pl-lg-1 text-muted mb-3">
            {title}
          </h5>
        }
  
        <Component
          key={`${source}-${dataIn?.parentUseEffectKey || ""}`}
          dataIn={{
            ...dataIn,
            requestSource: source,
          }}
          dataOut={dataOut}
        />
  
      </section>
    );
  }