
import {mosyStateManager} from '../../../MosyUtils/hiveUtils';

const defaultUserBundleRoleFunctionsStateDefaults = {

  //state management for list page
  userBundleRoleFunctionsListData : [],
  userBundleRoleFunctionsListPageCount : 1,
  userBundleRoleFunctionsLoading: true,  
  parentUseEffectKey : 'loadUserBundleRoleFunctionsList',
  localEventSignature: 'loadUserBundleRoleFunctionsList',
  userBundleRoleFunctionsQuerySearchStr: '',

  
  //for profile page
  user_bundle_role_functionsNode : {},
  userBundleRoleFunctionsActionStatus : 'add_user_bundle_role_functions',
  paramuserBundleRoleFunctionsUptoken  : '',
  snackMessage : '',
  snackOnDone : ()=>()=>{},
  userBundleRoleFunctionsUptoken:'',
  userBundleRoleFunctionsNode : {},
  activeScrollId : 'UserBundleRoleFunctionsProfileTray',
  
  //dataScript
  userBundleRoleFunctionsCustomProfileQuery : '',
  
  
  // ... other base defaults
};

export function useUserBundleRoleFunctionsState(overrides = {}) {
  const combinedDefaults = { ...defaultUserBundleRoleFunctionsStateDefaults, ...overrides };
  return mosyStateManager(combinedDefaults);
}

