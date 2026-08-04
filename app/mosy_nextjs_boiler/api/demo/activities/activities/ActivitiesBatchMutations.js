
/**
 * AUTO-GENERATED BATCH MUTATIONS
 * DO NOT EDIT MANUALLY
 */

export const ActivitiesBatchMutations = {
"_clients_full_name_client_id": {"type":"join","table":"clients","link":"client_id:record_id","select":{"_clients_full_name_client_id":"full_name"}},
"_deals_deal_title_deal_id": {"type":"join","table":"deals","link":"deal_id:record_id","select":{"_deals_deal_title_deal_id":"deal_title"}},
"_users_full_name_performed_by": {"type":"join","table":"users","link":"performed_by:record_id","select":{"_users_full_name_performed_by":"full_name"}}
};

export const listActivitiesMutationKeys = {
"_clients_full_name_client_id": [],
"_deals_deal_title_deal_id": [],
"_users_full_name_performed_by": [],

};

export default listActivitiesMutationKeys;
