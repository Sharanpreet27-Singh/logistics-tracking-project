import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Generic CRUD handlers: pagination, search, whitelisted filters, zod validation. */
export function crud({ Model, schema, searchFields = [], filters = [], populate = [], sort = { createdAt: -1 }, afterRemove }) {
  return {
    list: asyncHandler(async (req, res) => {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
      const query = {};
      for (const f of filters) if (typeof req.query[f] === 'string' && req.query[f]) query[f] = req.query[f];
      if (typeof req.query.search === 'string' && req.query.search && searchFields.length) {
        const rx = new RegExp(escapeRegex(req.query.search), 'i');
        query.$or = searchFields.map((f) => ({ [f]: rx }));
      }
      const [data, total] = await Promise.all([
        Model.find(query).populate(populate).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
        Model.countDocuments(query),
      ]);
      res.json({ success: true, data, meta: { page, limit, total } });
    }),

    get: asyncHandler(async (req, res) => {
      const doc = await Model.findById(req.params.id).populate(populate).lean();
      if (!doc) throw new ApiError(404, 'Not found');
      res.json({ success: true, data: doc });
    }),

    create: asyncHandler(async (req, res) => {
      const doc = await Model.create(schema.parse(req.body));
      res.status(201).json({ success: true, data: doc });
    }),

    update: asyncHandler(async (req, res) => {
      const doc = await Model.findByIdAndUpdate(
        req.params.id,
        { $set: schema.partial().parse(req.body) },
        { new: true, runValidators: true }
      );
      if (!doc) throw new ApiError(404, 'Not found');
      res.json({ success: true, data: doc });
    }),

    remove: asyncHandler(async (req, res) => {
      const doc = await Model.findByIdAndDelete(req.params.id);
      if (!doc) throw new ApiError(404, 'Not found');
      if (afterRemove) await afterRemove(doc);
      res.json({ success: true, message: 'Deleted' });
    }),
  };
}
