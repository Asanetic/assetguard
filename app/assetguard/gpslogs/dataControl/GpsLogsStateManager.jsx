
import {mosyStateManager} from '../../../MosyUtils/hiveUtils';

const defaultGpsLogsStateDefaults = {

  //state management for list page
  gpsLogsListData : [],
  gpsLogsListPageCount : 1,
  gpsLogsLoading: true,  
  parentUseEffectKey : 'loadGpsLogsList',
  localEventSignature: 'loadGpsLogsList',
  gpsLogsQuerySearchStr: '',

  
  //for profile page
  gps_logsNode : {},
  gpsLogsActionStatus : 'add_gps_logs',
  paramgpsLogsUptoken  : '',
  snackMessage : '',
  snackOnDone : ()=>()=>{},
  gpsLogsUptoken:'',
  gpsLogsNode : {},
  activeScrollId : 'GpsLogsProfileTray',
  
  //dataScript
  gpsLogsCustomProfileQuery : '',
  
  
  // ... other base defaults
};

export function useGpsLogsState(overrides = {}) {
  const combinedDefaults = { ...defaultGpsLogsStateDefaults, ...overrides };
  return mosyStateManager(combinedDefaults);
}

