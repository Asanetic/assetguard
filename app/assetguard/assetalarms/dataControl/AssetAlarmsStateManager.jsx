
import {mosyStateManager} from '../../../MosyUtils/hiveUtils';

const defaultAssetAlarmsStateDefaults = {

  //state management for list page
  assetAlarmsListData : [],
  assetAlarmsListPageCount : 1,
  assetAlarmsLoading: true,  
  parentUseEffectKey : 'loadAssetAlarmsList',
  localEventSignature: 'loadAssetAlarmsList',
  assetAlarmsQuerySearchStr: '',

  
  //for profile page
  asset_alarmsNode : {},
  assetAlarmsActionStatus : 'add_asset_alarms',
  paramassetAlarmsUptoken  : '',
  snackMessage : '',
  snackOnDone : ()=>()=>{},
  assetAlarmsUptoken:'',
  assetAlarmsNode : {},
  activeScrollId : 'AssetAlarmsProfileTray',
  
  //dataScript
  assetAlarmsCustomProfileQuery : '',
  
  
  // ... other base defaults
};

export function useAssetAlarmsState(overrides = {}) {
  const combinedDefaults = { ...defaultAssetAlarmsStateDefaults, ...overrides };
  return mosyStateManager(combinedDefaults);
}

