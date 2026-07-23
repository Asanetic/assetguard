
import {mosyStateManager} from '../../../MosyUtils/hiveUtils';

const defaultDeviceListStateDefaults = {

  //state management for list page
  deviceListListData : [],
  deviceListListPageCount : 1,
  deviceListLoading: true,  
  parentUseEffectKey : 'loadDeviceListList',
  localEventSignature: 'loadDeviceListList',
  deviceListQuerySearchStr: '',

  
  //for profile page
  device_listNode : {},
  deviceListActionStatus : 'add_device_list',
  paramdeviceListUptoken  : '',
  snackMessage : '',
  snackOnDone : ()=>()=>{},
  deviceListUptoken:'',
  deviceListNode : {},
  activeScrollId : 'DeviceListProfileTray',
  
  //dataScript
  deviceListCustomProfileQuery : '',
  
  
  // ... other base defaults
};

export function useDeviceListState(overrides = {}) {
  const combinedDefaults = { ...defaultDeviceListStateDefaults, ...overrides };
  return mosyStateManager(combinedDefaults);
}

