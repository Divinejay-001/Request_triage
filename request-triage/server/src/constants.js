const STATUSES = ['open', 'in_progress', 'resolved'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];
// Simple fixed team list. "" means Unassigned. No user-management system by design.
const OWNERS = ['David', 'Sarah', 'Priya', 'Tunde'];

module.exports = { STATUSES, PRIORITIES, OWNERS };
