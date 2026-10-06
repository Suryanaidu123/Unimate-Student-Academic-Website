const Activity     = require('../models/Activity.model');
const Student      = require('../models/Student.model');
const ApiError     = require('../utils/ApiError');
const auditLog     = require('./auditLog.service');
const notification = require('./notification.service');

const TYPES_WITH_OPTIONS = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'SURVEY'];

// ─── helpers ──────────────────────────────────────────────────────────────────

function isActive(a) {
  const now = Date.now();
  return a.status === 'ACTIVE' && new Date(a.startDate) <= now && new Date(a.endDate) >= now;
}

function assertCanManage(actor, activity) {
  if (actor.role === 'ADMIN') return;
  if (actor.role === 'FACULTY') {
    if (activity && String(activity.createdBy) !== String(actor.userId)) {
      throw ApiError.forbidden('You can only manage your own activities.');
    }
    return;
  }
  throw ApiError.forbidden('Not authorized.');
}

// ─── create ───────────────────────────────────────────────────────────────────

async function create(data, actor) {
  const { title, description, type, targetYears, options, startDate, endDate } = data;
  if (!title)     throw ApiError.badRequest('Title is required.');
  if (!type)      throw ApiError.badRequest('Type is required.');
  if (!startDate) throw ApiError.badRequest('Start date is required.');
  if (!endDate)   throw ApiError.badRequest('End date is required.');
  if (new Date(endDate) <= new Date(startDate)) {
    throw ApiError.badRequest('End date must be after start date.');
  }

  // Options are required for choice/survey types
  if (TYPES_WITH_OPTIONS.includes(type)) {
    if (!Array.isArray(options) || options.length < 2) {
      throw ApiError.badRequest('At least 2 options are required for this activity type.');
    }
  }

  // targetYears: array of numbers; 0 means all years
  const years = Array.isArray(targetYears) && targetYears.length > 0
    ? targetYears.map(Number)
    : [0];

  const doc = await Activity.create({
    title: title.trim(),
    description: (description || '').trim(),
    type,
    targetYears: years,
    options: TYPES_WITH_OPTIONS.includes(type)
      ? options.map((o) => ({ label: String(o.label || o).trim() }))
      : [],
    startDate: new Date(startDate),
    endDate:   new Date(endDate),
    createdBy:   actor.userId,
    creatorRole: actor.role,
    facultyId:   actor.role === 'FACULTY' ? actor.facultyId : undefined,
    status: 'ACTIVE',
  });

  await auditLog.log({
    actor, action: 'ACTIVITY_CREATE', entityType: 'Activity', entityId: doc._id,
    description: `Created activity "${doc.title}" (${doc.type})`,
    newValue: { title, type, targetYears: years },
  });

  // Fan-out a notification to targeted students so their badge count increases
  const notifType = type === 'IMPORTANT_ANNOUNCEMENT' ? 'IMPORTANT_ANNOUNCEMENT' : 'NEW_ACTIVITY';
  const notifMsg  = doc.description
    ? `${doc.description}`
    : `A new ${typeLabel(type)} has been posted.`;

  function typeLabel(t) {
    const map = {
      ANNOUNCEMENT: 'announcement', IMPORTANT_ANNOUNCEMENT: 'important announcement',
      SINGLE_CHOICE: 'poll', MULTIPLE_CHOICE: 'poll', QUESTION: 'question',
      SURVEY: 'survey', OTHER: 'activity',
    };
    return map[t] || 'activity';
  }

  // Resolve which years get notified
  const targetedYears = years.includes(0) ? [2, 3, 4] : years;
  await Promise.all(
    targetedYears.map((y) =>
      notification.fanOut({
        title:         doc.title,
        message:       notifMsg,
        type:          notifType,
        recipientType: 'YEAR',
        filter:        { year: y },
        createdBy:     actor.userId,
        relatedEntity: 'Activity',
        relatedEntityId: doc._id,
      })
    )
  );

  return doc;
}

// ─── list ─────────────────────────────────────────────────────────────────────

async function list({ status, type, year, page = 1, limit = 50 }, actor) {
  const query = {};
  if (status) query.status = status;
  if (type)   query.type   = type;
  if (year)   query.targetYears = { $in: [Number(year), 0] };

  // Faculty only sees their own
  if (actor?.role === 'FACULTY') {
    query.createdBy = actor.userId;
  }

  const [items, total] = await Promise.all([
    Activity.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Activity.countDocuments(query),
  ]);

  // Attach response counts (don't send full response array to list)
  const decorated = items.map((a) => ({
    ...a,
    responseCount: (a.responses || []).length,
    responses: undefined, // strip from list view
  }));

  return { items: decorated, total, page, limit };
}

// ─── getById ──────────────────────────────────────────────────────────────────

async function getById(id, actor) {
  const a = await Activity.findById(id)
    .populate('responses.studentId', 'rollNumber name year section')
    .lean();
  if (!a) throw ApiError.notFound('Activity not found.');
  if (actor?.role === 'FACULTY') assertCanManage(actor, a);
  return a;
}

// ─── update ───────────────────────────────────────────────────────────────────

