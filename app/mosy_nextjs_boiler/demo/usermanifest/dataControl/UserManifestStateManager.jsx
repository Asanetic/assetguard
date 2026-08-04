
import {mosyStateManager} from '../../../MosyUtils/hiveUtils';

const defaultUserManifestStateDefaults = {

  //state management for list page
  userManifestListData : [],
  userManifestListPageCount : 1,
  userManifestLoading: true,  
  parentUseEffectKey : 'loadUserManifestList',
  localEventSignature: 'loadUserManifestList',
  userManifestQuerySearchStr: '',

  
  //for profile page
  user_manifest_Node : {},
  userManifestActionStatus : 'add_user_manifest_',
  paramuserManifestUptoken  : '',
  snackMessage : '',
  snackOnDone : ()=>()=>{},
  userManifestUptoken:'',
  userManifestNode : {},
  activeScrollId : 'UserManifestProfileTray',
  
  //dataScript
  userManifestCustomProfileQuery : '',
  
  
  // ... other base defaults
};

export function useUserManifestState(overrides = {}) {
  const combinedDefaults = { ...defaultUserManifestStateDefaults, ...overrides };
  return mosyStateManager(combinedDefaults);
}

