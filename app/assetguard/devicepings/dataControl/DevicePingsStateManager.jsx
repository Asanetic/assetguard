
import {mosyStateManager} from '../../../MosyUtils/hiveUtils';

const defaultDevicePingsStateDefaults = {

  //state management for list page
  devicePingsListData : [],
  devicePingsListPageCount : 1,
  devicePingsLoading: true,  
  parentUseEffectKey : 'loadDevicePingsList',
  localEventSignature: 'loadDevicePingsList',
  devicePingsQuerySearchStr: '',

  
  //for profile page
  device_pingsNode : {},
  devicePingsActionStatus : 'add_device_pings',
  paramdevicePingsUptoken  : '',
  snackMessage : '',
  snackOnDone : ()=>()=>{},
  devicePingsUptoken:'',
  devicePingsNode : {},
  activeScrollId : 'DevicePingsProfileTray',
  
  //dataScript
  devicePingsCustomProfileQuery : '',
  
  
  // ... other base defaults
};

export function useDevicePingsState(overrides = {}) {
  const combinedDefaults = { ...defaultDevicePingsStateDefaults, ...overrides };
  return mosyStateManager(combinedDefaults);
}

