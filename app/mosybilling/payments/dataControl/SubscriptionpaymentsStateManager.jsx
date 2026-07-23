
import {mosyStateManager} from '../../../MosyUtils/hiveUtils';

const defaultSubscriptionpaymentsStateDefaults = {

  //state management for list page
  subscriptionpaymentsListData : [],
  subscriptionpaymentsListPageCount : 1,
  subscriptionpaymentsLoading: true,  
  parentUseEffectKey : 'loadSubscriptionpaymentsList',
  localEventSignature: 'loadSubscriptionpaymentsList',
  subscriptionpaymentsQuerySearchStr: '',

  
  //for profile page
  billing_transactionsNode : {},
  subscriptionpaymentsActionStatus : 'add_billing_transactions',
  paramsubscriptionpaymentsUptoken  : '',
  snackMessage : '',
  snackOnDone : ()=>()=>{},
  subscriptionpaymentsUptoken:'',
  subscriptionpaymentsNode : {},
  
  //dataScript
  subscriptionpaymentsCustomProfileQuery : '',
  
  
  // ... other base defaults
};

export function useSubscriptionpaymentsState(overrides = {}) {
  const combinedDefaults = { ...defaultSubscriptionpaymentsStateDefaults, ...overrides };
  return mosyStateManager(combinedDefaults);
}

