
import {mosyStateManager} from '../../../MosyUtils/hiveUtils';

const defaultSystemUsersStateDefaults = {

  //state management for list page
  systemUsersListData : [],
  systemUsersListPageCount : 1,
  systemUsersLoading: true,  
  parentUseEffectKey : 'loadSystemUsersList',
  localEventSignature: 'loadSystemUsersList',
  systemUsersQuerySearchStr: '',

  
  //for profile page
  system_usersNode : {},
  systemUsersActionStatus : 'add_system_users',
  paramsystemUsersUptoken  : '',
  snackMessage : '',
  snackOnDone : ()=>()=>{},
  systemUsersUptoken:'',
  systemUsersNode : {},
  activeScrollId : 'SystemUsersProfileTray',
  
  //dataScript
  systemUsersCustomProfileQuery : '',
  
  
  // ... other base defaults
};

export function useSystemUsersState(overrides = {}) {
  const combinedDefaults = { ...defaultSystemUsersStateDefaults, ...overrides };
  return mosyStateManager(combinedDefaults);
}

