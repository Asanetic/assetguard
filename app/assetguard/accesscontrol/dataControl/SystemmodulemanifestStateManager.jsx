
import {mosyStateManager} from '../../../MosyUtils/hiveUtils';

const defaultSystemmodulemanifestStateDefaults = {

  //state management for list page
  systemmodulemanifestListData : [],
  systemmodulemanifestListPageCount : 1,
  systemmodulemanifestLoading: true,  
  parentUseEffectKey : 'loadSystemmodulemanifestList',
  localEventSignature: 'loadSystemmodulemanifestList',
  systemmodulemanifestQuerySearchStr: '',

  
  //for profile page
  system_module_manifest_Node : {},
  systemmodulemanifestActionStatus : 'add_system_module_manifest_',
  paramsystemmodulemanifestUptoken  : '',
  snackMessage : '',
  snackOnDone : ()=>()=>{},
  systemmodulemanifestUptoken:'',
  systemmodulemanifestNode : {},
  activeScrollId : 'SystemmodulemanifestProfileTray',
  
  //dataScript
  systemmodulemanifestCustomProfileQuery : '',
  
  
  // ... other base defaults
};

export function useSystemmodulemanifestState(overrides = {}) {
  const combinedDefaults = { ...defaultSystemmodulemanifestStateDefaults, ...overrides };
  return mosyStateManager(combinedDefaults);
}

