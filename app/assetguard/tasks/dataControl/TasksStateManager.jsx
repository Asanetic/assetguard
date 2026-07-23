
import {mosyStateManager} from '../../../MosyUtils/hiveUtils';

const defaultTasksStateDefaults = {

  //state management for list page
  tasksListData : [],
  tasksListPageCount : 1,
  tasksLoading: true,  
  parentUseEffectKey : 'loadTasksList',
  localEventSignature: 'loadTasksList',
  tasksQuerySearchStr: '',

  
  //for profile page
  tasksNode : {},
  tasksActionStatus : 'add_tasks',
  paramtasksUptoken  : '',
  snackMessage : '',
  snackOnDone : ()=>()=>{},
  tasksUptoken:'',
  tasksNode : {},
  activeScrollId : 'TasksProfileTray',
  
  //dataScript
  tasksCustomProfileQuery : '',
  clientsCustomProfileQuery : ``,
dealsCustomProfileQuery : ``,
usersCustomProfileQuery : ``,

  
  // ... other base defaults
};

export function useTasksState(overrides = {}) {
  const combinedDefaults = { ...defaultTasksStateDefaults, ...overrides };
  return mosyStateManager(combinedDefaults);
}

