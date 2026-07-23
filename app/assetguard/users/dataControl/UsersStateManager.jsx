
import {mosyStateManager} from '../../../MosyUtils/hiveUtils';

const defaultUsersStateDefaults = {

  //state management for list page
  usersListData : [],
  usersListPageCount : 1,
  usersLoading: true,  
  parentUseEffectKey : 'loadUsersList',
  localEventSignature: 'loadUsersList',
  usersQuerySearchStr: '',

  
  //for profile page
  usersNode : {},
  usersActionStatus : 'add_users',
  paramusersUptoken  : '',
  snackMessage : '',
  snackOnDone : ()=>()=>{},
  usersUptoken:'',
  usersNode : {},
  activeScrollId : 'UsersProfileTray',
  
  //dataScript
  usersCustomProfileQuery : '',
  leadsCustomProfileQuery : ``,
clientsCustomProfileQuery : ``,
dealsCustomProfileQuery : ``,
tasksCustomProfileQuery : ``,

  
  // ... other base defaults
};

export function useUsersState(overrides = {}) {
  const combinedDefaults = { ...defaultUsersStateDefaults, ...overrides };
  return mosyStateManager(combinedDefaults);
}

