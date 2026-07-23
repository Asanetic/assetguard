
import {mosyStateManager} from '../../../MosyUtils/hiveUtils';

const defaultPageManifestStateDefaults = {

  //state management for list page
  pageManifestListData : [],
  pageManifestListPageCount : 1,
  pageManifestLoading: true,  
  parentUseEffectKey : 'loadPageManifestList',
  localEventSignature: 'loadPageManifestList',
  pageManifestQuerySearchStr: '',

  
  //for profile page
  page_manifest_Node : {},
  pageManifestActionStatus : 'add_page_manifest_',
  parampageManifestUptoken  : '',
  snackMessage : '',
  snackOnDone : ()=>()=>{},
  pageManifestUptoken:'',
  pageManifestNode : {},
  activeScrollId : 'PageManifestProfileTray',
  
  //dataScript
  pageManifestCustomProfileQuery : '',
  
  
  // ... other base defaults
};

export function usePageManifestState(overrides = {}) {
  const combinedDefaults = { ...defaultPageManifestStateDefaults, ...overrides };
  return mosyStateManager(combinedDefaults);
}

