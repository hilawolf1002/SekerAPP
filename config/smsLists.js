module.exports = {
    // Active subscribers from Israel
    active_subscribers_il: "SELECT phone FROM recipients WHERE active=1 AND country='IL'",
    
    // All verified users
    verified_users: "SELECT phone FROM users WHERE verified=1 AND phone IS NOT NULL",
    
    // Survey participants
    survey_participants: "SELECT DISTINCT mp_phone as phone FROM survey_responses WHERE mp_phone IS NOT NULL",
    
    // Newsletter subscribers
    newsletter_subscribers: "SELECT phone FROM newsletter_subscribers WHERE active=1 AND phone IS NOT NULL",
    
    // Custom list 1
    custom_list_1: "SELECT phone FROM custom_lists WHERE list_id=1 AND active=1",
    
    // Custom list 2
    custom_list_2: "SELECT phone FROM custom_lists WHERE list_id=2 AND active=1"
};
