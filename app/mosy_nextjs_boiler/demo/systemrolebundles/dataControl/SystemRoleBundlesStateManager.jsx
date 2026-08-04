
import {mosyStateManager} from '../../../MosyUtils/hiveUtils';

const defaultSystemRoleBundlesStateDefaults = {

  //state management for list page
  systemRoleBundlesListData : [],
  systemRoleBundlesListPageCount : 1,
  systemRoleBundlesLoading: true,  
  parentUseEffectKey : 'loadSystemRoleBundlesList',
  localEventSignature: 'loadSystemRoleBundlesList',
  systemRoleBundlesQuerySearchStr: '',

  
  //for profile page
  system_role_bundlesNode : {},
  systemRoleBundlesActionStatus : 'add_system_role_bundles',
  paramsystemRoleBundlesUptoken  : '',
  snackMessage : '',
  snackOnDone : ()=>()=>{},
  systemRoleBundlesUptoken:'',
  systemRoleBundlesNode : {},
  activeScrollId : 'SystemRoleBundlesProfileTray',
  
  //dataScript
  systemRoleBundlesCustomProfileQuery : '',
  
  
  // ... other base defaults
};

export function useSystemRoleBundlesState(overrides = {}) {
  const combinedDefaults = { ...defaultSystemRoleBundlesStateDefaults, ...overrides };
  return mosyStateManager(combinedDefaults);
}