async function update(id, data, actor) {
  const a = await Activity.findById(id);
  if (!a) throw ApiError.notFound('Activity not found.');
  assertCanManage(actor, a);

  const patch = {};
  if (data.title !== undefined)       patch.title       = data.title.trim();
  if (data.description !== undefined) patch.description = data.description.trim();
  if (data.type !== undefined)        patch.type        = data.type;
  if (data.status !== undefined)      patch.status      = data.status;
  if (data.startDate !== undefined)   patch.startDate   = new Date(data.startDate);
  if (data.endDate !== undefined)     patch.endDate     = new Date(data.endDate);
  if (data.targetYears !== undefined) {
    patch.targetYears = Array.isArray(data.targetYears)
      ? data.targetYears.map(Number)
      : [Number(data.targetYears)];
  }
  if (data.options !== undefined && TYPES_WITH_OPTIONS.includes(a.type)) {
    patch.options = data.options.map((o) => ({ label: String(o.label || o).trim() }));
  }

  const updated = await Activity.findByIdAndUpdate(id, patch, { new: true });
  await auditLog.log({
    actor, action: 'ACTIVITY_UPDATE', entityType: 'Activity', entityId: id,
    description: `Updated activity "${updated.title}"`,
    newValue: patch,
  });
  return updated;
}

// ─── remove ───────────────────────────────────────────────────────────────────

async function remove(id, actor) {
  const a = await Activity.findById(id);
  if (!a) throw ApiError.notFound('Activity not found.');
  assertCanManage(actor, a);
  await a.deleteOne();
  await auditLog.log({
    actor, action: 'ACTIVITY_DELETE', entityType: 'Activity', entityId: id,
    description: `Deleted activity "${a.title}"`,
  });
  return { ok: true };
}

// ─── respond (student submits) ────────────────────────────────────────────────

async function respond(id, data, actor) {
  if (actor.role !== 'STUDENT') throw ApiError.forbidden('Only students can respond.');

  const a = await Activity.findById(id);
  if (!a) throw ApiError.notFound('Activity not found.');
  if (!isActive(a)) throw ApiError.badRequest('This activity is not currently active.');

  // Check student belongs to targeted year
  const student = await Student.findById(actor.studentId).select('year section');
  if (!student) throw ApiError.notFound('Student record not found.');
  if (!a.targetYears.includes(0) && !a.targetYears.includes(student.year)) {
    throw ApiError.forbidden('This activity is not targeted at your year.');
  }

  // Prevent duplicate responses
  const already = a.responses.find((r) => String(r.studentId) === String(actor.studentId));
  if (already) throw ApiError.conflict('You have already responded to this activity.');

  const { choices, textAnswer } = data;

  // Validate
  if (a.type === 'SINGLE_CHOICE') {
    if (!Array.isArray(choices) || choices.length !== 1) {
      throw ApiError.badRequest('Select exactly one option.');
    }
  }
  if (a.type === 'MULTIPLE_CHOICE') {
    if (!Array.isArray(choices) || choices.length === 0) {
      throw ApiError.badRequest('Select at least one option.');
    }
  }

  a.responses.push({
    studentId:   actor.studentId,
    userId:      actor.userId,
    choices:     Array.isArray(choices) ? choices : [],
    textAnswer:  textAnswer || '',
    submittedAt: new Date(),
  });
  await a.save();

  return { ok: true, responseCount: a.responses.length };
}

// ─── listForStudent ───────────────────────────────────────────────────────────

async function listForStudent(actor) {
  const student = await Student.findById(actor.studentId).select('year');
  if (!student) throw ApiError.notFound('Student not found.');

  const now = new Date();
  const items = await Activity.find({
    status: 'ACTIVE',
    startDate: { $lte: now },
    endDate:   { $gte: now },
    targetYears: { $in: [student.year, 0] },
  })
    .select('-responses') // don't send all responses to student
    .sort({ createdAt: -1 })
    .lean();

  // Check which ones the student has already responded to
  const responded = await Activity.find({
    'responses.studentId': actor.studentId,
  }).select('_id').lean();
  const respondedIds = new Set(responded.map((r) => String(r._id)));

  return items.map((a) => ({ ...a, hasResponded: respondedIds.has(String(a._id)) }));
}

// ─── getActiveForStudent ──────────────────────────────────────────────────────
// Returns ALL currently active activities for this student's year (for marquee)

async function getActiveForStudent(actor) {
  const student = await Student.findById(actor.studentId).select('year');
  if (!student) return [];

  const now = new Date();
  return Activity.find({
    status: 'ACTIVE',
    startDate: { $lte: now },
    endDate:   { $gte: now },
    targetYears: { $in: [student.year, 0] },
  })
    .select('title description type startDate endDate')
    .sort({ type: 1, createdAt: -1 }) // IMPORTANT_ANNOUNCEMENTs first
    .lean();
}

// ─── getActiveForFaculty ─────────────────────────────────────────────────────
// Returns ALL currently active faculty-created activities (visible to all faculty).
// Faculty members see each other's announcements in their portal banner.

async function getActiveForFaculty() {
  const now = new Date();
  return Activity.find({
    status:    'ACTIVE',
    startDate: { $lte: now },
    endDate:   { $gte: now },
    creatorRole: 'FACULTY',          // only faculty-created activities
  })
    .select('title description type startDate endDate options responses')
    .sort({ createdAt: -1 })
    .lean();
}

module.exports = {
  create, list, getById, update, remove,
  respond, listForStudent, getActiveForStudent, getActiveForFaculty,
};
